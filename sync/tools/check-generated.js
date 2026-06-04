import { execFileSync } from 'node:child_process';

const before = gitStatus();
execFileSync(process.execPath, ['sync/build-n8n-nodes.js'], { stdio: 'inherit' });
const after = gitStatus();

if (before !== after) {
  console.error('check-generated: sync/n8n-build is out of date. Run node sync/build-n8n-nodes.js and commit the result.');
  process.exitCode = 1;
} else {
  console.log('check-generated: clean');
}

function gitStatus() {
  try {
    return execFileSync('git', ['status', '--short', '--', 'sync/n8n-build'], { encoding: 'utf8' });
  } catch (error) {
    return '';
  }
}
