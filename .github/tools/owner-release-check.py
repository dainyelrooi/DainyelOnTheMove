#!/usr/bin/env python3
"""Read-only release checks and an optional external review package.

Never deploys, changes flags, activates delivery, imports contacts or sends mail.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

REPO=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('private_store',Path(__file__).with_name('question-notifications.py'))
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)
FLAGS=['POSTCARD_ARCHIVE_ENABLED','CONTACT_DELIVERY_ENABLED','POSTCARDS_DELIVERY_ENABLED']

def optional(store,path):
    try:return store.call(helpers.ROOT+'/'+path)
    except helpers.RemoteError as error:
        if error.status==404:return None
        raise

def prepare(destination):
    source=(REPO/'firestore.rules').read_text(encoding='utf-8');candidate=source
    for name in ['cmsSpace','websiteSpace','contactSpace']:
        old="function "+name+"(space) { return space == 'staging'; }"
        if old not in candidate:raise RuntimeError('Namespace gates changed; review preparation before release')
        candidate=candidate.replace(old,"function "+name+"(space) { return space in ['staging','production']; }")
    candidate=candidate.replace("allow get: if space == 'staging' && isOwner() && id in ['backup','release'];","allow get: if space in ['staging','production'] && isOwner() && id in ['backup','release'];")
    # Legacy production calendar gains an optional platform selection only in
    # this un-deployed candidate. Its IDs/checkmarks/settings need no migration.
    start=candidate.index('    function isValidCalendarPost(data) {');end=candidate.index('    match /contentCalendar/',start);part=candidate[start:end]
    needle="'musicUrl', 'scheduled', 'published', 'remindersEnabled', 'createdAt', 'updatedAt'"
    position=part.index(needle,part.index('hasOnly'))
    part=part[:position]+part[position:].replace(needle,needle+", 'platforms'",1)
    part=part.replace('&& data.version == 1',"&& (!('platforms' in data) || calendarPlatforms(data.platforms))\n        && data.version == 1",1)
    candidate=candidate[:start]+part+candidate[end:]
    destination.mkdir(parents=True,exist_ok=False)
    rules=destination/'firestore.release.rules';rules.write_text(candidate,encoding='utf-8')
    config=json.loads((REPO/'firebase.json').read_text(encoding='utf-8'))
    config['firestore'][0]['rules']=str(rules.resolve())
    (destination/'firebase.release.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
    (destination/'review.json').write_text(json.dumps({'version':1,'status':'PREPARED_NOT_ACTIVATED','sourceRulesSha256':hashlib.sha256(source.encode()).hexdigest(),'candidateRulesSha256':hashlib.sha256(candidate.encode()).hexdigest(),'deliveryFlags':'UNCHANGED_OFF','productionDeployment':'NOT_PERFORMED'},indent=2),encoding='utf-8')
    (destination/'RELEASE.txt').write_text('REVIEW PACKAGE ONLY. No approval or deployment is implied.\nBefore the owner-approved release: verify current main/staging diffs and private backups, validate this candidate against the exact current source, confirm owner Google/TOTP access, and coordinate Rules + frontend. No staging drafts or private test media are copied to production. Existing source stories release only as reviewed. Production calendar stays on existing IDs and checkmarks; optional social platforms require this candidate. Keep all three email/archive flags off by default. Enabling actual contact forwarding, Postcard delivery or public archiving needs deliberate approved activation, fixed recipient/provider check and a separately approved delivery test. Never send a newsletter just to test a release. Verify actual production CMS save/preview/publish/withdraw, existing-page edit/restore, contact inbox and headers after approval; an actual production or mail-delivery result cannot be verified before activation. Roll back Hosting and close new namespaces if a serious problem occurs; retain content/history and private backups. Daily OneDrive schedule is native GitHub Actions after the workflow reaches the approved default branch. No local computer or AI must stay running.\n',encoding='utf-8')
    print('External release review package prepared. No Rules, Hosting, flags or email settings activated.')

def check():
    source=(REPO/'firestore.rules').read_text(encoding='utf-8')
    for name in ['cmsSpace','websiteSpace','contactSpace']:
        if "function "+name+"(space) { return space == 'staging'; }" not in source:raise RuntimeError('Production namespace is no longer closed in the staging source')
    if any(os.environ.get(flag)=='true' for flag in FLAGS):raise RuntimeError('A delivery/archive flag is enabled; review required')
    config=json.loads((REPO/'firebase.json').read_text(encoding='utf-8'))
    if {item['target'] for item in config['hosting']}!={'production','staging'}:raise RuntimeError('Unexpected Hosting targets')
    if any('private/**' not in item.get('ignore',[]) or '.github/**' not in item.get('ignore',[]) for item in config['hosting']):raise RuntimeError('Private Hosting exclusions are incomplete')
    if json.loads((REPO/'data/services.json').read_text(encoding='utf-8')).get('journeyApi') is not False:raise RuntimeError('Optional paid journey service changed')
    store=helpers.Firestore()
    for space in ['staging','production']:
        setting=optional(store,'cmsSpaces/'+space+'/mailSettings/delivery')
        if setting and setting.get('fields',{}).get('enabled',{}).get('booleanValue') is True:raise RuntimeError('Subscriber delivery has been activated; review required')
    reminder=optional(store,'contentCalendarSettings/reminders')
    reminder_on=bool(reminder and reminder.get('fields',{}).get('enabled',{}).get('booleanValue') is True)
    print('Release preparation checked: source production gates closed, private exclusions retained, optional service off, delivery flags/settings off. No mail or production mutation.')
    print('Existing live calendar reminder preference: '+('enabled' if reminder_on else 'disabled')+'. Read only; the isolated test calendar cannot change or trigger it.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--prepare',type=Path);args=parser.parse_args()
    try:
        if args.prepare:prepare(args.prepare)
        else:check()
    except Exception:
        print('Release preparation needs review. No private payloads or credentials logged; nothing activated.',file=sys.stderr);sys.exit(1)
