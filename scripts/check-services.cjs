const path = require('node:path');
const fs = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { Connection } = require('@temporalio/client');
const results = { time: new Date().toISOString(), postgres: false, redis: false, temporal: false };
const logPath = path.join(__dirname, '..', '.local-tools', 'logs', 'services-health.json');
const deadline = Date.now() + 180_000;

async function checkPostgres() {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connect_timeout', '5');
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try { await db.$queryRaw`SELECT 1`; } finally { await db.$disconnect(); }
}
async function checkRedis() {
  const redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true, connectTimeout: 5000, commandTimeout: 5000,
    retryStrategy: () => null, maxRetriesPerRequest: 0,
  });
  redis.on('error', () => {});
  try {
    await redis.connect();
    if (await redis.ping() !== 'PONG') throw new Error('Unexpected response');
  } finally { redis.disconnect(); }
}
async function checkTemporal() {
  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS || 'localhost:7233', connectTimeout: 5000 });
  try {
    await connection.withDeadline(Date.now() + 5000, () => connection.workflowService.describeNamespace({ namespace: 'default' }));
  } finally { await connection.close(); }
}
(async () => {
  const checks = { postgres: checkPostgres, redis: checkRedis, temporal: checkTemporal };
  while (Date.now() < deadline) {
    await Promise.all(Object.entries(checks).filter(([name]) => !results[name]).map(async ([name, check]) => {
      try { await check(); results[name] = true; console.log(`${name}: SIAP`); }
      catch { /* Retry startup without printing connection strings or credentials. */ }
    }));
    if (Object.keys(checks).every(name => results[name])) break;
    console.log(`Menunggu: ${Object.keys(checks).filter(name => !results[name]).join(', ')}`);
    await delay(5000);
  }
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  if (!Object.keys(checks).every(name => results[name])) process.exitCode = 1;
})().catch(() => { console.error('Pemeriksaan layanan gagal. Periksa konfigurasi lokal.'); process.exitCode = 1; });
