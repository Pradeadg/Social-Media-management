import { branding } from '@gitroom/frontend/branding';

export const LogoTextComponent = () => (
  <div className="pradea-wordmark">
    <img src={branding.logoMark} width={40} height={40} alt="" aria-hidden="true" />
    <span>{branding.name}</span>
  </div>
);
