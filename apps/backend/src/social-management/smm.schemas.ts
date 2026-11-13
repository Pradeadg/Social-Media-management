import { z } from 'zod';
import { skillCategories } from '@gitroom/helpers/social-management/skill-categories';

export const workflows = [
  'strategy',
  'campaign',
  'content',
  'research',
  'report',
] as const;
export const brandSchema = z.object({
  name: z.string().trim().min(1).max(100).default('Pradea'),
  description: z.string().max(3000).default(''),
  audience: z.string().max(2000).default(''),
  voice: z.string().max(2000).default('Bahasa Indonesia, ramah, jelas.'),
  offers: z.string().max(4000).default(''),
  goals: z.string().max(2000).default(''),
  boundaries: z
    .string()
    .max(3000)
    .default('Jangan mengarang harga, testimoni, atau hasil.'),
  faq: z.string().max(12000).default(''),
  platforms: z
    .array(z.enum(['instagram', 'facebook', 'tiktok']))
    .max(3)
    .default(['instagram', 'facebook', 'tiktok']),
  sourceUrls: z
    .array(
      z
        .string()
        .url()
        .max(2000)
        .refine((v) => {
          const url = new URL(v);
          return url.protocol === 'https:' && !url.username && !url.password;
        }, 'Gunakan URL HTTPS tanpa kredensial')
    )
    .max(5)
    .default([]),
  timezone: z
    .string()
    .refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, 'Zona waktu tidak valid')
    .default('Asia/Jakarta'),
});
export const settingsSchema = z.object({
  model: z
    .string()
    .max(120)
    .regex(/^[a-zA-Z0-9_.:/-]*$/)
    .default(''),
  chatbotMode: z.enum(['off', 'draft', 'auto']).default('off'),
  botDisclosure: z
    .string()
    .min(5)
    .max(250)
    .default(
      'Saya asisten AI Pradea. Tim kami dapat melanjutkan percakapan jika diperlukan.'
    ),
  handoffWords: z
    .string()
    .max(1000)
    .default(
      'manusia,admin,refund,pengembalian dana,komplain,pembayaran,password,otp'
    ),
  maxRepliesPerDay: z.number().int().min(1).max(100).default(20),
});
export const workspaceSchema = z.object({
  brand: brandSchema,
  settings: settingsSchema,
});
export type Workspace = z.infer<typeof workspaceSchema>;
export const runSchema = z.object({
  workflow: z.enum(workflows),
  brief: z.string().trim().min(5).max(6000),
  skills: z
    .array(z.string().regex(/^[a-z0-9-]+$/))
    .max(6)
    .default([]),
});
export type RunInput = z.infer<typeof runSchema>;
export const sourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(['url', 'note']),
  url: z.string().max(2000).default(''),
  text: z.string().max(20000).default(''),
  knowledge: z.boolean().default(false),
});
export const contentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  platform: z.enum(['instagram', 'facebook', 'tiktok']),
  format: z.string().max(100).default('caption'),
  caption: z.string().max(15000),
  mediaBrief: z.string().max(8000).default(''),
  plannedDate: z.string().max(30).default(''),
  approved: z.boolean().default(false),
});
export const metricSchema = z.object({
  title: z.string().min(1).max(200),
  platform: z.enum(['instagram', 'facebook', 'tiktok']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(3).max(1000),
  reach: z.number().nonnegative().nullable().default(null),
  likes: z.number().nonnegative().nullable().default(null),
  comments: z.number().nonnegative().nullable().default(null),
  shares: z.number().nonnegative().nullable().default(null),
  saves: z.number().nonnegative().nullable().default(null),
});
export const automationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  workflow: z.enum(workflows),
  brief: z.string().trim().min(5).max(6000),
  intervalHours: z.number().int().min(6).max(720),
  enabled: z.boolean().default(false),
});
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input);
}

export const customSkillSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  category: z
    .string()
    .refine(
      (v) => Object.prototype.hasOwnProperty.call(skillCategories, v),
      'Kategori tidak valid'
    ),
  instructions: z.string().trim().min(30).max(18000),
});
