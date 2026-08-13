"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import AttendanceManagement from "./AttendanceManagement";
import ExtraHoursManagement from "./ExtraHoursManagement";

// ================= Types =================
type Employee = {
  code: string;
  employeeName: string;

  salaryType?: string;
  monthlySalary?: number;
  workingHours?: number;
  hourlyRate?: number;

  openingBalance?: number;
  asOn?: string; // LocalDate as "YYYY-MM-DD"
  dateOfJoining?: string; // LocalDate as "YYYY-MM-DD"

  process?: { serialNo: string; processName: string };
};

type CuttingEntryDTO = {
  serialNo: string;
  date: string;
  employeeId?: string;
  employeeName?: string;
  lotRows: {
    id?: number;
    cutLotNo: string;
    artNo: string;
    itemName: string;
    shade: string;
    pcs: string;
    rate: string;
    amount: string;
    remarks?: string;
  }[];
};

type ProductionReceiptDTO = {
  id: number;
  dated?: string;
  date?: string;
  processName?: string;
  process?: string;
  employeeName?: string;
  employee?: string;
  rows: {
    pcs?: string;
    piece?: string;
    rate?: string;
    amount?: string;
    artNo?: string;
    ArtNo?: string;
    cardNo?: string;
    cutLotNo?: string;
    lotNo?: string;
    remarks?: string;
  }[];
};

type PRRow = {
  id: number;
  date: string;
  artNo: string;
  lotNo: string;
  piece: number;
  rate: number;
  amount: number;
  process: string;
  employee: string;
  remarks?: string;
};

type PaymentRow = {
  id: string;
  dateISO: string; // YYYY-MM-DD (LOCAL)
  dateTS: number; // LOCAL day start timestamp
  employeeName: string;
  employeeCode: string;
  process: string;
  amount: number;
  remarks: string;
};

type MonthlySalaryBreakdownDTO = {
  month: string; // "YYYY-MM"
  calendarDays: number;
  selectedDays: number;

  presentDays: number;
  halfDays: number;
  absentDays: number;

  effectiveDays: number;
  attendancePercent: number;

  monthlySalary?: number;
  salaryPayable: number; // may be unreliable; we will compute payable ourselves from effectiveDays
};

type EmployeeSalarySupportDTO = {
  employeeCode: string;
  employeeName: string;
  salaryType?: string;

  monthlySalary?: number;
  workingHours?: number;
  hourlyRate?: number;
  dateOfJoining?: string;

  processSerialNo?: string;
  processName?: string;

  fromDate: string;
  toDate: string;

  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  effectiveDays: number;
  attendancePercent: number;

  totalExtraHours: number;
  totalExtraHourAmount: number;
  averageExtraHourRate: number;

  monthlyBreakdown?: MonthlySalaryBreakdownDTO[];
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY";

type AttendanceExceptionRow = {
  id?: number;
  employeeCode: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
};

type EmployeeWiseRow = {
  employeeCode: string;
  employeeName: string;

  processNameMaster: string;
  processDisplay: string;

  isSalaryProcessEmployee: boolean; // Process = Salary (salaryType ignored)
  shownBecauseExtraWork: boolean; // not salary-process but has extra work within selected process scope

  // Attendance (salary-process only)
  present: number;
  halfDay: number;
  absent: number;
  effectiveDays: number;
  attendancePercent: number;

  // Extra work (all shown rows)
  extraHours: number;
  extraHourRateAvg: number;
  extraHourAmount: number;

  // Monthly salary (salary-process only)
  monthlySalary: number;
  salaryPayable: number;

  // Payment
  advInRange: number;
  opening: number;

  gross: number;
  net: number;
};

// ================= Date helpers (timezone + format safe) =================
const pad2 = (n: number) => String(n).padStart(2, "0");
const DAY_MS = 24 * 60 * 60 * 1000;

const toLocalISODateFromTS = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

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

const fmtDateHeader = (anyDate: string) => {
  const ts = parseAnyDateToLocalDayTS(anyDate);
  if (!Number.isFinite(ts)) return "";
  const d = new Date(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const fmtNumber = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRate = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const getTodayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const getFirstOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const daysInMonth = (y: number, mIndex: number) => new Date(y, mIndex + 1, 0).getDate();
const normUpper = (v: any) => String(v ?? "").trim().toUpperCase();

/**
 * ✅ Correct Salary Process rule (as per requirement):
 * Salary Process employee is determined ONLY by Process = Salary.
 * Salary Type does NOT matter.
 */
const isSalaryProcessEmployeeByProcessName = (processName: any) => normUpper(processName) === "SALARY";

const hasExtraWork = (extraHours: any, extraAmount: any) =>
  Number(extraHours || 0) > 0 || Number(extraAmount || 0) > 0;

const getMonthSpans = (fromIso: string, toIso: string) => {
  const f = String(fromIso || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = String(toIso || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!f || !t) return [];

  let y = Number(f[1]);
  let mIndex = Number(f[2]) - 1;

  const ty = Number(t[1]);
  const tmIndex = Number(t[2]) - 1;

  const spans: { y: number; mIndex: number; monthStartTS: number; monthEndTS: number; calendarDays: number }[] = [];
  while (y < ty || (y === ty && mIndex <= tmIndex)) {
    const monthStart = new Date(y, mIndex, 1);
    const monthEnd = new Date(y, mIndex + 1, 0); // last day
    spans.push({
      y,
      mIndex,
      monthStartTS: monthStart.getTime(),
      monthEndTS: monthEnd.getTime(),
      calendarDays: monthEnd.getDate(),
    });

    mIndex += 1;
    if (mIndex >= 12) {
      mIndex = 0;
      y += 1;
    }
  }
  return spans;
};

const SalaryReport: React.FC = () => {
  const [cuttingEntries, setCuttingEntries] = useState<CuttingEntryDTO[]>([]);
  const [productionReceipts, setProductionReceipts] = useState<ProductionReceiptDTO[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [processList, setProcessList] = useState<any[]>([]);

  const [salarySupport, setSalarySupport] = useState<EmployeeSalarySupportDTO[]>([]);
  const [supportLoading, setSupportLoading] = useState<boolean>(false);

  // ✅ used only as fallback when monthlyBreakdown is missing (salary types that backend might not include)
  const [attendanceExceptions, setAttendanceExceptions] = useState<AttendanceExceptionRow[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [processName, setProcessName] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");

  const [fromDate, setFromDate] = useState<string>(getFirstOfMonthIso());
  const [toDate, setToDate] = useState<string>(getTodayIso());
  const [sorting, setSorting] = useState<"Date Wise" | "Art No Wise" | "Lot Wise">("Date Wise");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  const [showAttendanceMgmt, setShowAttendanceMgmt] = useState(false);
  const [showExtraHoursMgmt, setShowExtraHoursMgmt] = useState(false);

  // ---------- Load all base data ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cuttingRes, prodRes, empRes, payRes, procRes] = await Promise.all([
          api.get("/cutting-entries"),
          api.get("/production-receipt"),
          api.get("/employees"),
          api.get("/payment"),
          api.get("/process/list"),
        ]);

        const cuttingList: CuttingEntryDTO[] = Array.isArray(cuttingRes.data)
          ? cuttingRes.data
          : cuttingRes.data?.data || [];

        const prodList: ProductionReceiptDTO[] = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || [];

        const empList: Employee[] = Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || [];
        const payList: any[] = Array.isArray(payRes.data) ? payRes.data : payRes.data?.data || [];
        const procList: any[] = Array.isArray(procRes.data) ? procRes.data : procRes.data?.data || [];

        const empNorm = empList.map((e: any) => ({
          ...e,
          process: e.process ? { ...e.process, serialNo: String(e.process.serialNo) } : undefined,
        }));

        setCuttingEntries(cuttingList);
        setProductionReceipts(prodList);
        setEmployees(empNorm);
        setPayments(payList);
        setProcessList(
          procList.map((p: any) => ({
            ...p,
            serialNo: String(p.serialNo),
            processName: (p.processName || "").trim(),
          }))
        );
      } catch (err: any) {
        console.error("Error loading data:", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allEmployees = useMemo(
    () => employees.filter((emp) => emp.employeeName && emp.employeeName.trim().length > 0),
    [employees]
  );

  const employeeByNameLower = useMemo(() => {
    const m = new Map<string, Employee>();
    allEmployees.forEach((e) => m.set(e.employeeName.trim().toLowerCase(), e));
    return m;
  }, [allEmployees]);

  const employeeByCode = useMemo(() => {
    const m = new Map<string, Employee>();
    allEmployees.forEach((e) => m.set(String(e.code).trim(), e));
    return m;
  }, [allEmployees]);

  const selectedEmployee = useMemo(() => {
    const key = employeeName.trim().toLowerCase();
    if (!key) return undefined;
    return employeeByNameLower.get(key);
  }, [employeeName, employeeByNameLower]);

  const selectedEmployeeCode = useMemo(
    () => (selectedEmployee?.code ? String(selectedEmployee.code).trim() : ""),
    [selectedEmployee]
  );

  const selectedProcessSerialNo = useMemo(() => {
    const p = processName.trim().toLowerCase();
    if (!p) return "";
    const matched = (processList || []).find((x: any) => String(x.processName || "").trim().toLowerCase() === p);
    return matched?.serialNo ? String(matched.serialNo) : "";
  }, [processName, processList]);

  const salaryProcessSerialNoMaster = useMemo(() => {
    const matched = (processList || []).find((x: any) => normUpper(x?.processName) === "SALARY");
    return matched?.serialNo ? String(matched.serialNo) : "";
  }, [processList]);

  // ---------- Flatten Cutting + Production into common rows ----------
  const allRows: PRRow[] = useMemo(() => {
    const rows: PRRow[] = [];

    // Cutting
    cuttingEntries.forEach((entry) => {
      const dated = entry.date || "";
      const employee = (entry.employeeName || "").trim();
      const process = "Cutting";

      (entry.lotRows || []).forEach((r, idx) => {
        const piece = Number.parseFloat(r.pcs) || 0;
        const rate = Number.parseFloat(r.rate) || 0;
        const amount = Number.parseFloat(r.amount) || Number(piece * rate) || 0;

        const uniqueIdBase = entry.serialNo
          ? entry.serialNo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
          : Math.random() * 100000;

        const id = uniqueIdBase * 1000 + (idx + 1);

        rows.push({
          id,
          date: dated,
          artNo: (r.artNo || "").trim(),
          lotNo: (r.cutLotNo || "").trim(),
          piece,
          rate,
          amount,
          process,
          employee,
          remarks: r.remarks || "",
        });
      });
    });

    // Other production receipts
    productionReceipts.forEach((rec) => {
      const dated = rec.dated || rec.date || "";
      const process = (rec.processName || rec.process || "").trim();
      const employee = (rec.employeeName || rec.employee || "").trim();

      (rec.rows || []).forEach((r, idx) => {
        const piece = Number.parseFloat(r.pcs || r.piece || "0") || 0;
        const rate = Number.parseFloat(r.rate || "0") || 0;
        const amount = Number.parseFloat(r.amount || "0") || Number(piece * rate) || 0;

        const uniqueIdBase = rec.id ? Number(rec.id) : Math.random() * 100000;
        const id = uniqueIdBase * 1000 + (idx + 1);

        rows.push({
          id,
          date: dated,
          artNo: (r.artNo || r.ArtNo || "").trim(),
          lotNo: (r.cardNo || r.cutLotNo || r.lotNo || "").trim(),
          piece,
          rate,
          amount,
          process,
          employee,
          remarks: r.remarks || "",
        });
      });
    });

    return rows;
  }, [cuttingEntries, productionReceipts]);

  // ---------- Process dropdown ----------
  const processes = useMemo(() => {
    const fromData = allRows.map((r) => r.process).filter((p) => p && p.trim().length > 0);
    const fromMaster = (processList || [])
      .map((p: any) => p.processName)
      .filter((p: string) => p && p.trim().length > 0);

    const combined = Array.from(new Set([...fromData, ...fromMaster]));
    return combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [allRows, processList]);

  // ---------- Employee dropdown ----------
  const employeesForProcess = useMemo(() => {
    let filteredEmployees = allEmployees;
    if (processName) {
      const pLower = processName.trim().toLowerCase();
      filteredEmployees = allEmployees.filter((e) => (e.process?.processName || "").trim().toLowerCase() === pLower);
    }
    const names = filteredEmployees
      .map((e) => (e.employeeName || "").trim())
      .filter((n) => n.length > 0);

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [allEmployees, processName]);

  /**
   * Existing filter rule for production rows:
   * - Employee select = employee ke ALL processes show
   * - Process filter apply only when employee not selected
   */
  const filtered = useMemo(() => {
    const f = parseYMDLocalToTS(fromDate);
    const t = parseYMDLocalToTS(toDate) + DAY_MS - 1;

    const pSel = processName.trim().toLowerCase();
    const eSel = employeeName.trim().toLowerCase();

    return allRows.filter((r) => {
      const tt = parseAnyDateToLocalDayTS(r.date);
      if (!Number.isFinite(tt) || tt < f || tt > t) return false;

      if (eSel && r.employee.trim().toLowerCase() !== eSel) return false;

      if (!eSel && pSel && r.process.trim().toLowerCase() !== pSel) return false;

      return true;
    });
  }, [allRows, fromDate, toDate, processName, employeeName]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    switch (sorting) {
      case "Date Wise":
        data.sort((a, b) => {
          const dc = parseAnyDateToLocalDayTS(a.date) - parseAnyDateToLocalDayTS(b.date);
          if (dc !== 0) return dc;
          const lc = a.lotNo.localeCompare(b.lotNo);
          if (lc !== 0) return lc;
          return a.artNo.localeCompare(b.artNo);
        });
        break;

      case "Art No Wise":
        data.sort((a, b) => {
          const ac = a.artNo.localeCompare(b.artNo);
          if (ac !== 0) return ac;
          const dc = parseAnyDateToLocalDayTS(a.date) - parseAnyDateToLocalDayTS(b.date);
          if (dc !== 0) return dc;
          return a.lotNo.localeCompare(b.lotNo);
        });
        break;

      case "Lot Wise":
        data.sort((a, b) => {
          const lc = a.lotNo.localeCompare(b.lotNo);
          if (lc !== 0) return lc;
          const dc = parseAnyDateToLocalDayTS(a.date) - parseAnyDateToLocalDayTS(b.date);
          if (dc !== 0) return dc;
          return a.artNo.localeCompare(b.artNo);
        });
        break;
    }
    return data;
  }, [filtered, sorting]);

  const totals = useMemo(() => {
    const pieces = sorted.reduce((s, r) => s + r.piece, 0);
    const amount = Number(sorted.reduce((s, r) => s + r.amount, 0).toFixed(2));
    return { rows: sorted.length, pieces, amount };
  }, [sorted]);

  // ---------- Normalize payments ----------
  const normalizedPayments = useMemo<PaymentRow[]>(() => {
    const list = Array.isArray(payments) ? payments : [];

    return list
      .map((p: any, idx: number) => {
        const employeeName = String(p.employeeName ?? p.employee ?? p.empName ?? p.partyName ?? p.name ?? "").trim();
        const employeeCode = String(p.employeeCode ?? p.empCode ?? p.employeeId ?? p.empId ?? p.code ?? "").trim();
        const process = String(p.processName ?? p.process ?? "").trim();

        const dateTS = parseAnyDateToLocalDayTS(p.paymentDate ?? p.date ?? p.dated ?? p.createdAt ?? "");
        const dateISO = Number.isFinite(dateTS) ? toLocalISODateFromTS(dateTS) : "";

        const amount = Number(parseFloat(String(p.amount ?? p.paidAmount ?? p.paymentAmount ?? p.amt ?? 0)) || 0);
        const remarks = String(p.remarks ?? p.remark ?? p.note ?? "").trim();

        return { id: String(p.id ?? p.serialNo ?? p._id ?? idx + 1), dateISO, dateTS, employeeName, employeeCode, process, amount, remarks };
      })
      .filter((p) => p.employeeName && p.dateISO && Number.isFinite(p.dateTS) && p.amount !== 0);
  }, [payments]);

  // ---------- Employee-wise ADV (payments) in selected date range ----------
  const advInRangeByEmployee = useMemo(() => {
    const fromT = parseYMDLocalToTS(fromDate);
    const toT = parseYMDLocalToTS(toDate) + DAY_MS - 1;

    const shouldFilterByProcess = !employeeName && !!processName;
    const selectedProcLower = processName.trim().toLowerCase();

    const m = new Map<string, number>();
    normalizedPayments.forEach((p) => {
      if (p.dateTS < fromT || p.dateTS > toT) return;

      if (shouldFilterByProcess) {
        const pProc = (p.process || "").trim().toLowerCase();
        if (!pProc) return;
        if (pProc !== selectedProcLower) return;
      }

      const key = p.employeeCode?.trim() ? `CODE:${p.employeeCode.trim()}` : `NAME:${p.employeeName.trim().toLowerCase()}`;
      m.set(key, (m.get(key) || 0) + Number(p.amount || 0));
    });

    return m;
  }, [normalizedPayments, fromDate, toDate, processName, employeeName]);

  // ---------- Salary-support load (with optional attendance exception fallback load) ----------
  const loadSalarySupport = async () => {
    setSupportLoading(true);
    try {
      const params: any = { from: fromDate, to: toDate };

      // Respect selected employee (only that employee)
      if (selectedEmployeeCode) {
        params.employeeCode = selectedEmployeeCode;
      } else if (processName && selectedProcessSerialNo) {
        // Respect selected process for employee-wise summary scope
        params.processSerialNo = selectedProcessSerialNo;
      }

      const res = await api.get("/salary-support/employee-wise", { params });
      const list: EmployeeSalarySupportDTO[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setSalarySupport(list);

      /**
       * ✅ Monthly salary payable fallback:
       * If a Salary-process employee has monthlySalary but monthlyBreakdown is missing,
       * we fetch attendance exceptions for Salary process to compute month-by-month payable.
       */
      const procIsAll = !String(processName || "").trim();
      const selProcUpper = normUpper(processName);
      const scopeAllowsSalaryProcess = procIsAll || selProcUpper === "SALARY";

      if (!scopeAllowsSalaryProcess) {
        setAttendanceExceptions([]);
        return;
      }

      // Apply same scope filters (process + employee) BEFORE deciding if we need exceptions
      const needsFallback = list.some((s) => {
        const procUpper = normUpper(s.processName);
        const isSalaryProc = procUpper === "SALARY";
        if (!isSalaryProc) return false;

        if (!procIsAll && procUpper !== selProcUpper) return false;

        if (selectedEmployeeCode && String(s.employeeCode || "").trim() !== selectedEmployeeCode) return false;

        const monthlySalary = Number(s.monthlySalary || 0);
        if (monthlySalary <= 0) return false;

        const br = Array.isArray(s.monthlyBreakdown) ? s.monthlyBreakdown : [];
        return br.length === 0;
      });

      if (!needsFallback) {
        setAttendanceExceptions([]);
        return;
      }

      const excParams: any = { from: fromDate, to: toDate };

      if (selectedEmployeeCode) {
        excParams.employeeCode = selectedEmployeeCode;
      } else {
        // Use Salary process serialNo if available
        const salaryProcSerial =
          selProcUpper === "SALARY" ? selectedProcessSerialNo : salaryProcessSerialNoMaster;
        if (salaryProcSerial) excParams.processSerialNo = salaryProcSerial;
      }

      const excRes = await api.get("/attendance/exceptions", { params: excParams });
      const excList: AttendanceExceptionRow[] = Array.isArray(excRes.data) ? excRes.data : excRes.data?.data || [];

      // normalize minimal fields
      setAttendanceExceptions(
        (excList || [])
          .map((x: any) => ({
            employeeCode: String(x.employeeCode || "").trim(),
            date: String(x.date || "").trim(),
            status: String(x.status || "PRESENT").trim().toUpperCase() as AttendanceStatus,
          }))
          .filter((x) => x.employeeCode && x.date && (x.status === "ABSENT" || x.status === "HALF_DAY" || x.status === "PRESENT"))
      );
    } catch (err) {
      console.error(err);
      setSalarySupport([]);
      setAttendanceExceptions([]);
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    if (!showModal) return;
    loadSalarySupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, fromDate, toDate, processName, employeeName, selectedEmployeeCode, selectedProcessSerialNo, salaryProcessSerialNoMaster]);

  const attendanceExceptionsByEmp = useMemo(() => {
    const m = new Map<string, { ts: number; status: AttendanceStatus }[]>();
    for (const x of attendanceExceptions) {
      const ts = parseYMDLocalToTS(x.date);
      if (!Number.isFinite(ts)) continue;
      const code = String(x.employeeCode || "").trim();
      if (!code) continue;
      const arr = m.get(code) || [];
      arr.push({ ts, status: x.status });
      m.set(code, arr);
    }
    // sort each employee exceptions by date for predictable behavior
    // Use Map.prototype.forEach to avoid downlevelIteration TS error
    m.forEach((arr, k) => {
      arr.sort((a, b) => a.ts - b.ts);
      m.set(k, arr);
    });
    return m;
  }, [attendanceExceptions]);

  // ---------- Employee Wise Summary rows (FINAL filtered list respecting Process/Employee + salary-process + extra work) ----------
  const employeeWiseRows: EmployeeWiseRow[] = useMemo(() => {
    const list = Array.isArray(salarySupport) ? salarySupport : [];
    if (list.length === 0) return [];

    const processIsAll = !String(processName || "").trim();
    const selectedProcessUpper = normUpper(processName);

    const selectedEmpLower = employeeName.trim().toLowerCase();
    const selectedEmpCode = selectedEmployeeCode ? String(selectedEmployeeCode).trim() : "";

    const monthSpans = getMonthSpans(fromDate, toDate);
    const rangeFromTS = parseYMDLocalToTS(fromDate);
    const rangeToTS = parseYMDLocalToTS(toDate);

    // same-month fallback (only when no breakdown and no exceptions — should be rare)
    const sameMonthInfo = (() => {
      const f = String(fromDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const t = String(toDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!f || !t) return null;
      const fy = Number(f[1]);
      const fm = Number(f[2]) - 1;
      const ty = Number(t[1]);
      const tm = Number(t[2]) - 1;
      if (fy === ty && fm === tm) return { y: fy, mIndex: fm };
      return null;
    })();

    const computeSalaryPayableFromExceptions = (empCode: string, monthlySalary: number, dojIso?: string) => {
      if (!Number.isFinite(rangeFromTS) || !Number.isFinite(rangeToTS)) return 0;

      const dojTS = dojIso ? parseYMDLocalToTS(dojIso) : NaN;
      const excArr = attendanceExceptionsByEmp.get(empCode) || [];

      let sum = 0;

      for (const span of monthSpans) {
        const calDays = span.calendarDays;
        if (calDays <= 0) continue;

        let selectedStartTS = Math.max(rangeFromTS, span.monthStartTS);
        let selectedEndTS = Math.min(rangeToTS, span.monthEndTS);

        if (Number.isFinite(dojTS)) selectedStartTS = Math.max(selectedStartTS, dojTS);

        if (selectedStartTS > selectedEndTS) continue;

        const selectedDays = Math.floor((selectedEndTS - selectedStartTS) / DAY_MS) + 1;

        let absent = 0;
        let half = 0;

        for (const ex of excArr) {
          if (ex.ts < selectedStartTS || ex.ts > selectedEndTS) continue;
          if (ex.status === "ABSENT") absent += 1;
          else if (ex.status === "HALF_DAY") half += 1;
        }

        let present = selectedDays - absent - half;
        if (present < 0) present = 0;
        const effective = present + 0.5 * half;

        sum += (monthlySalary / calDays) * effective;
      }

      return Number(sum.toFixed(2));
    };

    const computeSalaryPayableFromBreakdown = (br: MonthlySalaryBreakdownDTO[], monthlySalary: number) => {
      // Required formula:
      // SUM( monthlySalary / calendarDaysInMonth * effectiveDays )
      let sum = 0;
      for (const b of br) {
        const calDays = Number(b.calendarDays || 0);
        const eff = Number(b.effectiveDays || 0);
        if (calDays > 0 && eff > 0) sum += (monthlySalary / calDays) * eff;
      }
      return Number(sum.toFixed(2));
    };

    const rowsBuilt = list
      .map((s) => {
        const empCode = String(s.employeeCode || "").trim();
        const empName = String(s.employeeName || "").trim();
        const empNameLower = empName.toLowerCase();

        const empMaster = empCode ? employeeByCode.get(empCode) : employeeByNameLower.get(empNameLower);

        const processNameMaster = String(s.processName || empMaster?.process?.processName || "").trim();
        const processUpper = normUpper(processNameMaster);

        // 1) Apply selected Process scope FIRST
        if (!processIsAll) {
          if (processUpper !== selectedProcessUpper) return null;
        }

        // 2) Apply Employee filter SECOND
        if (selectedEmpLower) {
          const matchByName = empNameLower === selectedEmpLower;
          const matchByCode = selectedEmpCode && empCode && empCode === selectedEmpCode;
          if (!matchByName && !matchByCode) return null;
        }

        const isSalaryProcEmp = isSalaryProcessEmployeeByProcessName(processNameMaster);

        const extraHours = Number(s.totalExtraHours || 0);
        const extraHourAmount = Number(s.totalExtraHourAmount || 0);
        const extraHourRateAvg = Number(s.averageExtraHourRate || 0);

        const extraWork = hasExtraWork(extraHours, extraHourAmount);

        // 3) Qualify AFTER scope filters
        // - Salary-process employees are always shown (within scope)
        // - Non-salary employees only shown if they have extra work (and are within selected process scope)
        const qualifies = isSalaryProcEmp || extraWork;
        if (!qualifies) return null;

        // Attendance (Salary-process only)
        const present = isSalaryProcEmp ? Number(s.presentDays || 0) : 0;
        const absent = isSalaryProcEmp ? Number(s.absentDays || 0) : 0;
        const halfDay = isSalaryProcEmp ? Number(s.halfDays || 0) : 0;
        const effectiveDays = isSalaryProcEmp ? Number(s.effectiveDays || 0) : 0;
        const attendancePercent = isSalaryProcEmp ? Number(s.attendancePercent || 0) : 0;

        // Monthly salary & payable (Salary-process only)
        const monthlySalary = isSalaryProcEmp ? Number(s.monthlySalary ?? empMaster?.monthlySalary ?? 0) || 0 : 0;

        let salaryPayable = 0;
        if (isSalaryProcEmp && monthlySalary > 0) {
          const br = Array.isArray(s.monthlyBreakdown) ? s.monthlyBreakdown : [];
          if (br.length > 0) {
            salaryPayable = computeSalaryPayableFromBreakdown(br, monthlySalary);
          } else if (attendanceExceptionsByEmp.size > 0 || attendanceExceptions.length === 0) {
            // If exceptions list is loaded (possibly empty), we can compute.
            const dojIso = String(s.dateOfJoining || empMaster?.dateOfJoining || "").trim() || undefined;
            salaryPayable = computeSalaryPayableFromExceptions(empCode, monthlySalary, dojIso);
          } else if (sameMonthInfo) {
            // strict fallback only for same month
            const calDays = daysInMonth(sameMonthInfo.y, sameMonthInfo.mIndex);
            salaryPayable = calDays > 0 ? Number(((monthlySalary / calDays) * effectiveDays).toFixed(2)) : 0;
          } else {
            salaryPayable = 0;
          }
        }

        // Gross rules (do NOT fabricate base salary for non-salary employees)
        const gross = Number(
          (isSalaryProcEmp ? salaryPayable + extraHourAmount : extraHourAmount).toFixed(2)
        );

        // ADV in range (keep existing logic)
        const advKeyCode = empCode ? `CODE:${empCode}` : "";
        const advKeyName = `NAME:${empNameLower}`;
        const advInRange = Number(
          (advKeyCode && advInRangeByEmployee.get(advKeyCode)) || advInRangeByEmployee.get(advKeyName) || 0
        );

        // Opening (keep existing logic)
        let opening = 0;
        const ob = Number(empMaster?.openingBalance ?? 0) || 0;
        const asOn = empMaster?.asOn ? String(empMaster.asOn).trim() : "";
        if (!asOn) opening = ob;
        else opening = asOn <= fromDate ? ob : 0;

        const net = Number((gross - advInRange + opening).toFixed(2));

        return {
          employeeCode: empCode,
          employeeName: empName,

          processNameMaster,
          processDisplay: processNameMaster,

          isSalaryProcessEmployee: isSalaryProcEmp,
          shownBecauseExtraWork: !isSalaryProcEmp && extraWork,

          present,
          halfDay,
          absent,
          effectiveDays,
          attendancePercent,

          extraHours,
          extraHourRateAvg,
          extraHourAmount,

          monthlySalary,
          salaryPayable,

          advInRange,
          opening,

          gross,
          net,
        } as EmployeeWiseRow;
      })
      .filter(Boolean) as EmployeeWiseRow[];

    // Sort: Salary-process employees first (within scope), then name
    rowsBuilt.sort((a, b) => {
      if (a.isSalaryProcessEmployee !== b.isSalaryProcessEmployee) return a.isSalaryProcessEmployee ? -1 : 1;
      return a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: "base" });
    });

    return rowsBuilt;
  }, [
    salarySupport,
    attendanceExceptions,
    attendanceExceptionsByEmp,
    fromDate,
    toDate,
    processName,
    employeeName,
    selectedEmployeeCode,
    employeeByCode,
    employeeByNameLower,
    advInRangeByEmployee,
  ]);

  const employeeWiseTotals = useMemo(() => {
    const t = {
      employees: employeeWiseRows.length,
      present: 0,
      halfDay: 0,
      absent: 0,
      effectiveDays: 0,
      extraHours: 0,
      extraAmount: 0,
      salaryPayable: 0,
      gross: 0,
      adv: 0,
      opening: 0,
      net: 0,
    };

    employeeWiseRows.forEach((r) => {
      t.present += r.present;
      t.halfDay += r.halfDay;
      t.absent += r.absent;
      t.effectiveDays += r.effectiveDays;

      t.extraHours += r.extraHours;
      t.extraAmount += r.extraHourAmount;

      t.salaryPayable += r.salaryPayable;

      t.gross += r.gross;
      t.adv += r.advInRange;
      t.opening += r.opening;
      t.net += r.net;
    });

    t.effectiveDays = Number(t.effectiveDays.toFixed(2));
    t.extraHours = Number(t.extraHours.toFixed(2));
    t.extraAmount = Number(t.extraAmount.toFixed(2));
    t.salaryPayable = Number(t.salaryPayable.toFixed(2));
    t.gross = Number(t.gross.toFixed(2));
    t.adv = Number(t.adv.toFixed(2));
    t.opening = Number(t.opening.toFixed(2));
    t.net = Number(t.net.toFixed(2));

    return t;
  }, [employeeWiseRows]);

  // ---------- Existing payment selection logic (KEEP AS-IS) ----------
  const employeeKeysForCurrentReport = useMemo(() => {
    const eSel = employeeName.trim().toLowerCase();
    if (eSel) return [eSel];
    return Array.from(new Set(sorted.map((r) => (r.employee || "").trim().toLowerCase()).filter(Boolean)));
  }, [sorted, employeeName]);

  const paymentRowsForSelection = useMemo(() => {
    const fromT = parseYMDLocalToTS(fromDate);
    const toT = parseYMDLocalToTS(toDate) + DAY_MS - 1;

    const selectedEmpLower = employeeName.trim().toLowerCase();
    const selectedEmp = selectedEmpLower ? employeeByNameLower.get(selectedEmpLower) : undefined;
    const selectedEmpCode2 = selectedEmp?.code ? String(selectedEmp.code).trim() : "";

    const employeeNamesInReport = new Set(employeeKeysForCurrentReport);

    const shouldFilterByProcess = !employeeName && !!processName;
    const selectedProcLower = processName.trim().toLowerCase();

    const matchEmployee = (p: PaymentRow) => {
      const payNameLower = p.employeeName.trim().toLowerCase();
      const payCode = (p.employeeCode || "").trim();

      if (selectedEmpLower) {
        if (payNameLower === selectedEmpLower) return true;
        if (selectedEmpCode2 && payCode && payCode === selectedEmpCode2) return true;
        return false;
      }

      if (employeeNamesInReport.size === 0) return false;
      return employeeNamesInReport.has(payNameLower);
    };

    const filteredPayments = normalizedPayments.filter((p) => {
      if (!matchEmployee(p)) return false;

      if (shouldFilterByProcess) {
        const pProc = (p.process || "").trim().toLowerCase();
        if (!pProc) return false;
        if (pProc !== selectedProcLower) return false;
      }

      return true;
    });

    const inRangePayments = filteredPayments.filter((p) => p.dateTS >= fromT && p.dateTS <= toT).sort((a, b) => a.dateTS - b.dateTS);
    const beforePayments = filteredPayments.filter((p) => p.dateTS < fromT).sort((a, b) => a.dateTS - b.dateTS);

    return { inRangePayments, beforePayments };
  }, [normalizedPayments, fromDate, toDate, processName, employeeName, employeeByNameLower, employeeKeysForCurrentReport]);

  // ---------- Existing Payment summary (KEEP AS-IS) ----------
  const paymentSummary = useMemo(() => {
    const grossCurrent = totals.amount;
    const fromT = parseYMDLocalToTS(fromDate);

    const advBefore = paymentRowsForSelection.beforePayments.reduce((s, p) => s + (p.amount || 0), 0);
    const advCurrent = paymentRowsForSelection.inRangePayments.reduce((s, p) => s + (p.amount || 0), 0);

    const relevantEmployeeKeys = employeeKeysForCurrentReport;

    if (relevantEmployeeKeys.length === 0) {
      const opening = 0;
      const net = Number((grossCurrent - advCurrent + opening).toFixed(2));
      return { advances: advCurrent, grossPayment: grossCurrent, opening, net };
    }

    const empMatch = (nameLower: string) => relevantEmployeeKeys.includes(nameLower);

    const shouldFilterByProcess = !employeeName && !!processName;
    const selectedProcLower = processName.trim().toLowerCase();

    const grossBefore = allRows.reduce((sum, r) => {
      const nm = (r.employee || "").trim().toLowerCase();
      if (!empMatch(nm)) return sum;

      if (shouldFilterByProcess) {
        if (r.process.trim().toLowerCase() !== selectedProcLower) return sum;
      }

      const tt = parseAnyDateToLocalDayTS(r.date);
      if (!Number.isFinite(tt) || tt >= fromT) return sum;

      return sum + (r.amount || 0);
    }, 0);

    const opening = Number((grossBefore - advBefore).toFixed(2));
    const net = Number((grossCurrent - advCurrent + opening).toFixed(2));

    return { advances: advCurrent, grossPayment: grossCurrent, opening, net };
  }, [totals.amount, paymentRowsForSelection, employeeKeysForCurrentReport, allRows, fromDate, processName, employeeName]);

  // ---------- UI handlers ----------
  function resetAll() {
    setProcessName("");
    setEmployeeName("");
    setFromDate(getFirstOfMonthIso());
    setToDate(getTodayIso());
    setSorting("Date Wise");
    setShowModal(false);
    setFullScreen(false);
    setSalarySupport([]);
    setAttendanceExceptions([]);
  }

  // Print
  function handlePrintReport() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const totalPieces = totals.pieces;
    const totalAmount = totals.amount;

    const shouldPrintEmpSummary = employeeWiseRows.length > 0;

    const empSummarySection = shouldPrintEmpSummary
      ? (() => {
          const empWiseLines = employeeWiseRows
            .map((r, i) => {
              const td = (v: string, cls = "") => `<td class="${cls}">${v}</td>`;
              const dashIf = (ok: boolean, v: string) => (ok ? v : "-");

              return `
                <tr>
                  ${td(String(i + 1))}
                  ${td(r.employeeCode || "")}
                  ${td(r.employeeName || "")}
                  ${td(r.processDisplay || "")}

                  ${td(dashIf(r.isSalaryProcessEmployee, String(r.present)), "text-right")}
                  ${td(dashIf(r.isSalaryProcessEmployee, String(r.halfDay)), "text-right")}
                  ${td(dashIf(r.isSalaryProcessEmployee, String(r.absent)), "text-right")}
                  ${td(dashIf(r.isSalaryProcessEmployee, fmtNumber(r.effectiveDays)), "text-right")}
                  ${td(dashIf(r.isSalaryProcessEmployee, fmtNumber(r.attendancePercent) + "%"), "text-right")}

                  ${td(fmtNumber(r.extraHours), "text-right")}
                  ${td(fmtNumber(r.extraHourRateAvg), "text-right")}
                  ${td(fmtNumber(r.extraHourAmount), "text-right")}

                  ${td(dashIf(r.isSalaryProcessEmployee, fmtNumber(r.monthlySalary)), "text-right")}
                  ${td(dashIf(r.isSalaryProcessEmployee, fmtNumber(r.salaryPayable)), "text-right")}

                  ${td(fmtNumber(r.gross), "text-right")}
                  ${td(fmtNumber(r.advInRange), "text-right")}
                  ${td(fmtNumber(r.opening), "text-right")}
                  ${td(fmtNumber(r.net), "text-right")}
                </tr>
              `;
            })
            .join("");

          return `
            <div class="section-title">Employee Wise Summary</div>
            <table>
              <thead>
                <tr>
                  <th>S No</th>
                  <th>Emp Code</th>
                  <th>Employee</th>
                  <th>Process</th>

                  <th class="text-right">P</th>
                  <th class="text-right">H</th>
                  <th class="text-right">A</th>
                  <th class="text-right">Eff Days</th>
                  <th class="text-right">Att %</th>

                  <th class="text-right">Extra Hrs</th>
                  <th class="text-right">Extra Rate(avg)</th>
                  <th class="text-right">Extra Amt</th>

                  <th class="text-right">Monthly Salary</th>
                  <th class="text-right">Salary Payable</th>

                  <th class="text-right">Gross</th>
                  <th class="text-right">ADV</th>
                  <th class="text-right">Opening</th>
                  <th class="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                ${empWiseLines}
              </tbody>
            </table>
          `;
        })()
      : "";

    const paymentLines = paymentRowsForSelection.inRangePayments
      .map(
        (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${fmtDateHeader(p.dateISO)}</td>
          <td class="text-right">${fmtNumber(p.amount)}</td>
          <td>${p.process || ""}</td>
          <td>${p.remarks || ""}</td>
        </tr>
      `
      )
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Salary Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
      h2 { text-align: center; margin-bottom: 8px; }
      .info { margin-bottom: 12px; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; font-size: 11px; }
      th, td { border: 1px solid #444; padding: 6px; text-align: left; vertical-align: top; }
      th { background: #eee; }
      .text-right { text-align: right; }
      .totals { margin-top: 12px; font-weight: bold; }
      .section-title { margin-top: 14px; font-weight: 700; }
      @media print { button { display: none; } }
    </style>
  </head>
  <body>
    <h2>Salary Report</h2>
    <div class="info">
      <div><strong>Process:</strong> ${processName || "All"} ${employeeName ? "(Employee selected: production table shows ALL processes)" : ""}</div>
      <div><strong>Employee:</strong> ${employeeName || "All"}</div>
      <div><strong>From:</strong> ${fmtDateHeader(fromDate)} &nbsp; <strong>To:</strong> ${fmtDateHeader(toDate)}</div>

      <div style="margin-top:8px;">
        <strong>Production Rows:</strong> ${totals.rows}
        &nbsp; | &nbsp;
        <strong>Production Pieces:</strong> ${totalPieces.toLocaleString()}
        &nbsp; | &nbsp;
        <strong>Production Amount:</strong> ${fmtNumber(totalAmount)}
      </div>

      ${
        shouldPrintEmpSummary
          ? `<div style="margin-top:6px;">
              <strong>Employee-wise Net Total:</strong> ${fmtNumber(employeeWiseTotals.net)}
              (Gross ${fmtNumber(employeeWiseTotals.gross)} - ADV ${fmtNumber(employeeWiseTotals.adv)} + Opening ${fmtNumber(employeeWiseTotals.opening)})
            </div>`
          : ""
      }
    </div>

    ${empSummarySection}

    <div class="section-title">Production Details</div>
    <table>
      <thead>
        <tr>
          <th>S No</th>
          <th>Date</th>
          <th>Art No</th>
          <th>Lot No</th>
          <th class="text-right">Piece</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${fmtDateHeader(r.date)}</td>
          <td>${r.artNo}</td>
          <td>${r.lotNo}</td>
          <td class="text-right">${r.piece.toLocaleString()}</td>
          <td class="text-right">${fmtRate(r.rate)}</td>
          <td class="text-right">${fmtNumber(r.amount)}</td>
        </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div>Production Pieces: ${totalPieces.toLocaleString()}</div>
      <div>Production Amount: ${fmtNumber(totalAmount)}</div>
      <div style="margin-top:8px;">
        (Existing) Net Salary: ${fmtNumber(paymentSummary.net)}
        (Gross ${fmtNumber(paymentSummary.grossPayment)} - ADV ${fmtNumber(paymentSummary.advances)} + Opening ${fmtNumber(paymentSummary.opening)})
      </div>
    </div>

    <div class="section-title">Payments (ADV) in Selected Date Range</div>
    <table>
      <thead>
        <tr>
          <th>S No</th>
          <th>Payment Date</th>
          <th class="text-right">Amount</th>
          <th>Process</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${paymentLines || `<tr><td colspan="5" style="text-align:center;color:#666">No payments found in range</td></tr>`}
      </tbody>
    </table>

    <script>
      window.onload = function () {
        try { window.focus(); window.print(); } catch (e) {}
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
  }

  // ✅ Hide entire summary if no qualifying employees (after loading)
  const showEmployeeWiseSummary = supportLoading || employeeWiseRows.length > 0;

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-3">Salary Details (Employee Wise)</h2>

          {loading && <div className="text-sm text-gray-600 mb-2">Loading data...</div>}
          {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <label className="block text-sm">Process Name</label>
              <select
                value={processName}
                onChange={(e) => {
                  setProcessName(e.target.value);
                  setEmployeeName("");
                }}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">-- All Processes --</option>
                {processes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {employeeName && (
                <div className="text-[11px] text-gray-600 mt-1">
                  Note: Employee selected → production detail table shows ALL processes for that employee.
                </div>
              )}
            </div>

            <div className="col-span-3">
              <label className="block text-sm">Employee Name</label>
              <select
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">{processName ? `-- All ${processName} Employees --` : "-- All Employees --"}</option>
                {employeesForProcess.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">Sorting</label>
              <select
                value={sorting}
                onChange={(e) => setSorting(e.target.value as "Date Wise" | "Art No Wise" | "Lot Wise")}
                className="mt-1 p-2 border rounded w-full"
              >
                <option>Date Wise</option>
                <option>Art No Wise</option>
                <option>Lot Wise</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setShowModal(true)}>
              Show
            </button>

            <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={resetAll}>
              Reset
            </button>

            <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={() => setShowAttendanceMgmt(true)}>
              Attendance
            </button>

            <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={() => setShowExtraHoursMgmt(true)}>
              Extra Hours
            </button>

            <div className="ml-auto text-sm text-gray-600">
              Production Rows: <strong>{totals.rows}</strong> | Pieces: <strong>{totals.pieces.toLocaleString()}</strong> | Amount:{" "}
              <strong>{fmtNumber(totals.amount)}</strong>
            </div>
          </div>
        </div>

        {/* Attendance Management modal */}
        <AttendanceManagement
          open={showAttendanceMgmt}
          onClose={() => setShowAttendanceMgmt(false)}
          defaultDate={toDate}
          defaultProcessSerialNo={""}
          defaultEmployeeCode={selectedEmployeeCode}
          onSaved={() => {
            if (showModal) loadSalarySupport();
          }}
        />

        {/* Extra Hours Management modal */}
        <ExtraHoursManagement
          open={showExtraHoursMgmt}
          onClose={() => setShowExtraHoursMgmt(false)}
          defaultFromDate={fromDate}
          defaultToDate={toDate}
          defaultProcessSerialNo={!employeeName ? selectedProcessSerialNo : ""}
          defaultEmployeeCode={selectedEmployeeCode}
          onSaved={() => {
            if (showModal) loadSalarySupport();
          }}
        />

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowModal(false)} />

            <div
              className={`relative bg-white rounded shadow overflow-hidden ${fullScreen ? "w-full h-full m-0" : "w-[95%] lg:w-[90%] m-4"}`}
              style={{ maxHeight: fullScreen ? "100vh" : "90vh" }}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div>
                  <div className="text-sm text-gray-700">
                    <strong>Process:</strong> {processName || "All"}{" "}
                    {employeeName ? "(Employee selected: production table shows ALL processes)" : ""} &nbsp; | &nbsp;
                    <strong>Employee:</strong> {employeeName || "All"} &nbsp; | &nbsp;
                    <strong>From:</strong> {fmtDateHeader(fromDate)} &nbsp; | &nbsp;
                    <strong>To:</strong> {fmtDateHeader(toDate)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Production Rows: {totals.rows} | Pieces: {totals.pieces.toLocaleString()} | Amount: {fmtNumber(totals.amount)} | Sort: {sorting}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 border rounded text-sm hover:bg-gray-100" onClick={() => setFullScreen(!fullScreen)}>
                    {fullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                  <button className="px-2 py-1 border rounded text-sm hover:bg-gray-100" onClick={handlePrintReport}>
                    Print
                  </button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                </div>
              </div>

              <div className="p-2 overflow-auto" style={{ height: fullScreen ? "calc(100vh - 72px)" : "78vh" }}>
                <div className="min-w-max">
                  {/* ✅ Employee Wise Summary (hidden entirely if no qualifying employees) */}
                  {showEmployeeWiseSummary && (
                    <div className="border rounded bg-white mb-4">
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">Employee Wise Summary</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Salary Process employee rule: <strong>Process = Salary</strong> (Salary Type ignored).
                            <br />
                            Filtering order: Selected Process → Selected Employee → (Salary-process employee OR Extra work).
                          </div>
                        </div>
                        <div className="text-xs text-gray-700 text-right">
                          {supportLoading ? (
                            <span>Loading attendance/extra hours...</span>
                          ) : (
                            <span>
                              Employees: <strong>{employeeWiseTotals.employees}</strong> | Gross:{" "}
                              <strong>{fmtNumber(employeeWiseTotals.gross)}</strong> | ADV:{" "}
                              <strong>{fmtNumber(employeeWiseTotals.adv)}</strong> | Opening:{" "}
                              <strong>{fmtNumber(employeeWiseTotals.opening)}</strong> | Net:{" "}
                              <strong>{fmtNumber(employeeWiseTotals.net)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t overflow-auto" style={{ maxHeight: "38vh" }}>
                        <table className="w-full text-xs border-collapse">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="border px-2 py-1">S No</th>
                              <th className="border px-2 py-1">Emp Code</th>
                              <th className="border px-2 py-1">Employee</th>
                              <th className="border px-2 py-1">Process</th>

                              <th className="border px-2 py-1 text-right">P</th>
                              <th className="border px-2 py-1 text-right">H</th>
                              <th className="border px-2 py-1 text-right">A</th>
                              <th className="border px-2 py-1 text-right">Eff Days</th>
                              <th className="border px-2 py-1 text-right">Att %</th>

                              <th className="border px-2 py-1 text-right">Extra Hrs</th>
                              <th className="border px-2 py-1 text-right">Extra Rate(avg)</th>
                              <th className="border px-2 py-1 text-right">Extra Amt</th>

                              <th className="border px-2 py-1 text-right">Monthly Salary</th>
                              <th className="border px-2 py-1 text-right">Salary Payable</th>

                              <th className="border px-2 py-1 text-right">Gross</th>
                              <th className="border px-2 py-1 text-right">ADV</th>
                              <th className="border px-2 py-1 text-right">Opening</th>
                              <th className="border px-2 py-1 text-right">Net</th>
                            </tr>
                          </thead>

                          <tbody>
                            {!supportLoading &&
                              employeeWiseRows.map((r, idx) => {
                                const dashIf = (ok: boolean, v: string) => (ok ? v : "-");

                                return (
                                  <tr key={`${r.employeeCode}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="border px-2 py-1 text-center">{idx + 1}</td>
                                    <td className="border px-2 py-1">{r.employeeCode}</td>
                                    <td className="border px-2 py-1">
                                      {r.employeeName}
                                      {r.shownBecauseExtraWork && (
                                        <div className="text-[10px] text-blue-700">Shown due to extra work</div>
                                      )}
                                    </td>
                                    <td className="border px-2 py-1">{r.processDisplay}</td>

                                    <td className="border px-2 py-1 text-right">{dashIf(r.isSalaryProcessEmployee, String(r.present))}</td>
                                    <td className="border px-2 py-1 text-right">{dashIf(r.isSalaryProcessEmployee, String(r.halfDay))}</td>
                                    <td className="border px-2 py-1 text-right">{dashIf(r.isSalaryProcessEmployee, String(r.absent))}</td>
                                    <td className="border px-2 py-1 text-right">{dashIf(r.isSalaryProcessEmployee, fmtNumber(r.effectiveDays))}</td>
                                    <td className="border px-2 py-1 text-right">
                                      {dashIf(r.isSalaryProcessEmployee, fmtNumber(r.attendancePercent) + "%")}
                                    </td>

                                    <td className="border px-2 py-1 text-right">{fmtNumber(r.extraHours)}</td>
                                    <td className="border px-2 py-1 text-right">{fmtNumber(r.extraHourRateAvg)}</td>
                                    <td className="border px-2 py-1 text-right">{fmtNumber(r.extraHourAmount)}</td>

                                    <td className="border px-2 py-1 text-right">
                                      {dashIf(r.isSalaryProcessEmployee, fmtNumber(r.monthlySalary))}
                                    </td>
                                    <td className="border px-2 py-1 text-right">
                                      {dashIf(r.isSalaryProcessEmployee, fmtNumber(r.salaryPayable))}
                                    </td>

                                    <td className="border px-2 py-1 text-right font-semibold">{fmtNumber(r.gross)}</td>
                                    <td className="border px-2 py-1 text-right">{fmtNumber(r.advInRange)}</td>
                                    <td className="border px-2 py-1 text-right">{fmtNumber(r.opening)}</td>
                                    <td className="border px-2 py-1 text-right font-semibold">{fmtNumber(r.net)}</td>
                                  </tr>
                                );
                              })}

                            {supportLoading && (
                              <tr>
                                <td colSpan={18} className="border px-2 py-4 text-center text-gray-500">
                                  Loading employee-wise attendance / extra hours...
                                </td>
                              </tr>
                            )}
                          </tbody>

                          {!supportLoading && employeeWiseRows.length > 0 && (
                            <tfoot>
                              <tr className="bg-gray-100 font-semibold">
                                <td colSpan={4} className="border px-2 py-1 text-right">
                                  Total
                                </td>

                                <td className="border px-2 py-1 text-right">{employeeWiseTotals.present}</td>
                                <td className="border px-2 py-1 text-right">{employeeWiseTotals.halfDay}</td>
                                <td className="border px-2 py-1 text-right">{employeeWiseTotals.absent}</td>
                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.effectiveDays)}</td>
                                <td className="border px-2 py-1" />

                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.extraHours)}</td>
                                <td className="border px-2 py-1" />
                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.extraAmount)}</td>

                                <td className="border px-2 py-1" />
                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.salaryPayable)}</td>

                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.gross)}</td>
                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.adv)}</td>
                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.opening)}</td>
                                <td className="border px-2 py-1 text-right">{fmtNumber(employeeWiseTotals.net)}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Production Table (KEEP EXISTING) */}
                  <table className="w-full table-auto text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 border">S No</th>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">Art No</th>
                        <th className="px-2 py-1 border">Lot No</th>
                        <th className="px-2 py-1 border text-right">Piece</th>
                        <th className="px-2 py-1 border text-right">Rate</th>
                        <th className="px-2 py-1 border text-right">Amount</th>
                        <th className="px-2 py-1 border">Process</th>
                        <th className="px-2 py-1 border">Employee</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sorted.map((r, idx) => (
                        <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-2 py-1 border">{idx + 1}</td>
                          <td className="px-2 py-1 border">{fmtDateHeader(r.date)}</td>
                          <td className="px-2 py-1 border">{r.artNo}</td>
                          <td className="px-2 py-1 border">{r.lotNo}</td>
                          <td className="px-2 py-1 border text-right">{r.piece.toLocaleString()}</td>
                          <td className="px-2 py-1 border text-right">{fmtRate(r.rate)}</td>
                          <td className="px-2 py-1 border text-right">{fmtNumber(r.amount)}</td>
                          <td className="px-2 py-1 border">{r.process}</td>
                          <td className="px-2 py-1 border">{r.employee}</td>
                        </tr>
                      ))}

                      {sorted.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-2 py-3 border text-center text-gray-500">
                            No rows found for selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Existing Totals + Payment Summary (KEEP EXISTING) */}
                  <div className="mt-4 border rounded bg-white">
                    <div className="p-3">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-4">
                          <div className="text-sm font-semibold">Production Totals</div>
                          <div className="text-xs text-gray-700 mt-1">
                            Rows: <strong>{totals.rows}</strong>
                          </div>
                          <div className="text-xs text-gray-700">
                            Pieces: <strong>{totals.pieces.toLocaleString()}</strong>
                          </div>
                          <div className="text-xs text-gray-700">
                            Amount: <strong>{fmtNumber(totals.amount)}</strong>
                          </div>
                        </div>

                        <div className="col-span-5">
                          <div className="text-sm font-semibold">Payment Details (Existing)</div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="text-gray-700">ADV (Selected Range):</div>
                            <div className="text-right text-gray-900">{fmtNumber(paymentSummary.advances)}</div>

                            <div className="text-gray-700">Gross Payment:</div>
                            <div className="text-right text-gray-900">{fmtNumber(paymentSummary.grossPayment)}</div>

                            <div className="text-gray-700">Opening:</div>
                            <div className="text-right text-gray-900">{fmtNumber(paymentSummary.opening)}</div>
                          </div>

                          <div className="mt-3 text-[11px] text-gray-600">
                            Calculation: <strong>Net = Gross - ADV + Opening</strong>
                          </div>
                        </div>

                        <div className="col-span-3 text-right">
                          <div className="text-sm font-semibold">Net Salary (Existing)</div>
                          <div className="text-lg text-black font-bold bg-yellow-200 inline-block px-3 py-1 rounded mt-2">
                            {fmtNumber(paymentSummary.net)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm font-semibold mb-2">Payments (ADV) - Date Wise</div>
                        <div className="border rounded overflow-auto max-h-56">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="border px-2 py-1">S No</th>
                                <th className="border px-2 py-1">Payment Date</th>
                                <th className="border px-2 py-1">Employee</th>
                                <th className="border px-2 py-1">Process</th>
                                <th className="border px-2 py-1 text-right">Amount</th>
                                <th className="border px-2 py-1">Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentRowsForSelection.inRangePayments.map((p, i) => (
                                <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="border px-2 py-1 text-center">{i + 1}</td>
                                  <td className="border px-2 py-1">{fmtDateHeader(p.dateISO)}</td>
                                  <td className="border px-2 py-1">{p.employeeName}</td>
                                  <td className="border px-2 py-1">{p.process}</td>
                                  <td className="border px-2 py-1 text-right">{fmtNumber(p.amount)}</td>
                                  <td className="border px-2 py-1">{p.remarks}</td>
                                </tr>
                              ))}

                              {paymentRowsForSelection.inRangePayments.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="border px-2 py-3 text-center text-gray-500">
                                    No payments found in selected date range.
                                    {!employeeName && (
                                      <div className="mt-1">Tip: Select an employee to see only that employee payments.</div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </tbody>

                            {paymentRowsForSelection.inRangePayments.length > 0 && (
                              <tfoot>
                                <tr className="bg-gray-100 font-semibold">
                                  <td colSpan={4} className="border px-2 py-1 text-right">
                                    Total ADV
                                  </td>
                                  <td className="border px-2 py-1 text-right">{fmtNumber(paymentSummary.advances)}</td>
                                  <td className="border px-2 py-1" />
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* End Summary */}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default SalaryReport;