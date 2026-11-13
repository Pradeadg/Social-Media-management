'use client';
import { branding } from '@gitroom/frontend/branding';

export const Logo = () => (
  <img src={branding.logoMark} alt={branding.name} width={48} height={48}
    className="my-[12px] mx-auto min-w-[48px]" />
);
