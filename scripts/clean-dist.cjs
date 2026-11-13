const { rmSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const app = process.argv[2];
if (!['backend', 'frontend', 'orchestrator', 'extension'].includes(app)) {
  throw new Error('Unknown application');
}
const appDirectory = resolve(__dirname, '..', 'apps', app);
const target = resolve(appDirectory, 'dist');
if (dirname(target) !== appDirectory) throw new Error('Invalid output directory');
rmSync(target, { recursive: true, force: true });
