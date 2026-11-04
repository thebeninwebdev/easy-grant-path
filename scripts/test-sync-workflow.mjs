import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
const workflow = yaml.load(readFileSync('.github/workflows/sync-opportunities.yml', 'utf8'));
const triggers = workflow.on;
const steps = workflow.jobs.sync.steps;
const validate = steps.find((step) => step.name === 'Validate configuration')?.run;
const trigger = steps.find((step) => step.name === 'Trigger protected sync')?.run;

assert.equal(workflow.name, 'Sync opportunities');
assert.deepEqual(triggers.schedule, [{ cron: '17 6,18 * * *' }]);
assert.ok(Object.hasOwn(triggers, 'workflow_dispatch'));
assert.equal(workflow.jobs.sync['timeout-minutes'], 10);
assert.equal(typeof validate, 'string');
assert.equal(typeof trigger, 'string');

function run(script, env = {}) {
  return spawnSync(bash, ['--noprofile', '--norc', '-eo', 'pipefail', '-c', script], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

for (const script of [validate, trigger]) {
  const syntax = spawnSync(bash, ['--noprofile', '--norc', '-n'], { input: script, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
}

const missingUrl = run(validate, { SYNC_URL: '', SYNC_SECRET: 'test-secret' });
assert.notEqual(missingUrl.status, 0);
assert.match(missingUrl.stdout, /EASYGRANTPATH_SYNC_URL is missing/);

const missingSecret = run(validate, { SYNC_URL: 'https://example.test/sync', SYNC_SECRET: '' });
assert.notEqual(missingSecret.status, 0);
assert.match(missingSecret.stdout, /SYNC_SECRET is missing/);

const mocks = [
  'curl() {',
  '  output_file=',
  '  while [ "$#" -gt 0 ]; do',
  '    if [ "$1" = "--output" ]; then output_file="$2"; shift 2; else shift; fi',
  '  done',
  '  printf "%s" "$MOCK_BODY" > "$output_file"',
  '  printf "%s" "$MOCK_HTTP_STATUS"',
  '  return "$MOCK_CURL_EXIT"',
  '}',
  'jq() {',
  '  if [ "$MOCK_JQ_VALID" != "1" ]; then return 1; fi',
  '  case "$*" in',
  '    *"-e"*) return 0 ;;',
  '    *) printf "%s\\n" "status=success fetched=12 created=3 updated=7 skipped=1 irrelevant=1 failed=0" ;;',
  '  esac',
  '}',
  'export -f curl jq',
].join('\n');

function runTrigger({ status, curlExit, valid = false }) {
  return run(mocks + '\n' + trigger, {
    SYNC_URL: 'https://example.test/sync',
    SYNC_SECRET: 'test-secret',
    MOCK_HTTP_STATUS: String(status),
    MOCK_CURL_EXIT: String(curlExit),
    MOCK_JQ_VALID: valid ? '1' : '0',
    MOCK_BODY: valid ? '{"data":{"source":"grants-gov"}}' : '{}',
  });
}

for (const status of [401, 404, 500]) {
  const failed = runTrigger({ status, curlExit: 22 });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stdout, new RegExp('HTTP status: ' + status));
  assert.doesNotMatch(failed.stdout, /test-secret/);
}

const malformed = runTrigger({ status: 200, curlExit: 0 });
assert.notEqual(malformed.status, 0);
assert.match(malformed.stdout, /unexpected response/);

const success = runTrigger({ status: 200, curlExit: 0, valid: true });
assert.equal(success.status, 0, success.stdout + success.stderr);
assert.match(success.stdout, /Opportunity sync completed/);
assert.match(success.stdout, /fetched=12 created=3 updated=7/);
assert.doesNotMatch(success.stdout, /test-secret/);

console.log('Sync workflow YAML and shell behavior tests passed.');
