import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import { computeLedgerFifo, type BaseLedgerEvent, type TxType as LedgerTxType } from "../../api/ledgerFifo";

type ReceiptToType = "Party" | "Employee" | "Broker" | "Other" | "";

// ---------- Utils ----------
const norm = (s: any) => (s ?? "").toString().trim().toLowerCase();

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

// ✅ sanitize numeric typed text (prevents weird chars)
const sanitizeDecimal = (
  raw: string,
  opts?: { allowNegative?: boolean; decimals?: number }
) => {
  const allowNegative = !!opts?.allowNegative;
  const decimals = typeof opts?.decimals === "number" ? opts.decimals : 2;

  let s = String(raw ?? "");
  s = s.replace(/[^\d.-]/g, "");

  if (!allowNegative) s = s.replace(/-/g, "");
  else s = s.replace(/(?!^)-/g, "");

  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");

  if (s.includes(".")) {
    const [a, b = ""] = s.split(".");
    s = a + "." + b.slice(0, decimals);
  }

  return s;
};

const isPartialNumberText = (s: string) =>
  s === "" || s === "-" || s === "." || s === "-.";

// ================= Amount to Words (Indian system) =================
const numToWordsIndian = (num: number): string => {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (x: number) => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const o = x % 10;
    return `${tens[t]}${o ? " " + ones[o] : ""}`.trim();
  };

  const threeDigits = (x: number) => {
    const h = Math.floor(x / 100);
    const r = x % 100;
    let out = "";
    if (h) out += `${ones[h]} Hundred`;
    if (r) out += `${out ? " " : ""}${twoDigits(r)}`;
    return out.trim();
  };

  let x = n;
  const parts: string[] = [];

  const crore = Math.floor(x / 10000000);
  x = x % 10000000;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);

  const lakh = Math.floor(x / 100000);
  x = x % 100000;
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);

  const thousand = Math.floor(x / 1000);
  x = x % 1000;
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);

  if (x) parts.push(threeDigits(x));

  return parts.join(" ").replace(/\s+/g, " ").trim();
};

const amountToWordsINR = (val: number) => {
  const amt = Number(val);
  if (!Number.isFinite(amt)) return "";
  const sign = amt < 0 ? "Minus " : "";
  const abs = Math.abs(amt);

  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  const rupeeWords = `${numToWordsIndian(rupees)} Rupees`;
  const paiseWords = paise ? ` and ${numToWordsIndian(paise)} Paise` : "";

  return `${sign}${rupeeWords}${paiseWords} Only`;
};

// Ledger DR/CR rules (unchanged)
type TxType =
  | "Dispatch"
  | "OtherDispatch"
  | "PurchaseOrder"
  | "PurchaseEntry"
  | "PurchaseReturn"
  | "JobOutward"
  | "JobInward"
  | "Payment"
  | "Receipt";

const txLabel = (t: TxType | "Opening") => {
  switch (t) {
    case "Opening":
      return "Opening";
    case "OtherDispatch":
      return "Other Dispatch";
    case "PurchaseOrder":
      return "Purchase Order";
    case "PurchaseEntry":
      return "Purchase Entry";
    case "PurchaseReturn":
      return "Purchase Return";
    case "JobOutward":
      return "Job Outward";
    case "JobInward":
      return "Job Inward";
    case "Payment":
      return "Payment";
    case "Receipt":
      return "Receipt";
    case "Dispatch":
    default:
      return "Dispatch";
  }
};

const ledgerDrCr = (source: TxType, amount: number) => {
  const amt = toNum(amount);

  if (source === "Payment") return { debit: amt, credit: 0 };
  if (source === "Receipt") return { debit: 0, credit: amt };

  if (source === "PurchaseOrder") return { debit: 0, credit: amt };
  if (source === "PurchaseEntry") return { debit: 0, credit: amt };
  if (source === "OtherDispatch") return { debit: 0, credit: amt };

  if (source === "PurchaseReturn") return { debit: amt, credit: 0 };
  if (source === "JobInward") return { debit: 0, credit: amt };
  if (source === "JobOutward") return { debit: 0, credit: 0 };

  return { debit: amt, credit: 0 };
};

// ---------- Types ----------
interface PaymentMode {
  id: number;
  bankNameOrUpiId: string;
  accountNo: string;
}

interface Employee {
  id: number;
  code: string;
  employeeName: string;
  process?: { serialNo: string | number; processName: string };
  [key: string]: any;
}

type BalanceType = "CR" | "DR";

interface Party {
  id: number;
  serialNumber: string;
  partyName: string;
  agent?: { serialNo: string | number; agentName: string };
  process?: { processName?: string };
  openingBalance?: number | null;
  openingBalanceType?: BalanceType;
  [key: string]: any;
}

interface ReceiptRecord {
  id: number;
  entryType: string;
  receiptTo: ReceiptToType;
  receiptDate: string;
  date?: string;
  processName: string;
  partyName?: string;
  employeeName?: string;
  paymentThrough: string;
  amount: number | null; // CASH
  discountAmount?: number | null; // DISCOUNT
  balance: number | null;
  remarks: string;
  agentName?: string;
}

interface DispatchChallan {
  id: number;
  challanNo: string;
  date?: string;
  dated?: string;
  partyName: string;
  brokerName?: string;
  agentName?: string;
  netAmt?: number | string;
}

interface OtherDispatchChallan {
  id: number;
  challanNo: string;
  date?: string;
  partyName: string;
  brokerName?: string;
  agentName?: string;
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

interface JobInwardChallanDoc {
  id: string | number;
  challanNo: string;
  date: string;
  partyName: string;
  amount: number;
}

interface PaymentDoc {
  id: number;
  paymentTo?: string;
  partyName?: string;
  brokerName?: string;
  agentName?: string;
  paymentDate?: string;
  date?: string;
  amount?: number | string;
}

type FormData = {
  entryType: string;
  receiptTo: ReceiptToType;
  receiptDate: string;
  processName: string;
  name: string;
  paymentThrough: string;
  amount: number | ""; // CASH
  discountAmount: number; // DISCOUNT
  balance: number | "";
  remarks: string;
  agentName: string;
  date: string;
};

type AgentModalTarget = "agentName" | "brokerName";

type PendingEntryRow = {
  rowKey: string;
  docKey: string; // ✅ FIFO docKey (used for manualPaid + FIFO identity)
  txType: TxType | "Opening";
  docId: number;
  docNo: string;
  date: string;
  chargeAmount: number;
  pendingAmount: number;
};

type LedgerBillStatusDTO = {
  docKey: string;
  manualPaidUser: boolean;
  updatedAt?: string;
};

const routesReceipt = {
  create: "/recipt/create",
  list: "/recipt",
  get: (id: number) => `/recipt/${id}`,
  update: (id: number) => `/recipt/${id}`,
  delete: (id: number) => `/recipt/${id}`,

  employees: "/employees",
  processes: "/process/list",
  paymentModes: "/payment/payment-mode",
  agents: "/agent/list",
  partyPaymentList: "/payment/list",
  parties: "/party/all",

  dispatchChallans: "/dispatch-challan",
  otherDispatchChallans: "/other-dispatch-challan",
  purchaseOrders: "/purchase-orders",
  purchaseEntries: "/purchase-entry",
  purchaseReturns: "/purchase-returns",
  payments: "/payment",
  paymentsFallback: "/payment/list",
  jobInward: "/job-inward-challan",

  ledgerStatusBulkGet: "/ledger-status/bulk-get",
};

const PaymentReceiptForm: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<FormData>({
    entryType: "",
    receiptTo: "" as ReceiptToType,
    receiptDate: today,
    processName: "",
    name: "",
    paymentThrough: "Cash",
    amount: "",
    discountAmount: 0,
    balance: "",
    remarks: "",
    agentName: "",
    date: today,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [amountText, setAmountText] = useState("");
  const [balanceText, setBalanceText] = useState("");
  const amountInWords = useMemo(() => {
  if (formData.amount === "") return "";
  return amountToWordsINR(Number(formData.amount));
}, [formData.amount]);

  const amountRef = useRef<HTMLInputElement | null>(null);
  const processSearchRef = useRef<HTMLInputElement>(null);
const partySearchRef = useRef<HTMLInputElement>(null);
const employeeSearchRef = useRef<HTMLInputElement>(null);
const agentSearchRef = useRef<HTMLInputElement>(null);
  const focusAmount = useCallback(() => setTimeout(() => amountRef.current?.focus(), 0), []);

  // lists & modals
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  const [partyList, setPartyList] = useState<Party[]>([]);
  const [partySearchText, setPartySearchText] = useState("");
  const [showPartyModal, setShowPartyModal] = useState(false);

  const [processList, setProcessList] = useState<any[]>([]);
  const [processSearchText, setProcessSearchText] = useState("");
  const [showProcessModal, setShowProcessModal] = useState(false);

  const [agentList, setAgentList] = useState<any[]>([]);
  const [agentSearchText, setAgentSearchText] = useState("");
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentModalTarget, setAgentModalTarget] = useState<AgentModalTarget>("agentName");

  const [showList, setShowList] = useState(false);
  const [receiptList, setReceiptList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

  const [savedRecords, setSavedRecords] = useState<ReceiptRecord[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);

  // show (party)
  const [showData, setShowData] = useState<any[]>([]);
  const [showLoading, setShowLoading] = useState(false);

  // Production Receipt popup (for EMPLOYEE)
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [, setProductionReceipts] = useState<any[]>([]);
  const [productionRows, setProductionRows] = useState<any[]>([]);

  // Base balance (Party/Broker) from ACCOUNT LEDGER
  const [baseBalance, setBaseBalance] = useState<number | null>(null);
  const [baseBalanceFor, setBaseBalanceFor] = useState<
    "Party" | "Broker" | null
  >(null);

  // Account sources (ledger)
  const [accDispatch, setAccDispatch] = useState<DispatchChallan[]>([]);
  const [accOtherDispatch, setAccOtherDispatch] = useState<OtherDispatchChallan[]>([]);
  const [accPurchaseOrders, setAccPurchaseOrders] = useState<PurchaseOrderDoc[]>([]);
  const [accPurchaseEntries, setAccPurchaseEntries] = useState<PurchaseEntryDoc[]>([]);
  const [accPurchaseReturns, setAccPurchaseReturns] = useState<PurchaseReturnDoc[]>([]);
  const [accJobInwards, setAccJobInwards] = useState<JobInwardChallanDoc[]>([]);
  const [accPayments, setAccPayments] = useState<PaymentDoc[]>([]);

  // Pending modal
 
  const [pendingSide, setPendingSide] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [showPendingModal, setShowPendingModal] = useState(false);

  // modal working copy
  const [modalRows, setModalRows] = useState<PendingEntryRow[]>([]);
  const [receiveByKey, setReceiveByKey] = useState<Record<string, string>>({});
  const [discountByKey, setDiscountByKey] = useState<Record<string, string>>({});

  // ✅ applied totals when user uses Next (so Done never loses allocations)
  const [appliedCashTotal, setAppliedCashTotal] = useState(0);
  const [appliedDiscountTotal, setAppliedDiscountTotal] = useState(0);

  const receiveInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const nextFocusKeyRef = useRef<string>("");

  const asOfIso = useMemo(() => formData.date || formData.receiptDate || today, [formData.date, formData.receiptDate, today]);

  const emitLedgerChanged = useCallback(() => {
    try {
      window.dispatchEvent(new Event("ledger:changed"));
    } catch {}
  }, []);

  // ✅ used to force manualPaid status refresh even if docKeys unchanged


  // ---------- Loaders ----------
  const safeGetArray = useCallback(async (url: string) => {
    try {
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [dcRaw, odRaw, poRaw, peRaw, prRaw, jobInRaw, payRaw1] =
        await Promise.all([
          safeGetArray(routesReceipt.dispatchChallans),
          safeGetArray(routesReceipt.otherDispatchChallans),
          safeGetArray(routesReceipt.purchaseOrders),
          safeGetArray(routesReceipt.purchaseEntries),
          safeGetArray(routesReceipt.purchaseReturns),
          safeGetArray(routesReceipt.jobInward),
          safeGetArray(routesReceipt.payments),
        ]);

      const payRaw =
        Array.isArray(payRaw1) && payRaw1.length > 0
          ? payRaw1
          : await safeGetArray(routesReceipt.paymentsFallback);

      setAccDispatch(
        (dcRaw || []).map((dc: any) => ({
          id: dc.id,
          challanNo: String(dc.challanNo ?? ""),
          date: dc.date || dc.dated || "",
          dated: dc.dated,
          partyName: String(dc.partyName ?? "").trim(),
          brokerName: String(dc.brokerName ?? "").trim(),
          agentName: String(dc.agentName ?? "").trim(),
          netAmt: dc.netAmt,
        })),
      );

      setAccOtherDispatch(
        (odRaw || []).map((od: any) => ({
          id: od.id,
          challanNo: String(od.challanNo ?? ""),
          date: od.date || "",
          partyName: String(od.partyName ?? "").trim(),
          brokerName: String(od.brokerName ?? "").trim(),
          agentName: String(od.agentName ?? "").trim(),
          netAmt: od.netAmt,
        })),
      );

      setAccPurchaseOrders(
        (poRaw || []).map((po: any) => {
          const items: any[] = Array.isArray(po.items) ? po.items : [];
          const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
          return {
            id: po.id,
            orderNo: String(po.orderNo ?? ""),
            date: po.date || "",
            partyName: String(po.partyName ?? po.party?.partyName ?? "").trim(),
            amount,
          };
        }),
      );

      setAccPurchaseEntries(
        (peRaw || []).map((e: any) => {
          const items: any[] = Array.isArray(e.items) ? e.items : [];
          const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
          return {
            id: e.id,
            challanNo: String(e.challanNo ?? ""),
            date: e.date || "",
            partyName: String(e.partyName ?? e.party?.partyName ?? "").trim(),
            amount,
          };
        }),
      );

      setAccPurchaseReturns(
        (prRaw || []).map((r: any) => {
          const items: any[] = Array.isArray(r.items) ? r.items : [];
          const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
          return {
            id: r.id,
            challanNo: String(r.challanNo ?? ""),
            date: r.date || "",
            partyName: String(r.partyName ?? r.party?.partyName ?? "").trim(),
            amount,
          };
        }),
      );

      setAccJobInwards(
        (jobInRaw || [])
          .map((d: any) => {
            const rows: any[] = Array.isArray(d.rows) ? d.rows : [];
            const amount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
            return {
              id: d.id ?? "",
              challanNo: String(d.challanNo ?? ""),
              date: String(d.date ?? ""),
              partyName: String(d.partyName ?? "").trim(),
              amount,
            } as JobInwardChallanDoc;
          })
          .filter((x: any) => x.partyName && x.date && x.challanNo),
      );

      setAccPayments(
        (payRaw || []).map((p: any) => ({
          id: p.id,
          paymentTo: String(p.paymentTo ?? p.payment_to ?? "").trim(),
          partyName: String(p.partyName ?? "").trim(),
          brokerName: String(p.brokerName ?? "").trim(),
          agentName: String(p.agentName ?? "").trim(),
          paymentDate: p.paymentDate || p.date || "",
          date: p.date || "",
          amount: p.amount,
        })),
      );
    } catch (e) {
      console.error(e);
    }
  }, [safeGetArray]);

  useEffect(() => {
    loadProcesses();
    loadEmployees();
    loadAgents();
    loadSavedRecords();
    loadPaymentModes();
    loadParties();
    loadAccountSources();
  }, [
    loadProcesses,
    loadEmployees,
    loadAgents,
    loadSavedRecords,
    loadPaymentModes,
    loadParties,
    loadAccountSources,
  ]);

  // Party->Broker mapping
  const partyByName = useMemo(() => {
    const m = new Map<string, Party>();
    partyList.forEach((p) => {
      const k = norm(p.partyName);
      if (k) m.set(k, p);
    });
    return m;
  }, [partyList]);

  const getPartyOpeningSigned = useCallback(
    (partyName: string) => {
      const p = partyByName.get(norm(partyName));
      return String(p?.agent?.agentName ?? "").trim();
    },
    [partyByName]
  );

  const getBrokerNameForDispatch = useCallback(
    (doc: { brokerName?: string; agentName?: string; partyName: string }) => {
      const direct =
        String(doc.brokerName ?? "").trim() ||
        String(doc.agentName ?? "").trim();
      if (direct) return direct;
      return getBrokerFromPartyName(doc.partyName);
    },
    [partyByName],
  );

  const getDrCr = (val: number | "" | null | undefined) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = Number(val);
    if (!Number.isFinite(n) || n === 0) return "";
    return n > 0 ? "Dr" : "Cr";
  };

  const absVal = (val: number | "" | null | undefined) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = Number(val);
    if (!Number.isFinite(n)) return "";
    return Math.abs(n);
  };

  const balanceDrCr = useMemo(() => getDrCr(formData.balance), [formData.balance]);

  // =========================
  // ✅ SINGLE FIFO SOURCE (Common Engine)
  // Receipt pending must be generated from the same FIFO engine as AccountStatement.
  // =========================

  const selectedPartyName = useMemo(
    () => (formData.receiptTo === "Party" ? String(formData.name || "").trim() : ""),
    [formData.receiptTo, formData.name],
  );
  const selectedPartyKey = useMemo(() => norm(selectedPartyName), [selectedPartyName]);

  const ledgerEventsForParty: BaseLedgerEvent[] = useMemo(() => {
    if (!selectedPartyName) return [];
    const asOfT = endOfDayTime(asOfIso);
    if (asOfT === -Infinity) return [];

    const party = partyByName.get(selectedPartyKey);
    const partyId = party?.id ?? selectedPartyKey;

    const events: BaseLedgerEvent[] = [];

    const addEvent = (e: BaseLedgerEvent) => {
      if (!e.docKey) return;
      if (!e.date) return;
      if (toTime(e.date) === -Infinity) return;
      if (toTime(e.date) > asOfT) return;
      events.push(e);
    };

    // Opening (as a normal ledger event)
    {
      const signed = getPartyOpeningSigned(selectedPartyName);
      const opDebit = signed > 0 ? signed : 0;
      const opCredit = signed < 0 ? Math.abs(signed) : 0;

      if (opDebit > 0 || opCredit > 0) {
        // opening date = 1 day before earliest doc date (avoid huge aging)
        const times: number[] = [];

        const pushTime = (d: any) => {
          const t = toTime(d);
          if (t !== -Infinity && t <= asOfT) times.push(t);
        };

        accDispatch.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || x.dated || ""));
        accOtherDispatch.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        accPurchaseOrders.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        accPurchaseEntries.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        accPurchaseReturns.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        accJobInwards.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        accPayments.forEach((x) => norm(x.partyName || "") === selectedPartyKey && pushTime(x.paymentDate || x.date || ""));
        savedRecords.forEach(
          (x) => x.receiptTo === "Party" && norm(x.partyName || "") === selectedPartyKey && pushTime(x.receiptDate || x.date || ""),
        );

        const earliest = times.length ? Math.min(...times) : toTime(asOfIso);
        const openingDateIso =
          earliest !== -Infinity ? new Date(earliest - 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : asOfIso;

        addEvent({
          id: -999999,
          date: openingDateIso,
          partyName: selectedPartyName,
          brokerName: "",
          orderNo: "OPENING",
          mode: "",
          debit: opDebit,
          credit: opCredit,
          type: "Opening" as LedgerTxType,
          docKey: `Opening:Party:${partyId}`,
        });
      }
    }

    // Dispatch
    accDispatch.forEach((dc) => {
      if (norm(dc.partyName) !== selectedPartyKey) return;
      const d = String(dc.date || dc.dated || "").slice(0, 10);
      const { debit, credit } = ledgerDrCr("Dispatch", toNum(dc.netAmt));
      addEvent({
        id: dc.id,
        date: d,
        partyName: dc.partyName || "",
        brokerName: String(dc.brokerName || dc.agentName || "").trim(),
        orderNo: String(dc.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "Dispatch" as LedgerTxType,
        docKey: `Dispatch:${dc.id}`,
      });
    });

    // OtherDispatch
    accOtherDispatch.forEach((od) => {
      if (norm(od.partyName) !== selectedPartyKey) return;
      const d = String(od.date || "").slice(0, 10);
      const { debit, credit } = ledgerDrCr("OtherDispatch", toNum(od.netAmt));
      addEvent({
        id: od.id,
        date: d,
        partyName: od.partyName || "",
        brokerName: String(od.brokerName || od.agentName || "").trim(),
        orderNo: String(od.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "OtherDispatch" as LedgerTxType,
        docKey: `OtherDispatch:${od.id}`,
      });
    });

    // PurchaseOrder
    accPurchaseOrders.forEach((po) => {
      if (norm(po.partyName) !== selectedPartyKey) return;
      const d = String(po.date || "").slice(0, 10);
      const { debit, credit } = ledgerDrCr("PurchaseOrder", toNum(po.amount));
      addEvent({
        id: po.id,
        date: d,
        partyName: po.partyName || "",
        brokerName: "",
        orderNo: String(po.orderNo || ""),
        mode: "",
        debit,
        credit,
        type: "PurchaseOrder" as LedgerTxType,
        docKey: `PurchaseOrder:${po.id}`,
      });
    });

    // PurchaseEntry
    accPurchaseEntries.forEach((pe) => {
      if (norm(pe.partyName) !== selectedPartyKey) return;
      const d = String(pe.date || "").slice(0, 10);
      const { debit, credit } = ledgerDrCr("PurchaseEntry", toNum(pe.amount));
      addEvent({
        id: pe.id,
        date: d,
        partyName: pe.partyName || "",
        brokerName: "",
        orderNo: String(pe.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "PurchaseEntry" as LedgerTxType,
        docKey: `PurchaseEntry:${pe.id}`,
      });
    });

    // PurchaseReturn
    accPurchaseReturns.forEach((pr) => {
      if (norm(pr.partyName) !== selectedPartyKey) return;
      const d = String(pr.date || "").slice(0, 10);
      const { debit, credit } = ledgerDrCr("PurchaseReturn", toNum(pr.amount));
      addEvent({
        id: pr.id,
        date: d,
        partyName: pr.partyName || "",
        brokerName: "",
        orderNo: String(pr.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "PurchaseReturn" as LedgerTxType,
        docKey: `PurchaseReturn:${pr.id}`,
      });
    });

    // JobInward
    accJobInwards.forEach((ji) => {
      if (norm(ji.partyName) !== selectedPartyKey) return;
      const d = String(ji.date || "").slice(0, 10);
      const { debit, credit } = ledgerDrCr("JobInward", toNum(ji.amount));
      addEvent({
        id: typeof ji.id === "number" ? ji.id : hashToInt(String(ji.id)),
        date: d,
        partyName: ji.partyName || "",
        brokerName: "",
        orderNo: String(ji.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "JobInward" as LedgerTxType,
        docKey: `JobInward:${String(ji.id)}`,
      });
    });

    // Party Payments (debit)
    accPayments.forEach((p) => {
      const paymentTo = String(p.paymentTo ?? "").trim();
      const isPartyPayment = paymentTo ? paymentTo === "Party" : true;
      if (!isPartyPayment) return;

        if (norm(p.partyName ?? "") !== norm(partyName)) return;
        const d = p.paymentDate || p.date || "";
        if (toTime(d) <= asOfT) add("Payment", toNum(p.amount));
      });

      // Party receipts => CR (from receipt module list)
      savedRecords.forEach((r) => {
        if (r.receiptTo !== "Party") return;
        if (norm(r.partyName ?? "") !== norm(partyName)) return;
        const d = r.receiptDate || r.date || "";
        if (toTime(d) <= asOfT) add("Receipt", toNum(r.amount ?? 0));
      });

      setBaseBalance(bal);
      setBaseBalanceFor("Party");

      setFormData((prev) => {
        if (prev.receiptTo !== "Party" || norm(prev.name) !== norm(partyName))
          return prev;
        const amt = prev.amount === "" ? 0 : Number(prev.amount || 0);
        const nextBal = prev.amount === "" ? bal : bal - amt;
        return { ...prev, balance: nextBal };
      });
    },
    [
      accDispatch,
      accOtherDispatch,
      accPurchaseOrders,
      accPurchaseEntries,
      accPurchaseReturns,
      accJobInwards,
      accPayments,
      savedRecords,
      clearBaseBalance,
      today,
    ]
  );

  // ✅ Broker base balance from LEDGER (as on receiptDate)
  const computeBrokerBaseBalanceFromAccount = useCallback(
    (brokerName: string, asOfDateIso: string) => {
      if (!brokerName) {
        clearBaseBalance();
        setFormData((prev) => ({ ...prev, balance: "" }));
        return;
      }

      const asOfT = endOfDayTime(asOfDateIso || today);
      if (asOfT === -Infinity) {
        clearBaseBalance();
        setFormData((prev) => ({ ...prev, balance: "" }));
        return;
      }

      const brokerKey = norm(brokerName);
      let bal = 0;

      const add = (source: TxType, amount: number) => {
        const { debit, credit } = ledgerDrCr(source, amount);
        bal += debit - credit;
      };

      const partyBelongsToBroker = (partyName: string) =>
        brokerKey && norm(getBrokerFromPartyName(partyName)) === brokerKey;

      accDispatch.forEach((dc) => {
        const b = getBrokerNameForDispatch(dc);
        if (norm(b) !== brokerKey) return;
        const d = dc.date || dc.dated || "";
        if (toTime(d) <= asOfT) add("Dispatch", toNum(dc.netAmt));
      });

      accOtherDispatch.forEach((od) => {
        const b = getBrokerNameForDispatch(od);
        if (norm(b) !== brokerKey) return;
        const d = od.date || "";
        if (toTime(d) <= asOfT) add("OtherDispatch", toNum(od.netAmt));
      });

      accPurchaseOrders.forEach((po) => {
        if (!partyBelongsToBroker(po.partyName)) return;
        if (toTime(po.date) <= asOfT) add("PurchaseOrder", toNum(po.amount));
      });

      accPurchaseEntries.forEach((pe) => {
        if (!partyBelongsToBroker(pe.partyName)) return;
        if (toTime(pe.date) <= asOfT) add("PurchaseEntry", toNum(pe.amount));
      });

      accPurchaseReturns.forEach((pr) => {
        if (!partyBelongsToBroker(pr.partyName)) return;
        if (toTime(pr.date) <= asOfT) add("PurchaseReturn", toNum(pr.amount));
      });

      accJobInwards.forEach((ji) => {
        if (!partyBelongsToBroker(ji.partyName)) return;
        if (toTime(ji.date) <= asOfT) add("JobInward", toNum(ji.amount));
      });

      // Payments: Broker-only + Party payments under broker
      accPayments.forEach((p) => {
        const paymentTo = String(p.paymentTo ?? "").trim();
        const d = p.paymentDate || p.date || "";
        if (toTime(d) > asOfT) return;

        if (paymentTo === "Broker") {
          const b = String(p.brokerName ?? p.agentName ?? "").trim();
          if (norm(b) === brokerKey) add("Payment", toNum(p.amount));
          return;
        }

    // CREDIT-side note (Receipt cannot settle credit-side pending; Payment does)
    if (pendingSideMemo === "CREDIT") {
      Swal.fire(
        "Info",
        "Pending Side is CREDIT. Receipt cannot settle these pending entries. Use Payment to settle CREDIT-side pending.",
        "info",
      );
    }

    setModalRows(pendingBillsFifo.map((x) => ({ ...x })));
    setReceiveByKey({});
    setDiscountByKey({});
    setAppliedCashTotal(0);
    setAppliedDiscountTotal(0);
    setShowPendingModal(true);
  }, [pendingBillsFifo, pendingSideMemo]);

  const applyAmountText = useCallback((raw: string) => {
    const clean = sanitizeDecimal(raw, { allowNegative: false, decimals: 2 });
    setAmountText(clean);
    const num: number | "" = isPartialNumberText(clean) ? "" : Number(clean);
    setFormData((prev) => ({ ...prev, amount: num }));
  }, []);

  const applyNextForRow = useCallback(
    (row: PendingEntryRow) => {
      if (pendingSideMemo === "CREDIT") {
        Swal.fire("Info", "CREDIT-side pending cannot be settled by Receipt. Use Payment.", "info");
        return;
      }

        if (r.receiptTo === "Party") {
          if (partyBelongsToBroker(String(r.partyName ?? "").trim())) {
            add("Receipt", toNum(r.amount ?? 0));
          }
        }
      });

      setBaseBalance(bal);
      setBaseBalanceFor("Broker");

      setFormData((prev) => {
        if (prev.receiptTo !== "Broker" || norm(prev.name) !== brokerKey)
          return prev;
        const amt = prev.amount === "" ? 0 : Number(prev.amount || 0);
        const nextBal = prev.amount === "" ? bal : bal - amt;
        return { ...prev, balance: nextBal };
      });
    },
    [
      accDispatch,
      accOtherDispatch,
      accPurchaseOrders,
      accPurchaseEntries,
      accPurchaseReturns,
      accJobInwards,
      accPayments,
      savedRecords,
      getBrokerFromPartyName,
      getBrokerNameForDispatch,
      clearBaseBalance,
      today,
    ]
  );

  // Auto-recompute base balance when receiptDate/name changes (only new entry)
  useEffect(() => {
    if (editingId) return;

    if (formData.receiptTo === "Party" && formData.name) {
      computePartyBaseBalanceFromAccount(formData.name, formData.receiptDate || today);
    } else if (formData.receiptTo === "Broker" && formData.name) {
      computeBrokerBaseBalanceFromAccount(formData.name, formData.receiptDate || today);
    }
  }, [
    editingId,
    formData.receiptTo,
    formData.name,
    formData.receiptDate,
    computePartyBaseBalanceFromAccount,
    computeBrokerBaseBalanceFromAccount,
    today,
  ]);

  // ✅ amount words
  const amountInWords = useMemo(
    () => amountToWordsINR(formData.amount),
    [formData.amount]
  );

  // ---------------- Handlers ----------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "receiptTo") {
      const newType = value as ReceiptToType;

      setFormData((prev) => ({
        ...prev,
        receiptTo: newType,
        processName: newType === "Broker" ? "" : prev.processName,
        name: "",
        agentName: "",
        balance: "",
        amount: "",
        discountAmount: 0,
      }));

      setAmountText("");
      setBalanceText("");
      setShowData([]);

      
      setModalRows([]);
      setReceiveByKey({});
      setDiscountByKey({});
      setAppliedCashTotal(0);
      setAppliedDiscountTotal(0);
      setShowPendingModal(false);
      return;
    }

    if (name === "receiptDate") {
      setFormData((prev) => {
        const fromDate = value;
        let toDate = prev.date;
        if (!toDate || toDate < fromDate) toDate = fromDate;
        return { ...prev, receiptDate: fromDate, date: toDate };
      });
      setShowData([]);
      return;
    }

    if (name === "date") {
      setFormData((prev) => {
        const fromDate = prev.receiptDate;
        let toDate = value;
        if (fromDate && toDate < fromDate) toDate = fromDate;
        return { ...prev, date: toDate };
      });
      setShowData([]);
      return;
    }

    if (name === "amount") {
      const clean = sanitizeDecimal(value, { allowNegative: false, decimals: 2 });
      setAmountText(clean);
      const num: number | "" = isPartialNumberText(clean) ? "" : Number(clean);

      setFormData((prev) => {
        const isAutoBalance =
          (prev.receiptTo === "Party" || prev.receiptTo === "Broker") &&
          baseBalance !== null;

        const nextBal = isAutoBalance
          ? baseBalance! - (num === "" ? 0 : Number(num))
          : prev.balance;

        return {
          ...prev,
          amount: num,
          balance: nextBal,
        };
      });
      return;
    }

    if (name === "balance") {
      if (formData.receiptTo === "Party" || formData.receiptTo === "Broker")
        return;

      const clean = sanitizeDecimal(value, {
        allowNegative: true,
        decimals: 2,
      });
      setBalanceText(clean);
      const num: number | "" = isPartialNumberText(clean) ? "" : Number(clean);
      setFormData((prev) => ({ ...prev, balance: num }));
      return;
    }

    if (name === "name") {
      setShowData([]);
      setFormData((prev) => ({ ...prev, name: value }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isProcessSelectable = formData.receiptTo !== "Broker";
  const isAgentSelectable = formData.receiptTo !== "Party" && formData.receiptTo !== "Broker";

  const openProcessModal = () => {
    if (!isProcessSelectable) return;
    setShowProcessModal(true);
    setProcessSearchText("");
  };

  const openNameModal = async () => {
    if (!formData.receiptTo) {
      Swal.fire("Info", "Please select Receipt To first", "info");
      return;
    }

    if (formData.receiptTo === "Other") return;

    if (formData.receiptTo === "Employee") {
      setEmployeeSearchText("");
      setShowEmployeeModal(true);
      return;
    }

    if (formData.receiptTo === "Party") {
      setPartySearchText("");
      setShowPartyModal(true);
      return;
    }

    if (formData.receiptTo === "Broker") {
      setAgentModalTarget("brokerName");
      setAgentSearchText("");
      setShowAgentModal(true);
      return;
    }
  };

  const openAgentModal = () => {
    if (!isAgentSelectable) return;
    setAgentModalTarget("agentName");
    setAgentSearchText("");
    setShowAgentModal(true);
  };

  const selectProcess = (p: any) => {
    setFormData((prev) => ({
      ...prev,
      processName: p.processName || "",
      name: "",
      agentName: "",
      amount: "",
      discountAmount: 0,
      balance: "",
    }));
    setAmountText("");
    setBalanceText("");
    setShowProcessModal(false);

    
    setShowPendingModal(false);
  };

  const selectEmployee = (e: Employee) => {
    const name = e.employeeName || "";
    setFormData((prev) => ({ ...prev, name, amount: "", discountAmount: 0, balance: "" }));
    setAmountText("");
    setBalanceText("");
    setShowEmployeeModal(false);

   
    setShowPendingModal(false);
  };

  // ✅ auto-open pending modal after party selection, using latest FIFO result (no stale closure)
  const autoOpenedPartyRef = useRef<string>("");

  const selectParty = async (p: Party) => {
    const partyName = p.partyName || "";

    setFormData((prev) => ({
      ...prev,
      name: partyName,
      agentName: p.agent?.agentName || prev.agentName,
      amount: "",
      discountAmount: 0,
      balance: "",
    }));

    setAmountText("");
    setBalanceText("");
    setShowPartyModal(false);

    autoOpenedPartyRef.current = ""; // allow effect to open for newly selected party
    focusAmount();
  };

  useEffect(() => {
    if (editingId) return;
    if (formData.receiptTo !== "Party") return;
    if (!selectedPartyKey) return;

    if (autoOpenedPartyRef.current === selectedPartyKey) return;

    if (pendingBillsFifo.length > 0) {
      autoOpenedPartyRef.current = selectedPartyKey;
      openPendingModal();
    }
  }, [editingId, formData.receiptTo, selectedPartyKey, pendingBillsFifo.length, openPendingModal]);

  const selectAgentOrBroker = (a: any) => {
    const selected = a.name || a.agentName || "";
    if (!selected) return;

    if (agentModalTarget === "agentName") {
      setFormData((prev) => ({ ...prev, agentName: selected }));
    } else {
      setFormData((prev) => ({
        ...prev,
        name: selected,
        processName: "",
        agentName: "",
        amount: "",
        discountAmount: 0,
        balance: "",
      }));
      setAmountText("");
      setBalanceText("");
    }

    setShowAgentModal(false);
    
    setShowPendingModal(false);
  };

  // filters
  const filteredEmployees = useMemo(() => {
    const search = employeeSearchText.toLowerCase();
    const processFilter = formData.processName.toLowerCase();
    return employeeList.filter((e) => {
      const name = (e.employeeName || "").toLowerCase();
      const code = (e.code || "").toLowerCase();
      const empProcess = (e.process?.processName || "").toLowerCase();

      const matchesSearch = !search || name.includes(search) || code.includes(search);
      const matchesProcess = !processFilter || !empProcess || empProcess === processFilter;
      return matchesSearch && matchesProcess;
    });
  }, [employeeList, employeeSearchText, formData.processName]);

  const filteredParties = useMemo(() => {
    const search = partySearchText.toLowerCase();
    const processFilter = formData.processName.toLowerCase();
    return partyList.filter((p) => {
      const name = (p.partyName || "").toLowerCase();
      const partyProcess = p.process?.processName
        ? p.process.processName.toLowerCase()
        : "";

      const matchesSearch = !search || name.includes(search);
      const matchesProcess = !processFilter || !partyProcess || partyProcess === processFilter;
      return matchesSearch && matchesProcess;
    });
  }, [partyList, partySearchText, formData.processName]);

  const filteredProcesses = useMemo(() => {
    return processList.filter((p) => (p.processName || "").toLowerCase().includes(processSearchText.toLowerCase()));
  }, [processList, processSearchText]);

  const filteredAgents = useMemo(() => {
    return agentList.filter((a) => (a.name || a.agentName || "").toLowerCase().includes(agentSearchText.toLowerCase()));
  }, [agentList, agentSearchText]);

  const filteredList = useMemo(() => {
    if (!Array.isArray(receiptList)) return [];
    const s = searchText.toLowerCase();

    return receiptList.filter((x) => {
      const displayName =
        x.receiptTo === "Employee" ? x.employeeName : x.receiptTo === "Broker" ? x.agentName : x.partyName;

      return (
        !searchText ||
        (x.entryType || "").toLowerCase().includes(s) ||
        (x.receiptTo || "").toLowerCase().includes(s) ||
        (x.processName || "").toLowerCase().includes(s) ||
        (displayName || "").toLowerCase().includes(s) ||
        (x.agentName || "").toLowerCase().includes(s)
      );
    });
  }, [receiptList, searchText]);

  const nameLabel =
    formData.receiptTo === "Party"
      ? "Party Name"
      : formData.receiptTo === "Employee"
        ? "Employee Name"
        : formData.receiptTo === "Broker"
          ? "Broker Name"
          : "Name";

  const balanceInputValue = useMemo(() => {
    if (formData.receiptTo === "Party" || formData.receiptTo === "Broker") {
      return formData.balance === "" ? "" : String(formData.balance);
    }
    return balanceText;
  }, [formData.receiptTo, formData.balance, balanceText]);

  // ---------- Save / List / Edit / Delete ----------
  const handleSave = async () => {
    if (saving) return;
setSaving(true);
    const payload: any = {
      entryType: formData.entryType,
      receiptTo: formData.receiptTo,
      receiptDate: formData.receiptDate || null,
      processName: formData.receiptTo === "Broker" ? "" : formData.processName || "",
      paymentThrough: formData.paymentThrough || "",
      amount: formData.amount === "" ? null : formData.amount, // CASH
      discountAmount: formData.discountAmount ? formData.discountAmount : null, // DISCOUNT
      balance: formData.balance === "" ? null : formData.balance,
      remarks: formData.remarks || "",
      date: formData.date || null,

      partyName:
        formData.receiptTo === "Party"
          ? formData.name || ""
          : formData.receiptTo === "Other"
            ? formData.name || ""
            : "",
      employeeName: formData.receiptTo === "Employee" ? formData.name || "" : "",

      agentName:
        formData.receiptTo === "Broker"
          ? formData.name || ""
          : formData.agentName || "",
    };

    try {
      if (editingId) await api.put(routesReceipt.update(editingId), payload);
      else await api.post(routesReceipt.create, payload);

      Swal.fire("Success", editingId ? "Receipt updated!" : "Receipt saved successfully!", "success");
      setEditingId(null);
      handleAddNew(false);
      await loadAll();
      emitLedgerChanged(); // ✅ triggers FIFO rebuild everywhere (AccountStatement, Pending Report, etc.)
    } catch (error: any) {
      console.error(error);
      Swal.fire("Error", error.response?.data?.message || "Failed to save", "error");
    }
    finally {
    setSaving(false);
}
  };

  const openList = async () => {
    try {
      const res = await api.get(routesReceipt.list);
      setReceiptList(Array.isArray(res.data) ? res.data : []);
      setShowList(true);
    } catch {
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const res = await api.get(routesReceipt.get(id));
      const rec: ReceiptRecord = res.data;

      const fromDate = rec.receiptDate || today;
      const toDate = rec.date && rec.date >= fromDate ? rec.date : fromDate;

      const displayName =
        rec.receiptTo === "Employee"
          ? rec.employeeName || ""
          : rec.receiptTo === "Broker"
            ? rec.agentName || ""
            : rec.partyName || "";

      const amtNum =
        rec.amount === null || rec.amount === undefined ? "" : Number(rec.amount);
      const balNum =
        rec.balance === null || rec.balance === undefined ? "" : Number(rec.balance);

      setFormData({
        entryType: rec.entryType || "",
        receiptTo: (rec.receiptTo as ReceiptToType) || "",
        receiptDate: fromDate,
        processName: rec.processName || "",
        name: displayName,
        paymentThrough: rec.paymentThrough || "Cash",
        amount: amtNum,
        discountAmount: discNum,
        balance: balNum,
        remarks: rec.remarks || "",
        agentName: rec.receiptTo === "Broker" ? "" : rec.agentName || "",
        date: toDate,
      });

      setAmountText(amtNum === "" ? "" : String(amtNum));
      setBalanceText(balNum === "" ? "" : String(balNum));

      setEditingId(id);
      setShowList(false);
      setShowData([]);

      setShowPendingModal(false);
      
      setModalRows([]);
      setReceiveByKey({});
      setDiscountByKey({});
      setAppliedCashTotal(0);
      setAppliedDiscountTotal(0);
    } catch {
      Swal.fire("Error", "Failed to load record", "error");
    }
  };

  const handleDelete = async (id?: number) => {
    const targetId = id ?? editingId;
    if (!targetId) {
      Swal.fire("Info", "No record selected to delete", "info");
      return;
    }

    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(routesReceipt.delete(targetId));
      Swal.fire("Deleted!", "Record deleted successfully", "success");
      setEditingId(null);
      handleAddNew(false);
      await loadAll();
      emitLedgerChanged(); // ✅ triggers FIFO rebuild everywhere
    } catch {
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  const handleAddNew = (showToast = true) => {
    setFormData({
      entryType: "",
      receiptTo: "" as ReceiptToType,
      receiptDate: today,
      processName: "",
      name: "",
      paymentThrough: "Cash",
      amount: "",
      discountAmount: 0,
      balance: "",
      remarks: "",
      agentName: "",
      date: today,
    });

    setAmountText("");
    setBalanceText("");
    setEditingId(null);
    setShowData([]);
    if (showToast) Swal.fire("Cleared", "Ready for new entry", "success");
  };

  const handleShow = async () => {
    if (formData.receiptTo !== "Party" && formData.receiptTo !== "Employee") {
      Swal.fire("Info", "Show is available for Party/Employee only", "info");
      return;
    }

    if (formData.receiptTo === "Employee") {
      setShowLoading(true);
      setProductionReceipts([]);
      setProductionRows([]);

      try {
        const res = await api.get(routesReceipt.productionReceiptList);
        const all = Array.isArray(res.data) ? res.data : [];

        const from = formData.receiptDate ? new Date(formData.receiptDate) : null;
        const to = formData.date ? new Date(formData.date) : null;

        const filtered = all.filter((pr: any) => {
          const processOk = formData.processName
            ? (pr.processName || "").toLowerCase() === formData.processName.toLowerCase()
            : true;

          const empOk = formData.name
            ? (pr.employeeName || "").toLowerCase() === formData.name.toLowerCase()
            : true;

          const dStr = pr.dated || pr.receiptDate;
          if (!dStr) return false;

          const d = new Date(dStr);
          const dateOk = from && to ? d >= from && d <= to : true;

          return processOk && empOk && dateOk;
        });

        setProductionReceipts(filtered);

        const flat: any[] = [];
        filtered.forEach((pr: any) => {
          (pr.rows || []).forEach((r: any, idx: number) => {
            flat.push({
              key: `${pr.id}-${idx}`,
              dated: pr.dated || pr.receiptDate || "",
              voucherNo: pr.voucherNo || "",
              employeeName: pr.employeeName || "",
              processName: pr.processName || "",
              cardNo: r.cardNo || "",
              artNo: r.artNo || "",
              shade: r.shade || r.Size || "",
              pcs: r.pcs || "",
              rate: r.rate || "",
              amount: r.amount || "",
              remarks: r.remarks || "",
            });
          });
        });

        setProductionRows(flat);
        setShowProductionModal(true);
      } catch (err) {
        console.error("Show (production receipts) Error:", err);
        Swal.fire("Error", "Failed to load production receipts", "error");
      } finally {
        setShowLoading(false);
      }
      return;
    }

    setShowLoading(true);
    setShowData([]);

    try {
      const params: any = {};
      if (formData.receiptDate) params.fromDate = formData.receiptDate;
      if (formData.date) params.toDate = formData.date;
      if (formData.name) params.partyName = formData.name;

      const res = await api.get(routesReceipt.partyPaymentList, { params });
      const data = Array.isArray(res.data) ? res.data : [];
      if (!data.length) Swal.fire("Info", "No payment record found", "info");
      else setShowData(data);
    } catch {
      Swal.fire("Error", "Failed to load data for Show", "error");
    } finally {
      setShowLoading(false);
    }
  };

  const isAgentSelectable =
    formData.receiptTo !== "Party" && formData.receiptTo !== "Broker";

  const nameLabel =
    formData.receiptTo === "Party"
      ? "Party Name"
      : formData.receiptTo === "Employee"
      ? "Employee Name"
      : formData.receiptTo === "Broker"
      ? "Broker Name"
      : "Name";

  // ✅ Balance input value (auto vs manual)
  const balanceInputValue = useMemo(() => {
    if (formData.receiptTo === "Party" || formData.receiptTo === "Broker") {
      return formData.balance === "" ? "" : String(formData.balance);
    }
    return balanceText;
  }, [formData.receiptTo, formData.balance, balanceText]);

  return (
    <Dashboard>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-white shadow-md rounded-lg w-full max-w-4xl mx-auto p-6 border">
          <h2 className="text-2xl font-bold text-center mb-6">Receipt</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold">Receipt To</label>
              <select name="receiptTo" value={formData.receiptTo} onChange={handleChange} className="border p-2 w-full rounded">
                <option value="">Select</option>
                <option value="Party">Party</option>
                <option value="Employee">Employee</option>
                <option value="Broker">Broker</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div />

            <div className="col-span-2">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 font-semibold">From Date</label>
                  <input type="date" name="receiptDate" value={formData.receiptDate} onChange={handleChange} className="border p-2 w-full rounded" />
                </div>

                <div className="flex-1">
                  <label className="block mb-1 font-semibold">To Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} min={formData.receiptDate} className="border p-2 w-full rounded" />
                </div>
              </div>

              <div className="text-xs text-gray-600 mt-1">
                Pending calculation As on: <b>{asOfIso}</b>
              </div>
            </div>

            {/* Process */}
            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Process Name</label>
              <input
                type="text"
                name="processName"
                value={formData.processName}
                onClick={formData.receiptTo !== "Broker" ? openProcessModal : undefined}
                readOnly
                disabled={!isProcessSelectable}
                placeholder={
                  formData.receiptTo === "Broker"
                    ? "Disabled for Broker"
                    : "Click to select process (optional)"
                }
                className={`border p-2 w-full rounded ${
                  isProcessSelectable
                    ? "cursor-pointer bg-gray-50 hover:bg-gray-100"
                    : "bg-gray-100 cursor-not-allowed"
                }`}
              />
            </div>

            {/* Name */}
            <div className="col-span-2">
              <label className="block mb-1 font-semibold">{nameLabel}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onClick={formData.receiptTo !== "Other" ? openNameModal : undefined}
                readOnly={formData.receiptTo !== "Other"}
                placeholder={formData.receiptTo === "Other" ? "Type name" : "Click to select"}
                className={`border p-2 w-full rounded ${
                  isNameReadOnly ? "cursor-pointer bg-gray-50 hover:bg-gray-100" : ""
                }`}
                onChange={handleChange}
              />

              {formData.receiptTo === "Party" && formData.name ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-600">
                    Pending (FIFO) (as on {asOfIso}) <span className="text-gray-500">[{pendingSide}]</span>: <b>{fmtMoney2(pendingTotal)}</b>{" "}
                    {pendingBillsFifo.length ? <span>({pendingBillsFifo.length} entries)</span> : null}
                  </div>

                  <button type="button" onClick={openPendingModal} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    View Pending
                  </button>
                </div>
              ) : null}
            </div>

            {/* Agent */}
            {formData.receiptTo !== "Broker" && (
              <div className="col-span-2">
                <label className="block mb-1 font-semibold">Agent Name</label>
                <input
                  type="text"
                  name="agentName"
                  value={formData.agentName}
                  onClick={formData.receiptTo !== "Party" ? openAgentModal : undefined}
                  readOnly
                  placeholder={
                    formData.receiptTo === "Party"
                      ? "Auto-filled from party broker"
                      : "Click to select agent"
                  }
                  className="border p-2 w-full rounded cursor-pointer bg-gray-50 hover:bg-gray-100"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Payment Through</label>
              <select name="paymentThrough" value={formData.paymentThrough} onChange={handleChange} className="border p-2 w-full rounded">
                <option value="">Select</option>
                <option value="Cash">Cash</option>
                {paymentModes.map((pm, index) => {
                  const label = `${pm.bankNameOrUpiId}-${pm.accountNo}`;
                  const key = pm.id ?? label ?? index;
                  return (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block mb-1 font-semibold">Amount (Cash)</label>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                name="amount"
                value={amountText}
                onChange={handleChange}
                placeholder="Enter cash amount"
                className="border p-2 w-full rounded"
              />
              {amountInWords ? (
                <div className="text-xs text-gray-600 mt-1">{amountInWords}</div>
              ) : null}
            </div>

            {/* Balance */}
            <div>
              <label className="block mb-1 font-semibold">Balance</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  name="balance"
                  value={balanceInputValue}
                  onChange={handleChange}
                  readOnly={formData.receiptTo === "Party" || formData.receiptTo === "Broker"}
                  placeholder={
                    formData.receiptTo === "Party"
                      ? "Auto (Ledger Balance - Amount)"
                      : formData.receiptTo === "Broker"
                      ? "Auto (Broker Ledger Balance - Amount)"
                      : ""
                  }
                  className={`border p-2 w-full rounded ${
                    formData.receiptTo === "Party" || formData.receiptTo === "Broker"
                      ? "bg-gray-50 cursor-not-allowed"
                      : ""
                  }`}
                />
                <input type="text" value={balanceDrCr} readOnly placeholder="Dr/Cr" className="border p-2 w-20 rounded bg-gray-50 text-center" />
              </div>

              {(formData.receiptTo === "Party" || formData.receiptTo === "Broker") &&
                baseBalance !== null && (
                  <div className="text-xs text-gray-600 mt-1">
                    Base ({baseBalanceFor || "Auto"} as on {formData.receiptDate}):{" "}
                    {absVal(baseBalance)} {baseBalDrCr}
                    {formData.amount !== "" && (
                      <>
                        {" "}
                        | Current: {absVal(formData.balance)} {balanceDrCr}
                      </>
                    )}
                  </div>
                )}
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Remarks</label>
              <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} className="border p-2 w-full rounded" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap justify-between mt-6">
            <div className="space-x-2">
              <button onClick={() => handleAddNew()} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Add New
              </button>

              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {editingId ? "Update" : "Save"}
              </button>

              <button onClick={handlePrintReceipt} className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800">
                Print
              </button>

              <button onClick={handleShow} className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600" disabled={showLoading}>
                {showLoading ? "Loading..." : "Show"}
              </button>

              <button onClick={openList} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                List
              </button>

              <button onClick={() => handleDelete()} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                Delete
              </button>

              <button onClick={() => navigate(-1)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                Exit
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Pending Modal (FIFO, challan-wise, cash + discount) */}
        {showPendingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-5 flex flex-col max-h-[90vh]">
              <h3 className="text-xl font-bold text-center mb-2">
                Pending Entries – {formData.name} (As on {asOfIso}){" "}
                <span className="text-gray-500 font-normal">[{pendingSide}]</span>
              </h3>

              <div className="text-sm text-gray-700 mb-3 text-center">
                Pending (Modal): <b>{fmtMoney2(modalPendingTotal)}</b> &nbsp;|&nbsp; Cash: <b>{fmtMoney2(selectedCashTotal)}</b> &nbsp;|&nbsp; Discount: <b>{fmtMoney2(selectedDiscountTotal)}</b> &nbsp;|&nbsp; Total:{" "}
                <b>{fmtMoney2(selectedSettlementTotal)}</b>
              </div>

              <div className="overflow-auto flex-1 border rounded">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="border p-2">#</th>
                      <th className="border p-2">Date</th>
                      <th className="border p-2">Doc No</th>
                      <th className="border p-2">Type</th>
                      <th className="border p-2 text-right">Amt</th>
                      <th className="border p-2 text-right">Pending</th>
                      <th className="border p-2 text-right">Receive</th>
                      <th className="border p-2 text-right">Discount</th>
                      <th className="border p-2 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {modalRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="border p-4 text-center text-gray-500">
                          No pending entries
                        </td>
                      </tr>
                    ) : (
                      modalRows.map((r, idx) => {
                        const isPartial = partialBillKeys.has(r.docKey);
                        return (
                          <tr key={r.rowKey} className={isPartial ? "bg-purple-100" : ""}>
                            <td className="border p-2 text-center">{idx + 1}</td>
                            <td className="border p-2">{fmtDDMMYYYY(r.date)}</td>
                            <td className="border p-2">{r.docNo}</td>
                            <td className="border p-2">{txLabel(r.txType)}</td>
                            <td className="border p-2 text-right">{fmtMoney2(r.chargeAmount)}</td>
                            <td className="border p-2 text-right font-semibold">{fmtMoney2(r.pendingAmount)}</td>

                            <td className="border p-2 text-right">
                              <input
                                ref={(el) => {
                                  receiveInputRefs.current[r.rowKey] = el;
                                }}
                                type="text"
                                inputMode="decimal"
                                value={receiveByKey[r.rowKey] ?? ""}
                                onChange={(e) => setReceiveForRow(r.rowKey, e.target.value)}
                                className="border p-1 rounded w-24 text-right"
                                placeholder="0.00"
                                disabled={pendingSideMemo === "CREDIT"}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    applyNextForRow(r);
                                  }
                                }}
                              />
                            </td>

                            <td className="border p-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={discountByKey[r.rowKey] ?? ""}
                                onChange={(e) => setDiscountForRow(r.rowKey, e.target.value)}
                                className="border p-1 rounded w-24 text-right"
                                placeholder="0.00"
                                disabled={pendingSideMemo === "CREDIT"}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    applyNextForRow(r);
                                  }
                                }}
                              />
                            </td>

                            <td className="border p-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                disabled={pendingSideMemo === "CREDIT"}
                                onClick={() => {
                                  setReceiveForRow(r.rowKey, r.pendingAmount.toFixed(2));
                                  setDiscountForRow(r.rowKey, "0");
                                }}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-600"
                              >
                                Full
                              </button>

              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                List
              </button>

              <button
                onClick={() => handleDelete()}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>

              <button
                onClick={() => navigate(-1)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Exit
              </button>
            </div>
          </div>
        </div>

        {/* Recently Saved */}
        {savedRecords.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-4xl mx-auto">
            <h3 className="font-bold text-lg mb-3">Recently Saved Receipts</h3>
            <div className="overflow-auto max-h-[200px]">
              <table className="w-full text-sm border">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">From</th>
                    <th className="border p-2">To</th>
                    <th className="border p-2">To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2 text-right">Cash</th>
                    <th className="border p-2 text-right">Disc</th>
                    <th className="border p-2 text-right">Balance</th>
                    <th className="border p-2">DR/CR</th>
                  </tr>
                </thead>
                <tbody>
                  {savedRecords.slice(-5).map((r, idx) => {
                    const name =
                      r.receiptTo === "Employee"
                        ? r.employeeName
                        : r.receiptTo === "Broker"
                          ? r.agentName
                          : r.partyName;

                    const rowKey =
                      record.id ??
                      (record as any).receiptId ??
                      `${record.receiptDate}-${record.processName}-${idx}`;

                    const drcr = getDrCr(record.balance);
                    const balAbs = absVal(record.balance);

                    return (
                      <tr key={r.id ?? idx}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">
                          {record.receiptDate
                            ? new Date(record.receiptDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="border p-2">
                          {record.date ? new Date(record.date).toLocaleDateString() : "-"}
                        </td>
                        <td className="border p-2">{record.receiptTo}</td>
                        <td className="border p-2">{name || "-"}</td>
                        <td className="border p-2">{record.agentName || "-"}</td>
                        <td className="border p-2">{record.processName || "-"}</td>
                        <td className="border p-2 text-right">{record.amount ?? "-"}</td>
                        <td className="border p-2 text-right">
                          {record.balance === null || record.balance === undefined
                            ? "-"
                            : balAbs}
                        </td>
                        <td className="border p-2 text-center">{drcr || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Show Table */}
        {formData.receiptTo === "Party" && showData.length > 0 && (
          <div
            id="show-table-section"
            className="mt-6 p-4 bg-white rounded-lg border border-gray-200 max-w-5xl mx-auto"
          >
            <h3 className="font-bold text-lg mb-3">
              Party Payments (From {formData.receiptDate} To {formData.date})
            </h3>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">#</th>
                    {Object.keys(showData[0] || {}).map((key) => (
                      <th key={key} className="border p-2">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border p-2 text-center">{idx + 1}</td>
                      {Object.keys(showData[0] || {}).map((key) => (
                        <td key={key} className="border p-2">
                          {row[key] != null ? String(row[key]) : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =================== Employee Modal =================== */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Employee</h3>
            <input
            ref={employeeSearchRef}
              type="text"
              placeholder="Search employee name or code..."
              value={employeeSearchText}
              onChange={(e) => setEmployeeSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Employee Name</th>
                    <th className="border p-2">Code</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((e, idx) => (
                    <tr key={e.id ?? e.code ?? idx}>
                      <td className="border p-2">{e.employeeName}</td>
                      <td className="border p-2">{e.code}</td>
                      <td className="border p-2 text-center">
                        <button onClick={() => selectEmployee(e)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={3}>
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button onClick={() => setShowEmployeeModal(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== Party Modal =================== */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Party</h3>
            <input
            ref={partySearchRef}
              type="text"
              placeholder="Search party name..."
              value={partySearchText}
              onChange={(e) => setPartySearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Party Name</th>
                    <th className="border p-2">Broker</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((p, idx) => (
                    <tr key={p.id ?? p.serialNumber ?? idx}>
                      <td className="border p-2">{p.partyName}</td>
                      <td className="border p-2">{p.agent?.agentName || "-"}</td>
                      <td className="border p-2 text-center">
                        <button onClick={() => selectParty(p)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredParties.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={3}>
                        No parties found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button onClick={() => setShowPartyModal(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== Process Modal =================== */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Process</h3>
            <input
            ref={processSearchRef}
              type="text"
              placeholder="Search process name..."
              value={processSearchText}
              onChange={(e) => setProcessSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Process Name</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.map((p: any) => (
                    <tr key={p.serialNo || p.id || p.processName}>
                      <td className="border p-2">{p.processName}</td>
                      <td className="border p-2 text-center">
                        <button onClick={() => selectProcess(p)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProcesses.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={2}>
                        No processes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-4">
              <button onClick={() => setShowProcessModal(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== Agent/Broker Modal =================== */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">
              {agentModalTarget === "brokerName" ? "Select Broker" : "Select Agent"}
            </h3>
            <input
            ref={agentSearchRef}
              type="text"
              placeholder="Search name..."
              value={agentSearchText}
              onChange={(e) => setAgentSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((a: any, idx: number) => (
                    <tr key={a.id ?? a.agentCode ?? a.code ?? idx}>
                      <td className="border p-2">{a.name || a.agentName}</td>
                      <td className="border p-2 text-center">
                        <button onClick={() => selectAgentOrBroker(a)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAgents.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={2}>
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAgentModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Receipt modal */}
      {showProductionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">
              Production Receipts – {formData.name ? `${formData.name} / ` : ""}
              {formData.processName || "All Processes"} (From {formData.receiptDate} To {formData.date})
            </h3>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Voucher No</th>
                    <th className="border p-2">Employee</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Cutting Lot No</th>
                    <th className="border p-2">Art No</th>
                    <th className="border p-2">Shade</th>
                    <th className="border p-2">Pcs</th>
                    <th className="border p-2">Rate</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {productionRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="border p-4 text-center text-gray-500">
                        No production receipts found
                      </td>
                    </tr>
                  ) : (
                    productionRows.map((row: any, idx: number) => (
                      <tr key={row.key || idx}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">
                          {row.dated ? new Date(row.dated).toLocaleDateString() : "-"}
                        </td>
                        <td className="border p-2">{row.voucherNo || "-"}</td>
                        <td className="border p-2">{row.employeeName || "-"}</td>
                        <td className="border p-2">{row.processName || "-"}</td>
                        <td className="border p-2">{row.cardNo || "-"}</td>
                        <td className="border p-2">{row.artNo || "-"}</td>
                        <td className="border p-2">{row.shade || "-"}</td>
                        <td className="border p-2 text-right">{row.pcs || ""}</td>
                        <td className="border p-2 text-right">{row.rate || ""}</td>
                        <td className="border p-2 text-right">{row.amount || ""}</td>
                        <td className="border p-2">{row.remarks || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowProductionModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== List Modal =================== */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">Receipt List</h3>

            <input
              placeholder="Search..."
              className="border p-2 rounded w-full mb-3"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">From</th>
                    <th className="border p-2">To</th>
                    <th className="border p-2">Receipt To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2 text-right">Cash</th>
                    <th className="border p-2 text-right">Discount</th>
                    <th className="border p-2 text-right">Balance</th>
                    <th className="border p-2">DR/CR</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border p-4 text-center text-gray-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d: any, i: number) => {
                      const name =
                        d.receiptTo === "Employee"
                          ? d.employeeName
                          : d.receiptTo === "Broker"
                          ? d.agentName
                          : d.partyName;

                      const rowKey = d.id ?? d.receiptId ?? i;

                      const drcr = getDrCr(d.balance);
                      const balAbs = absVal(d.balance);

                      return (
                        <tr key={rowKey}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">
                            {d.receiptDate ? new Date(d.receiptDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="border p-2">
                            {d.date ? new Date(d.date).toLocaleDateString() : "-"}
                          </td>
                          <td className="border p-2">{d.entryType}</td>
                          <td className="border p-2">{d.receiptTo}</td>
                          <td className="border p-2">{name || "-"}</td>
                          <td className="border p-2 text-right">{d.amount ?? "-"}</td>
                          <td className="border p-2 text-right">
                            {d.balance === null || d.balance === undefined ? "-" : balAbs}
                          </td>
                          <td className="border p-2 text-center">{drcr || "-"}</td>
                          <td className="border p-2 text-center">
                            <button onClick={() => handleEdit(d.id)} className="px-2 py-1 bg-blue-500 text-white rounded mr-1 hover:bg-blue-600">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(d.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-5">
              <button onClick={() => setShowList(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default PaymentReceiptForm;