// src/pages/Reports/AmountReport.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";

interface StatementFilter {
  partyId: number | "";
  partyName: string;
  fromDate: string;
  toDate: string;
}

interface StatementRow {
  id: number;
  date: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  type: string; // "OPEN" | "PUR" | "PAY"
}

interface Party {
  id: number | string;
  partyName: string;
  openingBalance?: number | string;
  openingBalanceType?: string; // "CR" or "DR"
  // ...other fields
}

const toNum = (v: any) => {
  const n = parseFloat(
    String(v ?? "")
      .toString()
      .replace(/,/g, "")
  );
  return isNaN(n) ? 0 : n;
};
const fmt2 = (n: number) => (isNaN(n) ? "0.00" : n.toFixed(2));

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
  iso ? new Date(iso).toLocaleDateString() : "";

const dateStamp = (iso?: string) => {
  if (!iso) return NaN;
  return new Date(`${iso}T00:00:00`).getTime();
};

const AmountReport: React.FC = () => {
  const [filter, setFilter] = useState<StatementFilter>({
    partyId: "",
    partyName: "",
    fromDate: "",
    toDate: todayISO(),
  });

  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<StatementRow[]>([]);
  const [partyList, setPartyList] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);

  // Load purchase parties
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await api.get("/party/category/Purchase");
        const list = Array.isArray(res.data) ? res.data : [];
        setPartyList(list);
      } catch (err) {
        console.error("Error fetching parties (category):", err);
        // fallback to /party/all then filter
        try {
          const resAll = await api.get("/party/all");
          const all = Array.isArray(resAll.data) ? resAll.data : [];
          setPartyList(all);
        } catch (e) {
          console.error("Fallback party fetch failed:", e);
          Swal.fire("Error", "Failed to load party list.", "error");
        }
      }
    };
    fetchParties();
  }, []);

  // Handle filter inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "partyId") {
      const pid = value === "" ? "" : Number(value);
      const selectedParty = partyList.find(
        (p) => String(p.id) === String(value)
      );
      setFilter((prev) => ({
        ...prev,
        partyId: pid,
        partyName: selectedParty?.partyName || "",
      }));
    } else {
      setFilter((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Core: build report where Payments => DEBIT (paymentThrough shown) and Purchases => CREDIT
  const handleShow = async () => {
    if (!filter.partyId || !filter.fromDate || !filter.toDate) {
      Swal.fire(
        "Validation Error",
        "Please select Party and Date range.",
        "warning"
      );
      return;
    }

    try {
      setLoading(true);

      // 1) Fetch purchase entries (these become CREDITS)
      const resPurch = await api.get("/purchase-entry");
      const purchases = Array.isArray(resPurch.data) ? resPurch.data : [];

      // 2) Fetch payments (these become DEBITS)
      const resPay = await api.get("/payment");
      const payments = Array.isArray(resPay.data) ? resPay.data : [];

      const pNameLower = (filter.partyName || "").trim().toLowerCase();

      // Convert purchases into records {dt, dateISO, ref, credit}
      type PurRec = {
        dt: number;
        dateISO: string;
        ref: string;
        credit: number;
      };
      const purRecs: PurRec[] = purchases
        .filter((entry: any) => {
          const party = (entry.partyName || entry.party?.partyName || "")
            .toString()
            .trim()
            .toLowerCase();
          return party === pNameLower;
        })
        .map((entry: any) => {
          const dISO = toInputDate(entry.date || entry.dated) || todayISO();
          const items = Array.isArray(entry.items)
            ? entry.items
            : entry.items || entry.rows || [];
          let credit = 0;
          if (entry.totalAmount != null) credit = toNum(entry.totalAmount);
          else {
            credit = (items || []).reduce((s: number, it: any) => {
              const amt = toNum(it.amount);
              const fallback =
                toNum(it.rate) *
                (toNum(it.wtPerBox) ||
                  toNum(it.receivedWtBox) ||
                  toNum(it.weight) ||
                  0);
              return s + (amt || fallback);
            }, 0);
            if (!credit) credit = toNum(entry.amount || 0);
          }
          return {
            dt: dateStamp(dISO),
            dateISO: dISO,
            ref: String(entry.challanNo || entry.id || entry._id || "-"),
            credit,
          };
        });

      // Convert payments into records {dt, dateISO, ref, debit}; use paymentTo === "Party" and partyName matches
      type PayRec = {
        dt: number;
        dateISO: string;
        ref: string;
        debit: number;
        paymentThrough?: string;
      };
      const payRecs: PayRec[] = payments
        .filter((pay: any) => {
          const isParty =
            String(pay.paymentTo || "")
              .toString()
              .toLowerCase() === "party";
          const name = (pay.partyName || pay.party?.partyName || "")
            .toString()
            .trim()
            .toLowerCase();
          return isParty && name === pNameLower;
        })
        .map((pay: any) => {
          const dISO = toInputDate(pay.paymentDate || pay.date) || todayISO();
          return {
            dt: dateStamp(dISO),
            dateISO: dISO,
            ref: String(pay.id ?? pay._id ?? pay.paymentReference ?? "-"),
            debit: toNum(pay.amount),
            paymentThrough: pay.paymentThrough || "",
          };
        });

      // Date range stamps
      const fromIso = toInputDate(filter.fromDate);
      const toIso = toInputDate(filter.toDate);
      const fromTs = fromIso ? dateStamp(fromIso) : Number.NEGATIVE_INFINITY;
      const toTs = toIso ? dateStamp(toIso) : Number.POSITIVE_INFINITY;

      // Opening credits and debits (totals before fromTs) from transactions
      const openingCreditFromTx = purRecs
        .filter((r) => r.dt < fromTs)
        .reduce((s, r) => s + r.credit, 0);
      const openingDebitFromTx = payRecs
        .filter((r) => r.dt < fromTs)
        .reduce((s, r) => s + r.debit, 0);

      // ALSO include Party master opening balance (if any)
      const selectedParty = partyList.find(
        (p) => String(p.id) === String(filter.partyId)
      );
      const partyOpeningRaw = selectedParty
        ? toNum((selectedParty as any).openingBalance)
        : 0;
      const partyOpeningType = selectedParty
        ? (selectedParty as any).openingBalanceType || "CR"
        : "CR";

      // partyOpening contributes to credit or debit depending on type
      const openingCreditFromParty =
        partyOpeningType === "CR" ? partyOpeningRaw : 0;
      const openingDebitFromParty =
        partyOpeningType === "DR" ? partyOpeningRaw : 0;

      // Combine transaction openings and party master opening
      const openingCredit = openingCreditFromTx + openingCreditFromParty;
      const openingDebit = openingDebitFromTx + openingDebitFromParty;

      // NET opening = credits - debits
      const openingNet = openingCredit - openingDebit;

      // Display logic for top row: show value in Credit column if net >=0, else in Debit
      const openingCreditShown = openingNet >= 0 ? openingNet : 0;
      const openingDebitShown = openingNet < 0 ? Math.abs(openingNet) : 0;

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

      purRecs
        .filter((r) => r.dt >= fromTs && r.dt <= toTs)
        .forEach((r, idx) =>
          txs.push({
            dt: r.dt,
            dateISO: r.dateISO,
            debit: 0,
            credit: r.credit,
            narration: `Purchase - Challan ${r.ref || "-"}`,
            sortKey: `PUR-${r.ref}-${idx}`,
          })
        );

      payRecs
        .filter((r) => r.dt >= fromTs && r.dt <= toTs)
        .forEach((r, idx) =>
          txs.push({
            dt: r.dt,
            dateISO: r.dateISO,
            debit: r.debit,
            credit: 0,
            narration: `Payment - Ref ${r.ref || "-"}${
              r.paymentThrough ? ` (${r.paymentThrough})` : ""
            }`,
            sortKey: `PAY-${r.ref}-${idx}`,
          })
        );

      // Sort transactions by date then sortKey
      txs.sort((a, b) => a.dt - b.dt || a.sortKey.localeCompare(b.sortKey));

      // Build statement rows with running balance where Credit increases, Debit decreases
      const rows: StatementRow[] = [];
      let idCounter = 1;
      let running = openingNet; // net opening (credits - debits)

      // Opening Balance row: show net opening in appropriate column
      rows.push({
        id: idCounter++,
        date: displayDate(fromIso || todayISO()),
        narration: "Opening Balance",
        debit: openingDebitShown, // 0 if net is credit
        credit: openingCreditShown, // 0 if net is debit
        balance: running,
        type: "OPEN",
      });

      txs.forEach((t) => {
        running = running + t.credit - t.debit;
        rows.push({
          id: idCounter++,
          date: displayDate(t.dateISO),
          narration: t.narration,
          debit: t.debit,
          credit: t.credit,
          balance: running,
          type: t.credit ? "PUR" : "PAY",
        });
      });

      setReportData(rows);
      setShowReport(true);
    } catch (err) {
      console.error("Error building amount report:", err);
      Swal.fire("Error", "Failed to load amount report.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Print helper
  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open("", "", "width=900,height=600");
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Amount Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #444; padding: 8px; font-size: 13px; }
              th { background: #f0f0f0; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Totals: totals are for transactions (excluding opening row)
  const totals = useMemo(() => {
    const mov = reportData.filter((r) => r.narration !== "Opening Balance");
    const totalDebit = mov.reduce((s, r) => s + (r.debit || 0), 0);
    const totalCredit = mov.reduce((s, r) => s + (r.credit || 0), 0);
    const closing = reportData.length
      ? reportData[reportData.length - 1].balance
      : 0;
    return {
      totalDebit: fmt2(totalDebit),
      totalCredit: fmt2(totalCredit),
      closing: fmt2(closing),
    };
  }, [reportData]);

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Purchase Amount Report
          </h2>

          {!showReport ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">Party</label>
                  <select
                    name="partyId"
                    value={filter.partyId as any}
                    onChange={handleChange}
                    className="border rounded-lg w-full px-3 py-2"
                  >
                    <option value="">-- Select Party --</option>
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
                    name="fromDate"
                    value={filter.fromDate}
                    onChange={handleChange}
                    className="border rounded-lg w-full px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">To Date</label>
                  <input
                    type="date"
                    name="toDate"
                    value={filter.toDate}
                    onChange={handleChange}
                    className="border rounded-lg w-full px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={handleShow}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Show"}
                </button>
                <button
                  onClick={() =>
                    setFilter({
                      partyId: "",
                      partyName: "",
                      fromDate: "",
                      toDate: todayISO(),
                    })
                  }
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div ref={printRef as any}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    Purchase Amount Report
                  </h3>
                  <div className="flex justify-between text-sm text-gray-700 mt-2">
                    <div>Party: {filter.partyName || "-"}</div>
                    <div>
                      Period: {filter.fromDate || "-"} to {filter.toDate || "-"}
                    </div>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border p-2">S.No.</th>
                        <th className="border p-2">Date</th>
                        <th className="border p-2">Narration</th>
                        <th className="border p-2 text-right">Debit</th>
                        <th className="border p-2 text-right">Credit</th>
                        <th className="border p-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="border p-4 text-center text-gray-500"
                          >
                            No data
                          </td>
                        </tr>
                      ) : (
                        reportData.map((r, i) => (
                          <tr
                            key={r.id}
                            className={r.type === "OPEN" ? "bg-yellow-50" : ""}
                          >
                            <td className="border p-2 text-center">{i + 1}</td>
                            <td className="border p-2">{r.date}</td>
                            <td className="border p-2 text-left">
                              {r.narration}
                            </td>
                            <td className="border p-2 text-right">
                              ₹{fmt2(r.debit)}
                            </td>
                            <td className="border p-2 text-right">
                              ₹{fmt2(r.credit)}
                            </td>
                            <td className="border p-2 text-right">
                              ₹{fmt2(r.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    <tfoot>
                      <tr className="bg-blue-50 font-semibold">
                        <td colSpan={3} className="border p-2 text-right">
                          Totals:
                        </td>
                        <td className="border p-2 text-right">
                          ₹{totals.totalDebit}
                        </td>
                        <td className="border p-2 text-right">
                          ₹{totals.totalCredit}
                        </td>
                        <td className="border p-2 text-right">
                          ₹{totals.closing}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowReport(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Print
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default AmountReport;
