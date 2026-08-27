/**
 * statementCalculator.ts
 *
 * Pure, framework-free port of the calculation logic from the web
 * AccountStatement.tsx page — scoped down to a SINGLE PARTY (the RN
 * broker app only ever shows one party's statement at a time, unlike
 * the web page which also supports broker-level aggregation).
 *
 * Kept as plain functions (no React) so it's easy to unit test and
 * reuse from the usePartyStatement hook.
 *
 * IMPORTANT: this must stay logically identical to the web version's
 * DR/CR rules, opening balance rule, and LIFO pending allocation — if
 * you change one, change both, or the app and website will disagree
 * with each other about a party's balance.
 */

import { AgentRawDto, PartyRawDto } from '../api/api';

export const OVERDUE_DAYS = 60;

export type BalanceType = 'CR' | 'DR';

export type TxType =
  | 'Opening'
  | 'Dispatch'
  | 'DispatchReturn'
  | 'OtherDispatch'
  | 'PurchaseOrder'
  | 'PurchaseEntry'
  | 'PurchaseReturn'
  | 'JobOutward'
  | 'JobInward'
  | 'Payment'
  | 'Receipt';

export interface StatementRow {
  id: number;
  date: string;
  srNo: number;
  docNo: string;
  mode: string;
  type: TxType;
  debit: number;
  credit: number;
  balance: number;
  pending: number;
  days: number;
  overdue: boolean;
}

export interface StatementResult {
  rows: StatementRow[];              // full range, opening row included if requested
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  overdueRows: StatementRow[];
  pendingSide: 'DEBIT' | 'CREDIT';
}

export interface RawStatementData {
  parties: PartyRawDto[];
  agents: AgentRawDto[];
  dispatchChallans: any[];
  dispatchReturnChallans: any[];
  otherDispatchChallans: any[];
  purchaseOrders: any[];
  purchaseEntries: any[];
  purchaseReturns: any[];
  jobOutwards: any[];
  jobInwards: any[];
  payments: any[];
  receipts: any[];
}

// ── small utils (same behaviour as web) ─────────────────────────────
const toNum = (v: any): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const toTime = (val: string): number => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
};

const norm = (s: string | undefined | null): string => (s || '').trim().toLowerCase();

const hashToInt = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 0;
};

const txSortRank = (t: TxType): number => {
  switch (t) {
    case 'Opening': return 0;
    case 'Dispatch': return 10;
    case 'OtherDispatch': return 11;
    case 'DispatchReturn': return 12;
    case 'PurchaseOrder': return 20;
    case 'PurchaseEntry': return 21;
    case 'PurchaseReturn': return 22;
    case 'JobOutward': return 30;
    case 'JobInward': return 31;
    case 'Payment': return 90;
    case 'Receipt': return 91;
    default: return 999;
  }
};

export const typeLabel = (t: TxType): string => {
  switch (t) {
    case 'OtherDispatch': return 'Other Dispatch';
    case 'DispatchReturn': return 'Dispatch Return';
    case 'PurchaseOrder': return 'Purchase Order';
    case 'PurchaseEntry': return 'Purchase Entry';
    case 'PurchaseReturn': return 'Purchase Return';
    case 'JobOutward': return 'Job Outward Challan';
    case 'JobInward': return 'Job Inward Challan';
    case 'Payment': return 'Payment';
    case 'Receipt': return 'Receipt';
    case 'Opening': return 'Opening';
    case 'Dispatch':
    default: return 'Dispatch';
  }
};

/**
 * ✅ DR/CR RULES — must match web AccountStatement.tsx exactly.
 */
function getDrCr(source: TxType, amount: number): { debit: number; credit: number } {
  const amt = toNum(amount);
  if (source === 'Payment') return { debit: amt, credit: 0 };
  if (source === 'Receipt') return { debit: 0, credit: amt };
  if (source === 'PurchaseOrder') return { debit: 0, credit: amt };
  if (source === 'PurchaseEntry') return { debit: 0, credit: amt };
  if (source === 'OtherDispatch') return { debit: 0, credit: amt };
  if (source === 'DispatchReturn') return { debit: 0, credit: amt };
  if (source === 'PurchaseReturn') return { debit: amt, credit: 0 };
  if (source === 'JobInward') return { debit: 0, credit: amt };
  if (source === 'JobOutward') return { debit: 0, credit: 0 };
  if (source === 'Opening') return { debit: 0, credit: 0 };
  return { debit: amt, credit: 0 }; // Dispatch (default)
}

function getPartyOpeningSigned(parties: PartyRawDto[], partyName: string): number {
  const p = parties.find((x) => norm(x.partyName) === norm(partyName));
  if (!p) return 0;
  const amt = toNum(p.openingBalance ?? 0);
  const typ: BalanceType = (p.openingBalanceType as BalanceType) || 'DR';
  return typ === 'CR' ? -amt : amt;
}

type Doc = {
  source: TxType;
  id: number;
  date: string;
  number: string;
  amount: number;
  mode?: string;
};

/**
 * Build the flat list of every doc that belongs to this party, across
 * all doc types, unfiltered by date (date filtering happens later so
 * the opening-balance calc can see pre-range docs too).
 */
function collectPartyDocs(raw: RawStatementData, partyName: string): Doc[] {
  const target = norm(partyName);
  const belongsToParty = (pName: string) => norm(pName) === target;
  const docs: Doc[] = [];

  raw.dispatchChallans.filter((d) => belongsToParty(d.partyName)).forEach((dc) => {
    docs.push({
      source: 'Dispatch',
      id: dc.id,
      date: dc.date || dc.dated || '',
      number: String(dc.challanNo ?? ''),
      amount: toNum(dc.netAmt),
    });
  });

  raw.dispatchReturnChallans.filter((d) => belongsToParty(d.partyName)).forEach((drc) => {
    docs.push({
      source: 'DispatchReturn',
      id: drc.id,
      date: drc.date || drc.dated || '',
      number: String(drc.challanNo ?? ''),
      amount: toNum(drc.netAmt),
    });
  });

  raw.otherDispatchChallans.filter((d) => belongsToParty(d.partyName)).forEach((od) => {
    docs.push({
      source: 'OtherDispatch',
      id: od.id,
      date: od.date || '',
      number: String(od.challanNo ?? ''),
      amount: toNum(od.netAmt),
    });
  });

  raw.purchaseOrders.filter((d) => belongsToParty(d.partyName ?? d.party?.partyName)).forEach((po) => {
    const items: any[] = Array.isArray(po.items) ? po.items : [];
    const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
    docs.push({ source: 'PurchaseOrder', id: po.id, date: po.date || '', number: String(po.orderNo ?? ''), amount });
  });

  raw.purchaseEntries.filter((d) => belongsToParty(d.partyName ?? d.party?.partyName)).forEach((pe) => {
    const items: any[] = Array.isArray(pe.items) ? pe.items : [];
    const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
    docs.push({ source: 'PurchaseEntry', id: pe.id, date: pe.date || '', number: String(pe.challanNo ?? ''), amount });
  });

  raw.purchaseReturns.filter((d) => belongsToParty(d.partyName ?? d.party?.partyName)).forEach((pr) => {
    const items: any[] = Array.isArray(pr.items) ? pr.items : [];
    const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
    docs.push({ source: 'PurchaseReturn', id: pr.id, date: pr.date || '', number: String(pr.challanNo ?? ''), amount });
  });

  raw.jobOutwards.filter((d) => belongsToParty(d.partyName)).forEach((j) => {
    const rows: any[] = Array.isArray(j.rows) ? j.rows : [];
    const totalPcs = rows.reduce((s, r) => s + (Number(r.pcs) || 0), 0);
    docs.push({
      source: 'JobOutward',
      id: typeof j.id === 'number' ? j.id : hashToInt(String(j.id ?? j.serialNo ?? '')),
      date: j.date || '',
      number: String(j.orderChallanNo ?? j.challanNo ?? ''),
      amount: 0,
      mode: totalPcs ? `Pcs: ${totalPcs}` : '',
    });
  });

  raw.jobInwards.filter((d) => belongsToParty(d.partyName)).forEach((j) => {
    const rows: any[] = Array.isArray(j.rows) ? j.rows : [];
    const amount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    docs.push({
      source: 'JobInward',
      id: typeof j.id === 'number' ? j.id : hashToInt(String(j.id ?? '')),
      date: j.date || '',
      number: String(j.challanNo ?? ''),
      amount,
    });
  });

  raw.payments
    .filter((p) => String(p.paymentTo ?? '').trim() === 'Party' && belongsToParty(p.partyName))
    .forEach((p) => {
      docs.push({
        source: 'Payment',
        id: p.id,
        date: p.paymentDate || p.date || '',
        number: `PAY-${p.id}`,
        amount: toNum(p.amount),
        mode: String(p.paymentThrough ?? '').trim(),
      });
    });

  raw.receipts
    .filter((r) => String(r.receiptTo ?? r.paymentTo ?? '').trim() === 'Party' && belongsToParty(r.partyName))
    .forEach((r) => {
      docs.push({
        source: 'Receipt',
        id: r.id,
        date: r.receiptDate || r.paymentDate || r.date || '',
        number: `REC-${r.id}`,
        amount: toNum(r.amount),
        mode: String(r.paymentThrough ?? '').trim(),
      });
    });

  return docs;
}

/**
 * Main entry point — same contract as the web page's handleShow(),
 * scoped to one party.
 *
 * @param raw          all raw org-wide collections (fetch once, reuse for any date range)
 * @param partyName    exact party name to build the statement for
 * @param fromDate     ISO yyyy-mm-dd
 * @param toDate       ISO yyyy-mm-dd
 * @param showOpening  whether to include the Opening Balance row
 */
export function computePartyStatement(
  raw: RawStatementData,
  partyName: string,
  fromDate: string,
  toDate: string,
  showOpening: boolean,
): StatementResult {
  const fromT = toTime(fromDate);
  const toT = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;

  const allDocs = collectPartyDocs(raw, partyName);

  // ── Opening balance: party master opening + every doc before fromDate ──
  let openingBal = showOpening ? getPartyOpeningSigned(raw.parties, partyName) : 0;
  if (showOpening) {
    allDocs
      .filter((d) => toTime(d.date) < fromT)
      .forEach((d) => {
        const { debit, credit } = getDrCr(d.source, d.amount);
        openingBal += debit - credit;
      });
  }

  // ── In-range docs, sorted date → type-rank → id ─────────────────────
  const periodDocs = allDocs
    .filter((d) => {
      const tt = toTime(d.date);
      return tt >= fromT && tt <= toT;
    })
    .sort((a, b) => {
      const da = toTime(a.date);
      const db = toTime(b.date);
      if (da !== db) return da - db;
      const ra = txSortRank(a.source);
      const rb = txSortRank(b.source);
      if (ra !== rb) return ra - rb;
      return (a.id || 0) - (b.id || 0);
    });

  // ── Running balance ──────────────────────────────────────────────────
  type BuiltRow = Omit<StatementRow, 'days' | 'pending' | 'overdue'>;
  const built: BuiltRow[] = [];
  let srNo = 1;
  let runningBalance = 0;

  if (showOpening) {
    runningBalance = openingBal;
    built.push({
      id: -1,
      date: fromDate,
      srNo: srNo++,
      docNo: '',
      mode: '',
      type: 'Opening',
      debit: openingBal > 0 ? openingBal : 0,
      credit: openingBal < 0 ? Math.abs(openingBal) : 0,
      balance: runningBalance,
    });
  }

  for (const d of periodDocs) {
    const { debit, credit } = getDrCr(d.source, d.amount);
    runningBalance += debit - credit;
    built.push({
      id: d.id,
      date: d.date,
      srNo: srNo++,
      docNo: d.number,
      mode: d.mode || '',
      type: d.source,
      debit,
      credit,
      balance: runningBalance,
    });
  }

  const closingBalance = built.length ? built[built.length - 1].balance : 0;
  const pendingSide: 'DEBIT' | 'CREDIT' = closingBalance >= 0 ? 'DEBIT' : 'CREDIT';

  // ── Days-old (relative to toDate) ───────────────────────────────────
  const base = new Date(toDate);
  base.setHours(0, 0, 0, 0);
  const baseTime = base.getTime();

  const withDays = built.map((r) => {
    const d = new Date(toTime(r.date));
    d.setHours(0, 0, 0, 0);
    const diffMs = baseTime - d.getTime();
    const days = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
    return { ...r, days };
  });

  // ── LIFO pending allocation (same stack algorithm as web) ───────────
  const chargeAmt = (r: BuiltRow) => (pendingSide === 'DEBIT' ? r.debit : r.credit);
  const settleAmt = (r: BuiltRow) => (pendingSide === 'DEBIT' ? r.credit : r.debit);

  const stack: { srNo: number; remaining: number }[] = [];
  const remainingMap = new Map<number, number>();

  for (const r of withDays) {
    if (r.type === 'Opening') continue;
    const ch = toNum(chargeAmt(r));
    const st = toNum(settleAmt(r));

    if (ch > 0) {
      remainingMap.set(r.srNo, ch);
      stack.push({ srNo: r.srNo, remaining: ch });
    }
    if (st > 0) {
      let left = st;
      while (left > 0 && stack.length > 0) {
        const top = stack[stack.length - 1];
        const used = Math.min(left, top.remaining);
        top.remaining -= used;
        left -= used;
        remainingMap.set(top.srNo, top.remaining);
        if (top.remaining <= 1e-9) stack.pop();
      }
    }
  }

  const rows: StatementRow[] = withDays.map((r) => {
    if (r.type === 'Opening') return { ...r, pending: 0, overdue: false };
    const ch = toNum(chargeAmt(r));
    const pending = ch > 0 ? toNum(remainingMap.get(r.srNo) ?? 0) : 0;
    const overdue = pending > 0 && r.days >= OVERDUE_DAYS;
    return { ...r, pending, overdue };
  });

  const totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);

  return {
    rows,
    openingBalance: showOpening ? openingBal : 0,
    closingBalance,
    totalDebit,
    totalCredit,
    netMovement: totalDebit - totalCredit,
    overdueRows: rows.filter((r) => r.overdue).sort((a, b) => b.days - a.days),
    pendingSide,
  };
}