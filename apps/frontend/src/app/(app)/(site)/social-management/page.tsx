import { Metadata } from 'next';
import { SocialManagement } from '@gitroom/frontend/components/social-management/social-management';

export const metadata: Metadata = { title: 'Pradea · Social Management' };
export default function Page() {
  return <SocialManagement />;
}
