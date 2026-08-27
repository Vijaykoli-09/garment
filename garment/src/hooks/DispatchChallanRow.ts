/**
 * useDispatchChallans.ts
 *
 * Loads the raw org-wide dispatch challan list ONCE via the same
 * endpoint the web DispatchChallan page uses (`GET /dispatch-challan`,
 * exposed here as `statementRawApi.getDispatchChallans`), then lets
 * the screen filter to one party + any date range WITHOUT refetching.
 *
 * Same shape/pattern as usePartyStatement.ts on purpose — the list
 * response already includes each challan's full `rows[]` array (see
 * the web ListViewModal, which renders `c.rows[0]` straight off the
 * list response), so nothing else needs to be fetched to build the
 * print/PDF later.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { statementRawApi } from '../api/api';

export interface DispatchChallanRow {
  barCode?: string;
  baleNo?: string;
  artNo?: string;
  description?: string;
  lotNumber?: string;
  size?: string;
  shade?: string;
  box?: string | number;
  pcsPerBox?: string | number;
  pcs?: string | number;
  rate?: string | number;
  amt?: string | number;
}

export interface PackingRow {
  itemName?: string;
  quantity?: string | number;
}

export interface DispatchChallan {
  id: number;
  serialNo?: string;
  challanNo?: string;
  date?: string;
  dated?: string;              // some records use `dated` instead of `date`
  partyName?: string;
  brokerName?: string;
  transportName?: string;
  station?: string;
  destination?: string;
  remarks1?: string;           // "LR Date" in the print template
  remarks2?: string;           // "Remarks" in the print template
  dispatchedBy?: string;       // "LR No" in the print template
  totalAmt?: number | string;
  discount?: number | string;
  discountPercent?: number | string;
  tax?: number | string;
  taxPercent?: number | string;
  cartage?: number | string;
  netAmt?: number | string;
  rows?: DispatchChallanRow[];
  packingRows?: PackingRow[];
}

const norm = (s: string | undefined | null): string => (s || '').trim().toLowerCase();

const toNum = (v: any): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

const challanDate = (c: DispatchChallan): string => c.date || c.dated || '';

const toTime = (val: string): number => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
};

export function dispatchChallanTotals(c: DispatchChallan) {
  const rows = Array.isArray(c.rows) ? c.rows : [];
  const totalBoxes = rows.reduce((s, r) => s + toNum(r.box), 0);
  const totalPcs = rows.reduce((s, r) => s + toNum(r.pcs), 0);
  return { totalBoxes, totalPcs };
}

export function useDispatchChallans(partyName: string) {
  const [all, setAll] = useState<DispatchChallan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await statementRawApi.getDispatchChallans();
      const data = Array.isArray(res.data) ? res.data : [];
      setAll(data as DispatchChallan[]);
    } catch (err: any) {
      console.warn(
        '[useDispatchChallans] failed to load /dispatch-challan —',
        err?.response?.status ?? 'network error',
        err?.message ?? err,
      );
      setError('Could not load dispatch challans. Pull down to retry.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // All challans for this party, newest first — no date filter yet.
  const partyChallans = useMemo(() => {
    if (!all) return [];
    const target = norm(partyName);
    return all
      .filter((c) => norm(c.partyName) === target)
      .sort((a, b) => toTime(challanDate(b)) - toTime(challanDate(a)));
  }, [all, partyName]);

  /**
   * Filter to a from/to date range (inclusive) — instant, no network
   * call, since `all` already holds everything.
   */
  const filterByRange = useCallback(
    (fromDate: string, toDate: string): DispatchChallan[] => {
      const fromT = toTime(fromDate);
      const toT = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;
      return partyChallans.filter((c) => {
        const t = toTime(challanDate(c));
        return t >= fromT && t <= toT;
      });
    },
    [partyChallans],
  );

  return {
    loading,
    refreshing,
    error,
    hasData: all !== null,
    challans: partyChallans,
    filterByRange,
    refresh: () => load(true),
    retry: () => load(false),
  };
}