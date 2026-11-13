import { BadRequestException } from '@nestjs/common';
import { brandSchema } from './smm.schemas';

const aliases: Record<string, string> = {
  name: 'name',
  nama: 'name',
  namabrand: 'name',
  brandname: 'name',
  description: 'description',
  deskripsi: 'description',
  tentangbrand: 'description',
  audience: 'audience',
  audiens: 'audience',
  audiensutama: 'audience',
  targetaudience: 'audience',
  voice: 'voice',
  gayabahasa: 'voice',
  toneofvoice: 'voice',
  goals: 'goals',
  tujuan: 'goals',
  tujuanmediasosial: 'goals',
  offers: 'offers',
  layanan: 'offers',
  layananhargadanketentuan: 'offers',
  boundaries: 'boundaries',
  batasan: 'boundaries',
  batasandanklaimyangdilarang: 'boundaries',
  faq: 'faq',
  pengetahuanlayanan: 'faq',
  faqpengetahuanlayanan: 'faq',
  timezone: 'timezone',
  zonawaktu: 'timezone',
  platforms: 'platforms',
  platform: 'platforms',
  sourceurls: 'sourceUrls',
  sumber: 'sourceUrls',
  urlsumber: 'sourceUrls',
  website: 'sourceUrls',
};
const field = (s: string) => aliases[s.toLowerCase().replace(/[^a-z]/g, '')];

// CSV parser handles quoted commas, escaped quotes and multiline cells.
function csv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.trim());
      cell = '';
      if (c === '\n') {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) throw new BadRequestException('Tanda kutip CSV belum ditutup.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows.filter((r) => r.some(Boolean));
}

export function previewBrandImport(filename: string, raw: string) {
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) throw new BadRequestException('File kosong.');
  const ext = filename.toLowerCase().split('.').pop();
  let input: Record<string, unknown> = {};
  if (ext === 'json') {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException('Format JSON tidak valid.');
    }
    input = parsed?.brand ?? parsed;
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new BadRequestException('JSON harus berupa objek profil brand.');
  } else if (ext === 'csv') {
    const rows = csv(text);
    if (
      rows[0]?.length > 2 ||
      (rows[0]?.every((v) => Boolean(field(v))) && rows.length === 2)
    ) {
      if (rows.length !== 2)
        throw new BadRequestException(
          'CSV hanya boleh memuat satu profil brand.'
        );
      rows[0].forEach((key, i) => {
        input[key] = rows[1][i] || '';
      });
    } else {
      for (const row of rows) {
        if (row.length !== 2)
          throw new BadRequestException('Gunakan CSV dua kolom: field,value.');
        input[row[0]] = row[1];
      }
    }
  } else if (ext === 'txt' || ext === 'md') {
    let current = '';
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:#{1,6}\s+)?([^:]{1,70}?)(?::\s*(.*))?$/);
      const key = match && field(match[1]);
      if (key) {
        current = key;
        input[key] = match?.[2] || '';
      } else if (current) input[current] = String(input[current]) + '\n' + line;
    }
    if (!Object.keys(input).length) input.description = text;
  } else throw new BadRequestException('Gunakan file JSON, CSV, TXT, atau MD.');

  const patch: Record<string, unknown> = {};
  const ignored: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    const canonical = field(key);
    if (!canonical) {
      ignored.push(key);
      continue;
    }
    if (canonical === 'platforms' || canonical === 'sourceUrls') {
      patch[canonical] = Array.isArray(value)
        ? value
        : typeof value === 'string'
        ? value
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : value;
    } else patch[canonical] = typeof value === 'string' ? value.trim() : value;
  }
  if (!Object.keys(patch).length)
    throw new BadRequestException(
      'Tidak ada kolom profil yang dikenali. Unduh template untuk contoh format.'
    );
  // Partial validation keeps omitted fields out: import must never reset other data.
  return {
    brand: brandSchema.partial().parse(patch),
    fields: Object.keys(patch),
    ignored,
  };
}
