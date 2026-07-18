import type { ReactNode } from 'react';

type ActionLabelProps = {
  loading: boolean;
  loadingText: string;
  children: ReactNode;
};

export function ActionLabel({ loading, loadingText, children }: ActionLabelProps) {
  return <span className="action-label">{loading ? <span className="action-spinner" aria-hidden="true" /> : null}<span>{loading ? loadingText : children}</span></span>;
}
