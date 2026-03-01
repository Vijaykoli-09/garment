"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback, // ✅ added
} from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

// ================= Types =================
interface Party {
  id: number;
  serialNumber?: string;
  partyName: string;
  gstNo?: string;
  station?: string;
  agent?: { serialNo?: string; agentName?: string };
}

interface Agent {
  serialNo: string;
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
  amount: number;
}

interface ReceiptDoc {
  id: number;
  receiptDate: string;
  date?: string;
  partyName: string;
  brokerName?: string; // from agentName
  amount: number;
}

// Broker + Parties for dropdown
interface BrokerInfo {
  name: string;
  parties: string[];
}

// Base transaction row (without srNo/balance)
type TxType =
  | "Opening"
  | "Dispatch"
  | "OtherDispatch"
  | "PurchaseOrder"
  | "PurchaseEntry"
  | "PurchaseReturn"
  | "Payment"
  | "Receipt";

type BaseTransaction = {
  id: number;
  date: string;
  partyName: string;
  orderNo?: string; // document no (challan / order / etc.)
  narration: string;
  debit: number;
  credit: number;
  type: TxType;
};

// Row with srNo + running balance
type DisplayRow = BaseTransaction & {
  srNo: number;
  balance: number;
};

// Row with Days column (for UI / print)
type DisplayRowWithDays = DisplayRow & {
  days: number;
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
  if (isNaN(d.getTime())) return "Invalid Date";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const fmtNumber = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toNum = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const toTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
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

// ================= Component =================
const AccountStatement: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dispatchChallans, setDispatchChallans] = useState<DispatchChallan[]>(
    []
  );
  const [otherDispatchChallans, setOtherDispatchChallans] = useState<
    OtherDispatchChallan[]
  >([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDoc[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntryDoc[]>(
    []
  );
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnDoc[]>(
    []
  );
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [receipts, setReceipts] = useState<ReceiptDoc[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [reportPreparing, setReportPreparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters (top)
  const [brokerName, setBrokerName] = useState<string>("");
  const [brokerSearch, setBrokerSearch] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(getFirstOfMonthIso());
  const [toDate, setToDate] = useState<string>(getTodayIso());
  const [showOpening, setShowOpening] = useState<boolean>(true);

  // Report state
  type TxFilter = "all" | TxType;
  const [transactions, setTransactions] = useState<BaseTransaction[]>([]);
  const [transactionFilter, setTransactionFilter] =
    useState<TxFilter>("all");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // ---------- Load master data ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const safeGet = async <T = any>(
        url: string,
        options?: { required?: boolean; label?: string }
      ): Promise<T | []> => {
        const required = options?.required ?? false;
        const label = options?.label ?? url;

        try {
          const res = await api.get<T>(url);
          return res.data as T;
        } catch (err: any) {
          const status = err?.response?.status;
          console.warn(
            `Failed to load ${label} (${url})`,
            status,
            err?.response?.data
          );

          if (required) {
            throw err;
          }

          if (!status || status === 403 || status === 404) {
            return [] as any;
          }

          throw err;
        }
      };

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
          recRaw,
        ] = await Promise.all([
          safeGet<Party[]>("/party/all", {
            required: true,
            label: "parties",
          }),
          safeGet<Agent[]>("/agent/list", {
            required: false,
            label: "agents",
          }),
          safeGet<any[]>("/dispatch-challan", {
            required: false,
            label: "dispatch challans",
          }),
          safeGet<any[]>("/other-dispatch-challan", {
            required: false,
            label: "other dispatch challans",
          }),
          safeGet<any[]>("/purchase-orders", {
            required: false,
            label: "purchase orders",
          }),
          safeGet<any[]>("/purchase-entry", {
            required: false,
            label: "purchase entries",
          }),
          safeGet<any[]>("/purchase-returns", {
            required: false,
            label: "purchase returns",
          }),
          safeGet<any[]>("/payment", {
            required: false,
            label: "payments",
          }),
          safeGet<any[]>("/receipt", {
            required: false,
            label: "receipts",
          }),
        ]);

        const partiesArr = Array.isArray(partyRaw) ? partyRaw : [];
        const agentsArr = Array.isArray(agentRaw) ? agentRaw : [];
        setParties(partiesArr);
        setAgents(agentsArr);

        // ---------- Dispatch Challan ----------
        const dcMapped: DispatchChallan[] = (Array.isArray(dcRaw) ? dcRaw : []).map(
          (dc: any) => ({
            id: dc.id,
            challanNo: String(dc.challanNo ?? ""),
            date: dc.date || dc.dated || "",
            dated: dc.dated,
            partyName: dc.partyName || "",
            brokerName: dc.brokerName || "",
            netAmt: dc.netAmt,
          })
        );
        setDispatchChallans(dcMapped);

        // ---------- Other Dispatch ----------
        const odMapped: OtherDispatchChallan[] = (Array.isArray(odcRaw) ? odcRaw : []).map(
          (od: any) => ({
            id: od.id,
            challanNo: String(od.challanNo ?? ""),
            date: od.date || "",
            partyName: od.partyName || "",
            brokerName: od.brokerName || "",
            netAmt: od.netAmt,
          })
        );
        setOtherDispatchChallans(odMapped);

        // ---------- Purchase Orders ----------
        const poMapped: PurchaseOrderDoc[] = (Array.isArray(poRaw) ? poRaw : []).map(
          (po: any) => {
            const items: any[] = Array.isArray(po.items) ? po.items : [];
            const amount = items.reduce(
              (s, it) => s + (parseFloat(it.amount ?? 0) || 0),
              0
            );
            return {
              id: po.id,
              orderNo: String(po.orderNo ?? ""),
              date: po.date || "",
              partyName: po.partyName || po.party?.partyName || "",
              amount,
            };
          }
        );
        setPurchaseOrders(poMapped);

        // ---------- Purchase Entries ----------
        const peMapped: PurchaseEntryDoc[] = (Array.isArray(peRaw) ? peRaw : []).map(
          (e: any) => {
            const items: any[] = Array.isArray(e.items) ? e.items : [];
            const amount = items.reduce(
              (s, it) => s + (parseFloat(it.amount ?? 0) || 0),
              0
            );
            return {
              id: e.id,
              challanNo: String(e.challanNo ?? ""),
              date: e.date || "",
              partyName: e.partyName || e.party?.partyName || "",
              amount,
            };
          }
        );
        setPurchaseEntries(peMapped);

        // ---------- Purchase Returns ----------
        const prMapped: PurchaseReturnDoc[] = (Array.isArray(prRaw) ? prRaw : []).map(
          (r: any) => {
            const items: any[] = Array.isArray(r.items) ? r.items : [];
            const amount = items.reduce(
              (s, it) => s + (parseFloat(it.amount ?? 0) || 0),
              0
            );
            return {
              id: r.id,
              challanNo: String(r.challanNo ?? ""),
              date: r.date || "",
              partyName: r.partyName || r.party?.partyName || "",
              amount,
            };
          }
        );
        setPurchaseReturns(prMapped);

        // ---------- Payments ----------
        const payMapped: PaymentDoc[] = (Array.isArray(payRaw) ? payRaw : [])
          .map((p: any) => ({
            id: p.id,
            paymentDate: p.paymentDate || p.date || "",
            date: p.date || "",
            partyName: p.paymentTo === "Party" ? p.partyName || "" : "",
            amount: parseFloat(p.amount ?? 0) || 0,
          }))
          .filter((p) => p.partyName); // sirf Party wale

        setPayments(payMapped);

        // ---------- Receipts ----------
        const recMapped: ReceiptDoc[] = (Array.isArray(recRaw) ? recRaw : [])
          .map((r: any) => ({
            id: r.id,
            receiptDate: r.receiptDate || r.date || "",
            date: r.date || "",
            partyName: r.receiptTo === "Party" ? r.partyName || "" : "",
            brokerName: r.agentName || "",
            amount: parseFloat(r.amount ?? 0) || 0,
          }))
          .filter((r) => r.partyName); // sirf Party wale

        setReceipts(recMapped);
      } catch (err: any) {
        console.error("Error loading masters:", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---------- Helpers ----------
  const partyByName = useMemo(() => {
    const m = new Map<string, Party>();
    parties.forEach((p) => {
      const key = (p.partyName || "").trim().toLowerCase();
      if (key) m.set(key, p);
    });
    return m;
  }, [parties]);

  // ✅ useCallback so ESLint is satisfied and function is stable
  const getBrokerNameForDoc = useCallback(
    (doc: { brokerName?: string; partyName: string }): string => {
      const direct = (doc.brokerName || "").trim();
      if (direct) return direct;

      const p =
        partyByName.get((doc.partyName || "").trim().toLowerCase()) ||
        undefined;
      if (!p) return "";
      return (p.agent?.agentName || "").trim();
    },
    [partyByName]
  );

  // ---------- Broker list (dropdown with parties + search) ----------
  const brokerInfos: BrokerInfo[] = useMemo(() => {
    const map = new Map<
      string,
      { name: string; parties: Set<string> }
    >();

    const addBrokerParty = (broker: string | undefined, party?: string) => {
      const name = (broker || "").trim();
      if (!name) return;
      const key = name.toLowerCase();

      const partyName = (party || "").trim();

      if (!map.has(key)) {
        map.set(key, { name, parties: new Set<string>() });
      }
      if (partyName) {
        map.get(key)!.parties.add(partyName);
      }
    };

    // 1) From Parties (master)
    parties.forEach((p) => {
      const code = p.agent?.serialNo;
      const masterAgentName = code
        ? agents.find((a) => String(a.serialNo) === String(code))?.agentName ||
          ""
        : "";
      const broker = masterAgentName || p.agent?.agentName || "";
      addBrokerParty(broker, p.partyName);
    });

    // 2) From Dispatch Challans
    dispatchChallans.forEach((dc) => {
      const bName = getBrokerNameForDoc(dc);
      addBrokerParty(bName, dc.partyName);
    });

    // 3) From Other Dispatch Challans
    otherDispatchChallans.forEach((od) => {
      const bName = getBrokerNameForDoc(od);
      addBrokerParty(bName, od.partyName);
    });

    // 4) From Purchase Orders
    purchaseOrders.forEach((po) => {
      const bName = getBrokerNameForDoc({
        brokerName: "",
        partyName: po.partyName,
      });
      addBrokerParty(bName, po.partyName);
    });

    // 5) From Purchase Entries
    purchaseEntries.forEach((pe) => {
      const bName = getBrokerNameForDoc({
        brokerName: "",
        partyName: pe.partyName,
      });
      addBrokerParty(bName, pe.partyName);
    });

    // 6) From Purchase Returns
    purchaseReturns.forEach((pr) => {
      const bName = getBrokerNameForDoc({
        brokerName: "",
        partyName: pr.partyName,
      });
      addBrokerParty(bName, pr.partyName);
    });

    // 7) From Payments (Party only)
    payments.forEach((p) => {
      const bName = getBrokerNameForDoc({
        brokerName: "",
        partyName: p.partyName,
      });
      addBrokerParty(bName, p.partyName);
    });

    // 8) From Receipts (Party + agentName)
    receipts.forEach((r) => {
      const bName = getBrokerNameForDoc({
        brokerName: r.brokerName,
        partyName: r.partyName,
      });
      addBrokerParty(bName, r.partyName);
    });

    const arr: BrokerInfo[] = Array.from(map.values()).map((b) => ({
      name: b.name,
      parties: Array.from(b.parties).sort((a, z) =>
        a.localeCompare(z, undefined, { sensitivity: "base" })
      ),
    }));

    arr.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    return arr;
  }, [
    parties,
    agents,
    dispatchChallans,
    otherDispatchChallans,
    purchaseOrders,
    purchaseEntries,
    purchaseReturns,
    payments,
    receipts,
    getBrokerNameForDoc, // ✅ added; fixes eslint warning
  ]);

  const filteredBrokerInfos = useMemo(() => {
    const term = brokerSearch.trim().toLowerCase();
    if (!term) return brokerInfos;

    return brokerInfos.filter((b) => {
      const brokerMatch = b.name.toLowerCase().includes(term);
      const partyMatch = b.parties.some((p) =>
        p.toLowerCase().includes(term)
      );
      return brokerMatch || partyMatch;
    });
  }, [brokerInfos, brokerSearch]);

  // ---------- Build broker-wise statement (FIFO by date) ----------
  const handleShow = async () => {
    if (!brokerName.trim()) {
      alert("Please select a Broker / Agent");
      return;
    }
    if (
      !dispatchChallans.length &&
      !otherDispatchChallans.length &&
      !purchaseOrders.length &&
      !purchaseEntries.length &&
      !purchaseReturns.length &&
      !payments.length &&
      !receipts.length
    ) {
      alert("No documents found");
      return;
    }

    setReportPreparing(true);
    setError(null);
    setTransactionFilter("all");
    try {
      const fromT = toTime(fromDate);
      const toT = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;
      const targetBroker = brokerName.trim().toLowerCase();

      type DocSource =
        | "Dispatch"
        | "OtherDispatch"
        | "PurchaseOrder"
        | "PurchaseEntry"
        | "PurchaseReturn"
        | "Payment"
        | "Receipt";

      type Doc = {
        source: DocSource;
        id: number;
        date: string;
        number: string;
        partyName: string;
        amount: number;
      };

      const docs: Doc[] = [];

      // Dispatch Challans
      dispatchChallans.forEach((dc) => {
        const bName = getBrokerNameForDoc(dc);
        if (!bName) return;
        if (bName.trim().toLowerCase() !== targetBroker) return;

        const rawDate = dc.date || dc.dated || "";
        docs.push({
          source: "Dispatch",
          id: dc.id,
          date: rawDate || fromDate,
          number: dc.challanNo,
          partyName: dc.partyName || "",
          amount: toNum(dc.netAmt ?? 0),
        });
      });

      // Other Dispatch Challans
      otherDispatchChallans.forEach((od) => {
        const bName = getBrokerNameForDoc(od);
        if (!bName) return;
        if (bName.trim().toLowerCase() !== targetBroker) return;

        const rawDate = od.date || "";
        docs.push({
          source: "OtherDispatch",
          id: od.id,
          date: rawDate || fromDate,
          number: od.challanNo,
          partyName: od.partyName || "",
          amount: toNum(od.netAmt ?? 0),
        });
      });

      // Purchase Orders
      purchaseOrders.forEach((po) => {
        const bName = getBrokerNameForDoc({
          brokerName: "",
          partyName: po.partyName,
        });
        if (!bName) return;
        if (bName.trim().toLowerCase() !== targetBroker) return;

        const rawDate = po.date || "";
        docs.push({
          source: "PurchaseOrder",
          id: po.id,
          date: rawDate || fromDate,
          number: po.orderNo,
          partyName: po.partyName || "",
          amount: po.amount,
        });
      });

      // Purchase Entries
      purchaseEntries.forEach((pe) => {
        const bName = getBrokerNameForDoc({
          brokerName: "",
          partyName: pe.partyName,
        });
        if (!bName) return;
        if (bName.trim().toLowerCase() !== targetBroker) return;

        const rawDate = pe.date || "";
        docs.push({
          source: "PurchaseEntry",
          id: pe.id,
          date: rawDate || fromDate,
          number: pe.challanNo,
          partyName: pe.partyName || "",
          amount: pe.amount,
        });
      });

      // Purchase Returns
      purchaseReturns.forEach((pr) => {
        const bName = getBrokerNameForDoc({
          brokerName: "",
          partyName: pr.partyName,
        });
        if (!bName) return;
        if (bName.trim().toLowerCase() !== targetBroker) return;

        const rawDate = pr.date || "";
        docs.push({
          source: "PurchaseReturn",
          id: pr.id,
          date: rawDate || fromDate,
          number: pr.challanNo,
          partyName: pr.partyName || "",
          amount: pr.amount,
        });
      });

      // Payments (Party) -> Debit
      payments.forEach((p) => {
        const bName = getBrokerNameForDoc({
          brokerName: "",
          partyName: p.partyName,
        });
        if (!bName) return;
        if (bName.trim().toLowerCase() !== targetBroker) return;

        const rawDate = p.paymentDate || p.date || "";
        docs.push({
          source: "Payment",
          id: p.id,
          date: rawDate || fromDate,
          number: "",
          partyName: p.partyName || "",
          amount: p.amount,
        });
      });

      // Receipts (Party + agentName) -> Credit
      receipts.forEach((r) => {
        const bName = getBrokerNameForDoc({
          brokerName: r.brokerName,
          partyName: r.partyName,
        });
        if (!bName) return;
        if (bName.trim().toLowerCase() !== targetBroker) return;

        const rawDate = r.date || r.receiptDate || "";
        docs.push({
          source: "Receipt",
          id: r.id,
          date: rawDate || fromDate,
          number: "",
          partyName: r.partyName || "",
          amount: r.amount,
        });
      });

      if (!docs.length) {
        setTransactions([]);
        setShowModal(true);
        return;
      }

      const baseRows: BaseTransaction[] = [];

      // ----- Opening (docs before fromDate) -----
      let openingAmt = 0;
      if (showOpening) {
        const openingDocs = docs.filter((d) => toTime(d.date) < fromT);
        for (const d of openingDocs) {
          if (d.source === "Payment") {
            openingAmt -= d.amount;
          } else if (d.source === "Receipt") {
            openingAmt += d.amount;
          } else {
            openingAmt += d.amount;
          }
        }

        if (openingAmt !== 0) {
          baseRows.push({
            id: -1,
            date: fromDate,
            partyName: "",
            orderNo: "",
            narration: "Opening Balance",
            debit: openingAmt > 0 ? openingAmt : 0,
            credit: openingAmt < 0 ? Math.abs(openingAmt) : 0,
            type: "Opening",
          });
        }
      }

      // ----- Period Docs (FIFO: by date asc) -----
      const periodDocs = docs
        .filter((d) => {
          const tt = toTime(d.date);
          return tt >= fromT && tt <= toT;
        })
        .sort((a, b) => toTime(a.date) - toTime(b.date));

      for (const d of periodDocs) {
        const pName = (d.partyName || "").trim();

        let narration: string;
        switch (d.source) {
          case "OtherDispatch":
            narration = `By ${
              pName || "Other Dispatch"
            } (Other Dispatch #${d.number})`;
            break;
          case "PurchaseOrder":
            narration = `By ${
              pName || "Purchase Order"
            } (Purchase Order #${d.number})`;
            break;
          case "PurchaseEntry":
            narration = `By ${
              pName || "Purchase Entry"
            } (Purchase Entry #${d.number})`;
            break;
          case "PurchaseReturn":
            narration = `By ${
              pName || "Purchase Return"
            } (Purchase Return #${d.number})`;
            break;
          case "Payment":
            narration = `By ${pName || "Payment"} (Payment)`;
            break;
          case "Receipt":
            narration = `By ${pName || "Receipt"} (Receipt)`;
            break;
          case "Dispatch":
          default:
            narration = `By ${
              pName || "Dispatch"
            } (Dispatch Challan #${d.number})`;
            break;
        }

        let debit = 0;
        let credit = 0;

        if (d.source === "Payment") {
          debit = d.amount;
        } else if (d.source === "Receipt") {
          credit = d.amount;
        } else {
          credit = d.amount;
        }

        baseRows.push({
          id: d.id,
          date: d.date,
          partyName: pName,
          orderNo: d.number,
          narration,
          debit,
          credit,
          type: d.source,
        });
      }

      setTransactions(baseRows);
      setShowModal(true);
    } catch (err: any) {
      console.error("Failed to prepare statement:", err);
      setError(err?.message || "Failed to prepare statement");
    } finally {
      setReportPreparing(false);
    }
  };

  // ---------- Running Balance (FIFO) ----------
  const sortedRowsAll: DisplayRow[] = useMemo(() => {
    if (!transactions.length) return [];

    const openingTx = transactions.find((t) => t.type === "Opening") || null;
    const others = transactions.filter((t) => t.type !== "Opening");

    const data = [...others];
    data.sort((a, b) => {
      const dc = toTime(a.date) - toTime(b.date);
      if (dc !== 0) return dc;
      const pc = (a.partyName || "").localeCompare(
        b.partyName || "",
        undefined,
        {
          sensitivity: "base",
        }
      );
      if (pc !== 0) return pc;
      return (a.orderNo || "").localeCompare(
        b.orderNo || "",
        undefined,
        {
          sensitivity: "base",
        }
      );
    });

    const result: DisplayRow[] = [];
    let sr = 1;
    let rb = 0;

    if (openingTx) {
      const openingBalance =
        openingTx.debit > 0 ? openingTx.debit : -openingTx.credit;
      rb = openingBalance;
      result.push({
        ...openingTx,
        srNo: sr++,
        balance: rb,
      });
    }

    for (const row of data) {
      const debit = row.debit || 0;
      const credit = row.credit || 0;
      rb += credit - debit;
      result.push({
        ...row,
        srNo: sr++,
        balance: rb,
      });
    }

    return result;
  }, [transactions]);

  // ---------- Days column (difference from toDate) ----------
  const rowsWithDays: DisplayRowWithDays[] = useMemo(() => {
    if (!sortedRowsAll.length) return [];

    const base = new Date(toDate);
    base.setHours(0, 0, 0, 0);
    const baseTime = base.getTime();

    return sortedRowsAll.map((r) => {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      const diffMs = baseTime - d.getTime();
      const days = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
      return { ...r, days };
    });
  }, [sortedRowsAll, toDate]);

  // ---------- Transaction type filter (after report generate) ----------
  const filteredRows: DisplayRowWithDays[] = useMemo(() => {
    if (transactionFilter === "all") return rowsWithDays;
    return rowsWithDays.filter((r) => r.type === transactionFilter);
  }, [rowsWithDays, transactionFilter]);

  // ---------- Totals ----------
  const totalDebit = useMemo(
    () => transactions.reduce((s, t) => s + t.debit, 0),
    [transactions]
  );
  const totalCredit = useMemo(
    () => transactions.reduce((s, t) => s + t.credit, 0),
    [transactions]
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
    () => ({
      rows: filteredRows.length,
      debit: totalDebit,
      credit: totalCredit,
    }),
    [filteredRows, totalDebit, totalCredit]
  );

  // ---------- UI helpers ----------
  function resetAll() {
    setBrokerName("");
    setBrokerSearch("");
    setFromDate(getFirstOfMonthIso());
    setToDate(getTodayIso());
    setShowOpening(true);
    setShowModal(false);
    setFullScreen(false);
    setTransactions([]);
    setTransactionFilter("all");
  }

  function handlePrintReport() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    if (!filteredRows.length) {
      alert("No transactions to print");
      return;
    }

    try {
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
      @media print {
        button { display: none; }
      }
    </style>
  </head>
  <body>
    <h2>Account Statement (Broker Wise)</h2>
    <div class="info">
      <div><strong>Broker:</strong> ${brokerName || "All"}</div>
      <div><strong>From:</strong> ${fmtDateHeader(
        fromDate
      )} &nbsp; <strong>To:</strong> ${fmtDateHeader(toDate)}</div>
      <div style="margin-top:8px;">
        <strong>Rows (Filtered):</strong> ${totals.rows}
        &nbsp; | &nbsp;
        <strong>Total Debit (All):</strong> ${fmtNumber(totalDebit)}
        &nbsp; | &nbsp;
        <strong>Total Credit (All):</strong> ${fmtNumber(totalCredit)}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>S No</th>
          <th>Date</th>
          <th>Party</th>
          <th>Doc No</th>
          <th>Narration</th>
          <th class="text-right">Debit</th>
          <th class="text-right">Credit</th>
          <th class="text-right">Balance</th>
          <th>Type</th>
          <th class="text-right">Days</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRows
          .map(
            (r) => `
        <tr>
          <td>${r.srNo}</td>
          <td>${fmtDateHeader(r.date)}</td>
          <td>${r.partyName || ""}</td>
          <td>${r.orderNo || ""}</td>
          <td>${r.narration}</td>
          <td class="text-right">${fmtNumber(r.debit)}</td>
          <td class="text-right">${fmtNumber(r.credit)}</td>
          <td class="text-right">${fmtNumber(r.balance)}</td>
          <td>${typeLabel(r.type)}</td>
          <td class="text-right">${r.days}</td>
        </tr>
        `
          )
          .join("")}
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
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.error('Print error', e);
        }
        setTimeout(function () {
          try {
            if (window.frameElement && window.frameElement.parentNode) {
              window.frameElement.parentNode.removeChild(window.frameElement);
            }
          } catch (e) {}
        }, 500);
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
      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        document.body.removeChild(iframe);
        alert("Unable to open print preview.");
        return;
      }
      const printDoc = printWindow.document;
      printDoc.open();
      printDoc.write(html);
      printDoc.close();
    } catch (err) {
      console.error("Print generation failed:", err);
      alert("Failed to generate print preview. See console for details.");
    }
  }

  // ================= Render =================
  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-3">
            Account Statement (Broker Wise)
          </h2>
          {loading && (
            <div className="text-sm text-gray-600 mb-2">
              Loading master data...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 mb-2">Error: {error}</div>
          )}
          {reportPreparing && !loading && (
            <div className="text-sm text-blue-600 mb-2">
              Preparing report, please wait...
            </div>
          )}

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className="block text-sm mb-1">
                Broker / Agent Name (with Parties)
              </label>
              <input
                type="text"
                value={brokerSearch}
                onChange={(e) => setBrokerSearch(e.target.value)}
                placeholder="Search by broker / party..."
                className="border p-2 rounded w-full mb-1 text-sm"
              />
              <select
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                className="p-2 border rounded w-full text-sm"
              >
                <option value="">-- Select Broker --</option>
                {filteredBrokerInfos.map((b) => {
                  const partiesLabel =
                    b.parties.length === 0
                      ? ""
                      : " - " +
                        (b.parties.length <= 3
                          ? b.parties.join(", ")
                          : `${b.parties.slice(0, 3).join(", ")}...`);
                  return (
                    <option key={b.name} value={b.name}>
                      {b.name}
                      {partiesLabel}
                    </option>
                  );
                })}
              </select>
              {filteredBrokerInfos.length === 0 && (
                <div className="text-xs text-red-500 mt-1">
                  No brokers match this search.
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
                    <strong>Broker:</strong> {brokerName || "All"} &nbsp; | &nbsp;
                    <strong>From:</strong> {fmtDateHeader(fromDate)} &nbsp; |
                    &nbsp;
                    <strong>To:</strong> {fmtDateHeader(toDate)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Rows (Filtered): {totals.rows} | Debit (All):{" "}
                    {fmtNumber(totalDebit)} | Credit (All):{" "}
                    {fmtNumber(totalCredit)}
                  </div>
                  {transactions.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-gray-700">Transaction Type:</span>
                      <select
                        value={transactionFilter}
                        onChange={(e) =>
                          setTransactionFilter(e.target.value as TxFilter)
                        }
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="all">All</option>
                        <option value="Dispatch">Dispatch</option>
                        <option value="OtherDispatch">Other Dispatch</option>
                        <option value="PurchaseOrder">Purchase Order</option>
                        <option value="PurchaseEntry">Purchase Entry</option>
                        <option value="PurchaseReturn">Purchase Return</option>
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
                <div className="min-w-max">
                  <table className="w-full table-auto text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 border">S No</th>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">Party</th>
                        <th className="px-2 py-1 border">Doc No</th>
                        <th className="px-2 py-1 border">Narration</th>
                        <th className="px-2 py-1 border text-right">Debit</th>
                        <th className="px-2 py-1 border text-right">Credit</th>
                        <th className="px-2 py-1 border text-right">Balance</th>
                        <th className="px-2 py-1 border">Type</th>
                        <th className="px-2 py-1 border text-right">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => (
                        <tr
                          key={`${r.type}-${r.id}-${r.srNo}`}
                          className={r.srNo % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-2 py-1 border">{r.srNo}</td>
                          <td className="px-2 py-1 border">
                            {fmtDateHeader(r.date)}
                          </td>
                          <td className="px-2 py-1 border">{r.partyName}</td>
                          <td className="px-2 py-1 border">{r.orderNo}</td>
                          <td className="px-2 py-1 border">{r.narration}</td>
                          <td className="px-2 py-1 border text-right">
                            {fmtNumber(r.debit)}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {fmtNumber(r.credit)}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {fmtNumber(r.balance)}
                          </td>
                          <td className="px-2 py-1 border">
                            {typeLabel(r.type)}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {r.days}
                          </td>
                        </tr>
                      ))}

                      {/* Totals + summary row */}
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
                                    Debit:{" "}
                                    <strong>{fmtNumber(totalDebit)}</strong>
                                  </div>
                                  <div className="text-xs text-gray-700">
                                    Credit:{" "}
                                    <strong>{fmtNumber(totalCredit)}</strong>
                                  </div>
                                </div>
                                <div className="col-span-5">
                                  <div className="text-sm font-semibold">
                                    Balance Summary
                                  </div>
                                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-gray-700">
                                      Opening Balance:
                                    </div>
                                    <div className="text-right text-gray-900">
                                      {fmtNumber(openingBalance)}
                                    </div>
                                    <div className="text-gray-700">
                                      Closing Balance:
                                    </div>
                                    <div className="text-right text-gray-900">
                                      {fmtNumber(closingBalance)}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-span-3 text-right">
                                  <div className="text-sm font-semibold">
                                    Net Position
                                  </div>
                                  <div className="text-lg text-black font-bold bg-yellow-200 inline-block px-3 py-1 rounded mt-2">
                                    {fmtNumber(closingBalance)}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-gray-600">
                                <div>
                                  Note: Running balance is calculated in FIFO
                                  (oldest first). Days = difference between
                                  transaction date and report To date.
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {filteredRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-2 py-3 border text-center text-gray-500"
                          >
                            No transactions found for selected broker / period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default AccountStatement;