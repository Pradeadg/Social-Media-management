import { branding } from '@gitroom/frontend/branding';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: branding.name + ' - Agent',
  description: '',
};

export default async function Page() {
  return redirect('/agents/new');
}
