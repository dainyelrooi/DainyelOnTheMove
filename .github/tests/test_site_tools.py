import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch
from datetime import datetime,timezone

spec=importlib.util.spec_from_file_location('site_tools',Path(__file__).parents[1]/'tools/site-tools.py')
tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)

class FreeServices(unittest.TestCase):
    def test_free_plan_is_not_inferred_from_a_paid_credit_allowance(self):
        self.assertEqual(tools.free_allowance({'plan':[{'type':'free','creditsLeft':123}]})['remaining'],123)
        self.assertIsNone(tools.free_allowance({'plan':[{'type':'free','creditsLeft':True}]})['remaining'])
        self.assertIsNone(tools.free_allowance({'plan':[{'type':'free','creditsLeft':999}]})['remaining'])
        with self.assertRaises(tools.SafeError):tools.free_allowance({'plan':[{'type':'subscription','creditsLeft':300}]})

    def test_preference_fields_are_additive_and_rerunning_setup_does_not_duplicate_them(self):
        calls=[];rows=[]
        def api(path,method='GET',body=None):
            calls.append((path,method,body))
            if method=='GET':return {'attributes':rows}
            rows.append({'name':path.split('/')[-1],'category':'normal','type':body['type']});return {}
        tools.ensure_attributes(api);tools.ensure_attributes(api)
        self.assertEqual(len([row for row in calls if row[1]=='POST']),3)
        self.assertTrue(all(row[0].startswith('contacts/attributes') for row in calls))

    def test_an_existing_attribute_is_not_overwritten_to_force_setup(self):
        def api(path,method='GET',body=None):
            self.assertEqual(method,'GET');return {'attributes':[{'name':'DOTM_STORIES','category':'normal','type':'text'}]}
        with self.assertRaises(tools.SafeError):tools.ensure_attributes(api)

    def test_owned_hook_is_reconciled_without_creating_a_second_hook(self):
        calls=[];base='https://fixture-staging.example.invalid'
        saved={'id':12,'description':tools.DESCRIPTION+'staging','url':base+'/hooks/brevo','type':'marketing','events':list(tools.EVENTS)}
        def api(path,method='GET',body=None):calls.append((path,method));return {'webhooks':[saved]} if method=='GET' else {}
        self.assertEqual(tools.ensure_webhook(api,base,'staging','a'*64),12)
        self.assertEqual(calls,[('webhooks?type=marketing','GET'),('webhooks/12','PUT')])

    def test_hook_identity_and_capacity_block_mutations(self):
        for rows in [[{'id':12,'description':tools.DESCRIPTION+'staging','url':'https://other.invalid','type':'marketing'}],[{'id':i} for i in range(40)]]:
            def api(path,method='GET',body=None):self.assertEqual(method,'GET');return {'webhooks':rows}
            with self.assertRaises(tools.SafeError):tools.ensure_webhook(api,'https://fixture.invalid','staging','a'*64)

    def test_callback_credentials_are_derived_separately_and_do_not_expose_the_existing_api_key(self):
        token=tools.webhook_token('fixture-provider-key','staging');self.assertEqual(len(token),64)
        self.assertNotEqual(token,tools.webhook_token('fixture-provider-key','production'))
        self.assertNotIn('fixture-provider-key',token)

    def test_only_recent_public_stories_are_candidates_and_expired_projections_are_rejected(self):
        stamp=datetime(2026,11,27,12,tzinfo=timezone.utc).timestamp()
        copy={'version':1,'space':'staging','complete':True,'generatedAt':'2026-11-27T11:59:00Z','entries':[
            {'id':'entry-'+'a'*32,'kind':'blog','title':'A public fixture','publishedAt':'2026-11-27T11:00:00Z'},
            {'id':'entry-'+'b'*32,'kind':'field-note','title':'A future fixture','publishedAt':'2026-11-28T11:00:00Z'},
            {'id':'entry-'+'c'*32,'kind':'tip','title':'A tip fixture','publishedAt':'2026-11-27T11:00:00Z'}]}
        self.assertEqual(len(tools.valid_public_entries(copy,'staging',stamp)),1)
        for changed in [{'generatedAt':'2026-11-25T12:00:00Z'},{'space':'production'},{'complete':False}]:
            with self.assertRaises(tools.SafeError):tools.valid_public_entries(copy|changed,'staging',stamp)

    def test_notification_payload_is_an_fid_target_and_only_opens_the_exact_public_article(self):
        recipient={'fid':'c'+'a'*21,'entryId':'entry-'+'b'*32,'title':'An isolated fixture','url':'/entry/entry-'+'b'*32}
        value=tools.fcm_message(recipient);self.assertIn('fid',value['message']);self.assertNotIn('token',value['message']);self.assertNotIn('topic',value['message'])
        for changed in [{'url':'https://evil.invalid'},{'fid':'invalid'},{'entryId':'../../admin'}]:
            with self.assertRaises(tools.SafeError):tools.fcm_message(recipient|changed)

    def test_unapproved_production_or_wrong_source_branch_stops_before_provider_access(self):
        with patch.dict(tools.os.environ,{'GITHUB_REF':'refs/heads/main','TOOLS_SPACE':'production','TOOLS_MODE':'setup','SITE_TOOLS_PRODUCTION_ENABLED':'false'},clear=True),patch.object(tools,'provider',side_effect=AssertionError('provider must not run')):
            with self.assertRaises(tools.SafeError):tools.main()

    def test_brevo_outage_does_not_block_independent_opted_in_browser_notifications(self):
        calls=[]
        def http(url,method='GET',body=None,headers=None):
            calls.append((url,body))
            return {'refreshDue':True} if url.endswith('/bridge/preferences') else {'ok':True}
        with patch.dict(tools.os.environ,{'GITHUB_REF':'refs/heads/staging','TOOLS_SPACE':'staging','TOOLS_MODE':'process'},clear=True),patch.object(tools,'provider',return_value=lambda *args: (_ for _ in ()).throw(tools.SafeError('status-provider-unavailable'))),patch.object(tools,'oidc',return_value='synthetic-identity'),patch.object(tools,'http',side_effect=http),patch.object(tools,'send_notifications') as notifications:
            tools.main()
        notifications.assert_called_once()
        status=next(body['brevo'] for url,body in calls if url.endswith('/bridge/status'))
        self.assertEqual(status['plan'],'unavailable');self.assertEqual(status['reason'],'provider-unavailable')

    def test_new_service_setup_is_independent_and_never_calls_a_campaign_or_contact_send(self):
        calls=[];writes=[]
        def provider(path,method='GET',body=None):
            calls.append((path,method))
            if path=='account':return {'plan':[{'type':'free','creditsLeft':123}]}
            if path=='contacts/attributes':return {'attributes':[]}
            if path=='webhooks?type=marketing':return {'webhooks':[]}
            raise tools.SafeError('provider-http-403-permission-denied')
        def http(url,method='GET',body=None,headers=None):writes.append((url,body));return {'refreshDue':True} if url.endswith('/bridge/preferences') else {'ok':True}
        with patch.dict(tools.os.environ,{'GITHUB_REF':'refs/heads/staging','TOOLS_SPACE':'staging','TOOLS_MODE':'setup','BREVO_API_KEY':'synthetic-only'},clear=True),patch.object(tools,'provider',return_value=provider),patch.object(tools,'oidc',return_value='synthetic-identity'),patch.object(tools,'http',side_effect=http),patch.object(tools,'send_notifications') as notifications:
            tools.main()
        notifications.assert_not_called()
        self.assertTrue(any(url.endswith('/bridge/configure') and body=={} for url,body in writes))
        self.assertFalse(any('emailCampaigns' in path or 'send' in path for path,method in calls))
        status=next(body['brevo'] for url,body in writes if url.endswith('/bridge/status'))
        self.assertFalse(status['preferencesReady']);self.assertFalse(status['webhookReady']);self.assertEqual(status['reason'],'preferences-permission')
        with patch.dict(tools.os.environ,{'GITHUB_REF':'refs/heads/main','TOOLS_SPACE':'staging','TOOLS_MODE':'setup'},clear=True),patch.object(tools,'provider',side_effect=AssertionError('provider must not run')):
            with self.assertRaises(tools.SafeError):tools.main()

if __name__=='__main__':unittest.main()
