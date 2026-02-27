import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

// Types
interface StockRow {
  id: number;
  date: string;
  narration: string;
  issuePcs: string;
  issueKgs: string;
  receiptPcs: string;
  receiptKgs: string;
  receiptWastage: string;
  receiptRate: string; // Finishing Rate
  receiptAmount: string; // Weight * Finishing Rate
  balancePcs: string;
  balanceKgs: string;

  // Extra columns at the end
  lotNo: string;
  itemName: string;
}

interface Party {
  id: number | string;
  partyName: string;
  category?: { categoryName?: string };
}

// Helpers
const toNum = (v: any) => {
  const n = parseFloat(
    String(v ?? "")
      .toString()
      .replace(/,/g, "")
  );
  return isNaN(n) ? 0 : n;
};
const fmt0 = (n: number) => (n ? n.toFixed(0) : "");
const fmt3 = (n: number) => (n ? n.toFixed(3) : "");
const fmt2 = (n: number) => (n ? n.toFixed(2) : "");

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

const StockStatement: React.FC = () => {
  // Filters
  const [partyId, setPartyId] = useState<string>("");
  const [partyName, setPartyName] = useState<string>("");
  const [itemName, setItemName] = useState<string>(""); // selected fabrication
  const [fromDate, setFromDate] = useState<string>(""); // optional
  const [toDate, setToDate] = useState<string>(todayISO()); // default to today

  // Data sources
  const [parties, setParties] = useState<Party[]>([]);
  const [inwardDocs, setInwardDocs] = useState<any[]>([]);
  const [outwardDocs, setOutwardDocs] = useState<any[]>([]);
  const [itemOptions, setItemOptions] = useState<string[]>([]);

  // Result rows
  const [rows, setRows] = useState<StockRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Load Finishing parties
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

  // Preload Inward/Outward docs (for item dropdown and quicker report)
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const [inwRes, outRes] = await Promise.all([
          api.get("/finishing-inwards"),
          api.get("/finishing-outwards"),
        ]);
        const inw = Array.isArray(inwRes.data) ? inwRes.data : [];
        const out = Array.isArray(outRes.data) ? outRes.data : [];
        setInwardDocs(inw);
        setOutwardDocs(out);

        // Build item/fabrication dropdown options from both sources
        const itemsSet = new Set<string>();
        inw.forEach((doc) => {
          const rows = Array.isArray(doc.rows) ? doc.rows : [];
          rows.forEach((r: any) => {
            const name = String(r.itemName || r.item || r.fabric || "").trim();
            if (name) itemsSet.add(name);
          });
        });
        out.forEach((doc) => {
          const rows = Array.isArray(doc.rows) ? doc.rows : [];
          rows.forEach((r: any) => {
            const name = String(r.itemName || r.item || r.fabric || "").trim();
            if (name) itemsSet.add(name);
          });
        });

        const options = Array.from(itemsSet).sort((a, b) => a.localeCompare(b));
        setItemOptions(options);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load Inward/Outward data", "error");
      }
    };
    loadDocs();
  }, []);

  const handleShowReport = async () => {
    try {
      setLoading(true);

      // If not preloaded (rare), load now
      let inw = inwardDocs;
      let out = outwardDocs;
      if (!inw.length || !out.length) {
        const [inwRes, outRes] = await Promise.all([
          api.get("/finishing-inwards"),
          api.get("/finishing-outwards"),
        ]);
        inw = Array.isArray(inwRes.data) ? inwRes.data : [];
        out = Array.isArray(outRes.data) ? outRes.data : [];
        setInwardDocs(inw);
        setOutwardDocs(out);
      }

      const built = buildStatementRows(inw, out, {
        partyName,
        itemName,
        fromDate,
        toDate,
      });
      setRows(built);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load Inward/Outward data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open("", "", "width=900,height=600");
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Stock Account Statement</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h2 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              th, td { border: 1px solid #999; padding: 6px; text-align: right; }
              th { background-color: #f1f1f1; }
              /* Left align key columns */
              td:nth-child(1), th:nth-child(1),
              td:nth-child(2), th:nth-child(2),
              td:nth-child(3), th:nth-child(3),
              td:nth-child(13), th:nth-child(13),
              td:nth-child(14), th:nth-child(14) { text-align: left; }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Derived: finishing parties options
  const partyOptions = useMemo(() => {
    return parties.map((p) => ({
      id: String(p.id),
      name: p.partyName,
    }));
  }, [parties]);

  // Map partyId to name (for filtering)
  useEffect(() => {
    if (!partyId) {
      setPartyName("");
      return;
    }
    const p = parties.find((x) => String(x.id) === String(partyId));
    setPartyName(p?.partyName || "");
  }, [partyId, parties]);

  // Build statement rows from docs
  const buildStatementRows = (
    inwDocs: any[],
    outDocs: any[],
    params: {
      partyName?: string;
      itemName?: string;
      fromDate?: string; // YYYY-MM-DD or empty
      toDate?: string; // YYYY-MM-DD or empty
    }
  ): StockRow[] => {
    const pName = (params.partyName || "").trim().toLowerCase();
    const itm = (params.itemName || "").trim().toLowerCase();
    const fromIso = toInputDate(params.fromDate || "");
    const toIso = toInputDate(params.toDate || "");
    const fromTs = fromIso ? dateStamp(fromIso) : Number.NEGATIVE_INFINITY;
    const toTs = toIso ? dateStamp(toIso) : Number.POSITIVE_INFINITY;

    type Move = {
      dt: number;
      dateISO: string;
      type: "issue" | "receipt";
      narration: string;
      lotNo: string;
      itemName: string;
      rolls: number; // Pcs
      weight: number; // Kgs
      wastage: number;
      finishingRate: number; // Finishing rate (from Inward)
      amount: number; // Weight * Finishing Rate
    };

    const normalizeDocDate = (doc: any) =>
      toInputDate(doc?.dated || doc?.date || "");
    const docParty = (doc: any) => String(doc?.partyName || "").trim();

    // Issues from Outward
    const outwardMoves: Move[] = [];
    outDocs.forEach((doc: any) => {
      const dISO = normalizeDocDate(doc) || todayISO();
      const dt = dateStamp(dISO);
      const pn = docParty(doc);

      if (pName && pn.toLowerCase() !== pName) return;

      const rows = Array.isArray(doc.rows) ? doc.rows : [];
      rows.forEach((r: any) => {
        const item = String(r.itemName || r.item || r.fabric || "").trim();
        if (itm && !item.toLowerCase().includes(itm)) return;

        outwardMoves.push({
          dt,
          dateISO: dISO,
          type: "issue",
          narration: `Issue - Challan ${doc.challanNo || ""}${
            r.lotNo || r.fabricLotNo ? ` (Lot ${r.lotNo || r.fabricLotNo})` : ""
          }`,
          lotNo: String(r.lotNo || r.fabricLotNo || ""),
          itemName: item,
          rolls: toNum(r.rolls),
          weight: toNum(r.weight),
          wastage: 0,
          finishingRate: 0, // not applicable on issue
          amount: 0,
        });
      });
    });

    // Receipts from Inward
    const inwardMoves: Move[] = [];
    inwDocs.forEach((doc: any) => {
      const dISO = normalizeDocDate(doc) || todayISO();
      const dt = dateStamp(dISO);
      const pn = docParty(doc);

      if (pName && pn.toLowerCase() !== pName) return;

      const rows = Array.isArray(doc.rows) ? doc.rows : [];
      rows.forEach((r: any) => {
        const item = String(r.itemName || r.item || r.fabric || "").trim();
        if (itm && !item.toLowerCase().includes(itm)) return;

        const finishingRate = toNum(r.rate); // Only finishing rate
        const weight = toNum(r.weight);
        const amount = finishingRate * weight; // Strict calculation

        inwardMoves.push({
          dt,
          dateISO: dISO,
          type: "receipt",
          narration: `Receipt - Challan ${doc.challanNo || ""}${
            r.lotNo ? ` (Lot ${r.lotNo})` : ""
          }`,
          lotNo: String(r.lotNo || ""),
          itemName: item,
          rolls: toNum(r.rolls),
          weight,
          wastage: toNum(r.wastage),
          finishingRate,
          amount,
        });
      });
    });

    const allMoves = [...outwardMoves, ...inwardMoves];

    // Opening balances (before fromDate)
    const beforeMoves = allMoves.filter((m) => m.dt < fromTs);
    const openingPcs =
      beforeMoves.reduce(
        (s, m) => s + (m.type === "receipt" ? m.rolls : -m.rolls),
        0
      ) || 0;
    const openingKgs =
      beforeMoves.reduce(
        (s, m) => s + (m.type === "receipt" ? m.weight : -m.weight),
        0
      ) || 0;

    // In-range moves
    const inRange = allMoves
      .filter((m) => m.dt >= fromTs && m.dt <= toTs)
      .sort((a, b) =>
        a.dt === b.dt
          ? a.itemName.localeCompare(b.itemName) ||
            a.narration.localeCompare(b.narration)
          : a.dt - b.dt
      );

    // Build display rows with running balance
    let runPcs = openingPcs;
    let runKgs = openingKgs;

    const result: StockRow[] = [];
    let idCounter = 1;

    // Opening row
    result.push({
      id: idCounter++,
      date: displayDate(fromIso || todayISO()),
      narration: "Opening Balance",
      issuePcs: "",
      issueKgs: "",
      receiptPcs: "",
      receiptKgs: "",
      receiptWastage: "",
      receiptRate: "",
      receiptAmount: "",
      balancePcs: fmt0(runPcs),
      balanceKgs: fmt3(runKgs),
      lotNo: "",
      itemName: "",
    });

    // Movement rows
    inRange.forEach((m) => {
      if (m.type === "issue") {
        runPcs -= m.rolls;
        runKgs -= m.weight;
      } else {
        runPcs += m.rolls;
        runKgs += m.weight;
      }

      result.push({
        id: idCounter++,
        date: displayDate(m.dateISO),
        narration: m.narration,
        issuePcs: m.type === "issue" ? fmt0(m.rolls) : "",
        issueKgs: m.type === "issue" ? fmt3(m.weight) : "",
        receiptPcs: m.type === "receipt" ? fmt0(m.rolls) : "",
        receiptKgs: m.type === "receipt" ? fmt3(m.weight) : "",
        receiptWastage: m.type === "receipt" ? fmt3(m.wastage) : "",
        // Show only Finishing Rate
        receiptRate: m.type === "receipt" ? fmt2(m.finishingRate) : "",
        // Amount = Weight * Finishing Rate
        receiptAmount: m.type === "receipt" ? fmt2(m.amount) : "",
        balancePcs: fmt0(runPcs),
        balanceKgs: fmt3(runKgs),
        lotNo: m.lotNo,
        itemName: m.itemName,
      });
    });

    return result;
  };

  // Totals row (exclude Opening Balance from sums)
  const totals = useMemo(() => {
    const mov = rows.filter((r) => r.narration !== "Opening Balance");
    let issuePcs = 0,
      issueKgs = 0,
      receiptPcs = 0,
      receiptKgs = 0,
      receiptWastage = 0,
      receiptAmount = 0,
      rateWeightedNumerator = 0;

    mov.forEach((r) => {
      const iPcs = toNum(r.issuePcs);
      const iKgs = toNum(r.issueKgs);
      const rPcs = toNum(r.receiptPcs);
      const rKgs = toNum(r.receiptKgs);
      const rW = toNum(r.receiptWastage);
      const amt = toNum(r.receiptAmount);
      const rate = toNum(r.receiptRate); // Finishing Rate

      issuePcs += iPcs;
      issueKgs += iKgs;
      receiptPcs += rPcs;
      receiptKgs += rKgs;
      receiptWastage += rW;
      receiptAmount += amt;
      rateWeightedNumerator += rate * rKgs; // Finishing rate weighted by receipt kgs
    });

    const avgRate = receiptKgs > 0 ? rateWeightedNumerator / receiptKgs : 0;

    const closing = rows.length ? rows[rows.length - 1] : null;
    const closingPcs = toNum(closing?.balancePcs);
    const closingKgs = toNum(closing?.balanceKgs);

    return {
      issuePcs,
      issueKgs,
      receiptPcs,
      receiptKgs,
      receiptWastage,
      receiptAmount,
      avgRate,
      closingPcs,
      closingKgs,
    };
  }, [rows]);

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6">
            Stock Statement (Finishing)
          </h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">
                Party Name (Finishing)
              </label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- All Parties --</option>
                {partyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-semibold mb-1">
                Item / Fabrication
              </label>
              <select
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- All Items --</option>
                {itemOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Loading..." : "Show Report"}
            </button>
            <button
              onClick={() => {
                setPartyId("");
                setPartyName("");
                setItemName("");
                setFromDate("");
                setToDate(todayISO());
                setRows([]);
                setShowModal(false);
              }}
              className="px-4 py-2 rounded border bg-white hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Report Modal */}
        {showModal && (
          <div className="fixed inset-0 mb-5 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-7xl max-h-[95vh] overflow-hidden p-5">
              <div ref={printRef}>
                {/* Header */}
                <div className="text-center mb-4 border-b pb-3">
                  <h2 className="text-lg font-bold mb-2">
                    Stock Account Statement
                  </h2>
                  <div className="text-sm font-semibold grid grid-cols-1 md:grid-cols-3 gap-2">
                    <span>Party: {partyName || "All"}</span>
                    <span>Item: {itemName || "All"}</span>
                    <span>
                      Period: {fromDate || "-"} to {toDate || "-"}
                    </span>
                  </div>
                </div>

                {/* Table with horizontal scroll */}
                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm min-w-[1400px]">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th
                            rowSpan={2}
                            className="border p-2 w-10 text-center"
                          >
                            #
                          </th>
                          <th
                            rowSpan={2}
                            className="border p-2 w-28 text-center"
                          >
                            Date
                          </th>
                          <th rowSpan={2} className="border p-2 text-left">
                            Narration
                          </th>

                          <th colSpan={2} className="border p-2 text-center">
                            Issue
                          </th>

                          <th colSpan={5} className="border p-2 text-center">
                            Receipt
                          </th>

                          <th colSpan={2} className="border p-2 text-center">
                            Balance
                          </th>

                          {/* Extra last columns */}
                          <th rowSpan={2} className="border p-2 text-left w-32">
                            Lot No
                          </th>
                          <th rowSpan={2} className="border p-2 text-left w-44">
                            Fabrication Name
                          </th>
                        </tr>
                        <tr>
                          <th className="border p-2 text-right w-16">Pcs</th>
                          <th className="border p-2 text-right w-20">Kgs</th>

                          <th className="border p-2 text-right w-16">Pcs</th>
                          <th className="border p-2 text-right w-20">Kgs</th>
                          <th className="border p-2 text-right w-20">
                            Wastage
                          </th>
                          <th className="border p-2 text-right w-36">
                            Finishing Rate
                          </th>
                          <th className="border p-2 text-right w-28">Amount</th>

                          <th className="border p-2 text-right w-16">Pcs</th>
                          <th className="border p-2 text-right w-20">Kgs</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={15}
                              className="p-4 text-center text-gray-500"
                            >
                              No data for the selected filters.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {rows.map((r) => (
                              <tr
                                key={r.id}
                                className="odd:bg-white even:bg-gray-50"
                              >
                                <td className="border p-2 text-center">
                                  {r.id}
                                </td>
                                <td className="border p-2 text-center">
                                  {r.date}
                                </td>
                                <td className="border p-2 text-left">
                                  {r.narration}
                                </td>

                                {/* Issue */}
                                <td className="border p-2 text-right">
                                  {r.issuePcs}
                                </td>
                                <td className="border p-2 text-right">
                                  {r.issueKgs}
                                </td>

                                {/* Receipt */}
                                <td className="border p-2 text-right">
                                  {r.receiptPcs}
                                </td>
                                <td className="border p-2 text-right">
                                  {r.receiptKgs}
                                </td>
                                <td className="border p-2 text-right">
                                  {r.receiptWastage}
                                </td>
                                <td className="border p-2 text-right">
                                  {r.receiptRate}
                                </td>
                                <td className="border p-2 text-right">
                                  {r.receiptAmount}
                                </td>

                                {/* Balance */}
                                <td className="border p-2 text-right">
                                  {r.balancePcs}
                                </td>
                                <td className="border p-2 text-right">
                                  {r.balanceKgs}
                                </td>

                                {/* Extra columns */}
                                <td className="border p-2 text-left">
                                  {r.lotNo}
                                </td>
                                <td className="border p-2 text-left">
                                  {r.itemName}
                                </td>
                              </tr>
                            ))}

                            {/* Totals Row */}
                            <tr className="bg-indigo-50 font-semibold">
                              <td className="border p-2 text-center"></td>
                              <td className="border p-2 text-center"></td>
                              <td className="border p-2 text-left">Totals</td>

                              {/* Issue totals */}
                              <td className="border p-2 text-right">
                                {fmt0(totals.issuePcs)}
                              </td>
                              <td className="border p-2 text-right">
                                {fmt3(totals.issueKgs)}
                              </td>

                              {/* Receipt totals */}
                              <td className="border p-2 text-right">
                                {fmt0(totals.receiptPcs)}
                              </td>
                              <td className="border p-2 text-right">
                                {fmt3(totals.receiptKgs)}
                              </td>
                              <td className="border p-2 text-right">
                                {fmt3(totals.receiptWastage)}
                              </td>
                              <td className="border p-2 text-right">
                                {fmt2(totals.avgRate)}
                              </td>
                              <td className="border p-2 text-right">
                                {fmt2(totals.receiptAmount)}
                              </td>

                              {/* Closing balance */}
                              <td className="border p-2 text-right">
                                {fmt0(totals.closingPcs)}
                              </td>
                              <td className="border p-2 text-right">
                                {fmt3(totals.closingKgs)}
                              </td>

                              {/* Blank for extra columns */}
                              <td className="border p-2 text-left"></td>
                              <td className="border p-2 text-left"></td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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

export default StockStatement;
