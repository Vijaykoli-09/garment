"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

// ================= Types =================
type Employee = {
  code: string;
  employeeName: string;
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
  dateISO: string; // YYYY-MM-DD
  dateTS: number;
  employeeName: string;
  employeeCode: string;
  process: string;
  amount: number;
  remarks: string;
};

const fmtDateHeader = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}/${d.getFullYear()}`;
};

const fmtNumber = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRate = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getFirstOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const SalaryReport: React.FC = () => {
  const [cuttingEntries, setCuttingEntries] = useState<CuttingEntryDTO[]>([]);
  const [productionReceipts, setProductionReceipts] = useState<ProductionReceiptDTO[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [processList, setProcessList] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [processName, setProcessName] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");

  const [fromDate, setFromDate] = useState<string>(getFirstOfMonthIso());
  const [toDate, setToDate] = useState<string>(getTodayIso());
  const [sorting, setSorting] = useState<"Date Wise" | "Art No Wise" | "Lot Wise">("Date Wise");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // ---------- helpers ----------
  const toTime = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? NaN : d.getTime();
  };

  const toISODate = (value: any) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  // ---------- Load all data ----------
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

        const prodList: ProductionReceiptDTO[] = Array.isArray(prodRes.data)
          ? prodRes.data
          : prodRes.data?.data || [];

        const empList: Employee[] = Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || [];

        const payList: any[] = Array.isArray(payRes.data) ? payRes.data : payRes.data?.data || [];

        const procList: any[] = Array.isArray(procRes.data) ? procRes.data : procRes.data?.data || [];

        setCuttingEntries(cuttingList);
        setProductionReceipts(prodList);
        setEmployees(empList);
        setPayments(payList);
        setProcessList(
          procList.map((p: any) => ({
            ...p,
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
    const fromMaster = processList
      .map((p) => p.processName)
      .filter((p: string) => p && p.trim().length > 0);

    const combined = Array.from(new Set([...fromData, ...fromMaster]));
    return combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [allRows, processList]);

  // ---------- Employee dropdown (process select se list filter hoti rahegi) ----------
  const employeesForProcess = useMemo(() => {
    let filteredEmployees = allEmployees;
    if (processName) {
      const pLower = processName.trim().toLowerCase();
      filteredEmployees = allEmployees.filter(
        (e) => (e.process?.processName || "").trim().toLowerCase() === pLower
      );
    }
    const names = filteredEmployees
      .map((e) => (e.employeeName || "").trim())
      .filter((n) => n.length > 0);

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [allEmployees, processName]);

  /**
   * ✅ Filter rule:
   * - Employee select = employee ke ALL processes show
   * - Process filter apply only when employee not selected
   */
  const filtered = useMemo(() => {
    const f = toTime(fromDate);
    const t = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;

    const pSel = processName.trim().toLowerCase();
    const eSel = employeeName.trim().toLowerCase();

    return allRows.filter((r) => {
      const tt = toTime(r.date);
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
          const dc = toTime(a.date) - toTime(b.date);
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
          const dc = toTime(a.date) - toTime(b.date);
          if (dc !== 0) return dc;
          return a.lotNo.localeCompare(b.lotNo);
        });
        break;

      case "Lot Wise":
        data.sort((a, b) => {
          const lc = a.lotNo.localeCompare(b.lotNo);
          if (lc !== 0) return lc;
          const dc = toTime(a.date) - toTime(b.date);
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

  // ---------- ✅ Normalize payments (so employee payment + payment date always show) ----------
  const normalizedPayments = useMemo<PaymentRow[]>(() => {
    const list = Array.isArray(payments) ? payments : [];

    return list
      .map((p: any, idx: number) => {
        const employeeName = String(
          p.employeeName ?? p.employee ?? p.empName ?? p.partyName ?? p.name ?? ""
        ).trim();

        const employeeCode = String(
          p.employeeCode ?? p.empCode ?? p.employeeId ?? p.empId ?? p.code ?? ""
        ).trim();

        const process = String(p.processName ?? p.process ?? "").trim();

        const dateISO = toISODate(p.paymentDate ?? p.date ?? p.dated ?? p.createdAt ?? "");
        const dateTS = dateISO ? toTime(dateISO) : NaN;

        const amount = Number(
          parseFloat(String(p.amount ?? p.paidAmount ?? p.paymentAmount ?? p.amt ?? 0)) || 0
        );

        const remarks = String(p.remarks ?? p.remark ?? p.note ?? "").trim();

        return {
          id: String(p.id ?? p.serialNo ?? p._id ?? idx + 1),
          dateISO,
          dateTS,
          employeeName,
          employeeCode,
          process,
          amount,
          remarks,
        };
      })
      .filter((p) => p.employeeName && p.dateISO && Number.isFinite(p.dateTS) && p.amount !== 0);
  }, [payments]);

  const paymentRowsForSelection = useMemo(() => {
    const fromT = toTime(fromDate);
    const toT = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;

    const selectedEmpLower = employeeName.trim().toLowerCase();
    const selectedEmp = selectedEmpLower ? employeeByNameLower.get(selectedEmpLower) : undefined;
    const selectedEmpCode = selectedEmp?.code ? String(selectedEmp.code).trim() : "";

    // employees present in current sorted rows
    const employeeNamesInReport = new Set(
      sorted.map((r) => (r.employee || "").trim().toLowerCase()).filter(Boolean)
    );

    const shouldFilterByProcess = !employeeName && !!processName;
    const selectedProcLower = processName.trim().toLowerCase();

    const matchEmployee = (p: PaymentRow) => {
      const payNameLower = p.employeeName.trim().toLowerCase();
      const payCode = (p.employeeCode || "").trim();

      if (selectedEmpLower) {
        if (payNameLower === selectedEmpLower) return true;
        if (selectedEmpCode && payCode && payCode === selectedEmpCode) return true;
        return false;
      }

      // if no employee selected: show payments of employees included in current report (better UX)
      return employeeNamesInReport.size ? employeeNamesInReport.has(payNameLower) : true;
    };

    const filteredPayments = normalizedPayments.filter((p) => {
      if (!matchEmployee(p)) return false;

      // process filter only when employee not selected.
      // if payment process missing, we DO NOT block it (so payment still shows).
      if (shouldFilterByProcess) {
        const pProc = (p.process || "").trim().toLowerCase();
        if (pProc && pProc !== selectedProcLower) return false;
      }

      // keep both ranges
      return true;
    });

    const inRangePayments = filteredPayments
      .filter((p) => p.dateTS >= fromT && p.dateTS <= toT)
      .sort((a, b) => a.dateTS - b.dateTS);

    const beforePayments = filteredPayments
      .filter((p) => p.dateTS < fromT)
      .sort((a, b) => a.dateTS - b.dateTS);

    return { inRangePayments, beforePayments };
  }, [normalizedPayments, fromDate, toDate, processName, employeeName, sorted, employeeByNameLower]);

  // ---------- Payment summary (Gross, ADV, Opening, Net) ----------
  const paymentSummary = useMemo(() => {
    const grossCurrent = totals.amount;

    const fromT = toTime(fromDate);

    // ✅ ADV totals now come from normalized payment rows (so they surely show)
    const advBefore = paymentRowsForSelection.beforePayments.reduce((s, p) => s + (p.amount || 0), 0);
    const advCurrent = paymentRowsForSelection.inRangePayments.reduce((s, p) => s + (p.amount || 0), 0);

    // GrossBefore (allRows, employee, date < from)
    const employeeKeysInRows = Array.from(
      new Set(
        sorted.map((r) => (r.employee || "").trim().toLowerCase()).filter((n) => n.length > 0)
      )
    );

    if (employeeKeysInRows.length === 0) {
      const opening = Number((0 - advBefore).toFixed(2));
      const net = Number((grossCurrent - advCurrent + opening).toFixed(2));
      return { advances: advCurrent, grossPayment: grossCurrent, opening, net };
    }

    let relevantEmployeeKeys = employeeKeysInRows;
    if (employeeName) relevantEmployeeKeys = [employeeName.trim().toLowerCase()];

    const empMatch = (nameLower: string) => relevantEmployeeKeys.includes(nameLower);

    // same rule: if employee selected -> ignore process filter (all processes)
    const shouldFilterByProcess = !employeeName && !!processName;
    const selectedProcLower = processName.trim().toLowerCase();

    const grossBefore = allRows.reduce((sum, r) => {
      const nm = (r.employee || "").trim().toLowerCase();
      if (!empMatch(nm)) return sum;

      if (shouldFilterByProcess) {
        if (r.process.trim().toLowerCase() !== selectedProcLower) return sum;
      }

      const tt = toTime(r.date);
      if (!Number.isFinite(tt) || tt >= fromT) return sum;

      return sum + (r.amount || 0);
    }, 0);

    const opening = Number((grossBefore - advBefore).toFixed(2));
    const net = Number((grossCurrent - advCurrent + opening).toFixed(2));

    return { advances: advCurrent, grossPayment: grossCurrent, opening, net };
  }, [totals.amount, paymentRowsForSelection, sorted, allRows, fromDate, processName, employeeName]);

  // ---------- UI handlers ----------
  function resetAll() {
    setProcessName("");
    setEmployeeName("");
    setFromDate(getFirstOfMonthIso());
    setToDate(getTodayIso());
    setSorting("Date Wise");
    setShowModal(false);
    setFullScreen(false);
  }

  function handleShow() {
    setShowModal(true);
  }

  // Print (Process + Employee columns removed from PRINT TABLE only)
  function handlePrintReport() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const totalPieces = totals.pieces;
    const totalAmount = totals.amount;

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
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #444; padding: 6px; text-align: left; }
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
      <div><strong>Process:</strong> ${processName || "All"} ${
      employeeName ? "(Employee selected: showing ALL processes)" : ""
    }</div>
      <div><strong>Employee:</strong> ${employeeName || "All"}</div>
      <div><strong>From:</strong> ${fmtDateHeader(fromDate)} &nbsp; <strong>To:</strong> ${fmtDateHeader(toDate)}</div>
      <div style="margin-top:8px;">
        <strong>Rows:</strong> ${totals.rows}
        &nbsp; | &nbsp;
        <strong>Pieces:</strong> ${totalPieces.toLocaleString()}
        &nbsp; | &nbsp;
        <strong>Amount:</strong> ${fmtNumber(totalAmount)}
      </div>
    </div>

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
      <div>Total Pieces: ${totalPieces.toLocaleString()}</div>
      <div>Total Amount: ${fmtNumber(totalAmount)}</div>
      <div style="margin-top:8px;">
        Net Salary: ${fmtNumber(paymentSummary.net)} (Gross ${fmtNumber(
      paymentSummary.grossPayment
    )} - ADV ${fmtNumber(paymentSummary.advances)} + Opening ${fmtNumber(paymentSummary.opening)})
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
                  Note: Employee selected → report shows ALL processes for that employee.
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
                <option value="">
                  {processName ? `-- All ${processName} Employees --` : "-- All Employees --"}
                </option>
                {employeesForProcess.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
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

          <div className="flex items-center gap-3 mt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleShow}>
              Show
            </button>

            <button className="px-4 py-2 border rounded hover:bg-gray-100" onClick={resetAll}>
              Reset
            </button>

            <div className="ml-auto text-sm text-gray-600">
              Rows: <strong>{totals.rows}</strong> | Pieces:{" "}
              <strong>{totals.pieces.toLocaleString()}</strong> | Amount:{" "}
              <strong>{fmtNumber(totals.amount)}</strong>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowModal(false)} />

            <div
              className={`relative bg-white rounded shadow overflow-hidden ${
                fullScreen ? "w-full h-full m-0" : "w-[95%] lg:w-[90%] m-4"
              }`}
              style={{ maxHeight: fullScreen ? "100vh" : "90vh" }}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div>
                  <div className="text-sm text-gray-700">
                    <strong>Process:</strong> {processName || "All"}{" "}
                    {employeeName ? "(Employee selected: ALL processes shown)" : ""} &nbsp; | &nbsp;
                    <strong>Employee:</strong> {employeeName || "All"} &nbsp; | &nbsp;
                    <strong>From:</strong> {fmtDateHeader(fromDate)} &nbsp; | &nbsp;
                    <strong>To:</strong> {fmtDateHeader(toDate)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Rows: {totals.rows} | Pieces: {totals.pieces.toLocaleString()} | Amount:{" "}
                    {fmtNumber(totals.amount)} | Sort: {sorting}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 border rounded text-sm hover:bg-gray-100"
                    onClick={() => setFullScreen(!fullScreen)}
                  >
                    {fullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                  <button className="px-2 py-1 border rounded text-sm hover:bg-gray-100" onClick={handlePrintReport}>
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

              <div className="p-2 overflow-auto" style={{ height: fullScreen ? "calc(100vh - 72px)" : "78vh" }}>
                <div className="min-w-max">
                  {/* Main Table */}
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

                  {/* Totals + Payment Summary */}
                  <div className="mt-4 border rounded bg-white">
                    <div className="p-3">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-4">
                          <div className="text-sm font-semibold">Totals</div>
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
                          <div className="text-sm font-semibold">Payment Details</div>

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
                          <div className="text-sm font-semibold">Net Salary</div>
                          <div className="text-lg text-black font-bold bg-yellow-200 inline-block px-3 py-1 rounded mt-2">
                            {fmtNumber(paymentSummary.net)}
                          </div>
                        </div>
                      </div>

                      {/* ✅ Payment list with Payment Date */}
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
                                      <div className="mt-1">
                                        Tip: Select an employee to see only that employee payments.
                                      </div>
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
                                  <td className="border px-2 py-1 text-right">
                                    {fmtNumber(paymentSummary.advances)}
                                  </td>
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