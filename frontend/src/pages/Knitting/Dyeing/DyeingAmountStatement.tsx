// sourceFile: /mnt/data/Screenshot (1094).png
// Updated DyeingAmountStatement component

import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

interface StatementRow {
  id: number;
  date: string; // display date
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  rawDateISO?: string;
  type?: "INWARD" | "PAYMENT" | "OPEN";
}

const todayISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const toNum = (v: any) => {
  const n = parseFloat(
    String(v ?? "")
      .toString()
      .replace(/,/g, "")
  );
  return Number.isFinite(n) ? n : 0;
};

const normalizeDateISO = (d?: any) => {
  if (!d) return "";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const dateStamp = (iso?: string) => {
  if (!iso) return NaN;
  return new Date(`${iso}T00:00:00`).getTime();
};

const displayDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() : "-";

const DyeingAmountStatement: React.FC = () => {
  const [partyList, setPartyList] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | number>("");
  const [selectedPartyName, setSelectedPartyName] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  // load dyeing parties only
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/party/category/Dyeing");
        const list = Array.isArray(res.data) ? res.data : [];
        setPartyList(list);
      } catch (err) {
        console.error("Failed to load dyeing parties:", err);
        Swal.fire("Error", "Failed to load dyeing parties.", "error");
      }
    };
    load();
  }, []);

  // update selectedPartyName whenever id changes
  useEffect(() => {
    if (!selectedPartyId) {
      setSelectedPartyName("");
      return;
    }
    const p = partyList.find((pp) => String(pp.id) === String(selectedPartyId));
    setSelectedPartyName(p?.partyName || "");
  }, [selectedPartyId, partyList]);

  // Core: build statement
  const handleShow = async () => {
    if (!selectedPartyId || !fromDate || !toDate) {
      Swal.fire("Validation", "Please choose party and date range.", "warning");
      return;
    }

    try {
      setLoading(true);

      // fetch dyeing inward and payments
      const [inwardRes, paymentRes] = await Promise.all([
        api.get("/dyeing-inward"),
        api.get("/payment"),
      ]);

      const inwardAll = Array.isArray(inwardRes.data) ? inwardRes.data : [];
      const paymentAll = Array.isArray(paymentRes.data) ? paymentRes.data : [];

      // Normalize party matching: we'll match by party id if available else partyName
      const partyIdStr = String(selectedPartyId);

      // convert dates to stamps for comparison
      const fromIso = normalizeDateISO(fromDate);
      const toIso = normalizeDateISO(toDate);
      const fromTs = dateStamp(fromIso);
      const toTs = dateStamp(toIso);

      // Build inward records for the chosen party
      const inwardRecs = inwardAll
        .filter((rec: any) => {
          if (rec.partyId !== undefined && rec.partyId !== null) {
            return String(rec.partyId) === partyIdStr;
          }
          const name = (rec.partyName || "").toString().trim();
          return name === selectedPartyName;
        })
        .map((rec: any) => {
          const iso = normalizeDateISO(rec.dated || rec.date || rec.createdAt);
          const amount = (rec.rows || []).reduce(
            (s: number, r: any) => s + (toNum(r.amount) || 0),
            0
          );
          return {
            dateISO: iso,
            dt: dateStamp(iso),
            challan: rec.challanNo || rec.challan || rec.id || "-",
            amount,
            raw: rec,
          };
        });

      // Build payment records (only payments to Party matching selected party)
      const paymentRecs = paymentAll
        .filter((p: any) => {
          const isParty =
            String((p.paymentTo || "").toString()).toLowerCase() === "party";
          if (!isParty) return false;
          if (p.partyId !== undefined && p.partyId !== null) {
            return String(p.partyId) === partyIdStr;
          }
          const name = (p.partyName || "").toString().trim();
          return name === selectedPartyName;
        })
        .map((p: any) => {
          const iso = normalizeDateISO(p.paymentDate || p.date || p.createdAt);
          const amt = toNum(p.amount);
          return {
            dateISO: iso,
            dt: dateStamp(iso),
            ref: p.id || p._id || p.paymentRef || "-",
            amount: amt,
            raw: p,
            paymentThrough: p.paymentThrough || "",
          };
        });

      // Opening balance from transactions before from
      const openingDebitFromTx = inwardRecs
        .filter((r) => r.dt < fromTs)
        .reduce((s, r) => s + r.amount, 0);
      const openingCreditFromTx = paymentRecs
        .filter((r) => r.dt < fromTs)
        .reduce((s, r) => s + r.amount, 0);

      // ALSO include Party master opening balance (if any)
      const selectedParty = partyList.find(
        (p) =>
          String(p.id) === String(selectedPartyId) ||
          String(p._id) === String(selectedPartyId) ||
          (p.partyName || "").trim().toLowerCase() ===
            (selectedPartyName || "").trim().toLowerCase()
      );

      const partyOpeningRaw = selectedParty
        ? toNum((selectedParty as any).openingBalance)
        : 0;
      const partyOpeningType = selectedParty
        ? (selectedParty as any).openingBalanceType || ""
        : "";

      // partyOpening contributes to credit or debit depending on type
      const openingDebitFromParty =
        partyOpeningType && String(partyOpeningType).toUpperCase() === "DR"
          ? partyOpeningRaw
          : 0;
      const openingCreditFromParty =
        partyOpeningType && String(partyOpeningType).toUpperCase() === "CR"
          ? partyOpeningRaw
          : 0;

      // Final opening debit & credit (sum of tx + party master)
      const openingDebit = openingDebitFromTx + openingDebitFromParty;
      const openingCredit = openingCreditFromTx + openingCreditFromParty;

      // running balance := debits - credits
      let running = openingDebit - openingCredit;

      // Transactions inside range
      type Tx = {
        dt: number;
        dateISO: string;
        debit: number;
        credit: number;
        narration: string;
        sortKey: string;
      };
      const txs: Tx[] = [];

      inwardRecs
        .filter((r) => r.dt >= fromTs && r.dt <= toTs)
        .forEach((r, idx) =>
          txs.push({
            dt: r.dt,
            dateISO: r.dateISO,
            debit: r.amount,
            credit: 0,
            narration: `Dyeing Inward - Challan ${r.challan}`,
            sortKey: `IN-${r.challan}-${idx}`,
          })
        );

      paymentRecs
        .filter((r) => r.dt >= fromTs && r.dt <= toTs)
        .forEach((r, idx) =>
          txs.push({
            dt: r.dt,
            dateISO: r.dateISO,
            debit: 0,
            credit: r.amount,
            narration: `Payment - Ref ${r.ref}${
              r.paymentThrough ? ` (${r.paymentThrough})` : ""
            }`,
            sortKey: `PAY-${r.ref}-${idx}`,
          })
        );

      // Sort txs by date then sortKey
      txs.sort((a, b) => a.dt - b.dt || a.sortKey.localeCompare(b.sortKey));

      // Build statement rows with running balance
      const statement: StatementRow[] = [];
      let idCounter = 1;

      // Opening row
      statement.push({
        id: idCounter++,
        date: displayDate(fromIso),
        narration: `Opening Balance ${
          partyOpeningType ? `(${String(partyOpeningType).toUpperCase()})` : ""
        }`,
        debit: openingDebit,
        credit: openingCredit,
        balance: running,
        type: "OPEN",
        rawDateISO: fromIso,
      });

      for (const t of txs) {
        running = running + t.debit - t.credit;
        statement.push({
          id: idCounter++,
          date: displayDate(t.dateISO),
          narration: t.narration,
          debit: t.debit,
          credit: t.credit,
          balance: running,
          type: t.debit ? "INWARD" : "PAYMENT",
          rawDateISO: t.dateISO,
        });
      }

      setRows(statement);
      setShowModal(true);
    } catch (err) {
      console.error("Error generating dyeing amount statement:", err);
      Swal.fire("Error", "Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = useMemo(
    () => rows.reduce((s, r) => s + (r.debit || 0), 0),
    [rows]
  );
  const totalCredit = useMemo(
    () => rows.reduce((s, r) => s + (r.credit || 0), 0),
    [rows]
  );
  const closingBalance = rows.length ? rows[rows.length - 1].balance : 0;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const w = window.open("", "", "width=900,height=600");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Dyeing Amount Statement</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #444; padding: 6px; font-size: 13px; text-align: left; }
            th { background: #f4f4f4; text-align: center; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50">
        <div className="bg-white rounded-xl shadow p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Dyeing Amount Statement
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block mb-1 font-medium">Dyeing Party</label>
              <select
                className="border rounded-lg w-full px-3 py-2"
                value={String(selectedPartyId)}
                onChange={(e) => setSelectedPartyId(e.target.value)}
              >
                <option value="">-- Select Dyeing Party --</option>
                {partyList.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {p.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">From Date</label>
              <input
                type="date"
                className="border rounded-lg w-full px-3 py-2"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">To Date</label>
              <input
                type="date"
                className="border rounded-lg w-full px-3 py-2"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleShow}
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Show Statement"}
            </button>
            <button
              onClick={() => {
                setSelectedPartyId("");
                setSelectedPartyName("");
                setFromDate("");
                setToDate(todayISO());
                setRows([]);
                setShowModal(false);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Modal / Report */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-2xl w-[95%] md:w-4/5 max-h-[90vh] overflow-auto p-6">
              <div ref={printRef as any}>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-center">
                    Dyeing Amount Statement
                  </h3>
                  <div className="flex justify-between text-sm text-gray-700 mt-2">
                    <div>Party: {selectedPartyName || "-"}</div>
                    <div>
                      Period: {fromDate || "-"} to {toDate || "-"}
                    </div>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-[800px] w-full border text-sm">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border p-2">S.No.</th>
                        <th className="border p-2">Date</th>
                        <th className="border p-2">Narration</th>
                        <th className="border p-2 right">Debit</th>
                        <th className="border p-2 right">Credit</th>
                        <th className="border p-2 right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="border p-4 text-center text-gray-500"
                          >
                            No transactions
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr
                            key={r.id}
                            className={r.type === "OPEN" ? "bg-yellow-50" : ""}
                          >
                            <td className="border p-2 text-center">{i + 1}</td>
                            <td className="border p-2">{r.date}</td>
                            <td className="border p-2">{r.narration}</td>
                            <td className="border p-2 text-right">
                              ₹{(r.debit || 0).toFixed(2)}
                            </td>
                            <td className="border p-2 text-right">
                              ₹{(r.credit || 0).toFixed(2)}
                            </td>
                            <td className="border p-2 text-right font-semibold">
                              ₹{(r.balance || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50 font-semibold">
                        <td colSpan={3} className="border p-2 text-right">
                          Totals
                        </td>
                        <td className="border p-2 text-right">
                          ₹{totalDebit.toFixed(2)}
                        </td>
                        <td className="border p-2 text-right">
                          ₹{totalCredit.toFixed(2)}
                        </td>
                        <td className="border p-2 text-right">
                          ₹{closingBalance.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const csvRows = [
                        [
                          "S.No",
                          "Date",
                          "Narration",
                          "Debit",
                          "Credit",
                          "Balance",
                        ],
                        ...rows.map((r, i) => [
                          String(i + 1),
                          r.date,
                          r.narration,
                          (r.debit || 0).toFixed(2),
                          (r.credit || 0).toFixed(2),
                          (r.balance || 0).toFixed(2),
                        ]),
                      ];
                      const csv = csvRows
                        .map((r) =>
                          r
                            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                            .join(",")
                        )
                        .join("\n");
                      navigator.clipboard.writeText(csv).then(
                        () =>
                          Swal.fire(
                            "Copied",
                            "Statement CSV copied to clipboard",
                            "success"
                          ),
                        () => Swal.fire("Error", "Failed to copy CSV", "error")
                      );
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Copy CSV
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default DyeingAmountStatement;
