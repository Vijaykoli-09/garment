import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BrokerSessionStorage, AgentDto } from '../api/api';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════
export type BrokerSession = AgentDto;

interface BrokerContextType {
  broker:          BrokerSession | null;
  isLoadingBroker: boolean;
  loginBroker:     (agent: BrokerSession) => Promise<void>;
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
        const saved = await BrokerSessionStorage.getBroker();
        if (saved) setBroker(saved);
      } catch {
        // fresh start / corrupted storage — treat as logged out
      } finally {
        setIsLoadingBroker(false);
      }
    })();
  }, []);

  const loginBroker = useCallback(async (agent: BrokerSession) => {
    await BrokerSessionStorage.saveBroker(agent);
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