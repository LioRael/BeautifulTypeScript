import importlib.util
import json
from pathlib import Path
import tempfile
import sys
from unittest.mock import patch
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('evaluation_runner', ROOT/'evals/run.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class CasePackaging(unittest.TestCase):
    def test_prepare_every_case_without_exposing_grading_material(self):
        manifest = json.loads((ROOT/'evals/cases.json').read_text())
        discovered = set((ROOT/'skills').glob('*/evals/*/case.json'))
        indexed = {runner.case_directory(case, manifest)/'case.json' for case in manifest['cases']}
        self.assertEqual(discovered, indexed)
        with tempfile.TemporaryDirectory() as tmp:
            for case, skill in manifest['cases'].items():
                with self.subTest(case=case):
                    case_dir = runner.case_directory(case, manifest)
                    descriptor = json.loads((case_dir/'case.json').read_text())
                    self.assertTrue((case_dir/descriptor['prompt']).is_file())
                    self.assertTrue((case_dir/descriptor['rubric']).is_file())
                    for condition in ['without', 'with']:
                        _, workspace = runner.prepare_workspace(case, condition, 1, manifest, Path(tmp))
                        # Only task inputs belong at the project root, plus tooling and optional skill content.
                        expected = {p.name for p in (case_dir/'files').iterdir()} | {'.git', 'node_modules'}
                        if condition == 'with': expected.add('supplied-skill')
                        self.assertEqual({p.name for p in workspace.iterdir()}, expected)
                        for f in (case_dir/'files').rglob('*'):
                            if f.is_file():
                                self.assertEqual(f.read_bytes(), (workspace/f.relative_to(case_dir/'files')).read_bytes())
                        supplied = workspace/'supplied-skill'
                        self.assertEqual(supplied.exists(), condition == 'with')
                        if condition == 'with':
                            actual = {str(f.relative_to(supplied)) for f in supplied.rglob('*') if f.is_file()}
                            expected_skill = {str(f.relative_to(ROOT/'skills'/skill)) for f in (ROOT/'skills'/skill).rglob('*')
                                              if f.is_file() and 'evals' not in f.relative_to(ROOT/'skills'/skill).parts}
                            self.assertEqual(actual, expected_skill)
                            self.assertFalse((supplied/'evals').exists())
                            self.assertFalse(any('graders' in Path(p).parts for p in actual))
                            for rel in actual:
                                self.assertEqual((supplied/rel).read_bytes(), (ROOT/'skills'/skill/rel).read_bytes())
        self.assertTrue(runner.case_snapshot(manifest))
        self.assertFalse(any('evals' in Path(p).parts for p in runner.skill_snapshot()))


    def test_old_condition_uses_frozen_content_and_excludes_evals(self):
        manifest = json.loads((ROOT/'evals/cases.json').read_text())
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            old = root/'old'
            skill = old/'typescript-best-practices'
            skill.mkdir(parents=True)
            (skill/'SKILL.md').write_text('Frozen old instructions')
            (skill/'evals').mkdir()
            (skill/'evals/secret.txt').write_text('Do not expose')
            _, ws = runner.prepare_workspace('write', 'old', 1, manifest, root, old)
            self.assertEqual((ws/'supplied-skill/SKILL.md').read_text(), 'Frozen old instructions')
            self.assertFalse((ws/'supplied-skill/evals').exists())
            self.assertEqual(set(runner.skill_snapshot(old)), {'typescript-best-practices/SKILL.md'})
            with self.assertRaises(ValueError):
                runner.prepare_workspace('write', 'old', 2, manifest, root)


    def test_sequence_keeps_its_own_code_and_reveals_only_current_requests(self):
        manifest = json.loads((ROOT/'evals/cases.json').read_text())
        # Simulate transport, not model quality. Every checkpoint edits its inherited code.
        script = """from pathlib import Path
import sys
sys.stdin.read()
p=Path('src/progress.ts')
n=int(p.read_text().split('=')[1].strip(' ;\\n'))+1 if p.exists() else 1
p.write_text(f'export const progress = {n};\\n')
Path(sys.argv[1]).write_text('Transport fixture')
print('{"type":"turn.completed","usage":{}}')
"""
        with tempfile.TemporaryDirectory() as tmp:
            work=Path(tmp)/'work';work.mkdir()
            public=Path(tmp)/'public';public.mkdir()
            def invocation(workspace, final, config):
                return [sys.executable,'-c',script,str(final)]
            # The real CLI runs with -C; simulate that working-directory behavior explicitly.
            original_run=runner.subprocess.run
            def in_workspace(command, **kwargs):
                if command[0] == sys.executable:
                    kwargs['cwd']=work/'maintenance-sequence-without-1-stage-1/workspace'
                return original_run(command, **kwargs)
            with patch.object(runner,'command',side_effect=invocation), patch.object(runner.subprocess,'run',side_effect=in_workspace):
                records=runner.run_trajectory('maintenance-sequence','without',1,manifest,work,public,'')
            self.assertEqual([r['stage'] for r in records],[1,2,3])
            self.assertTrue(all(r['exit_code']==0 for r in records))
            for before,after in zip(records,records[1:]):
                self.assertEqual(before['ending_source_hashes'],after['starting_source_hashes'])
            descriptor=json.loads((runner.case_directory('maintenance-sequence',manifest)/'case.json').read_text())
            for index,record in enumerate(records):
                prompt=(public/record['id']/'prompt.txt').read_text()
                for stage in descriptor['stages']:
                    text=(runner.case_directory('maintenance-sequence',manifest)/stage['prompt']).read_text()
                    self.assertEqual(text in prompt,stage['id']<=index+1)
                artifact=public/record['id']/'artifacts/src/progress.ts'
                self.assertIn(f'= {index+1};',artifact.read_text())
                self.assertNotIn('graders',record['ending_source_hashes'])
            ws=work/records[0]['id']/'workspace'
            count=runner.subprocess.check_output(['git','-C',str(ws),'rev-list','--count','HEAD'],text=True)
            self.assertEqual(count.strip(),'4')


    def test_run_record_preserves_failed_runtime_grade_after_successful_process(self):
        manifest = json.loads((ROOT/'evals/cases.json').read_text())
        # Simulated transport only: no model/API use or claimed task success.
        script = "from pathlib import Path; import sys; Path(sys.argv[1]).write_text('Transport fixture'); print('{\"type\":\"turn.completed\",\"usage\":{}}')"
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)/'work'; work.mkdir()
            public = Path(tmp)/'public'; public.mkdir()
            with patch.object(runner, 'command', side_effect=lambda workspace, final, config: [sys.executable, '-c', script, str(final)]):
                record = runner.run_one('write', 'with', 1, manifest, work, public, '')
            self.assertEqual(record['exit_code'], 0)
            self.assertEqual(record['changed_inputs'], [])
            self.assertTrue(record['package_unchanged'])
            self.assertTrue(record['tsconfig_unchanged'])
            self.assertTrue(record['runtime_scores'])
            self.assertTrue(any(not score['pass'] for score in record['runtime_scores']))
            saved = json.loads((public/'write-with-1/result.json').read_text())
            self.assertEqual(saved, record)
            prompt = (public/'write-with-1/prompt.txt').read_text()
            self.assertIn((runner.case_directory('write', manifest)/'prompt.md').read_text(), prompt)


if __name__ == '__main__':
    unittest.main()
