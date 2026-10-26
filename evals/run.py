#!/usr/bin/env python3
"""Run paired, fresh-process Codex evaluations. Requires logged-in codex and npm ci.
Does not install skills globally or alter user configuration. Model runs consume quota.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parent.parent

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def snapshot(directory):
    return {str(f.relative_to(directory)): sha(f) for f in sorted(directory.rglob('*')) if f.is_file()}

def disabled_skills():
    paths = set()
    for root in [Path.home()/'.codex/skills', Path.home()/'.agents/skills']:
        if not root.exists(): continue
        files = list(root.rglob('SKILL.md')) + [d/'SKILL.md' for d in root.iterdir() if (d/'SKILL.md').exists()]
        for f in files:
            # CLI 0.164.0 experimentally required SKILL.md paths, not just folder paths.
            paths.update([str(f), str(f.resolve()), str(f.parent), str(f.parent.resolve())])
    return 'skills.config=[' + ','.join('{path='+json.dumps(x)+',enabled=false}' for x in sorted(paths)) + ']'

def command(workspace, final, disable_config):
    return ['codex','exec','--ignore-user-config','--ephemeral','--skip-git-repo-check',
            '--disable','plugins','--disable','skill_search','-c','project_doc_max_bytes=0',
            '-c',disable_config,'-c','web_search="disabled"','-s','workspace-write',
            '--json','-C',str(workspace),'-o',str(final),'-']

def sanitize(text, workspace):
    return text.replace(str(workspace), '<workspace>').replace(str(ROOT), '<repository>').replace(str(Path.home()), '<home>')

def run_one(case, condition, repeat, manifest, work, public, disable_config):
    run_id = f'{case}-{condition}-{repeat}'
    folder=work/run_id; workspace=folder/'workspace'; folder.mkdir()
    shutil.copytree(ROOT/'evals/cases'/case/'input',workspace)
    # Keep Git inspection inside the task rather than discovering an ancestor repository.
    subprocess.run(['git','init','--template=','--quiet',str(workspace)],check=True)
    (workspace/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
    skill=manifest['cases'][case]
    if condition=='with': shutil.copytree(ROOT/'skills'/skill,workspace/'supplied-skill')
    common=('Work only in this workspace. Read PROJECT.md and the task files. Do not inspect parent/home directories, other skills, evaluation rubrics, or other runs. '
            'Do not use network, install packages, delegate, publish, or change global settings. node_modules is preinstalled; use it only to run project tooling. '
            'You have at most 8 minutes. Complete the requested work and report actual evidence, including blockers.\n')
    task=(ROOT/'evals/cases'/case/'task.md').read_text()
    prompt=common+('Read and apply supplied-skill/SKILL.md and only its relevant bundled references.\n' if condition=='with' else '')+task
    (folder/'prompt.txt').write_text(prompt)
    started=time.time(); error=None
    with (folder/'raw-events.jsonl').open('w') as out,(folder/'stderr.txt').open('w') as err:
        try:
            result=subprocess.run(command(workspace,folder/'final.txt',disable_config),input=prompt,text=True,stdout=out,stderr=err,timeout=manifest['timeout_seconds'])
            exit_code=result.returncode
        except subprocess.TimeoutExpired:
            exit_code=None;error='timeout'
    record={'id':run_id,'case':case,'condition':condition,'repeat':repeat,'exit_code':exit_code,'error':error,'elapsed_seconds':round(time.time()-started,3),'usage':None}
    dest=public/run_id;dest.mkdir()
    events=[]
    for line in (folder/'raw-events.jsonl').read_text().splitlines():
        try: event=json.loads(line)
        except ValueError: continue
        if event.get('type')=='turn.completed': record['usage']=event.get('usage')
        item=event.get('item',{})
        if item.get('type')=='reasoning': continue
        if event.get('type')=='thread.started': continue
        events.append(json.loads(sanitize(json.dumps(event),workspace)))
    (dest/'events.jsonl').write_text(''.join(json.dumps(e,ensure_ascii=False)+'\n' for e in events))
    (dest/'prompt.txt').write_text(prompt)
    if (folder/'final.txt').exists(): (dest/'final.txt').write_text(sanitize((folder/'final.txt').read_text(),workspace))
    artifacts=dest/'artifacts';artifacts.mkdir()
    for f in workspace.rglob('*'):
        rel=f.relative_to(workspace)
        if any(x in {'node_modules','supplied-skill','.git','dist','__pycache__'} for x in rel.parts): continue
        if f.is_file():
            target=artifacts/rel;target.parent.mkdir(parents=True,exist_ok=True)
            try: target.write_text(sanitize(f.read_text(),workspace))
            except UnicodeError: pass
    original=ROOT/'evals/cases'/case/'input'
    record['changed_inputs']=[str(f.relative_to(original)) for f in original.rglob('*') if f.is_file() and (not (workspace/f.relative_to(original)).exists() or sha(f)!=sha(workspace/f.relative_to(original)))]
    record['package_unchanged']=sha(original/'package.json')==sha(workspace/'package.json')
    record['tsconfig_unchanged']=sha(original/'tsconfig.json')==sha(workspace/'tsconfig.json')
    if case in {'write','port'}:
        result=subprocess.run(['node',str(ROOT/'evals/grade-runtime.mjs'),case,str(workspace)],cwd=ROOT,text=True,capture_output=True,timeout=60)
        try: record['runtime_scores']=json.loads(sanitize(result.stdout,workspace))
        except ValueError: record['runtime_scores']=[{'id':'grader-error','pass':False,'evidence':sanitize(result.stderr,workspace)}]
    (dest/'result.json').write_text(json.dumps(record,indent=2)+'\n')
    print(run_id,exit_code,record['elapsed_seconds'],flush=True)
    return record

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--work',required=True);parser.add_argument('--output',required=True);parser.add_argument('--workers',type=int,default=2);parser.add_argument('--cases',nargs='*');parser.add_argument('--rubric',default='evals/RUBRIC.md')
    args=parser.parse_args();work=Path(args.work).resolve();public=Path(args.output).resolve()
    if work.exists() or public.exists(): raise SystemExit('Refusing to overwrite an evaluation. Choose fresh directories.')
    if not (ROOT/'node_modules/typescript').exists(): raise SystemExit('Run npm ci first.')
    work.mkdir(parents=True);public.mkdir(parents=True)
    manifest=json.loads((ROOT/'evals/cases.json').read_text());manifest['tool_version']=subprocess.check_output(['codex','--version'],text=True).strip()
    manifest['model_selection']='CLI default with --ignore-user-config; preflight banner: gpt-6.1-sol, reasoning effort none'
    manifest['skill_hashes']=snapshot(ROOT/'skills');manifest['case_hashes']=snapshot(ROOT/'evals/cases');manifest['rubric_sha256']=sha(ROOT/args.rubric);manifest['runner_sha256']=sha(Path(__file__));manifest['grader_sha256']=sha(ROOT/'evals/grade-runtime.mjs')
    manifest['rubric_path']=args.rubric
    manifest['started_utc']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());manifest['workers']=args.workers
    (public/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    jobs=[]
    for repeat in range(1,manifest['repetitions']+1):
        for case in (args.cases or list(manifest['cases'])):
            for condition in (manifest['order'] if repeat%2 else list(reversed(manifest['order']))): jobs.append((case,condition,repeat))
    config=disabled_skills()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures=[pool.submit(run_one,*job,manifest,work,public,config) for job in jobs]
        records=[future.result() for future in concurrent.futures.as_completed(futures)]
    (public/'runs.json').write_text(json.dumps(sorted(records,key=lambda r:r['id']),indent=2)+'\n')
    assert snapshot(ROOT/'skills')==manifest['skill_hashes'],'Skills changed during evaluation'
    assert snapshot(ROOT/'evals/cases')==manifest['case_hashes'],'Tasks changed during evaluation'

if __name__=='__main__': main()
