'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

type BacklogEligibilityContextValue = {
  clarificationBlocked: boolean;
  setClarificationBlocked: (blocked: boolean) => void;
};

const BacklogEligibilityContext = createContext<BacklogEligibilityContextValue | null>(null);

export function BacklogEligibilityProvider({ children }: { children: ReactNode }) {
  const [clarificationBlocked, setClarificationBlocked] = useState(false);
  const value = useMemo(() => ({ clarificationBlocked, setClarificationBlocked }), [clarificationBlocked]);
  return <BacklogEligibilityContext value={value}>{children}</BacklogEligibilityContext>;
}

export function useBacklogEligibility(): BacklogEligibilityContextValue {
  const context = useContext(BacklogEligibilityContext);
  if (context === null) throw new Error('Backlog actions require BacklogEligibilityProvider');
  return context;
}
