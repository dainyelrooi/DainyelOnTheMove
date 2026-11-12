"""Public diagnostics must never disclose private newsletter/calendar copy."""
import contextlib
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('postcard_audit',Path(__file__).parents[1]/'tools/postcard-audit.py')
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)


class Privacy(unittest.TestCase):
    def test_output_contains_proof_booleans_without_copy_or_planning_instants(self):
        secret_subject='PRIVATE SYNTHETIC SUBJECT'
        secret_time='2040-01-02T03:04:05Z'
        identifier='mail-'+'a'*32
        data={'payload':{'subject':secret_subject},'draftId':identifier,'draftRevision':1,'campaignId':101,'status':'sent','scheduledAt':secret_time,
              'provider':{'state':'sent','status':'sent','calendarAt':secret_time,'sentAt':secret_time,'lastSuccessAt':secret_time,'error':''}}
        def call(path,method='GET',body=None):
            if '/databases/' in path and '/documents' not in path:return {'databaseEdition':'ENTERPRISE','freeTier':True}
            self.assertTrue(path.endswith(':runQuery'))
            kind=body['structuredQuery']['from'][0]['collectionId']
            value=data if kind=='mailJobs' else {'subject':secret_subject,'revision':1}
            return [{'document':{'name':a.delivery.ROOT+'/cmsSpaces/production/'+kind+'/'+identifier,'fields':{key:a.delivery.pack(item) for key,item in value.items()}}}]
        store=type('Store',(),{'call':staticmethod(call),'optional':staticmethod(lambda path:None)})()
        output=io.StringIO()
        campaigns={'campaigns':[{'id':101,'subject':secret_subject,'status':'sent','scheduledAt':secret_time,'sentDate':secret_time,'sender':{'email':a.delivery.SENDER}}]}
        with patch.object(a.delivery,'Store',return_value=store),patch.object(a.delivery,'brevo',return_value=campaigns),contextlib.redirect_stdout(output):a.main()
        text=output.getvalue()
        self.assertNotIn(secret_subject,text)
        self.assertNotIn(secret_time,text)
        self.assertIn('"storedProviderTimeMatches": true',text)
        self.assertIn('"hasActualSentTime": true',text)


if __name__=='__main__':unittest.main()
