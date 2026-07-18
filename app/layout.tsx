import './globals.css';
import './verification.css';
import './traceability.css';
import './release.css';

export const metadata = {
  title: 'Axiom — Engineering OS',
  description: 'Turn project knowledge into approved architecture, engineering designs, and evidence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
