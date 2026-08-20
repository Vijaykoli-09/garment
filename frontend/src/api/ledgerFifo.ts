// src/utils/ledgerFifo.ts

// ✅ Single common FIFO engine for the entire Ledger module.
// No UI code here. Pure deterministic FIFO logic only.

export type TxType =
  | "Opening"
  | "Dispatch"
  | "OtherDispatch"
  | "DispatchReturn"
  | "PurchaseOrder"
  | "PurchaseEntry"
  | "PurchaseReturn"
  | "JobOutward"
  | "JobInward"
  | "Payment"
  | "Receipt";

export type BaseLedgerEvent = {
  id: number;
  date: string;
  partyName: string;
  brokerName?: string;
  orderNo?: string;
  mode?: string;
  debit: number;
  credit: number;
  type: TxType;

  // ✅ required unique key for a bill/settlement (used by FIFO + manualPaid)
  docKey: string;
};

export type LedgerBillFifoRow = {
  docKey: string;
  type: TxType;
  docNo: string;
  date: string;
  partyName: string;
  brokerName: string;

  original: number;
  pending: number;

  // ✅ derived (never persisted):
  // paidAuto = FIFO fully settled and not manualPaidUser
  paidAuto: boolean;

  // ✅ persisted user flag
  manualPaidUser: boolean;

  // ✅ effective: manualPaidUser OR paidAuto
  manualPaidEffective: boolean;

  // ✅ days ONLY when pending > 0 and not manualPaidEffective
  days: number;

  // ✅ bill is partially pending (0 < pending < original)
  isPartialBill: boolean;
};

export type LedgerFifoResult = {
  asOfDate: string;

  // Only bill rows (debit > 0) that participated in FIFO (includes Opening if debit opening exists)
  bills: LedgerBillFifoRow[];

  // Sum of pending of all bills where pending > 0 and not manualPaidEffective
  pendingTotal: number;

  // Lookups for screens
  pendingByDocKey: Map<string, LedgerBillFifoRow>;

  // Highlight helpers
  partialBillKeys: Set<string>;
  partialSettlementKeys: Set<string>;
};

const toNum = (v: any) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const toTime = (val: any) => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
};

const endOfDayTime = (iso: string) => {
  const t = toTime(iso);
  if (t === -Infinity) return -Infinity;
  return t + 24 * 60 * 60 * 1000 - 1;
};

export const txSortRank = (t: TxType) => {
  switch (t) {
    case "Opening":
      return 0;
    case "Dispatch":
      return 10;
    case "OtherDispatch":
      return 11;
    case "DispatchReturn":
      return 12;
    case "PurchaseOrder":
      return 20;
    case "PurchaseEntry":
      return 21;
    case "PurchaseReturn":
      return 22;
    case "JobOutward":
      return 30;
    case "JobInward":
      return 31;
    case "Payment":
      return 90;
    case "Receipt":
      return 91;
    default:
      return 999;
  }
};

/**
 * ✅ FIFO RULE (single source)
 *
 * Bills:
 *   debit > 0
 * Settlements:
 *   credit > 0
 *
 * FIFO settlement order:
 *   oldest bill first, based on (date, txSortRank, id)
 *
 * Manual Paid:
 *   If manualPaidUser is true for a bill docKey:
 *     - pending becomes 0 immediately
 *     - bill is removed from FIFO queue (receipts won't allocate to it)
 *
 * Auto Paid:
 *   Derived per rebuild:
 *     - paidAuto true only when bill is fully settled by FIFO and not manualPaidUser
 *     - manualPaidEffective = manualPaidUser OR paidAuto
 *
 * Days:
 *   Days is calculated ONLY when pending > 0 AND manualPaidEffective is false.
 *   If pending becomes 0 => days becomes 0.
 *
 * Partial Highlight:
 *   Bill isPartialBill when 0 < pending < original and not manualPaidEffective.
 *   Any settlement that touched a partial bill is marked in partialSettlementKeys.
 */
export const computeLedgerFifo = (args: {
  events: BaseLedgerEvent[];
  asOfDateIso: string;
  manualPaidUserByDocKey: Map<string, boolean>;
}): LedgerFifoResult => {
  const { events, asOfDateIso, manualPaidUserByDocKey } = args;

  const asOfT = endOfDayTime(asOfDateIso);

  const eligible = (events || [])
    .filter((e) => e && String(e.docKey || "").trim())
    .filter((e) => {
      const t = toTime(e.date);
      return t !== -Infinity && t <= asOfT;
    })
    .slice()
    .sort((a, b) => {
      const da = toTime(a.date);
      const db = toTime(b.date);
      if (da !== db) return da - db;
      const ra = txSortRank(a.type);
      const rb = txSortRank(b.type);
      if (ra !== rb) return ra - rb;
      return (a.id || 0) - (b.id || 0);
    });

  // FIFO queue of open bills
  type QItem = { docKey: string; remaining: number };
  const queue: QItem[] = [];

  // bill base state
  const billBase = new Map<
    string,
    {
      type: TxType;
      docNo: string;
      date: string;
      partyName: string;
      brokerName: string;
      original: number;
      remaining: number;
      manualPaidUser: boolean;
    }
  >();

  // settlement -> bills mapping (for purple highlight)
  const settlementToBills = new Map<string, Set<string>>();

  const pushBill = (e: BaseLedgerEvent) => {
    const docKey = String(e.docKey || "").trim();
    if (!docKey) return;

    const original = toNum(e.debit);
    if (original <= 0) return;

    const manualPaidUser = !!manualPaidUserByDocKey.get(docKey);

    billBase.set(docKey, {
      type: e.type,
      docNo: String(e.orderNo || "").trim() || "-",
      date: e.date,
      partyName: e.partyName || "-",
      brokerName: String(e.brokerName || "").trim() || "-",
      original,
      remaining: manualPaidUser ? 0 : original,
      manualPaidUser,
    });

    // manual paid bills do not participate in FIFO allocation
    if (!manualPaidUser) queue.push({ docKey, remaining: original });
  };

  const applySettlement = (e: BaseLedgerEvent) => {
    const settlementKey = String(e.docKey || "").trim();
    if (!settlementKey) return;

    let left = toNum(e.credit);
    if (left <= 0) return;

    while (left > 0 && queue.length > 0) {
      const front = queue[0];
      const used = Math.min(left, front.remaining);

      if (!settlementToBills.has(settlementKey)) settlementToBills.set(settlementKey, new Set());
      settlementToBills.get(settlementKey)!.add(front.docKey);

      front.remaining -= used;
      left -= used;

      const b = billBase.get(front.docKey);
      if (b) b.remaining = front.remaining;

      if (front.remaining <= 1e-9) queue.shift();
    }
  };

  for (const e of eligible) {
    if (toNum(e.debit) > 0) pushBill(e);
    if (toNum(e.credit) > 0) applySettlement(e);
  }

  const baseDate = new Date(asOfDateIso);
  baseDate.setHours(0, 0, 0, 0);
  const baseTime = baseDate.getTime();

  const pendingByDocKey = new Map<string, LedgerBillFifoRow>();
  const partialBillKeys = new Set<string>();

  const bills: LedgerBillFifoRow[] = Array.from(billBase.entries())
    .map(([docKey, b]) => {
      const pending = Math.max(0, toNum(b.remaining));
      const paidAuto = !b.manualPaidUser && pending <= 1e-9 && b.original > 0;
      const manualPaidEffective = b.manualPaidUser || paidAuto;

      const t = toTime(b.date);
      const d = new Date(t);
      d.setHours(0, 0, 0, 0);
      const diffMs = baseTime - d.getTime();

      const days =
        pending > 0 && !manualPaidEffective && diffMs >= 0
          ? Math.floor(diffMs / (1000 * 60 * 60 * 24))
          : 0;

      const isPartialBill =
        pending > 1e-9 && pending + 1e-9 < b.original && !manualPaidEffective;

      const row: LedgerBillFifoRow = {
        docKey,
        type: b.type,
        docNo: b.docNo,
        date: b.date,
        partyName: b.partyName,
        brokerName: b.brokerName,
        original: b.original,
        pending,
        paidAuto,
        manualPaidUser: b.manualPaidUser,
        manualPaidEffective,
        days,
        isPartialBill,
      };

      pendingByDocKey.set(docKey, row);
      if (isPartialBill) partialBillKeys.add(docKey);
      return row;
    })
    .sort((a, b) => {
      const da = toTime(a.date);
      const db = toTime(b.date);
      if (da !== db) return da - db;
      const ra = txSortRank(a.type);
      const rb = txSortRank(b.type);
      if (ra !== rb) return ra - rb;
      return a.docKey.localeCompare(b.docKey);
    });

  const partialSettlementKeys = new Set<string>();
  for (const [settKey, billSet] of Array.from(settlementToBills.entries())) {
    const hitPartial = Array.from(billSet).some((k) => partialBillKeys.has(k));
    if (hitPartial) partialSettlementKeys.add(settKey);
  }

  const pendingTotal = bills
    .filter((b) => b.pending > 0 && !b.manualPaidEffective)
    .reduce((s, b) => s + b.pending, 0);

  return {
    asOfDate: asOfDateIso,
    bills,
    pendingTotal,
    pendingByDocKey,
    partialBillKeys,
    partialSettlementKeys,
  };
};