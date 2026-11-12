#!/usr/bin/env python3
"""Publish only the owner-approved immutable Postcard Rules candidate.

No provider client, Auth changes or automatic activation. Named-database release
requires main, explicit apply, an exact observed baseline and a private backup.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path

spec = importlib.util.spec_from_file_location('release_staging_rules', Path(__file__).with_name('postcard-staging-rules.py'))
staging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(staging)
d = staging.d
REVIEWED_SHA = 'e19ef5164b2640197df5a7067b79c1279a1ce4ec76ae8e6f2a7e61faf0285359'
BASELINE_SHA = '35db6964d0553ef3b50ec2c102709d52c6338261a287aecad2867548ef4606b3'


def sha(source):
    return hashlib.sha256(source.encode()).hexdigest()


def known_baseline(source):
    if staging.START in source:
        if source.count(staging.START) != 1 or source.count(staging.END) != 1:
            raise RuntimeError('Unexpected staging extension')
        begin, end = source.index(staging.START), source.index(staging.END) + len(staging.END)
        print(json.dumps({'stagingExtensionMatches': source[begin:end] == staging.overlay(),
                          'activeExtensionSha256': sha(source[begin:end])}))
        if source[begin:end] != staging.overlay():
            raise RuntimeError('Staging extension changed')
        source = source[:begin] + source[end:]
    print(json.dumps({'activeCoreSourceSha256': sha(source), 'matchesReviewedBaseline': sha(source) == BASELINE_SHA}))
    if sha(source) != BASELINE_SHA:
        raise RuntimeError('Unreviewed active Rules baseline')


def release(store, call, reviewed, *, apply=False, expected=''):
    if sha(reviewed) != REVIEWED_SHA:
        raise RuntimeError('Reviewed Rules source changed')
    before = call(staging.RELEASE)
    files = call(before['rulesetName']).get('source', {}).get('files', [])
    if len(files) != 1 or not isinstance(files[0].get('content'), str):
        raise RuntimeError('Unexpected named Rules source')
    source = files[0]['content']
    digest = sha(source)
    print(json.dumps({'namedDatabase': d.helpers.DATABASE, 'currentSourceSha256': digest,
                      'reviewedSourceSha256': REVIEWED_SHA, 'alreadyActive': source == reviewed}))
    if source == reviewed:
        print('Exact reviewed named Rules are already active. No mutation.')
        return
    known_baseline(source)
    if not apply:
        print('Known current Rules and immutable reviewed candidate verified. Check only; no mutation.')
        return
    if expected != digest:
        raise RuntimeError('Active Rules differ from explicit expected source')
    path = d.ROOT + '/_automation/postcard-production-rules-' + digest
    saved = store.optional(path)
    if saved:
        fields = saved.get('fields', {})
        if d.unpack(fields.get('source', {})) != source or d.unpack(fields.get('sourceSha256', {})) != digest:
            raise RuntimeError('Existing private Rules backup differs')
    else:
        store.call(d.ROOT + ':commit', 'POST', {'writes': [{'update': {'name': path, 'fields': {
            'source': d.pack(source), 'rulesetName': d.pack(before['rulesetName']), 'sourceSha256': d.pack(digest)}},
            'currentDocument': {'exists': False}}]})
    created = call('projects/' + d.helpers.PROJECT + '/rulesets', 'POST', {'source': {'files': [
        {'name': files[0]['name'], 'content': reviewed}]}})
    if not created.get('name', '').startswith('projects/' + d.helpers.PROJECT + '/rulesets/'):
        raise RuntimeError('Ruleset creation unconfirmed')
    current = call(staging.RELEASE)
    if current.get('rulesetName') != before.get('rulesetName'):
        raise RuntimeError('Named Rules changed concurrently; no release replaced')
    call(staging.RELEASE, 'PATCH', {'release': {'name': staging.RELEASE, 'rulesetName': created['name']},
                                  'updateMask': 'rulesetName'})
    active = call(staging.RELEASE)
    readback = call(active['rulesetName']).get('source', {}).get('files', [])
    if active.get('rulesetName') != created['name'] or len(readback) != 1 or readback[0].get('content') != reviewed:
        raise RuntimeError('Exact named Rules readback failed')
    print('Owner-approved Postcard Rules active; exact named-database source readback passed. Private backup retained. No Auth or provider action.')


def validate_environment(apply):
    if os.environ.get('GITHUB_REPOSITORY') != 'dainyelrooi/DainyelOnTheMove':
        raise RuntimeError('Fixed repository required')
    if os.environ.get('GITHUB_REF') not in {'refs/heads/main', 'refs/heads/staging'}:
        raise RuntimeError('Reviewed branch required')
    if apply and os.environ.get('GITHUB_REF') != 'refs/heads/main':
        raise RuntimeError('Production Rules apply requires main')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--expected-current-sha256', default='')
    args = parser.parse_args()
    validate_environment(args.apply)
    store = d.Store()
    metadata = store.call('projects/' + d.helpers.PROJECT + '/databases/' + d.helpers.DATABASE)
    if metadata.get('databaseEdition') != 'ENTERPRISE' or metadata.get('freeTier') is not True:
        raise RuntimeError('Existing free named database required')
    def call(path, method='GET', body=None):
        return d.helpers.request('Firebase Rules', staging.API + path, store.headers, method, body)
    reviewed = (Path(__file__).parents[2] / 'firestore.rules').read_text()
    release(store, call, reviewed, apply=args.apply, expected=args.expected_current_sha256)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        code = 'http-' + str(error.status) if isinstance(error, d.helpers.RemoteError) else 'rules-release-unconfirmed'
        raise SystemExit('Postcard Rules release stopped safely: ' + code) from None
