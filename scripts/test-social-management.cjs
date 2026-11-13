/* Real PostgreSQL transaction, rolled back; LLM/Meta/Postiz outbound calls are fakes. */
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID, createHmac, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
process.chdir(root);
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
const built = path.join(root, 'apps/backend/dist');
const postsModule = require.resolve(
  path.join(
    built,
    'libraries/nestjs-libraries/src/database/prisma/posts/posts.service.js'
  )
);
require.cache[postsModule] = {
  id: postsModule,
  filename: postsModule,
  loaded: true,
  exports: { PostsService: class PostsService {} },
};
const smm = (name) =>
  require(path.join(built, 'apps/backend/src/social-management', name + '.js'));
const { SmmService, verifySignature, messageWithinWindow } = smm('smm.service');
const { SmmStore } = smm('smm.store');
const { publicIPv4, publicUrl, robotsAllowed, extractText } =
  smm('smm.research');
const { workspaceSchema, metricSchema, contentSchema } = smm('smm.schemas');
const { skillCatalog, skillInstructions, workflowSkills } = smm('smm.skills');
const { localChat, modelStatus, needsHandoff } = smm('smm.llm');
const { previewBrandImport } = smm('smm.brand-import');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log('PASS ' + name);
  } catch (e) {
    results.push({ name, status: 'FAIL', error: e.message });
    throw e;
  }
}
const json = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const realFetch = global.fetch;
const originalEnv = { ...process.env };
let queue = [],
  outbound = [];
global.fetch = async (url, options = {}) => {
  assert.ok(
    String(url).startsWith('http://127.0.0.1:11434/'),
    'Unexpected outbound request: ' + url
  );
  outbound.push({ url: String(url), options });
  if (String(url).endsWith('/api/tags'))
    return json({ models: [{ name: 'test-local' }] });
  assert.equal(options.redirect, 'error');
  assert.ok(queue.length, 'Unexpected LLM request');
  return json({ message: { content: queue.shift() } });
};
const fakeFetch = global.fetch;
const rollback = new Error('ROLLBACK_TEST_FIXTURES');

(async () => {
  await check(
    '106 pinned skills, workflow references, traversal rejected',
    () => {
      const catalog = skillCatalog();
      assert.equal(catalog.length, 106);
      for (const id of Object.values(workflowSkills).flat())
        assert.ok(catalog.some((s) => s.id === id));
      assert.equal(
        catalog.find((s) => s.id === 'scheduling-and-queue').mode,
        'postiz-manual'
      );
      assert.equal(
        catalog.find((s) => s.id === 'nano-banana').mode,
        'brief-only'
      );
      assert.ok(skillInstructions('social-strategy').length > 500);
      assert.throws(() => skillInstructions('../../.env'));
    }
  );
  await check(
    'SSRF rejects private addresses, credentials and social scraping',
    async () => {
      for (const ip of [
        '127.0.0.1',
        '10.0.0.1',
        '172.16.0.1',
        '192.168.1.1',
        '169.254.169.254',
        '100.64.0.1',
        '0.0.0.0',
        '224.0.0.1',
        '::1',
      ])
        assert.equal(publicIPv4(ip), false);
      assert.equal(publicIPv4('93.184.215.14'), true);
      for (const url of [
        'https://127.0.0.1/',
        'http://example.com/',
        'https://user:pass@example.com/',
        'https://instagram.com/test',
        'https://example.com:8443/',
      ])
        await assert.rejects(() => publicUrl(url));
    }
  );
  await check(
    'Crawler obeys robots rules and excludes scripts from extracted text',
    () => {
      assert.equal(
        robotsAllowed(
          'User-agent: *\nDisallow: /private\nAllow: /private/public',
          '/private/file'
        ),
        false
      );
      assert.equal(
        robotsAllowed(
          'User-agent: *\nDisallow: /private\nAllow: /private/public',
          '/private/public'
        ),
        true
      );
      assert.equal(
        robotsAllowed('User-agent: *\nUser-agent: Other\nDisallow: /', '/page'),
        false
      );
      assert.equal(
        robotsAllowed(
          'User-agent: Other\nDisallow: /\nUser-agent: *\nAllow: /',
          '/page'
        ),
        true
      );
      assert.equal(
        extractText('<script>secret()</script><p>Pradea &amp; desain</p>'),
        'Pradea & desain'
      );
    }
  );
  await check(
    'Webhook signature authenticates exact raw body and enforces 24-hour window',
    () => {
      const body = Buffer.from('{"entry":[]}');
      const signature =
        'sha256=' +
        createHmac('sha256', 'test-secret').update(body).digest('hex');
      assert.equal(verifySignature(body, signature, 'test-secret'), true);
      assert.equal(
        verifySignature(Buffer.from('{}'), signature, 'test-secret'),
        false
      );
      assert.equal(verifySignature(body, 'bad', 'test-secret'), false);
      assert.equal(messageWithinWindow(Date.now() - 25 * 3600000), false);
      assert.equal(messageWithinWindow(Date.now() + 120000), false);
      assert.equal(messageWithinWindow(Date.now() - 1000), true);
    }
  );
  await check(
    'Missing metrics remain null; cloud LLM endpoints rejected before fetch',
    async () => {
      assert.equal(
        metricSchema.parse({
          title: 'Post',
          platform: 'instagram',
          date: '2026-11-12',
          source: 'Native insights',
        }).reach,
        null
      );
      assert.ok(needsHandoff('Saya ingin bicara admin', 'admin,refund'));
      process.env.PRADEA_OLLAMA_URL = 'https://api.example.com';
      const count = outbound.length;
      await assert.rejects(
        () => localChat('test', 'system', 'prompt'),
        /lokal/
      );
      assert.equal((await modelStatus()).online, false);
      assert.equal(outbound.length, count);
      process.env.PRADEA_OLLAMA_URL = 'http://127.0.0.1:11434';
    }
  );
  await check(
    'Brand import validates JSON/CSV/Markdown, preserves omitted fields and ignores settings',
    () => {
      const preview = previewBrandImport(
        'brand.json',
        JSON.stringify({
          name: 'Imported brand',
          settings: { chatbotMode: 'auto' },
        })
      );
      assert.deepEqual(preview.brand, { name: 'Imported brand' });
      assert.deepEqual(preview.ignored, ['settings']);
      const csv = previewBrandImport(
        'brand.csv',
        'field,value\nname,"Pradea, Design"\nfaq,"Baris 1\nBaris 2"'
      );
      assert.equal(csv.brand.name, 'Pradea, Design');
      assert.equal(csv.brand.faq, 'Baris 1\nBaris 2');
      assert.deepEqual(
        previewBrandImport('row.csv', 'name,description\nPradea,Desain visual')
          .brand,
        { name: 'Pradea', description: 'Desain visual' }
      );
      const md = previewBrandImport(
        'brand.md',
        '# Nama brand\nPradea\n## Audiens utama\nUMKM\n## URL sumber\nhttps://example.com'
      );
      assert.equal(md.brand.audience, 'UMKM');
      assert.deepEqual(md.brand.sourceUrls, ['https://example.com']);
      assert.equal(
        previewBrandImport('brief.txt', 'Desain untuk UMKM.').brand.description,
        'Desain untuk UMKM.'
      );
      assert.throws(() => previewBrandImport('broken.json', '{'), /JSON/);
      assert.throws(() => previewBrandImport('large.txt', 'a'.repeat(3001)));
      assert.throws(() =>
        previewBrandImport('brand.json', '{"sourceUrls":["http://localhost"]}')
      );
      assert.throws(
        () => previewBrandImport('unsupported.pdf', '%PDF'),
        /JSON, CSV/
      );
    }
  );
  const orgId = 'smm-test-' + randomUUID();
  try {
    await db.$transaction(
      async (tx) => {
        await tx.organization.create({
          data: { id: orgId, name: 'Temporary SMM test - rolled back' },
        });
        const store = new SmmStore(tx);
        let published = [];
        const service = new SmmService(store, {
          createPost: async (...args) => {
            published.push(args);
            return [{ id: 'test-draft' }];
          },
        });
        let workspace = await store.workspace(orgId);
        await check(
          'Workspace persists in PostgreSQL and rejects stale revisions',
          async () => {
            workspace.data.settings.model = 'test-local';
            workspace.data.brand.faq = 'Pradea menyediakan desain visual.';
            workspace = await store.saveWorkspace(orgId, workspace.data, 0);
            assert.equal(
              (await store.workspace(orgId)).data.settings.model,
              'test-local'
            );
            await assert.rejects(
              () => store.saveWorkspace(orgId, workspace.data, 0),
              /berubah/
            );
          }
        );
        await check(
          'Records isolate organizations and reject conflicting edits',
          async () => {
            const row = await service.source(orgId, {
              title: 'FAQ test',
              type: 'note',
              text: 'Pradea menyediakan desain visual.',
              knowledge: true,
              url: '',
            });
            await assert.rejects(
              () => store.get('another-org', row.id),
              /tidak ditemukan/
            );
            await assert.rejects(
              () =>
                store.update('another-org', row.id, {}, 'ready', row.revision),
              /berubah/
            );
            await store.update(orgId, row.id, row.data, 'ready', row.revision);
            await assert.rejects(
              () => store.update(orgId, row.id, {}, 'ready', row.revision),
              /berubah/
            );
          }
        );
        await check(
          'Custom skills persist, isolate organizations, validate and execute in agent',
          async () => {
            const skill = await service.createSkill(orgId, {
              name: 'Pradea custom strategy',
              description: 'Strategi khusus untuk kebutuhan Pradea.',
              category: 'strategy',
              instructions:
                'CUSTOM_MARKER: Baca profil brand lalu buat tiga rekomendasi berbasis bukti.',
            });
            assert.ok(
              (await service.skills(orgId)).some(
                (s) => s.id === skill.id && s.custom
              )
            );
            assert.ok(
              !(await service.skills('another-org')).some(
                (s) => s.id === skill.id
              )
            );
            await assert.rejects(
              () => service.skill('another-org', skill.id),
              /tidak ditemukan/
            );
            await assert.rejects(() =>
              service.createSkill(orgId, {
                name: 'bad',
                description: 'invalid category',
                category: 'shell',
                instructions: 'a'.repeat(40),
              })
            );
            const before = outbound.length;
            queue = [
              JSON.stringify({
                steps: [
                  {
                    skill: skill.id,
                    task: 'Gunakan panduan kustom untuk strategi.',
                  },
                ],
              }),
              'Tiga rekomendasi berdasarkan profil brand.',
            ];
            const run = await service.enqueue(orgId, {
              workflow: 'strategy',
              brief: 'Susun strategi menggunakan skill kustom.',
              skills: [skill.id],
            });
            await service.execute(run);
            assert.equal((await store.get(orgId, run.id)).status, 'completed');
            assert.ok(
              outbound
                .slice(before)
                .some((r) => String(r.options.body).includes('CUSTOM_MARKER'))
            );
            assert.equal(queue.length, 0);
          }
        );
        await check(
          'Auto research uses saved brand snapshot, fetches sources and stores evidence',
          async () => {
            let ws = await store.workspace(orgId);
            const original = structuredClone(ws.data);
            await assert.rejects(
              () => service.autoResearch(orgId, ''),
              /deskripsi/
            );
            ws.data.brand.description = 'SAVED_BRAND_CONTEXT desain UMKM';
            ws.data.brand.sourceUrls = ['https://example.com/brand'];
            await store.saveWorkspace(orgId, ws.data, ws.revision);
            const savedReadSource = service.readSource;
            const fetches = [];
            service.readSource = async (url) => {
              fetches.push(url);
              return {
                url,
                text: 'SOURCE_EVIDENCE: katalog jasa desain.',
                fetchedAt: new Date().toISOString(),
              };
            };
            try {
              const run = await service.autoResearch(
                orgId,
                'Fokus konten Instagram'
              );
              ws = await store.workspace(orgId);
              ws.data.brand.description = 'CHANGED_AFTER_QUEUE';
              await store.saveWorkspace(orgId, ws.data, ws.revision);
              const before = outbound.length;
              queue = [
                JSON.stringify({
                  steps: [
                    {
                      skill: 'content-research-and-sourcing',
                      task: 'Analisis sumber brand.',
                    },
                  ],
                }),
                'Riset katalog dengan sumber https://example.com/brand',
              ];
              await service.execute(run);
              const result = await store.get(orgId, run.id);
              assert.equal(result.status, 'completed');
              assert.deepEqual(fetches, ['https://example.com/brand']);
              assert.ok(
                result.data.sourceEvidence.some(
                  (s) => s.url === 'https://example.com/brand'
                )
              );
              const prompts = outbound
                .slice(before)
                .filter((r) => r.options.body)
                .map((r) => JSON.parse(r.options.body).messages);
              assert.ok(
                prompts.some((m) => m[1].content.includes('SOURCE_EVIDENCE'))
              );
              assert.ok(
                prompts.every(
                  (m) =>
                    m[0].content.includes('SAVED_BRAND_CONTEXT') &&
                    !m[0].content.includes('CHANGED_AFTER_QUEUE')
                )
              );
              assert.equal(published.length, 0);
            } finally {
              service.readSource = savedReadSource;
              ws = await store.workspace(orgId);
              await store.saveWorkspace(orgId, original, ws.revision);
            }
          }
        );
        await check(
          'Agent executes skill plan, saves results and creates unapproved content',
          async () => {
            queue = [
              JSON.stringify({
                steps: [
                  {
                    skill: 'caption-writer',
                    task: 'Susun caption berdasarkan FAQ.',
                  },
                ],
              }),
              'Desain visual untuk kebutuhan brand Anda.',
              JSON.stringify({
                drafts: [
                  {
                    title: 'Desain Pradea',
                    platform: 'instagram',
                    caption: 'Desain visual untuk brand Anda.',
                    mediaBrief: 'Biru Pradea',
                    plannedDate: '',
                  },
                ],
              }),
            ];
            const run = await service.enqueue(orgId, {
              workflow: 'content',
              brief: 'Buat caption layanan desain Pradea.',
              skills: [],
            });
            const claimed = await store.claim('run', 'queued', 'running');
            assert.equal(claimed.id, run.id);
            await service.execute(claimed);
            const result = await store.get(orgId, run.id);
            assert.equal(result.status, 'completed');
            assert.equal(result.data.steps.length, 1);
            const drafts = await store.list(orgId, 'content');
            assert.equal(drafts.length, 1);
            assert.equal(drafts[0].data.approved, false);
            assert.equal(published.length, 0);
            assert.equal(queue.length, 0);
          }
        );
        await check(
          'Cancelled jobs and malformed model plans cannot create drafts',
          async () => {
            let run = await service.enqueue(orgId, {
              workflow: 'content',
              brief: 'Tugas ini dibatalkan.',
              skills: [],
            });
            await service.cancel(orgId, run.id);
            queue = [
              JSON.stringify({
                steps: [{ skill: 'caption-writer', task: 'Buat caption.' }],
              }),
            ];
            await service.execute(run);
            assert.equal((await store.get(orgId, run.id)).status, 'cancelled');
            run = await service.enqueue(orgId, {
              workflow: 'strategy',
              brief: 'Uji keluaran tidak valid.',
              skills: [],
            });
            queue = ['not json'];
            await service.execute(run);
            assert.equal((await store.get(orgId, run.id)).status, 'failed');
            assert.equal((await store.list(orgId, 'content')).length, 1);
          }
        );
        await check(
          'Unavailable model prevents queued work; routines can be saved paused',
          async () => {
            global.fetch = async () => {
              throw new Error('offline');
            };
            await assert.rejects(
              () =>
                service.enqueue(orgId, {
                  workflow: 'strategy',
                  brief: 'Buat strategi.',
                  skills: [],
                }),
              /belum siap/
            );
            await assert.rejects(
              () =>
                service.automation(orgId, {
                  name: 'Test',
                  workflow: 'report',
                  brief: 'Buat laporan.',
                  intervalHours: 24,
                  enabled: true,
                }),
              /model/
            );
            const paused = await service.automation(orgId, {
              name: 'Test',
              workflow: 'report',
              brief: 'Buat laporan.',
              intervalHours: 24,
              enabled: false,
            });
            assert.equal(paused.status, 'paused');
            global.fetch = fakeFetch;
          }
        );
        await check(
          'Simulations stay local and cannot be approved for real delivery',
          async () => {
            queue = [
              JSON.stringify({
                reply: 'Pradea menyediakan desain visual.',
                needsHuman: false,
                reason: 'Sesuai FAQ.',
              }),
            ];
            const simulated = await service.simulate(
              orgId,
              'Apa layanan Pradea?'
            );
            assert.equal(simulated.data.live, false);
            await assert.rejects(
              () =>
                service.approveReply(
                  orgId,
                  simulated.id,
                  'Test',
                  simulated.revision
                ),
              /terverifikasi/
            );
          }
        );
        Object.assign(process.env, {
          PRADEA_SMM_MESSAGING_ENABLED: 'true',
          PRADEA_SMM_OWNER_ORG_ID: orgId,
          PRADEA_SMM_PAGE_TOKEN: 'test-not-real',
          FACEBOOK_APP_SECRET: 'test-secret',
          PRADEA_SMM_VERIFY_TOKEN: 'test-verify',
          PRADEA_SMM_FB_PAGE_ID: '100',
          PRADEA_SMM_IG_ACCOUNT_ID: '101',
        });
        const event = {
          sender: { id: '200' },
          recipient: { id: '100' },
          timestamp: Date.now(),
          message: { mid: 'test-message-1', text: 'Apa layanan Pradea?' },
        };
        const payload = {
          object: 'page',
          entry: [{ id: '100', messaging: [event] }],
        };
        let message;
        await check(
          'Webhook delivery is deduplicated and wrong accounts/echoes/old messages ignored',
          async () => {
            await service.receiveMeta(payload);
            await service.receiveMeta(payload);
            await service.receiveMeta({
              object: 'page',
              entry: [
                {
                  id: '999',
                  messaging: [
                    { ...event, message: { mid: 'wrong', text: 'Hi' } },
                  ],
                },
              ],
            });
            await service.receiveMeta({
              object: 'page',
              entry: [
                {
                  id: '100',
                  messaging: [
                    {
                      ...event,
                      message: { mid: 'echo', text: 'Hi', is_echo: true },
                    },
                    {
                      ...event,
                      timestamp: Date.now() - 25 * 3600000,
                      message: { mid: 'old', text: 'Hi' },
                    },
                  ],
                },
              ],
            });
            const live = (await store.list(orgId, 'message')).filter(
              (m) => m.data.live
            );
            assert.equal(live.length, 1);
            message = live[0];
          }
        );
        await check(
          'Human handoff pauses and reactivates the same conversation',
          async () => {
            let ws = await store.workspace(orgId);
            ws.data.settings.chatbotMode = 'draft';
            await store.saveWorkspace(orgId, ws.data, ws.revision);
            await service.handoff(orgId, message.id, false);
            message = await store.update(
              orgId,
              message.id,
              { ...message.data, text: 'Saya ingin admin' },
              'processing',
              message.revision
            );
            await service.processMessage(message);
            const id = createHash('sha256')
              .update(`${orgId}:facebook:200:handoff`)
              .digest('hex');
            assert.equal(await store.handoffActive(orgId, id), true);
            message = await store.get(orgId, message.id);
            assert.equal(message.status, 'handoff');
          }
        );
        await check(
          'Enabling auto replies requires an explicit confirmation',
          async () => {
            const ws = await store.workspace(orgId);
            ws.data.settings.chatbotMode = 'auto';
            await assert.rejects(
              () => service.saveWorkspace(orgId, ws.data, ws.revision, false),
              /Konfirmasi/
            );
          }
        );
        await check(
          'Uncertain delivery is recorded once and never requeued',
          async () => {
            message = await service.approveReply(
              orgId,
              message.id,
              'Jawaban pemilik yang disetujui.',
              message.revision
            );
            message = await store.claim('message', 'approved', 'sending');
            let calls = 0;
            global.fetch = async (url) => {
              assert.ok(String(url).startsWith('https://graph.facebook.com/'));
              calls++;
              throw new Error('timeout');
            };
            await service.sendMessage(message);
            assert.equal(calls, 1);
            assert.equal(
              (await store.get(orgId, message.id)).status,
              'delivery-unknown'
            );
            assert.equal(
              await store.claim('message', 'approved', 'sending'),
              undefined
            );
            global.fetch = fakeFetch;
          }
        );
        await check(
          'A reviewed draft exports only through Postiz draft mode and deduplicates',
          async () => {
            const integration = await tx.integration.create({
              data: {
                organizationId: orgId,
                internalId: 'test-' + randomUUID(),
                name: 'Test account',
                providerIdentifier: 'instagram',
                type: 'social',
                token: 'test-not-real',
              },
            });
            let draft = (await store.list(orgId, 'content'))[0];
            await assert.rejects(
              () => service.exportDraft(orgId, draft.id, integration.id),
              /setujui/
            );
            draft = await store.update(
              orgId,
              draft.id,
              { ...draft.data, approved: true },
              'approved',
              draft.revision
            );
            await service.exportDraft(orgId, draft.id, integration.id);
            await service.exportDraft(orgId, draft.id, integration.id);
            assert.equal(published.length, 1);
            assert.equal(published[0][1].type, 'draft');
            assert.equal(published[0][0], orgId);
          }
        );
        throw rollback;
      },
      { timeout: 120000 }
    );
  } catch (e) {
    if (e !== rollback) throw e;
  }
  await check('All test records and test organization rolled back', async () =>
    assert.equal(await db.organization.count({ where: { id: orgId } }), 0)
  );
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    global.fetch = realFetch;
    for (const key of Object.keys(process.env))
      if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    await db.$disconnect();
    const report = path.resolve(
      root,
      '../log-pengujian/social-management-tests.json'
    );
    fs.mkdirSync(path.dirname(report), { recursive: true });
    fs.writeFileSync(
      report,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          mode: 'Real PostgreSQL rollback; mocked LLM, Meta and Postiz bridge',
          results,
        },
        null,
        2
      )
    );
    console.log(
      `${results.filter((r) => r.status === 'PASS').length}/${
        results.length
      } passed`
    );
  });
