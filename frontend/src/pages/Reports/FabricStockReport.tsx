import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

interface InwardRow {
  lotNo?: string;
  itemName?: string;
  fabricName?: string;
  fabric?: string;
  shade?: string;
  rolls?: string | number;
  weight?: string | number;
  receivedWeight?: string | number;
  wastage?: string | number;
  extraWt?: string | number;
  rate?: string | number;
  amount?: string | number;
}

interface Fabrication {
  id?: number | string;
  serialNo?: string;
  fabricName?: string;
}

interface InwardDocument {
  id?: number | string;
  dated?: string;
  date?: string;
  partyName?: string;
  challanNo?: string;
  rows?: InwardRow[];
}

interface FabricStockRow {
  fabricName: string;
  shade: string;
  rolls: number;
  inwardWeight: number;
  receivedWeight: number;
  consumption: number;
  kho: number;
  remainingStock: number;
  wastage: number;
  extraWeight: number;
  amount: number;
  lastDate: string;
  entries: number;
}

const toNum = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const inputDate = (value?: string) => {
  if (!value) return "";
  const direct = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmt = (value: number) =>
  value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

// Finishing Inward often stores names without the Fabrication Creation prefix, e.g.
// "30'S SPUN CLOTH" while Fabrication Creation stores "SC / 30'S SPUN CLOTH".
const normalizeFabricName = (value: unknown): string =>
  String(value ?? "").trim().replace(/^[A-Za-z0-9_-]+\s*\/\s*/, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();

const FabricStockReport: React.FC = () => {
  const [documents, setDocuments] = useState<InwardDocument[]>([]);
  const [cuttings, setCuttings] = useState<any[]>([]);
  const [fabrications, setFabrications] = useState<Fabrication[]>([]);
  const [asOn, setAsOn] = useState(today());
  const [fabricSearch, setFabricSearch] = useState("");
  const [shadeSearch, setShadeSearch] = useState("");
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedShades, setSelectedShades] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showingResults, setShowingResults] = useState(false);

  const loadFabrications = async () => {
    try {
      const response = await api.get("/fabrication");
      const data = Array.isArray(response.data) ? response.data : [];
      setFabrications(data.filter((item: Fabrication) => String(item.fabricName || "").trim()));
    } catch (error) {
      console.error("Fabrication list load error:", error);
      Swal.fire("Error", "Could not load Fabric Name list from Fabrication Creation.", "error");
    }
  };

  // Report data is deliberately NOT loaded on page entry. It loads only after Show is clicked.
  const loadInwards = async () => {
    try {
      setLoading(true);
      const [response, cuttingResponse] = await Promise.all([
        api.get("/finishing-inwards"), api.get("/cutting-entries")
      ]);
      setDocuments(Array.isArray(response.data) ? response.data : []);
      setCuttings(Array.isArray(cuttingResponse.data) ? cuttingResponse.data : []);
      setShowingResults(true);
    } catch (error) {
      console.error("Fabric stock load error:", error);
      Swal.fire("Error", "Could not load saved Finishing Inward data. Please check the API.", "error");
      setShowingResults(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFabrications();
  }, []);

  const normalizedDocs = useMemo(
    () =>
      documents.filter((doc) => {
        const date = inputDate(doc.dated || doc.date);
        return !asOn || (date !== "" && date <= asOn);
      }),
    [documents, asOn]
  );

  // Fabric names come from Fabrication Creation, not from Finishing Inward.
  const availableFabrics = useMemo(() => {
    const unique = new Map<string, string>();
    fabrications.forEach((item) => {
      const name = String(item.fabricName || "").trim();
      if (name && !unique.has(name.toLocaleLowerCase())) unique.set(name.toLocaleLowerCase(), name);
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [fabrications]);

  const availableShades = useMemo(() => {
    const names = new Set<string>();
    normalizedDocs.forEach((doc) =>
      (Array.isArray(doc.rows) ? doc.rows : []).forEach((row) => {
        const fabric = String(row.itemName || row.fabricName || row.fabric || "").trim();
        const shade = String(row.shade || "").trim();
        const normalizedInwardFabric = normalizeFabricName(fabric);
        const knownFabric = availableFabrics.some((name) => normalizeFabricName(name) === normalizedInwardFabric);
        const canonicalFabric = availableFabrics.find((name) => normalizeFabricName(name) === normalizedInwardFabric) || "";
        const selectedFabric = selectedFabrics.length === 0 || selectedFabrics.some((name) => normalizeFabricName(name) === normalizeFabricName(canonicalFabric));
        if (knownFabric && shade && selectedFabric) names.add(shade);
      })
    );
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [normalizedDocs, selectedFabrics, availableFabrics]);

  const filteredFabrics = useMemo(
    () => availableFabrics.filter((name) => name.toLowerCase().includes(fabricSearch.trim().toLowerCase())),
    [availableFabrics, fabricSearch]
  );

  const filteredShades = useMemo(
    () => availableShades.filter((name) => name.toLowerCase().includes(shadeSearch.trim().toLowerCase())),
    [availableShades, shadeSearch]
  );

  const stockRows = useMemo<FabricStockRow[]>(() => {
    const map = new Map<string, FabricStockRow>();
    normalizedDocs.forEach((doc) => {
      const docDate = inputDate(doc.dated || doc.date);
      (Array.isArray(doc.rows) ? doc.rows : []).forEach((row) => {
        const inwardFabricName = String(row.itemName || row.fabricName || row.fabric || "").trim();
        const fabricName = availableFabrics.find((name) => normalizeFabricName(name) === normalizeFabricName(inwardFabricName)) || "";
        const shade = String(row.shade || "").trim();
        // Only show fabrics defined in Fabrication Creation; inward provides the stock values.
        if (!fabricName) return;
        if (selectedFabrics.length && !selectedFabrics.some((name) => normalizeFabricName(name) === normalizeFabricName(fabricName))) return;
        if (selectedShades.length && !selectedShades.includes(shade)) return;

        // Lot number is intentionally not part of the stock key.
        // Stock is grouped only by Fabric Name + Shade, as requested.
        const key = `${fabricName.toLocaleLowerCase()}|||${shade.toLocaleLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, {
            fabricName,
            shade,
            rolls: 0,
            inwardWeight: 0,
            receivedWeight: 0,
            consumption: 0,
            kho: 0,
            remainingStock: 0,
            wastage: 0,
            extraWeight: 0,
            amount: 0,
            lastDate: "",
            entries: 0,
          });
        }
        const current = map.get(key)!;
        current.rolls += toNum(row.rolls);
        current.inwardWeight += toNum(row.weight);
        current.receivedWeight += row.receivedWeight !== undefined && row.receivedWeight !== null && String(row.receivedWeight).trim() !== ""
          ? toNum(row.receivedWeight)
          : toNum(row.weight);
        current.wastage += toNum(row.wastage);
        current.extraWeight += toNum(row.extraWt);
        current.amount += toNum(row.amount);
        current.entries += 1;
        if (docDate && (!current.lastDate || docDate > current.lastDate)) current.lastDate = docDate;
      });
    });
    cuttings.filter((entry) => !asOn || inputDate(entry.date) <= asOn).forEach((entry) => {
      (entry.stockRows || []).forEach((row: any) => {
        const fabricName = availableFabrics.find((name) => normalizeFabricName(name) === normalizeFabricName(row.itemName));
        if (!fabricName) return;
        const key = `${fabricName.toLocaleLowerCase()}|||${String(row.shade || "").trim().toLocaleLowerCase()}`;
        const current = map.get(key);
        if (current) {
          current.consumption += toNum(row.consumption);
          current.kho += toNum(row.kho);
        }
      });
    });
    map.forEach((row) => { row.remainingStock = row.receivedWeight - row.consumption - row.kho; });
    return Array.from(map.values()).sort((a, b) =>
      a.fabricName.localeCompare(b.fabricName, undefined, { sensitivity: "base" }) ||
      a.shade.localeCompare(b.shade, undefined, { sensitivity: "base" })
    );
  }, [normalizedDocs, availableFabrics, selectedFabrics, selectedShades, cuttings, asOn]);

  const totals = useMemo(
    () =>
      stockRows.reduce(
        (acc, row) => ({
          rolls: acc.rolls + row.rolls,
          inwardWeight: acc.inwardWeight + row.inwardWeight,
          receivedWeight: acc.receivedWeight + row.receivedWeight,
          consumption: acc.consumption + row.consumption,
          kho: acc.kho + row.kho,
          remainingStock: acc.remainingStock + row.remainingStock,
          wastage: acc.wastage + row.wastage,
          extraWeight: acc.extraWeight + row.extraWeight,
          amount: acc.amount + row.amount,
          entries: acc.entries + row.entries,
        }),
        { rolls: 0, inwardWeight: 0, receivedWeight: 0, consumption: 0, kho: 0, remainingStock: 0, wastage: 0, extraWeight: 0, amount: 0, entries: 0 }
      ),
    [stockRows]
  );

  const toggleSelection = (value: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    setSelected((prev) => prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]);
  };

  const toggleAll = (values: string[], selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    const allSelected = values.length > 0 && values.every((value) => selected.includes(value));
    setSelected((prev) => allSelected ? prev.filter((value) => !values.includes(value)) : Array.from(new Set([...prev, ...values])));
  };

  const resetFilters = () => {
    setAsOn(today());
    setFabricSearch("");
    setShadeSearch("");
    setSelectedFabrics([]);
    setSelectedShades([]);
    setDocuments([]);
    setShowingResults(false);
  };

  const exportCsv = () => {
    if (!stockRows.length) {
      Swal.fire("No Data", "There is no fabric stock data to export.", "info");
      return;
    }
    const rows = [
      ["S.No.", "Fabric Name", "Shade", "Inward Weight", "Received Weight (Stock)", "Consumption", "KHO", "Remaining Stock", "Wastage", "Extra Weight", "Amount", "Entries"],
      ...stockRows.map((row, index) => [
        index + 1, row.fabricName, row.shade, row.inwardWeight, row.receivedWeight, row.consumption, row.kho, row.remainingStock,
        row.wastage, row.extraWeight, row.amount, row.entries,
      ]),
      ["", "TOTAL", "", totals.inwardWeight, totals.receivedWeight, totals.consumption, totals.kho, totals.remainingStock, totals.wastage, totals.extraWeight, totals.amount, totals.entries],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Fabric-Stock-${asOn || today()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!stockRows.length) {
      Swal.fire("No Data", "There is no fabric stock data to print.", "info");
      return;
    }
    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
      Swal.fire("Popup Blocked", "Please allow popups to print the report.", "warning");
      return;
    }
    const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char] || char));
    const bodyRows = stockRows.map((row, index) => `
      <tr><td>${index + 1}</td><td>${esc(row.fabricName)}</td><td>${esc(row.shade || "-")}</td>
      <td class="num">${fmt(row.inwardWeight)}</td>
      <td class="num">${fmt(row.receivedWeight)}</td><td class="num">${fmt(row.consumption)}</td><td class="num">${fmt(row.kho)}</td><td class="num">${fmt(row.remainingStock)}</td><td class="num">${fmt(row.wastage)}</td>
      <td class="num">${fmt(row.extraWeight)}</td><td class="num">${fmt(row.amount)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><title>Fabric Stock Report</title>
      <style>body{font-family:Arial,sans-serif;margin:18px;color:#111}h2{text-align:center;margin:0 0 6px}
      p{text-align:center;margin:0 0 16px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #555;padding:6px}th{background:#eee}.num{text-align:right}tfoot{font-weight:bold;background:#eee}
      @page{size:landscape;margin:10mm}</style></head><body><h2>Fabric Stock Report</h2>
      <p>Stock as on: ${esc(asOn || "All Dates")} | Grouped by Fabric Name + Shade (Lot No. and Size are not used)</p>
      <table><thead><tr><th>S.No.</th><th>Fabric Name</th><th>Shade</th><th>Inward Weight</th>
      <th>Received Weight (Stock)</th><th>Consumption</th><th>KHO</th><th>Remaining Stock</th><th>Wastage</th><th>Extra Weight</th><th>Amount</th></tr></thead>
      <tbody>${bodyRows}</tbody><tfoot><tr><td></td><td>TOTAL</td><td></td><td class="num">${fmt(totals.inwardWeight)}</td><td class="num">${fmt(totals.receivedWeight)}</td><td class="num">${fmt(totals.consumption)}</td><td class="num">${fmt(totals.kho)}</td><td class="num">${fmt(totals.remainingStock)}</td>
      <td class="num">${fmt(totals.wastage)}</td><td class="num">${fmt(totals.extraWeight)}</td>
      <td class="num">${fmt(totals.amount)}</td></tr></tfoot></table>
      <script>window.onload=function(){window.print();};</script></body></html>`);
    popup.document.close();
  };

  return (
    <Dashboard>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="rounded bg-green-600 px-4 py-3 text-center text-white">
              <h1 className="text-xl font-bold">Fabric Stock Report</h1>
              <p className="mt-1 text-sm">Fabric names from Fabrication Creation; stock quantities from saved Finishing Inward entries</p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">Stock As On</label>
                <input type="date" value={asOn} onChange={(e) => setAsOn(e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Search Fabric</label>
                <input value={fabricSearch} onChange={(e) => setFabricSearch(e.target.value)} placeholder="Search fabric name..." className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Search Shade</label>
                <input value={shadeSearch} onChange={(e) => setShadeSearch(e.target.value)} placeholder="Search shade..." className="w-full rounded border px-3 py-2" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded border">
                <div className="flex items-center justify-between border-b bg-gray-100 px-3 py-2 text-sm font-semibold">
                  <span>Fabric Name (Fabrication Creation)</span>
                  <label className="flex items-center gap-2 text-xs font-normal">
                    <input type="checkbox" checked={filteredFabrics.length > 0 && filteredFabrics.every((name) => selectedFabrics.includes(name))} onChange={() => toggleAll(filteredFabrics, selectedFabrics, setSelectedFabrics)} />
                    Select All
                  </label>
                </div>
                <div className="max-h-44 overflow-auto p-3">
                  {filteredFabrics.map((name) => (
                    <label key={name} className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedFabrics.includes(name)} onChange={() => toggleSelection(name, selectedFabrics, setSelectedFabrics)} />
                      <span>{name}</span>
                    </label>
                  ))}
                  {!filteredFabrics.length && <p className="text-sm text-gray-500">No fabric found.</p>}
                </div>
              </div>

              <div className="rounded border">
                <div className="flex items-center justify-between border-b bg-gray-100 px-3 py-2 text-sm font-semibold">
                  <span>Shade</span>
                  <label className="flex items-center gap-2 text-xs font-normal">
                    <input type="checkbox" checked={filteredShades.length > 0 && filteredShades.every((name) => selectedShades.includes(name))} onChange={() => toggleAll(filteredShades, selectedShades, setSelectedShades)} />
                    Select All
                  </label>
                </div>
                <div className="max-h-44 overflow-auto p-3">
                  {filteredShades.map((name) => (
                    <label key={name} className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedShades.includes(name)} onChange={() => toggleSelection(name, selectedShades, setSelectedShades)} />
                      <span>{name}</span>
                    </label>
                  ))}
                  {!filteredShades.length && <p className="text-sm text-gray-500">No shade found.</p>}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button onClick={loadInwards} disabled={loading} className="rounded bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-60">
                {loading ? "Loading..." : "Show Report"}
              </button>
              <button onClick={resetFilters} className="rounded bg-gray-600 px-5 py-2 font-semibold text-white">Reset Filters</button>
            </div>
          </div>

          {showingResults && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 md:p-6">
            <div className="flex max-h-[94vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-lg bg-white p-4 shadow-2xl">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Fabric Stock</h2>
                  <p className="text-xs text-gray-600">Grouped by Fabric Name + Shade. Fabric Lot No. and Size are intentionally ignored.</p>
                </div>
                <div className="text-sm text-gray-600">As On: <strong>{asOn || "All Dates"}</strong></div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded border bg-slate-50 p-3"><p className="text-xs text-gray-600">Fabric + Shade</p><p className="text-xl font-bold">{stockRows.length}</p></div>
                <div className="rounded border bg-slate-50 p-3"><p className="text-xs text-gray-600">Total Rolls</p><p className="text-xl font-bold">{fmt(totals.rolls)}</p></div>
                <div className="rounded border bg-slate-50 p-3"><p className="text-xs text-gray-600">Inward Weight</p><p className="text-xl font-bold">{fmt(totals.inwardWeight)}</p></div>
                <div className="rounded border bg-slate-50 p-3"><p className="text-xs text-gray-600">Received Weight / Stock</p><p className="text-xl font-bold">{fmt(totals.receivedWeight)}</p></div>
                <div className="rounded border bg-slate-50 p-3"><p className="text-xs text-gray-600">Total Amount</p><p className="text-xl font-bold">{fmt(totals.amount)}</p></div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded border">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      {["S.No.", "Fabric Name", "Shade", "Inward Weight", "Received Weight (Stock)", "Consumption", "KHO", "Remaining Stock", "Wastage", "Extra Weight", "Amount"].map((heading) => (
                        <th key={heading} className="whitespace-nowrap border px-3 py-2 text-center font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.map((row, index) => (
                      <tr key={`${row.fabricName}-${row.shade}`} className={index % 2 ? "bg-slate-50" : "bg-white"}>
                        <td className="border px-3 py-2 text-center">{index + 1}</td>
                        <td className="border px-3 py-2">{row.fabricName}</td>
                        <td className="border px-3 py-2">{row.shade || "-"}</td>
                        <td className="border px-3 py-2 text-right">{fmt(row.inwardWeight)}</td>
                        <td className="border px-3 py-2 text-right font-semibold">{fmt(row.receivedWeight)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(row.consumption)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(row.kho)}</td>
                        <td className="border px-3 py-2 text-right font-bold">{fmt(row.remainingStock)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(row.wastage)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(row.extraWeight)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(row.amount)}</td>
                      </tr>
                    ))}
                    {!stockRows.length && (
                      <tr><td colSpan={11} className="border px-3 py-8 text-center text-gray-500">No Fabric Inward stock found for the selected filters/date.</td></tr>
                    )}
                    {stockRows.length > 0 && (
                      <tr className="bg-green-100 font-bold">
                        <td className="border px-3 py-2" />
                        <td className="border px-3 py-2">TOTAL</td>
                        <td className="border px-3 py-2" />
                        <td className="border px-3 py-2 text-right">{fmt(totals.inwardWeight)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(totals.receivedWeight)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(totals.consumption)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(totals.kho)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(totals.remainingStock)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(totals.wastage)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(totals.extraWeight)}</td>
                        <td className="border px-3 py-2 text-right">{fmt(totals.amount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportCsv} disabled={!stockRows.length} className="rounded bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Export CSV</button>
                  <button onClick={printReport} disabled={!stockRows.length} className="rounded bg-zinc-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Print</button>
                </div>
                <button onClick={() => setShowingResults(false)} className="rounded bg-gray-500 px-4 py-2 font-semibold text-white">Close Report</button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default FabricStockReport;
