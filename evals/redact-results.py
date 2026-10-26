#!/usr/bin/env python3
"""Remove incidental host metadata from an already sanitized public trace copy."""
import argparse
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser()
parser.add_argument('results')
args = parser.parse_args()
root = Path(args.results)
counts = json.loads((root/'redactions.json').read_text()).get('counts', {}) if (root/'redactions.json').exists() else {}

def scrub(value, run):
    if isinstance(value, dict):
        return {k: ('<redacted-session-id>' if k in {'thread_id', 'session_id'} else scrub(v, run)) for k, v in value.items()}
    if isinstance(value, list):
        return [scrub(v, run) for v in value]
    if not isinstance(value, str):
        return value
    for depth in [2, 1]:
        escaped_home = str(Path.home()).replace('/', '\\' * depth + '/')
        counts[run]['escaped_home_paths'] += value.count(escaped_home)
        value = value.replace(escaped_home, '<home>')
    lines = []
    for line in value.splitlines(keepends=True):
        if re.match(r'^.{2} (?:\.\./)+', line):
            counts[run]['ancestor_git_paths'] += 1
            if not lines or lines[-1] != '[redacted unrelated ancestor Git paths]\n':
                lines.append('[redacted unrelated ancestor Git paths]\n')
        elif '<home>' in line and line.count(':') > 8:
            counts[run]['environment_path_lines'] += 1
            lines.append('[redacted host PATH inventory]\n')
        else:
            lines.append(line)
    return ''.join(lines)

for trace in sorted(root.glob('*/events.jsonl')):
    run = trace.parent.name
    counts.setdefault(run, {})
    for key in ['ancestor_git_paths', 'environment_path_lines', 'escaped_home_paths']:
        counts[run].setdefault(key, 0)
    events = [scrub(json.loads(line), run) for line in trace.read_text().splitlines()]
    trace.write_text(''.join(json.dumps(event, ensure_ascii=False) + '\n' for event in events))
(root/'redactions.json').write_text(json.dumps({
    'reason': 'Incidental ancestor git status filenames and host PATH inventory; commands, statuses and task evidence retained. Raw transport logs stay local.',
    'counts': counts,
}, indent=2)+'\n')
