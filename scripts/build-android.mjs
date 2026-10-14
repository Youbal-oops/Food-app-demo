#!/usr/bin/env node
// Builds the web bundle, syncs it into the Capacitor Android project and
// assembles a debug APK. `--check` only reports toolchain readiness.
import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const isWin = process.platform === 'win32';
const checkOnly = process.argv.includes('--check');

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: isWin, ...opts });
const probe = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: isWin });

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    join(homedir(), 'Android', 'Sdk'),
    join(homedir(), 'Library', 'Android', 'sdk'),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(join(p, 'platforms')) || existsSync(join(p, 'platform-tools')));
}

function javaMajor() {
  const r = probe('java', ['-version']);
  if (r.error || r.status !== 0) return null;
  const m = /version "(\d+)(?:\.(\d+))?/.exec(`${r.stderr}${r.stdout}`);
  if (!m) return null;
  return m[1] === '1' ? Number(m[2]) : Number(m[1]);
}

const problems = [];
const java = javaMajor();
if (java === null) problems.push('JDK not found on PATH. Install JDK 21 and set JAVA_HOME.');
else if (java < 21) problems.push(`JDK ${java} found; Capacitor 8 needs JDK 21+.`);
const sdk = findSdk();
if (!sdk) problems.push('Android SDK not found. Install it and set ANDROID_HOME (platform 36 + build-tools).');
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 22) problems.push(`Node ${process.versions.node}; Capacitor 8 needs Node 22+.`);

console.log(`node ${process.versions.node} | java ${java ?? 'missing'} | sdk ${sdk ?? 'missing'}`);
if (problems.length) {
  console.error('\nCannot build APK locally:\n - ' + problems.join('\n - '));
  console.error('\nAlternative: push to GitHub; .github/workflows/android-apk.yml builds and uploads the debug APK.');
  process.exit(checkOnly ? 0 : 1);
}
if (checkOnly) { console.log('Toolchain OK.'); process.exit(0); }

const step = (label, r) => {
  if (r.status !== 0) { console.error(`\n✗ ${label} failed`); process.exit(r.status ?? 1); }
};

if (!existsSync(join(root, 'android'))) step('cap add android', run('npx', ['cap', 'add', 'android']));
step('web build', run('npm', ['run', 'build']));
step('cap sync', run('npx', ['cap', 'sync', 'android']));

const androidDir = join(root, 'android');
const lp = join(androidDir, 'local.properties');
if (!existsSync(lp)) {
  writeFileSync(lp, `sdk.dir=${sdk.split(sep).join('/')}\n`);
}
const gradlew = isWin ? 'gradlew.bat' : './gradlew';
step('gradle assembleDebug', spawnSync(gradlew, ['assembleDebug'], { cwd: androidDir, stdio: 'inherit', shell: isWin }));

const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(apk)) { console.error('APK not found at ' + apk); process.exit(1); }
const out = join(root, 'release');
mkdirSync(out, { recursive: true });
const dest = join(out, 'delivr-debug.apk');
copyFileSync(apk, dest);
console.log(`\n✓ Debug APK: ${dest} (${Math.round(statSync(dest).size / 1024)} KB)`);
