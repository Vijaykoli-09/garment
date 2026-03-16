"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

// ================= Types =================
interface PaymentModeMaster {
  id?: number;
  bankNameOrUpiId: string;
  accountNo: string;
  openingBalance?: number | string; // master opening
}

interface PaymentDoc {
  id: number;
  paymentDate?: string;
  date?: string;
  paymentTo?: string;
  partyName?: string;
  employeeName?: string;
  remarks?: string;
  amount?: number | string;
  paymentThrough?: string;
}

interface ReceiptDoc {
  id: number;
  receiptDate?: string;
  date?: string;
  receiptTo?: string;
  partyName?: string;
  employeeName?: string;
  remarks?: string;
  amount?: number | string;
  paymentThrough?: string;
}

type TxType = "Payment" | "Receipt";
type TxFilter = "all" | TxType;

type BaseTransaction = {
  id: number;
  date: string;
  name: string; // party/employee
  remarks?: string;
  amount: number;
  type: TxType;
};

type DisplayRow = BaseTransaction & {
  srNo: number;
  balance: number; // running balance (master opening se start)
};

// ================= Utils =================
const getTodayIso = () => new Date().toISOString().slice(0, 10);

const fmtDateHeader = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Invalid Date";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}/${d.getFullYear()}`;
};

const fmtNumber = (n: number) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toNum = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const norm = (s: any) => String(s ?? "").trim().toLowerCase();

const toTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
};

const endOfDayTime = (isoDate: string) => {
  const t = toTime(isoDate);
  if (t === -Infinity) return Infinity;
  return t + 24 * 60 * 60 * 1000 - 1;
};

const escapeHtml = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// same date ordering
const typeRank = (t: TxType) => (t === "Payment" ? 1 : 2); // Payment first, then Receipt

// ================= Component =================
const PaymentModeRemainingReport: React.FC = () => {
  const [paymentModes, setPaymentModes] = useState<PaymentModeMaster[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [receipts, setReceipts] = useState<ReceiptDoc[]>([]);

  const [loading, setLoading] = useState(false);
  const [reportPreparing, setReportPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // combo
  const [comboInput, setComboInput] = useState("");
  const [comboQuery, setComboQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);

  const [selectedMode, setSelectedMode] = useState<string>("");

  // report state
  const [openingBalance, setOpeningBalance] = useState<number>(0); // ONLY master opening
  const [tx, setTx] = useState<BaseTransaction[]>([]);
  const [transactionFilter, setTransactionFilter] = useState<TxFilter>("all");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  const asOnDate = getTodayIso();

  // ---------- Load ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

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
        const [pmRes, payRes] = await Promise.all([
          api.get<any[]>("/payment/payment-mode"),
          api.get<any[]>("/payment"),
        ]);
        const recRaw = await safeGetReceipts();

        const pmRaw = Array.isArray(pmRes.data) ? pmRes.data : [];
        const payRaw = Array.isArray(payRes.data) ? payRes.data : [];

        setPaymentModes(
          pmRaw.map((pm: any) => ({
            id: pm?.id,
            bankNameOrUpiId: pm?.bankNameOrUpiId ?? pm?.bank_name_or_upi_id ?? "",
            accountNo: pm?.accountNo ?? pm?.account_no ?? "",
            openingBalance:
              pm?.openingBalance ??
              pm?.opening_balance ??
              pm?.openingBalanceAmount ??
              pm?.balance ??
              0,
          })),
        );

        setPayments(
          payRaw.map((p: any) => ({
            id: p.id,
            paymentDate: p.paymentDate || p.date || "",
            date: p.date || "",
            paymentTo: p.paymentTo || "",
            partyName: p.partyName || "",
            employeeName: p.employeeName || "",
            remarks: p.remarks || "",
            amount: p.amount ?? 0,
            paymentThrough: String(p.paymentThrough ?? "").trim(),
          })),
        );

        setReceipts(
          (Array.isArray(recRaw) ? recRaw : []).map((r: any) => ({
            id: r.id,
            receiptDate: r.receiptDate || r.date || "",
            date: r.date || "",
            receiptTo: r.receiptTo || "",
            partyName: r.partyName || "",
            employeeName: r.employeeName || "",
            remarks: r.remarks || "",
            amount: r.amount ?? 0,
            paymentThrough: String(r.paymentThrough ?? "").trim(),
          })),
        );
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---------- Mode options ----------
  const modeOptions = useMemo(() => {
    const labels = paymentModes
      .map((pm) => `${pm.bankNameOrUpiId}-${pm.accountNo}`.trim())
      .filter(Boolean);

    const uniq = Array.from(new Set(["Cash", ...labels]));
    uniq.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return uniq;
  }, [paymentModes]);

  const comboOptions = useMemo(() => {
    const term = comboQuery.trim().toLowerCase();
    const list = term ? modeOptions.filter((m) => m.toLowerCase().includes(term)) : modeOptions;
    return list.slice(0, 200);
  }, [modeOptions, comboQuery]);

  const selectMode = (m: string) => {
    setSelectedMode(m);
    setComboInput(m);
    setComboQuery("");
    setComboOpen(false);
  };

  // ---------- Build report (NO date filter inputs, only "as on today") ----------
  const handleShow = async () => {
    let effectiveMode = selectedMode;

    // typed exact but not clicked
    if (!effectiveMode && comboInput.trim()) {
      const exact = modeOptions.find((m) => norm(m) === norm(comboInput));
      if (exact) effectiveMode = exact;
    }

    if (!effectiveMode.trim()) {
      alert("Please select Payment Mode from list");
      return;
    }

    setReportPreparing(true);
    setError(null);
    setTransactionFilter("all");

    try {
      // ONLY master opening
      const pmMaster = paymentModes.find(
        (pm) => norm(`${pm.bankNameOrUpiId}-${pm.accountNo}`) === norm(effectiveMode),
      );
      const masterOpening = pmMaster ? toNum(pmMaster.openingBalance) : 0;
      setOpeningBalance(masterOpening);

      const todayEnd = endOfDayTime(asOnDate);

      const pList = payments.filter((p) => norm(p.paymentThrough) === norm(effectiveMode));
      const rList = receipts.filter((r) => norm(r.paymentThrough) === norm(effectiveMode));

      const rows: BaseTransaction[] = [];

      // ✅ Payment = DR
      pList.forEach((p) => {
        const d = (p.paymentDate || p.date || "") || asOnDate;
        const tt = toTime(d);
        if (tt > todayEnd) return; // only up to current date

        const name = (p.paymentTo === "Employee" ? p.employeeName : p.partyName) || "-";
        rows.push({
          id: p.id,
          date: d,
          name,
          remarks: p.remarks || "",
          amount: toNum(p.amount),
          type: "Payment",
        });
      });

      // ✅ Receipt = CR
      rList.forEach((r) => {
        const d = (r.receiptDate || r.date || "") || asOnDate;
        const tt = toTime(d);
        if (tt > todayEnd) return; // only up to current date

        const name = (r.receiptTo === "Employee" ? r.employeeName : r.partyName) || "-";
        rows.push({
          id: r.id,
          date: d,
          name,
          remarks: r.remarks || "",
          amount: toNum(r.amount),
          type: "Receipt",
        });
      });

      // sort (same date -> Payment first -> Receipt)
      rows.sort((a, b) => {
        const dc = toTime(a.date) - toTime(b.date);
        if (dc !== 0) return dc;
        const tr = typeRank(a.type) - typeRank(b.type);
        if (tr !== 0) return tr;
        const nc = (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
        if (nc !== 0) return nc;
        return (a.id || 0) - (b.id || 0);
      });

      setSelectedMode(effectiveMode);
      setTx(rows);
      setShowModal(true);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to prepare report");
    } finally {
      setReportPreparing(false);
    }
  };

  // ---------- Running balance from MASTER opening ----------
  // ✅ Payment = DR (+), Receipt = CR (-)
  const rowsAllWithBalance: DisplayRow[] = useMemo(() => {
    let rb = openingBalance;
    let sr = 1;

    return tx.map((r) => {
      if (r.type === "Payment") rb += r.amount; // DR add
      else rb -= r.amount; // Receipt = CR subtract

      return { ...r, srNo: sr++, balance: rb };
    });
  }, [tx, openingBalance]);

  const filteredRows: DisplayRow[] = useMemo(() => {
    if (transactionFilter === "all") return rowsAllWithBalance;
    return rowsAllWithBalance.filter((r) => r.type === transactionFilter);
  }, [rowsAllWithBalance, transactionFilter]);

  // ---------- Totals & Remaining ----------
  const totalPaymentDr = useMemo(
    () => tx.filter((x) => x.type === "Payment").reduce((s, x) => s + (x.amount || 0), 0),
    [tx],
  );
  const totalReceiptCr = useMemo(
    () => tx.filter((x) => x.type === "Receipt").reduce((s, x) => s + (x.amount || 0), 0),
    [tx],
  );

  // ✅ Remaining = Opening + DR - CR
  const remainingBalance = useMemo(
    () => openingBalance + totalPaymentDr - totalReceiptCr,
    [openingBalance, totalPaymentDr, totalReceiptCr],
  );

  const totals = useMemo(
    () => ({ rows: filteredRows.length }),
    [filteredRows.length],
  );

  const resetAll = () => {
    setSelectedMode("");
    setComboInput("");
    setComboQuery("");
    setComboOpen(false);
    setOpeningBalance(0);
    setTx([]);
    setTransactionFilter("all");
    setShowModal(false);
    setFullScreen(false);
  };

  // ---------- Print ----------
  const handlePrintReport = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const htmlRows = filteredRows
      .map((r) => {
        const cls = r.type === "Payment" ? "row-dr" : "row-cr";
        const dr = r.type === "Payment" ? r.amount : 0;
        const cr = r.type === "Receipt" ? r.amount : 0;

        return `<tr class="${cls}">
          <td>${r.srNo}</td>
          <td>${fmtDateHeader(r.date)}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.remarks || "")}</td>
          <td class="text-right">${fmtNumber(dr)}</td>
          <td class="text-right">${fmtNumber(cr)}</td>
          <td class="text-right">${fmtNumber(r.balance)}</td>
          <td>${r.type === "Payment" ? "Payment (Dr)" : "Receipt (Cr)"}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Payment Mode Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
  h2 { text-align: center; margin-bottom: 8px; }
  .info { margin-bottom: 12px; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #444; padding: 6px; text-align: left; }
  th { background: #eee; }
  .text-right { text-align: right; }
  .row-dr { background: #dcfce7; } /* Payment (Dr) */
  .row-cr { background: #dbeafe; } /* Receipt (Cr) */
  .box { border: 1px solid #333; padding: 10px; margin-top: 10px; }
</style>
</head>
<body>
<h2>Payment Mode Wise Report</h2>

<div class="info">
  <div><strong>Mode:</strong> ${escapeHtml(selectedMode)}</div>
  <div><strong>As On:</strong> ${fmtDateHeader(asOnDate)}</div>
</div>

<div class="box">
  <div><strong>Opening Balance (Master):</strong> ${fmtNumber(openingBalance)}</div>
  <div><strong>Total Payment (Dr):</strong> ${fmtNumber(totalPaymentDr)}</div>
  <div><strong>Total Receipt (Cr):</strong> ${fmtNumber(totalReceiptCr)}</div>
  <div><strong>Remaining Balance:</strong> ${fmtNumber(remainingBalance)}</div>
</div>

<table style="margin-top:12px;">
<thead>
<tr>
  <th>S No</th>
  <th>Date</th>
  <th>Name</th>
  <th>Remarks</th>
  <th class="text-right">Dr (Payment +)</th>
  <th class="text-right">Cr (Receipt -)</th>
  <th class="text-right">Balance</th>
  <th>Type</th>
</tr>
</thead>
<tbody>
${htmlRows || `<tr><td colspan="8" style="text-align:center;">No data</td></tr>`}
</tbody>
</table>

<script>
  window.onload = function () { window.focus(); window.print(); };
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
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-3">Payment Mode Wise Report</h2>

          {loading && <div className="text-sm text-gray-600 mb-2">Loading data...</div>}
          {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}
          {reportPreparing && !loading && (
            <div className="text-sm text-blue-600 mb-2">Preparing report, please wait...</div>
          )}

          <div className="grid grid-cols-12 gap-3 items-end">
            {/* Combo mode */}
            <div className="col-span-5">
              <label className="block text-sm mb-1">Payment Mode</label>

              <div className="relative">
                <input
                  value={comboInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setComboInput(v);
                    setComboQuery(v);
                    setComboOpen(true);
                    setSelectedMode("");
                  }}
                  onFocus={() => {
                    setComboOpen(true);
                    setComboQuery("");
                  }}
                  onBlur={() => window.setTimeout(() => setComboOpen(false), 150)}
                  placeholder="Type Cash / bank / upi..."
                  className="border p-2 rounded w-full text-sm"
                />

                {comboOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto">
                    {comboOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectMode(m);
                        }}
                      >
                        {m}
                      </button>
                    ))}
                    {comboOptions.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No match found.</div>
                    )}
                  </div>
                )}
              </div>

              {selectedMode && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: <b>{selectedMode}</b>
                </div>
              )}
            </div>

            {/* Date filter removed */}
            <div className="col-span-3">
              <div className="text-sm text-gray-700">
                <div className="font-semibold">As On</div>
                <div className="mt-1 p-2 border rounded bg-gray-50">{fmtDateHeader(asOnDate)}</div>
              </div>
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
              Rows (Filtered): <strong>{totals.rows}</strong>
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
                    <strong>Mode:</strong> {selectedMode} &nbsp; | &nbsp;
                    <strong>As On:</strong> {fmtDateHeader(asOnDate)}
                  </div>

                  <div className="text-xs text-gray-600 mt-1">
                    Opening (Master): {fmtNumber(openingBalance)} &nbsp; | &nbsp;
                    Payment (Dr): {fmtNumber(totalPaymentDr)} &nbsp; | &nbsp;
                    Receipt (Cr): {fmtNumber(totalReceiptCr)}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-gray-700">Transaction Type:</span>
                    <select
                      value={transactionFilter}
                      onChange={(e) => setTransactionFilter(e.target.value as TxFilter)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="all">All</option>
                      <option value="Payment">Payment (Dr)</option>
                      <option value="Receipt">Receipt (Cr)</option>
                    </select>
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

              <div className="p-2 overflow-auto" style={{ height: fullScreen ? "calc(100vh - 72px)" : "78vh" }}>
                {/* Summary box */}
                <div className="mb-3 grid grid-cols-12 gap-3">
                  <div className="col-span-3 p-3 border rounded bg-gray-50">
                    <div className="text-xs text-gray-600">Opening Balance (Master)</div>
                    <div className="text-lg font-bold">{fmtNumber(openingBalance)}</div>
                  </div>
                  <div className="col-span-3 p-3 border rounded bg-green-50">
                    <div className="text-xs text-gray-600">Total Payment (Dr +)</div>
                    <div className="text-lg font-bold">{fmtNumber(totalPaymentDr)}</div>
                  </div>
                  <div className="col-span-3 p-3 border rounded bg-blue-50">
                    <div className="text-xs text-gray-600">Total Receipt (Cr -)</div>
                    <div className="text-lg font-bold">{fmtNumber(totalReceiptCr)}</div>
                  </div>
                  <div className="col-span-3 p-3 border rounded bg-yellow-200">
                    <div className="text-xs text-gray-700">Remaining Balance</div>
                    <div className="text-xl font-bold">{fmtNumber(remainingBalance)}</div>
                  </div>
                </div>

                <div className="min-w-max">
                  <table className="w-full table-auto text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 border">S No</th>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">Name</th>
                        <th className="px-2 py-1 border">Remarks</th>
                        <th className="px-2 py-1 border text-right">Dr (Payment +)</th>
                        <th className="px-2 py-1 border text-right">Cr (Receipt -)</th>
                        <th className="px-2 py-1 border text-right">Balance</th>
                        <th className="px-2 py-1 border">Type</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((r) => {
                        const rowClass =
                          r.type === "Payment"
                            ? "bg-green-100"
                            : "bg-blue-100";

                        const dr = r.type === "Payment" ? r.amount : 0;
                        const cr = r.type === "Receipt" ? r.amount : 0;

                        return (
                          <tr key={`${r.type}-${r.id}-${r.srNo}`} className={rowClass}>
                            <td className="px-2 py-1 border">{r.srNo}</td>
                            <td className="px-2 py-1 border">{fmtDateHeader(r.date)}</td>
                            <td className="px-2 py-1 border">{r.name}</td>
                            <td className="px-2 py-1 border">{r.remarks || ""}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(dr)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(cr)}</td>
                            <td className="px-2 py-1 border text-right">{fmtNumber(r.balance)}</td>
                            <td className="px-2 py-1 border">
                              {r.type === "Payment" ? "Payment (Dr)" : "Receipt (Cr)"}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-2 py-3 border text-center text-gray-500">
                            No transactions found for selected mode (as on today).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 border rounded bg-yellow-100 text-right">
                  <span className="text-sm text-gray-700 mr-2">Remaining Balance:</span>
                  <span className="text-xl font-bold">{fmtNumber(remainingBalance)}</span>
                </div>

                {filteredRows.length > 0 && (
                  <div className="mt-2 text-xs text-gray-700 flex items-center gap-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-3 bg-green-100 border inline-block" />
                      Payment (Dr +)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-3 bg-blue-100 border inline-block" />
                      Receipt (Cr -)
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

export default PaymentModeRemainingReport;