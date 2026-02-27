// src/pages/Knitting/KnittingAmountStatement.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

/**
 KnittingAmountStatement
 - Debit source: /knitting/list  (knitting inward)
 - Credit source: /payment       (payments where paymentTo === "Party" and party matches)
 - Party list: /party/category/Knitting
 - Shows Opening Balance from Party master (openingBalance + openingBalanceType "CR"/"DR")
   combined with transactions prior to `fromDate`.
*/

type Party = {
  id?: string | number;
  _id?: string;
  partyName?: string;
  openingBalance?: number | string;
  openingBalanceType?: string; // "CR" | "DR"
};

type KnittingDoc = any;
type PaymentDoc = any;

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

const dateStamp = (iso?: string) => {
  if (!iso) return NaN;
  return new Date(`${iso}T00:00:00`).getTime();
};

const toNum = (v: any) => {
  const n = parseFloat(
    String(v ?? "")
      .toString()
      .replace(/,/g, "")
  );
  return Number.isFinite(n) ? n : 0;
};

const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

interface StatementRow {
  id: number;
  date: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  type: "OPEN" | "INWARD" | "PAYMENT";
}

const KnittingAmountStatement: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string>("");
  const [partyName, setPartyName] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);

  // load knitting parties
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/party/category/Knitting");
        const list = Array.isArray(res.data) ? res.data : [];
        setParties(list);
      } catch (err) {
        console.error("Error loading parties:", err);
        Swal.fire("Error", "Failed to load knitting parties", "error");
      }
    };
    load();
  }, []);

  // Keep partyName up-to-date for selected id (support id or _id)
  useEffect(() => {
    if (!partyId) {
      setPartyName("");
      return;
    }
    const p = parties.find(
      (x) =>
        String(x.id) === String(partyId) || String(x._id) === String(partyId)
    );
    setPartyName(p?.partyName || "");
  }, [partyId, parties]);

  const handleShowReport = async () => {
    if (!partyId && !partyName) {
      Swal.fire("Validation", "Please select a Knitting party.", "warning");
      return;
    }
    if (!fromDate || !toDate) {
      Swal.fire("Validation", "Please select From and To dates.", "warning");
      return;
    }

    try {
      setLoading(true);

      // fetch knitting inward docs and payments concurrently
      const [knittingRes, paymentRes] = await Promise.all([
        api.get("/knitting/list"),
        api.get("/payment"),
      ]);

      const knittingDocs: KnittingDoc[] = Array.isArray(knittingRes.data)
        ? knittingRes.data
        : [];
      const payments: PaymentDoc[] = Array.isArray(paymentRes.data)
        ? paymentRes.data
        : [];

      // identify party matching strategy:
      const partyIdStr = String(partyId || "")
        .trim()
        .toLowerCase();
      const partyNameStr = (partyName || "").trim().toLowerCase();

      const knittingBelongsToParty = (doc: any) => {
        if (!doc) return false;
        if (doc.party && (doc.party.id || doc.party._id)) {
          const pid = String(doc.party.id ?? doc.party._id ?? "")
            .trim()
            .toLowerCase();
          if (partyIdStr && pid === partyIdStr) return true;
        }
        const name = String(doc.partyName ?? doc.party?.partyName ?? "")
          .trim()
          .toLowerCase();
        if (partyNameStr && name === partyNameStr) return true;
        return false;
      };

      const paymentBelongsToParty = (p: any) => {
        if (!p) return false;
        if (String(p.paymentTo || "").toLowerCase() !== "party") return false;
        if (p.partyId) {
          if (
            partyIdStr &&
            String(p.partyId).trim().toLowerCase() === partyIdStr
          )
            return true;
        }
        const name = String(p.partyName || p.name || "")
          .trim()
          .toLowerCase();
        if (partyNameStr && name === partyNameStr) return true;
        return false;
      };

      // Build debit records from knittingDocs (use totalAmount if present, otherwise sum rows)
      type Tx = {
        dt: number;
        dateISO: string;
        amount: number;
        challan: string;
        type: "INWARD" | "PAYMENT";
      };
      const inwardTxs: Tx[] = knittingDocs
        .filter((d) => knittingBelongsToParty(d))
        .map((d) => {
          let amt = 0;
          if (d.totalAmount != null) amt = toNum(d.totalAmount);
          else if (Array.isArray(d.rows)) {
            amt = d.rows.reduce((s: number, r: any) => {
              if (r.amount != null) return s + toNum(r.amount);
              const weight = toNum(r.weight);
              const knitRate = toNum(r.knittingRate ?? r.rate);
              return s + weight * knitRate;
            }, 0);
          }
          const iso = toInputDate(d.dated ?? d.date ?? d.createdAt) || "";
          return {
            dt: dateStamp(iso),
            dateISO: iso,
            amount: amt,
            challan: String(d.challanNo ?? d.challan ?? d.id ?? ""),
            type: "INWARD" as const,
          };
        })
        .filter((t) => isFinite(t.dt) && t.dt > 0);

      // Build credit records from payments
      const paymentTxs: Tx[] = payments
        .filter((p) => paymentBelongsToParty(p))
        .map((p) => {
          const amt = toNum(p.amount);
          const iso = toInputDate(p.paymentDate ?? p.date ?? p.createdAt) || "";
          return {
            dt: dateStamp(iso),
            dateISO: iso,
            amount: amt,
            challan: String(p.id ?? p.paymentRef ?? ""),
            type: "PAYMENT" as const,
          };
        })
        .filter((t) => isFinite(t.dt) && t.dt > 0);

      // Combine txs
      const allTxs: Tx[] = [...inwardTxs, ...paymentTxs];

      // date range stamps
      const fromIso = toInputDate(fromDate);
      const toIso = toInputDate(toDate);
      const fromTs = fromIso ? dateStamp(fromIso) : Number.NEGATIVE_INFINITY;
      const toTs = toIso ? dateStamp(toIso) : Number.POSITIVE_INFINITY;

      // compute opening balances from transactions before fromTs
      const openingDebitFromTx = allTxs
        .filter((x) => x.dt < fromTs && x.type === "INWARD")
        .reduce((s, x) => s + x.amount, 0);
      const openingCreditFromTx = allTxs
        .filter((x) => x.dt < fromTs && x.type === "PAYMENT")
        .reduce((s, x) => s + x.amount, 0);

      // ALSO include Party master opening balance (if any)
      const selectedParty = parties.find(
        (p) =>
          String(p.id) === String(partyId) ||
          String(p._id) === String(partyId) ||
          (p.partyName || "").trim().toLowerCase() === partyNameStr
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

      // running balance := debits - credits (consistent with earlier implementation)
      let running = openingDebit - openingCredit;

      // transactions inside range sorted by date then type(Inward first)
      const inRange = allTxs
        .filter((x) => x.dt >= fromTs && x.dt <= toTs)
        .sort(
          (a, b) =>
            a.dt - b.dt ||
            a.type.localeCompare(b.type) ||
            a.challan.localeCompare(b.challan)
        );

      // Build statement rows
      const statement: StatementRow[] = [];
      let idCounter = 1;

      // Opening row: show the computed openingDebit and openingCredit
      statement.push({
        id: idCounter++,
        date: fromIso || todayISO(),
        narration: `Opening Balance ${
          selectedParty ? `(${partyOpeningType || "-"})` : ""
        }`,
        debit: openingDebit,
        credit: openingCredit,
        balance: running,
        type: "OPEN",
      });

      for (const t of inRange) {
        if (t.type === "INWARD") {
          running += t.amount;
          statement.push({
            id: idCounter++,
            date: t.dateISO || "",
            narration: `Knitting Inward - Challan ${t.challan || "-"}`,
            debit: t.amount,
            credit: 0,
            balance: running,
            type: "INWARD",
          });
        } else {
          // PAYMENT
          running -= t.amount;
          statement.push({
            id: idCounter++,
            date: t.dateISO || "",
            narration: `Payment - Ref ${t.challan || "-"}`,
            debit: 0,
            credit: t.amount,
            balance: running,
            type: "PAYMENT",
          });
        }
      }

      setRows(statement);
      setShowModal(true);
    } catch (err) {
      console.error("Error building knitting statement:", err);
      Swal.fire("Error", "Failed to generate statement", "error");
    } finally {
      setLoading(false);
    }
  };

  // Export / print helpers
  const totalDebit = useMemo(
    () =>
      rows.filter((r) => r.type !== "OPEN").reduce((s, r) => s + r.debit, 0),
    [rows]
  );
  const totalCredit = useMemo(
    () =>
      rows.filter((r) => r.type !== "OPEN").reduce((s, r) => s + r.credit, 0),
    [rows]
  );
  const closingBalance = useMemo(
    () => (rows.length ? rows[rows.length - 1].balance : 0),
    [rows]
  );

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const w = window.open("", "", "width=900,height=600");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Knitting Amount Statement</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #333; padding: 6px; font-size: 13px; text-align: left; }
            th { background: #f3f4f6; text-align: center; }
            .right { text-align: right; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">
            Amount Statement — Knitting
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Party</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- Select Knitting Party --</option>
                {parties.map((p, idx) => (
                  <option
                    key={String(p.id ?? p._id ?? idx)}
                    value={String(p.id ?? p._id ?? "")}
                  >
                    {p.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Show"}
            </button>
            <button
              onClick={() => {
                setPartyId("");
                setPartyName("");
                setFromDate("");
                setToDate(todayISO());
                setRows([]);
                setShowModal(false);
              }}
              className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-2xl w-[95%] md:w-4/5 max-h-[90vh] overflow-auto p-6">
              <div ref={printRef as any}>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-center">
                    Knitting Amount Statement
                  </h3>
                  <div className="flex justify-between text-sm text-gray-700 mt-2">
                    <div>
                      Party: {partyName || "-"}
                      {(() => {
                        const selectedParty = parties.find(
                          (p) =>
                            String(p.id) === String(partyId) ||
                            String(p._id) === String(partyId) ||
                            (p.partyName || "").trim().toLowerCase() ===
                              (partyName || "").trim().toLowerCase()
                        );
                        if (!selectedParty) return null;
                        const ob = toNum(selectedParty.openingBalance);
                        const ot = (
                          selectedParty.openingBalanceType || ""
                        ).toUpperCase();
                        if (!ob) return null;
                        return (
                          <span className="ml-3 text-sm text-gray-600">
                            (Opening: ₹{fmt2(ob)}{" "}
                            {ot === "CR" ? "Cr" : ot === "DR" ? "Dr" : ""})
                          </span>
                        );
                      })()}
                    </div>
                    <div>
                      Period: {fromDate || "-"} to {toDate || "-"}
                    </div>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-[900px] w-full border text-sm">
                    <thead className="bg-gray-200 sticky top-0">
                      <tr>
                        <th className="border p-2 text-center">S.No</th>
                        <th className="border p-2">Date</th>
                        <th className="border p-2">Narration</th>
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
                            colSpan={7}
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
                            <td className="border p-2">{r.date || "-"}</td>
                            <td className="border p-2">{r.narration}</td>
                            <td className="border p-2 text-right">
                              ₹{fmt2(r.debit)}
                            </td>
                            <td className="border p-2 text-right">
                              ₹{fmt2(r.credit)}
                            </td>
                            <td className="border p-2 text-right font-semibold">
                              ₹{fmt2(r.balance)}
                            </td>
                            <td className="border p-2 text-center">{r.type}</td>
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
                          ₹{fmt2(totalDebit)}
                        </td>
                        <td className="border p-2 text-right">
                          ₹{fmt2(totalCredit)}
                        </td>
                        <td className="border p-2 text-right">
                          ₹{fmt2(closingBalance)}
                        </td>
                        <td className="border p-2 text-center">--</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // copy CSV
                      const csvRows = [
                        [
                          "S.No",
                          "Date",
                          "Narration",
                          "Debit",
                          "Credit",
                          "Balance",
                          "Type",
                        ],
                        ...rows.map((r, i) => [
                          String(i + 1),
                          r.date,
                          r.narration,
                          fmt2(r.debit),
                          fmt2(r.credit),
                          fmt2(r.balance),
                          r.type,
                        ]),
                      ];
                      const csv = csvRows
                        .map((row) =>
                          row
                            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                            .join(",")
                        )
                        .join("\n");
                      navigator.clipboard.writeText(csv).then(
                        () => {
                          Swal.fire(
                            "Copied",
                            "CSV copied to clipboard",
                            "success"
                          );
                        },
                        () => {
                          Swal.fire("Error", "Failed to copy CSV", "error");
                        }
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

export default KnittingAmountStatement;
