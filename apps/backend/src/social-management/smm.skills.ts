import { categoryForSkill } from '@gitroom/helpers/social-management/skill-categories';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export function resourceRoot() {
  let current = resolve(process.cwd());
  for (let i = 0; i < 10; i++) {
    const folder = join(current, 'resources/social-media-skills');
    if (existsSync(join(folder, 'skills'))) return folder;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    'Paket skill Pradea tidak ditemukan. Jalankan dari folder project.'
  );
}
export function skillCatalog() {
  const base = join(resourceRoot(), 'skills');
  return readdirSync(base, { withFileTypes: true })
    .filter(
      (d) => d.isDirectory() && existsSync(join(base, d.name, 'SKILL.md'))
    )
    .map((d) => {
      const content = readFileSync(join(base, d.name, 'SKILL.md'), 'utf8');
      const front = content.split('---')[1] || '';
      const description = (
        front.match(
          /description:\s*(?:[>|]-?\s*)?([\s\S]*?)(?=\n\S[^\n]*:|$)/
        )?.[1] || ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      const external =
        /^(nano-banana|ideogram|flux|ai-image-editing|ai-video|veo-3|kling|luma|runway|heygen|synthesia|ai-voiceover|suno|ai-music-and-sound|capcut|descript|opus-clip|canva|captions-and-clipping)$/;
      return {
        id: d.name,
        name: d.name,
        category: categoryForSkill(d.name),
        custom: false,
        description,
        mode: external.test(d.name)
          ? 'brief-only'
          : [
              'scheduling-and-queue',
              'instagram-reels-publishing',
              'tiktok-video-publishing',
              'youtube-publishing-and-metadata',
            ].includes(d.name)
          ? 'postiz-manual'
          : 'text',
        source: `https://github.com/social-media-skills/skills/tree/f28cef2b7067ec64e79c9d85421c022c06659e03/skills/${d.name}`,
      };
    });
}
export function skillInstructions(id: string) {
  if (!skillCatalog().some((s) => s.id === id))
    throw new Error('Skill tidak dikenal.');
  const base = join(resourceRoot(), 'skills', id);
  const main = readFileSync(join(base, 'SKILL.md'), 'utf8');
  const refs = join(base, 'references');
  const referenceText = existsSync(refs)
    ? readdirSync(refs)
        .filter((f) => f.endsWith('.md'))
        .slice(0, 4)
        .map(
          (f) => `${f}\n${readFileSync(join(refs, f), 'utf8').slice(0, 3000)}`
        )
        .join('\n')
    : '';
  return (main + '\n' + referenceText).slice(0, 18000);
}
export const workflowSkills: Record<string, string[]> = {
  strategy: ['social-strategy', 'content-pillars', 'goals-and-kpis'],
  campaign: [
    'campaign-and-launch-planning',
    'content-calendar',
    'cross-platform-repurposing',
  ],
  content: ['idea-generation-and-ideation', 'hook-writer', 'caption-writer'],
  research: [
    'content-research-and-sourcing',
    'competitor-analysis',
    'idea-generation-and-ideation',
  ],
  report: [
    'analytics-and-reporting',
    'content-audit',
    'experimentation-and-ab-testing',
  ],
};
