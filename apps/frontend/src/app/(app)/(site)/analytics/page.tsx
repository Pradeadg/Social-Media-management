import { branding } from '@gitroom/frontend/branding';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { PlatformAnalytics } from '@gitroom/frontend/components/platform-analytics/platform.analytics';
export const metadata: Metadata = {
  title: `${branding.name} Analytics`,
  description: '',
};
export default async function Index() {
  return <PlatformAnalytics />;
}
