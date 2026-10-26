import test from 'node:test';
import { execFileSync } from 'node:child_process';

test('skill-local evals prepare all paired workspaces without leaking graders', () => {
  execFileSync('python3', ['-B', '-m', 'unittest', 'discover', '-s', 'evals/tests', '-v'], { stdio: 'pipe' });
});
