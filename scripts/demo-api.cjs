// Explicit, local-only preview backend. No database or external API connections.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const account = JSON.parse(fs.readFileSync(path.join(root, '.local-tools/demo-account.json'), 'utf8'));
const token = randomBytes(32).toString('hex');
let signedIn = false;
const now = new Date().toISOString();
const user = { id: 'pradea-demo-user', email: account.email, name: 'Pradea Demo',
  orgId: 'pradea-demo-org', tier: 'PRO', role: 'SUPERADMIN', admin: false,
  totalChannels: 3, publicApi: 'DEMO-NOT-A-REAL-API-KEY', timezoneName: 'Asia/Jakarta',
  timezone: 420, picture: '/brand/pradea-mark.svg', isTrailing: false, allowTrial: false,
  impersonate: false, streakSince: null, createdAt: now, activated: true };
const channels = ['instagram', 'facebook', 'tiktok'].map((provider, index) => ({
  id: `demo-${provider}`, name: `Pradea ${provider} (demo)`, internalId: `demo-${index}`,
  identifier: provider, providerIdentifier: provider, type: 'social', disabled: false,
  inBetweenSteps: false, refreshNeeded: false, editor: 'normal', display: provider,
  picture: '/brand/pradea-mark.svg', changeProfilePicture: false, changeNickName: false,
  additionalSettings: '[]', time: [{ time: 540 }], customer: null,
}));
const posts = channels.map((channel, index) => {
  const date = new Date();
  date.setHours(10 + index * 2, 0, 0, 0);
  return { id: `demo-post-${index}`, group: `demo-group-${index}`, content: [
    '<p>[DEMO] Kenalan dengan Pradea. Ruang untuk ide dan cerita brand kita.</p>',
    '<p>[DEMO] Cerita di balik proses kreatif Pradea. Ini contoh posting kalender.</p>',
    '<p>[DEMO] Ide video pendek: tiga langkah memulai konten brand sendiri.</p>',
  ][index], publishDate: date.toISOString(), state: 'DRAFT', integration: channel,
    integrationId: channel.id, tags: [], image: '[]', settings: '{}',
    intervalInDays: null, releaseURL: null, releaseId: null, creationMethod: 'UI' };
});
const origins = new Set(['http://localhost:4200', 'http://127.0.0.1:4200']);
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Cache-Control', 'no-store');
  if (origin && !origins.has(origin)) { res.writeHead(403); return res.end('Local demo only'); }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, auth, showorg, impersonate, x-copilotkit-runtime-client-gql-version, x-copilotkit-runtime-client-gql-version-header');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'auth, reload, logout');
  const send = (data, status = 200, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(data));
  };
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://localhost:3000');
  const p = url.pathname;
  console.log(`${req.method} ${p}`); // Never log credentials, tokens, or query strings.
  try {
    if (p === '/demo/health' && req.method === 'GET') return send({ mode: 'pradea-local-demo' });
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1024 * 1024) return send({ message: 'Preview request too large' }, 413);
    }
    if (p === '/auth/login' && req.method === 'POST') {
      const input = JSON.parse(body || '{}');
      const actual = scryptSync(String(input.password || ''), account.salt, 64);
      if (input.email !== account.email || !timingSafeEqual(actual, Buffer.from(account.hash, 'hex'))) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Email atau password demo salah.');
      }
      signedIn = true;
      return send({ demo: true }, 200, { auth: token, reload: 'true' });
    }
    const cookieAuth = (req.headers.cookie || '').match(/(?:^|;\s*)auth=([^;]+)/)?.[1];
    if (!signedIn || (req.headers.auth || cookieAuth) !== token) return send({ message: 'Login demo diperlukan' }, 401);
    if (p === '/user/logout') { signedIn = false; return send({}, 200, { logout: 'true' }); }
    if (p === '/copilot/chat' && req.method === 'POST') {
      const input = JSON.parse(body || '{}');
      if (input.method === 'info') return send({ version: '1.0.0', agents: { default: { name: 'Demo preview', description: 'AI tidak aktif dalam mode demo.' } } });
      return send({ message: 'AI tidak aktif dalam preview demo.' }, 503);
    }
    if (req.method !== 'GET') return send({ message: 'Mode demo hanya untuk melihat. Perubahan tidak disimpan dan posting tidak dikirim.' }, 403);
    if (p === '/user/self' || p === '/user/personal') return send(user);
    if (p === '/user/organizations') return send([{ id: user.orgId, name: 'Pradea — Demo Lokal' }]);
    if (p === '/announcements') return send([{ id: 'pradea-demo', title: 'DEMO LOKAL — Data contoh; perubahan dan posting tidak dikirim.', description: 'Akun dan channel ini hanya contoh untuk melihat UI Pradea. Instagram, Facebook, dan TikTok belum terhubung. Gunakan Stop-Demo.cmd sebelum menjalankan backend asli.', color: 'INFO', createdAt: now }]);
    if (p === '/integrations/list') return send({ integrations: channels });
    if (p === '/integrations') return send({ social: [], article: [] });
    if (p === '/posts' || p === '/posts/list') {
      const start = url.searchParams.get('startDate');
      const end = url.searchParams.get('endDate');
      const state = url.searchParams.get('state');
      const filtered = posts.filter(post => (!start || post.publishDate >= start) && (!end || post.publishDate <= end) && (!state || state === 'all' || state === 'draft'));
      return send({ posts: filtered, comments: [], total: filtered.length, page: 0, limit: 100, hasMore: false });
    }
    if (p.startsWith('/posts/group/')) return send(posts.filter(post => post.group === p.split('/')[3]));
    if (p === '/notifications') return send({ total: 0 });
    if (p === '/notifications/list') return send({ notifications: [], lastReadNotifications: now });
    if (p === '/media') return send({ results: [], pages: 0 });
    if (p.startsWith('/analytics/demo-')) return send(['Views (demo)', 'Engagement (demo)', 'Reach (demo)'].map((label, index) => ({
      label, percentageChange: 0, data: Array.from({ length: 7 }, (_, day) => ({
        date: new Date(Date.now() - (6 - day) * 86400000).toISOString().slice(0, 10),
        total: (index + 1) * (day + 2) * 10,
      })),
    })));
    if (p === '/signatures/default') return send(null);
    if (p === '/settings/team') return send({ users: [{ user, role: 'SUPERADMIN' }] });
    if (p === '/settings/shortlink') return send({ shortlink: 'NO' });
    if (p === '/user/email-notifications') return send({ sendSuccessEmails: false, sendFailureEmails: false, sendStreakEmails: false });
    if (p === '/user/delete-account-info') return send({ organizations: [] });
    if (p === '/copilot/credits') return send({ credits: 0 });
    if (/\/integrations\/(social|connect)|\/url$/.test(p)) return send({ message: 'Koneksi akun tidak aktif dalam demo.' }, 403);
    // Empty lists for secondary read-only panels; requests stay within this process.
    return send([]);
  } catch { return send({ message: 'Permintaan demo tidak valid' }, 400); }
});
server.listen(3000, '127.0.0.1', () => console.log('Pradea DEMO API ready on 127.0.0.1:3000 (read-only)'));
