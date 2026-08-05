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

const sanitizeDecimal = (raw: string, opts?: { allowNegative?: boolean; decimals?: number }) => {
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

const isPartialNumberText = (s: string) => s === "" || s === "-" || s === "." || s === "-.";

const escapeHtml = (s: any) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const fmtDDMMYYYY = (iso: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const fmtMoney2 = (n: number) =>
  (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hashToInt = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 0;
};

const parseDiscountFromRemarks = (remarks?: string) => {
  const s = String(remarks || "");
  const m = s.match(/discount\s*:\s*([0-9]+(\.[0-9]+)?)/i);
  return m ? toNum(m[1]) : 0;
};

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

  // ledger sources
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
      const [
        proc,
        emp,
        ag,
        pm,
        parties,
        receipts,
        dcRaw,
        odRaw,
        poRaw,
        peRaw,
        prRaw,
        jobInRaw,
        payRaw1,
      ] = await Promise.all([
        safeGetArray(routesReceipt.processes),
        safeGetArray(routesReceipt.employees),
        safeGetArray(routesReceipt.agents),
        safeGetArray(routesReceipt.paymentModes),
        safeGetArray(routesReceipt.parties),
        safeGetArray(routesReceipt.list),
        safeGetArray(routesReceipt.dispatchChallans),
        safeGetArray(routesReceipt.otherDispatchChallans),
        safeGetArray(routesReceipt.purchaseOrders),
        safeGetArray(routesReceipt.purchaseEntries),
        safeGetArray(routesReceipt.purchaseReturns),
        safeGetArray(routesReceipt.jobInward),
        safeGetArray(routesReceipt.payments),
      ]);

      setProcessList(proc);
      setEmployeeList(emp);
      setAgentList(ag);
      setPaymentModes(pm);
      setPartyList(parties);
      setSavedRecords(receipts);

      const payRaw =
        Array.isArray(payRaw1) && payRaw1.length > 0 ? payRaw1 : await safeGetArray(routesReceipt.paymentsFallback);

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
    loadAll();
  }, [loadAll]);

  // refresh on any ledger status changes (manual paid toggles from other screens)
  useEffect(() => {
    const h = () => {
      
      loadAll();
    };
    window.addEventListener("ledger:changed", h);
    return () => window.removeEventListener("ledger:changed", h);
  }, [loadAll]);
useEffect(() => {
  if (showPartyModal) {
    setTimeout(() => {
      partySearchRef.current?.focus();
    }, 100);
  }
}, [showPartyModal]);

useEffect(() => {
  if (showEmployeeModal) {
    setTimeout(() => {
      employeeSearchRef.current?.focus();
    }, 100);
  }
}, [showEmployeeModal]);

useEffect(() => {
  if (showProcessModal) {
    setTimeout(() => {
      processSearchRef.current?.focus();
    }, 100);
  }
}, [showProcessModal]);

useEffect(() => {
  if (showAgentModal) {
    setTimeout(() => {
      agentSearchRef.current?.focus();
    }, 100);
  }
}, [showAgentModal]);
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
      if (!p) return 0;
      const amt = toNum(p.openingBalance ?? 0);
      const typ: BalanceType = (p.openingBalanceType as BalanceType) || "DR";
      return typ === "CR" ? -amt : amt;
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

      if (norm(p.partyName ?? "") !== selectedPartyKey) return;
      const d = String(p.paymentDate || p.date || "").slice(0, 10);
      const { debit, credit } = ledgerDrCr("Payment", toNum(p.amount));
      addEvent({
        id: p.id,
        date: d,
        partyName: String(p.partyName ?? "").trim(),
        brokerName: String(p.brokerName ?? p.agentName ?? "").trim(),
        orderNo: `PAY-${p.id}`,
        mode: "",
        debit,
        credit,
        type: "Payment" as LedgerTxType,
        docKey: `Payment:${p.id}`,
      });
    });

    // Party Receipts (credit = cash + discount)
    savedRecords.forEach((r) => {
      if (r.receiptTo !== "Party") return;
      if (norm(r.partyName ?? "") !== selectedPartyKey) return;
      const d = String(r.receiptDate || r.date || "").slice(0, 10);

      const cash = toNum(r.amount ?? 0);
      const disc = toNum(r.discountAmount ?? 0) || parseDiscountFromRemarks(r.remarks);
      const totalCredit = cash + disc;

      addEvent({
        id: r.id,
        date: d,
        partyName: String(r.partyName ?? "").trim(),
        brokerName: String(r.agentName ?? "").trim(),
        orderNo: `REC-${r.id}`,
        mode: "",
        debit: 0,
        credit: totalCredit,
        type: "Receipt" as LedgerTxType,
        docKey: `Receipt:${r.id}`,
      });
    });

    return events;
  }, [
    selectedPartyName,
    selectedPartyKey,
    asOfIso,
    partyByName,
    getPartyOpeningSigned,
    accDispatch,
    accOtherDispatch,
    accPurchaseOrders,
    accPurchaseEntries,
    accPurchaseReturns,
    accJobInwards,
    accPayments,
    savedRecords,
  ]);

  // ✅ closing signed as-of from the SAME event list (single source)
  const closingSignedAsOf = useMemo(() => {
    return (ledgerEventsForParty || []).reduce((s, e) => s + toNum(e.debit) - toNum(e.credit), 0);
  }, [ledgerEventsForParty]);

  const pendingSideMemo = useMemo<"DEBIT" | "CREDIT">(
    () => (closingSignedAsOf >= 0 ? "DEBIT" : "CREDIT"),
    [closingSignedAsOf],
  );

  useEffect(() => {
    setPendingSide(pendingSideMemo);
  }, [pendingSideMemo]);

  // ✅ Get manualPaid statuses for the correct "bill side" (exactly like AccountStatement)
  const billDocKeysForStatus = useMemo(() => {
    const keys = ledgerEventsForParty
      .filter((e) => {
        if (pendingSideMemo === "DEBIT") return toNum(e.debit) > 0;
        return toNum(e.credit) > 0;
      })
      .map((e) => String(e.docKey || "").trim())
      .filter(Boolean);

    return Array.from(new Set(keys));
  }, [ledgerEventsForParty, pendingSideMemo]);
  const refreshManualPaidUserMap = useCallback(
  async (keys: string[]) => {
    const uniqKeys = Array.from(
      new Set((keys || []).map((k) => String(k || "").trim()).filter(Boolean)),
    );

    if (!uniqKeys.length) {
      setManualPaidUserMap(new Map());
      return;
    }

    try {
      const res = await api.post<LedgerBillStatusDTO[]>(routesReceipt.ledgerStatusBulkGet, {
        keys: uniqKeys,
      });

      const arr = Array.isArray(res.data) ? res.data : [];
      const m = new Map<string, boolean>();

      for (const x of arr) {
        const k = String((x as any)?.docKey ?? "").trim();
        if (!k) continue;
        m.set(k, !!(x as any)?.manualPaidUser);
      }

      setManualPaidUserMap(m);
    } catch {
      setManualPaidUserMap(new Map());
    }
  },
  [],
);

  // manual paid status map (docKey -> manualPaidUser)
  const [manualPaidUserMap, setManualPaidUserMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
  refreshManualPaidUserMap(billDocKeysForStatus);
}, [billDocKeysForStatus, refreshManualPaidUserMap]);

  // ✅ Swap for CREDIT-side pending so the SAME FIFO engine works exactly as in AccountStatement
  const fifoEventsForCalc: BaseLedgerEvent[] = useMemo(() => {
    if (pendingSideMemo === "DEBIT") return ledgerEventsForParty;
    return ledgerEventsForParty.map((e) => ({
      ...e,
      debit: toNum(e.credit),
      credit: toNum(e.debit),
    }));
  }, [ledgerEventsForParty, pendingSideMemo]);

  const fifoResult = useMemo(() => {
    return computeLedgerFifo({
      events: fifoEventsForCalc,
      asOfDateIso: asOfIso,
      manualPaidUserByDocKey: manualPaidUserMap,
    });
  }, [fifoEventsForCalc, asOfIso, manualPaidUserMap]);

  const partialBillKeys = fifoResult.partialBillKeys;

  // ✅ Pending list for receipt pending popup = FIFO result bills, challan-wise
  const pendingBillsFifo: PendingEntryRow[] = useMemo(() => {
    if (!selectedPartyName) return [];
    return fifoResult.bills
      .filter((b) => b.pending > 0.00001)
      .filter((b) => !b.manualPaidEffective)
      .map((b) => ({
        rowKey: b.docKey,
        docKey: b.docKey,
        txType: (b.type as any) === "Opening" ? "Opening" : (b.type as any),
        docId: b.docKey.startsWith("Opening:") ? -1 : 0,
        docNo: b.docNo || (b.type === "Opening" ? "OPENING" : "-"),
        date: String(b.date || "").slice(0, 10),
        chargeAmount: +toNum(b.original).toFixed(2),
        pendingAmount: +toNum(b.pending).toFixed(2),
      }));
  }, [fifoResult.bills, selectedPartyName]);

  const pendingTotal = useMemo(
    () => pendingBillsFifo.reduce((s, r) => s + (Number(r.pendingAmount) || 0), 0),
    [pendingBillsFifo],
  );

  // ✅ Keep receipt balance synced from FIFO pending (single source)
  useEffect(() => {
    if (editingId) return;
    if (formData.receiptTo !== "Party") return;

    const cash = formData.amount === "" ? 0 : Number(formData.amount || 0);
    const disc = Number(formData.discountAmount || 0);
    const base = pendingTotal;

    const settle = +(cash + disc).toFixed(2);

    const nextPending =
      pendingSideMemo === "DEBIT"
        ? +(Math.max(0, base - settle)).toFixed(2)
        : +(base + settle).toFixed(2);

    const signed = pendingSideMemo === "DEBIT" ? nextPending : -nextPending;
    const balVal: number | "" = Math.abs(signed) > 0.00001 ? signed : "";

    setFormData((prev) => ({ ...prev, balance: balVal }));
    setBalanceText(balVal === "" ? "" : String(balVal));
  }, [editingId, formData.receiptTo, formData.amount, formData.discountAmount, pendingTotal, pendingSideMemo]);

  // ---------- pending modal helpers ----------
  const modalPendingTotal = useMemo(
    () => modalRows.reduce((s, r) => s + (Number(r.pendingAmount) || 0), 0),
    [modalRows],
  );

  const selectedCashTotal = useMemo(() => {
    let s = appliedCashTotal;
    for (const r of pendingBillsFifo) {
      const rt = String(receiveByKey[r.rowKey] ?? "").trim();
      if (!rt || isPartialNumberText(rt)) continue;
      s += toNum(rt);
    }
    return +s.toFixed(2);
  }, [receiveByKey, pendingBillsFifo, appliedCashTotal]);

  const selectedDiscountTotal = useMemo(() => {
    let s = appliedDiscountTotal;
    for (const r of pendingBillsFifo) {
      const dt = String(discountByKey[r.rowKey] ?? "").trim();
      if (!dt || isPartialNumberText(dt)) continue;
      s += toNum(dt);
    }
    return +s.toFixed(2);
  }, [discountByKey, pendingBillsFifo, appliedDiscountTotal]);

  const selectedSettlementTotal = useMemo(
    () => +(selectedCashTotal + selectedDiscountTotal).toFixed(2),
    [selectedCashTotal, selectedDiscountTotal],
  );

  const setReceiveForRow = useCallback((rowKey: string, raw: string) => {
    const clean = sanitizeDecimal(raw, { allowNegative: false, decimals: 2 });
    setReceiveByKey((prev) => ({ ...prev, [rowKey]: clean }));
  }, []);

  const setDiscountForRow = useCallback((rowKey: string, raw: string) => {
    const clean = sanitizeDecimal(raw, { allowNegative: false, decimals: 2 });
    setDiscountByKey((prev) => ({ ...prev, [rowKey]: clean }));
  }, []);

  const openPendingModal = useCallback(() => {
    if (!pendingBillsFifo.length) {
      Swal.fire("Info", "No pending entries found", "info");
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

      const oldestKey = modalRows[0]?.rowKey || "";
      if (oldestKey && row.rowKey !== oldestKey) {
        Swal.fire("Info", "Please settle the oldest pending entry first (FIFO).", "info");
        receiveInputRefs.current[oldestKey]?.focus();
        return;
      }

      const recvTxt = (receiveByKey[row.rowKey] ?? "").trim();
      const discTxt = (discountByKey[row.rowKey] ?? "").trim();

      const recvPartial = isPartialNumberText(recvTxt);
      const discPartial = isPartialNumberText(discTxt);

      if ((recvTxt && recvPartial) || (discTxt && discPartial)) {
        Swal.fire("Info", "Please complete partial Receive/Discount amount.", "info");
        receiveInputRefs.current[row.rowKey]?.focus();
        return;
      }

      let recv = recvTxt ? toNum(recvTxt) : 0;
      let disc = discTxt ? toNum(discTxt) : 0;

      // if both empty => full pending as cash
      if (!recvTxt && !discTxt) {
        recv = row.pendingAmount;
        disc = 0;
      }

      // if cash empty but discount entered => cash = pending - discount
      if (!recvTxt && disc > 0) {
        recv = Math.max(0, row.pendingAmount - disc);
      }

      if (recv > row.pendingAmount) recv = row.pendingAmount;
      if (disc > row.pendingAmount - recv) disc = row.pendingAmount - recv;

      const totalSettle = +(recv + disc).toFixed(2);
      if (totalSettle <= 0) {
        Swal.fire("Info", "Enter Receive/Discount (> 0) or click Next empty for Full.", "info");
        receiveInputRefs.current[row.rowKey]?.focus();
        return;
      }

      // ✅ persist allocation totals (so Done never loses it)
      setAppliedCashTotal((x) => +(x + recv).toFixed(2));
      setAppliedDiscountTotal((x) => +(x + disc).toFixed(2));

      // update modal rows
      setModalRows((prev) => {
        const next = prev
          .map((r) => {
            if (r.rowKey !== row.rowKey) return r;
            const newPending = +(toNum(r.pendingAmount) - totalSettle).toFixed(2);
            return { ...r, pendingAmount: Math.max(0, newPending) };
          })
          .filter((r) => r.pendingAmount > 0.00001);

        nextFocusKeyRef.current = next[0]?.rowKey || "";
        return next;
      });

      // clear inputs for row
      setReceiveByKey((prev) => {
        const next = { ...prev };
        delete next[row.rowKey];
        return next;
      });
      setDiscountByKey((prev) => {
        const next = { ...prev };
        delete next[row.rowKey];
        return next;
      });

      setTimeout(() => {
        const k = nextFocusKeyRef.current;
        if (k) {
          receiveInputRefs.current[k]?.focus();
          receiveInputRefs.current[k]?.select?.();
        } else {
          focusAmount();
        }
      }, 0);
    },
    [receiveByKey, discountByKey, focusAmount, modalRows, pendingSideMemo],
  );

  const applySelectedTotalAndClose = useCallback(async () => {
    if (pendingSideMemo === "CREDIT") {
      Swal.fire("Info", "CREDIT-side pending cannot be settled by Receipt. Use Payment.", "info");
      return;
    }

    // Validate partial texts
    for (const r of modalRows) {
      const rt = (receiveByKey[r.rowKey] ?? "").trim();
      const dt = (discountByKey[r.rowKey] ?? "").trim();
      if ((rt && isPartialNumberText(rt)) || (dt && isPartialNumberText(dt))) {
        Swal.fire("Info", "Please complete partial Receive/Discount amount.", "info");
        receiveInputRefs.current[r.rowKey]?.focus();
        return;
      }
    }

    // FIFO enforcement: cannot allocate to later rows if older still pending
    const EPS = 1e-9;
    let prevCleared = true;
    for (let i = 0; i < modalRows.length; i++) {
      const r = modalRows[i];
      const rt = (receiveByKey[r.rowKey] ?? "").trim();
      const dt = (discountByKey[r.rowKey] ?? "").trim();

      let total = 0;
      if (rt || dt) {
        let recv = rt ? toNum(rt) : 0;
        let disc = dt ? toNum(dt) : 0;

        if (!rt && disc > 0) {
          recv = Math.max(0, r.pendingAmount - disc);
        }

        if (recv > r.pendingAmount) recv = r.pendingAmount;
        if (disc > r.pendingAmount - recv) disc = r.pendingAmount - recv;

        total = +(recv + disc).toFixed(2);
      }

      if (total > EPS && !prevCleared) {
        Swal.fire("Info", "FIFO rule: Please fully settle older pending entries first.", "info");
        receiveInputRefs.current[modalRows[0].rowKey]?.focus();
        return;
      }

      const left = +(r.pendingAmount - total).toFixed(2);
      if (left > EPS) prevCleared = false;
    }

    // Apply allocations as receipt totals (cash/discount)
    let cashTotal = appliedCashTotal;
    let discTotal = appliedDiscountTotal;

    for (const r of modalRows) {
      const rt = (receiveByKey[r.rowKey] ?? "").trim();
      const dt = (discountByKey[r.rowKey] ?? "").trim();

      if (!rt && !dt) continue;

      let recv = rt ? toNum(rt) : 0;
      let disc = dt ? toNum(dt) : 0;

      if (!rt && disc > 0) {
        recv = Math.max(0, r.pendingAmount - disc);
      }

      if (recv > r.pendingAmount) recv = r.pendingAmount;
      if (disc > r.pendingAmount - recv) disc = r.pendingAmount - recv;

      cashTotal += recv;
      discTotal += disc;
    }

    cashTotal = +cashTotal.toFixed(2);
    discTotal = +discTotal.toFixed(2);

    const totalSettlement = +(cashTotal + discTotal).toFixed(2);
    if (totalSettlement <= 0) {
      Swal.fire("Info", "Enter Receive/Discount and click Done (or use Next/Full).", "info");
      return;
    }

    // ✅ cap settlement to current FIFO pending total (DEBIT-side settlement behavior)
    const cap = Math.min(totalSettlement, pendingTotal);
    if (cap < totalSettlement - 1e-6) {
      const factor = cap / (totalSettlement || 1);
      cashTotal = +(cashTotal * factor).toFixed(2);
      discTotal = +(discTotal * factor).toFixed(2);
    }

    applyAmountText(cashTotal.toFixed(2));
    setFormData((prev) => ({ ...prev, discountAmount: discTotal }));

    // preview pending after allocation (UI only; DEBIT-side settlement)
    const pendingAfter = +(Math.max(0, pendingTotal - (cashTotal + discTotal))).toFixed(2);
    const balAfter = pendingAfter > 0.00001 ? pendingAfter : "";
    setFormData((prev) => ({ ...prev, balance: balAfter }));
    setBalanceText(balAfter === "" ? "" : String(balAfter));

    setShowPendingModal(false);
    focusAmount();
  }, [
    modalRows,
    receiveByKey,
    discountByKey,
    pendingTotal,
    pendingSideMemo,
    applyAmountText,
    focusAmount,
    appliedCashTotal,
    appliedDiscountTotal,
  ]);

  // ---------- Print ----------
  const handlePrintReceipt = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const cash = formData.amount === "" ? 0 : Number(formData.amount || 0);
    const disc = Number(formData.discountAmount || 0);
    const total = +(cash + disc).toFixed(2);

    const balNum = formData.balance === "" ? null : Number(formData.balance);
    const balAbs = balNum === null || !Number.isFinite(balNum) ? "" : Math.abs(balNum).toFixed(2);
    const balDrCr = balNum === null || !Number.isFinite(balNum) || balNum === 0 ? "" : balNum > 0 ? "Dr" : "Cr";

    const amountWords = amountToWordsINR(total);

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Arial, sans-serif; color:#111; }
    .title { text-align:center; font-size: 28px; font-weight: 700; margin-top: 8px; }
    .sub { text-align:center; font-size: 14px; margin-top: 8px; margin-bottom: 18px; color:#222; }

    table { width:100%; border-collapse: collapse; font-size: 15px; }
    td { border: 1px solid #333; padding: 14px 12px; vertical-align: middle; }
    .label { width: 33%; font-weight: 700; background:#f3f3f3; }
    .val { width: 67%; }

    .moneyLine { display:flex; justify-content: space-between; gap: 10px; }
    .moneyLine span:first-child { font-weight: 700; }
    .moneyLine span:last-child { font-weight: 700; }

    .signRow { width:100%; margin-top: 70px; display:flex; justify-content: space-between; gap: 20px; }
    .signBox { flex: 1; text-align:center; }
    .line { border-top: 1px solid #333; margin-bottom: 6px; }
    .signText { font-size: 18px; }
  </style>
</head>
<body>
  <div class="title">Receipt</div>
  <div class="sub">Receipt Voucher / Details</div>

  <table>
    <tr>
      <td class="label">Receipt To</td>
      <td class="val">${escapeHtml(formData.receiptTo || "-")}</td>
    </tr>
    <tr>
      <td class="label">From Date</td>
      <td class="val">${escapeHtml(fmtDDMMYYYY(formData.receiptDate))}</td>
    </tr>
    <tr>
      <td class="label">To Date</td>
      <td class="val">${escapeHtml(fmtDDMMYYYY(formData.date))}</td>
    </tr>
    <tr>
      <td class="label">Process Name</td>
      <td class="val">${escapeHtml(formData.processName || "")}</td>
    </tr>
    <tr>
      <td class="label">Name</td>
      <td class="val">${escapeHtml(formData.name || "")}</td>
    </tr>
    <tr>
      <td class="label">Agent Name</td>
      <td class="val">${escapeHtml(formData.agentName || "")}</td>
    </tr>
    <tr>
      <td class="label">Payment Through</td>
      <td class="val">${escapeHtml(formData.paymentThrough || "")}</td>
    </tr>

    <tr>
      <td class="label">Amount</td>
      <td class="val">
        <div class="moneyLine"><span>Cash</span><span>${escapeHtml(fmtMoney2(cash))}</span></div>
        <div class="moneyLine" style="margin-top:6px;"><span>Discount</span><span>${escapeHtml(fmtMoney2(disc))}</span></div>
        <div class="moneyLine" style="margin-top:10px; font-size: 16px;">
          <span>Total</span><span>${escapeHtml(fmtMoney2(total))}</span>
        </div>
      </td>
    </tr>

    <tr>
      <td class="label">Balance (DR/CR)</td>
      <td class="val">${balAbs ? `${escapeHtml(balAbs)} ${escapeHtml(balDrCr)}` : ""}</td>
    </tr>

    <tr>
      <td class="label">Remarks</td>
      <td class="val">${escapeHtml(formData.remarks || "")}</td>
    </tr>

    <tr>
      <td class="label">Amount in Words</td>
      <td class="val">${escapeHtml(amountWords || "")}</td>
    </tr>
  </table>

  <div class="signRow">
    <div class="signBox">
      <div class="line"></div>
      <div class="signText">Prepared By</div>
    </div>
    <div class="signBox">
      <div class="line"></div>
      <div class="signText">Checked By</div>
    </div>
    <div class="signBox">
      <div class="line"></div>
      <div class="signText">Receiver Signature</div>
    </div>
  </div>

  <script>window.onload=function(){window.focus();window.print();};</script>
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
    if (!w) return alert("Unable to open print preview.");

    const d = w.document;
    d.open();
    d.write(html);
    d.close();
  };

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
      setFormData((prev) => ({ ...prev, amount: num }));
      return;
    }

    if (name === "balance") {
      if (formData.receiptTo === "Party" || formData.receiptTo === "Broker") return;
      const clean = sanitizeDecimal(value, { allowNegative: true, decimals: 2 });
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
      const partyProcess = p.process?.processName ? p.process.processName.toLowerCase() : "";
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
      agentName: formData.receiptTo === "Broker" ? formData.name || "" : formData.agentName || "",
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

      const amtNum = rec.amount === null || rec.amount === undefined ? "" : Number(rec.amount);
      const discNum = rec.discountAmount ? Number(rec.discountAmount) : 0;
      const balNum = rec.balance === null || rec.balance === undefined ? "" : Number(rec.balance);

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

    
    setModalRows([]);
    setReceiveByKey({});
    setDiscountByKey({});
    setAppliedCashTotal(0);
    setAppliedDiscountTotal(0);
    setShowPendingModal(false);

    autoOpenedPartyRef.current = "";

    if (showToast) Swal.fire("Cleared", "Ready for new entry", "success");
  };

  // Show (Party)
  const handleShow = async () => {
    if (formData.receiptTo !== "Party") {
      Swal.fire("Info", "Show is available for Party only", "info");
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

  // Keep a copy for display (pendingRows) - derived from FIFO
  useEffect(() => {
    
  }, [pendingBillsFifo]);

  // ================= UI =================
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
                disabled={formData.receiptTo === "Broker"}
                placeholder={formData.receiptTo === "Broker" ? "Disabled for Broker" : "Click to select process (optional)"}
                className={`border p-2 w-full rounded ${formData.receiptTo !== "Broker" ? "cursor-pointer bg-gray-50 hover:bg-gray-100" : "bg-gray-100 cursor-not-allowed"}`}
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
                className={`border p-2 w-full rounded ${formData.receiptTo !== "Other" ? "cursor-pointer bg-gray-50 hover:bg-gray-100" : ""}`}
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
                  className={`border p-2 w-full rounded ${formData.receiptTo !== "Party" ? "cursor-pointer bg-gray-50 hover:bg-gray-100" : "bg-gray-100 cursor-not-allowed"}`}
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
              {formData.discountAmount > 0 ? (
                <div className="text-xs text-orange-700 mt-1">Discount: {fmtMoney2(formData.discountAmount)}</div>
              ) : null}
              {amountInWords && (
    <div className="text-blue-600 text-sm mt-1 font-medium">
        {amountInWords}
    </div>
)}
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
                  className={`border p-2 w-full rounded ${formData.receiptTo === "Party" || formData.receiptTo === "Broker" ? "bg-gray-50 cursor-not-allowed" : ""}`}
                />
                <input type="text" value={balanceDrCr} readOnly placeholder="Dr/Cr" className="border p-2 w-20 rounded bg-gray-50 text-center" />
              </div>
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
  disabled={saving}
  className={`px-4 py-2 rounded text-white ${
    saving
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-green-500 hover:bg-green-600"
  }`}
>
  {saving ? "Saving..." : editingId ? "Update" : "Save"}
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
                                type="button"
                                disabled={pendingSideMemo === "CREDIT"}
                                onClick={() => applyNextForRow(r)}
                                className="ml-2 px-3 py-1 text-xs bg-indigo-700 text-white rounded hover:bg-indigo-800 disabled:bg-gray-300 disabled:text-gray-600"
                              >
                                Next
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 p-3 border rounded bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
                <div className="text-sm">
                  <b>Total:</b> {fmtMoney2(selectedSettlementTotal)} &nbsp;|&nbsp; <b>Pending Left:</b>{" "}
                  {fmtMoney2(modalPendingTotal)}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalRows(pendingBillsFifo.map((x) => ({ ...x })));
                      setReceiveByKey({});
                      setDiscountByKey({});
                      setAppliedCashTotal(0);
                      setAppliedDiscountTotal(0);
                    }}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={applySelectedTotalAndClose}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={pendingSideMemo === "CREDIT"}
                  >
                    Done
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPendingModal(false);
                      focusAmount();
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-600">
                FIFO rule enforced: oldest pending must be settled first. Discount participates in settlement. Purple = Partial bill.
              </div>
            </div>
          </div>
        )}

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

                    const drcr = (() => {
                      if (r.balance === null || r.balance === undefined) return "";
                      const n = Number(r.balance);
                      if (!Number.isFinite(n) || n === 0) return "";
                      return n > 0 ? "Dr" : "Cr";
                    })();

                    const balAbs = absVal(r.balance);

                    return (
                      <tr key={r.id ?? idx}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">{r.receiptDate ? new Date(r.receiptDate).toLocaleDateString() : "-"}</td>
                        <td className="border p-2">{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                        <td className="border p-2">{r.receiptTo}</td>
                        <td className="border p-2">{name || "-"}</td>
                        <td className="border p-2 text-right">{r.amount ?? "-"}</td>
                        <td className="border p-2 text-right">{toNum(r.discountAmount ?? 0).toFixed(2)}</td>
                        <td className="border p-2 text-right">{r.balance == null ? "-" : balAbs}</td>
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
          <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 max-w-5xl mx-auto">
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
              <button onClick={() => setShowAgentModal(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
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
                        d.receiptTo === "Employee" ? d.employeeName : d.receiptTo === "Broker" ? d.agentName : d.partyName;
                      const rowKey = d.id ?? i;

                      const drcr = getDrCr(d.balance);
                      const balAbs = absVal(d.balance);

                      return (
                        <tr key={rowKey}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">{d.receiptDate ? new Date(d.receiptDate).toLocaleDateString() : "-"}</td>
                          <td className="border p-2">{d.date ? new Date(d.date).toLocaleDateString() : "-"}</td>
                          <td className="border p-2">{d.receiptTo}</td>
                          <td className="border p-2">{name || "-"}</td>
                          <td className="border p-2 text-right">{d.amount ?? "-"}</td>
                          <td className="border p-2 text-right">{toNum(d.discountAmount ?? 0).toFixed(2)}</td>
                          <td className="border p-2 text-right">{d.balance == null ? "-" : balAbs}</td>
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