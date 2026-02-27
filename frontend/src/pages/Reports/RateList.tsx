import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";

/**
 * RateList.tsx
 *
 * - Removed spare/preview column
 * - Export PDF uses jsPDF + jspdf-autotable (loaded at runtime) to produce a proper table PDF
 * - Uses Array.from(rateMap.entries()) to avoid TS iterator compile issues
 */

type RateRow = {
  artNo: string;
  sizeName: string; // e.g. "S", "M" or "ALL"
  rate: number;
  pcs?: number;
};

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    // avoid re-adding the same script
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

const RateList: React.FC = () => {
  const [asOn, setAsOn] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [arts, setArts] = useState<string[]>([]); // unique artNo list
  const [sizes, setSizes] = useState<string[]>([]); // unique size list
  const [selectedArts, setSelectedArts] = useState<Record<string, boolean>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // output modal
  const [showOutput, setShowOutput] = useState(false);
  const [rateRows, setRateRows] = useState<RateRow[]>([]);

  // load packing-challans and build master art/size lists (we only scan for artNo & sizes & rates)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<any[]>("/packing-challans");
        const docs = Array.isArray(data) ? data : [];

        // Build sets
        const artSet = new Set<string>();
        const sizeSet = new Set<string>();
        // rateMap: key = `${artNo}|${sizeName}` -> { rate, pcs }
        const rateMap: Map<string, { rate: number; pcs: number }> = new Map();

        for (const ch of docs) {
          const rows = Array.isArray(ch.rows) ? ch.rows : [];
          for (const r of rows) {
            const artNo = String(r.artNo || "").trim();
            if (!artNo) continue;
            artSet.add(artNo);

            const details = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
            if (details.length === 0) {
              // fallback: if there's single-size fields
              const sname = String(r.sizeName || r.size || "ALL").trim() || "ALL";
              sizeSet.add(sname);
              const rate = Number(r.rate ?? 0) || 0;
              const pcs = Number(r.pcs ?? 0) || 0;
              const key = `${artNo}|${sname}`;
              rateMap.set(key, { rate, pcs });
            } else {
              for (const sd of details) {
                const sname = String(sd.sizeName || sd.size || "ALL").trim() || "ALL";
                sizeSet.add(sname);
                const rate = Number(sd.rate ?? 0) || 0;
                const pcs = Number(sd.pcs ?? sd.boxCount ?? 0) || 0;
                const key = `${artNo}|${sname}`;
                rateMap.set(key, { rate, pcs });
              }
            }
          }
        }

        const artArr = Array.from(artSet).sort((a, b) => a.localeCompare(b));
        const sizeArr = Array.from(sizeSet).sort((a, b) => a.localeCompare(b));

        setArts(artArr);
        setSizes(sizeArr);

        // defaults: select all
        const aSel: Record<string, boolean> = {};
        artArr.forEach((a) => (aSel[a] = true));
        setSelectedArts(aSel);

        const sSel: Record<string, boolean> = {};
        sizeArr.forEach((s) => (sSel[s] = true));
        setSelectedSizes(sSel);

        // prepare initial rateRows (unfiltered)
        const rowsOut: RateRow[] = [];

        // use Array.from to avoid TS iterator compile issues
        for (const [key, v] of Array.from(rateMap.entries())) {
          const parts = String(key).split("|");
          const art = parts[0] ?? "";
          const size = parts.length > 1 ? parts.slice(1).join("|") : "";

          rowsOut.push({
            artNo: art,
            sizeName: size,
            rate: Number(v.rate || 0),
            pcs: Number(v.pcs || 0),
          });
        }

        rowsOut.sort((x, y) => {
          const a = x.artNo.localeCompare(y.artNo);
          return a !== 0 ? a : x.sizeName.localeCompare(y.sizeName);
        });

        setRateRows(rowsOut);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load rate data from packing-challans", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // helpers
  const toggleArt = (art: string) => setSelectedArts((s) => ({ ...s, [art]: !s[art] }));
  const toggleSize = (size: string) => setSelectedSizes((s) => ({ ...s, [size]: !s[size] }));

  const selectAllArts = (val: boolean) =>
    setSelectedArts(() => {
      const m: Record<string, boolean> = {};
      arts.forEach((a) => (m[a] = val));
      return m;
    });
  const selectAllSizes = (val: boolean) =>
    setSelectedSizes(() => {
      const m: Record<string, boolean> = {};
      sizes.forEach((s) => (m[s] = val));
      return m;
    });

  // filtered rows based on selection
  const filteredRows = useMemo(() => {
    const chosenArts = new Set(Object.keys(selectedArts).filter((k) => selectedArts[k]));
    const chosenSizes = new Set(Object.keys(selectedSizes).filter((k) => selectedSizes[k]));
    return rateRows.filter((r) => chosenArts.has(r.artNo) && chosenSizes.has(r.sizeName));
  }, [rateRows, selectedArts, selectedSizes]);

  // Show handler
  const handleShow = () => {
    if (Object.values(selectedArts).every((v) => !v)) {
      return Swal.fire("Validation", "Select at least one Art No.", "warning");
    }
    if (Object.values(selectedSizes).every((v) => !v)) {
      return Swal.fire("Validation", "Select at least one Size.", "warning");
    }
    setShowOutput(true);
  };

  const handleCancel = () => {
    // reset selects to all selected
    selectAllArts(true);
    selectAllSizes(true);
  };

  // helper to escape HTML for print window
  const escapeHtml = (s: string) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  // Print (open print preview) — unchanged
  const handlePrint = () => {
    const w = window.open("", "_blank")!;
    const rows = filteredRows;
    const html = `
      <html>
      <head>
        <title>Rate List - ${asOn}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 12px; }
          h2 { text-align: center; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #333; padding: 6px; text-align: left; font-size: 13px; }
          thead th { background: #f3f3f3; font-weight: 700; }
          .meta { text-align: right; font-size: 12px; margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <h2>Rate List</h2>
        <div class="meta">As On: ${asOn} &nbsp; | &nbsp; Rows: ${rows.length}</div>
        <table>
          <thead>
            <tr><th>Art No</th><th>Size</th><th style="text-align:right">Rate</th></tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
                  <td>${escapeHtml(r.artNo)}</td>
                  <td>${escapeHtml(r.sizeName)}</td>
                  <td style="text-align:right">${Number(r.rate || 0).toFixed(2)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  // Export PDF: use jsPDF + autotable for proper table layout
  const handleExportPdf = async () => {
    try {
      // load jsPDF and plugin if not present
      if (!(window as any).jspdf) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      }
      // load autotable plugin
      if (!(window as any).jspdfAutoTable && !(window as any).jspdf?.autoTable) {
        // jspdf-autotable UMD builds usually attach to window.jspdf and register autoTable
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js");
      }

      // try to find the constructor
      const jspdfAny = (window as any).jspdf || (window as any).jsPDF;
      const JS = jspdfAny && (jspdfAny.jsPDF || jspdfAny.default?.jsPDF || jspdfAny.default || jspdfAny);
      if (!JS) {
        // fallback to global jsPDF
        throw new Error("jsPDF not available after load");
      }

      const doc = new JS({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      // Title
      doc.setFontSize(14);
      doc.text("Rate List", 40, 40);
      doc.setFontSize(10);
      doc.text(`As On: ${asOn}`, 40, 58);

      // Build table head and body
      const head = [["Art No", "Size", "Rate"]];
      const body = filteredRows.map((r) => [r.artNo, r.sizeName, Number(r.rate || 0).toFixed(2)]);

      // Use autoTable — options tuned for readable layout
      // @ts-ignore - runtime plugin adds autoTable
      doc.autoTable({
        head,
        body,
        startY: 80,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [243, 243, 243], textColor: 20, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 220 }, // Art No
          1: { cellWidth: 120 }, // Size
          2: { cellWidth: 80, halign: "right" }, // Rate
        },
        theme: "grid",
        showHead: "everyPage",
        margin: { left: 40, right: 40, top: 40, bottom: 40 },
      });

      const fileName = `RateList_${asOn || new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", "Failed to generate PDF: " + (e?.message || ""), "error");
    }
  };

  // Back: close output modal or go back
  const handleBack = () => {
    if (showOutput) setShowOutput(false);
    else window.history.back();
  };

  return (
    <Dashboard>
      {/* Page container */}
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Rate List</h2>

          {/* top controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <label className="font-semibold">As On:</label>
              <input
                type="date"
                value={asOn}
                onChange={(e) => setAsOn(e.target.value)}
                className="border p-2 rounded"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  selectAllArts(true);
                  selectAllSizes(true);
                }}
                className="px-3 py-2 bg-gray-200 rounded"
              >
                Select All
              </button>
              <button
                onClick={() => {
                  selectAllArts(false);
                  selectAllSizes(false);
                }}
                className="px-3 py-2 bg-gray-200 rounded"
              >
                Unselect All
              </button>
            </div>
          </div>

          {/* selector grids (no spare/preview column) */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Art list */}
            <div className="border rounded p-3 h-64 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <strong>Select Art No</strong>
                <label className="text-sm">
                  <input
                    type="checkbox"
                    checked={arts.length > 0 && Object.values(selectedArts).every(Boolean)}
                    onChange={(e) => selectAllArts(e.target.checked)}
                    className="mr-1"
                  />
                  All
                </label>
              </div>
              {loading && arts.length === 0 ? (
                <div className="text-sm text-gray-500">Loading art list…</div>
              ) : arts.length === 0 ? (
                <div className="text-sm text-gray-500">No art numbers found</div>
              ) : (
                <ul className="text-sm">
                  {arts.map((a) => (
                    <li key={a} className="mb-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!selectedArts[a]} onChange={() => toggleArt(a)} />
                        <span>{a}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Size list */}
            <div className="border rounded p-3 h-64 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <strong>Select Size</strong>
                <label className="text-sm">
                  <input
                    type="checkbox"
                    checked={sizes.length > 0 && Object.values(selectedSizes).every(Boolean)}
                    onChange={(e) => selectAllSizes(e.target.checked)}
                    className="mr-1"
                  />
                  All
                </label>
              </div>

              {loading && sizes.length === 0 ? (
                <div className="text-sm text-gray-500">Loading sizes…</div>
              ) : sizes.length === 0 ? (
                <div className="text-sm text-gray-500">No sizes found</div>
              ) : (
                <ul className="text-sm">
                  {sizes.map((s) => (
                    <li key={s} className="mb-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!selectedSizes[s]} onChange={() => toggleSize(s)} />
                        <span>{s}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* action buttons */}
          <div className="flex justify-center gap-4">
            <button onClick={handleShow} className="px-6 py-2 bg-blue-600 text-white rounded shadow">Show</button>
            <button onClick={handleCancel} className="px-6 py-2 bg-gray-500 text-white rounded shadow">Cancel</button>
            <button onClick={() => window.history.back()} className="px-6 py-2 bg-gray-300 rounded">Back</button>
          </div>
        </div>
      </div>

      {/* OUTPUT modal — table with Export/Print/Back */}
      {showOutput && (
        <div className="fixed inset-0 bg-black/50 z-[1600] flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-6 max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Rate List</h3>
              <div className="text-sm text-gray-600">As On: {asOn}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">S. No.</th>
                    <th className="border p-2 text-left">Art No</th>
                    <th className="border p-2 text-left">Size</th>
                    <th className="border p-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td className="border p-3 text-center text-gray-500" colSpan={4}>No records for selected Art/Size</td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => (
                      <tr key={`${r.artNo}-${r.sizeName}-${i}`}>
                        <td className="border p-2">{i + 1}</td>
                        <td className="border p-2">{r.artNo}</td>
                        <td className="border p-2">{r.sizeName}</td>
                        <td className="border p-2 text-right">{Number(r.rate || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 gap-2">
              <div className="flex gap-2">
                <button onClick={handleExportPdf} className="px-4 py-2 bg-blue-600 text-white rounded">Export PDF</button>
                <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded">Print</button>
                <button onClick={handleBack} className="px-4 py-2 bg-gray-500 text-white rounded">Back</button>
              </div>

              <div className="text-sm text-gray-600">Rows: <strong>{filteredRows.length}</strong></div>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default RateList;
