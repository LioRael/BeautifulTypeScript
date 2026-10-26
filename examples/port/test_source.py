import json
import unittest
from pathlib import Path
from source import envelope

class SourceTests(unittest.TestCase):
    def test_characterization(self):
        for case in json.loads(Path(__file__).with_name('cases.json').read_text()):
            with self.subTest(case=case['name']):
                self.assertEqual(envelope(case['input']), case['expected'])

if __name__ == '__main__':
    unittest.main()
