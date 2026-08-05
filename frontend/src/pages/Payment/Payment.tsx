import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import { computeLedgerFifo, type BaseLedgerEvent, type TxType as LedgerTxType } from "../../api/ledgerFifo";

type PaymentToType = "Party" | "Employee" | "Other" | "";
type BalanceType = "CR" | "DR";

// ================= Payment Mode DTO =================
interface PaymentMode {
  id: number;
  bankNameOrUpiId: string;
  accountNo: string;
}

interface PaymentRecord {
  id: number;
  paymentTo: PaymentToType | string;
  paymentDate?: string;
  date?: string;
  processName?: string;
  partyName?: string;
  employeeName?: string;
  paymentThrough?: string;

  amount?: number | string; // ✅ CASH
  discountAmount?: number | string; // ✅ DISCOUNT

  balance?: number | string;
  remarks?: string;

  employeeCode?: string;
  employeeId?: string;
  code?: string;
}

// ================= Salary sources (for Employee balance) =================
type CuttingEntryDTO = {
  serialNo: string;
  date: string;
  employeeId?: string;
  employeeName?: string;
  lotRows: { pcs: string; rate: string; amount: string }[];
};

type ProductionReceiptDTO = {
  id: number;
  dated?: string;
  date?: string;
  employeeName?: string;
  employee?: string;
  rows: { pcs?: string; piece?: string; rate?: string; amount?: string }[];
};

// ================= Party sources (for Party balance like Account Statement) =================
type DispatchChallan = {
  id: number;
  challanNo: string;
  date?: string;
  dated?: string;
  partyName: string;
  netAmt?: number | string;
};

type OtherDispatchChallan = {
  id: number;
  challanNo: string;
  date?: string;
  partyName: string;
  netAmt?: number | string;
};

type PurchaseOrderDoc = { id: number; orderNo: string; date?: string; partyName: string; amount: number };
type PurchaseEntryDoc = { id: number; challanNo: string; date?: string; partyName: string; amount: number };
type PurchaseReturnDoc = { id: number; challanNo: string; date?: string; partyName: string; amount: number };

type JobInwardDoc = {
  id: string | number;
  challanNo: string;
  date: string;
  partyName: string;
  amount: number;
};

type ReceiptDoc = {
  id: number;
  receiptDate?: string;
  paymentDate?: string;
  date?: string;
  receiptTo?: string;
  paymentTo?: string;
  partyName?: string;
  amount?: number | string; // cash
  discountAmount?: number | string; // ✅ discount (must participate in FIFO)
  remarks?: string; // ✅ fallback discount parsing if needed
  paymentThrough?: string;
};

const routes = {
  create: "/payment/create",
  list: "/payment",
  get: (id: number) => `/payment/${id}`,
  update: (id: number) => `/payment/${id}`,
  delete: (id: number) => `/payment/${id}`,
  names: (type: PaymentToType) => `/payment/names/${type}`,
  employees: "/employees",
  processes: "/process/list",
  paymentModes: "/payment/payment-mode",

  // Employee balance sources
  cuttingEntries: "/cutting-entries",
  productionReceipt: "/production-receipt",

  // Party balance sources (same rule as Account Statement)
  parties: "/party/all",
  dispatch: "/dispatch-challan",
  otherDispatch: "/other-dispatch-challan",
  purchaseOrders: "/purchase-orders",
  purchaseEntry: "/purchase-entry",
  purchaseReturns: "/purchase-returns",
  jobInward: "/job-inward-challan",
};

type FormDataState = {
  paymentTo: PaymentToType;
  paymentDate: string;
  processName: string;
  partyName: string;
  paymentThrough: string;

  amount: number | "";        // ✅ CASH
  discountAmount: number;     // ✅ DISCOUNT (always number; default 0)

  balance: number | "";
  remarks: string;
  date: string;
};
type PendingEntryRow = {
  rowKey: string;
  docKey: string;
  txType: TxType | "Opening";
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
// ================= Utils =================
const pad2 = (n: number) => String(n).padStart(2, "0");

const parseYMDLocalToTS = (ymd: string) => {
  const m = String(ymd || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return NaN;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  return new Date(y, mo - 1, da).getTime();
};

const parseDMYLocalToTS = (dmy: string) => {
  const m = String(dmy || "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return NaN;
  const da = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  return new Date(y, mo - 1, da).getTime();
};

const parseAnyDateToLocalDayTS = (value: any) => {
  if (!value) return NaN;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return NaN;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  }

  if (typeof value === "number") {
    const d = new Date(value);
    if (isNaN(d.getTime())) return NaN;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  const s = String(value).trim();
  if (!s) return NaN;

  const isoDateMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return parseYMDLocalToTS(isoDateMatch[1]);

  const dmyTS = parseDMYLocalToTS(s);
  if (Number.isFinite(dmyTS)) return dmyTS;

  const d = new Date(s);
  if (isNaN(d.getTime())) return NaN;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const getFirstOfMonthIsoFrom = (isoYMD: string) => {
  const ts = parseYMDLocalToTS(isoYMD);
  if (!Number.isFinite(ts)) return isoYMD;
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
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

const norm = (s: any) => String(s ?? "").trim().toLowerCase();
const round2 = (n: number) => Number((Number(n || 0) || 0).toFixed(2));
const hashToInt = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 0;
};

const fmt2 = (n: number) =>
  (Number(n || 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const drCrLabel = (signed: number) => {
  if (!Number.isFinite(signed) || signed === 0) return { side: "", abs: 0, text: "0.00" };
  const side = signed > 0 ? "DR" : "CR";
  const abs = Math.abs(signed);
  return { side, abs, text: `${fmt2(abs)} ${side}` };
};
const fmtDDMMYYYY = (iso: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const txLabel = (t: any): string => {
  switch (String(t || "").trim()) {
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
// ✅ no-useless-escape fixed here: [^\d.-] (no \-)
const sanitizeDecimal = (raw: string, opts?: { allowNegative?: boolean; decimals?: number }) => {
  const allowNegative = !!opts?.allowNegative;
  const decimals = typeof opts?.decimals === "number" ? opts.decimals : 2;

  let s = String(raw ?? "");
  s = s.replace(/[^\d.-]/g, ""); // keep digits, dot, minus

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
  x %= 10000000;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);

  const lakh = Math.floor(x / 100000);
  x %= 100000;
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);

  const thousand = Math.floor(x / 1000);
  x %= 1000;
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);

  if (x) parts.push(threeDigits(x));

  return parts.join(" ").replace(/\s+/g, " ").trim();
};

const amountToWordsINR = (val: number | "" | null | undefined) => {
  if (val === "" || val === null || val === undefined) return "";
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

// ================= DR/CR RULE =================
type TxType =
  | "Dispatch"
  | "OtherDispatch"
  | "PurchaseOrder"
  | "PurchaseEntry"
  | "PurchaseReturn"
  | "JobInward"
  | "Payment"
  | "Receipt";

const getDrCr = (source: TxType, amount: number) => {
  const amt = toNum(amount);

  if (source === "Payment") return { debit: amt, credit: 0 };
  if (source === "Receipt") return { debit: 0, credit: amt };

  if (source === "PurchaseOrder") return { debit: 0, credit: amt };
  if (source === "PurchaseEntry") return { debit: 0, credit: amt };

  if (source === "OtherDispatch") return { debit: 0, credit: amt };
  if (source === "PurchaseReturn") return { debit: amt, credit: 0 };
  if (source === "JobInward") return { debit: 0, credit: amt };

  return { debit: amt, credit: 0 };
};



const PaymentForm: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
    

   const [formData, setFormData] = useState<FormDataState>({
    paymentTo: "",
    paymentDate: today,
    processName: "",
    partyName: "",
    paymentThrough: "Cash",
    amount: "",
    discountAmount: 0,
    balance: "",
    remarks: "",
    date: today,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ typed text (prevents wheel-change issues)
  const [amountText, setAmountText] = useState<string>("");
  const [balanceText, setBalanceText] = useState<string>("");
  const amountRef = useRef<HTMLInputElement | null>(null);
  const employeeSearchRef = useRef<HTMLInputElement>(null);
const partySearchRef = useRef<HTMLInputElement>(null);
const processSearchRef = useRef<HTMLInputElement>(null);
  const focusAmount = useCallback(() => setTimeout(() => amountRef.current?.focus(), 0), []);
  // Lists and modals
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  const [partyList, setPartyList] = useState<string[]>([]);
  const [partySearchText, setPartySearchText] = useState("");
  const [showPartyModal, setShowPartyModal] = useState(false);

  const [processList, setProcessList] = useState<any[]>([]);
  const [processSearchText, setProcessSearchText] = useState("");
  const [showProcessModal, setShowProcessModal] = useState(false);

  const [showList, setShowList] = useState(false);
  const [paymentList, setPaymentList] = useState<PaymentRecord[]>([]);
  const [searchText, setSearchText] = useState("");

  const [savedRecords, setSavedRecords] = useState<PaymentRecord[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);

  // ================= Employee balance sources =================
  const [cuttingEntries, setCuttingEntries] = useState<CuttingEntryDTO[]>([]);
  const [productionReceipts, setProductionReceipts] = useState<ProductionReceiptDTO[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<{ name: string; code?: string } | null>(null);

  // ================= Party balance sources =================
  const [dispatchChallans, setDispatchChallans] = useState<DispatchChallan[]>([]);
    const [partyMasters, setPartyMasters] = useState<
    { id: number; partyName: string; openingBalance?: number | null; openingBalanceType?: BalanceType }[]
  >([]);
  const [otherDispatchChallans, setOtherDispatchChallans] = useState<OtherDispatchChallan[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDoc[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntryDoc[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnDoc[]>([]);
  const [jobInwards, setJobInwards] = useState<JobInwardDoc[]>([]);
  const [receipts, setReceipts] = useState<ReceiptDoc[]>([]);
  const [balanceInfoLoading, setBalanceInfoLoading] = useState(false);

  
  // ================= FIFO Pending (Party) - Receipt-style modal =================
  const [pendingSide, setPendingSide] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [showPendingModal, setShowPendingModal] = useState(false);

  const [modalRows, setModalRows] = useState<PendingEntryRow[]>([]);
  const [receiveByKey, setReceiveByKey] = useState<Record<string, string>>({});
  const [discountByKey, setDiscountByKey] = useState<Record<string, string>>({});

  const [appliedCashTotal, setAppliedCashTotal] = useState(0);
  const [appliedDiscountTotal, setAppliedDiscountTotal] = useState(0);

  const receiveInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const nextFocusKeyRef = useRef<string>("");

  const autoOpenedPartyRef = useRef<string>("");

  // manual paid status map (docKey -> manualPaidUser)
  const [manualPaidUserMap, setManualPaidUserMap] = useState<Map<string, boolean>>(new Map());
    // ✅ used to force manualPaid status refresh even if docKeys unchanged (same as Receipt)
  const [ledgerVersion, setLedgerVersion] = useState(0);

   const asOfIso = useMemo(
    () => String(formData.date || formData.paymentDate || today).slice(0, 10),
    [formData.date, formData.paymentDate, today],
  );

  const selectedPartyName = useMemo(
    () => (formData.paymentTo === "Party" ? String(formData.partyName || "").trim() : ""),
    [formData.paymentTo, formData.partyName],
  );
  const selectedPartyKey = useMemo(() => norm(selectedPartyName), [selectedPartyName]);

      const ledgerEventsForParty: BaseLedgerEvent[] = useMemo(() => {
    if (!selectedPartyName) return [];

    const asOfT = endOfDayTime(asOfIso);
    if (asOfT === -Infinity) return [];

    const events: BaseLedgerEvent[] = [];

    const addEvent = (e: BaseLedgerEvent) => {
      if (!e.docKey) return;

      const d = String(e.date || "").slice(0, 10);
      if (!d) return;

      if (toTime(d) === -Infinity) return;
      if (toTime(d) > asOfT) return;

      events.push({ ...e, date: d });
    };

    // Opening (FIFO event)
    {
      const pm = partyMasters.find((x) => norm(x.partyName) === selectedPartyKey);
      const partyId = pm?.id ?? selectedPartyKey;

      const openingAmt = toNum(pm?.openingBalance ?? 0);
      const typ: BalanceType = (pm?.openingBalanceType as BalanceType) || "DR";
      const signedOpening = typ === "CR" ? -openingAmt : openingAmt;

      const opDebit = signedOpening > 0 ? signedOpening : 0;
      const opCredit = signedOpening < 0 ? Math.abs(signedOpening) : 0;

      if (opDebit > 0 || opCredit > 0) {
        const times: number[] = [];

        const pushTime = (d: any) => {
          const t = toTime(d);
          if (t !== -Infinity && t <= asOfT) times.push(t);
        };

        dispatchChallans.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || x.dated || ""));
        otherDispatchChallans.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        purchaseOrders.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        purchaseEntries.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        purchaseReturns.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));
        jobInwards.forEach((x) => norm(x.partyName) === selectedPartyKey && pushTime(x.date || ""));

        // ✅ existing payments (Receipt.tsx behavior: if paymentTo missing, treat as Party)
        (savedRecords || []).forEach((p) => {
          const paymentTo = String((p as any)?.paymentTo ?? "").trim();
          const isPartyPayment = paymentTo ? paymentTo === "Party" : true;
          if (!isPartyPayment) return;

          if (norm((p as any)?.partyName || "") !== selectedPartyKey) return;
          pushTime((p as any)?.paymentDate || (p as any)?.date || "");
        });

        // receipts
        receipts.forEach((r) => {
          const receiptTo = String((r as any)?.receiptTo ?? (r as any)?.paymentTo ?? "").trim();
          if (receiptTo && receiptTo !== "Party") return;
          if (norm((r as any)?.partyName || "") !== selectedPartyKey) return;
          pushTime((r as any)?.receiptDate || (r as any)?.paymentDate || (r as any)?.date || "");
        });

        const earliest = times.length ? Math.min(...times) : toTime(asOfIso);
        const openingDateIso =
          earliest !== -Infinity
            ? new Date(earliest - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            : asOfIso;

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
    dispatchChallans.forEach((dc) => {
      if (norm(dc.partyName) !== selectedPartyKey) return;
      const { debit, credit } = getDrCr("Dispatch", toNum(dc.netAmt));
      addEvent({
        id: dc.id,
        date: String(dc.date || dc.dated || "").slice(0, 10),
        partyName: dc.partyName,
        brokerName: "",
        orderNo: String(dc.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "Dispatch" as LedgerTxType,
        docKey: `Dispatch:${dc.id}`,
      });
    });

    // OtherDispatch
    otherDispatchChallans.forEach((od) => {
      if (norm(od.partyName) !== selectedPartyKey) return;
      const { debit, credit } = getDrCr("OtherDispatch", toNum(od.netAmt));
      addEvent({
        id: od.id,
        date: String(od.date || "").slice(0, 10),
        partyName: od.partyName,
        brokerName: "",
        orderNo: String(od.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "OtherDispatch" as LedgerTxType,
        docKey: `OtherDispatch:${od.id}`,
      });
    });

    // PurchaseOrder
    purchaseOrders.forEach((po) => {
      if (norm(po.partyName) !== selectedPartyKey) return;
      const { debit, credit } = getDrCr("PurchaseOrder", toNum(po.amount));
      addEvent({
        id: po.id,
        date: String(po.date || "").slice(0, 10),
        partyName: po.partyName,
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
    purchaseEntries.forEach((pe) => {
      if (norm(pe.partyName) !== selectedPartyKey) return;
      const { debit, credit } = getDrCr("PurchaseEntry", toNum(pe.amount));
      addEvent({
        id: pe.id,
        date: String(pe.date || "").slice(0, 10),
        partyName: pe.partyName,
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
    purchaseReturns.forEach((pr) => {
      if (norm(pr.partyName) !== selectedPartyKey) return;
      const { debit, credit } = getDrCr("PurchaseReturn", toNum(pr.amount));
      addEvent({
        id: pr.id,
        date: String(pr.date || "").slice(0, 10),
        partyName: pr.partyName,
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
    jobInwards.forEach((ji) => {
      if (norm(ji.partyName) !== selectedPartyKey) return;
      const { debit, credit } = getDrCr("JobInward", toNum(ji.amount));
      addEvent({
        id: typeof ji.id === "number" ? ji.id : hashToInt(String(ji.id)),
        date: String(ji.date || "").slice(0, 10),
        partyName: ji.partyName,
        brokerName: "",
        orderNo: String(ji.challanNo || ""),
        mode: "",
        debit,
        credit,
        type: "JobInward" as LedgerTxType,
        docKey: `JobInward:${String(ji.id)}`,
      });
    });

    // ✅ Existing Payments (settlement includes CASH + DISCOUNT) — Receipt.tsx party-payment inclusion logic
    (savedRecords || []).forEach((p) => {
      const paymentTo = String((p as any)?.paymentTo ?? "").trim();
      const isPartyPayment = paymentTo ? paymentTo === "Party" : true;
      if (!isPartyPayment) return;

      if (norm((p as any)?.partyName || "") !== selectedPartyKey) return;

      const totalSettle = toNum((p as any)?.amount) + toNum((p as any)?.discountAmount ?? 0);
      const { debit, credit } = getDrCr("Payment", totalSettle);

      addEvent({
        id: Number((p as any)?.id),
        date: String((p as any)?.paymentDate || (p as any)?.date || "").slice(0, 10),
        partyName: String((p as any)?.partyName || "").trim(),
        brokerName: "",
        orderNo: `PAY-${(p as any)?.id}`,
        mode: "",
        debit,
        credit,
        type: "Payment" as LedgerTxType,
        docKey: `Payment:${(p as any)?.id}`,
      });
    });

    // Receipts (credit includes CASH + DISCOUNT)
    receipts.forEach((r) => {
      const receiptTo = String((r as any)?.receiptTo ?? (r as any)?.paymentTo ?? "").trim();
      if (receiptTo && receiptTo !== "Party") return;
      if (norm((r as any)?.partyName || "") !== selectedPartyKey) return;

      const cash = toNum((r as any)?.amount ?? 0);
      const disc = toNum((r as any)?.discountAmount ?? 0) || parseDiscountFromRemarks((r as any)?.remarks);
      const totalCredit = cash + disc;

      addEvent({
        id: Number((r as any)?.id),
        date: String((r as any)?.receiptDate || (r as any)?.paymentDate || (r as any)?.date || "").slice(0, 10),
        partyName: String((r as any)?.partyName || "").trim(),
        brokerName: "",
        orderNo: `REC-${(r as any)?.id}`,
        mode: "",
        debit: 0,
        credit: totalCredit,
        type: "Receipt" as LedgerTxType,
        docKey: `Receipt:${(r as any)?.id}`,
      });
    });

    return events;
  }, [
    selectedPartyName,
    selectedPartyKey,
    asOfIso,
    partyMasters,
    dispatchChallans,
    otherDispatchChallans,
    purchaseOrders,
    purchaseEntries,
    purchaseReturns,
    jobInwards,
    receipts,
    savedRecords,
  ]);

  const closingSignedAsOf = useMemo(
    () => (ledgerEventsForParty || []).reduce((s, e) => s + toNum(e.debit) - toNum(e.credit), 0),
    [ledgerEventsForParty],
  );

  const pendingSideMemo = useMemo<"DEBIT" | "CREDIT">(
    () => (closingSignedAsOf >= 0 ? "DEBIT" : "CREDIT"),
    [closingSignedAsOf],
  );

  useEffect(() => {
    setPendingSide(pendingSideMemo);
  }, [pendingSideMemo]);

  // ManualPaid statuses for bill side (same workflow)
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

  const refreshManualPaidUserMap = useCallback(async (keys: string[]) => {
    const uniqKeys = Array.from(new Set((keys || []).map((k) => String(k || "").trim()).filter(Boolean)));

    if (!uniqKeys.length) {
      setManualPaidUserMap(new Map());
      return;
    }

    try {
      const res = await api.post<LedgerBillStatusDTO[]>("/ledger-status/bulk-get", { keys: uniqKeys });
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
  }, []);

    useEffect(() => {
    refreshManualPaidUserMap(billDocKeysForStatus);
  }, [billDocKeysForStatus, refreshManualPaidUserMap, ledgerVersion]);

   useEffect(() => {
    const h = () => setLedgerVersion((x) => x + 1);
    window.addEventListener("ledger:changed", h);
    return () => window.removeEventListener("ledger:changed", h);
  }, []);

  // Swap for CREDIT-side pending so FIFO engine stays single-source
  const fifoEventsForCalc: BaseLedgerEvent[] = useMemo(() => {
    if (pendingSideMemo === "DEBIT") return ledgerEventsForParty;
    return ledgerEventsForParty.map((e) => ({ ...e, debit: toNum(e.credit), credit: toNum(e.debit) }));
  }, [ledgerEventsForParty, pendingSideMemo]);

  const fifoResult = useMemo(() => {
    return computeLedgerFifo({
      events: fifoEventsForCalc,
      asOfDateIso: asOfIso,
      manualPaidUserByDocKey: manualPaidUserMap,
    });
  }, [fifoEventsForCalc, asOfIso, manualPaidUserMap]);

  const partialBillKeys = fifoResult.partialBillKeys;

  const pendingBillsFifo: PendingEntryRow[] = useMemo(() => {
    if (!selectedPartyName) return [];
    return fifoResult.bills
      .filter((b) => b.pending > 0.00001)
      .filter((b) => !b.manualPaidEffective)
      .map((b) => ({
        rowKey: b.docKey,
        docKey: b.docKey,
        txType: (b.type as any) === "Opening" ? "Opening" : (b.type as any),
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

  // Modal totals
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

  const applyAmountText = useCallback((raw: string) => {
    const clean = sanitizeDecimal(raw, { allowNegative: false, decimals: 2 });
    setAmountText(clean);
    const num: number | "" = isPartialNumberText(clean) ? "" : Number(clean);
    setFormData((prev) => ({ ...prev, amount: num }));
  }, []);

    const openPendingModal = useCallback(() => {
    if (!pendingBillsFifo.length) {
      Swal.fire("Info", "No pending entries found", "info");
      return;
    }

    // ✅ DEBIT-side note (Payment cannot settle DEBIT-side pending; Receipt does)
    if (pendingSideMemo === "DEBIT") {
      Swal.fire(
        "Info",
        "Pending Side is DEBIT. Payment cannot settle these pending entries. Use Receipt to settle DEBIT-side pending.",
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

   const applyNextForRow = useCallback(
    (row: PendingEntryRow) => {
      // ✅ only allow settlement when pending side is CREDIT (Payment)
      if (pendingSideMemo === "DEBIT") {
        Swal.fire("Info", "DEBIT-side pending cannot be settled by Payment. Use Receipt.", "info");
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
    if (pendingSideMemo === "DEBIT") {
      Swal.fire("Info", "DEBIT-side pending cannot be settled by Payment. Use Receipt.", "info");
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

    // Apply allocations as payment totals (cash/discount)
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

    // ✅ cap settlement to current FIFO pending total
    const cap = Math.min(totalSettlement, pendingTotal);
    if (cap < totalSettlement - 1e-6) {
      const factor = cap / (totalSettlement || 1);
      cashTotal = +(cashTotal * factor).toFixed(2);
      discTotal = +(discTotal * factor).toFixed(2);
    }

    applyAmountText(cashTotal.toFixed(2));
    setFormData((prev) => ({ ...prev, discountAmount: +discTotal.toFixed(2) }));

    // preview pending after allocation (Payment settles CREDIT-side)
    const pendingAfter = +(Math.max(0, pendingTotal - (cashTotal + discTotal))).toFixed(2);
    const signed = pendingAfter > 0.00001 ? -pendingAfter : "";
    const balVal: number | "" = signed === "" ? "" : Number(signed);

    setFormData((prev) => ({ ...prev, balance: balVal }));
    setBalanceText(balVal === "" ? "" : String(balVal));

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

  // ✅ Auto-open once after Party selection (exactly like Receipt module)
  useEffect(() => {
    if (editingId) return;
    if (formData.paymentTo !== "Party") return;
    if (!selectedPartyKey) return;

    if (autoOpenedPartyRef.current === selectedPartyKey) return;

    if (pendingBillsFifo.length > 0) {
      autoOpenedPartyRef.current = selectedPartyKey;
      openPendingModal();
    }
  }, [editingId, formData.paymentTo, selectedPartyKey, pendingBillsFifo.length, openPendingModal]);

  const loadProcesses = async () => {
    try {
      const r = await api.get(routes.processes);
      setProcessList(Array.isArray(r.data) ? r.data : []);
    } catch {
      Swal.fire("Error", "Failed to load processes", "error");
    }
  };

  const loadEmployees = async () => {
    try {
      const r = await api.get(routes.employees);
      setEmployeeList(Array.isArray(r.data) ? r.data : []);
    } catch {
      Swal.fire("Error", "Failed to load employees", "error");
    }
  };
    useEffect(() => {
    // ✅ Required for Party Pending (FIFO) + removes no-unused-vars warnings
    loadProcesses();
    loadEmployees();
    loadPaymentModes();
    loadSalarySources();
    loadPartySources();
    loadSavedRecords();
  }, []);
  useEffect(() => {
  if (showEmployeeModal) {
    setTimeout(() => employeeSearchRef.current?.focus(), 100);
  }
}, [showEmployeeModal]);

useEffect(() => {
  if (showPartyModal) {
    setTimeout(() => partySearchRef.current?.focus(), 100);
  }
}, [showPartyModal]);

useEffect(() => {
  if (showProcessModal) {
    setTimeout(() => processSearchRef.current?.focus(), 100);
  }
}, [showProcessModal]);
    useEffect(() => {
    const h = () => {
      // ✅ Keep Party Pending sources in sync with AccountStatement/Receipt updates
      loadPartySources();
      loadSavedRecords();
      loadSalarySources();
    };

    window.addEventListener("ledger:changed", h);
    return () => window.removeEventListener("ledger:changed", h);
  }, []);
    useEffect(() => {
    if (formData.paymentTo !== "Party") return;
    if (!selectedPartyKey) return;

    loadPartySources();
    loadSavedRecords();
  }, [formData.paymentTo, selectedPartyKey, asOfIso]);

  const loadPartyNames = async () => {
    try {
      const res = await api.get(routes.names("Party"));
      setPartyList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPartyList([]);
      console.error("Error fetching party names:", err);
      Swal.fire("Error", "Failed to load party names", "error");
    }
  };

  const loadSavedRecords = async () => {
    try {
      const res = await api.get(routes.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setSavedRecords(data);
    } catch (err) {
      console.error("Error loading saved records:", err);
    }
  };

  const loadPaymentModes = async () => {
    try {
      const res = await api.get(routes.paymentModes);
      setPaymentModes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading payment modes:", err);
      Swal.fire("Error", "Failed to load payment modes", "error");
    }
  };

  // -------- Employee salary sources --------
  const loadSalarySources = async () => {
    try {
      const [cRes, pRes] = await Promise.all([api.get(routes.cuttingEntries), api.get(routes.productionReceipt)]);
      const cuttingList: CuttingEntryDTO[] = Array.isArray(cRes.data) ? cRes.data : cRes.data?.data || [];
      const prodList: ProductionReceiptDTO[] = Array.isArray(pRes.data) ? pRes.data : pRes.data?.data || [];
      setCuttingEntries(cuttingList);
      setProductionReceipts(prodList);
    } catch (e) {
      console.error("Failed to load salary sources:", e);
    }
  };

  // -------- Party statement sources --------
const loadPartySources = async () => {
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

  try {
    setBalanceInfoLoading(true);

    const [partyRaw, dcRaw, odcRaw, poRaw, peRaw, prRaw, jobInRaw] = await Promise.all([
      safeGet<any[]>(routes.parties),
      safeGet<any[]>(routes.dispatch),
      safeGet<any[]>(routes.otherDispatch),
      safeGet<any[]>(routes.purchaseOrders),
      safeGet<any[]>(routes.purchaseEntry),
      safeGet<any[]>(routes.purchaseReturns),
      safeGet<any[]>(routes.jobInward),
    ]);

    const recRaw = await safeGetReceipts();

    const partyArr = Array.isArray(partyRaw) ? partyRaw : [];

    // ✅ Party masters for Opening (FIFO)
    setPartyMasters(
      partyArr
        .map((p: any) => ({
          id: Number(p.id),
          partyName: String(p.partyName ?? "").trim(),
          openingBalance: p.openingBalance == null ? null : Number(p.openingBalance),
          openingBalanceType: (String(p.openingBalanceType ?? "DR").toUpperCase() as BalanceType) || "DR",
        }))
        .filter((x: any) => Number.isFinite(x.id) && x.partyName),
    );

    const partyIdToName = new Map<string, string>();
    partyArr.forEach((p: any) => partyIdToName.set(String(p.id), String(p.partyName || "").trim()));

    setDispatchChallans(
      (Array.isArray(dcRaw) ? dcRaw : []).map((dc: any) => ({
        id: Number(dc.id),
        challanNo: String(dc.challanNo ?? ""),
        date: dc.date || dc.dated || "",
        dated: dc.dated,
        partyName: String(dc.partyName ?? "").trim(),
        netAmt: dc.netAmt,
      })),
    );

    setOtherDispatchChallans(
      (Array.isArray(odcRaw) ? odcRaw : []).map((od: any) => ({
        id: Number(od.id),
        challanNo: String(od.challanNo ?? ""),
        date: od.date || "",
        partyName: String(od.partyName ?? "").trim(),
        netAmt: od.netAmt,
      })),
    );

    setPurchaseOrders(
      (Array.isArray(poRaw) ? poRaw : []).map((po: any) => {
        const items: any[] = Array.isArray(po.items) ? po.items : [];
        const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
        return {
          id: Number(po.id),
          orderNo: String(po.orderNo ?? ""),
          date: po.date || "",
          partyName: String(po.partyName || po.party?.partyName || "").trim(),
          amount,
        };
      }),
    );

    setPurchaseEntries(
      (Array.isArray(peRaw) ? peRaw : []).map((e: any) => {
        const items: any[] = Array.isArray(e.items) ? e.items : [];
        const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
        return {
          id: Number(e.id),
          challanNo: String(e.challanNo ?? ""),
          date: e.date || "",
          partyName: String(e.partyName || e.party?.partyName || "").trim(),
          amount,
        };
      }),
    );

    setPurchaseReturns(
      (Array.isArray(prRaw) ? prRaw : []).map((r: any) => {
        const items: any[] = Array.isArray(r.items) ? r.items : [];
        const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);
        return {
          id: Number(r.id),
          challanNo: String(r.challanNo ?? ""),
          date: r.date || "",
          partyName: String(r.partyName || r.party?.partyName || "").trim(),
          amount,
        };
      }),
    );

    setJobInwards(
      (Array.isArray(jobInRaw) ? jobInRaw : [])
        .map((d: any) => {
          const rows: any[] = Array.isArray(d.rows) ? d.rows : [];
          const amount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
          const partyName = String(d.partyName ?? "").trim() || partyIdToName.get(String(d.partyId ?? "")) || "";
          return {
            id: d.id ?? "",
            challanNo: String(d.challanNo ?? ""),
            date: String(d.date ?? ""),
            partyName,
            amount,
          } as JobInwardDoc;
        })
        .filter((x) => x.partyName && x.date),
    );

    // ✅ Receipts must include discount + remarks (FIFO credit = cash + discount)
    setReceipts(
      (Array.isArray(recRaw) ? recRaw : []).map((r: any) => ({
        id: Number(r.id),
        receiptTo: String(r.receiptTo ?? r.paymentTo ?? "").trim(),
        paymentTo: String(r.paymentTo ?? "").trim(),
        receiptDate: r.receiptDate || r.paymentDate || r.date || "",
        paymentDate: r.paymentDate || "",
        date: r.date || "",
        partyName: String(r.partyName ?? "").trim(),
        amount: r.amount ?? 0,
        discountAmount: r.discountAmount ?? 0,
        remarks: String(r.remarks ?? ""),
        paymentThrough: String(r.paymentThrough ?? "").trim(),
      })),
    );
  } catch (e) {
    console.error("Failed to load party statement sources:", e);
  } finally {
    setBalanceInfoLoading(false);
  }
};

  // ================= Flatten salary (employee) =================
  const salaryRows = useMemo(() => {
    const rows: { date: string; employee: string; amount: number }[] = [];

    cuttingEntries.forEach((entry) => {
      const dated = entry.date || "";
      const employee = String(entry.employeeName || "").trim();
      (entry.lotRows || []).forEach((r) => {
        const piece = toNum(r.pcs);
        const rate = toNum(r.rate);
        const amount = toNum(r.amount) || piece * rate || 0;
        rows.push({ date: dated, employee, amount });
      });
    });

    productionReceipts.forEach((rec) => {
      const dated = rec.dated || rec.date || "";
      const employee = String(rec.employeeName || rec.employee || "").trim();
      (rec.rows || []).forEach((r) => {
        const piece = toNum(r.pcs || r.piece || 0);
        const rate = toNum(r.rate || 0);
        const amount = toNum(r.amount || 0) || piece * rate || 0;
        rows.push({ date: dated, employee, amount });
      });
    });

    return rows;
  }, [cuttingEntries, productionReceipts]);

  // ================= Employee Net =================
  const computedEmployeeNet = useMemo(() => {
    if (formData.paymentTo !== "Employee") return null;

    const empName = (selectedEmployee?.name || formData.partyName || "").trim();
    if (!empName) return null;

    const toISO = formData.paymentDate || today;
    const fromISO = getFirstOfMonthIsoFrom(toISO);

    const fromT = parseYMDLocalToTS(fromISO);
    const toT = parseYMDLocalToTS(toISO) + 24 * 60 * 60 * 1000 - 1;
    if (!Number.isFinite(fromT) || !Number.isFinite(toT)) return null;

    const empLower = empName.toLowerCase();

    const grossCurrent = salaryRows.reduce((s, r) => {
      if (r.employee.trim().toLowerCase() !== empLower) return s;
      const tt = parseAnyDateToLocalDayTS(r.date);
      if (!Number.isFinite(tt) || tt < fromT || tt > toT) return s;
      return s + (r.amount || 0);
    }, 0);

    const grossBefore = salaryRows.reduce((s, r) => {
      if (r.employee.trim().toLowerCase() !== empLower) return s;
      const tt = parseAnyDateToLocalDayTS(r.date);
      if (!Number.isFinite(tt) || tt >= fromT) return s;
      return s + (r.amount || 0);
    }, 0);

    const empPays = (Array.isArray(savedRecords) ? savedRecords : []).filter(
      (p) => String(p.paymentTo || "").trim() === "Employee"
    );

    const advBefore = empPays.reduce((s, p) => {
      const pName = String(p.employeeName || "").trim().toLowerCase();
      if (pName !== empLower) return s;
      const payTS = parseAnyDateToLocalDayTS(p.paymentDate ?? p.date ?? "");
      if (!Number.isFinite(payTS) || payTS >= fromT) return s;
      return s + toNum(p.amount);
    }, 0);

    const advCurrent = empPays.reduce((s, p) => {
      const pName = String(p.employeeName || "").trim().toLowerCase();
      if (pName !== empLower) return s;
      const payTS = parseAnyDateToLocalDayTS(p.paymentDate ?? p.date ?? "");
      if (!Number.isFinite(payTS) || payTS < fromT || payTS > toT) return s;
      return s + toNum(p.amount);
    }, 0);

    const opening = grossBefore - advBefore;
    const netSigned = grossCurrent - advCurrent + opening;

    return {
      fromISO,
      toISO,
      netSigned: round2(netSigned),
      grossCurrent: round2(grossCurrent),
      advCurrent: round2(advCurrent),
      opening: round2(opening),
    };
  }, [formData.paymentTo, formData.partyName, formData.paymentDate, savedRecords, salaryRows, selectedEmployee, today]);

  // ================= Party Balance =================
 const computedPartyBalance = useMemo(() => {
  if (formData.paymentTo !== "Party") return null;

  const partyName = String(formData.partyName || "").trim();
  if (!partyName) return null;

  const toISO = formData.paymentDate || today;
  const toT = parseYMDLocalToTS(toISO) + 24 * 60 * 60 * 1000 - 1;
  if (!Number.isFinite(toT)) return null;

  const partyLower = partyName.toLowerCase();
  let signed = 0;

  const add = (type: TxType, dateVal: any, amt: any, party: any) => {
    if (norm(party) !== partyLower) return;
    const tt = parseAnyDateToLocalDayTS(dateVal);
    if (!Number.isFinite(tt) || tt > toT) return;
    const { debit, credit } = getDrCr(type, toNum(amt));
    signed += debit - credit;
  };

  dispatchChallans.forEach((d) => add("Dispatch", d.date || d.dated || "", d.netAmt, d.partyName));
  otherDispatchChallans.forEach((d) => add("OtherDispatch", d.date || "", d.netAmt, d.partyName));
  purchaseOrders.forEach((d) => add("PurchaseOrder", d.date || "", d.amount, d.partyName));
  purchaseEntries.forEach((d) => add("PurchaseEntry", d.date || "", d.amount, d.partyName));
  purchaseReturns.forEach((d) => add("PurchaseReturn", d.date || "", d.amount, d.partyName));
  jobInwards.forEach((d) => add("JobInward", d.date || "", d.amount, d.partyName));

  // ✅ Party Payments: settlement = CASH + DISCOUNT
  const partyPayments = (Array.isArray(savedRecords) ? savedRecords : []).filter(
    (p) => String(p.paymentTo || "").trim() === "Party",
  );
  partyPayments.forEach((p: any) => {
    const total = toNum(p.amount) + toNum(p.discountAmount ?? 0);
    add("Payment", p.paymentDate ?? p.date ?? "", total, p.partyName);
  });

  // ✅ Party Receipts: credit = CASH + DISCOUNT (if present)
  receipts.forEach((r: any) => {
    const receiptTo = String(r.receiptTo ?? r.paymentTo ?? "").trim();
    if (receiptTo && receiptTo !== "Party") return;

    const totalCredit = toNum(r.amount ?? 0) + (toNum(r.discountAmount ?? 0) || parseDiscountFromRemarks(r.remarks));
    add("Receipt", r.receiptDate ?? r.paymentDate ?? r.date ?? "", totalCredit, r.partyName);
  });

  signed = round2(signed);
  const drcr = drCrLabel(signed);

  return {
    asOn: toISO,
    signedBalance: signed,
    display: drcr.text,
  };
}, [
  formData.paymentTo,
  formData.partyName,
  formData.paymentDate,
  today,
  dispatchChallans,
  otherDispatchChallans,
  purchaseOrders,
  purchaseEntries,
  purchaseReturns,
  jobInwards,
  savedRecords,
  receipts,
]);

  // auto-fill balance
  useEffect(() => {
  // ✅ Employee stays unchanged
  if (formData.paymentTo === "Employee" && computedEmployeeNet) {
    setFormData((prev) => ({ ...prev, balance: computedEmployeeNet.netSigned }));
    return;
  }

  // ✅ Party: behave like Receipt module, but with Payment semantics:
  // - If pending side is CREDIT: Payment reduces pending
  // - If pending side is DEBIT: Payment increases pending (cannot "settle" DEBIT-side)
  if (formData.paymentTo === "Party") {
    const cash = formData.amount === "" ? 0 : Number(formData.amount || 0);
    const disc = Number(formData.discountAmount || 0);
    const settle = +(cash + disc).toFixed(2);

    const base = Number(pendingTotal || 0);

    const nextPending =
      pendingSideMemo === "CREDIT"
        ? +(Math.max(0, base - settle)).toFixed(2)
        : +(base + settle).toFixed(2);

    const signed = pendingSideMemo === "DEBIT" ? nextPending : -nextPending;
    const balVal: number | "" = Math.abs(signed) > 0.00001 ? signed : "";

    setFormData((prev) => ({ ...prev, balance: balVal }));
    return;
  }

  // Other: keep as-is (manual input allowed)
}, [formData.paymentTo, formData.amount, formData.discountAmount, pendingTotal, pendingSideMemo, computedEmployeeNet]);
  const balanceDisplayText = useMemo(() => {
  if (formData.paymentTo === "Party") {
    const n = formData.balance === "" ? 0 : Number(formData.balance || 0);
    return drCrLabel(n).text;
  }

  if (formData.paymentTo === "Employee" && computedEmployeeNet) {
    return drCrLabel(computedEmployeeNet.netSigned).text;
  }

  if (typeof formData.balance === "number") return fmt2(formData.balance);
  return formData.balance === "" ? "" : String(formData.balance);
}, [formData.paymentTo, formData.balance, computedEmployeeNet]);

  const amountInWords = useMemo(() => amountToWordsINR(formData.amount), [formData.amount]);

  // ================= Input change =================
   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "paymentTo") {
      setSelectedEmployee(null);

      setFormData((prev) => ({
        ...prev,
        paymentTo: value as PaymentToType,
        partyName: "",
        balance: "",
        amount: "",
        discountAmount: 0,
      }));

      setAmountText("");
      setBalanceText("");

      // ✅ reset pending modal state when switching type
      setShowPendingModal(false);
      setModalRows([]);
      setReceiveByKey({});
      setDiscountByKey({});
      setAppliedCashTotal(0);
      setAppliedDiscountTotal(0);
      autoOpenedPartyRef.current = "";

      return;
    }

    // ✅ match Receipt.tsx date clamping behavior
    if (name === "paymentDate") {
      setFormData((prev) => {
        const fromDate = value;
        let toDate = prev.date;
        if (!toDate || toDate < fromDate) toDate = fromDate;
        return { ...prev, paymentDate: fromDate, date: toDate };
      });
      return;
    }

    if (name === "date") {
      setFormData((prev) => {
        const fromDate = prev.paymentDate;
        let toDate = value;
        if (fromDate && toDate < fromDate) toDate = fromDate;
        return { ...prev, date: toDate };
      });
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
      const clean = sanitizeDecimal(value, { allowNegative: true, decimals: 2 });
      setBalanceText(clean);
      const num: number | "" = isPartialNumberText(clean) ? "" : Number(clean);
      setFormData((prev) => ({ ...prev, balance: num }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ================= Open modals =================
  const openProcessModal = () => {
    setShowProcessModal(true);
    setProcessSearchText("");
  };

  const openNameModal = async () => {
    if (!formData.paymentTo) {
      Swal.fire("Info", "Please select 'Payment To' first", "info");
      return;
    }
    if (formData.paymentTo === "Employee") {
      setEmployeeSearchText("");
      setShowEmployeeModal(true);
    } else if (formData.paymentTo === "Party") {
      await loadPartyNames();
      setPartySearchText("");
      setShowPartyModal(true);
    }
  };

  const selectProcess = (p: any) => {
    setFormData((prev) => ({ ...prev, processName: p.processName || "" }));
    setShowProcessModal(false);
  };

  const selectEmployee = (e: any) => {
    const name = String(e.name || e.employeeName || "").trim();
    const code = String(e.code || e.employeeCode || "").trim();
    setSelectedEmployee({ name, code: code || undefined });
    setFormData((prev) => ({ ...prev, partyName: name }));
    setShowEmployeeModal(false);
  };

    const selectParty = (name: string) => {
    const partyName = String(name || "").trim();

    setSelectedEmployee(null);

    setFormData((prev) => ({
      ...prev,
      partyName,
      amount: "",
      discountAmount: 0,
      balance: "",
    }));

    setAmountText("");
    setBalanceText("");
    setShowPartyModal(false);

    // ✅ reset modal state
    setShowPendingModal(false);
    setModalRows([]);
    setReceiveByKey({});
    setDiscountByKey({});
    setAppliedCashTotal(0);
    setAppliedDiscountTotal(0);

    // ✅ allow effect to auto-open for new party
    autoOpenedPartyRef.current = "";

    // ✅ match Receipt focus behavior
    focusAmount();
  };

  // ================= Filters =================
  const filteredEmployees = useMemo(() => {
    return employeeList.filter((e) =>
      (e.name || e.employeeName || "").toLowerCase().includes(employeeSearchText.toLowerCase())
    );
  }, [employeeList, employeeSearchText]);

  const filteredProcesses = useMemo(() => {
    return processList.filter((p) => (p.processName || "").toLowerCase().includes(processSearchText.toLowerCase()));
  }, [processList, processSearchText]);

  const filteredParties = useMemo(() => {
    return partyList.filter((p) => (p || "").toLowerCase().includes(partySearchText.toLowerCase()));
  }, [partyList, partySearchText]);

  const filteredList = useMemo(() => {
    if (!Array.isArray(paymentList)) return [];
    const s = searchText.toLowerCase();

    return paymentList.filter((x: any) => {
      const displayName = (x.paymentTo === "Employee" ? x.employeeName : x.partyName) || "";
      return (
        !searchText ||
        (x.paymentTo || "").toLowerCase().includes(s) ||
        (x.processName || "").toLowerCase().includes(s) ||
        (x.paymentThrough || "").toLowerCase().includes(s) ||
        displayName.toLowerCase().includes(s)
      );
    });
  }, [paymentList, searchText]);

  // ================= Payload =================
  const buildPayload = () => {
  const payload: any = {
    paymentTo: formData.paymentTo,
    paymentDate: formData.paymentDate,
    date: formData.date,
    processName: formData.processName,
    paymentThrough: formData.paymentThrough,

    amount: formData.amount === "" ? 0 : Number(formData.amount || 0), // ✅ CASH (backend @NotNull)
    discountAmount: Number(formData.discountAmount || 0),              // ✅ DISCOUNT (backend @NotNull)

    balance: formData.balance === "" ? null : formData.balance,
    remarks: formData.remarks,

    partyName: formData.paymentTo !== "Employee" ? formData.partyName : "",
    employeeName: formData.paymentTo === "Employee" ? formData.partyName : "",
  };

  if (formData.paymentTo === "Employee" && selectedEmployee?.code) {
    payload.employeeCode = selectedEmployee.code;
  }
  return payload;
};

 const handleSave = async () => {
  if (saving) return;
setSaving(true);
  const payload = buildPayload();

  try {
    // ✅ Party validation (CREDIT-side pending settlement only)
    if (formData.paymentTo === "Party") {
      const cash = formData.amount === "" ? 0 : Number(formData.amount || 0);
      const disc = Number(formData.discountAmount || 0);
      const settle = +(cash + disc).toFixed(2);

      if (settle <= 0) {
        Swal.fire("Error", "Please enter amount (> 0)", "error");
        return;
      }

      // When pending side is CREDIT, Payment is meant to settle it => cap to FIFO pending
      if (pendingSideMemo === "CREDIT") {
        const base = Number(pendingTotal || 0);
        if (settle > base + 0.00001) {
          Swal.fire("Error", `Payment (Cash + Discount) cannot exceed total pending (${fmt2(base)}).`, "error");
          return;
        }
      }
    }

    if (editingId) {
      await api.put(routes.update(editingId), payload);
      Swal.fire("Success", "Payment updated!", "success");
    } else {
      await api.post(routes.create, payload);
      Swal.fire("Success", "Payment saved successfully!", "success");
    }

    // ✅ refresh local + notify all ledger screens (AccountStatement, etc.)
    await loadSavedRecords();
    try {
      window.dispatchEvent(new Event("ledger:changed"));
    } catch {}

    setEditingId(null);
    handleAddNew(false);
  } catch (error: any) {
    console.error("Error saving payment:", error);

    const status = error?.response?.status;
    const serverMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (typeof error?.response?.data === "string" ? error.response.data : "") ||
      error?.message;

    Swal.fire(
      "Error",
      serverMsg
        ? `${serverMsg}${status ? ` (HTTP ${status})` : ""}`
        : `Failed to save${status ? ` (HTTP ${status})` : ""}`,
      "error",
    );
  }
  finally {
   setSaving(false);
}
};

  const openList = async () => {
    try {
      const res = await api.get(routes.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setPaymentList(data);
      setShowList(true);
    } catch (err) {
      console.error("Load list error:", err);
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

    const handleEdit = async (id: number) => {
    try {
      const res = await api.get(routes.get(id));
      const rec: PaymentRecord = res.data;

      const fromDate = rec.paymentDate || today;
      const toDate = rec.date && rec.date >= fromDate ? rec.date : fromDate;

      const partyOrEmpName =
        rec.paymentTo === "Employee" ? String(rec.employeeName || "") : String(rec.partyName || "");

      const amtNum =
        rec.amount === undefined || rec.amount === null || rec.amount === "" ? "" : Number(rec.amount);
      const discNum =
        rec.discountAmount === undefined || rec.discountAmount === null || rec.discountAmount === ""
          ? 0
          : Number(rec.discountAmount);
      const balNum =
        rec.balance === undefined || rec.balance === null || rec.balance === "" ? "" : Number(rec.balance);

      setFormData({
        paymentTo: (rec.paymentTo as PaymentToType) || "",
        paymentDate: fromDate,
        date: toDate,
        processName: rec.processName || "",
        partyName: partyOrEmpName,
        paymentThrough: rec.paymentThrough || "Cash",
        amount: amtNum,
        discountAmount: Number.isFinite(discNum) ? discNum : 0,
        balance: balNum,
        remarks: rec.remarks || "",
      });

      setAmountText(amtNum === "" ? "" : String(amtNum));
      setBalanceText(balNum === "" ? "" : String(balNum));

      if (rec.paymentTo === "Employee") {
        setSelectedEmployee({
          name: partyOrEmpName,
          code: String(rec.employeeCode || rec.code || "").trim() || undefined,
        });
      } else {
        setSelectedEmployee(null);
      }

      setEditingId(id);
      setShowList(false);

      // ✅ reset pending modal state (Receipt behavior)
      setShowPendingModal(false);
      setModalRows([]);
      setReceiveByKey({});
      setDiscountByKey({});
      setAppliedCashTotal(0);
      setAppliedDiscountTotal(0);
      autoOpenedPartyRef.current = "";
    } catch (err) {
      console.error("Edit Error:", err);
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
    await api.delete(routes.delete(targetId));
    setPaymentList((prev) => prev.filter((x) => x.id !== targetId));

    if (editingId === targetId) {
      setEditingId(null);
      handleAddNew(false);
    }

    Swal.fire("Deleted!", "Record deleted successfully", "success");

    await loadSavedRecords();

    // ✅ notify ledger screens
    try {
      window.dispatchEvent(new Event("ledger:changed"));
    } catch {}
  } catch (err) {
    console.error("Delete Error:", err);
    Swal.fire("Error", "Delete failed", "error");
  }
};

 const handleAddNew = (showToast = true) => {
  setSelectedEmployee(null);
  setFormData({
    paymentTo: "",
    paymentDate: today,
    processName: "",
    partyName: "",
    paymentThrough: "Cash",
    amount: "",
    discountAmount: 0,
    balance: "",
    remarks: "",
    date: today,
  });

  setAmountText("");
  setBalanceText("");
  setEditingId(null);

  // ✅ reset pending modal state
  setShowPendingModal(false);
  setModalRows([]);
  setReceiveByKey({});
  setDiscountByKey({});
  setAppliedCashTotal(0);
  setAppliedDiscountTotal(0);
  autoOpenedPartyRef.current = "";

  if (showToast) Swal.fire("Cleared", "Ready for new entry", "success");
};
  const isNameReadOnly = formData.paymentTo === "Party" || formData.paymentTo === "Employee";
  const isBalanceAuto = formData.paymentTo === "Employee" || formData.paymentTo === "Party";

  // ================= PRINT =================
  const escapeHtml = (s: any) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatDDMMYYYY = (iso: string) => {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return `${m[3]}-${m[2]}-${m[1]}`;
  };

  const handlePrint = () => {
    const amountVal =
      formData.amount === "" || formData.amount === null || formData.amount === undefined
        ? ""
        : fmt2(Number(formData.amount));

    const rows: Array<[string, string]> = [
      ["Payment To", String(formData.paymentTo || "")],
      ["Payment Date", formatDDMMYYYY(formData.paymentDate)],
      ["Date", formatDDMMYYYY(formData.date)],
      ["Process Name", String(formData.processName || "")],
      ["Party / Employee Name", String(formData.partyName || "")],
      ["Payment Through", String(formData.paymentThrough || "")],
      ["Amount", amountVal],
      ["Balance (DR/CR)", String(balanceDisplayText || "")],
      ["Remarks", String(formData.remarks || "")],
      ["Amount in Words", String(amountInWords || "")],
    ];

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Payment Print</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; padding: 18px; color: #111; }
      .title { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 14px; }
      .sub { text-align:center; font-size: 12px; color:#444; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 10px; font-size: 13px; vertical-align: top; }
      th { width: 32%; background: #f2f2f2; text-align: left; }
      .footer { margin-top: 24px; display:flex; justify-content: space-between; gap: 20px; }
      .sig { width: 32%; text-align:center; }
      .line { margin-top: 40px; border-top: 1px solid #333; }
      @page { size: A4; margin: 12mm; }
      @media print { .no-print { display:none; } }
      .btnbar { text-align:right; margin-bottom: 12px; }
      .btn { padding: 8px 12px; border: 1px solid #333; background:#fff; cursor:pointer; }
    </style>
  </head>
  <body>
    <div class="btnbar no-print">
      <button class="btn" onclick="window.print()">Print</button>
    </div>

    <div class="title">Payment</div>
    <div class="sub">Payment Voucher / Details</div>

    <table>
      <tbody>
        ${rows
          .map(
            ([k, v]) => `
          <tr>
            <th>${escapeHtml(k)}</th>
            <td>${escapeHtml(v)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <div class="footer">
      <div class="sig">
        <div class="line"></div>
        <div>Prepared By</div>
      </div>
      <div class="sig">
        <div class="line"></div>
        <div>Checked By</div>
      </div>
      <div class="sig">
        <div class="line"></div>
        <div>Receiver Signature</div>
      </div>
    </div>
  </body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) {
      Swal.fire("Popup blocked", "Please allow popups to print.", "info");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  return (
    <Dashboard>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-white shadow-md rounded-lg w-full max-w-4xl mx-auto p-6 border">
          <h2 className="text-2xl font-bold text-center mb-6">Payment</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold">Payment To</label>
              <select
                name="paymentTo"
                value={formData.paymentTo}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="">Select</option>
                <option value="Party">Party</option>
                <option value="Employee">Employee</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-span-2">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 font-semibold">Payment Date</label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    className="border p-2 w-full rounded"
                  />
                </div>

                <div className="flex-1">
                  <label className="block mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="border p-2 w-full rounded"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Process Name</label>
              <input
                type="text"
                name="processName"
                value={formData.processName}
                onClick={openProcessModal}
                readOnly
                placeholder="Click to select process"
                className="border p-2 w-full rounded cursor-pointer bg-gray-50 hover:bg-gray-100"
              />
            </div>

                        <div className="col-span-2">
              <label className="block mb-1 font-semibold">Party / Employee Name</label>
              <input
                type="text"
                name="partyName"
                value={formData.partyName}
                onChange={handleChange}
                onClick={isNameReadOnly ? openNameModal : undefined}
                readOnly={isNameReadOnly}
                placeholder={formData.paymentTo === "Other" ? "Type name" : "Click to select"}
                className={`border p-2 w-full rounded ${
                  isNameReadOnly ? "cursor-pointer bg-gray-50 hover:bg-gray-100" : "bg-white"
                }`}
              />

              {formData.paymentTo === "Party" && formData.partyName ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-600">
                    Pending (FIFO) (as on {asOfIso}) <span className="text-gray-500">[{pendingSide}]</span>:{" "}
                    <b>{fmt2(pendingTotal)}</b> {pendingBillsFifo.length ? <span>({pendingBillsFifo.length} entries)</span> : null}
                  </div>

                  <button
                    type="button"
                    onClick={openPendingModal}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    View Pending
                  </button>
                </div>
              ) : null}
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Payment Through</label>
              <select
                name="paymentThrough"
                value={formData.paymentThrough}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="Cash">Cash</option>
                {paymentModes.map((pm) => {
                  const label = `${pm.bankNameOrUpiId}-${pm.accountNo}`;
                  return (
                    <option key={pm.id} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* ✅ Amount (TEXT) */}
                        <div>
              <label className="block mb-1 font-semibold">Amount</label>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                name="amount"
                value={amountText}
                onChange={handleChange}
                className="border p-2 w-full rounded"
                placeholder="Enter amount"
              />

              {formData.discountAmount > 0 ? (
                <div className="text-xs text-orange-700 mt-1">Discount: {fmt2(formData.discountAmount)}</div>
              ) : null}

              {amountInWords ? <div className="text-xs text-gray-600 mt-1">{amountInWords}</div> : null}
            </div>

            <div>
              <label className="block mb-1 font-semibold">Balance (DR/CR)</label>

              {isBalanceAuto ? (
                <input type="text" value={balanceDisplayText} readOnly className="border p-2 w-full rounded bg-gray-50" />
              ) : (
                <input
                  type="text"
                  inputMode="decimal"
                  name="balance"
                  value={balanceText}
                  onChange={handleChange}
                  className="border p-2 w-full rounded"
                  placeholder="Enter balance"
                />
              )}

              {formData.paymentTo === "Party" && (
                <div className="text-xs text-gray-600 mt-1">
                  {balanceInfoLoading
                    ? "Loading Account Statement data..."
                    : computedPartyBalance
                      ? `Party Balance = ${computedPartyBalance.display}`
                      : "Select party to calculate balance"}
                </div>
              )}

              {formData.paymentTo === "Employee" && (
                <div className="text-xs text-gray-600 mt-1">
                  {computedEmployeeNet ? `Employee Net = ${drCrLabel(computedEmployeeNet.netSigned).text}` : "Select employee to calculate balance"}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Remarks</label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-between mt-6">
            <div>
              <button
                onClick={() => handleAddNew()}
                className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
              >
                Add New
              </button>
<button
  onClick={handleSave}
  disabled={saving}
  className={`text-white px-4 py-2 rounded mr-2 ${
    saving
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-green-500 hover:bg-green-600"
  }`}
>
  {saving ? "Saving..." : editingId ? "Update" : "Save"}
</button>

              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded mr-2 hover:bg-yellow-600"
              >
                List
              </button>

              {/* ✅ PRINT BUTTON ADDED HERE */}
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-500 text-white rounded mr-2 hover:bg-indigo-600"
              >
                Print
              </button>

              <button
                onClick={() => handleDelete()}
                className="bg-red-500 text-white px-4 py-2 rounded mr-2 hover:bg-red-600"
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

        {/* Recently Saved Records */}
        {savedRecords.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-4xl mx-auto">
            <h3 className="font-bold text-lg mb-3">Recently Saved Records</h3>
            <div className="overflow-auto max-h-[200px]">
              <table className="w-full text-sm border">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Payment Date</th>
                    <th className="border p-2">Payment To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {savedRecords.slice(-5).map((record, idx) => {
                    const name = record.paymentTo === "Employee" ? record.employeeName : record.partyName;
                    return (
                      <tr key={record.id}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">
                          {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="border p-2">{String(record.paymentTo || "-")}</td>
                        <td className="border p-2">{name || "-"}</td>
                        <td className="border p-2">{record.processName || "-"}</td>
                        <td className="border p-2 text-right">{record.amount ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Employee Selection Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Employee</h3>
            <input
            ref={employeeSearchRef}
              type="text"
              placeholder="Search employee name..."
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
                  {filteredEmployees.map((e) => (
                    <tr key={e.id}>
                      <td className="border p-2">{e.name || e.employeeName}</td>
                      <td className="border p-2">{e.code || e.employeeCode}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectEmployee(e)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
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
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Party Selection Modal */}
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
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((name, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{name}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectParty(name)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredParties.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={2}>
                        No parties found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowPartyModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Selection Modal */}
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
                    <th className="border p-2">Category</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.map((p: any) => (
                    <tr key={p.serialNo || p.id || p.processName}>
                      <td className="border p-2">{p.processName}</td>
                      <td className="border p-2">{p.category}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectProcess(p)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProcesses.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={3}>
                        No processes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">Payment List</h3>

            <input
              placeholder="Search by Payment To / Name / Process / Through"
              className="border p-2 rounded w-full mb-3"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Payment Date</th>
                    <th className="border p-2">Payment To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border p-4 text-center text-gray-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d: any, i: number) => {
                      const name = d.paymentTo === "Employee" ? d.employeeName : d.partyName;
                      return (
                        <tr key={d.id}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">
                            {d.paymentDate ? new Date(d.paymentDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="border p-2">{d.paymentTo}</td>
                          <td className="border p-2">{name || "-"}</td>
                          <td className="border p-2">{d.processName || "-"}</td>
                          <td className="border p-2 text-right">{d.amount ?? "-"}</td>
                          <td className="border p-2 text-center">
                            <button
                              onClick={() => handleEdit(d.id)}
                              className="px-2 py-1 bg-blue-500 text-white rounded mr-1 hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
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
              <button
                onClick={() => setShowList(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
            {/* ✅ Pending Modal (FIFO) — Receipt-style UI (same layout/controls) */}
            {/* ✅ Pending Modal (FIFO, challan-wise, cash + discount) */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-2">
              Pending Entries – {formData.partyName} (As on {asOfIso}){" "}
              <span className="text-gray-500 font-normal">[{pendingSide}]</span>
            </h3>

            <div className="text-sm text-gray-700 mb-3 text-center">
              Pending (Modal): <b>{fmt2(modalPendingTotal)}</b> &nbsp;|&nbsp; Cash: <b>{fmt2(selectedCashTotal)}</b>{" "}
              &nbsp;|&nbsp; Discount: <b>{fmt2(selectedDiscountTotal)}</b> &nbsp;|&nbsp; Total:{" "}
              <b>{fmt2(selectedSettlementTotal)}</b>
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

                      // ✅ Payment settles only CREDIT-side pending
                      const disabled = pendingSideMemo === "DEBIT";

                      return (
                        <tr key={r.rowKey} className={isPartial ? "bg-purple-100" : ""}>
                          <td className="border p-2 text-center">{idx + 1}</td>
                          <td className="border p-2">{fmtDDMMYYYY(r.date)}</td>
                          <td className="border p-2">{r.docNo}</td>
                          <td className="border p-2">{txLabel(r.txType)}</td>
                          <td className="border p-2 text-right">{fmt2(r.chargeAmount)}</td>
                          <td className="border p-2 text-right font-semibold">{fmt2(r.pendingAmount)}</td>

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
                              disabled={disabled}
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
                              disabled={disabled}
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
                              disabled={disabled}
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
                              disabled={disabled}
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
                <b>Total:</b> {fmt2(selectedSettlementTotal)} &nbsp;|&nbsp; <b>Pending Left:</b>{" "}
                {fmt2(modalPendingTotal)}
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
                  disabled={pendingSideMemo === "DEBIT"}
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
              FIFO rule enforced: oldest pending must be settled first. Discount participates in settlement. Purple =
              Partial bill.
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default PaymentForm;
