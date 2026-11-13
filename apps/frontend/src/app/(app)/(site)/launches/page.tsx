import { branding } from '@gitroom/frontend/branding';
export const dynamic = 'force-dynamic';
import { LaunchesComponent } from '@gitroom/frontend/components/launches/launches.component';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: `${branding.name + ' Calendar'}`,
  description: '',
};
export default async function Index() {
  return <LaunchesComponent />;
}
