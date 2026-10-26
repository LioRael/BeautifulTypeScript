#!/usr/bin/env python3
"""Recheck frozen new-task artifacts; does not call a model."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--work', required=True)
parser.add_argument('--results', required=True)
args = parser.parse_args()
work, public = Path(args.work).resolve(), Path(args.results).resolve()
manifest = json.loads((public/'manifest.json').read_text())
records = json.loads((public/'runs.json').read_text())

def run(command, cwd):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=90)
    def clean(text):
        return text.replace(str(cwd), '<workspace>').replace(str(ROOT), '<repository>').replace(str(Path.home()), '<home>')
    return {'exit_code': result.returncode, 'stdout': clean(result.stdout), 'stderr': clean(result.stderr)}

for record in records:
    ws = work/record['id']/'workspace'
    case = ROOT/manifest['case_paths'][record['case']]
    shutil.rmtree(ws/'dist', ignore_errors=True)
    compiler = run(['node', str(ROOT/'node_modules/typescript/bin/tsc'), '-p', str(ws/'tsconfig.json')], ws)
    checks = {'compiler': compiler}
    if compiler['exit_code'] == 0:
        hidden = run(['node', str(case/'graders/runtime.mjs'), str(ws)], ws)
        checks['hidden_process'] = hidden
        try:
            groups = json.loads(hidden['stdout'])
            if not isinstance(groups, list) or not groups or any('pass' not in g for g in groups):
                raise ValueError('Expected nonempty groups with pass flags')
            checks['contract_groups'] = groups
        except (ValueError, TypeError):
            checks['contract_groups'] = [{'id': 'grader-output', 'pass': False}]
        checks['visible_tests'] = run(['npm', 'test'], ws)
    source_files = sorted((public/record['id']/'artifacts/src').rglob('*.ts'))
    checks['source_metrics'] = {
        'files': len(source_files),
        'nonempty_lines': sum(sum(bool(line.strip()) for line in p.read_text().splitlines()) for p in source_files),
        'note': 'Descriptive only; not a beauty score.',
    }
    (public/record['id']/'verification.json').write_text(json.dumps(checks, indent=2)+'\n')
    print(record['id'], 'compile', compiler['exit_code'],
          'contract', sum(g['pass'] for g in checks.get('contract_groups', [])),
          '/', len(checks.get('contract_groups', [])), flush=True)
