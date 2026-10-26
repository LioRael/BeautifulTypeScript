#!/usr/bin/env python3
"""Recheck frozen new-task artifacts; does not call a model."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from contextlib import ExitStack

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--work', required=True)
parser.add_argument('--results', required=True)
parser.add_argument('--node', default='node', help='Node executable used for all verification commands')
args = parser.parse_args()
work, public = Path(args.work).resolve(), Path(args.results).resolve()
node = Path(shutil.which(args.node) or args.node).resolve()
environment = os.environ.copy()
environment['PATH'] = str(node.parent) + os.pathsep + environment.get('PATH', '')
runtime = {'node': subprocess.check_output([str(node), '--version'], text=True).strip()}
manifest = json.loads((public/'manifest.json').read_text())
records = json.loads((public/'runs.json').read_text())

def run(command, cwd):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=90, env=environment)
    def clean(text):
        return text.replace(str(cwd), '<workspace>').replace(str(ROOT), '<repository>').replace(str(Path.home()), '<home>')
    return {'exit_code': result.returncode, 'stdout': clean(result.stdout), 'stderr': clean(result.stderr)}

for record in records:
    with ExitStack() as stack:
        case = ROOT/manifest['case_paths'][record['case']]
        if 'stage' in record:
            ws=Path(stack.enter_context(tempfile.TemporaryDirectory(prefix='verify-checkpoint-',dir=work)))
            shutil.copytree(public/record['id']/'artifacts',ws,dirs_exist_ok=True)
            (ws/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
            descriptor=json.loads((case/'case.json').read_text())
            stage=next(s for s in descriptor['stages'] if s['id']==record['stage'])
            grader=case/stage['grader']
        else:
            ws = work/record['id']/'workspace'
            grader=case/'graders/runtime.mjs'
        shutil.rmtree(ws/'dist', ignore_errors=True)
        compiler = run([str(node), str(ROOT/'node_modules/typescript/bin/tsc'), '-p', str(ws/'tsconfig.json')], ws)
        checks = {'runtime': runtime, 'compiler': compiler, 'snapshot_restored': 'stage' in record}
        if compiler['exit_code'] == 0:
            hidden = run([str(node), str(grader), str(ws)], ws)
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
