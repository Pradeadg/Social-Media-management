import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { randomUUID } from 'node:crypto';
import { Workspace, workspaceSchema } from './smm.schemas';

export interface SmmRecord {
  id: string;
  orgId: string;
  kind: string;
  title: string;
  status: string;
  data: any;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}
@Injectable()
export class SmmStore {
  constructor(public readonly db: PrismaService) {}
  async workspace(
    orgId: string
  ): Promise<{ data: Workspace; revision: number }> {
    const defaults = workspaceSchema.parse({ brand: {}, settings: {} });
    await this.db
      .$executeRaw`INSERT INTO "SmmWorkspace" ("orgId", data) VALUES (${orgId}, ${JSON.stringify(
      defaults
    )}::jsonb) ON CONFLICT ("orgId") DO NOTHING`;
    const rows = await this.db.$queryRaw<
      any[]
    >`SELECT data, revision FROM "SmmWorkspace" WHERE "orgId" = ${orgId}`;
    return rows[0];
  }
  async saveWorkspace(orgId: string, data: Workspace, revision: number) {
    const rows = await this.db.$queryRaw<
      any[]
    >`UPDATE "SmmWorkspace" SET data=${JSON.stringify(
      data
    )}::jsonb, revision=revision+1, "updatedAt"=now() WHERE "orgId"=${orgId} AND revision=${revision} RETURNING data, revision`;
    if (!rows.length)
      throw new ConflictException(
        'Pengaturan berubah di tab lain. Muat ulang sebelum menyimpan.'
      );
    return rows[0];
  }
  async list(orgId: string, kind?: string): Promise<SmmRecord[]> {
    return kind
      ? this.db
          .$queryRaw`SELECT * FROM "SmmRecord" WHERE "orgId"=${orgId} AND kind=${kind} ORDER BY "createdAt" DESC LIMIT 300`
      : this.db
          .$queryRaw`SELECT * FROM "SmmRecord" WHERE "orgId"=${orgId} ORDER BY "createdAt" DESC LIMIT 500`;
  }
  async get(orgId: string, id: string): Promise<SmmRecord> {
    const rows = await this.db.$queryRaw<
      SmmRecord[]
    >`SELECT * FROM "SmmRecord" WHERE "orgId"=${orgId} AND id=${id}`;
    if (!rows.length) throw new NotFoundException('Data tidak ditemukan.');
    return rows[0];
  }
  async handoffActive(orgId: string, id: string) {
    const rows = await this.db.$queryRaw<
      any[]
    >`SELECT id FROM "SmmRecord" WHERE "orgId"=${orgId} AND id=${id} AND kind='handoff' AND status='active'`;
    return rows.length > 0;
  }
  async create(
    orgId: string,
    kind: string,
    title: string,
    data: any,
    status = 'ready',
    id: string = randomUUID()
  ): Promise<SmmRecord> {
    const rows = await this.db.$queryRaw<
      SmmRecord[]
    >`INSERT INTO "SmmRecord" (id,"orgId",kind,title,status,data) VALUES (${id},${orgId},${kind},${title},${status},${JSON.stringify(
      data
    )}::jsonb) ON CONFLICT (id) DO NOTHING RETURNING *`;
    return rows[0] || this.get(orgId, id);
  }
  async update(
    orgId: string,
    id: string,
    data: any,
    status: string,
    revision: number,
    title?: string
  ): Promise<SmmRecord> {
    const rows = await this.db.$queryRaw<
      SmmRecord[]
    >`UPDATE "SmmRecord" SET data=${JSON.stringify(
      data
    )}::jsonb,status=${status},title=COALESCE(${
      title || null
    },title),revision=revision+1,"updatedAt"=now() WHERE "orgId"=${orgId} AND id=${id} AND revision=${revision} RETURNING *`;
    if (!rows.length)
      throw new ConflictException(
        'Data berubah. Muat ulang sebelum mencoba lagi.'
      );
    return rows[0];
  }
  async claim(
    kind: string,
    status: string,
    next: string
  ): Promise<SmmRecord | undefined> {
    const rows = await this.db.$queryRaw<
      SmmRecord[]
    >`UPDATE "SmmRecord" SET status=${next},revision=revision+1,"updatedAt"=now() WHERE id=(SELECT id FROM "SmmRecord" WHERE kind=${kind} AND status=${status} ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`;
    return rows[0];
  }
}
