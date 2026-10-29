"""Offline public-trip schema tests with synthetic locations only."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('public_trip_validator', Path(__file__).parents[2] / 'tools/Validate-PublicTrip.py')
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class PublicTripTests(unittest.TestCase):
    def fixture(self):
        return dict(id='fixture-trip', title='Trip to Latin America', departureAt='2026-10-28T00:00:00+01:00',
                    timeZone='Europe/Amsterdam', confirmedDepartureAt=None, endedAt=None, revealedStops=[], currentLocation=None)

    def test_owner_confirmation_does_not_require_a_fabricated_departure_time(self):
        trip = self.fixture(); trip['departureConfirmed'] = True
        validator.validate(trip)
        self.assertIsNone(trip['confirmedDepartureAt'])
        self.assertEqual(trip['revealedStops'], [])

    def test_confirmation_must_be_explicit_boolean(self):
        for value in ['true', 1, None, {}]:
            with self.subTest(value=value):
                trip = self.fixture(); trip['departureConfirmed'] = value
                with self.assertRaises(ValueError): validator.validate(trip)

    def test_country_only_public_location_needs_no_invented_city_or_date(self):
        trip = self.fixture(); trip['currentLocation'] = {'country': 'Test country'}
        validator.validate(trip)
        self.assertEqual(set(trip['currentLocation']), {'country'})
        trip['currentLocation'] = {'city': 'Test city', 'country': 'Test country', 'updatedAt': '2026-10-28T12:00:00Z'}
        validator.validate(trip)

    def test_country_only_location_still_rejects_sensitive_or_invalid_extra_fields(self):
        for location in [{'country': ''}, {'city': 'Test city'}, {'country': 'Test', 'city': ''}, {'country': 'Test', 'coordinates': [1, 2]}, {'country': 'Test', 'arrivalAt': '2026-10-28T12:00:00Z'}, {'country': 'Test', 'updatedAt': 'not a timestamp'}]:
            with self.subTest(location=location):
                trip = self.fixture(); trip['currentLocation'] = location
                with self.assertRaises(ValueError): validator.validate(trip)

    def test_existing_planned_time_and_reporting_timezone_remain_guarded(self):
        trip = self.fixture()
        for key, value in [('departureAt', '2026-10-28T12:00:00Z'), ('timeZone', 'America/Curacao')]:
            with self.subTest(key=key):
                changed = copy.deepcopy(trip); changed[key] = value
                with self.assertRaises(ValueError): validator.validate(changed)


if __name__ == '__main__': unittest.main()
