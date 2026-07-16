import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Axiom Day 1', description: 'Fixture-backed NotifyFlow analysis demo' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
