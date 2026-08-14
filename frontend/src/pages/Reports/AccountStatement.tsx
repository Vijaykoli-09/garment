"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import { computeLedgerFifo, type BaseLedgerEvent, type TxType } from "../../api/ledgerFifo";

// ================= Config =================
const OVERDUE_DAYS = 60;

// ================= Types =================
type BalanceType = "CR" | "DR";

interface Party {
  id: number;
  serialNumber?: string;
  partyName: string;
  agent?: { serialNo?: string | number; agentName?: string };
  openingBalance?: number | null;
  openingBalanceType?: BalanceType;
}

interface Agent {
  serialNo: string | number;
  agentName: string;
  openingBalance?: number | null;
  openingBalanceType?: BalanceType;
}

interface DispatchChallan {
  id: number;
  challanNo: string;
  date?: string;
  dated?: string;
  partyName: string;
  brokerName?: string;
  netAmt?: number | string;
}

interface OtherDispatchChallan {
  id: number;
  challanNo: string;
  date?: string;
  partyName: string;
  brokerName?: string;
  netAmt?: number | string;
}

interface PurchaseOrderDoc {
  id: number;
  orderNo: string;
  date?: string;
  partyName: string;
  amount: number;
}

interface PurchaseEntryDoc {
  id: number;
  challanNo: string;
  date?: string;
  partyName: string;
  amount: number;
}

interface PurchaseReturnDoc {
  id: number;
  challanNo: string;
  date?: string;
  partyName: string;
  amount: number;
}

interface PaymentDoc {
  id: number;
  paymentDate: string;
  date?: string;
  partyName: string;
  brokerName?: string;
  paymentTo?: string;
  amount: number;
  paymentThrough?: string;
  processName?: string;
  agentName?: string;
}

interface ReceiptDoc {
  id: number;
  receiptDate: string;
  date?: string;
  partyName: string;
  brokerName?: string;
  receiptTo?: string;
  amount: number; // cash
  discountAmount?: number; // discount
  remarks?: string;
  paymentThrough?: string;
  processName?: string;
  agentName?: string;
}

interface JobOutwardChallanDoc {
  id: string | number;
  challanNo: string;
  date: string;
  partyName: string;
  totalPcs: number;
}

interface JobInwardChallanDoc {
  id: string | number;
  challanNo: string;
  date: string;
  partyName: string;
  amount: number;
}

interface BrokerInfo {
  name: string;
  parties: string[];
}

type BaseTransaction = {
  id: number;
  date: string;
  partyName: string;
  brokerName?: string;
  orderNo?: string;

  mode?: string;
  payRecMode?: string;

  debit: number;
  credit: number; // cash (receipt) or credit amount
  discount: number; // receipt discount only
  type: TxType;

  // ✅ stable docKey for FIFO + manual paid + purple highlight
  docKey?: string;
};

type DisplayRow = BaseTransaction & { srNo: number; balance: number };
type DisplayRowWithDays = DisplayRow & { baseDays: number };

type DisplayRowFinal = DisplayRowWithDays & {
  pending: number; // FIFO pending for bill rows
  days: number;

  paidAuto: boolean;
  manualPaidUser: boolean;
  manualPaidEffective: boolean;

  isPartialBill: boolean;
  isPartialSettlement: boolean;
};

type OverdueAlertRow = {
  partyName: string;
  brokerName: string;
  docNo: string;
  txType: string;
  date: string;
  days: number;
  pending: number;
};

type LedgerBillStatusDTO = {
  docKey: string;
  manualPaidUser: boolean;
  updatedAt?: string;
};

// ================= Utils =================
const getTodayIso = () => new Date().toISOString().slice(0, 10);
const maxIsoDate = (aIso: string, bIso: string) => {
  const aT = toTime(aIso);
  const bT = toTime(bIso);

  if (aT === -Infinity && bT === -Infinity) return aIso || bIso || "";
  if (aT === -Infinity) return bIso;
  if (bT === -Infinity) return aIso;

  return aT >= bT ? aIso : bIso;
};

const getFirstOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const fmtDateHeader = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return "Invalid Date";
};

const fmtNumber = (n: number) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toNum = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const toTime = (val: string) => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
};

const endOfDayTime = (iso: string) => {
  const t = toTime(iso);
  if (t === -Infinity) return -Infinity;
  return t + 24 * 60 * 60 * 1000 - 1;
};

const norm = (s: string) => (s || "").trim().toLowerCase();

const parseDiscountFromRemarks = (remarks?: string) => {
  const s = String(remarks || "");
  const m = s.match(/discount\s*:\s*([0-9]+(\.[0-9]+)?)/i);
  return m ? toNum(m[1]) : 0;
};

const typeLabel = (t: TxType): string => {
  switch (t) {
    case "OtherDispatch":
      return "Other Dispatch";
    case "PurchaseOrder":
      return "Purchase Order";
    case "PurchaseEntry":
      return "Purchase Entry";
    case "PurchaseReturn":
      return "Purchase Return";
    case "JobOutward":
      return "Job Outward Challan";
    case "JobInward":
      return "Job Inward Challan";
    case "Payment":
      return "Payment";
    case "Receipt":
      return "Receipt";
    case "Opening":
      return "Opening";
    case "Dispatch":
    default:
      return "Dispatch";
  }
};

const hashToInt = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 0;
};

const txSortRank = (t: TxType) => {
  switch (t) {
    case "Opening":
      return 0;
    case "Dispatch":
      return 10;
    case "OtherDispatch":
      return 11;
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

const buildPayRecMode = (through?: string, process?: string) => {
  const t = String(through || "").trim();
  const p = String(process || "").trim();
  return [t, p].filter(Boolean).join(" / ");
};

const combineModeForDisplay = (mode?: string, payRecMode?: string) => {
  const a = String(mode || "").trim();
  const b = String(payRecMode || "").trim();
  return [a, b].filter(Boolean).join(" | ");
};

const makeDocKey = (type: TxType, id: number | string, scope?: string) => {
  if (type === "Opening") return `Opening:${scope || String(id)}`;
  return `${type}:${String(id)}`;
};



// ================= Component =================
const AccountStatement: React.FC = () => {
const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dispatchChallans, setDispatchChallans] = useState<DispatchChallan[]>([]);
  const [otherDispatchChallans, setOtherDispatchChallans] = useState<OtherDispatchChallan[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDoc[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntryDoc[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnDoc[]>([]);
  const [jobOutwards, setJobOutwards] = useState<JobOutwardChallanDoc[]>([]);
  const [jobInwards, setJobInwards] = useState<JobInwardChallanDoc[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [receipts, setReceipts] = useState<ReceiptDoc[]>([]);

  const [loading, setLoading] = useState(false);
  const [reportPreparing, setReportPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combo
  const [comboInput, setComboInput] = useState("");
  const [comboQuery, setComboQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);

  // Auto-focus the Broker / Party search box
  const comboInputRef = useRef<HTMLInputElement>(null);

  type SearchBy = "broker" | "party";
  const [searchBy, setSearchBy] = useState<SearchBy>("broker");

  const [selectedBroker, setSelectedBroker] = useState("");
  const [selectedParty, setSelectedParty] = useState("");

  // Put cursor in search automatically when this page becomes ready.
  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => {
        comboInputRef.current?.focus();
        comboInputRef.current?.select();
      });
    }
  }, [loading]);

  const [fromDate, setFromDate] = useState(getFirstOfMonthIso());
  const [toDate, setToDate] = useState(getTodayIso());
  const [showOpening, setShowOpening] = useState(true);

  const [pendingOnly, setPendingOnly] = useState(false);

  type TxFilter = "all" | TxType;
  const [transactions, setTransactions] = useState<BaseTransaction[]>([]);
  const [transactionFilter, setTransactionFilter] = useState<TxFilter>("all");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

 

  const overdueAlertKeyRef = useRef<string>("");

  // ✅ FIFO events for selection (full history)
  const [fifoEventsAll, setFifoEventsAll] = useState<BaseLedgerEvent[]>([]);

  // ✅ manualPaid status map (docKey -> manualPaidUser)
  const [manualPaidUserMap, setManualPaidUserMap] = useState<Map<string, boolean>>(new Map());

  // ledger changed event
  const [ledgerVersion, setLedgerVersion] = useState(0);
  useEffect(() => {
    const h = () => setLedgerVersion((x) => x + 1);
    window.addEventListener("ledger:changed", h);
    return () => window.removeEventListener("ledger:changed", h);
  }, []);

  const emitLedgerChanged = useCallback(() => {
    try {
      window.dispatchEvent(new Event("ledger:changed"));
    } catch {}
  }, []);
      const goToDispatchEdit = useCallback(
    (dispatchId: number) => {
      const id = Number(dispatchId);
      if (!Number.isFinite(id) || id <= 0) return;

      // Dispatch page will read this param and auto-open edit (Part 3 changes in Dispatch page)
      navigate(`/sales/dispatch-challan?editId=${id}`);
    },
    [navigate],
  );

  // ---------- Load master data ----------
  useEffect(() => {
    const safeGet = async <T,>(url: string): Promise<T> => {
      try {
        const res = await api.get<T>(url);
        return res.data as T;
      } catch {
        return [] as any;
      }
    };

    const safeGetReceipts = async (): Promise<any[]> => {
      try {
        const r1 = await api.get<any[]>("/recipt");
        return Array.isArray(r1.data) ? r1.data : [];
      } catch {
        try {
          const r2 = await api.get<any[]>("/receipt");
          return Array.isArray(r2.data) ? r2.data : [];
        } catch {
          return [];
        }
      }
    };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [partyRaw, agentRaw, dcRaw, odcRaw, poRaw, peRaw, prRaw, payRaw, jobOutRaw, jobInRaw] =
          await Promise.all([
            safeGet<Party[]>("/party/all"),
            safeGet<Agent[]>("/agent/list"),
            safeGet<any[]>("/dispatch-challan"),
            safeGet<any[]>("/other-dispatch-challan"),
            safeGet<any[]>("/purchase-orders"),
            safeGet<any[]>("/purchase-entry"),
            safeGet<any[]>("/purchase-returns"),
            safeGet<any[]>("/payment"),
            safeGet<any[]>("/job-outward-challan"),
            safeGet<any[]>("/job-inward-challan"),
          ]);

        const recRaw = await safeGetReceipts();

        const partyArr = Array.isArray(partyRaw) ? partyRaw : [];
        setParties(partyArr);
        setAgents(Array.isArray(agentRaw) ? agentRaw : []);

        const partyIdToName = new Map<string, string>();
        partyArr.forEach((p) => partyIdToName.set(String(p.id), p.partyName || ""));

        setDispatchChallans(
          (Array.isArray(dcRaw) ? dcRaw : []).map((dc: any) => ({
            id: dc.id,
            challanNo: String(dc.challanNo ?? ""),
            date: dc.date || dc.dated || "",
            dated: dc.dated,
            partyName: dc.partyName || "",
            brokerName: (dc.brokerName || dc.agentName || "").trim(),
            netAmt: dc.netAmt,
          })),
        );

        setOtherDispatchChallans(
          (Array.isArray(odcRaw) ? odcRaw : []).map((od: any) => ({
            id: od.id,
            challanNo: String(od.challanNo ?? ""),
            date: od.date || "",
            partyName: od.partyName || "",
            brokerName: (od.brokerName || od.agentName || "").trim(),
            netAmt: od.netAmt,
          })),
        );

        setPurchaseOrders(
          (Array.isArray(poRaw) ? poRaw : []).map((po: any) => {
            const items: any[] = Array.isArray(po.items) ? po.items : [];
            const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
            return {
              id: po.id,
              orderNo: String(po.orderNo ?? ""),
              date: po.date || "",
              partyName: po.partyName || po.party?.partyName || "",
              amount,
            };
          }),
        );

        setPurchaseEntries(
          (Array.isArray(peRaw) ? peRaw : []).map((e: any) => {
            const items: any[] = Array.isArray(e.items) ? e.items : [];
            const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
            return {
              id: e.id,
              challanNo: String(e.challanNo ?? ""),
              date: e.date || "",
              partyName: e.partyName || e.party?.partyName || "",
              amount,
            };
          }),
        );

        setPurchaseReturns(
          (Array.isArray(prRaw) ? prRaw : []).map((r: any) => {
            const items: any[] = Array.isArray(r.items) ? r.items : [];
            const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
            return {
              id: r.id,
              challanNo: String(r.challanNo ?? ""),
              date: r.date || "",
              partyName: r.partyName || r.party?.partyName || "",
              amount,
            };
          }),
        );

        setJobOutwards(
          (Array.isArray(jobOutRaw) ? jobOutRaw : [])
            .map((d: any) => {
              const rows: any[] = Array.isArray(d.rows) ? d.rows : [];
              const totalPcs = rows.reduce((s, r) => s + (Number(r.pcs) || 0), 0);
              return {
                id: d.serialNo ?? d.id ?? "",
                challanNo: String(d.orderChallanNo ?? d.challanNo ?? ""),
                date: String(d.date ?? ""),
                partyName: String(d.partyName ?? "") || partyIdToName.get(String(d.partyId ?? "")) || "",
                totalPcs,
              } as JobOutwardChallanDoc;
            })
            .filter((x) => x.partyName && x.date && x.challanNo),
        );

        setJobInwards(
          (Array.isArray(jobInRaw) ? jobInRaw : [])
            .map((d: any) => {
              const rows: any[] = Array.isArray(d.rows) ? d.rows : [];
              const amount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
              return {
                id: d.id ?? "",
                challanNo: String(d.challanNo ?? ""),
                date: String(d.date ?? ""),
                partyName: String(d.partyName ?? "") || partyIdToName.get(String(d.partyId ?? "")) || "",
                amount,
              } as JobInwardChallanDoc;
            })
            .filter((x) => x.partyName && x.date && x.challanNo),
        );

        setPayments(
          (Array.isArray(payRaw) ? payRaw : [])
            .map((p: any) => {
              const paymentTo = String(p.paymentTo ?? p.payment_to ?? "").trim();
              const partyName = paymentTo === "Party" ? String(p.partyName ?? "").trim() : "";
              const brokerName = paymentTo === "Broker" ? String(p.agentName ?? p.brokerName ?? "").trim() : "";
              return {
                id: p.id,
                paymentDate: p.paymentDate || p.date || "",
                date: p.date || "",
                paymentTo,
                partyName,
                brokerName,
                agentName: String(p.agentName ?? "").trim(),
                amount: parseFloat(p.amount ?? 0) || 0,
                paymentThrough: String(p.paymentThrough ?? "").trim(),
                processName: String(p.processName ?? "").trim(),
              } as PaymentDoc;
            })
            .filter((p) => p.partyName || p.brokerName),
        );

        setReceipts(
          (Array.isArray(recRaw) ? recRaw : [])
            .map((r: any) => {
              const receiptTo = String(r.receiptTo ?? r.paymentTo ?? "").trim();
              const partyName = receiptTo === "Party" ? String(r.partyName ?? "").trim() : "";
              const brokerName = String(r.agentName ?? r.brokerName ?? "").trim();

              const cash = toNum(r.amount ?? 0);
              const discount = toNum(r.discountAmount ?? 0) || parseDiscountFromRemarks(r.remarks);

              return {
                id: r.id,
                receiptTo,
                receiptDate: r.receiptDate || r.paymentDate || r.date || "",
                date: r.date || "",
                partyName,
                brokerName,
                agentName: String(r.agentName ?? "").trim(),
                amount: cash,
                discountAmount: discount,
                remarks: String(r.remarks ?? ""),
                paymentThrough: String(r.paymentThrough ?? "").trim(),
                processName: String(r.processName ?? "").trim(),
              } as ReceiptDoc;
            })
            .filter((r) => r.partyName || r.brokerName),
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- Helpers ----------
  const partyByName = useMemo(() => {
    const m = new Map<string, Party>();
    parties.forEach((p) => {
      const key = norm(p.partyName);
      if (key) m.set(key, p);
    });
    return m;
  }, [parties]);

  const getBrokerFromPartyName = useCallback(
    (partyName: string) => {
      const p = partyByName.get(norm(partyName));
      const code = p?.agent?.serialNo;
      const masterAgentName = code ? agents.find((a) => String(a.serialNo) === String(code))?.agentName || "" : "";
      return (masterAgentName || p?.agent?.agentName || "").trim();
    },
    [partyByName, agents],
  );

  const getBrokerNameForDoc = useCallback(
    (doc: { brokerName?: string; partyName: string }): string => {
      const direct = (doc.brokerName || "").trim();
      if (direct) return direct;
      return getBrokerFromPartyName(doc.partyName);
    },
    [getBrokerFromPartyName],
  );

  const getAgentOpeningSigned = useCallback(
    (brokerName: string) => {
      const b = norm(brokerName);
      if (!b) return 0;
      const agent = agents.find((a) => norm(a.agentName) === b);
      if (!agent) return 0;
      const amt = toNum(agent.openingBalance ?? 0);
      const typ: BalanceType = (agent.openingBalanceType as BalanceType) || "DR";
      return typ === "CR" ? -amt : amt;
    },
    [agents],
  );

  const getPartyOpeningSigned = useCallback(
    (partyName: string) => {
      const p = partyByName.get(norm(partyName));
      if (!p) return 0;
      const amt = toNum(p.openingBalance ?? 0);
      const typ: BalanceType = (p.openingBalanceType as BalanceType) || "DR";
      return typ === "CR" ? -amt : amt;
    },
    [partyByName],
  );

  const getAmounts = useCallback((source: TxType, amount: number, discount?: number) => {
    const amt = toNum(amount);
    const disc = toNum(discount);

    if (source === "Payment") return { debit: amt, credit: 0, discount: 0 };
    if (source === "Receipt") return { debit: 0, credit: amt, discount: disc };

    if (source === "PurchaseOrder") return { debit: 0, credit: amt, discount: 0 };
    if (source === "PurchaseEntry") return { debit: 0, credit: amt, discount: 0 };

    if (source === "OtherDispatch") return { debit: 0, credit: amt, discount: 0 };

    if (source === "PurchaseReturn") return { debit: amt, credit: 0, discount: 0 };

    if (source === "JobInward") return { debit: 0, credit: amt, discount: 0 };

    if (source === "JobOutward") return { debit: 0, credit: 0, discount: 0 };

    return { debit: amt, credit: 0, discount: 0 };
  }, []);

  // ---------- Broker list ----------
  const brokerInfos: BrokerInfo[] = useMemo(() => {
    const map = new Map<string, { name: string; parties: Set<string> }>();
    const add = (broker: string, party: string) => {
      const b = (broker || "").trim();
      if (!b) return;
      const key = b.toLowerCase();
      if (!map.has(key)) map.set(key, { name: b, parties: new Set<string>() });
      if (party) map.get(key)!.parties.add(party);
    };

    parties.forEach((p) => add(getBrokerFromPartyName(p.partyName), p.partyName));
    dispatchChallans.forEach((d) => add(getBrokerNameForDoc(d), d.partyName));
    otherDispatchChallans.forEach((d) => add(getBrokerNameForDoc(d), d.partyName));
    purchaseOrders.forEach((d) => add(getBrokerFromPartyName(d.partyName), d.partyName));
    purchaseEntries.forEach((d) => add(getBrokerFromPartyName(d.partyName), d.partyName));
    purchaseReturns.forEach((d) => add(getBrokerFromPartyName(d.partyName), d.partyName));
    jobOutwards.forEach((d) => add(getBrokerFromPartyName(d.partyName), d.partyName));
    jobInwards.forEach((d) => add(getBrokerFromPartyName(d.partyName), d.partyName));

    payments.forEach((d) => {
      const b = d.brokerName || (d.partyName ? getBrokerFromPartyName(d.partyName) : "");
      add(b, d.partyName || "");
    });

    receipts.forEach((d) => {
      const b = d.brokerName || (d.partyName ? getBrokerFromPartyName(d.partyName) : "");
      add(b, d.partyName || "");
    });

    const arr = Array.from(map.values()).map((x) => ({
      name: x.name,
      parties: Array.from(x.parties).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    }));
    arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return arr;
  }, [
    parties,
    dispatchChallans,
    otherDispatchChallans,
    purchaseOrders,
    purchaseEntries,
    purchaseReturns,
    jobOutwards,
    jobInwards,
    payments,
    receipts,
    getBrokerFromPartyName,
    getBrokerNameForDoc,
  ]);

  const allBrokerNames = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => a.agentName && set.add(a.agentName.trim()));
    parties.forEach((p) => p.agent?.agentName && set.add(p.agent.agentName.trim()));
    brokerInfos.forEach((b) => b.name && set.add(b.name.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [agents, parties, brokerInfos]);

  const allPartyNames = useMemo(() => {
    const set = new Set<string>();
    parties.forEach((p) => p.partyName && set.add(p.partyName.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [parties]);

  const brokerToParties = useMemo(() => {
    const m = new Map<string, string[]>();
    brokerInfos.forEach((b) => m.set(norm(b.name), b.parties));
    return m;
  }, [brokerInfos]);

  type BrokerSelectOption = { key: string; broker: string; party: string; label: string };

  const comboOptions: BrokerSelectOption[] = useMemo(() => {
    const term = comboQuery.trim().toLowerCase();

    if (searchBy === "broker") {
      const list = term ? allBrokerNames.filter((b) => b.toLowerCase().includes(term)) : allBrokerNames;
      return list.map((bname) => {
        const partiesList = brokerToParties.get(norm(bname)) || [];
        const preview = partiesList.slice(0, 3);
        const suffix = partiesList.length > 3 ? "..." : "";
        const partiesLabel = preview.length ? ` - ${preview.join(", ")}${suffix}` : "";
        return { key: `B:${bname}`, broker: bname, party: "", label: `${bname}${partiesLabel}` };
      });
    }

    const list = term ? allPartyNames.filter((p) => p.toLowerCase().includes(term)) : allPartyNames;
    return list.map((pname) => {
      const bname = getBrokerFromPartyName(pname);
      return {
        key: `P:${pname}`,
        broker: bname || "",
        party: pname,
        label: `${pname}${bname ? `  (Broker: ${bname})` : "  (Broker: -)"}`,
      };
    });
  }, [comboQuery, searchBy, allBrokerNames, allPartyNames, brokerToParties, getBrokerFromPartyName]);

  const focusComboSearch = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = comboInputRef.current;
        if (!el) return;
        el.focus();
        el.select();
      });
    });
  }, []);

  const selectOption = (o: BrokerSelectOption) => {
    setSelectedBroker(o.broker);
    setSelectedParty(o.party);
    setComboInput(o.label);
    setComboQuery("");
    setComboOpen(false);

    // Keep cursor in search after Broker/Party selection.
    focusComboSearch();
  };

  // ---------- Manual Paid update ----------
  const updateManualPaidUser = useCallback(
    async (docKey: string, manualPaidUser: boolean) => {
      const key = String(docKey || "").trim();
      if (!key) return;

      try {
        await api.put("/ledger-status/manual-paid", { docKey: key, manualPaidUser });

        setManualPaidUserMap((prev) => {
          const m = new Map(prev);
          m.set(key, manualPaidUser);
          return m;
        });

        emitLedgerChanged();
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to update Manual Paid", "error");
      }
    },
    [emitLedgerChanged],
  );

  // ---------- Build statement + FIFO events ----------
 const handleShow = async () => {
  let effectiveBroker = selectedBroker;
  let effectiveParty = selectedParty;

  if (!effectiveBroker && !effectiveParty && comboInput.trim()) {
    if (searchBy === "broker") {
      const match = allBrokerNames.find((b) => norm(b) === norm(comboInput));
      if (match) effectiveBroker = match;
    } else {
      const match = allPartyNames.find((p) => norm(p) === norm(comboInput));
      if (match) {
        effectiveParty = match;
        effectiveBroker = getBrokerFromPartyName(match);
      }
    }
  }

  if (!effectiveBroker.trim() && !effectiveParty.trim()) {
    alert("Please select Broker / Party from the list");
    return;
  }

  setReportPreparing(true);
  setError(null);
  setTransactionFilter("all");

  try {
    const fromT = toTime(fromDate);
    const toT = endOfDayTime(toDate);

    const targetBroker = norm(effectiveBroker);
    const targetParty = norm(effectiveParty);

    const partyOk = (p: string) => !targetParty || norm(p) === targetParty;
    const brokerOk = (b: string) => !targetBroker || norm(b) === targetBroker;

    type Doc = {
      source: TxType;
      id: number;
      date: string;
      number: string;
      partyName: string;
      brokerName: string;
      amount: number;       // cash amount
      discount?: number;    // discount amount (Receipt + Payment)
      mode?: string;
      payRecMode?: string;
      docKey: string;
    };

    const docs: Doc[] = [];

    // ✅ Load payment discounts so AccountStatement doesn't ignore saved Payment.discountAmount
    const paymentDiscountById = new Map<number, number>();
    try {
      const pr1 = await api.get<any[]>("/payment");
      const payArr = Array.isArray(pr1.data) ? pr1.data : [];
      for (const p of payArr) {
        const id = Number((p as any)?.id);
        if (!Number.isFinite(id)) continue;
        paymentDiscountById.set(id, toNum((p as any)?.discountAmount ?? 0));
      }
    } catch {
      try {
        const pr2 = await api.get<any[]>("/payment/list");
        const payArr = Array.isArray(pr2.data) ? pr2.data : [];
        for (const p of payArr) {
          const id = Number((p as any)?.id);
          if (!Number.isFinite(id)) continue;
          paymentDiscountById.set(id, toNum((p as any)?.discountAmount ?? 0));
        }
      } catch {}
    }

    // Dispatch
    dispatchChallans.forEach((dc) => {
      const bName = getBrokerNameForDoc(dc);
      if (!brokerOk(bName)) return;
      if (!partyOk(dc.partyName)) return;

      docs.push({
        source: "Dispatch",
        id: dc.id,
        date: (dc.date || dc.dated || "") || fromDate,
        number: dc.challanNo,
        partyName: dc.partyName,
        brokerName: bName,
        amount: toNum(dc.netAmt),
        docKey: makeDocKey("Dispatch", dc.id),
      });
    });

    // OtherDispatch
    otherDispatchChallans.forEach((od) => {
      const bName = getBrokerNameForDoc(od);
      if (!brokerOk(bName)) return;
      if (!partyOk(od.partyName)) return;

      docs.push({
        source: "OtherDispatch",
        id: od.id,
        date: od.date || fromDate,
        number: od.challanNo,
        partyName: od.partyName,
        brokerName: bName,
        amount: toNum(od.netAmt),
        docKey: makeDocKey("OtherDispatch", od.id),
      });
    });

    purchaseOrders.forEach((po) => {
      const bName = getBrokerFromPartyName(po.partyName);
      if (!brokerOk(bName)) return;
      if (!partyOk(po.partyName)) return;

      docs.push({
        source: "PurchaseOrder",
        id: po.id,
        date: po.date || fromDate,
        number: po.orderNo,
        partyName: po.partyName,
        brokerName: bName,
        amount: toNum(po.amount),
        docKey: makeDocKey("PurchaseOrder", po.id),
      });
    });

    purchaseEntries.forEach((pe) => {
      const bName = getBrokerFromPartyName(pe.partyName);
      if (!brokerOk(bName)) return;
      if (!partyOk(pe.partyName)) return;

      docs.push({
        source: "PurchaseEntry",
        id: pe.id,
        date: pe.date || fromDate,
        number: pe.challanNo,
        partyName: pe.partyName,
        brokerName: bName,
        amount: toNum(pe.amount),
        docKey: makeDocKey("PurchaseEntry", pe.id),
      });
    });

    purchaseReturns.forEach((pr) => {
      const bName = getBrokerFromPartyName(pr.partyName);
      if (!brokerOk(bName)) return;
      if (!partyOk(pr.partyName)) return;

      docs.push({
        source: "PurchaseReturn",
        id: pr.id,
        date: pr.date || fromDate,
        number: pr.challanNo,
        partyName: pr.partyName,
        brokerName: bName,
        amount: toNum(pr.amount),
        docKey: makeDocKey("PurchaseReturn", pr.id),
      });
    });

    jobOutwards.forEach((j) => {
      const bName = getBrokerFromPartyName(j.partyName);
      if (!brokerOk(bName)) return;
      if (!partyOk(j.partyName)) return;

      docs.push({
        source: "JobOutward",
        id: typeof j.id === "number" ? j.id : hashToInt(String(j.id)),
        date: j.date || fromDate,
        number: j.challanNo,
        partyName: j.partyName,
        brokerName: bName,
        amount: 0,
        mode: j.totalPcs ? `Pcs: ${j.totalPcs}` : "",
        docKey: makeDocKey("JobOutward", String(j.id)),
      });
    });

    jobInwards.forEach((j) => {
      const bName = getBrokerFromPartyName(j.partyName);
      if (!brokerOk(bName)) return;
      if (!partyOk(j.partyName)) return;

      docs.push({
        source: "JobInward",
        id: typeof j.id === "number" ? j.id : hashToInt(String(j.id)),
        date: j.date || fromDate,
        number: j.challanNo,
        partyName: j.partyName,
        brokerName: bName,
        amount: toNum(j.amount),
        docKey: makeDocKey("JobInward", String(j.id)),
      });
    });

    // ✅ Payments (CASH in Debit, DISCOUNT in Discount column; FIFO settlement = CASH + DISCOUNT)
    payments.forEach((p) => {
      const bName = (p.brokerName || "").trim() || (p.partyName ? getBrokerFromPartyName(p.partyName) : "");
      if (!brokerOk(bName)) return;

      if (targetParty && !partyOk(p.partyName)) return;
      if (targetParty && !p.partyName) return;

      const rawDate = p.paymentDate || p.date || fromDate;

      const disc = paymentDiscountById.get(Number(p.id)) ?? 0;

      docs.push({
        source: "Payment",
        id: p.id,
        date: rawDate,
        number: `PAY-${p.id}`,
        partyName: p.partyName || "",
        brokerName: bName,
        amount: toNum(p.amount),          // cash
        discount: toNum(disc),            // discount (like Receipt)
        payRecMode: buildPayRecMode(p.paymentThrough, p.processName),
        docKey: makeDocKey("Payment", p.id),
      });
    });

    // Receipts (cash in Credit, discount in Discount; FIFO credit = cash + discount)
    receipts.forEach((r) => {
      const bName = (r.brokerName || "").trim() || (r.partyName ? getBrokerFromPartyName(r.partyName) : "");
      if (!brokerOk(bName)) return;

      if (targetParty && !partyOk(r.partyName)) return;
      if (targetParty && !r.partyName) return;

      docs.push({
        source: "Receipt",
        id: r.id,
        date: r.receiptDate || fromDate,
        number: `REC-${r.id}`,
        partyName: r.partyName || "",
        brokerName: bName,
        amount: toNum(r.amount),                    // cash
        discount: toNum(r.discountAmount ?? 0),     // discount
        payRecMode: buildPayRecMode(r.paymentThrough, r.processName),
        docKey: makeDocKey("Receipt", r.id),
      });
    });

    // ✅ Build FIFO events (full history)
    const fifoEvents: BaseLedgerEvent[] = [];

    // Opening as normal bill/entry for FIFO
    {
      let openingSigned = 0;
      let openingScope = "";

      if (effectiveParty) {
        openingSigned = getPartyOpeningSigned(effectiveParty);
        const p = partyByName.get(norm(effectiveParty));
        openingScope = `Party:${p?.id ?? norm(effectiveParty)}`;
      } else {
        openingSigned = getAgentOpeningSigned(effectiveBroker);
        const a = agents.find((x) => norm(x.agentName) === norm(effectiveBroker));
        openingScope = `Broker:${a?.serialNo ?? norm(effectiveBroker)}`;
      }

      const opDebit = openingSigned > 0 ? openingSigned : 0;
      const opCredit = openingSigned < 0 ? Math.abs(openingSigned) : 0;

      // 1 day before earliest doc
      const docTimes = docs.map((d) => toTime(d.date)).filter((t) => t !== -Infinity && t <= toT);
      const earliest = docTimes.length ? Math.min(...docTimes) : -Infinity;
      const openingDateIso =
        earliest !== -Infinity
          ? new Date(earliest - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : fromDate;

      if (opDebit > 0 || opCredit > 0) {
        fifoEvents.push({
          id: -999999,
          date: openingDateIso,
          partyName: effectiveParty || "Opening",
          brokerName: effectiveBroker || "",
          orderNo: "OPENING",
          mode: "",
          debit: opDebit,
          credit: opCredit,
          type: "Opening",
          docKey: makeDocKey("Opening", -999999, openingScope),
        });
      }
    }

    for (const d of docs) {
      const { debit, credit } = getAmounts(d.source, d.amount, d.discount);
      const docDisc = toNum(d.discount);

      // ✅ FIFO credit includes discount for receipts
      const fifoCredit = d.source === "Receipt" ? toNum(credit) + docDisc : toNum(credit);

      // ✅ FIFO debit includes discount for payments (settlement = cash + discount)
      const fifoDebit = d.source === "Payment" ? toNum(debit) + docDisc : toNum(debit);

      fifoEvents.push({
        id: d.id,
        date: d.date,
        partyName: d.partyName,
        brokerName: d.brokerName,
        orderNo: d.number,
        mode: combineModeForDisplay(d.mode, d.payRecMode),
        debit: fifoDebit,
        credit: fifoCredit,
        type: d.source,
        docKey: d.docKey,
      });
    }

    setFifoEventsAll(fifoEvents);

    // ✅ Build DISPLAY statement rows (period only; running balance unchanged)
    const baseRows: BaseTransaction[] = [];

    if (showOpening) {
      // display opening = master opening + all docs before fromDate net
      let openingBal = 0;

      if (effectiveParty) openingBal = getPartyOpeningSigned(effectiveParty);
      else if (effectiveBroker) openingBal = getAgentOpeningSigned(effectiveBroker);

      const openingDocs = docs.filter((d) => toTime(d.date) < fromT);
      for (const d of openingDocs) {
        const docDisc = toNum(d.discount);

        // ✅ Payment discount should participate like cash (settlement = cash + discount)
        if (d.source === "Payment") {
          openingBal += toNum(d.amount) + docDisc;
          continue;
        }

        // Receipt discount already participates correctly (credit = cash + discount)
        if (d.source === "Receipt") {
          openingBal -= toNum(d.amount) + docDisc;
          continue;
        }

        const { debit, credit, discount } = getAmounts(d.source, d.amount, d.discount);
        openingBal += toNum(debit) - (toNum(credit) + toNum(discount));
      }

      baseRows.push({
        id: -1,
        date: fromDate,
        partyName: "Opening Balance",
        brokerName: effectiveBroker || "",
        orderNo: "",
        mode: "",
        payRecMode: "",
        debit: openingBal > 0 ? openingBal : 0,
        credit: openingBal < 0 ? Math.abs(openingBal) : 0,
        discount: 0,
        type: "Opening",
        docKey: "", // display-only
      });
    }

    const periodDocs = docs
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

    for (const d of periodDocs) {
      const docDisc = toNum(d.discount);

      // ✅ Payment discount shown in Discount column exactly like Receipt
      if (d.source === "Payment") {
        baseRows.push({
          id: d.id,
          date: d.date,
          partyName: d.partyName,
          brokerName: d.brokerName,
          orderNo: d.number,
          mode: d.mode || "",
          payRecMode: d.payRecMode || "",
          debit: toNum(d.amount),   // cash
          credit: 0,
          discount: docDisc,        // discount
          type: d.source,
          docKey: d.docKey,
        });
        continue;
      }

      const { debit, credit, discount } = getAmounts(d.source, d.amount, d.discount);

      baseRows.push({
        id: d.id,
        date: d.date,
        partyName: d.partyName,
        brokerName: d.brokerName,
        orderNo: d.number,
        mode: d.mode || "",
        payRecMode: d.payRecMode || "",
        debit: toNum(debit),
        credit: toNum(credit),
        discount: d.source === "Receipt" ? docDisc : toNum(discount),
        type: d.source,
        docKey: d.docKey,
      });
    }

    setSelectedBroker(effectiveBroker);
    setSelectedParty(effectiveParty);
    setTransactions(baseRows);
    setShowModal(true);
  } finally {
    setReportPreparing(false);
  }
};

  // ---------- signed closing (as on toDate) to decide pending side ----------
  const closingSignedAsOn = useMemo(() => {
    const asOfT = endOfDayTime(toDate);
    if (!fifoEventsAll.length) return 0;
    return fifoEventsAll
      .filter((e) => toTime(e.date) !== -Infinity && toTime(e.date) <= asOfT)
      .reduce((s, e) => s + toNum(e.debit) - toNum(e.credit), 0);
  }, [fifoEventsAll, toDate]);

  const pendingSide: "DEBIT" | "CREDIT" = useMemo(
    () => (closingSignedAsOn >= 0 ? "DEBIT" : "CREDIT"),
    [closingSignedAsOn],
  );
  const pendingAsOfDateIso = useMemo(() => {
  // Pending must consider settlements done AFTER the selected To Date (future payment issue).
  // We compute pending "as of" max(To Date, Today).
  return maxIsoDate(String(toDate || ""), getTodayIso());
}, [toDate]);

  // ---------- manual statuses (bill side only) ----------
  const billKeysForStatus = useMemo(() => {
    if (!fifoEventsAll.length) return [];
    const asOfT = endOfDayTime(toDate);

    // ✅ fetch for both possible bill-sides so manualPaid always matches regardless of side
    const keys = fifoEventsAll
      .filter((e) => toTime(e.date) !== -Infinity && toTime(e.date) <= asOfT)
      .filter((e) => toNum(e.debit) > 0 || toNum(e.credit) > 0)
      .map((e) => String(e.docKey || "").trim())
      .filter(Boolean);

    return Array.from(new Set(keys));
  }, [fifoEventsAll, toDate]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!billKeysForStatus.length) {
        if (alive) setManualPaidUserMap(new Map());
        return;
      }

      try {
        const res = await api.post<LedgerBillStatusDTO[]>("/ledger-status/bulk-get", { keys: billKeysForStatus });
        const arr = Array.isArray(res.data) ? res.data : [];
        const m = new Map<string, boolean>();
        for (const x of arr) {
          const k = String((x as any)?.docKey ?? "").trim();
          if (!k) continue;
          m.set(k, !!(x as any)?.manualPaidUser);
        }
        if (alive) setManualPaidUserMap(m);
      } catch {
        if (alive) setManualPaidUserMap(new Map());
      }
    })();

    return () => {
      alive = false;
    };
  }, [billKeysForStatus, ledgerVersion]);

  // ---------- FIFO calc events (swap for CREDIT side to keep one engine) ----------
  const fifoEventsForCalc: BaseLedgerEvent[] = useMemo(() => {
    if (pendingSide === "DEBIT") return fifoEventsAll;
    return fifoEventsAll.map((e) => ({
      ...e,
      debit: toNum(e.credit),
      credit: toNum(e.debit),
    }));
  }, [fifoEventsAll, pendingSide]);

const fifoResult = useMemo(() => {
  // =============================
  // FIFO Pending rules (new)
  // =============================
  // 1) Bills considered only up to selected To Date (report scope).
  // 2) Settlements (credits in FIFO-calc space) considered up to pendingAsOfDateIso
  //    => fixes "future payment issue" (bill paid later should NOT show pending).
  // 3) Broker mode: FIFO is isolated PER PARTY (no cross-party settlement), then merged.

  const billCutoffT = endOfDayTime(toDate);
  const settlementCutoffT = endOfDayTime(pendingAsOfDateIso);

  if (!fifoEventsAll.length) {
    return computeLedgerFifo({
      events: [],
      asOfDateIso: pendingAsOfDateIso,
      manualPaidUserByDocKey: manualPaidUserMap,
    });
  }

  const brokerMode = !!String(selectedBroker || "").trim() && !String(selectedParty || "").trim();

  // -----------------------------
  // Party selection (single FIFO)
  // -----------------------------
  if (!brokerMode) {
    // IMPORTANT:
    // - Include all bill events up to To Date
    // - Include only settlement events after To Date (credit>0 in calc space) up to pendingAsOfDateIso
    const eventsForFifo = fifoEventsForCalc.filter((e) => {
      const t = toTime(e.date);
      if (t === -Infinity) return false;

      if (t <= billCutoffT) return true; // bill window + normal settlements within window
      if (t > settlementCutoffT) return false;

      // After To Date, include ONLY settlements (credit>0 in calc-space)
      return toNum(e.credit) > 0;
    });

    return computeLedgerFifo({
      events: eventsForFifo,
      asOfDateIso: pendingAsOfDateIso,
      manualPaidUserByDocKey: manualPaidUserMap,
    });
  }

  // ---------------------------------------------
  // Broker selection (FIFO per party, then merge)
  // ---------------------------------------------

  // Build party list from:
  // - Master parties under broker (so opening-only parties are included)
  // - Any parties appearing in events (safety)
  const partyKeyToDisplayName = new Map<string, string>();
  const brokerKey = norm(String(selectedBroker || "").trim());

  for (const p of parties) {
    const pname = String(p.partyName || "").trim();
    if (!pname) continue;
    const b = getBrokerFromPartyName(pname);
    if (norm(b) !== brokerKey) continue;

    const pkey = norm(pname);
    if (!partyKeyToDisplayName.has(pkey)) partyKeyToDisplayName.set(pkey, pname);
  }

  for (const e of fifoEventsAll) {
    if (!e) continue;
    if (e.type === "Opening") continue;

    const pname = String(e.partyName || "").trim();
    const pkey = norm(pname);
    if (!pkey) continue;

    if (!partyKeyToDisplayName.has(pkey)) partyKeyToDisplayName.set(pkey, pname);
  }

  const mergedPendingByDocKey = new Map<string, any>();
  const mergedBills: any[] = [];
  const mergedPartialBillKeys = new Set<string>();
  const mergedPartialSettlementKeys = new Set<string>();
  let mergedPendingTotal = 0;

  for (const [pkey, displayName] of Array.from(partyKeyToDisplayName.entries())) {
    // Base events for this party:
    // - bring ALL events up to settlement cutoff (so future settlements are available)
    const baseEventsAllToSettlementCutoff = fifoEventsAll
      .filter((e) => e && e.type !== "Opening" && norm(e.partyName || "") === pkey)
      .filter((e) => String(e.docKey || "").trim())
      .filter((e) => {
        const t = toTime(e.date);
        return t !== -Infinity && t <= settlementCutoffT;
      });

    // Inject PARTY Opening
    const p = partyByName.get(pkey);
    const partyId = p?.id ?? pkey;
    const signedOpening = getPartyOpeningSigned(displayName);

    const opDebit = signedOpening > 0 ? signedOpening : 0;
    const opCredit = signedOpening < 0 ? Math.abs(signedOpening) : 0;

    const eventsWithOpening: BaseLedgerEvent[] = baseEventsAllToSettlementCutoff.slice();

    if (opDebit > 0 || opCredit > 0) {
      // Place opening 1 day before earliest event within bill window (<= To Date).
      const timesWithinBillWindow = baseEventsAllToSettlementCutoff
        .map((x) => toTime(x.date))
        .filter((t) => t !== -Infinity && t <= billCutoffT);

      const anchor = timesWithinBillWindow.length ? Math.min(...timesWithinBillWindow) : toTime(toDate);
      const openingDateIso =
        anchor !== -Infinity
          ? new Date(anchor - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : toDate;

      eventsWithOpening.push({
        id: -999999,
        date: openingDateIso,
        partyName: displayName,
        brokerName: String(selectedBroker || "").trim(),
        orderNo: "OPENING",
        mode: "",
        debit: opDebit,
        credit: opCredit,
        type: "Opening",
        docKey: makeDocKey("Opening", -999999, `Party:${partyId}`),
      });
    }

    // Determine pending side PER PARTY as-of To Date ONLY (do not let future settlements flip the side)
    const closingSignedPartyAsOfToDate = eventsWithOpening
      .filter((e) => {
        const t = toTime(e.date);
        return t !== -Infinity && t <= billCutoffT;
      })
      .reduce((s, e) => s + toNum(e.debit) - toNum(e.credit), 0);

    const fifoEventsPartyForCalcAll = closingSignedPartyAsOfToDate >= 0
      ? eventsWithOpening
      : eventsWithOpening.map((e) => ({
          ...e,
          debit: toNum(e.credit),
          credit: toNum(e.debit),
        }));

    // Apply bill/settlement cutoff logic in calc-space:
    const fifoEventsPartyForCalc = fifoEventsPartyForCalcAll.filter((e) => {
      const t = toTime(e.date);
      if (t === -Infinity) return false;

      if (t <= billCutoffT) return true; // bills up to To Date
      if (t > settlementCutoffT) return false;

      // after To Date: include ONLY settlements (credit>0 in calc-space)
      return toNum(e.credit) > 0;
    });

    const res = computeLedgerFifo({
      events: fifoEventsPartyForCalc,
      asOfDateIso: pendingAsOfDateIso,
      manualPaidUserByDocKey: manualPaidUserMap,
    });

    mergedPendingTotal += toNum(res.pendingTotal);

    for (const b of res.bills) mergedBills.push(b);
    for (const [k, v] of Array.from(res.pendingByDocKey.entries())) mergedPendingByDocKey.set(k, v);
    for (const k of Array.from(res.partialBillKeys.values())) mergedPartialBillKeys.add(k);
    for (const k of Array.from(res.partialSettlementKeys.values())) mergedPartialSettlementKeys.add(k);
  }

  // deterministic ordering
  mergedBills.sort((a: any, b: any) => {
    const da = toTime(a.date);
    const db = toTime(b.date);
    if (da !== db) return da - db;
    const ra = txSortRank(a.type);
    const rb = txSortRank(b.type);
    if (ra !== rb) return ra - rb;
    return String(a.docKey || "").localeCompare(String(b.docKey || ""));
  });

  return {
    asOfDate: pendingAsOfDateIso,
    bills: mergedBills,
    pendingTotal: mergedPendingTotal,
    pendingByDocKey: mergedPendingByDocKey,
    partialBillKeys: mergedPartialBillKeys,
    partialSettlementKeys: mergedPartialSettlementKeys,
  };
}, [
  fifoEventsAll,
  fifoEventsForCalc,
  toDate,
  pendingAsOfDateIso,
  selectedBroker,
  selectedParty,
  parties,
  partyByName,
  getBrokerFromPartyName,
  getPartyOpeningSigned,
  manualPaidUserMap,
]);

  // ---------- Running balance (UNCHANGED) ----------
  const sortedRowsAll: DisplayRow[] = useMemo(() => {
    if (!transactions.length) return [];

    const openingTx = transactions.find((t) => t.type === "Opening") || null;
    const others = transactions.filter((t) => t.type !== "Opening");

    const data = [...others].sort((a, b) => {
      const da = toTime(a.date);
      const db = toTime(b.date);
      if (da !== db) return da - db;
      const ra = txSortRank(a.type);
      const rb = txSortRank(b.type);
      if (ra !== rb) return ra - rb;
      return (a.id || 0) - (b.id || 0);
    });

    const result: DisplayRow[] = [];
    let sr = 1;
    let rb = 0;

    if (openingTx) {
      rb = toNum(openingTx.debit) - (toNum(openingTx.credit) + toNum(openingTx.discount));
      result.push({ ...openingTx, srNo: sr++, balance: rb });
    }

    for (const row of data) {
      rb += toNum(row.debit) - (toNum(row.credit) + toNum(row.discount));
      result.push({ ...row, srNo: sr++, balance: rb });
    }

    return result;
  }, [transactions]);

  const rowsWithBaseDays: DisplayRowWithDays[] = useMemo(() => {
    if (!sortedRowsAll.length) return [];

    const base = new Date(toDate);
    base.setHours(0, 0, 0, 0);
    const baseTime = base.getTime();

    return sortedRowsAll.map((r) => {
      const t = toTime(r.date);
      const d = new Date(t);
      d.setHours(0, 0, 0, 0);
      const diffMs = baseTime - d.getTime();
      const baseDays = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
      return { ...r, baseDays };
    });
  }, [sortedRowsAll, toDate]);

  const openingBalanceAll = useMemo(() => {
    const op = transactions.find((t) => t.type === "Opening");
    if (!op) return 0;
    return toNum(op.debit) - (toNum(op.credit) + toNum(op.discount));
  }, [transactions]);

  const closingBalanceAll = useMemo(() => {
    if (!sortedRowsAll.length) return 0;
    return sortedRowsAll[sortedRowsAll.length - 1].balance;
  }, [sortedRowsAll]);

  // ---------- Attach FIFO pending + days + paid flags + purple highlight ----------
  const rowsFinal: DisplayRowFinal[] = useMemo(() => {
  const billMap = fifoResult.pendingByDocKey;
  const partialBills = fifoResult.partialBillKeys;
  const partialSett = fifoResult.partialSettlementKeys;

  // ✅ FIFO-based Opening Pending BEFORE From Date (display-only)
  // This fixes: Opening Balance row shows Pending 0 even when FIFO pending exists.
  const fromT = toTime(fromDate);

  let openingPendingFifo = 0;
  for (const b of fifoResult.bills) {
    const pending = toNum((b as any)?.pending);
    if (pending <= 1e-9) continue;

    if ((b as any)?.manualPaidEffective) continue;

    const dt = toTime(String((b as any)?.date || ""));
    if (dt === -Infinity) continue;

    // Bills strictly before From Date
    // PLUS Opening bill if its FIFO date equals From Date (edge case)
    const isOpeningBill = (b as any)?.type === "Opening";
    if (dt < fromT || (isOpeningBill && dt <= fromT)) {
      openingPendingFifo += pending;
    }
  }

  return rowsWithBaseDays.map((r) => {
    const key = String(r.docKey || "").trim();
    const bill = key ? billMap.get(key) : undefined;

    // normal bill pending
    const pendingFromBill = bill ? bill.pending : 0;
    const daysFromBill = bill ? bill.days : 0;

    const paidAuto = bill ? bill.paidAuto : false;
    const manualPaidUser = bill ? bill.manualPaidUser : false;
    const manualPaidEffective = bill ? bill.manualPaidEffective : false;

    const isPartialBill = key ? partialBills.has(key) : false;
    const isPartialSettlement = key ? partialSett.has(key) : false;

    // ✅ Display fix:
    // If this is the display-only "Opening Balance" row and FIFO has opening pending,
    // show it in the Pending column.
    const isDisplayOpeningBalanceRow = r.type === "Opening" && String(r.partyName || "").trim() === "Opening Balance";
    const pendingFinal = isDisplayOpeningBalanceRow && openingPendingFifo > 1e-9 ? openingPendingFifo : pendingFromBill;

    return {
      ...r,
      pending: pendingFinal > 1e-9 ? pendingFinal : 0,
      days: pendingFinal > 1e-9 ? (isDisplayOpeningBalanceRow ? 0 : daysFromBill) : 0,
      paidAuto,
      manualPaidUser,
      manualPaidEffective,
      isPartialBill,
      isPartialSettlement,
    };
  });
}, [rowsWithBaseDays, fifoResult, fromDate]);

  const isBillRow = useCallback(
    (r: DisplayRowFinal) => {
      const key = String(r.docKey || "").trim();
      if (!key) return false;
      if (pendingSide === "DEBIT") return toNum(r.debit) > 0;
      return toNum(r.credit) + toNum(r.discount) > 0; // for credit-side bills, display uses credit+discount
    },
    [pendingSide],
  );

  const filteredRows: DisplayRowFinal[] = useMemo(() => {
  let rows = rowsFinal;

  // Apply Tx filter first (existing behavior)
  if (transactionFilter !== "all") rows = rows.filter((r) => r.type === transactionFilter);

  // Pending Only (existing behavior)
  if (pendingOnly) {
    rows = rows.filter((r) => isBillRow(r) && r.pending > 0 && !r.manualPaidEffective);

    // ✅ NEW: Opening Pending row (FIFO remaining pending BEFORE From Date)
    // This row is NOT based on opening/closing/net/running balance.
    const fromT = toTime(fromDate);

    let openingPending = 0;
    for (const b of fifoResult.bills) {
      const pending = toNum((b as any)?.pending);
      if (pending <= 1e-9) continue;

      if ((b as any)?.manualPaidEffective) continue;

      // Respect current Tx filter if user selected a specific type
      if (transactionFilter !== "all" && (b as any)?.type !== transactionFilter) continue;

      const dt = toTime(String((b as any)?.date || ""));
      if (dt === -Infinity) continue;

      if (dt < fromT) openingPending += pending;
    }

    if (openingPending > 1e-9) {
      const openingPendingRow: DisplayRowFinal = {
        id: -999998,
        date: "", // blank date (so it displays as empty like your example)
        partyName: "Opening Pending",
        brokerName: selectedBroker || "",
        orderNo: "",
        mode: "",
        payRecMode: "",

        debit: 0,
        credit: 0,
        discount: 0,
        type: "Opening",
        docKey: "",

        srNo: 0,
        balance: 0,
        baseDays: 0,

        pending: openingPending,
        days: 0,

        paidAuto: false,
        manualPaidUser: false,
        manualPaidEffective: false,

        isPartialBill: false,
        isPartialSettlement: false,
      };

      // show at top
      rows = [openingPendingRow, ...rows];
    }
  }

  return rows;
}, [rowsFinal, transactionFilter, pendingOnly, isBillRow, fromDate, fifoResult.bills, selectedBroker]);

  // ---------- Totals (display) ----------
  const totalDebitAll = useMemo(() => transactions.reduce((s, t) => s + toNum(t.debit), 0), [transactions]);
  const totalCreditAllCash = useMemo(() => transactions.reduce((s, t) => s + toNum(t.credit), 0), [transactions]);
  const totalDiscountAll = useMemo(() => transactions.reduce((s, t) => s + toNum(t.discount), 0), [transactions]);

  const totalDebitFiltered = useMemo(() => filteredRows.reduce((s, r) => s + toNum(r.debit), 0), [filteredRows]);
  const totalCreditFilteredCash = useMemo(() => filteredRows.reduce((s, r) => s + toNum(r.credit), 0), [filteredRows]);
  const totalDiscountFiltered = useMemo(() => filteredRows.reduce((s, r) => s + toNum(r.discount), 0), [filteredRows]);
  const totalCreditFiltered = useMemo(() => totalCreditFilteredCash + totalDiscountFiltered, [totalCreditFilteredCash, totalDiscountFiltered]);
const netFiltered = useMemo(() => totalDebitFiltered - totalCreditFiltered, [totalDebitFiltered, totalCreditFiltered]);

// ✅ Pending Summary (FIFO only): Opening Pending + Current Period Pending = Total Pending
const pendingTotals = useMemo(() => {
  const fromT = toTime(fromDate);
  const toT = endOfDayTime(toDate);

  let openingPending = 0;
  let currentPeriodPending = 0;

  for (const b of fifoResult.bills) {
    const pending = toNum((b as any)?.pending);
    if (pending <= 1e-9) continue;

    if ((b as any)?.manualPaidEffective) continue;

    const dt = toTime(String((b as any)?.date || ""));
    if (dt === -Infinity) continue;

    if (dt < fromT) openingPending += pending;
    else if (dt <= toT) currentPeriodPending += pending;
    // bills after To Date are out of statement scope (should not be present due to FIFO filtering)
  }

  const totalPending = openingPending + currentPeriodPending;

  return {
    openingPending,
    currentPeriodPending,
    totalPending,
  };
}, [fifoResult.bills, fromDate, toDate]);

// ✅ One common pending number everywhere
const totalPendingFifo = useMemo(() => pendingTotals.totalPending, [pendingTotals.totalPending]);

  // ✅ Party Summary MUST be based on FIFO bills (not last party)
  const partyPendingSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of fifoResult.bills) {
      if (b.pending <= 0) continue;
      if (b.manualPaidEffective) continue;
      const p = String(b.partyName || "").trim() || "(Direct)";
      map.set(p, (map.get(p) || 0) + b.pending);
    }
    const arr = Array.from(map.entries()).map(([partyName, pending]) => ({ partyName, pending }));
    arr.sort((a, b) => b.pending - a.pending);
    return arr;
  }, [fifoResult.bills]);

  // ✅ FIX (1): Broker Pending Summary must equal SUM of FIFO pending of ALL parties under broker
  // This does NOT use running/closing/net; it is derived from FIFO remaining pending.
  const brokerPendingSummaryTotal = useMemo(() => {
  // Must NOT be calculated separately; it must always match the one common FIFO pending number.
  if (!selectedBroker || selectedParty) return 0;
  return toNum(pendingTotals.totalPending);
}, [selectedBroker, selectedParty, pendingTotals.totalPending]);

  // ---------- Pending Report (challan-wise) ----------
 

  // ---------- Overdue popup (FIFO) ----------
  const overdueRowsAll: OverdueAlertRow[] = useMemo(() => {
    const list = fifoResult.bills
      .filter((b) => b.pending > 0 && b.days >= OVERDUE_DAYS && !b.manualPaidEffective)
      .map((b) => ({
        partyName: b.partyName || "-",
        brokerName: b.brokerName || "-",
        docNo: b.docNo || "-",
        txType: typeLabel(b.type),
        date: b.date,
        days: b.days,
        pending: b.pending,
      }))
      .sort((a, b) => b.days - a.days);

    return list;
  }, [fifoResult.bills]);

  useEffect(() => {
    if (!showModal) return;
    if (!overdueRowsAll.length) return;

    const key = `${selectedBroker}|${selectedParty}|${fromDate}|${toDate}|${transactions.length}|${totalPendingFifo}`;
    if (overdueAlertKeyRef.current === key) return;
    overdueAlertKeyRef.current = key;

    const html = `
      <div style="text-align:left; font-size: 13px;">
        <div style="margin-bottom:8px;"><b>Overdue Pending Entries (FIFO) (≥ ${OVERDUE_DAYS} Days)</b></div>
        <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="6">
          <thead>
            <tr style="background:#fee2e2;">
              <th>Party</th>
              <th>Broker</th>
              <th>Doc No</th>
              <th>Type</th>
              <th>Date</th>
              <th>Days</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            ${overdueRowsAll
              .slice(0, 20)
              .map(
                (x) => `
                <tr>
                  <td>${x.partyName}</td>
                  <td>${x.brokerName}</td>
                  <td>${x.docNo}</td>
                  <td>${x.txType}</td>
                  <td>${fmtDateHeader(x.date)}</td>
                  <td style="text-align:right; font-weight:700; color:#b91c1c;">${x.days}</td>
                  <td style="text-align:right; font-weight:700;">${fmtNumber(x.pending)}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    Swal.fire({ icon: "warning", title: `${OVERDUE_DAYS} Days Alert`, html, confirmButtonText: "OK" });
  }, [showModal, overdueRowsAll, selectedBroker, selectedParty, fromDate, toDate, transactions.length, totalPendingFifo]);

  // ---------- Print Summary ----------
  const handlePrintSummary = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (!partyPendingSummary.length) return alert("No pending summary to print");

    const rowsHtml = partyPendingSummary
      .map(
        (x, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${x.partyName}</td>
        <td style="text-align:right;">${fmtNumber(x.pending)}</td>
      </tr>
    `,
      )
      .join("");

    const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Pending Summary</title>
<style>
  body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
  h2 { text-align: center; margin-bottom: 8px; }
  .info { margin-bottom: 12px; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #444; padding: 6px; text-align: left; }
  th { background: #eee; }
</style>
</head>
<body>
  <h2>Pending Summary (FIFO)</h2>
  <div class="info">
    <div><b>Broker:</b> ${selectedBroker || "-"} ${selectedParty ? ` | <b>Party:</b> ${selectedParty}` : ""}</div>
    <div><b>From Date :</b> <b>${fmtDateHeader(fromDate)}</b> &nbsp; <b>To Date :</b> <b>${fmtDateHeader(toDate)}</b></div>
    <div><b>Pending Side:</b> ${pendingSide}</div>
    <div><b>Total Pending (FIFO):</b> ${fmtNumber(totalPendingFifo)}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th><b>Party Name</b></th><th style="text-align:right;"><b>Total Pending</b></th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr><td colspan="2"><b>Total</b></td><td style="text-align:right;"><b>${fmtNumber(totalPendingFifo)}</b></td></tr>
    </tfoot>
  </table>
  <script>window.onload=function(){window.focus();window.print();};</script>
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const w = iframe.contentWindow;
    if (!w) return alert("Unable to open print preview.");
    const d = w.document;
    d.open();
    d.write(html);
    d.close();
  };

  // ---------- Print Report (PDF via print) ----------
 const handlePrintReport = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!filteredRows.length) return alert("No transactions to print");

  // ✅ If Pending Only is enabled, print ONLY relevant pending columns
  if (pendingOnly) {
    const amountLabel = pendingSide === "DEBIT" ? "Debit" : "Credit";

    const rowsHtml = filteredRows
      .map((r, i) => {
        const partyCell = r.partyName || (r.brokerName ? `Broker: ${r.brokerName}` : "");

        // Amount column (bill-side amount)
        const amount =
          pendingSide === "DEBIT"
            ? toNum(r.debit)
            : toNum(r.credit) + toNum(r.discount);

        // For Opening Pending display rows (where debit/credit may be 0), show pending as amount
        const amountToShow = amount > 1e-9 ? amount : toNum(r.pending);

        return `
          <tr>
            <td>${i + 1}</td>
            <td>${fmtDateHeader(r.date)}</td>
            <td>${partyCell}</td>
            <td>${r.orderNo || ""}</td>
            <td style="text-align:right;">${fmtNumber(amountToShow)}</td>
            <td style="text-align:right;">${fmtNumber(r.pending)}</td>
            <td>${typeLabel(r.type)}</td>
            <td style="text-align:right;">${r.days || 0}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Pending Statement</title>
<style>
  body { font-family: Arial, sans-serif; margin: 16px; color:#111; }
  h2 { text-align:center; margin-bottom:8px; }
  .info { font-size:12px; margin-bottom:12px; }
  table { border-collapse: collapse; width:100%; font-size:12px; }
  th, td { border:1px solid #444; padding:6px; text-align:left; }
  th { background:#eee; }
</style>
</head>
<body>
  <h2>Pending Bills (FIFO)</h2>
  <div class="info">
    <div><b>Broker:</b> ${selectedBroker || "-"} ${selectedParty ? ` | <b>Party:</b> ${selectedParty}` : ""}</div>
    <div><b>From Date :</b> <b>${fmtDateHeader(fromDate)}</b> &nbsp; <b>To Date :</b> <b>${fmtDateHeader(toDate)}</b></div>
    <div><b>Pending Side:</b> ${pendingSide}</div>
    <div><b>Total Pending (FIFO):</b> ${fmtNumber(totalPendingFifo)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:60px;">S No</th>
        <th style="width:110px;">Date</th>
        <th>Party/Broker</th>
        <th style="width:160px;">Doc No</th>
        <th style="width:120px; text-align:right;">${amountLabel}</th>
        <th style="width:120px; text-align:right;">Pending</th>
        <th style="width:160px;">Type</th>
        <th style="width:80px; text-align:right;">Days</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <script>window.onload=function(){window.focus();window.print();};</script>
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const w = iframe.contentWindow;
    if (!w) return alert("Unable to open print preview.");
    const d = w.document;
    d.open();
    d.write(html);
    d.close();
    return;
  }

  // ✅ Normal print (UNCHANGED)
  const rowBg = (r: DisplayRowFinal) => {
    const overdue = r.type !== "Opening" && r.pending > 0 && r.days >= OVERDUE_DAYS && !r.manualPaidEffective;
    const partial = r.isPartialBill || r.isPartialSettlement;

    if (partial) return "#ede9fe";
    if (overdue) return "#fee2e2";
    if (toNum(r.discount) > 0) return "#ffedd5";
    if (r.type === "Receipt") return "#dbeafe";
    if (r.type === "Payment") return "#dcfce7";
    return "";
  };

  const rowsHtml = filteredRows
    .map((r) => {
      const partyCell = r.partyName || (r.brokerName ? `Broker: ${r.brokerName}` : "");
      const bg = rowBg(r);
      const modeText = combineModeForDisplay(r.mode, r.payRecMode);

      return `
          <tr style="${bg ? `background:${bg};` : ""}">
            <td>${r.srNo}</td>
            <td>${fmtDateHeader(r.date)}</td>
            <td>${partyCell}</td>
            <td>${r.orderNo || ""}</td>
            <td>${modeText || ""}</td>
            <td style="text-align:right;">${fmtNumber(r.debit)}</td>
            <td style="text-align:right;">${fmtNumber(r.credit)}</td>
            <td style="text-align:right;">${fmtNumber(r.discount)}</td>
            <td style="text-align:right;">${fmtNumber(r.balance)}</td>
            <td style="text-align:right;">${fmtNumber(r.pending)}</td>
            <td>${typeLabel(r.type)}</td>
            <td style="text-align:right;">${r.days}</td>
            <td style="text-align:center;">${r.paidAuto ? "Yes" : ""}</td>
            <td style="text-align:center;">${r.manualPaidEffective ? "Yes" : ""}</td>
          </tr>
        `;
    })
    .join("");

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Account Statement</title>
<style>
  body { font-family: Arial, sans-serif; margin: 16px; color:#111; }
  h2 { text-align:center; margin-bottom:8px; }
  .info { font-size:12px; margin-bottom:12px; }
  table { border-collapse: collapse; width:100%; font-size:12px; }
  th, td { border:1px solid #444; padding:6px; text-align:left; }
  th { background:#eee; }
</style>
</head>
<body>
  <h2>Account Statement</h2>
  <div class="info">
    <div><b>Broker:</b> ${selectedBroker || "-"} ${selectedParty ? ` | <b>Party:</b> ${selectedParty}` : ""}</div>
    <div><b>From Date :</b> <b>${fmtDateHeader(fromDate)}</b> &nbsp; <b>To Date :</b> <b>${fmtDateHeader(toDate)}</b></div>
    <div><b>Pending Side:</b> ${pendingSide}</div>
    <div><b>Total Pending (FIFO):</b> ${fmtNumber(totalPendingFifo)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>S No</th><th>Date</th><th>Party/Broker</th><th>Doc No</th><th>Mode</th>
        <th style="text-align:right;">Debit</th>
        <th style="text-align:right;">Credit</th>
        <th style="text-align:right;">Discount</th>
        <th style="text-align:right;">Balance</th>
        <th style="text-align:right;">Pending</th>
        <th>Type</th>
        <th style="text-align:right;">Days</th>
        <th>Paid(Auto)</th>
        <th>Status(Manual)</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="info" style="margin-top:12px;">
    <div><b>Opening Balance (Display):</b> ${fmtNumber(openingBalanceAll)}</div>
    <div><b>Closing Balance (Display):</b> ${fmtNumber(closingBalanceAll)}</div>
  </div>

  <script>window.onload=function(){window.focus();window.print();};</script>
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const w = iframe.contentWindow;
  if (!w) return alert("Unable to open print preview.");
  const d = w.document;
  d.open();
  d.write(html);
  d.close();
};

  // ---------- Excel exports ----------
  

  // ---------- Reset ----------
  function resetAll() {
  setSelectedBroker("");
  setSelectedParty("");
  setComboInput("");
  setComboQuery("");
  setComboOpen(false);
  setSearchBy("broker");
  requestAnimationFrame(() => {
    comboInputRef.current?.focus();
    comboInputRef.current?.select();
  });
  setFromDate(getFirstOfMonthIso());
  setToDate(getTodayIso());
  setShowOpening(true);
  setPendingOnly(false);
  setShowModal(false);
  setFullScreen(false);
  setTransactions([]);
  setTransactionFilter("all");
  setFifoEventsAll([]);
  setManualPaidUserMap(new Map());
  overdueAlertKeyRef.current = "";
}

  // ================= UI =================
  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-3">Account Statement</h2>

          {loading && <div className="text-sm text-gray-600 mb-2">Loading master data...</div>}
          {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}
          {reportPreparing && !loading && <div className="text-sm text-blue-600 mb-2">Preparing report...</div>}

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className="block text-sm mb-1">Broker / Party</label>

              <div className="flex items-center gap-4 mb-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="searchBy"
                    value="broker"
                    checked={searchBy === "broker"}
                    onChange={() => {
                      setSearchBy("broker");
                      setSelectedBroker("");
                      setSelectedParty("");
                      setComboInput("");
                      setComboQuery("");
                      setComboOpen(false);
                      focusComboSearch();
                    }}
                  />
                  Broker
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="searchBy"
                    value="party"
                    checked={searchBy === "party"}
                    onChange={() => {
                      setSearchBy("party");
                      setSelectedBroker("");
                      setSelectedParty("");
                      setComboInput("");
                      setComboQuery("");
                      setComboOpen(false);
                      focusComboSearch();
                    }}
                  />
                  Party
                </label>
              </div>

              <div className="relative">
                <input
                  ref={comboInputRef}
                  autoFocus
                  value={comboInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setComboInput(v);
                    setComboQuery(v);
                    setComboOpen(true);
                    setSelectedBroker("");
                    setSelectedParty("");
                  }}
                  onFocus={() => {
                    setComboOpen(true);
                    setComboQuery("");
                  }}
                  onBlur={() => window.setTimeout(() => setComboOpen(false), 150)}
                  placeholder={searchBy === "broker" ? "Type broker..." : "Type party..."}
                  className="border p-2 rounded w-full text-sm"
                />

                {comboOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto">
                    {comboOptions.slice(0, 200).map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectOption(o);
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                    {comboOptions.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No match</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
            </div>

            <div className="col-span-4 mt-6 space-y-2">
              <label className="inline-flex items-center text-sm">
                <input type="checkbox" checked={showOpening} onChange={(e) => setShowOpening(e.target.checked)} className="mr-2" />
                Show Opening Balance
              </label>

              <label className="inline-flex items-center text-sm">
                <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} className="mr-2" />
                Pending Only (FIFO)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400" onClick={handleShow} disabled={loading || reportPreparing}>
              Show
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={resetAll} disabled={loading || reportPreparing}>
              Reset
            </button>

            <div className="ml-auto text-sm text-gray-600">
              Pending Side: <strong>{pendingSide}</strong> | Total Pending (FIFO): <strong>{fmtNumber(totalPendingFifo)}</strong>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
                        <div
              className="absolute inset-0 bg-black opacity-30"
              onClick={() => {
                setShowModal(false);
              }}
            />
            <div
              className={`relative bg-white rounded shadow overflow-hidden ${
                fullScreen ? "w-full h-full m-0" : "w-[95%] lg:w-[90%] m-4"
              }`}
              style={{ maxHeight: fullScreen ? "100vh" : "90vh" }}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div>
                  <div className="text-sm text-gray-700">
                    <strong>Broker:</strong> {selectedBroker || "-"}
                    {selectedParty ? (
                      <>
                        {" "}
                        | <strong>Party:</strong> {selectedParty}
                      </>
                    ) : null}
                    {"  "} | <strong>From Date :</strong> <b>{fmtDateHeader(fromDate)}</b> | <strong>To Date :</strong> <b>{fmtDateHeader(toDate)}</b>
                  </div>

                  <div className="text-xs text-gray-600 mt-1">
                    Rows: {filteredRows.length} | Debit: {fmtNumber(totalDebitFiltered)} | Credit: {fmtNumber(totalCreditFilteredCash)} | Discount: {fmtNumber(totalDiscountFiltered)} | Total Credit:{" "}
                    {fmtNumber(totalCreditFiltered)} | Net: {fmtNumber(netFiltered)}
                    <span className="text-gray-500">
                      {" "}
                      | Pending Side: <b>{pendingSide}</b> | Pending (FIFO): <b>{fmtNumber(totalPendingFifo)}</b>
                    </span>
                    <span className="text-gray-400">
                      {" "}
                      (All: Dr {fmtNumber(totalDebitAll)} / Cr {fmtNumber(totalCreditAllCash)} / Disc {fmtNumber(totalDiscountAll)})
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-gray-700">Transaction Type:</span>
                    <select value={transactionFilter} onChange={(e) => setTransactionFilter(e.target.value as any)} className="border rounded px-2 py-1 text-xs">
                      <option value="all">All</option>
                      <option value="Dispatch">Dispatch</option>
                      <option value="OtherDispatch">Other Dispatch</option>
                      <option value="PurchaseOrder">Purchase Order</option>
                      <option value="PurchaseEntry">Purchase Entry</option>
                      <option value="PurchaseReturn">Purchase Return</option>
                      <option value="JobOutward">Job Outward Challan</option>
                      <option value="JobInward">Job Inward Challan</option>
                      <option value="Payment">Payment</option>
                      <option value="Receipt">Receipt</option>
                      <option value="Opening">Opening</option>
                    </select>

                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
                      Pending Only
                    </label>

                    <span className="text-gray-400">Purple = Partial bill/settlement</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                                    <button className="px-2 py-1 border rounded text-sm hover:bg-gray-100" onClick={handlePrintSummary}>
                    Print Summary
                  </button>

                  <button className="px-2 py-1 border rounded text-sm hover:bg-gray-100" onClick={handlePrintReport}>
                    Print
                  </button>

                  <button className="px-2 py-1 border rounded text-sm hover:bg-gray-100" onClick={() => setFullScreen(!fullScreen)}>
                    {fullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>

                                    <button
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    onClick={() => {
                      setShowModal(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-2 overflow-auto" style={{ height: fullScreen ? "calc(100vh - 72px)" : "78vh" }}>
                {/* Main table (Pending Only Layout supported) */}
                <div className="min-w-max">
                  <table className="w-full table-auto text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      {pendingOnly ? (
                        <tr>
                          <th className="px-2 py-1 border">Date</th>
                          <th className="px-2 py-1 border">Party/Broker</th>
                          <th className="px-2 py-1 border">Doc No</th>
                          <th className="px-2 py-1 border">Mode</th>
                          <th className="px-2 py-1 border text-right">Debit</th>
                          <th className="px-2 py-1 border text-right">Pending</th>
                          <th className="px-2 py-1 border">Type</th>
                          <th className="px-2 py-1 border text-right">Days</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-2 py-1 border">S No</th>
                          <th className="px-2 py-1 border">Date</th>
                          <th className="px-2 py-1 border">Party/Broker</th>
                          <th className="px-2 py-1 border">Doc No</th>
                          <th className="px-2 py-1 border">Mode</th>
                          <th className="px-2 py-1 border text-right">Debit</th>
                          <th className="px-2 py-1 border text-right">Credit</th>
                          <th className="px-2 py-1 border text-right">Discount</th>
                          <th className="px-2 py-1 border text-right">Balance</th>
                          <th className="px-2 py-1 border text-right">Pending</th>
                          <th className="px-2 py-1 border">Type</th>
                          <th className="px-2 py-1 border text-right">Days</th>
                          <th className="px-2 py-1 border text-center">Paid (Auto)</th>
                          <th className="px-2 py-1 border text-center">Status (Manual)</th>
                        </tr>
                      )}
                    </thead>

                    <tbody>
                      {filteredRows.map((r) => {
                        const overdue = r.type !== "Opening" && r.pending > 0 && r.days >= OVERDUE_DAYS && !r.manualPaidEffective;
                        const partial = r.isPartialBill || r.isPartialSettlement;

                        const zebra = r.srNo % 2 === 0 ? "bg-white" : "bg-gray-50";
                        const rowClass = partial
                          ? "bg-purple-100"
                          : overdue
                            ? "bg-red-100"
                            : toNum(r.discount) > 0
                              ? "bg-orange-100"
                              : r.type === "Receipt"
                                ? "bg-blue-100"
                                : r.type === "Payment"
                                  ? "bg-green-100"
                                  : zebra;

                        const partyCell = r.partyName || (r.brokerName ? `Broker: ${r.brokerName}` : "");
                        const modeText = combineModeForDisplay(r.mode, r.payRecMode);

                        const dateCell =
                          r.type === "Dispatch" ? (
                            <button
                              type="button"
                              className="text-blue-700 underline hover:text-blue-900"
                              onClick={() => goToDispatchEdit(r.id)}
                              title="Open Dispatch Challan (Edit)"
                            >
                              {fmtDateHeader(r.date)}
                            </button>
                          ) : (
                            fmtDateHeader(r.date)
                          );

                        if (pendingOnly) {
                          return (
                            <tr key={`${r.type}-${r.id}-${r.srNo}`} className={rowClass}>
                              <td className="px-2 py-1 border">{dateCell}</td>
                              <td className="px-2 py-1 border">{partyCell}</td>
                              <td className="px-2 py-1 border">{r.orderNo}</td>
                              <td className="px-2 py-1 border">{modeText}</td>
                              <td className="px-2 py-1 border text-right">{fmtNumber(r.debit)}</td>
                              <td className="px-2 py-1 border text-right">{fmtNumber(r.pending)}</td>
                              <td className="px-2 py-1 border">{typeLabel(r.type)}</td>
                              <td className={`px-2 py-1 border text-right ${overdue ? "text-red-700 font-bold" : ""}`}>{r.days}</td>
                            </tr>
                          );
                        }

                        const canToggleManual = isBillRow(r) && !!String(r.docKey || "").trim() && !r.paidAuto;

                        return (
                          <tr key={`${r.type}-${r.id}-${r.srNo}`} className={rowClass}>
                            <td className="px-2 py-1 border">{r.srNo}</td>
                            <td className="px-2 py-1 border">{dateCell}</td>
                            <td className="px-2 py-1 border">{partyCell}</td>
                            <td className="px-2 py-1 border">{r.orderNo}</td>
                            <td className="px-2 py-1 border">{modeText}</td>

                            <td className="px-2 py-1 border text-right">{fmtNumber(r.debit)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.credit)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.discount)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.balance)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.pending)}</td>

                            <td className="px-2 py-1 border">{typeLabel(r.type)}</td>
                            <td className={`px-2 py-1 border text-right ${overdue ? "text-red-700 font-bold" : ""}`}>{r.days}</td>

                            <td className="px-2 py-1 border text-center">
                              <input type="checkbox" checked={!!r.paidAuto} readOnly disabled />
                            </td>

                            <td className="px-2 py-1 border text-center">
                              <input
                                type="checkbox"
                                disabled={!canToggleManual}
                                checked={!!r.manualPaidEffective}
                                onChange={(e) => updateManualPaidUser(String(r.docKey || ""), !!e.target.checked)}
                                title={r.paidAuto ? "Auto Paid (locked)" : "Manual Paid"}
                              />
                            </td>
                          </tr>
                        );
                      })}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={pendingOnly ? 8 : 14} className="px-2 py-3 border text-center text-gray-500">
                            No transactions found.
                          </td>
                        </tr>
                      )}

                      {filteredRows.length > 0 && (
                        <tr>
                          <td colSpan={pendingOnly ? 8 : 14} className="p-0">
                            <div className="w-full bg-white border-t">
                              <div className="p-3">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                  <div className="col-span-4">
                                    <div className="text-sm font-semibold">Totals (Filtered)</div>
                                    <div className="text-xs text-gray-700 mt-1">
                                      Debit: <strong>{fmtNumber(totalDebitFiltered)}</strong>
                                    </div>
                                    <div className="text-xs text-gray-700">
                                      Credit: <strong>{fmtNumber(totalCreditFilteredCash)}</strong>
                                    </div>
                                    <div className="text-xs text-gray-700">
                                      Discount: <strong>{fmtNumber(totalDiscountFiltered)}</strong>
                                    </div>
                                    <div className="text-xs text-gray-700">
                                      Total Credit: <strong>{fmtNumber(totalCreditFiltered)}</strong>
                                    </div>
                                    <div className="text-xs text-gray-700">
                                      Net: <strong>{fmtNumber(netFiltered)}</strong>
                                    </div>
                                  </div>

                                  <div className="col-span-5">
                                    <div className="text-sm font-semibold">Balance Summary (Display)</div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                      <div className="text-gray-700">Opening Balance:</div>
                                      <div className="text-right text-gray-900">{fmtNumber(openingBalanceAll)}</div>
                                      <div className="text-gray-700">Closing Balance:</div>
                                      <div className="text-right text-gray-900">{fmtNumber(closingBalanceAll)}</div>
                                      <div className="text-gray-700">Pending Side:</div>
                                      <div className="text-right text-gray-900">{pendingSide}</div>
                                      <div className="text-gray-700">Pending (FIFO):</div>
                                      <div className="text-right text-gray-900">{fmtNumber(totalPendingFifo)}</div>
                                    </div>
                                  </div>

                                  <div className="col-span-3 text-right">
                                    <div className="text-sm font-semibold">Broker / Party Summary (FIFO)</div>
                                    <div className="mt-2 text-xs">
                                      {selectedBroker && !selectedParty ? (
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="truncate max-w-[160px] font-semibold">Broker Total</span>
                                          <span className="font-semibold">{fmtNumber(brokerPendingSummaryTotal)}</span>
                                        </div>
                                      ) : null}

                                      {(selectedBroker && !selectedParty ? partyPendingSummary.slice(0, 5) : partyPendingSummary.slice(0, 6)).map((x) => (
                                        <div key={x.partyName} className="flex items-center justify-between gap-2">
                                          <span className="truncate max-w-[160px]">{x.partyName}</span>
                                          <span className="font-semibold">{fmtNumber(x.pending)}</span>
                                        </div>
                                      ))}

                                      {partyPendingSummary.length > (selectedBroker && !selectedParty ? 5 : 6) && (
                                        <div className="text-[11px] text-gray-500 mt-1">
                                          + {partyPendingSummary.length - (selectedBroker && !selectedParty ? 5 : 6)} more...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 text-xs text-gray-600">
                                  Red row = Pending & {OVERDUE_DAYS}+ Days. Purple row = Partial bill OR related settlement.
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                  Manual Paid hides bill immediately from Pending and Pending Only.
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length > 0 && (
                  <div className="mt-2 text-xs text-gray-700 flex items-center gap-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-3 bg-red-100 border inline-block" />
                      Overdue Pending
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-3 bg-purple-100 border inline-block" />
                      Partial Settlement
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default AccountStatement;