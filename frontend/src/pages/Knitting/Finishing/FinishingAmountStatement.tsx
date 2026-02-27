// src/pages/Finishing/AmountStatement.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

interface Party {
  id: number | string;
  partyName: string;
  category?: { categoryName?: string };
  // possible opening balance fields (we read them dynamically)
  [key: string]: any;
}

type RowType = "OPEN" | "DIN" | "PAY";

interface LedgerRow {
  id: number;
  date: string; // display date (dd/mm/yyyy from locale)
  narration: string;
  debit: string; // 2-decimal string
  credit: string; // 2-decimal string
  balance: string; // 2-decimal string
  type: RowType;
}

// Helpers
const parseNum = (v: any) => {
  const n = parseFloat(
    String(v ?? "")
      .toString()
      .replace(/,/g, "")
  );
  return Number.isFinite(n) ? n : 0;
};
const fmt2 = (n: number) => (n || n === 0 ? n.toFixed(2) : "0.00");

const todayISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const toInputDate = (d?: any) => {
  if (!d) return "";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const displayDate = (iso?: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString() : "";

const dateStamp = (iso?: string) => {
  if (!iso) return NaN;
  return new Date(`${iso}T00:00:00`).getTime();
};

const AmountStatement: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string>("");
  const [partyName, setPartyName] = useState<string>("");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>(todayISO());

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Track party opening separately
  const [partyOpeningValue, setPartyOpeningValue] = useState<number>(0);
  const [partyOpeningType, setPartyOpeningType] = useState<"DR" | "CR" | "">(
    ""
  );

  // Load finishing parties
  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get("/party/category/Finishing");
        const list = Array.isArray(res.data) ? res.data : [];
        setParties(list);
      } catch {
        try {
          const resAll = await api.get("/party/all");
          const all = Array.isArray(resAll.data) ? resAll.data : [];
          const finishing = all.filter(
            (p: Party) =>
              (p.category?.categoryName || "").toLowerCase() === "finishing"
          );
          setParties(finishing);
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Failed to load finishing parties", "error");
        }
      }
    };
    run();
  }, []);

  // When partyId changes, set partyName and read opening balance fields (tolerant)
  useEffect(() => {
    if (!partyId) {
      setPartyName("");
      setPartyOpeningValue(0);
      setPartyOpeningType("");
      return;
    }
    const p = parties.find((x) => String(x.id) === String(partyId));
    setPartyName(p?.partyName || "");

    // Read opening balance from likely fields (accept multiple possible names)
    // and opening type fields. This makes the component tolerant to different backend field names.
    if (p) {
      const possibleBalanceFields = [
        "openingBalance",
        "opening_balance",
        "openingAmt",
        "opening_amount",
        "opening",
        "opening_bal",
      ];
      const possibleTypeFields = [
        "openingBalanceType",
        "opening_type",
        "openingType",
        "opening_bal_type",
        "opening_dr_cr",
      ];

      let val = 0;
      for (const f of possibleBalanceFields) {
        if (p[f] !== undefined && p[f] !== null && String(p[f]).trim() !== "") {
          val = parseNum(p[f]);
          break;
        }
      }

      let typ: "DR" | "CR" | "" = "";
      for (const f of possibleTypeFields) {
        if (p[f] !== undefined && p[f] !== null) {
          const tv = String(p[f]).trim().toUpperCase();
          if (tv === "DR" || tv === "DEBIT") {
            typ = "DR";
            break;
          } else if (tv === "CR" || tv === "CREDIT") {
            typ = "CR";
            break;
          }
        }
      }

      // If type not found but value negative, infer
      if (!typ && val < 0) {
        typ = "CR";
        val = Math.abs(val);
      }

      setPartyOpeningValue(isNaN(val) ? 0 : val);
      setPartyOpeningType(typ);
    } else {
      setPartyOpeningValue(0);
      setPartyOpeningType("");
    }
  }, [partyId, parties]);

  // Show report
  const handleShowReport = async () => {
    if (!partyId) {
      Swal.fire("Validation", "Please select a Finishing party.", "warning");
      return;
    }

    try {
      setLoading(true);

      // Fetch both in parallel
      const [resInw, resPay] = await Promise.all([
        api.get("/finishing-inwards"),
        api.get("/payment"),
      ]);

      const inwDocs: any[] = Array.isArray(resInw.data) ? resInw.data : [];
      const payDocs: any[] = Array.isArray(resPay.data) ? resPay.data : [];

      // Filter for selected finishing party
      const selectedParty = parties.find(
        (x) => String(x.id) === String(partyId)
      );
      const pLower = (selectedParty?.partyName || "").trim().toLowerCase();

      // Finishing Inward (Debit) per document
      type InwRec = {
        dt: number;
        dateISO: string;
        challanNo: string;
        debit: number;
      };
      const inwByParty = inwDocs.filter(
        (d: any) =>
          String(d.partyName || "")
            .trim()
            .toLowerCase() === pLower
      );

      const inwRecs: InwRec[] = inwByParty.map((doc: any) => {
        const dISO = toInputDate(doc.dated || doc.date) || todayISO();
        const rowsArr = Array.isArray(doc.rows) ? doc.rows : [];
        const debit = rowsArr.reduce((sum: number, r: any) => {
          const savedAmt = parseNum(r.amount);
          const calc = parseNum(r.rate) * parseNum(r.weight);
          return sum + (savedAmt || calc);
        }, 0);
        return {
          dt: dateStamp(dISO),
          dateISO: dISO,
          challanNo: String(doc.challanNo || ""),
          debit,
        };
      });

      // Payments (Credit) to this party
      type PayRec = {
        dt: number;
        dateISO: string;
        credit: number;
        entryType?: string;
        paymentThrough?: string;
        remarks?: string;
      };
      const payByParty = payDocs.filter((p: any) => {
        const pt = String(p.paymentTo || "")
          .trim()
          .toLowerCase();
        const name = String(p.partyName || "")
          .trim()
          .toLowerCase();
        return pt === "party" && name === pLower;
      });

      const payRecs: PayRec[] = payByParty.map((p: any) => {
        const dISO = toInputDate(p.paymentDate || p.date) || todayISO();
        return {
          dt: dateStamp(dISO),
          dateISO: dISO,
          credit: parseNum(p.amount),
          entryType: p.entryType,
          paymentThrough: p.paymentThrough,
          remarks: p.remarks,
        };
      });

      // Window boundaries
      const fromIso = toInputDate(fromDate || "");
      const toIso = toInputDate(toDate || "");
      const fromTs = fromIso ? dateStamp(fromIso) : Number.NEGATIVE_INFINITY;
      const toTs = toIso ? dateStamp(toIso) : Number.POSITIVE_INFINITY;

      // Opening (before from): transaction sums
      const openingDebitTx = inwRecs
        .filter((r) => r.dt < fromTs)
        .reduce((s, r) => s + r.debit, 0);

      const openingCreditTx = payRecs
        .filter((r) => r.dt < fromTs)
        .reduce((s, r) => s + r.credit, 0);

      // Incorporate party master opening balance (DR/CR)
      let openingDebit = openingDebitTx;
      let openingCredit = openingCreditTx;

      if (partyOpeningValue && partyOpeningValue !== 0) {
        if (partyOpeningType === "DR") {
          openingDebit += partyOpeningValue;
        } else if (partyOpeningType === "CR") {
          openingCredit += partyOpeningValue;
        } else {
          // If type unknown, assume DR (you can change this behavior)
          openingDebit += partyOpeningValue;
        }
      }

      // Starting running balance
      let running = openingDebit - openingCredit;

      // In-range
      const inRangeInw = inwRecs.filter((r) => r.dt >= fromTs && r.dt <= toTs);
      const inRangePay = payRecs.filter((r) => r.dt >= fromTs && r.dt <= toTs);

      // Merge in-range and sort (DIN before PAY on same day)
      type AnyRec = ({ kind: "DIN" } & InwRec) | ({ kind: "PAY" } & PayRec);

      const merged: AnyRec[] = [
        ...inRangeInw.map((r) => ({ kind: "DIN" as const, ...r })),
        ...inRangePay.map((r) => ({ kind: "PAY" as const, ...r })),
      ].sort((a, b) => {
        if (a.dt !== b.dt) return a.dt - b.dt;
        if (a.kind !== b.kind) return a.kind === "DIN" ? -1 : 1;
        return 0;
      });

      // Build ledger rows
      const result: LedgerRow[] = [];
      let idCounter = 1;

      // Format opening row narration that mentions party opening type if present
      const openingNarrationParts = ["Opening Balance"];
      if (partyOpeningValue && partyOpeningValue !== 0 && partyOpeningType) {
        openingNarrationParts.push(`(Party master ${partyOpeningType})`);
      }
      const openingNarration = openingNarrationParts.join(" ");

      // Opening Row: show opening debit and credit (party opening will appear in appropriate column)
      result.push({
        id: idCounter++,
        date: displayDate(fromIso || todayISO()),
        narration: openingNarration,
        debit: fmt2(openingDebit),
        credit: fmt2(openingCredit),
        balance: fmt2(running),
        type: "OPEN",
      });

      // Movement Rows
      merged.forEach((r) => {
        if (r.kind === "DIN") {
          running += r.debit;
          result.push({
            id: idCounter++,
            date: displayDate(r.dateISO),
            narration: `Finishing Inward - Challan ${r.challanNo || "-"}`,
            debit: fmt2(r.debit),
            credit: "0.00",
            balance: fmt2(running),
            type: "DIN",
          });
        } else {
          running -= r.credit;
          const parts: string[] = ["Payment"];
          if (r.paymentThrough) parts.push(`via ${r.paymentThrough}`);
          if (r.entryType) parts.push(`(${r.entryType})`);
          const narration = [parts.join(" "), r.remarks]
            .filter(Boolean)
            .join(" - ");
          result.push({
            id: idCounter++,
            date: displayDate(r.dateISO),
            narration,
            debit: "0.00",
            credit: fmt2(r.credit),
            balance: fmt2(running),
            type: "PAY",
          });
        }
      });

      setRows(result);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load statement data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setShowModal(false);

  const handleReset = () => {
    setPartyId("");
    setPartyName("");
    setFromDate("");
    setToDate(todayISO());
    setRows([]);
    setShowModal(false);
    setPartyOpeningValue(0);
    setPartyOpeningType("");
  };

  const handlePrint = () => {
    const content = printRef.current;
    const printWindow = window.open("", "", "width=900,height=600");
    if (printWindow && content) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Amount Statement</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              h2 { text-align: center; margin-bottom: 10px; }
              .info { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000; padding: 6px; font-size: 13px; }
              th { background: #f2f2f2; }
              tfoot td { font-weight: bold; background: #e6f2ff; }
            </style>
          </head>
          <body>${content.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Totals (exclude OPEN row)
  const totals = useMemo(() => {
    const mov = rows.filter((r) => r.type !== "OPEN");
    const totalDebit = mov.reduce((s, r) => s + parseNum(r.debit), 0);
    const totalCredit = mov.reduce((s, r) => s + parseNum(r.credit), 0);
    const closing = rows.length ? rows[rows.length - 1] : null;
    const closingBalance = closing ? parseNum(closing.balance) : 0;
    return {
      totalDebit: fmt2(totalDebit),
      totalCredit: fmt2(totalCredit),
      closingBalance: fmt2(closingBalance),
    };
  }, [rows]);

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">
            Amount Statement (Finishing)
          </h2>

          {/* Header Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block font-semibold">Party Name</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- Select Finishing Party --</option>
                {parties.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {p.partyName}
                  </option>
                ))}
              </select>
              {/* show party opening info */}
              {partyOpeningValue !== 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Party Opening:</strong>{" "}
                  {partyOpeningType ? `${partyOpeningType} ` : ""}₹
                  {fmt2(partyOpeningValue)}
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Show"}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto p-6">
              {partyOpeningValue !== 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Party Opening:</strong>{" "}
                  {partyOpeningType ? `${partyOpeningType} ` : ""}₹
                  {fmt2(partyOpeningValue)}
                </div>
              )}
              <div ref={printRef}>
                {/* Header Info */}
                <div className="mb-4 border-b pb-3">
                  <h2 className="text-2xl font-bold text-center mb-2">
                    Finishing Amount Statement
                  </h2>
                  <div className="flex justify-between text-sm font-semibold">
                    <div>Party: {partyName || "-"}</div>
                    <div>
                      Period: {fromDate || "-"} to {toDate || "-"}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-auto">
                  <table className="min-w-[900px] w-full border border-blue-500 text-sm">
                    <thead className="bg-gray-200 sticky top-0">
                      <tr>
                        <th className="border p-2 text-center">S.No.</th>
                        <th className="border p-2">Date</th>
                        <th className="border p-2 text-left">Narration</th>
                        <th className="border p-2 text-right">Debit</th>
                        <th className="border p-2 text-right">Credit</th>
                        <th className="border p-2 text-right">Balance</th>
                        <th className="border p-2 text-center">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            className="border p-3 text-center text-gray-500"
                            colSpan={7}
                          >
                            No data
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, index) => (
                          <tr
                            key={row.id}
                            className={
                              row.type === "OPEN" ? "bg-yellow-50" : ""
                            }
                          >
                            <td className="border p-2 text-center">
                              {index + 1}
                            </td>
                            <td className="border p-2">{row.date}</td>
                            <td className="border p-2 text-left">
                              {row.narration}
                            </td>
                            <td className="border p-2 text-right">
                              {row.debit}
                            </td>
                            <td className="border p-2 text-right">
                              {row.credit}
                            </td>
                            <td className="border p-2 text-right">
                              {row.balance}
                            </td>
                            <td className="border p-2 text-center">
                              {row.type}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    {/* Totals */}
                    <tfoot>
                      <tr className="bg-blue-50 font-bold">
                        <td colSpan={3} className="border p-2 text-right">
                          Totals:
                        </td>
                        <td className="border p-2 text-right">
                          {totals.totalDebit}
                        </td>
                        <td className="border p-2 text-right">
                          {totals.totalCredit}
                        </td>
                        <td className="border p-2 text-right">
                          {totals.closingBalance}
                        </td>
                        <td className="border p-2 text-center">--</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default AmountStatement;
