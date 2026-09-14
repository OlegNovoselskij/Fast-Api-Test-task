import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { BootScreen } from './BootScreen';
import { createAppServices, deleteAppData, type AppServices } from './services';

type ContextValue = { services: AppServices; resetAppData: () => Promise<void> };

const ServicesContext = createContext<ContextValue | null>(null);

type BootState =
  | { phase: 'booting' }
  | { phase: 'ready'; services: AppServices }
  | { phase: 'failed'; error: unknown };

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootState>({ phase: 'booting' });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    let created: AppServices | null = null;
    createAppServices().then(
      (services) => {
        created = services;
        if (isCancelled) void services.dispose();
        else setState({ phase: 'ready', services });
      },
      (error: unknown) => !isCancelled && setState({ phase: 'failed', error }),
    );
    return () => {
      isCancelled = true;
      void created?.dispose();
    };
  }, [generation]);

  const resetAppData = useCallback(async () => {
    if (state.phase === 'ready') await state.services.dispose();
    setState({ phase: 'booting' });
    await deleteAppData();
    setGeneration((value) => value + 1);
  }, [state]);

  if (state.phase !== 'ready') {
    return (
      <BootScreen
        error={state.phase === 'failed' ? state.error : null}
        onRetry={() => setGeneration((value) => value + 1)}
      />
    );
  }

  return (
    <ServicesContext.Provider value={{ services: state.services, resetAppData }}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): ContextValue {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('useServices must be used inside ServicesProvider');
  return value;
}
