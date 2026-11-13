import { branding } from '@gitroom/frontend/branding';
import { Metadata } from 'next';
import { Agent } from '@gitroom/frontend/components/agents/agent';
import { AgentChat } from '@gitroom/frontend/components/agents/agent.chat';
export const metadata: Metadata = {
  title: branding.name + ' - Agent',
  description: '',
};
export default async function Page() {
  return (
    <AgentChat />
  );
}
