// Load .env without passing --env-file into Next.js worker NODE_OPTIONS.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
process.chdir(path.join(root, 'apps/frontend'));
const cli = require.resolve('next/dist/bin/next');
process.argv = [process.execPath, cli, 'start', '-p', '4200', '-H', '127.0.0.1'];
require(cli);
