import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, realpathSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const git = realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim());
const safe = ['package.json', 'package-lock.json', 'node_modules', 'work'].every(name => {
  const path = join(root, name);
  return !existsSync(path) || !lstatSync(path).isSymbolicLink();
});
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (git !== root || realpathSync(process.cwd()) !== root || !safe || manifest.name !== 'stayflow') {
  throw new Error('Run at the canonical Stayflow Git/package root with local package paths.');
}
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key)));
Object.assign(env, { npm_config_cache: join(root, 'work', 'npm-cache'), npm_config_ignore_scripts: 'true', WRANGLER_SEND_METRICS: 'false' });
const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const program = process.platform === 'win32' ? process.execPath : 'npm';
const prefix = [...(process.platform === 'win32' ? [npmCli] : []), '--prefix', root, '--global=false'];
const options = { cwd: root, env, encoding: 'utf8' };
const resolved = flag => realpathSync(execFileSync(program, [...prefix, flag], options).trim().replace(/[/\\]node_modules$/i, ''));
if (resolved('prefix') !== root || resolved('root') !== root) throw new Error('Unexpected npm installation directory.');
if (execFileSync(program, [...prefix, '--version'], options).trim() !== '10.9.8') throw new Error('Expected npm 10.9.8.');
console.log('Verified package destination:', join(root, 'node_modules'));

const action = process.argv[2];
const install = ['--ignore-scripts', '--strict-peer-deps', '--no-fund', '--no-audit'];
const args = action === 'lock' ? ['install', '--package-lock-only', ...install]
  : action === 'ci' ? ['ci', ...install]
  : action === 'audit' ? ['audit', '--audit-level=high']
  : Object.hasOwn(manifest.scripts, action ?? '') ? ['run', action] : null;
if (!args || process.argv.length !== 3) throw new Error('Use lock, ci, audit, or a named package script.');
const result = spawnSync(program, [...prefix, ...args], { ...options, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
