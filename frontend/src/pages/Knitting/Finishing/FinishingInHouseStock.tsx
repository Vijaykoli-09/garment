// src/pages/reports/FinishingInHouseStock.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

/**
 * FinishingInHouseStock
 *
 * - Merges: Finishing Inwards, Purchase Entries (Material = Fabrication Name), Cutting (stockRows)
 * - Implements FIFO consumption of finishing inward batches for cutting consumption
 * - Shows a dedicated column "Cutting Cons (KG) (FIFO)" computed as (consumption + KHO) per cutting stock row and consumed via FIFO
 * - Fabrication Weight (kg) column shows only inward / purchase weights (cutting is NOT added here)
 *
 * IMPORTANT: adapt field names if your API uses different property keys.
 */

/* ---------------- utilities ---------------- */
type IdLike = number | string;
const toNum = (v: any) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};
const toISO = (d?: any) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};
const fmtINR = (n: number) =>
  "₹" +
  (isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmt3 = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
const fmt2 = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ---------------- types ---------------- */
interface FinishingDoc {
  id?: IdLike;
  _id?: IdLike;
  dated?: string;
  date?: string;
  partyName?: string;
  challanNo?: string;
  rows?: any[];
}
interface FinRow {
  id: string; // docid-rowIndex
  lotNo?: string;
  date: string;
  fabricationName: string;
  weightKg: number;
  rateFND: number;
  finishingRate: number;
  rateSum: number; // rateFND + finishingRate
  amount: number; // weightKg * rateSum
}
interface PurchaseDoc {
  id?: IdLike;
  date?: string;
  party?: any;
  partyName?: string;
  challanNo?: string;
  items?: any[];
}
interface PurchaseRow {
  id: string;
  date: string;
  partyName?: string;
  challanNo?: string;
  materialName: string; // treated as Fabrication Name
  quantityKg: number;
  rate: number;
  amount: number;
}
interface CuttingEntry {
  serialNo?: string;
  date?: string;
  lotRows?: any[];
  stockRows?: any[]; // each { itemName, consumption, kho, consRate }
}

/**
 * ReportEvent represents any row in the chronological report.
 */
type EventType = "inward" | "purchase" | "cutting";
interface ReportEvent {
  type: EventType;
  date: string;
  fabricationName?: string;

  // inward
  inwardId?: string;
  lotNo?: string;
  inwardKg?: number;
  inwardRate?: number; // rateSum
  inwardAmount?: number;

  // purchase
  purchaseParty?: string;
  purchaseChallan?: string;
  purchaseQty?: number;
  purchaseRate?: number;
  purchaseAmount?: number;

  // cutting
  cuttingSerial?: string;
  cuttingConsKg?: number; // we now store consumption + KHO here
  cuttingConsRate?: number; // direct from cutting stock row (consRate)
  cuttingAmount?: number; // calculated by FIFO
  cuttingSource?: string; // e.g., "consRate" fallback info

  // running balances (added at the end)
  balanceAmt?: number;
  balanceKg?: number;
}

/* ---------------- component ---------------- */
const FinishingInHouseStock: React.FC = () => {
  const [fabricationFilter, setFabricationFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [finRows, setFinRows] = useState<FinRow[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  const [cuttingEntries, setCuttingEntries] = useState<CuttingEntry[]>([]);

  const [reportEvents, setReportEvents] = useState<ReportEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);

  /* ---------- load data ---------- */
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [finRes, purRes, cutRes] = await Promise.all([
          api.get("/finishing-inwards"),
          api.get("/purchase-entry"),
          api.get("/cutting-entries"),
        ]);

        // Finishing inwards -> flatten rows
        const finDocs: FinishingDoc[] = Array.isArray(finRes.data)
          ? finRes.data
          : [];
        const flats: FinRow[] = [];
        for (const doc of finDocs) {
          const docDate = toISO(doc.dated || doc.date);
          const rows = Array.isArray(doc.rows) ? doc.rows : [];
          rows.forEach((r: any, idx: number) => {
            const itemName = String(
              r.itemName || r.item || r.fabric || r.materialName || ""
            ).trim();
            const wt = toNum(r.weight || r.receivedWtBox || r.wt || r.weightKg);
            if (!itemName || wt <= 0) return;
            const rateFND = toNum(r.rateFND || r.rateF || r.rateFnd || 0);
            const finishingRate = toNum(r.rate || r.finishingRate || 0);
            const rateSum = rateFND + finishingRate;
            const amt = wt * rateSum;
            flats.push({
              id: `${doc.id ?? doc._id ?? "doc"}-${idx}`,
              lotNo: String(r.lotNo || r.lot || ""),
              date: docDate || "",
              fabricationName: itemName,
              weightKg: wt,
              rateFND,
              finishingRate,
              rateSum,
              amount: amt,
            });
          });
        }

        // Purchase entries -> flatten items (Quantity mapped to weight if available)
        const purDocs: PurchaseDoc[] = Array.isArray(purRes.data)
          ? purRes.data
          : [];
        const pRows: PurchaseRow[] = [];
        for (const doc of purDocs) {
          const d = toISO(doc.date);
          const items = Array.isArray(doc.items) ? doc.items : [];
          for (const it of items) {
            const name =
              String(
                it.material?.materialName ||
                  it.materialName ||
                  it.material?.name ||
                  ""
              ).trim() || "";
            if (!name) continue;
            // qty: prefer weight-like fields (wtPerBox / weight) to treat as kg
            const qty =
              toNum(it.wtPerBox) ||
              toNum(it.weight) ||
              toNum(it.quantity) ||
              toNum(it.qty) ||
              toNum(it.roll) ||
              0;
            const rate = toNum(it.rate || 0);
            const amt = qty * rate;
            pRows.push({
              id: `${doc.id ?? "pdoc"}-${name}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              date: d || "",
              partyName: doc.party?.partyName || doc.partyName || "",
              challanNo: doc.challanNo || "",
              materialName: name,
              quantityKg: qty,
              rate,
              amount: amt,
            });
          }
        }

        // Cutting entries (stockRows)
        const cuts: CuttingEntry[] = Array.isArray(cutRes.data)
          ? cutRes.data
          : [];

        setFinRows(flats);
        setPurchaseRows(pRows);
        setCuttingEntries(cuts);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  /* ---------- fabrication options ---------- */
  const fabricationOptions = useMemo(() => {
    const s = new Set<string>();
    finRows.forEach((r) => r.fabricationName && s.add(r.fabricationName));
    purchaseRows.forEach((p) => p.materialName && s.add(p.materialName));
    cuttingEntries.forEach((c) =>
      (c.stockRows || []).forEach((sr: any) => {
        const nm = String(sr.itemName || sr.materialName || "").trim();
        if (nm) s.add(nm);
      })
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [finRows, purchaseRows, cuttingEntries]);

  /* ---------- build report with FIFO ---------- */
  const buildReport = () => {
    try {
      // Build events from three sources
      const events: ReportEvent[] = [];

      // 1. Inwards
      for (const f of finRows) {
        if (fabricationFilter && fabricationFilter.trim()) {
          if (
            f.fabricationName.trim().toLowerCase() !==
            fabricationFilter.trim().toLowerCase()
          )
            continue;
        }
        if (fromDate && f.date && f.date < fromDate) continue;
        if (toDate && f.date && f.date > toDate) continue;

        events.push({
          type: "inward",
          date: f.date || "",
          fabricationName: f.fabricationName,
          inwardId: f.id,
          lotNo: f.lotNo,
          inwardKg: f.weightKg,
          inwardRate: f.rateSum,
          inwardAmount: f.amount,
        });
      }

      // 2. Purchases (Material = Fabrication Name)
      for (const p of purchaseRows) {
        if (fabricationFilter && fabricationFilter.trim()) {
          if (
            p.materialName.trim().toLowerCase() !==
            fabricationFilter.trim().toLowerCase()
          )
            continue;
        }
        if (fromDate && p.date && p.date < fromDate) continue;
        if (toDate && p.date && p.date > toDate) continue;

        events.push({
          type: "purchase",
          date: p.date || "",
          fabricationName: p.materialName,
          purchaseParty: p.partyName,
          purchaseChallan: p.challanNo,
          purchaseQty: p.quantityKg,
          purchaseRate: p.rate,
          purchaseAmount: p.amount,
        });
      }

      // 3. Cutting consumptions (from cuttingEntries.stockRows)
      for (const c of cuttingEntries) {
        const cDate = toISO(c.date);
        const stockRows = Array.isArray(c.stockRows) ? c.stockRows : [];
        for (const sr of stockRows) {
          const name = String(sr.itemName || sr.materialName || "").trim();
          if (!name) continue;
          if (fabricationFilter && fabricationFilter.trim()) {
            if (
              name.trim().toLowerCase() !==
              fabricationFilter.trim().toLowerCase()
            )
              continue;
          }

          // NEW: compute consumption as consumption + KHO (manual KHO)
          const cons =
            toNum(sr.consumption) +
            toNum((sr as any).kho ?? (sr as any).KHO ?? 0);
          if (cons <= 0) continue;

          if (fromDate && cDate && cDate < fromDate) continue;
          if (toDate && cDate && cDate > toDate) continue;

          // capture cutting cons rate if provided on stock row
          const consRate = toNum(
            sr.consRate || sr.rate || sr.consRatePerKg || 0
          );

          events.push({
            type: "cutting",
            date: cDate || "",
            fabricationName: name,
            cuttingSerial: c.serialNo,
            cuttingConsKg: cons,
            cuttingConsRate: consRate > 0 ? consRate : undefined,
            cuttingAmount: 0, // will be filled by FIFO below
            cuttingSource: consRate > 0 ? "consRate" : "",
          });
        }
      }

      // Sort events by date asc, and consistent ordering for same date: inward -> purchase -> cutting
      events.sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? 1 : -1;
        const order = { inward: 0, purchase: 1, cutting: 2 } as any;
        return order[a.type] - order[b.type];
      });

      // Prepare FIFO batches per fabrication seeded from finishing inwards (sorted by date asc)
      const batches: Record<
        string,
        {
          remainingKg: number;
          rate: number;
          sourceId?: string;
          date?: string;
        }[]
      > = {};

      for (const f of [...finRows].sort((a, b) =>
        a.date === b.date ? 0 : a.date > b.date ? 1 : -1
      )) {
        const k = f.fabricationName.trim().toLowerCase();
        if (!batches[k]) batches[k] = [];
        batches[k].push({
          remainingKg: f.weightKg,
          rate: f.rateSum,
          sourceId: f.id,
          date: f.date,
        });
      }

      // Running balances (we will recompute precisely later)
      const finalRows: ReportEvent[] = [];

      // Iterate events and apply FIFO on cutting events
      for (const ev of events) {
        if (!ev.fabricationName) {
          finalRows.push(ev);
          continue;
        }
        const key = ev.fabricationName.trim().toLowerCase();

        if (ev.type === "inward") {
          finalRows.push({ ...ev });
        } else if (ev.type === "purchase") {
          finalRows.push({ ...ev });
        } else if (ev.type === "cutting") {
          let cons = ev.cuttingConsKg ?? 0;
          let consumedAmount = 0;

          const bList = batches[key] || [];
          let i = 0;
          while (cons > 0 && i < bList.length) {
            const b = bList[i];
            if (b.remainingKg <= 0) {
              i++;
              continue;
            }
            const take = Math.min(cons, b.remainingKg);
            consumedAmount += take * b.rate;
            b.remainingKg -= take;
            cons -= take;
            if (b.remainingKg <= 0) i++;
          }

          // If leftover consumption remains, use cuttingConsRate if present, else fallback to latest purchase rate
          if (cons > 0) {
            if (ev.cuttingConsRate && ev.cuttingConsRate > 0) {
              consumedAmount += cons * (ev.cuttingConsRate ?? 0);
              ev.cuttingSource = "cutting-cons-rate";
            } else {
              // find latest purchase rate for this fabric (latest by date)
              const pur = purchaseRows
                .filter((p) => p.materialName.trim().toLowerCase() === key)
                .sort((a, b) =>
                  a.date === b.date ? 0 : a.date > b.date ? -1 : 1
                )[0];
              const fallbackRate = pur ? pur.rate : 0;
              consumedAmount += cons * fallbackRate;
              ev.cuttingSource = pur ? "purchase-rate" : "fallback-0";
            }
            cons = 0;
          }

          // attach computed amount
          finalRows.push({
            ...ev,
            cuttingAmount: consumedAmount,
          });
        }
      }

      // Recompute running balances for display by replaying finalRows
      const displayRows: ReportEvent[] = [];
      let balKg = 0;
      let balAmt = 0;
      for (const r of finalRows) {
        if (r.type === "inward") {
          const incKg = r.inwardKg ?? 0;
          const incAmt = r.inwardAmount ?? incKg * (r.inwardRate ?? 0);
          balKg += incKg;
          balAmt += incAmt;
          displayRows.push({
            ...r,
            balanceKg: balKg,
            balanceAmt: balAmt,
          });
        } else if (r.type === "purchase") {
          const incKg = r.purchaseQty ?? 0;
          const incAmt = r.purchaseAmount ?? incKg * (r.purchaseRate ?? 0);
          balKg += incKg;
          balAmt += incAmt;
          displayRows.push({
            ...r,
            balanceKg: balKg,
            balanceAmt: balAmt,
          });
        } else if (r.type === "cutting") {
          const decKg = r.cuttingConsKg ?? 0;
          const decAmt = r.cuttingAmount ?? 0;
          balKg -= decKg;
          balAmt -= decAmt;
          displayRows.push({
            ...r,
            balanceKg: balKg,
            balanceAmt: balAmt,
          });
        } else {
          displayRows.push({ ...r, balanceKg: balKg, balanceAmt: balAmt });
        }
      }

      setReportEvents(displayRows);
      setShowModal(true);
    } catch (err) {
      console.error("buildReport error", err);
      Swal.fire("Error", "Failed to build report", "error");
    }
  };

  /* ---------- print ---------- */
  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>In-House Stock Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h2 { text-align:center; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #111; padding: 6px; text-align: left; }
            th { background: #efefef; font-weight: bold; text-align:center; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
          <script>window.print();</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  /* ---------- helpers for UI formatting ---------- */
  const rowToCells = (r: any, idx: number) => {
    // We now show:
    // - Fabrication Weight (kg) = only for inward / purchase (cutting will have '-' in this column)
    // - Cutting Cons (KG) (FIFO) = only for cutting events (consumed kg by FIFO)
    // Other columns remain similar.
    const common = {
      date: r.date || "-",
      fabricationName: r.fabricationName || "-",
    };

    if (r.type === "inward") {
      return {
        sNo: idx + 1,
        date: common.date,
        purchase: "-",
        cuttingLot: "-",
        fabricationName: common.fabricationName,
        fabricationWeightKg: r.inwardKg ?? 0,
        cuttingConsKg: "-", // not applicable
        kydfRate: r.inwardRate ?? 0,
        cuttingConsRate: "-",
        purchaseRate: "-",
        amount: r.inwardAmount ?? (r.inwardKg ?? 0) * (r.inwardRate ?? 0),
        balanceAmt: r.balanceAmt ?? 0,
        balanceKg: r.balanceKg ?? 0,
      };
    } else if (r.type === "purchase") {
      return {
        sNo: idx + 1,
        date: common.date,
        purchase: `${r.purchaseParty || "-"} ${
          r.purchaseChallan ? `- ${r.purchaseChallan}` : ""
        }`,
        cuttingLot: "-",
        fabricationName: common.fabricationName,
        fabricationWeightKg: r.purchaseQty ?? 0,
        cuttingConsKg: "-",
        kydfRate: "-", // intentionally blank for purchases
        cuttingConsRate: "-",
        purchaseRate: r.purchaseRate ?? 0,
        amount:
          r.purchaseAmount ?? (r.purchaseQty ?? 0) * (r.purchaseRate ?? 0),
        balanceAmt: r.balanceAmt ?? 0,
        balanceKg: r.balanceKg ?? 0,
      };
    } else if (r.type === "cutting") {
      // cutting: show cutting serial and cuttingConsKg (consumption + KHO fed to FIFO)
      return {
        sNo: idx + 1,
        date: common.date,
        purchase: "-",
        cuttingLot: r.cuttingSerial ? `Lot: ${r.cuttingSerial}` : "-",
        fabricationName: common.fabricationName,
        fabricationWeightKg: "-", // DO NOT add cutting into Fabrication Weight column
        cuttingConsKg: r.cuttingConsKg ?? 0,
        kydfRate: "-", // not applicable
        cuttingConsRate:
          r.cuttingConsRate != null && r.cuttingConsRate !== undefined
            ? r.cuttingConsRate
            : "-",
        purchaseRate: "-", // not applicable
        amount: r.cuttingAmount ?? 0,
        balanceAmt: r.balanceAmt ?? 0,
        balanceKg: r.balanceKg ?? 0,
      };
    }

    // fallback
    return {
      sNo: idx + 1,
      date: common.date,
      purchase: "-",
      cuttingLot: "-",
      fabricationName: common.fabricationName,
      fabricationWeightKg: 0,
      cuttingConsKg: "-",
      kydfRate: "-",
      cuttingConsRate: "-",
      purchaseRate: "-",
      amount: 0,
      balanceAmt: 0,
      balanceKg: 0,
    };
  };

  /* ---------- totals helpers ---------- */
  const totalFabricationWeightOnly = useMemo(() => {
    // sum only inward + purchase weights across reportEvents (exclude cutting)
    return reportEvents.reduce((s, r) => {
      if (r.type === "inward") return s + (r.inwardKg ?? 0);
      if (r.type === "purchase") return s + (r.purchaseQty ?? 0);
      return s;
    }, 0);
  }, [reportEvents]);

  const totalCuttingConsKg = useMemo(() => {
    return reportEvents.reduce((s, r) => {
      if (r.type === "cutting") return s + (r.cuttingConsKg ?? 0);
      return s;
    }, 0);
  }, [reportEvents]);

  /* ---------------- render ---------------- */
  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold text-center mb-4">
            In-House Stock Report
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block font-semibold">
                Fabrication Name (Material)
              </label>
              <select
                value={fabricationFilter}
                onChange={(e) => setFabricationFilter(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- All Fabrications --</option>
                {fabricationOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
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

            <div className="flex items-end gap-2">
              <button
                onClick={buildReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {loading ? "Loading..." : "Generate Report"}
              </button>
              <button
                onClick={() => {
                  setFabricationFilter("");
                  setFromDate("");
                  setToDate("");
                }}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Modal / Report display */}
        {showModal && (
          <div className="fixed inset-0 flex items-start justify-center z-50 overflow-auto bg-black bg-opacity-40 p-6">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl p-6">
              <div ref={printRef}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold">
                    In-House Stock Statement
                  </h3>
                  <div className="text-sm">
                    Fabrication: <strong>{fabricationFilter || "All"}</strong> |
                    Period: <strong>{fromDate || "-"}</strong> to{" "}
                    <strong>{toDate || "-"}</strong>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table
                    className="w-full border-collapse"
                    style={{ border: "1px solid #000" }}
                  >
                    <thead>
                      <tr>
                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          S.NO
                        </th>
                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Date
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Purchase
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Cutting Lot No
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Fabrication Name
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Fabrication Weight (kg)
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Cutting Cons (KG) (FIFO)
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          KN+Y+D+F Rate
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Cutting Cons. Rate
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Purchase Rate
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Amount
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Balance ₹
                        </th>

                        <th style={{ border: "1px solid #000", padding: 6 }}>
                          Balance Kg
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {reportEvents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={13}
                            style={{ textAlign: "center", padding: 12 }}
                          >
                            No data found for selected filters.
                          </td>
                        </tr>
                      ) : (
                        reportEvents.map((r, idx) => {
                          const c = rowToCells(r, idx);
                          return (
                            <tr key={idx}>
                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "center",
                                }}
                              >
                                {c.sNo}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "center",
                                }}
                              >
                                {c.date}
                              </td>

                              <td
                                style={{ border: "1px solid #000", padding: 6 }}
                              >
                                {c.purchase}
                              </td>

                              <td
                                style={{ border: "1px solid #000", padding: 6 }}
                              >
                                {c.cuttingLot}
                              </td>

                              <td
                                style={{ border: "1px solid #000", padding: 6 }}
                              >
                                {c.fabricationName}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {c.fabricationWeightKg === "-"
                                  ? "-"
                                  : fmt3(Number(c.fabricationWeightKg))}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {c.cuttingConsKg === "-"
                                  ? "-"
                                  : fmt3(Number(c.cuttingConsKg))}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {c.kydfRate === "-"
                                  ? "-"
                                  : fmt2(Number(c.kydfRate))}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {c.cuttingConsRate === "-"
                                  ? "-"
                                  : fmt2(Number(c.cuttingConsRate))}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {c.purchaseRate === "-"
                                  ? "-"
                                  : fmt2(Number(c.purchaseRate))}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {fmtINR(Number(c.amount))}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {fmtINR(Number(c.balanceAmt))}
                              </td>

                              <td
                                style={{
                                  border: "1px solid #000",
                                  padding: 6,
                                  textAlign: "right",
                                }}
                              >
                                {fmt3(Number(c.balanceKg))}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {reportEvents.length > 0 && (
                      <tfoot>
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            Totals:
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {fmt3(totalFabricationWeightOnly)}
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {fmt3(totalCuttingConsKg)}
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {/* placeholder for KN+Y+D+F total — we keep amount total next */}
                            -
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {/* placeholder for cutting rate total */}-
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {/* placeholder for  Prate total */}-
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {fmtINR(
                              reportEvents.reduce(
                                (s, r) =>
                                  s +
                                  (r.type === "inward"
                                    ? r.inwardAmount ?? 0
                                    : r.type === "purchase"
                                    ? r.purchaseAmount ?? 0
                                    : r.cuttingAmount ?? 0),
                                0
                              )
                            )}
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {fmtINR(
                              reportEvents[reportEvents.length - 1]
                                ?.balanceAmt ?? 0
                            )}
                          </td>

                          <td
                            style={{
                              border: "1px solid #000",
                              padding: 8,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {fmt3(
                              reportEvents[reportEvents.length - 1]
                                ?.balanceKg ?? 0
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
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

export default FinishingInHouseStock;
