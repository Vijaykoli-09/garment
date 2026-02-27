"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

type PRRow = {
  id: number;
  date: string; // ISO yyyy-mm-dd
  artNo: string;
  lotNo: string; // cardNo
  piece: number; // pcs
  rate: number;
  amount: number;
  process: string;
  employee: string;
  remarks?: string;
};

type GroupedJSON = Record<string, Record<string, PRRow[]>>;

const fmtDateHeader = (iso: string) => {
  const d = new Date(iso);
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

// Helpers for default dates
const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getFirstOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const SalaryReport: React.FC = () => {
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Controls / filters
  const [processName, setProcessName] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");

  // From = 1st of current month, To = today
  const [fromDate, setFromDate] = useState<string>(getFirstOfMonthIso());
  const [toDate, setToDate] = useState<string>(getTodayIso());

  const [sorting, setSorting] = useState<
    "Date Wise" | "Art No Wise" | "Lot Wise"
  >("Date Wise");

  // Force ascending order (no UI to change)
  // const order: "Asc" | "Desc" = "Asc";

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // Fetch production receipt records + employees + payments from API
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [prRes, empRes, payRes] = await Promise.all([
          api.get("/production-receipt"),
          api.get("/employees"),
          api.get("/payment"),
        ]);

        const prData = Array.isArray(prRes.data) ? prRes.data : [];
        setSavedRecords(prData);

        const empData = Array.isArray(empRes.data) ? empRes.data : [];
        setEmployees(empData);

        const payData = Array.isArray(payRes.data) ? payRes.data : [];
        setPayments(payData);

        // set default process after load if not set
        if (!processName && prData.length > 0) {
          setProcessName(prData[0].processName || "");
        }
      } catch (err: any) {
        console.error("Failed to load data:", err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transform savedRecords into flat PRRow[]
  const allRows: PRRow[] = useMemo(() => {
    const rows: PRRow[] = [];
    savedRecords.forEach((rec: any) => {
      const dated = rec.dated || rec.date || "";
      const process = rec.processName || rec.process || "";
      const employee = rec.employeeName || rec.employee || "";
      (rec.rows || []).forEach((r: any, idx: number) => {
        const pcs = Number.parseFloat(r.pcs) || 0;
        const rate = Number.parseFloat(r.rate) || 0;
        const amount = Number.parseFloat(r.amount) || pcs * rate || 0;
        rows.push({
          id: (rec.id ? Number(rec.id) : 0) * 1000 + (idx + 1),
          date: dated,
          artNo: r.artNo || r.ArtNo || "",
          lotNo: r.cardNo || r.cutLotNo || r.lotNo || "",
          piece: pcs,
          rate,
          amount,
          process,
          employee,
          remarks: r.remarks || "",
        });
      });
    });

    return rows;
  }, [savedRecords]);

  // Build grouped JSON by process -> employee
  const groupedJSON: GroupedJSON = useMemo(() => {
    const g: GroupedJSON = {};
    allRows.forEach((r) => {
      if (!g[r.process]) g[r.process] = {};
      if (!g[r.process][r.employee]) g[r.process][r.employee] = [];
      g[r.process][r.employee].push(r);
    });

    // Deterministic ordering per employee (date asc -> lotNo -> artNo)
    Object.keys(g).forEach((proc) => {
      Object.keys(g[proc]).forEach((emp) => {
        g[proc][emp].sort((a, b) => {
          const ta = new Date(a.date).getTime();
          const tb = new Date(b.date).getTime();
          if (ta !== tb) return ta - tb;
          if (a.lotNo !== b.lotNo) return a.lotNo.localeCompare(b.lotNo);
          return a.artNo.localeCompare(b.artNo);
        });
      });
    });

    return g;
  }, [allRows]);

  const processes = useMemo(() => {
    return Object.keys(groupedJSON).sort();
  }, [groupedJSON]);

  // ⬇️ CHANGED: when no process is selected, show ALL employees in dropdown
  const employeesForProcess = useMemo(() => {
    if (!processName) {
      // All processes selected -> show all employees from /employees
      const names = employees
        .map((e) => (e.employeeName || "").trim())
        .filter((n) => n.length > 0);

      // unique + sorted
      return Array.from(new Set(names)).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
    }

    // Specific process selected -> show only employees that have PR rows in that process
    const names = Object.keys(groupedJSON[processName] ?? {});
    return names.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [groupedJSON, processName, employees]);

  // Flatten groupedJSON for display
  const flatten = useMemo(() => {
    return Object.values(groupedJSON)
      .flatMap((empMap) => Object.values(empMap))
      .flat();
  }, [groupedJSON]);

  // Filter by date / process / employee
  const toTime = (iso: string) => new Date(iso).getTime();
  const filtered = useMemo(() => {
    const f = toTime(fromDate);
    const t = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;
    return flatten.filter((r) => {
      const tt = toTime(r.date);
      if (isNaN(tt)) return false;
      if (tt < f || tt > t) return false;
      if (processName && r.process !== processName) return false;
      if (employeeName && r.employee !== employeeName) return false;
      return true;
    });
  }, [flatten, fromDate, toDate, processName, employeeName]);

  // Sorting (always ascending)
  const sorted = useMemo(() => {
    const data = [...filtered];
    switch (sorting) {
      case "Date Wise":
        data.sort((a, b) => {
          if (toTime(a.date) !== toTime(b.date))
            return toTime(a.date) - toTime(b.date);
          if (a.lotNo !== b.lotNo) return a.lotNo.localeCompare(b.lotNo);
          return a.artNo.localeCompare(b.artNo);
        });
        break;
      case "Art No Wise":
        data.sort((a, b) => {
          if (a.artNo !== b.artNo) return a.artNo.localeCompare(b.artNo);
          if (toTime(a.date) !== toTime(b.date))
            return toTime(a.date) - toTime(b.date);
          return a.lotNo.localeCompare(b.lotNo);
        });
        break;
      case "Lot Wise":
        data.sort((a, b) => {
          if (a.lotNo !== b.lotNo) return a.lotNo.localeCompare(b.lotNo);
          if (toTime(a.date) !== toTime(b.date))
            return toTime(a.date) - toTime(b.date);
          return a.artNo.localeCompare(b.artNo);
        });
        break;
    }
    return data; // Asc only
  // eslint-disable-next-line react-hooks/exhaustive-deps -- order is constant Asc
  }, [filtered, sorting]);

  const totals = useMemo(() => {
    const pieces = sorted.reduce((s, r) => s + r.piece, 0);
    const amount = Number(sorted.reduce((s, r) => s + r.amount, 0).toFixed(2));
    return { rows: sorted.length, pieces, amount };
  }, [sorted]);

  /**
   * Payment summary:
   *  - ADV = sum of Payment.amount for selected employee (paymentTo = "Employee") in date range
   *  - Opening = openingBalance from Employee Creation for selected employee
   *  - Net = Gross Payment (production amount) - ADV + Opening
   */
  const paymentSummary = useMemo(() => {
    const grossPayment = totals.amount;

    // If no employee selected, we can't show personal ADV/opening
    if (!employeeName) {
      const advances = 0;
      const opening = 0;
      const net = Number((grossPayment - advances + opening).toFixed(2));
      return { advances, grossPayment, opening, net };
    }

    // Opening from employee creation
    const emp = employees.find(
      (e) => (e.employeeName || "").trim() === employeeName.trim()
    );
    const opening = emp ? Number.parseFloat(emp.openingBalance) || 0 : 0;

    // ADV from Payment table
    const f = toTime(fromDate);
    const t = toTime(toDate) + 24 * 60 * 60 * 1000 - 1;

    const advances = payments
      .filter((p: any) => {
        if (p.paymentTo !== "Employee") return false;

        const name = (p.employeeName || p.partyName || "").toString().trim();
        if (name !== employeeName.trim()) return false;

        const dstr = p.paymentDate || p.date;
        if (!dstr) return false;
        const tt = new Date(dstr).getTime();
        if (isNaN(tt)) return false;

        return tt >= f && tt <= t;

        // Optionally filter only advance payments by entryType:
        // if (!["ADVANCE", "ADV"].includes((p.entryType || "").toUpperCase())) return false;
      })
      .reduce(
        (sum: number, p: any) => sum + (Number.parseFloat(p.amount) || 0),
        0
      );

    const net = Number((grossPayment - advances + opening).toFixed(2));

    return { advances, grossPayment, opening, net };
  }, [totals, employees, payments, employeeName, fromDate, toDate]);

  function resetAll() {
    setProcessName(processes[0] ?? "");
    setEmployeeName("");
    setFromDate(getFirstOfMonthIso());
    setToDate(getTodayIso());
    setSorting("Date Wise");
    setShowModal(false);
    setFullScreen(false);
  }

  // ⬇️ CHANGED: allow showing report even when employeeName is empty
  function handleShow() {
    // If employeeName is "", you will see data for ALL employees
    // (respecting process & date filters).
    setShowModal(true);
  }

  /**
   * Reliable print using a hidden iframe
   */
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

  const sortLabel = `${sorting} (Increase)`;

  return (
    <Dashboard>
      <div className="bg-gray-100 p-6">
        <div className="bg-white shadow p-4 rounded">
          <h2 className="mb-3 font-bold text-xl">
            Salary Details (Employee Wise)
          </h2>

          {loading && (
            <div className="mb-2 text-gray-600 text-sm">Loading data...</div>
          )}
          {error && (
            <div className="mb-2 text-red-600 text-sm">Error: {error}</div>
          )}

          <div className="items-end gap-3 grid grid-cols-12">
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
                <option value="">-- All Employees --</option>
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
                onChange={(e) => setSorting(e.target.value as any)}
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
              className="bg-blue-600 px-4 py-2 rounded text-white"
              onClick={handleShow}
            >
              Show
            </button>

            <button className="px-4 py-2 border rounded" onClick={resetAll}>
              Reset
            </button>

            <div className="ml-auto text-gray-600 text-sm">
              Rows: <strong>{totals.rows}</strong> | Pieces:{" "}
              <strong>{totals.pieces.toLocaleString()}</strong> | Amount:{" "}
              <strong>{fmtNumber(totals.amount)}</strong>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="z-50 fixed inset-0 flex justify-center items-start pt-8">
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
              <div className="flex justify-between items-center p-3 border-b">
                <div>
                  <div className="text-gray-700 text-sm">
                    <strong>Process:</strong> {processName || "All"} &nbsp; |
                    &nbsp; <strong>Employee:</strong> {employeeName || "All"}{" "}
                    &nbsp; | &nbsp; <strong>From:</strong>{" "}
                    {fmtDateHeader(fromDate)} &nbsp; | &nbsp;{" "}
                    <strong>To:</strong> {fmtDateHeader(toDate)}
                  </div>
                  <div className="mt-1 text-gray-600 text-xs">
                    Rows: {totals.rows} | Pieces:{" "}
                    {totals.pieces.toLocaleString()} | Amount:{" "}
                    {fmtNumber(totals.amount)} | Sort: {sortLabel}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 border rounded text-sm"
                    onClick={() => setFullScreen(!fullScreen)}
                  >
                    {fullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>

                  <button
                    className="px-2 py-1 border rounded text-sm"
                    onClick={handlePrintReport}
                  >
                    Print
                  </button>

                  <button
                    className="bg-red-500 px-2 py-1 rounded text-white text-sm"
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
                  <table className="w-full text-sm border-collapse table-auto">
                    <thead className="top-0 sticky bg-gray-50">
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

                      {/* totals + payment summary */}
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className="bg-white border-t w-full">
                            <div className="p-3">
                              <div className="items-center gap-4 grid grid-cols-12">
                                <div className="col-span-4">
                                  <div className="font-semibold text-sm">
                                    Totals
                                  </div>
                                  <div className="mt-1 text-gray-700 text-xs">
                                    Pieces:{" "}
                                    <strong>
                                      {totals.pieces.toLocaleString()}
                                    </strong>
                                  </div>
                                  <div className="text-gray-700 text-xs">
                                    Amount:{" "}
                                    <strong>{fmtNumber(totals.amount)}</strong>
                                  </div>
                                </div>

                                <div className="col-span-5">
                                  <div className="font-semibold text-sm">
                                    Payment Details
                                  </div>
                                  <div className="gap-2 grid grid-cols-2 mt-2 text-xs">
                                    <div className="text-gray-700">ADV:</div>
                                    <div className="text-gray-900 text-right">
                                      {fmtNumber(paymentSummary.advances)}
                                    </div>

                                    <div className="text-gray-700">
                                      Gross Payment:
                                    </div>
                                    <div className="text-gray-900 text-right">
                                      {fmtNumber(paymentSummary.grossPayment)}
                                    </div>

                                    <div className="text-gray-700">
                                      Opening:
                                    </div>
                                    <div className="text-gray-900 text-right">
                                      {fmtNumber(paymentSummary.opening)}
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-3 text-right">
                                  <div className="font-semibold text-sm">
                                    Net Salary
                                  </div>
                                  <div className="inline-block bg-yellow-200 mt-2 px-3 py-1 rounded font-bold text-black text-lg">
                                    {fmtNumber(paymentSummary.net)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 text-gray-600 text-xs">
                                <div>
                                  Calculation:{" "}
                                  <strong>
                                    Net Salary = Gross Payment - ADV + Opening
                                  </strong>
                                </div>
                                <div>
                                  = {fmtNumber(paymentSummary.grossPayment)} -{" "}
                                  {fmtNumber(paymentSummary.advances)} +{" "}
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
