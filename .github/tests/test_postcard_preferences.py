import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

spec=importlib.util.spec_from_file_location('postcard_preferences_test',Path(__file__).parents[1]/'tools/postcard-preferences.py')
preferences=importlib.util.module_from_spec(spec);spec.loader.exec_module(preferences)

class Preferences(unittest.TestCase):
    def setUp(self):
        self.delivery=SimpleNamespace(AUDIENCE={'segmentIds':[1]},unpack=lambda v:v)
        self.saved=[]
        def update(document,changes):
            self.saved.append(changes)
            return {'fields':document['fields']|changes}
        self.store=SimpleNamespace(update=update)
        self.config={'preferencesFormId':'a'*24,'segments':{'stories':2,'films':3,'tips':4}}

    def test_legacy_jobs_are_byte_for_byte_unchanged_and_do_not_query_new_services(self):
        document={'fields':{'campaignId':23,'phase':'scheduled'}}
        result=preferences.prepare(self.delivery,self.store,document,{},load=lambda:self.fail('legacy request must not load preferences'))
        self.assertIs(result[0],document);self.assertIs(result[1],self.delivery.AUDIENCE)
        self.assertEqual(result[2],{});self.assertEqual(self.saved,[])

    def test_topic_is_frozen_before_campaign_creation_and_retries_keep_approved_audience(self):
        result=preferences.prepare(self.delivery,self.store,{'fields':{}},{'audienceTopic':'films'},load=lambda:self.config)
        document,audience,extra=result
        self.assertEqual(audience,{'segmentIds':[3]});self.assertEqual(extra,{'updateFormId':'a'*24})
        self.assertEqual(document['fields']['providerAudienceTopic'],'films')
        again=preferences.prepare(self.delivery,self.store,document,{'audienceTopic':'films'},load=lambda:self.fail('must reuse frozen audience'))
        self.assertEqual(again,result);self.assertEqual(len(self.saved),1)

    def test_unconfirmed_or_legacy_segment_mapping_fails_before_any_write(self):
        for change in [{'segments':{'stories':1,'films':3,'tips':4}},{'segments':{'stories':2,'films':2,'tips':4}},{'preferencesFormId':'invalid'},{'segments':{'stories':True,'films':3,'tips':4}},{'segments':{}}]:
            with self.assertRaises(RuntimeError):preferences.prepare(self.delivery,self.store,{'fields':{}},{'audienceTopic':'tips'},load=lambda:self.config|change)
        self.assertEqual(self.saved,[])

    def test_a_changed_topic_cannot_retarget_an_existing_campaign(self):
        result=preferences.prepare(self.delivery,self.store,{'fields':{}},{'audienceTopic':'stories'},load=lambda:self.config)
        with self.assertRaises(RuntimeError):preferences.prepare(self.delivery,self.store,result[0],{'audienceTopic':'tips'})

if __name__=='__main__':unittest.main()
