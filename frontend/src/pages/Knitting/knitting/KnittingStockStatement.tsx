import React, { useState, useRef, useEffect, useMemo } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

interface StockRow {
  id?: number;
  date: string;
  narration: string;
  issuePcs?: number;
  issueKgs?: number;
  issueAmount?: number;
  receiptPcs?: number;
  receiptKgs?: number;
  receiptAmount?: number;
  balancePcs?: number;
  balanceKgs?: number;
  balanceAmount?: number;
}

interface Party {
  id: number;
  name?: string;
  partyName?: string;
}

type KnittingOutward = {
  id: number;
  challanNo: string;
  date: string; // yyyy-mm-dd
  party?: { id: number; partyName: string };
  items?: any[];
};

type KnittingInward = {
  id: number;
  challanNo: string;
  dated: string; // yyyy-mm-dd
  party?: { id: number; partyName: string };
  totalRolls?: number;
  totalWeight?: number;
  totalAmount?: number;
};

const toNum = (v: any) =>
  v === null || v === undefined || v === "" || isNaN(Number(v)) ? 0 : Number(v);

// includesAllTokens: "Mat - Shade" jaisi input ko break karke sab tokens match karta hai
const includesAllTokens = (hay: string, needle: string) => {
  const s = (hay || "").toLowerCase();
  const tokens = (needle || "")
    .toLowerCase()
    .split(/[-,]/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => s.includes(t));
};

const parseDate = (s?: string) => (s ? new Date(s) : null);
const isBefore = (d: Date, from: Date) =>
  d.getTime() < new Date(from.setHours(0, 0, 0, 0)).getTime();
const inRange = (d: Date, from: Date, to: Date) =>
  d.getTime() >= new Date(from.setHours(0, 0, 0, 0)).getTime() &&
  d.getTime() <= new Date(to.setHours(23, 59, 59, 999)).getTime();

const KnittingStockStatement: React.FC = () => {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [partyList, setPartyList] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState("");
  const [itemName, setItemName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Item suggestions
  const [itemOptions, setItemOptions] = useState<string[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [includeInwardItems, setIncludeInwardItems] = useState(false);

  // Resolve selected party name once (used in modal header and print)
  const selectedPartyName = useMemo(() => {
    const p = partyList.find((x) => x.id.toString() === partyId);
    return p?.partyName || p?.name || "-";
  }, [partyId, partyList]);

  // Parties
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await api.get("/party/category/Knitting");
        setPartyList(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        Swal.fire("Error", "Failed to load party list", "error");
      }
    };
    fetchParties();
  }, []);

  const collectOutwardTokens = (outs: KnittingOutward[], tokens: Set<string>) => {
    outs.forEach((e) =>
      (e.items || []).forEach((it: any) => {
        const mat =
          it.material?.materialName || it.materialName || it?.material?.name || "";
        const shade = it.shadeName || it.shade?.shadeName || it.shadeCode || "";
        if (mat) tokens.add(mat);
        if (shade) tokens.add(shade);
        if (mat && shade) tokens.add(`${mat} - ${shade}`);
      })
    );
  };

  const collectInwardTokens = async (ins: KnittingInward[], tokens: Set<string>) => {
    // Throttle detail calls for performance
    const ids = ins.map((x) => x.id).slice(0, 25);
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const detailRes = await Promise.all(
        batch.map((id) => api.get(`/knitting/${id}`).catch(() => null))
      );
      detailRes.forEach((resp) => {
        const listRows = resp?.data?.rows || [];
        listRows.forEach((r: any) => {
          const fab = r.fabrication?.fabricName || r.item || "";
          const shade = r.shade || "";
          const lot = r.fabricLotNo || "";
          const proc = r.processing || "";
          if (fab) tokens.add(fab);
          if (shade) tokens.add(shade);
          if (lot) tokens.add(lot);
          if (proc) tokens.add(proc);
          if (fab && shade) tokens.add(`${fab} - ${shade}`);
        });
      });
    }
  };

  // Fetch item suggestions whenever party/date/toggle changes
  useEffect(() => {
    const fetchItemOptions = async () => {
      if (!partyId) {
        setItemOptions([]);
        return;
      }
      setLoadingItems(true);
      try {
        const [outsRes, insRes] = await Promise.all([
          api.get("/knitting-outward-challan"),
          api.get("/knitting/list"),
        ]);

        let outs: KnittingOutward[] = Array.isArray(outsRes.data) ? outsRes.data : [];
        let ins: KnittingInward[] = Array.isArray(insRes.data) ? insRes.data : [];

        outs = outs.filter((e) => String(e.party?.id) === String(partyId));
        ins = ins.filter((e) => String(e.party?.id) === String(partyId));

        // Date range filter if both selected; otherwise suggestions across all
        if (fromDate && toDate) {
          outs = outs.filter((e) => {
            const dt = parseDate(e.date);
            return dt ? inRange(dt, new Date(fromDate), new Date(toDate)) : false;
          });
          ins = ins.filter((e) => {
            const dt = parseDate(e.dated);
            return dt ? inRange(dt, new Date(fromDate), new Date(toDate)) : false;
          });
        }

        const tokens = new Set<string>();
        collectOutwardTokens(outs, tokens);

        if (includeInwardItems) {
          await collectInwardTokens(ins, tokens);
        }

        const list = Array.from(tokens).sort((a, b) => a.localeCompare(b));
        setItemOptions(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItemOptions();
  }, [partyId, fromDate, toDate, includeInwardItems]);

  // Matchers for filters (support "Mat - Shade" or multiple tokens)
  const outwardItemMatches = (it: any, needle: string) => {
    if (!needle) return true;
    const mat = it.material?.materialName || it.materialName || it?.material?.name || "";
    const shade = it.shadeName || it.shade?.shadeName || it.shadeCode || "";
    const subject = `${mat} ${shade}`;
    return includesAllTokens(subject, needle);
  };

  const inwardRowMatches = (r: any, needle: string) => {
    if (!needle) return true;
    const fab = r.fabrication?.fabricName || r.item || "";
       const shade = r.shade || "";
    const lot = r.fabricLotNo || "";
    const proc = r.processing || "";
    const subject = `${fab} ${shade} ${lot} ${proc}`;
    return includesAllTokens(subject, needle);
  };

  const handleShowReport = async () => {
    if (!partyId || !fromDate || !toDate) {
      Swal.fire("Missing Fields", "Please select party and date range", "warning");
      return;
    }

    try {
      setLoading(true);

      const [outwardRes, inwardRes] = await Promise.all([
        api.get("/knitting-outward-challan"),
        api.get("/knitting/list"),
      ]);

      const outwards: KnittingOutward[] = Array.isArray(outwardRes.data)
        ? outwardRes.data
        : [];
      const inwards: KnittingInward[] = Array.isArray(inwardRes.data)
        ? inwardRes.data
        : [];

      const outsByParty = outwards.filter(
        (e) => e.party?.id && String(e.party.id) === String(partyId)
      );
      const insByParty = inwards.filter(
        (e) => e.party?.id && String(e.party.id) === String(partyId)
      );

      const outsBefore: KnittingOutward[] = [];
      const outsInRange: KnittingOutward[] = [];
      for (const e of outsByParty) {
        const dt = parseDate(e.date);
        if (!dt) continue;
        if (isBefore(dt, new Date(fromDate))) outsBefore.push(e);
        else if (inRange(dt, new Date(fromDate), new Date(toDate))) outsInRange.push(e);
      }

      const insBefore: KnittingInward[] = [];
      const insInRange: KnittingInward[] = [];
      for (const e of insByParty) {
        const dt = parseDate(e.dated);
        if (!dt) continue;
        if (isBefore(dt, new Date(fromDate))) insBefore.push(e);
        else if (inRange(dt, new Date(fromDate), new Date(toDate))) insInRange.push(e);
      }

      // Sum outward (pcs/kgs/amount)
      const sumOutward = (entry: KnittingOutward, needle: string) => {
        const items = Array.isArray(entry.items) ? entry.items : [];
        const filtered = needle?.trim()
          ? items.filter((it) => outwardItemMatches(it, needle))
          : items;

        const pcs = filtered.reduce(
          (s, it) => s + (toNum(it.roll ?? it.receivedRolls)),
          0
        );
        const kgs = filtered.reduce(
          (s, it) => s + (toNum(it.wtPerBox) || toNum(it.weight)),
          0
        );
        const amt = filtered.reduce((s, it) => {
          const lineAmt =
            toNum(it.amount) ||
            (toNum(it.wtPerBox) || toNum(it.weight)) * toNum(it.rate);
          return s + lineAmt;
        }, 0);

        return { pcs, kgs, amt };
      };

      // Sum inward (pcs/kgs/amount)
      const sumInwardTotalsFast = (entry: KnittingInward) => ({
        pcs: toNum(entry.totalRolls),
        kgs: toNum(entry.totalWeight),
        amt: toNum(entry.totalAmount),
      });

      const sumInwardByFetch = async (entry: KnittingInward, needle: string) => {
        try {
          const det = await api.get(`/knitting/${entry.id}`);
          const listRows = Array.isArray(det.data?.rows) ? det.data.rows : [];
          const filtered = listRows.filter((r: any) => inwardRowMatches(r, needle));
          const pcs = filtered.reduce((s: number, r: any) => s + toNum(r.rolls), 0);
          const kgs = filtered.reduce((s: number, r: any) => s + toNum(r.weight), 0);
          const amt = filtered.reduce(
            (s: number, r: any) => s + toNum(r.weight) * toNum(r.knittingRate),
            0
          );
          return { pcs, kgs, amt };
        } catch {
          return { pcs: 0, kgs: 0, amt: 0 };
        }
      };

      // Opening totals
      let openingIssuePcs = 0,
        openingIssueKgs = 0,
        openingIssueAmt = 0,
        openingReceiptPcs = 0,
        openingReceiptKgs = 0,
        openingReceiptAmt = 0;

      for (const e of outsBefore) {
        const s = sumOutward(e, itemName);
        openingIssuePcs += s.pcs;
        openingIssueKgs += s.kgs;
        openingIssueAmt += s.amt;
      }

      if (itemName?.trim()) {
        const sums = await Promise.all(insBefore.map((e) => sumInwardByFetch(e, itemName)));
        for (const s of sums) {
          openingReceiptPcs += s.pcs;
          openingReceiptKgs += s.kgs;
          openingReceiptAmt += s.amt;
        }
      } else {
        for (const e of insBefore) {
          const s = sumInwardTotalsFast(e);
          openingReceiptPcs += s.pcs;
          openingReceiptKgs += s.kgs;
          openingReceiptAmt += s.amt;
        }
      }

      const openingBalPcs = openingIssuePcs - openingReceiptPcs;
      const openingBalKgs = openingIssueKgs - openingReceiptKgs;
      const openingBalAmt = openingIssueAmt - openingReceiptAmt;

      const ledgerRows: StockRow[] = [
        {
          date: fromDate,
          narration: "Opening Balance",
          balancePcs: openingBalPcs,
          balanceKgs: openingBalKgs,
          balanceAmount: Number(openingBalAmt.toFixed(2)),
        },
      ];

      // In-range movements
      for (const e of outsInRange) {
        const s = sumOutward(e, itemName);
        if (s.pcs === 0 && s.kgs === 0 && s.amt === 0) continue;
        ledgerRows.push({
          date: e.date,
          narration: `Issue - ${e.challanNo || ""}`,
          issuePcs: s.pcs || undefined,
          issueKgs: s.kgs || undefined,
          issueAmount: s.amt ? Number(s.amt.toFixed(2)) : undefined,
        });
      }

      if (itemName?.trim()) {
        const results = await Promise.all(
          insInRange.map((e) => sumInwardByFetch(e, itemName).then((sum) => ({ entry: e, sum })))
        );
        for (const { entry, sum } of results) {
          if (sum.pcs === 0 && sum.kgs === 0 && sum.amt === 0) continue;
          ledgerRows.push({
            date: entry.dated,
            narration: `Receipt - ${entry.challanNo || ""}`,
            receiptPcs: sum.pcs || undefined,
            receiptKgs: sum.kgs || undefined,
            receiptAmount: sum.amt ? Number(sum.amt.toFixed(2)) : undefined,
          });
        }
      } else {
        for (const e of insInRange) {
          const s = sumInwardTotalsFast(e);
          if (s.pcs === 0 && s.kgs === 0 && s.amt === 0) continue;
          ledgerRows.push({
            date: e.dated,
            narration: `Receipt - ${e.challanNo || ""}`,
            receiptPcs: s.pcs || undefined,
            receiptKgs: s.kgs || undefined,
            receiptAmount: s.amt ? Number(s.amt.toFixed(2)) : undefined,
          });
        }
      }

      // Sort and running balances
      const sorted = ledgerRows.sort((a, b) => {
        if (a.narration === "Opening Balance") return -1;
        if (b.narration === "Opening Balance") return 1;
        return (a.date || "").localeCompare(b.date || "");
      });

      let balPcs = openingBalPcs;
      let balKgs = openingBalKgs;
      let balAmt = openingBalAmt;

      const withBalances = sorted.map((r) => {
        if (r.narration !== "Opening Balance") {
          balPcs += toNum(r.issuePcs) - toNum(r.receiptPcs);
          balKgs += toNum(r.issueKgs) - toNum(r.receiptKgs);
          balAmt += toNum(r.issueAmount) - toNum(r.receiptAmount);
          return {
            ...r,
            balancePcs: balPcs || undefined,
            balanceKgs: balKgs || undefined,
            balanceAmount:
              typeof balAmt === "number" ? Number(balAmt.toFixed(2)) : undefined,
          };
        }
        return r;
      });

      const finalRows = withBalances.map((r, idx) => ({ id: idx + 1, ...r }));

      if (finalRows.length <= 1) {
        Swal.fire("No Data", "No records found for selected filters", "info");
        return;
      }

      setRows(finalRows);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to build stock statement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "", "width=900,height=650");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Knitting Stock Statement</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h2 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              th, td { border: 1px solid #999; padding: 6px; text-align: right; }
              th { background-color: #f1f1f1; }
              td:nth-child(1), td:nth-child(2), td:nth-child(3) { text-align: left; }
              .section-title { margin-top: 20px; margin-bottom: 8px; font-weight: bold; }
            </style>
          </head>
          <body>${content.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const totals = useMemo(() => {
    const movRows = rows.filter((r) => r.narration !== "Opening Balance");
    const t = {
      issuePcs: 0,
      issueKgs: 0,
      issueAmt: 0,
      receiptPcs: 0,
      receiptKgs: 0,
      receiptAmt: 0,
      closingPcs: 0,
      closingKgs: 0,
      closingAmt: 0,
    };
    movRows.forEach((r) => {
      t.issuePcs += toNum(r.issuePcs);
      t.issueKgs += toNum(r.issueKgs);
      t.issueAmt += toNum(r.issueAmount);
      t.receiptPcs += toNum(r.receiptPcs);
      t.receiptKgs += toNum(r.receiptKgs);
      t.receiptAmt += toNum(r.receiptAmount);
    });
    const last = rows[rows.length - 1];
    t.closingPcs = toNum(last?.balancePcs);
    t.closingKgs = toNum(last?.balanceKgs);
    t.closingAmt = toNum(last?.balanceAmount);
    return t;
  }, [rows]);

  // Summary block (Opening, Issue, Receipt, Closing)
  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const openingRow = rows.find((r) => r.narration === "Opening Balance");

    const opening = {
      pcs: toNum(openingRow?.balancePcs),
      kgs: toNum(openingRow?.balanceKgs),
      amt: toNum(openingRow?.balanceAmount),
    };

    return {
      opening,
      issue: {
        pcs: totals.issuePcs,
        kgs: totals.issueKgs,
        amt: totals.issueAmt,
      },
      receipt: {
        pcs: totals.receiptPcs,
        kgs: totals.receiptKgs,
        amt: totals.receiptAmt,
      },
      closing: {
        pcs: totals.closingPcs,
        kgs: totals.closingKgs,
        amt: totals.closingAmt,
      },
    };
  }, [rows, totals]);

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">
            Knitting Stock Statement
          </h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Party</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- Select Party --</option>
                {partyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partyName || p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Item (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="itemOptionList"
                  placeholder="Material/Fabrication/Shade... (type or pick)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="border p-2 rounded w-full"
                  disabled={!partyId}
                />
                {itemName && (
                  <button
                    onClick={() => setItemName("")}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    title="Clear item"
                  >
                    Clear
                  </button>
                )}
              </div>
              <datalist id="itemOptionList">
                {itemOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                <span>{loadingItems ? "Loading items..." : `${itemOptions.length} item(s) found`}</span>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={includeInwardItems}
                    onChange={() => setIncludeInwardItems((s) => !s)}
                  />
                  <span>Include inward suggestions</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="text-center">
            <button
              disabled={loading}
              onClick={handleShowReport}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
            >
              {loading ? "Loading..." : "Show Report"}
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto p-5">
              <div ref={printRef}>
                <div className="mb-4 border-b pb-3">
                  <h2 className="text-lg font-bold text-center mb-2">
                    Knitting Stock Report
                  </h2>
                  <div className="text-sm font-semibold space-y-1 text-left">
                    <div>
                      Party: <span className="font-normal">{selectedPartyName}</span>
                    </div>
                    <div>
                      Item: <span className="font-normal">{itemName || "-"}</span>
                    </div>
                    <div>
                      Date: <span className="font-normal">{fromDate || "-"}</span>
                      {toDate ? <span> to {toDate}</span> : null}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th rowSpan={2} className="border p-2 text-center">#</th>
                        <th rowSpan={2} className="border p-2 text-center">Date</th>
                        <th rowSpan={2} className="border p-2 text-left">Narration</th>
                        <th colSpan={3} className="border p-2 text-center">Issue</th>
                        <th colSpan={3} className="border p-2 text-center">Receipt</th>
                        <th colSpan={3} className="border p-2 text-center">Balance</th>
                      </tr>
                      <tr>
                        <th className="border p-2 text-right">Pcs</th>
                        <th className="border p-2 text-right">Kgs</th>
                        <th className="border p-2 text-right">Amount</th>
                        <th className="border p-2 text-right">Pcs</th>
                        <th className="border p-2 text-right">Kgs</th>
                        <th className="border p-2 text-right">Amount</th>
                        <th className="border p-2 text-right">Pcs</th>
                        <th className="border p-2 text-right">Kgs</th>
                        <th className="border p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                          <td className="border p-2 text-center">{r.id}</td>
                          <td className="border p-2 text-center">{r.date}</td>
                          <td className="border p-2 text-left">{r.narration}</td>
                          <td className="border p-2 text-right">{r.issuePcs ?? ""}</td>
                          <td className="border p-2 text-right">{r.issueKgs ?? ""}</td>
                          <td className="border p-2 text-right">
                            {typeof r.issueAmount === "number" ? r.issueAmount.toFixed(2) : ""}
                          </td>
                          <td className="border p-2 text-right">{r.receiptPcs ?? ""}</td>
                          <td className="border p-2 text-right">{r.receiptKgs ?? ""}</td>
                          <td className="border p-2 text-right">
                            {typeof r.receiptAmount === "number" ? r.receiptAmount.toFixed(2) : ""}
                          </td>
                          <td className="border p-2 text-right">{r.balancePcs ?? ""}</td>
                          <td className="border p-2 text-right">
                            {typeof r.balanceKgs === "number" ? r.balanceKgs.toFixed(3) : ""}
                          </td>
                          <td className="border p-2 text-right">
                            {typeof r.balanceAmount === "number" ? r.balanceAmount.toFixed(2) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {rows.length > 1 && (
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border p-2 text-right" colSpan={3}>Totals</td>
                          <td className="border p-2 text-right">{totals.issuePcs}</td>
                          <td className="border p-2 text-right">{totals.issueKgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{totals.issueAmt.toFixed(2)}</td>
                          <td className="border p-2 text-right">{totals.receiptPcs}</td>
                          <td className="border p-2 text-right">{totals.receiptKgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{totals.receiptAmt.toFixed(2)}</td>
                          <td className="border p-2 text-right">{totals.closingPcs}</td>
                          <td className="border p-2 text-right">{totals.closingKgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{totals.closingAmt.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Summary below table (included in print) */}
                {rows.length > 1 && summary && (
                  <div className="mt-6">
                    <h3 className="text-md font-bold mb-2">Summary</h3>
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border p-2 text-left">Particulars</th>
                          <th className="border p-2 text-right">Pcs</th>
                          <th className="border p-2 text-right">Kgs</th>
                          <th className="border p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2">Opening Balance</td>
                          <td className="border p-2 text-right">{summary.opening.pcs}</td>
                          <td className="border p-2 text-right">{summary.opening.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.opening.amt.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="border p-2">Issued during period</td>
                          <td className="border p-2 text-right">{summary.issue.pcs}</td>
                          <td className="border p-2 text-right">{summary.issue.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.issue.amt.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="border p-2">Received during period</td>
                          <td className="border p-2 text-right">{summary.receipt.pcs}</td>
                          <td className="border p-2 text-right">{summary.receipt.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.receipt.amt.toFixed(2)}</td>
                        </tr>
                        <tr className="font-semibold bg-gray-50">
                          <td className="border p-2">Closing Balance</td>
                          <td className="border p-2 text-right">{summary.closing.pcs}</td>
                          <td className="border p-2 text-right">{summary.closing.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.closing.amt.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
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

export default KnittingStockStatement;