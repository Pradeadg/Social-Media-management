export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { AttributionComponent } from '@gitroom/frontend/components/auth/attribution.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { branding } from '@gitroom/frontend/branding';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <MantineWrapper>
      <Toaster />
      <div className="pradea-auth">
        <ReturnUrlComponent />
        <AttributionComponent />
        <section className="pradea-auth-form" aria-label="Account access">
          <header><LogoTextComponent /></header>
          <div className="pradea-auth-content"><div className="flex">{children}</div></div>
          <footer>{branding.tagline}</footer>
        </section>
        <aside className="pradea-auth-story" aria-label="About Pradea">
          <div className="pradea-eyebrow">YOUR SOCIAL WORKSPACE</div>
          <h2>Make every post<br /><span>feel like you.</span></h2>
          <p>Create for Instagram, Facebook, and TikTok. Bring your ideas, your accounts, and your next big moment together in {branding.name}.</p>
          <div className="pradea-board" aria-hidden="true">
            <div className="pradea-board-head"><strong>A little room for your next idea.</strong><span>Your calendar</span></div>
            <div className="pradea-week">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i}>{day}</span>)}</div>
            <div className="pradea-days">{Array.from({ length: 14 }, (_, i) => <span key={i} />)}</div>
            <div className="pradea-board-caption"><i />One space. All your creative plans.</div>
          </div>
          <div className="pradea-steps"><span><b>01</b> Connect</span><span><b>02</b> Create</span><span><b>03</b> Schedule</span></div>
        </aside>
      </div>
    </MantineWrapper>
  );
}
