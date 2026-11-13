import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import stripTags from 'striptags';

export function publicIPv4(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a, b, c] = ip.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || b === 2)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export async function publicUrl(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  )
    throw new Error('Riset hanya menerima URL HTTPS publik tanpa kredensial.');
  const host = url.hostname.toLowerCase();
  if (
    /(^|\.)(facebook\.com|instagram\.com|tiktok\.com|localhost|local|internal)$/.test(
      host
    )
  )
    throw new Error(
      'Gunakan API resmi atau impor data untuk platform sosial; crawler ini untuk situs web publik.'
    );
  const addresses = await lookup(host, { all: true, family: 4 });
  if (!addresses.length || addresses.some((a) => !publicIPv4(a.address)))
    throw new Error('Alamat lokal atau jaringan privat tidak diizinkan.');
  return { url, address: addresses[0].address };
}
export async function fetchPublic(
  input: string,
  hops = 0,
  checkRobots = false
): Promise<{ url: string; body: string; type: string; status: number }> {
  if (hops > 3) throw new Error('Terlalu banyak pengalihan URL.');
  const { url, address } = await publicUrl(input);
  if (checkRobots) {
    const policy = await fetchPublic(new URL('/robots.txt', url).href);
    if (
      policy.status !== 404 &&
      (policy.status !== 200 ||
        !robotsAllowed(policy.body, url.pathname + url.search))
    )
      throw new Error(
        'Sumber tidak mengizinkan crawler atau robots.txt tidak dapat diverifikasi. Gunakan impor catatan.'
      );
  }
  const result = await new Promise<{
    body: string;
    type: string;
    status: number;
    location?: string;
  }>((resolve, reject) => {
    const req = request(
      url,
      {
        signal: AbortSignal.timeout(12000),
        headers: {
          'User-Agent': 'PradeaResearchBot/1.0',
          Accept: 'text/html,text/plain,application/xml,text/xml',
          'Accept-Encoding': 'identity',
        },
        lookup: ((_host: string, opts: any, cb: any) =>
          opts.all
            ? cb(null, [{ address, family: 4 }])
            : cb(null, address, 4)) as any,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1_000_000) {
            res.destroy();
            req.destroy(new Error('Halaman melebihi batas 1 MB.'));
          } else chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () =>
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            type: String(res.headers['content-type'] || ''),
            status: res.statusCode || 500,
            location: res.headers.location,
          })
        );
      }
    );
    req.setTimeout(12000, () =>
      req.destroy(new Error('Sumber tidak merespons dalam 12 detik.'))
    );
    req.on('error', reject);
    req.end();
  });
  if (result.status >= 300 && result.status < 400 && result.location)
    return fetchPublic(
      new URL(result.location, url).href,
      hops + 1,
      checkRobots
    );
  return { url: url.href, ...result };
}
export function robotsAllowed(body: string, pathname: string) {
  let applies = false,
    hadRules = false;
  const rules: { allow: boolean; pattern: string }[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim();
    const split = line.indexOf(':');
    if (split < 0) continue;
    const key = line.slice(0, split).toLowerCase(),
      value = line.slice(split + 1).trim();
    if (key === 'user-agent') {
      if (hadRules) {
        applies = false;
        hadRules = false;
      }
      applies = applies || value === '*' || /pradea/i.test(value);
    }
    if (key === 'allow' || key === 'disallow') {
      hadRules = true;
      if (applies && value)
        rules.push({ allow: key === 'allow', pattern: value });
    }
  }
  const matched = rules
    .filter((r) =>
      new RegExp(
        '^' +
          r.pattern
            .split('*')
            .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*')
            .replace(/\\\$$/, '$')
      ).test(pathname)
    )
    .sort(
      (a, b) =>
        b.pattern.length - a.pattern.length || Number(b.allow) - Number(a.allow)
    );
  return !matched.length || matched[0].allow;
}
export function extractText(html: string) {
  const clean = html.replace(
    /<(script|style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,
    ' '
  );
  return stripTags(
    clean.replace(/<\/(p|div|h[1-6]|li|article|section)>/gi, '\n')
  )
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
    .slice(0, 18000);
}
export async function scrapePublic(input: string) {
  const page = await fetchPublic(input, 0, true);
  if (page.status !== 200)
    throw new Error(`Sumber merespons HTTP ${page.status}.`);
  if (!/text\/|xml|html/.test(page.type))
    throw new Error('Sumber harus berupa halaman teks, HTML, atau RSS/XML.');
  const text = extractText(page.body);
  if (text.length < 80)
    throw new Error(
      'Teks terlalu sedikit; halaman mungkin membutuhkan login atau JavaScript. Gunakan impor catatan.'
    );
  return { url: page.url, text, fetchedAt: new Date().toISOString() };
}
