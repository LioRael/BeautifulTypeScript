import unittest
from ledger import summarize

class Tests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(summarize([]), [])
    def test_group(self):
        self.assertEqual(summarize([{'key':'a','amount':'2'},{'key':'a','amount':'-1'}]), [{'key':'a','total':'1','priority':100}])
    def test_first_priority(self):
        self.assertEqual(summarize([{'key':'a','amount':'1','priority':5},{'key':'a','amount':'2','priority':0}])[0]['priority'],5)
    def test_bad_amount(self):
        with self.assertRaisesRegex(ValueError, '^amount$'):
            summarize([{'key':'a','amount':'1.5'}])

if __name__ == '__main__': unittest.main()
