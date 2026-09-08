import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BrokerSessionStorage, AgentDto } from '../api/api';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════
export type BrokerSession = AgentDto;

interface BrokerContextType {
  broker:          BrokerSession | null;
  isLoadingBroker: boolean;
  loginBroker:     (agent: BrokerSession, token: string) => Promise<void>;
  logoutBroker:    () => Promise<void>;
}

export const BrokerContext = createContext<BrokerContextType>({} as BrokerContextType);

// ════════════════════════════════════════════════════════════════════
// PROVIDER
// ════════════════════════════════════════════════════════════════════
export function BrokerProvider({ children }: { children: ReactNode }) {
  const [broker, setBroker]                 = useState<BrokerSession | null>(null);
  const [isLoadingBroker, setIsLoadingBroker] = useState(true);

  // ── Restore broker session on launch ──────────────────────────────
  // This is what makes "close app → reopen → land on Broker Dashboard" work.
  useEffect(() => {
    (async () => {
      try {
        const [saved, token] = await Promise.all([
          BrokerSessionStorage.getBroker(),
          BrokerSessionStorage.getToken(),
        ]);
        // Require both — a broker record without a token isn't a valid
        // authenticated session (e.g. leftover data from before PIN auth
        // was added). Treat as logged out rather than silently trusting it.
        if (saved && token) setBroker(saved);
        else await BrokerSessionStorage.clear();
      } catch {
        // fresh start / corrupted storage — treat as logged out
      } finally {
        setIsLoadingBroker(false);
      }
    })();
  }, []);

  const loginBroker = useCallback(async (agent: BrokerSession, token: string) => {
    await Promise.all([
      BrokerSessionStorage.saveBroker(agent),
      BrokerSessionStorage.saveToken(token),
    ]);
    setBroker(agent);
  }, []);

  const logoutBroker = useCallback(async () => {
    await BrokerSessionStorage.clear();
    setBroker(null);
  }, []);

  return (
    <BrokerContext.Provider value={{ broker, isLoadingBroker, loginBroker, logoutBroker }}>
      {children}
    </BrokerContext.Provider>
  );
}