import { branding } from '@gitroom/frontend/branding';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Activate } from '@gitroom/frontend/components/auth/activate';
export const metadata: Metadata = {
  title: `${
    branding.name
  } - Activate your account`,
  description: '',
};
export default async function Auth() {
  return <Activate />;
}
