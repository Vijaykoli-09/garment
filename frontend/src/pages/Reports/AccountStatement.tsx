"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

// ================= Config =================
const OVERDUE_DAYS = 60;

// ================= Types =================
interface Party {
  id: number;
  serialNumber?: string;
  partyName: string;
  agent?: { serialNo?: string | number; agentName?: string };
}

interface Agent {
  serialNo: string | number;
  agentName: string;
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
  amount: number;
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

type TxType =
  | "Opening"
  | "Dispatch"
  | "OtherDispatch"
  | "PurchaseOrder"
  | "PurchaseEntry"
  | "PurchaseReturn"
  | "JobOutward"
  | "JobInward"
  | "Payment"
  | "Receipt";

type BaseTransaction = {
  id: number;
  date: string;
  partyName: string;
  brokerName?: string;
  orderNo?: string;
  mode?: string;
  debit: number;
  credit: number;
  type: TxType;
};

type DisplayRow = BaseTransaction & { srNo: number; balance: number };
type DisplayRowWithDays = DisplayRow & { days: number };

type OverdueAlertRow = {
  partyName: string;
  brokerName: string;
  docNo: string;
  txType: string;
  date: string;
  days: number;
  debit: number;
  credit: number;
};

// ================= Utils =================
const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getFirstOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const fmtDateHeader = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}/${d.getFullYear()}`;
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

const norm = (s: string) => (s || "").trim().toLowerCase();

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

// stable ordering on same date
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

// ================= Component =================
const AccountStatement: React.FC = () => {
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

  type SearchBy = "broker" | "party";
  const [searchBy, setSearchBy] = useState<SearchBy>("broker");

  const [selectedBroker, setSelectedBroker] = useState("");
  const [selectedParty, setSelectedParty] = useState("");

  const [fromDate, setFromDate] = useState(getFirstOfMonthIso());
  const [toDate, setToDate] = useState(getTodayIso());
  const [showOpening, setShowOpening] = useState(true);

  // Report state
  type TxFilter = "all" | TxType;
  const [transactions, setTransactions] = useState<BaseTransaction[]>([]);
  const [transactionFilter, setTransactionFilter] = useState<TxFilter>("all");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // popup once per report
  const overdueAlertKeyRef = useRef<string>("");

  // ---------- Load data ----------
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
        const [
          partyRaw,
          agentRaw,
          dcRaw,
          odcRaw,
          poRaw,
          peRaw,
          prRaw,
          payRaw,
          jobOutRaw,
          jobInRaw,
        ] = await Promise.all([
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
                partyName:
                  String(d.partyName ?? "") ||
                  partyIdToName.get(String(d.partyId ?? "")) ||
                  "",
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
                partyName:
                  String(d.partyName ?? "") ||
                  partyIdToName.get(String(d.partyId ?? "")) ||
                  "",
                amount,
              } as JobInwardChallanDoc;
            })
            .filter((x) => x.partyName && x.date && x.challanNo),
        );

        // include Broker payments too (if present)
        setPayments(
          (Array.isArray(payRaw) ? payRaw : [])
            .map((p: any) => {
              const paymentTo = String(p.paymentTo ?? p.payment_to ?? "").trim();
              const partyName = paymentTo === "Party" ? String(p.partyName ?? "").trim() : "";
              const brokerName =
                paymentTo === "Broker"
                  ? String(p.agentName ?? p.brokerName ?? "").trim()
                  : "";

              return {
                id: p.id,
                paymentDate: p.paymentDate || p.date || "",
                date: p.date || "",
                paymentTo: paymentTo || "",
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

        // include Broker receipts too (receiptTo=Broker)
        setReceipts(
          (Array.isArray(recRaw) ? recRaw : [])
            .map((r: any) => {
              const receiptTo = String(r.receiptTo ?? r.paymentTo ?? "").trim();
              const partyName = receiptTo === "Party" ? String(r.partyName ?? "").trim() : "";
              const brokerName =
                receiptTo === "Broker"
                  ? String(r.agentName ?? r.brokerName ?? "").trim()
                  : String(r.agentName ?? r.brokerName ?? "").trim();

              return {
                id: r.id,
                receiptTo,
                receiptDate: r.receiptDate || r.paymentDate || r.date || "",
                date: r.date || "",
                partyName,
                brokerName,
                agentName: String(r.agentName ?? "").trim(),
                amount: parseFloat(r.amount ?? 0) || 0,
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
      const masterAgentName = code
        ? agents.find((a) => String(a.serialNo) === String(code))?.agentName || ""
        : "";
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

  /**
   * ✅ YOUR REQUIRED DR/CR RULES
   * - Purchase (PurchaseOrder, PurchaseEntry) => CR
   * - Payment => DR
   * - Receipt => CR (all receipts)
   * - Dispatch Return => CR  (we treat OtherDispatch as Dispatch Return)
   * - Purchase Return => DR
   * - Dispatch => DR (kept as normal sale dispatch)
   * - JobInward => CR
   * - JobOutward, Opening => 0 effect
   */
  const getDrCr = useCallback((source: TxType, amount: number) => {
    const amt = toNum(amount);

    if (source === "Payment") return { debit: amt, credit: 0 };

    if (source === "Receipt") return { debit: 0, credit: amt };

    if (source === "PurchaseOrder") return { debit: 0, credit: amt };
    if (source === "PurchaseEntry") return { debit: 0, credit: amt };

    // Dispatch Return => CR (mapped to OtherDispatch in your code)
    if (source === "OtherDispatch") return { debit: 0, credit: amt };

    // Purchase Return => DR
    if (source === "PurchaseReturn") return { debit: amt, credit: 0 };

    // Job Inward => CR
    if (source === "JobInward") return { debit: 0, credit: amt };

    // No financial effect
    if (source === "JobOutward") return { debit: 0, credit: 0 };
    if (source === "Opening") return { debit: 0, credit: 0 };

    // Default: Dispatch etc => DR
    return { debit: amt, credit: 0 };
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
      parties: Array.from(x.parties).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
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
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [agents, parties, brokerInfos]);

  const allPartyNames = useMemo(() => {
    const set = new Set<string>();
    parties.forEach((p) => p.partyName && set.add(p.partyName.trim()));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
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
      const list = term
        ? allBrokerNames.filter((b) => b.toLowerCase().includes(term))
        : allBrokerNames;

      return list.map((bname) => {
        const partiesList = brokerToParties.get(norm(bname)) || [];
        const preview = partiesList.slice(0, 3);
        const suffix = partiesList.length > 3 ? "..." : "";
        const partiesLabel = preview.length ? ` - ${preview.join(", ")}${suffix}` : "";
        return { key: `B:${bname}`, broker: bname, party: "", label: `${bname}${partiesLabel}` };
      });
    }

    const list = term
      ? allPartyNames.filter((p) => p.toLowerCase().includes(term))
      : allPartyNames;

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

  const selectOption = (o: BrokerSelectOption) => {
    setSelectedBroker(o.broker);
    setSelectedParty(o.party);
    setComboInput(o.label);
    setComboQuery("");
    setComboOpen(false);
  };

  // ---------- Build statement ----------
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
      const toT = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;

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
        amount: number;
        mode?: string;
      };

      const docs: Doc[] = [];

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
        });
      });

      // OtherDispatch (treated as Dispatch Return for CR as per your rule)
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
        });
      });

      // Payments
      payments.forEach((p) => {
        const bName =
          (p.brokerName || "").trim() ||
          (p.partyName ? getBrokerFromPartyName(p.partyName) : "");

        if (!brokerOk(bName)) return;

        if (targetParty && !partyOk(p.partyName)) return;
        if (targetParty && !p.partyName) return;

        const rawDate = p.paymentDate || p.date || fromDate;

        docs.push({
          source: "Payment",
          id: p.id,
          date: rawDate,
          number: `PAY-${p.id}`,
          partyName: p.partyName || "",
          brokerName: bName,
          amount: toNum(p.amount),
          mode: p.paymentThrough || "",
        });
      });

      // Receipts
      receipts.forEach((r) => {
        const bName =
          (r.brokerName || "").trim() ||
          (r.partyName ? getBrokerFromPartyName(r.partyName) : "");

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
          amount: toNum(r.amount),
          mode: r.paymentThrough || "",
        });
      });

      // Build rows
      const baseRows: BaseTransaction[] = [];

      if (showOpening) {
        let openingBal = 0;
        const openingDocs = docs.filter((d) => toTime(d.date) < fromT);
        for (const d of openingDocs) {
          const { debit, credit } = getDrCr(d.source, d.amount);
          openingBal += debit - credit;
        }

        baseRows.push({
          id: -1,
          date: fromDate,
          partyName: "Opening Balance",
          brokerName: effectiveBroker || "",
          orderNo: "",
          mode: "",
          debit: openingBal > 0 ? openingBal : 0,
          credit: openingBal < 0 ? Math.abs(openingBal) : 0,
          type: "Opening",
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
        const { debit, credit } = getDrCr(d.source, d.amount);
        baseRows.push({
          id: d.id,
          date: d.date,
          partyName: d.partyName,
          brokerName: d.brokerName,
          orderNo: d.number,
          mode: d.mode || "",
          debit,
          credit,
          type: d.source,
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

  // ---------- Running balance ----------
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
      rb = openingTx.debit > 0 ? openingTx.debit : -openingTx.credit;
      result.push({ ...openingTx, srNo: sr++, balance: rb });
    }

    for (const row of data) {
      rb += (row.debit || 0) - (row.credit || 0);
      result.push({ ...row, srNo: sr++, balance: rb });
    }
    return result;
  }, [transactions]);

  // ---------- Days ----------
  const rowsWithDays: DisplayRowWithDays[] = useMemo(() => {
    if (!sortedRowsAll.length) return [];
    const base = new Date(toDate);
    base.setHours(0, 0, 0, 0);
    const baseTime = base.getTime();

    return sortedRowsAll.map((r) => {
      const t = toTime(r.date);
      const d = new Date(t);
      d.setHours(0, 0, 0, 0);
      const diffMs = baseTime - d.getTime();
      const days = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
      return { ...r, days };
    });
  }, [sortedRowsAll, toDate]);

  // ---------- Overdue ----------
  const overdueRowsAll: OverdueAlertRow[] = useMemo(() => {
    const list = rowsWithDays
      .filter((r) => r.type !== "Opening" && r.days >= OVERDUE_DAYS)
      .map((r) => {
        const b =
          (r.brokerName || "").trim() ||
          (r.partyName ? getBrokerFromPartyName(r.partyName) : "") ||
          "-";

        return {
          partyName: r.partyName || "-",
          brokerName: b,
          docNo: r.orderNo || "-",
          txType: typeLabel(r.type),
          date: r.date,
          days: r.days,
          debit: r.debit || 0,
          credit: r.credit || 0,
        };
      });

    list.sort((a, b) => b.days - a.days);
    return list;
  }, [rowsWithDays, getBrokerFromPartyName]);

  // ---------- SweetAlert popup once per report ----------
  useEffect(() => {
    if (!showModal) return;
    if (!overdueRowsAll.length) return;

    const key = `${selectedBroker}|${selectedParty}|${fromDate}|${toDate}|${transactions.length}`;
    if (overdueAlertKeyRef.current === key) return;
    overdueAlertKeyRef.current = key;

    const html = `
      <div style="text-align:left; font-size: 13px;">
        <div style="margin-bottom:8px;"><b>Overdue Entries (≥ ${OVERDUE_DAYS} Days)</b></div>
        <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="6">
          <thead>
            <tr style="background:#fee2e2;">
              <th>Party</th>
              <th>Broker</th>
              <th>Doc No</th>
              <th>Type</th>
              <th>Date</th>
              <th>Days</th>
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
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    Swal.fire({
      icon: "warning",
      title: `${OVERDUE_DAYS} Days Alert`,
      html,
      confirmButtonText: "OK",
    });
  }, [showModal, overdueRowsAll, selectedBroker, selectedParty, fromDate, toDate, transactions.length]);

  // ---------- Filter ----------
  const filteredRows: DisplayRowWithDays[] = useMemo(() => {
    if (transactionFilter === "all") return rowsWithDays;
    return rowsWithDays.filter((r) => r.type === transactionFilter);
  }, [rowsWithDays, transactionFilter]);

  // ---------- Totals ----------
  const totalDebit = useMemo(
    () => transactions.reduce((s, t) => s + (t.debit || 0), 0),
    [transactions],
  );
  const totalCredit = useMemo(
    () => transactions.reduce((s, t) => s + (t.credit || 0), 0),
    [transactions],
  );

  const openingBalance = useMemo(() => {
    const op = transactions.find((t) => t.type === "Opening");
    if (!op) return 0;
    return op.debit > 0 ? op.debit : -op.credit;
  }, [transactions]);

  const closingBalance = useMemo(() => {
    if (!sortedRowsAll.length) return 0;
    return sortedRowsAll[sortedRowsAll.length - 1].balance;
  }, [sortedRowsAll]);

  const totals = useMemo(
    () => ({ rows: filteredRows.length, debit: totalDebit, credit: totalCredit }),
    [filteredRows.length, totalDebit, totalCredit],
  );

  // ✅ PRINT
  const handlePrintReport = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (!filteredRows.length) {
      alert("No transactions to print");
      return;
    }

    const partyLine = selectedParty
      ? ` &nbsp; | &nbsp; <strong>Party:</strong> ${selectedParty}`
      : "";

    const rowsHtml = filteredRows
      .map((r) => {
        const overdue = r.type !== "Opening" && r.days >= OVERDUE_DAYS;
        const cls = overdue
          ? "row-overdue"
          : r.type === "Payment"
            ? "row-payment"
            : r.type === "Receipt"
              ? "row-receipt"
              : "";

        const partyCell = r.partyName || (r.brokerName ? `Broker: ${r.brokerName}` : "");

        return `
          <tr class="${cls}">
            <td>${r.srNo}</td>
            <td>${fmtDateHeader(r.date)}</td>
            <td>${partyCell}</td>
            <td>${r.orderNo || ""}</td>
            <td>${r.mode || ""}</td>
            <td class="text-right">${fmtNumber(r.debit)}</td>
            <td class="text-right">${fmtNumber(r.credit)}</td>
            <td class="text-right">${fmtNumber(r.balance)}</td>
            <td>${typeLabel(r.type)}</td>
            <td class="text-right ${overdue ? "days-overdue" : ""}">${r.days}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Account Statement</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
      h2 { text-align: center; margin-bottom: 8px; }
      .info { margin-bottom: 12px; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #444; padding: 6px; text-align: left; }
      th { background: #eee; }
      .text-right { text-align: right; }
      .totals { margin-top: 12px; font-weight: bold; font-size: 12px; }
      .row-payment { background: #dcfce7; }
      .row-receipt { background: #dbeafe; }
      .row-overdue { background: #fee2e2; }
      .days-overdue { color:#b91c1c; font-weight:700; }
    </style>
  </head>
  <body>
    <h2>Account Statement</h2>
    <div class="info">
      <div><strong>Broker:</strong> ${selectedBroker || "All"} ${partyLine}</div>
      <div><strong>From:</strong> ${fmtDateHeader(fromDate)} &nbsp; <strong>To:</strong> ${fmtDateHeader(toDate)}</div>
      <div style="margin-top:8px;">
        <strong>Rows (Filtered):</strong> ${filteredRows.length}
        &nbsp; | &nbsp;
        <strong>Total Debit (All):</strong> ${fmtNumber(totalDebit)}
        &nbsp; | &nbsp;
        <strong>Total Credit (All):</strong> ${fmtNumber(totalCredit)}
      </div>
      <div style="margin-top:6px; color:#444;">
        Overdue rule: Days ≥ ${OVERDUE_DAYS} highlighted in red.
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>S No</th>
          <th>Date</th>
          <th>Party/Broker</th>
          <th>Doc No</th>
          <th>Mode</th>
          <th class="text-right">Debit</th>
          <th class="text-right">Credit</th>
          <th class="text-right">Balance</th>
          <th>Type</th>
          <th class="text-right">Days</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div>Total Debit (All): ${fmtNumber(totalDebit)}</div>
      <div>Total Credit (All): ${fmtNumber(totalCredit)}</div>
      <div>Opening Balance: ${fmtNumber(openingBalance)}</div>
      <div>Closing Balance: ${fmtNumber(closingBalance)}</div>
    </div>

    <script>
      window.onload = function () {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`;

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
    if (!w) {
      document.body.removeChild(iframe);
      alert("Unable to open print preview.");
      return;
    }

    const d = w.document;
    d.open();
    d.write(html);
    d.close();
  };

  function resetAll() {
    setSelectedBroker("");
    setSelectedParty("");
    setComboInput("");
    setComboQuery("");
    setComboOpen(false);
    setSearchBy("broker");
    setFromDate(getFirstOfMonthIso());
    setToDate(getTodayIso());
    setShowOpening(true);
    setShowModal(false);
    setFullScreen(false);
    setTransactions([]);
    setTransactionFilter("all");
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
          {reportPreparing && !loading && (
            <div className="text-sm text-blue-600 mb-2">Preparing report...</div>
          )}

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
                    }}
                  />
                  Party
                </label>
              </div>

              <div className="relative">
                <input
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
                    {comboOptions.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No match</div>
                    )}
                  </div>
                )}
              </div>

              {(selectedBroker || selectedParty) && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: <b>{selectedBroker || "-"}</b>
                  {selectedParty ? (
                    <>
                      {" "}
                      | Party: <b>{selectedParty}</b>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>

            <div className="col-span-3 flex items-center mt-6">
              <label className="inline-flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showOpening}
                  onChange={(e) => setShowOpening(e.target.checked)}
                  className="mr-2"
                />
                Show Opening Balance
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              onClick={handleShow}
              disabled={loading || reportPreparing}
            >
              Show
            </button>
            <button
              className="px-4 py-2 border rounded hover:bg-gray-100"
              onClick={resetAll}
              disabled={loading || reportPreparing}
            >
              Reset
            </button>

            <div className="ml-auto text-sm text-gray-600">
              Rows (Filtered): <strong>{totals.rows}</strong> | Debit (All):{" "}
              <strong>{fmtNumber(totalDebit)}</strong> | Credit (All):{" "}
              <strong>{fmtNumber(totalCredit)}</strong>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
            <div
              className="absolute inset-0 bg-black opacity-30"
              onClick={() => setShowModal(false)}
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
                    <strong>Broker:</strong> {selectedBroker || "All"}
                    {selectedParty ? (
                      <>
                        {" "}
                        | <strong>Party:</strong> {selectedParty}
                      </>
                    ) : null}
                    {"  "} | <strong>From:</strong> {fmtDateHeader(fromDate)} |{" "}
                    <strong>To:</strong> {fmtDateHeader(toDate)}
                  </div>

                  <div className="text-xs text-gray-600 mt-1">
                    Rows (Filtered): {totals.rows} | Debit (All): {fmtNumber(totalDebit)} | Credit
                    (All): {fmtNumber(totalCredit)}
                  </div>

                  {transactions.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-gray-700">Transaction Type:</span>
                      <select
                        value={transactionFilter}
                        onChange={(e) => setTransactionFilter(e.target.value as any)}
                        className="border rounded px-2 py-1 text-xs"
                      >
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
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 border rounded text-sm hover:bg-gray-100"
                    onClick={() => setFullScreen(!fullScreen)}
                  >
                    {fullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>

                  <button
                    className="px-2 py-1 border rounded text-sm hover:bg-gray-100"
                    onClick={handlePrintReport}
                  >
                    Print
                  </button>

                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div
                className="p-2 overflow-auto"
                style={{ height: fullScreen ? "calc(100vh - 72px)" : "78vh" }}
              >
                {overdueRowsAll.length > 0 && (
                  <div className="mb-2 border border-red-300 bg-red-50 rounded p-2 text-xs">
                    <div className="font-semibold text-red-700">
                      Overdue Entries (≥ {OVERDUE_DAYS} Days): {overdueRowsAll.length}
                    </div>
                  </div>
                )}

                <div className="min-w-max">
                  <table className="w-full table-auto text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 border">S No</th>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">Party/Broker</th>
                        <th className="px-2 py-1 border">Doc No</th>
                        <th className="px-2 py-1 border">Mode</th>
                        <th className="px-2 py-1 border text-right">Debit</th>
                        <th className="px-2 py-1 border text-right">Credit</th>
                        <th className="px-2 py-1 border text-right">Balance</th>
                        <th className="px-2 py-1 border">Type</th>
                        <th className="px-2 py-1 border text-right">Days</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((r) => {
                        const overdue = r.type !== "Opening" && r.days >= OVERDUE_DAYS;

                        const rowClass = overdue
                          ? "bg-red-100"
                          : r.type === "Payment"
                            ? "bg-green-100"
                            : r.type === "Receipt"
                              ? "bg-blue-100"
                              : r.srNo % 2 === 0
                                ? "bg-white"
                                : "bg-gray-50";

                        const partyCell =
                          r.partyName || (r.brokerName ? `Broker: ${r.brokerName}` : "");

                        return (
                          <tr key={`${r.type}-${r.id}-${r.srNo}`} className={rowClass}>
                            <td className="px-2 py-1 border">{r.srNo}</td>
                            <td className="px-2 py-1 border">{fmtDateHeader(r.date)}</td>
                            <td className="px-2 py-1 border">{partyCell}</td>
                            <td className="px-2 py-1 border">{r.orderNo}</td>
                            <td className="px-2 py-1 border">{r.mode || ""}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.debit)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.credit)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.balance)}</td>
                            <td className="px-2 py-1 border">{typeLabel(r.type)}</td>
                            <td
                              className={`px-2 py-1 border text-right ${
                                overdue ? "text-red-700 font-bold" : ""
                              }`}
                            >
                              {r.days}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-2 py-3 border text-center text-gray-500">
                            No transactions found.
                          </td>
                        </tr>
                      )}

                      {/* Summary */}
                      {filteredRows.length > 0 && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <div className="w-full bg-white border-t">
                              <div className="p-3">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                  <div className="col-span-4">
                                    <div className="text-sm font-semibold">
                                      Totals (All Transactions)
                                    </div>
                                    <div className="text-xs text-gray-700 mt-1">
                                      Debit: <strong>{fmtNumber(totalDebit)}</strong>
                                    </div>
                                    <div className="text-xs text-gray-700">
                                      Credit: <strong>{fmtNumber(totalCredit)}</strong>
                                    </div>
                                  </div>

                                  <div className="col-span-5">
                                    <div className="text-sm font-semibold">Balance Summary</div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                      <div className="text-gray-700">Opening Balance:</div>
                                      <div className="text-right text-gray-900">
                                        {fmtNumber(openingBalance)}
                                      </div>
                                      <div className="text-gray-700">Closing Balance:</div>
                                      <div className="text-right text-gray-900">
                                        {fmtNumber(closingBalance)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="col-span-3 text-right">
                                    <div className="text-sm font-semibold">Net Position</div>
                                    <div className="text-lg text-black font-bold bg-yellow-200 inline-block px-3 py-1 rounded mt-2">
                                      {fmtNumber(closingBalance)}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 text-xs text-gray-600">
                                  Red row = {OVERDUE_DAYS}+ days.
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
                      {OVERDUE_DAYS}+ Days
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