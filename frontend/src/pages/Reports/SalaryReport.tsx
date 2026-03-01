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

const fmtDateHeader = (iso: string) => {
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

const fmtRate = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getFirstOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const SalaryReport: React.FC = () => {
  const [cuttingEntries, setCuttingEntries] = useState<CuttingEntryDTO[]>([]);
  const [productionReceipts, setProductionReceipts] = useState<
    ProductionReceiptDTO[]
  >([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [processList, setProcessList] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [processName, setProcessName] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");

  const [fromDate, setFromDate] = useState<string>(getFirstOfMonthIso());
  const [toDate, setToDate] = useState<string>(getTodayIso());
  const [sorting, setSorting] = useState<
    "Date Wise" | "Art No Wise" | "Lot Wise"
  >("Date Wise");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // ---------- Load all data ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cuttingRes, prodRes, empRes, payRes, procRes] =
          await Promise.all([
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

        const empList: Employee[] = Array.isArray(empRes.data)
          ? empRes.data
          : empRes.data?.data || [];

        const payList: any[] = Array.isArray(payRes.data)
          ? payRes.data
          : payRes.data?.data || [];

        const procList: any[] = Array.isArray(procRes.data)
          ? procRes.data
          : procRes.data?.data || [];

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
    () =>
      employees.filter(
        (emp) => emp.employeeName && emp.employeeName.trim().length > 0
      ),
    [employees]
  );

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
        const amount =
          Number.parseFloat(r.amount) || Number(piece * rate) || 0;
        const uniqueIdBase = entry.serialNo
          ? entry.serialNo
              .split("")
              .reduce((acc, char) => acc + char.charCodeAt(0), 0)
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
        const amount =
          Number.parseFloat(r.amount || "0") ||
          Number(piece * rate) ||
          0;
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
    const fromData = allRows
      .map((r) => r.process)
      .filter((p) => p && p.trim().length > 0);
    const fromMaster = processList
      .map((p) => p.processName)
      .filter((p: string) => p && p.trim().length > 0);

    const combined = Array.from(new Set([...fromData, ...fromMaster]));
    return combined.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [allRows, processList]);

  // ---------- Employee dropdown ----------
  const employeesForProcess = useMemo(() => {
    let filteredEmployees = allEmployees;
    if (processName) {
      const pLower = processName.trim().toLowerCase();
      filteredEmployees = allEmployees.filter(
        (e) =>
          (e.process?.processName || "")
            .trim()
            .toLowerCase() === pLower
      );
    }
    const names = filteredEmployees
      .map((e) => (e.employeeName || "").trim())
      .filter((n) => n.length > 0);
    return Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [allEmployees, processName]);

  // ---------- Filtering & sorting ----------
  const toTime = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? -Infinity : d.getTime();
  };

  const filtered = useMemo(() => {
    const f = toTime(fromDate);
    const t = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;

    return allRows.filter((r) => {
      const tt = toTime(r.date);
      if (isNaN(tt) || tt < f || tt > t) return false;

      if (
        processName &&
        r.process.trim().toLowerCase() !== processName.trim().toLowerCase()
      )
        return false;
      if (
        employeeName &&
        r.employee.trim().toLowerCase() !== employeeName.trim().toLowerCase()
      )
        return false;
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
    const amount = Number(
      sorted.reduce((s, r) => s + r.amount, 0).toFixed(2)
    );
    return { rows: sorted.length, pieces, amount };
  }, [sorted]);

  // ---------- Payment summary (Gross, ADV, Opening, Net) ----------
  // Opening = (GrossBefore - AdvBefore)
  // GrossPayment = amount for current date-range
  // ADV = AdvCurrent (isin date-range)
  // Net = GrossPayment - ADV + Opening
  const paymentSummary = useMemo(() => {
    const grossCurrent = totals.amount;

    // Jo employees abhi grid me dikh rahe hain:
    const employeeKeysInRows = Array.from(
      new Set(
        sorted
          .map((r) => (r.employee || "").trim().toLowerCase())
          .filter((n) => n.length > 0)
      )
    );

    if (employeeKeysInRows.length === 0) {
      return { advances: 0, grossPayment: grossCurrent, opening: 0, net: grossCurrent };
    }

    let relevantEmployeeKeys = employeeKeysInRows;
    if (employeeName) {
      relevantEmployeeKeys = [employeeName.trim().toLowerCase()];
    }

    const fromT = toTime(fromDate);
    const toT = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;

    const empMatch = (name: string) =>
      relevantEmployeeKeys.includes(name.trim().toLowerCase());

    // ----- GrossBefore (allRows, employee + process filtered, date < from) -----
    const grossBefore = allRows.reduce((sum, r) => {
      const nm = (r.employee || "").trim().toLowerCase();
      if (!empMatch(nm)) return sum;
      if (
        processName &&
        r.process.trim().toLowerCase() !== processName.trim().toLowerCase()
      )
        return sum;
      const tt = toTime(r.date);
      if (isNaN(tt) || tt >= fromT) return sum;
      return sum + r.amount;
    }, 0);

    // ----- ADV Before + ADV Current (payments se) -----
    let advBefore = 0;
    let advCurrent = 0;

    payments.forEach((p: any) => {
      const nm = (
        p.employeeName ||
        p.partyName ||
        p.name ||
        p.employee ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();
      if (!empMatch(nm)) return;

      const paymentTo = (p.paymentTo || p.type || "")
        .toString()
        .trim()
        .toLowerCase();
      if (
        paymentTo &&
        !["employee", "cutting employee", "cutting", "worker"].includes(
          paymentTo
        )
      ) {
        return;
      }

      if (processName) {
        const pProc = (p.processName || p.process || "")
          .toString()
          .trim()
          .toLowerCase();
        if (pProc && pProc !== processName.trim().toLowerCase()) {
          return;
        }
      }

      const dstr = p.paymentDate || p.date || p.dated;
      if (!dstr) return;
      const tt = new Date(dstr).getTime();
      if (isNaN(tt)) return;

      const amt = Number.parseFloat(String(p.amount)) || 0;
      if (tt < fromT) advBefore += amt;
      else if (tt <= toT) advCurrent += amt;
    });

    const opening = Number((grossBefore - advBefore).toFixed(2));
    const net = Number((grossCurrent - advCurrent + opening).toFixed(2));

    return {
      advances: advCurrent,
      grossPayment: grossCurrent,
      opening,
      net,
    };
  }, [
    totals.amount,
    sorted,
    allRows,
    payments,
    fromDate,
    toDate,
    processName,
    employeeName,
  ]);

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

  function handlePrintReport() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    try {
      const totalPieces = totals.pieces;
      const totalAmount = totals.amount;
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
      @media print {
        button { display: none; }
      }
    </style>
  </head>
  <body>
    <h2>Salary Report</h2>
    <div class="info">
      <div><strong>Process:</strong> ${processName || "All"}</div>
      <div><strong>Employee:</strong> ${employeeName || "All"}</div>
      <div><strong>From:</strong> ${fmtDateHeader(
        fromDate
      )} &nbsp; <strong>To:</strong> ${fmtDateHeader(toDate)}</div>
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
          <th>Process</th>
          <th>Employee</th>
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
          <td>${r.process}</td>
          <td>${r.employee}</td>
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
      )} - ADV ${fmtNumber(paymentSummary.advances)} + Opening ${fmtNumber(
        paymentSummary.opening
      )})
      </div>
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

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-3">
            Salary Details (Employee Wise)
          </h2>
          {loading && (
            <div className="text-sm text-gray-600 mb-2">Loading data...</div>
          )}
          {error && (
            <div className="text-sm text-red-600 mb-2">Error: {error}</div>
          )}
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
            </div>
            <div className="col-span-3">
              <label className="block text-sm">Employee Name</label>
              <select
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">
                  {processName
                    ? `-- All ${processName} Employees --`
                    : "-- All Employees --"}
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
                onChange={(e) =>
                  setSorting(
                    e.target.value as "Date Wise" | "Art No Wise" | "Lot Wise"
                  )
                }
                className="mt-1 p-2 border rounded w-full"
              >
                <option>Date Wise</option>
                <option>Art No Wise</option>
                <option>Lot Wise</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleShow}
            >
              Show
            </button>
            <button
              className="px-4 py-2 border rounded hover:bg-gray-100"
              onClick={resetAll}
            >
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
                    <strong>Process:</strong> {processName || "All"} &nbsp; |
                    &nbsp; <strong>Employee:</strong> {employeeName || "All"}{" "}
                    &nbsp; | &nbsp; <strong>From:</strong>{" "}
                    {fmtDateHeader(fromDate)} &nbsp; | &nbsp;{" "}
                    <strong>To:</strong> {fmtDateHeader(toDate)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Rows: {totals.rows} | Pieces:{" "}
                    {totals.pieces.toLocaleString()} | Amount:{" "}
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
                        <tr
                          key={r.id}
                          className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-2 py-1 border">{idx + 1}</td>
                          <td className="px-2 py-1 border">
                            {fmtDateHeader(r.date)}
                          </td>
                          <td className="px-2 py-1 border">{r.artNo}</td>
                          <td className="px-2 py-1 border">{r.lotNo}</td>
                          <td className="px-2 py-1 border text-right">
                            {r.piece.toLocaleString()}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {fmtRate(r.rate)}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {fmtNumber(r.amount)}
                          </td>
                          <td className="px-2 py-1 border">{r.process}</td>
                          <td className="px-2 py-1 border">{r.employee}</td>
                        </tr>
                      ))}

                      {/* Totals + payment summary row */}
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className="w-full bg-white border-t">
                            <div className="p-3">
                              <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-4">
                                  <div className="text-sm font-semibold">
                                    Totals
                                  </div>
                                  <div className="text-xs text-gray-700 mt-1">
                                    Pieces:{" "}
                                    <strong>
                                      {totals.pieces.toLocaleString()}
                                    </strong>
                                  </div>
                                  <div className="text-xs text-gray-700">
                                    Amount:{" "}
                                    <strong>{fmtNumber(totals.amount)}</strong>
                                  </div>
                                </div>
                                <div className="col-span-5">
                                  <div className="text-sm font-semibold">
                                    Payment Details
                                  </div>
                                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-gray-700">ADV:</div>
                                    <div className="text-right text-gray-900">
                                      {fmtNumber(paymentSummary.advances)}
                                    </div>
                                    <div className="text-gray-700">
                                      Gross Payment:
                                    </div>
                                    <div className="text-right text-gray-900">
                                      {fmtNumber(
                                        paymentSummary.grossPayment
                                      )}
                                    </div>
                                    <div className="text-gray-700">
                                      Opening:
                                    </div>
                                    <div className="text-right text-gray-900">
                                      {fmtNumber(paymentSummary.opening)}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-span-3 text-right">
                                  <div className="text-sm font-semibold">
                                    Net Salary
                                  </div>
                                  <div className="text-lg text-black font-bold bg-yellow-200 inline-block px-3 py-1 rounded mt-2">
                                    {fmtNumber(paymentSummary.net)}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-gray-600">
                                <div>
                                  Calculation:{" "}
                                  <strong>
                                    Net Salary = Gross Payment - ADV + Opening
                                  </strong>
                                </div>
                                <div>
                                  = {fmtNumber(
                                    paymentSummary.grossPayment
                                  )}{" "}
                                  - {fmtNumber(paymentSummary.advances)} +{" "}
                                  {fmtNumber(paymentSummary.opening)} ={" "}
                                  <strong>
                                    {fmtNumber(paymentSummary.net)}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
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

export default SalaryReport;