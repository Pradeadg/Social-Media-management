export const skillCategories = {
  strategy: 'Strategi & brand',
  research: 'Riset & tren',
  writing: 'Konten & copywriting',
  creative: 'Visual, video & audio',
  community: 'Komunitas & percakapan',
  growth: 'Pertumbuhan & pemasaran',
  analytics: 'Analisis & evaluasi',
  publishing: 'Perencanaan & publikasi',
} as const;
export type SkillCategory = keyof typeof skillCategories;

export function categoryForSkill(id: string): SkillCategory {
  if (/analytics|audit|experimentation|kpis/.test(id)) return 'analytics';
  if (/research|competitor|trend|viral-reverse/.test(id)) return 'research';
  if (
    /community|reply|engagement|crisis|facebook-groups|social-selling/.test(id)
  )
    return 'community';
  if (/publishing|scheduling|calendar|batch-content|platform-specs/.test(id))
    return 'publishing';
  if (
    /growth|seo|monetization|funnels|traffic|collabs|influencer|reddit-marketing|ai-search/.test(
      id
    )
  )
    return 'growth';
  if (
    /^(nano-banana|ideogram|flux|ai-|veo|kling|luma|runway|heygen|synthesia|suno|capcut|descript|opus-clip|canva)|design|image|infographic|thumbnail|captions-and-clipping|podcast/.test(
      id
    )
  )
    return 'creative';
  if (
    /strategy|brand-profile|content-pillars|campaign|profile-optimization|voice-builder/.test(
      id
    )
  )
    return 'strategy';
  return 'writing';
}
