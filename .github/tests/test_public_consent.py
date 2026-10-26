"""Public page coverage and private/form exclusions, without external requests."""
from pathlib import Path
import importlib.util
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('site_ads',ROOT/'tools/site_ads.py')
ads=importlib.util.module_from_spec(spec);spec.loader.exec_module(ads)

class PublicConsentTests(unittest.TestCase):
    def test_all_public_reading_pages_have_one_guarded_loader(self):
        checked=[]
        for file in sorted((ROOT/'.github/templates/pages').glob('*.html')):
            content=(ROOT/file.name).read_text(encoding='utf-8')
            self.assertNotIn('assets/analytics-consent.js',content,file.name)
            if file.name in ads.EXCLUDED or '<footer' not in content:
                self.assertNotIn('assets/privacy-consent.js',content,file.name)
                self.assertNotIn('google-adsense-account',content,file.name)
            else:
                checked.append(file.name)
                self.assertEqual(content.count('assets/privacy-consent.js'),1,file.name)
                self.assertEqual(content.count('name="google-adsense-account"'),1,file.name)
                self.assertIn('data-consent-page="'+file.stem+'"',content,file.name)
                self.assertNotIn('<script async src="https://pagead2',content,file.name)
        self.assertGreaterEqual(len(checked),20)
    def test_account_authorisation_is_exact_and_cookie_choices_are_shared(self):
        self.assertEqual((ROOT/'ads.txt').read_text().strip(),'google.com, pub-9073450763802389, DIRECT, f08c47fec0942fa0')
        policy=(ROOT/'cookies.html').read_text(encoding='utf-8')
        self.assertIn('Consent, Do not consent and Manage options',policy)
        self.assertIn('data-cookie-settings',policy)
        self.assertIn('data-privacy-choice-status',policy)
        self.assertNotIn('Accept analytics or Reject analytics',policy)

if __name__=='__main__':unittest.main()
