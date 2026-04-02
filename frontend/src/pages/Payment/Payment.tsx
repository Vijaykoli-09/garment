import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

type PaymentToType = "Party" | "Employee" | "Other" | "";

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
  amount?: number | string;
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
  amount?: number | string;
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
  partyName: string; // Party/Employee/Other display/input
  paymentThrough: string;
  amount: number | "";
  balance: number | ""; // store SIGNED number internally
  remarks: string;
  date: string;
};

// ================= Utils (LOCAL-safe dates) =================
const pad2 = (n: number) => String(n).padStart(2, "0");

const parseYMDLocalToTS = (ymd: string) => {
  const m = String(ymd || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return NaN;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  return new Date(y, mo - 1, da).getTime();
};

const parseDMYLocalToTS = (dmy: string) => {
  const m = String(dmy || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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

const norm = (s: any) => String(s ?? "").trim().toLowerCase();
const round2 = (n: number) => Number((Number(n || 0) || 0).toFixed(2));

const fmt2 = (n: number) =>
  (Number(n || 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const drCrLabel = (signed: number) => {
  if (!Number.isFinite(signed) || signed === 0) return { side: "", abs: 0, text: "0.00" };
  const side = signed > 0 ? "DR" : "CR";
  const abs = Math.abs(signed);
  return { side, abs, text: `${fmt2(abs)} ${side}` };
};

// ================= DR/CR RULE (same as Account Statement) =================
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

  // Dispatch Return => CR (mapped to OtherDispatch)
  if (source === "OtherDispatch") return { debit: 0, credit: amt };

  // Purchase Return => DR
  if (source === "PurchaseReturn") return { debit: amt, credit: 0 };

  // Job Inward => CR
  if (source === "JobInward") return { debit: 0, credit: amt };

  // Default Dispatch => DR
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
    balance: "",
    remarks: "",
    date: today,
  });

  const [editingId, setEditingId] = useState<number | null>(null);

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
  const [otherDispatchChallans, setOtherDispatchChallans] = useState<OtherDispatchChallan[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDoc[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntryDoc[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnDoc[]>([]);
  const [jobInwards, setJobInwards] = useState<JobInwardDoc[]>([]);
  const [receipts, setReceipts] = useState<ReceiptDoc[]>([]);
  const [balanceInfoLoading, setBalanceInfoLoading] = useState(false);

  useEffect(() => {
    loadProcesses();
    loadEmployees();
    loadSavedRecords();
    loadPaymentModes();
    loadSalarySources();
    loadPartySources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // -------- Party statement sources (Account Statement) --------
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

      // partyId -> partyName mapping (used by job inward if it sends partyId)
      const partyArr = Array.isArray(partyRaw) ? partyRaw : [];
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
        }))
      );

      setOtherDispatchChallans(
        (Array.isArray(odcRaw) ? odcRaw : []).map((od: any) => ({
          id: Number(od.id),
          challanNo: String(od.challanNo ?? ""),
          date: od.date || "",
          partyName: String(od.partyName ?? "").trim(),
          netAmt: od.netAmt,
        }))
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
        })
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
        })
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
        })
      );

      setJobInwards(
        (Array.isArray(jobInRaw) ? jobInRaw : [])
          .map((d: any) => {
            const rows: any[] = Array.isArray(d.rows) ? d.rows : [];
            const amount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
            const partyName =
              String(d.partyName ?? "").trim() ||
              partyIdToName.get(String(d.partyId ?? "")) ||
              "";
            return {
              id: d.id ?? "",
              challanNo: String(d.challanNo ?? ""),
              date: String(d.date ?? ""),
              partyName,
              amount,
            } as JobInwardDoc;
          })
          .filter((x) => x.partyName && x.date)
      );

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
          paymentThrough: String(r.paymentThrough ?? "").trim(),
        }))
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

  // ================= Employee Net (Salary Report style) =================
  const computedEmployeeNet = useMemo(() => {
    if (formData.paymentTo !== "Employee") return null;

    const empName = (selectedEmployee?.name || formData.partyName || "").trim();
    if (!empName) return null;

    // Range: 1st of month -> paymentDate
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
      // optional explanation values:
      grossCurrent: round2(grossCurrent),
      advCurrent: round2(advCurrent),
      opening: round2(opening),
    };
  }, [formData.paymentTo, formData.partyName, formData.paymentDate, savedRecords, salaryRows, selectedEmployee, today]);

  // ================= Party Balance (Closing as on Payment Date) =================
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

    // Dispatch => DR
    dispatchChallans.forEach((d) => add("Dispatch", d.date || d.dated || "", d.netAmt, d.partyName));

    // OtherDispatch => CR (Dispatch Return)
    otherDispatchChallans.forEach((d) => add("OtherDispatch", d.date || "", d.netAmt, d.partyName));

    // Purchase => CR
    purchaseOrders.forEach((d) => add("PurchaseOrder", d.date || "", d.amount, d.partyName));
    purchaseEntries.forEach((d) => add("PurchaseEntry", d.date || "", d.amount, d.partyName));

    // Purchase Return => DR
    purchaseReturns.forEach((d) => add("PurchaseReturn", d.date || "", d.amount, d.partyName));

    // JobInward => CR
    jobInwards.forEach((d) => add("JobInward", d.date || "", d.amount, d.partyName));

    // Party Payments => DR
    const partyPayments = (Array.isArray(savedRecords) ? savedRecords : []).filter(
      (p) => String(p.paymentTo || "").trim() === "Party"
    );
    partyPayments.forEach((p) => add("Payment", p.paymentDate ?? p.date ?? "", p.amount, p.partyName));

    // Party Receipts => CR
    receipts.forEach((r) => {
      const receiptTo = String(r.receiptTo ?? r.paymentTo ?? "").trim();
      if (receiptTo && receiptTo !== "Party") return;
      add("Receipt", r.receiptDate ?? r.paymentDate ?? r.date ?? "", r.amount, r.partyName);
    });

    signed = round2(signed);
    const drcr = drCrLabel(signed);

    return {
      asOn: toISO,
      signedBalance: signed, // SIGNED number used in backend
      display: drcr.text, // e.g. "1,250.00 DR" / "450.00 CR"
      side: drcr.side,
      abs: round2(drcr.abs),
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

  // ================= Auto-fill numeric balance into state =================
  useEffect(() => {
    if (formData.paymentTo === "Employee" && computedEmployeeNet) {
      setFormData((prev) => ({ ...prev, balance: computedEmployeeNet.netSigned }));
      return;
    }
    if (formData.paymentTo === "Party" && computedPartyBalance) {
      setFormData((prev) => ({ ...prev, balance: computedPartyBalance.signedBalance }));
      return;
    }
  }, [computedEmployeeNet, computedPartyBalance, formData.paymentTo]);

  // ================= Balance display (DR/CR) =================
  const balanceDisplayText = useMemo(() => {
    if (formData.paymentTo === "Party" && computedPartyBalance) return computedPartyBalance.display;

    if (formData.paymentTo === "Employee" && computedEmployeeNet) {
      // If you also want DR/CR for employee:
      return drCrLabel(computedEmployeeNet.netSigned).text;
    }

    if (typeof formData.balance === "number") return fmt2(formData.balance);
    return formData.balance === "" ? "" : String(formData.balance);
  }, [formData.paymentTo, computedPartyBalance, computedEmployeeNet, formData.balance]);

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
      }));
      return;
    }

    if (name === "amount" || name === "balance") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? "" : Number(value),
      }));
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
    setSelectedEmployee(null);
    setFormData((prev) => ({ ...prev, partyName: name || "" }));
    setShowPartyModal(false);
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
      amount: formData.amount === "" ? null : formData.amount,
      balance: formData.balance === "" ? null : formData.balance, // SIGNED numeric
      remarks: formData.remarks,

      partyName: formData.paymentTo !== "Employee" ? formData.partyName : "",
      employeeName: formData.paymentTo === "Employee" ? formData.partyName : "",
    };

    if (formData.paymentTo === "Employee" && selectedEmployee?.code) {
      payload.employeeCode = selectedEmployee.code;
    }
    return payload;
  };

  // ================= Save / Update =================
  const handleSave = async () => {
    const payload = buildPayload();

    try {
      if (editingId) {
        await api.put(routes.update(editingId), payload);
        Swal.fire("Success", "Payment updated!", "success");
      } else {
        await api.post(routes.create, payload);
        Swal.fire("Success", "Payment saved successfully!", "success");
      }
      setEditingId(null);
      handleAddNew(false);
      loadSavedRecords(); // refresh => balances update
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
        serverMsg ? `${serverMsg}${status ? ` (HTTP ${status})` : ""}` : `Failed to save${status ? ` (HTTP ${status})` : ""}`,
        "error"
      );
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

      const partyOrEmpName =
        rec.paymentTo === "Employee" ? String(rec.employeeName || "") : String(rec.partyName || "");

      setFormData({
        paymentTo: (rec.paymentTo as PaymentToType) || "",
        paymentDate: rec.paymentDate || today,
        processName: rec.processName || "",
        partyName: partyOrEmpName,
        paymentThrough: rec.paymentThrough || "Cash",
        amount: rec.amount === undefined || rec.amount === null || rec.amount === "" ? "" : Number(rec.amount),
        balance: rec.balance === undefined || rec.balance === null || rec.balance === "" ? "" : Number(rec.balance),
        remarks: rec.remarks || "",
        date: rec.date || today,
      });

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

    if (result.isConfirmed) {
      try {
        await api.delete(routes.delete(targetId));
        setPaymentList((prev) => prev.filter((x) => x.id !== targetId));
        if (editingId === targetId) {
          setEditingId(null);
          handleAddNew(false);
        }
        Swal.fire("Deleted!", "Record deleted successfully", "success");
        loadSavedRecords();
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
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
      balance: "",
      remarks: "",
      date: today,
    });
    setEditingId(null);
    if (showToast) Swal.fire("Cleared", "Ready for new entry", "success");
  };

  const isNameReadOnly = formData.paymentTo === "Party" || formData.paymentTo === "Employee";
  const isBalanceAuto = formData.paymentTo === "Employee" || formData.paymentTo === "Party";

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

            <div>
              <label className="block mb-1 font-semibold">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">
                Balance (DR/CR){" "}
                {formData.paymentTo === "Party" && computedPartyBalance ? (
                  <span className="text-xs font-normal text-gray-600">(As on {computedPartyBalance.asOn})</span>
                ) : null}
                {formData.paymentTo === "Employee" && computedEmployeeNet ? (
                  <span className="text-xs font-normal text-gray-600">
                    (Net {computedEmployeeNet.fromISO} to {computedEmployeeNet.toISO})
                  </span>
                ) : null}
              </label>

              {/* Show DR/CR text when auto (Party/Employee), else number input */}
              {isBalanceAuto ? (
                <input
                  type="text"
                  value={balanceDisplayText}
                  readOnly
                  className="border p-2 w-full rounded bg-gray-50"
                />
              ) : (
                <input
                  type="number"
                  name="balance"
                  value={formData.balance}
                  onChange={handleChange}
                  className="border p-2 w-full rounded"
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
                  {computedEmployeeNet
                    ? `Employee Net = ${drCrLabel(computedEmployeeNet.netSigned).text} (Gross ${computedEmployeeNet.grossCurrent} - ADV ${computedEmployeeNet.advCurrent} + Opening ${computedEmployeeNet.opening})`
                    : "Select employee to calculate balance"}
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
                className="bg-green-500 text-white px-4 py-2 rounded mr-2 hover:bg-green-600"
              >
                {editingId ? "Update" : "Save"}
              </button>

              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded mr-2 hover:bg-yellow-600"
              >
                List
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
    </Dashboard>
  );
};

export default PaymentForm;