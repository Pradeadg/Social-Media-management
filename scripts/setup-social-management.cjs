const path = require('node:path');
require('dotenv').config({
  path: path.join(__dirname, '../.env'),
  quiet: true,
});
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SmmWorkspace" (
      "orgId" TEXT PRIMARY KEY REFERENCES "Organization"(id) ON DELETE RESTRICT,
      data JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SmmRecord" (
      id TEXT PRIMARY KEY, "orgId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE RESTRICT,
      kind TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ready',
      data JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await tx.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "SmmRecord_orgId_kind_idx" ON "SmmRecord"("orgId",kind)`
    );
    await tx.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "SmmRecord_kind_status_idx" ON "SmmRecord"(kind,status)`
    );
  });
  console.log('Tabel Social Management siap. Data lama tidak dihapus.');
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
