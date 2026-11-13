import { branding } from '@gitroom/frontend/branding';
import { MediaLayoutComponent } from '@gitroom/frontend/components/new-layout/layout.media.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `${branding.name} Media`,
  description: '',
};

export default async function Page() {
  return <MediaLayoutComponent />
}
