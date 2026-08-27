/**
 * usePartyStatement.ts
 *
 * Loads the raw org-wide collections ONCE (parties, agents, dispatch,
 * purchase docs, job challans, payments, receipts — same data the web
 * AccountStatement page fetches), then lets the screen recompute the
 * statement for any from/to date range or "show opening" toggle
 * WITHOUT refetching — matching how the web page behaves (data is
 * loaded once, handleShow() just recomputes).
 *
 * If your org's data grows very large, the right fix is a backend
 * endpoint that filters by partyId (see PartyOrdersScreen's
 * partyOrderApi.getByParty for the pattern) — this hook can then swap
 * its fetch calls for that single scoped endpoint without the screen
 * or statementCalculator needing to change.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { statementRawApi } from '../api/api';
import {
  computePartyStatement,
  RawStatementData,
  StatementResult,
} from '../utils/statementCalculator';

/**
 * Fetches one endpoint. On ANY failure (network, 401, 404, etc.) it
 * logs the error (so you can see exactly which endpoint/status broke
 * in your Metro/logcat console) and falls back to an empty array
 * instead of failing the whole screen — same resilience as the web
 * page's `safeGet` helper.
 */
async function safeGet<T>(label: string, fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const res = await fn();
    return res.data;
  } catch (err: any) {
    console.warn(
      `[usePartyStatement] "${label}" failed — status: ${err?.response?.status ?? 'network error'} — ` +
      `url: ${err?.config?.url ?? 'unknown'} — message: ${err?.message ?? err}`,
    );
    return [] as any;
  }
}

export function usePartyStatement(partyName: string) {
  const [raw, setRaw] = useState<RawStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRaw = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      // Each call is isolated — one failing endpoint no longer blanks
      // the whole screen. Check your Metro/logcat console for
      // "[usePartyStatement] ... failed" lines if data looks empty.
      const [
        parties,
        agents,
        dispatchChallans,
        dispatchReturnChallans,
        otherDispatchChallans,
        purchaseOrders,
        purchaseEntries,
        purchaseReturns,
        payments,
        jobOutwards,
        jobInwards,
        receipts,
      ] = await Promise.all([
        safeGet('parties (/party/all)', statementRawApi.getAllParties),
        safeGet('agents (/agent/list)', statementRawApi.getAllAgents),
        safeGet('dispatch (/dispatch-challan)', statementRawApi.getDispatchChallans),
        safeGet('dispatch return (/dispatch-return-challan)', statementRawApi.getDispatchReturnChallans),
        safeGet('other dispatch (/other-dispatch-challan)', statementRawApi.getOtherDispatchChallans),
        safeGet('purchase orders (/purchase-orders)', statementRawApi.getPurchaseOrders),
        safeGet('purchase entries (/purchase-entry)', statementRawApi.getPurchaseEntries),
        safeGet('purchase returns (/purchase-returns)', statementRawApi.getPurchaseReturns),
        safeGet('payments (/payment)', statementRawApi.getPayments),
        safeGet('job outward (/job-outward-challan)', statementRawApi.getJobOutwardChallans),
        safeGet('job inward (/job-inward-challan)', statementRawApi.getJobInwardChallans),
        statementRawApi.getReceipts(), // already has its own internal try/catch
      ]);

      setRaw({
        parties: Array.isArray(parties) ? parties : [],
        agents: Array.isArray(agents) ? agents : [],
        dispatchChallans: Array.isArray(dispatchChallans) ? dispatchChallans : [],
        dispatchReturnChallans: Array.isArray(dispatchReturnChallans) ? dispatchReturnChallans : [],
        otherDispatchChallans: Array.isArray(otherDispatchChallans) ? otherDispatchChallans : [],
        purchaseOrders: Array.isArray(purchaseOrders) ? purchaseOrders : [],
        purchaseEntries: Array.isArray(purchaseEntries) ? purchaseEntries : [],
        purchaseReturns: Array.isArray(purchaseReturns) ? purchaseReturns : [],
        payments: Array.isArray(payments) ? payments : [],
        jobOutwards: Array.isArray(jobOutwards) ? jobOutwards : [],
        jobInwards: Array.isArray(jobInwards) ? jobInwards : [],
        receipts: Array.isArray(receipts) ? receipts : [],
      });
    } catch (err: any) {
      // Should rarely hit now (safeGet swallows per-call errors), but
      // keep a fallback in case something outside those calls throws.
      console.warn('[usePartyStatement] unexpected top-level failure:', err?.message ?? err);
      setError('Could not load statement data. Pull down to retry.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRaw();
  }, [loadRaw]);

  /**
   * Recompute the statement for a date range — instant, no network
   * call, since `raw` already holds everything.
   */
  const compute = useCallback(
    (fromDate: string, toDate: string, showOpening: boolean): StatementResult | null => {
      if (!raw) return null;
      return computePartyStatement(raw, partyName, fromDate, toDate, showOpening);
    },
    [raw, partyName],
  );

  return {
    loading,
    refreshing,
    error,
    hasData: raw !== null,
    refresh: () => loadRaw(true),
    retry: () => loadRaw(false),
    compute,
  };
}