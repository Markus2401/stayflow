import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();

test('every published Stayflow port is bound to 127.0.0.1 only', () => {
  const names = docker('ps', '--filter', 'label=com.supabase.cli.project=stayflow-local', '--format', '{{.Names}}').split('\n');
  assert.ok(names.length >= 4, 'the local stack is running');
  let published = 0;
  for (const name of names) {
    for (const line of docker('port', name).split('\n').filter(Boolean)) {
      published++;
      assert.match(line, / -> 127\.0\.0\.1:\d+$/, `${name}: ${line}`);
    }
  }
  assert.ok(published >= 3, 'API, database and mail ports are published');
});
