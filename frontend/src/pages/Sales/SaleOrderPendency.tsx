"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Destination = { id: number; name: string }; // Station
type Party = { id: number; partyName: string; station?: string | null };
type Art = { id: number; artNo: string; artName: string };

type SORow = {
  id: number;
  destinationId: number;
  partyId: number;
  artId: number;
  size: string;

  partyName: string;
  artNo: string;
  artName: string;

  opening: number;
  receipt: number;
  dispatch: number;
  pending: number;
};

const fmt = (n: number, d = 0) => (isFinite(n) ? Number(n).toFixed(d) : "0");
const norm = (s: any) => String(s ?? "").trim().toUpperCase();

// YYYY‑MM‑DD string compare
const inRange = (dStr: string, from: string, to: string) => {
  const d = String(dStr || "").slice(0, 10);
  if (!d) return false;
  return d >= from && d <= to;
};

const SaleOrderPendencyArtSizeWise: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Masters
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [arts, setArts] = useState<Art[]>([]);
  const [allSizes, setAllSizes] = useState<string[]>([]);

  // Selections
  const [selDestIds, setSelDestIds] = useState<number[]>([]);
  const [selPartyIds, setSelPartyIds] = useState<number[]>([]);
  const [selArtIds, setSelArtIds] = useState<number[]>([]);
  const [selSizes, setSelSizes] = useState<string[]>([]);

  // Data
  const [rows, setRows] = useState<SORow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReportView, setShowReportView] = useState(false);

  const reportRef = useRef<HTMLDivElement | null>(null);

  // Load Masters
  useEffect(() => {
    (async () => {
      // Parties + Destinations
      try {
        const { data } = await api.get<any[]>("/party/all");
        const list = Array.isArray(data) ? data : [];
        const mappedParties: Party[] = list.map((p, i) => ({
          id: Number(p.id ?? i + 1),
          partyName: String(p.partyName ?? ""),
          station: p.station ?? null,
        }));
        setParties(mappedParties);

        const stationNames = mappedParties
          .map((p) => String(p.station || "").trim())
          .filter(Boolean);
        const uniqueStations = Array.from(new Set(stationNames));
        const mappedDest: Destination[] = uniqueStations.map((name, idx) => ({
          id: idx + 1,
          name,
        }));
        setDestinations(mappedDest);
      } catch (e) {
        console.error("Error loading parties:", e);
        setParties([]);
        setDestinations([]);
      }

      // Arts
      try {
        const { data } = await api.get<any[]>("/arts");
        const list = Array.isArray(data) ? data : [];
        const mappedArts: Art[] = list.map((a, i) => ({
          id: i + 1,
          artNo: String(a.artNo ?? ""),
          artName: String(a.artName ?? a.artNo ?? ""),
        }));
        setArts(mappedArts);
      } catch (e) {
        console.error("Error loading arts:", e);
        setArts([]);
      }

      // Sizes
      try {
        const { data } = await api.get<any[]>("/packing-challans/sizes");
        const list = Array.isArray(data) ? data : [];
        const names = list
          .map((x) => String(x.sizeName ?? x.name ?? "").trim())
          .filter(Boolean);
        const uniq = Array.from(new Set(names));
        setAllSizes(uniq.length ? uniq : ["S", "M", "L", "XL", "XXL"]);
      } catch (e) {
        console.error("Error loading sizes:", e);
        setAllSizes(["S", "M", "L", "XL", "XXL"]);
      }
    })();
  }, []);

  // Cascading options
  const availableParties = useMemo(() => {
    if (selDestIds.length === 0 || destinations.length === 0) return [];
    const selDestNames = new Set(
      destinations
        .filter((d) => selDestIds.includes(d.id))
        .map((d) => d.name.trim().toUpperCase())
    );
    return parties.filter((p) => {
      if (!p.station) return false;
      return selDestNames.has(String(p.station).trim().toUpperCase());
    });
  }, [selDestIds, destinations, parties]);

  const availableArts = useMemo(() => {
    if (selDestIds.length === 0 || selPartyIds.length === 0) return [];
    return arts;
  }, [selDestIds, selPartyIds, arts]);

  const availableSizes = useMemo(() => {
    if (
      selDestIds.length === 0 ||
      selPartyIds.length === 0 ||
      selArtIds.length === 0
    )
      return [];
    return allSizes;
  }, [selDestIds, selPartyIds, selArtIds, allSizes]);

  // prune selections
  useEffect(() => {
    setSelPartyIds((prev) =>
      prev.filter((id) => availableParties.some((p) => p.id === id))
    );
  }, [availableParties]);

  useEffect(() => {
    setSelArtIds((prev) =>
      prev.filter((id) => availableArts.some((a) => a.id === id))
    );
  }, [availableArts]);

  useEffect(() => {
    setSelSizes((prev) => prev.filter((s) => availableSizes.includes(s)));
  }, [availableSizes]);

  // toggle helpers
  const toggleAllDest = (checked: boolean) =>
    setSelDestIds(checked ? destinations.map((d) => d.id) : []);
  const toggleAllParty = (checked: boolean) =>
    setSelPartyIds(checked ? availableParties.map((p) => p.id) : []);
  const toggleAllArt = (checked: boolean) =>
    setSelArtIds(checked ? availableArts.map((a) => a.id) : []);
  const toggleAllSize = (checked: boolean) =>
    setSelSizes(checked ? availableSizes.slice() : []);

  const toggleDest = (id: number) =>
    setSelDestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleParty = (id: number) =>
    setSelPartyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleArt = (id: number) =>
    setSelArtIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleSize = (s: string) =>
    setSelSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const allDestSelected =
    destinations.length > 0 && selDestIds.length === destinations.length;
  const allPartySelected =
    availableParties.length > 0 &&
    selPartyIds.length === availableParties.length;
  const allArtSelected =
    availableArts.length > 0 && selArtIds.length === availableArts.length;
  const allSizeSelected =
    availableSizes.length > 0 && selSizes.length === availableSizes.length;

  // ===== Report =====
  const showReport = async () => {
    if (selDestIds.length === 0)
      return Swal.fire("Select at least one Destination", "", "warning");
    if (selPartyIds.length === 0)
      return Swal.fire("Select at least one Party", "", "warning");
    if (selArtIds.length === 0)
      return Swal.fire("Select at least one Art", "", "warning");
    if (selSizes.length === 0)
      return Swal.fire("Select at least one Size", "", "warning");

    try {
      setLoading(true);

      const destNames = destinations
        .filter((d) => selDestIds.includes(d.id))
        .map((d) => d.name)
        .join(",");

      const partyIdsStr = selPartyIds.join(",");
      const artNos = arts
        .filter((a) => selArtIds.includes(a.id))
        .map((a) => a.artNo)
        .join(",");
      const sizesStr = selSizes.join(",");

      // 1) Base pendency from backend (Opening + Receipt)
      const { data } = await api.get<any[]>("/sale-orders/pendency", {
        params: {
          fromDate,
          toDate,
          destinations: destNames,
          partyIds: partyIdsStr,
          artNos,
          sizes: sizesStr,
        },
      });

      const list = Array.isArray(data) ? data : [];

      let baseRows: SORow[] = list.map((r: any, i: number) => {
        const destId =
          destinations.find(
            (d) =>
              d.name.trim().toUpperCase() ===
              String(r.destination || "")
                .trim()
                .toUpperCase()
          )?.id ?? 0;

        const party =
          parties.find((p) => Number(p.id) === Number(r.partyId)) || {
            id: 0,
            partyName: r.partyName || "",
          };

        const art =
          arts.find(
            (a) =>
              a.artNo.trim().toLowerCase() ===
                String(r.artNo || "").trim().toLowerCase() ||
              a.artName.trim().toLowerCase() ===
                String(r.artName || "").trim().toLowerCase()
          ) || {
            id: 0,
            artNo: r.artNo || "",
            artName: r.artName || r.artNo || "",
          };

        const opening = Number(r.opening || 0);
        const receipt = Number(r.receipt || 0);

        return {
          id: i + 1,
          destinationId: destId,
          partyId: Number(party.id),
          artId: Number(art.id),
          size: String(r.size || ""),
          partyName: String(party.partyName || r.partyName || ""),
          artNo: String(art.artNo || r.artNo || ""),
          artName: String(art.artName || r.artName || ""),
          opening,
          receipt,
          dispatch: 0,
          pending: opening + receipt,
        };
      });

      // 2) Dispatch Challan – dispatch calc
      const dispatchMap = new Map<string, number>();
      try {
        const { data: dcData } = await api.get<any[]>("/dispatch-challan");
        const challans = Array.isArray(dcData) ? dcData : [];

        challans.forEach((ch: any) => {
          const chDate = ch.date || ch.dated || "";
          if (!inRange(chDate, fromDate, toDate)) return;

          const pName = ch.partyName || "";
          if (!pName) return;

          const partyMatch = availableParties.some(
            (p) =>
              p.partyName.trim().toUpperCase() ===
              String(pName).trim().toUpperCase()
          );
          if (!partyMatch) return;

          const rowsDc = Array.isArray(ch.rows) ? ch.rows : [];
          rowsDc.forEach((r: any) => {
            const artNo = String(r.artNo || "").trim();
            const size = String(r.size || "").trim();
            if (!artNo || !size) return;

            const artMatch = arts
              .filter((a) => selArtIds.includes(a.id))
              .some(
                (a) => a.artNo.trim().toUpperCase() === artNo.toUpperCase()
              );
            if (!artMatch) return;

            if (
              !selSizes
                .map((s) => s.toUpperCase())
                .includes(size.toUpperCase())
            )
              return;

            const pcs =
              r.pcs != null
                ? Number(r.pcs)
                : Number(r.box || 0) * Number(r.pcsPerBox || 0);

            if (!pcs || isNaN(pcs)) return;

            const key = `${norm(pName)}|${norm(artNo)}|${norm(size)}`;
            const prev = dispatchMap.get(key) || 0;
            dispatchMap.set(key, prev + pcs);
          });
        });

        baseRows = baseRows.map((row) => {
          const key = `${norm(row.partyName)}|${norm(row.artNo)}|${norm(
            row.size
          )}`;
          const disp = dispatchMap.get(key) || 0;
          const pending = row.opening + row.receipt - disp;
          return {
            ...row,
            dispatch: disp,
            pending,
          };
        });
      } catch (e) {
        console.error("Dispatch-challan fetch error:", e);
      }

      // 3) Order Settle – settle qty ko minus karo
      try {
        const { data: osData } = await api.get<any[]>("/order-settles");
        const settles = Array.isArray(osData) ? osData : [];

        const settleMap = new Map<string, number>();

        settles.forEach((doc: any) => {
          const docDate = doc.dated || doc.date || "";
          if (!inRange(docDate, fromDate, toDate)) return;

          const pName = doc.partyName || "";
          if (!pName) return;

          const partyMatch = availableParties.some(
            (p) =>
              p.partyName.trim().toUpperCase() ===
              String(pName).trim().toUpperCase()
          );
          if (!partyMatch) return;

          const rowsOs = Array.isArray(doc.rows) ? doc.rows : [];
          rowsOs.forEach((r: any) => {
            const artNo = String(r.artNo || "").trim();
            if (!artNo) return;

            const artMatch = arts
              .filter((a) => selArtIds.includes(a.id))
              .some(
                (a) => a.artNo.trim().toUpperCase() === artNo.toUpperCase()
              );
            if (!artMatch) return;

            const dets = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
            dets.forEach((sd: any) => {
              const size = String(sd.sizeName || "").trim();
              if (!size) return;

              if (
                !selSizes
                  .map((s) => s.toUpperCase())
                  .includes(size.toUpperCase())
              )
                return;

              const qty = Number(sd.settleBox ?? sd.box ?? sd.qty ?? 0);
              if (!qty || isNaN(qty)) return;

              const key = `${norm(pName)}|${norm(artNo)}|${norm(size)}`;
              const prev = settleMap.get(key) || 0;
              settleMap.set(key, prev + qty);
            });
          });
        });

        baseRows = baseRows.map((row) => {
          const key = `${norm(row.partyName)}|${norm(row.artNo)}|${norm(
            row.size
          )}`;
          const settled = settleMap.get(key) || 0;
          const pending =
            row.opening + row.receipt - row.dispatch - settled;
          return {
            ...row,
            pending,
          };
        });
      } catch (e) {
        console.error("Order-settles fetch error (pendency report):", e);
      }

      setRows(baseRows);
      setShowReportView(true);
    } catch (e: any) {
      console.error("Report error:", e?.response?.data || e?.message);
      Swal.fire(
        "Info",
        "Report API not available. Showing empty report.",
        "info"
      );
      setRows([]);
      setShowReportView(true);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (
      selDestIds.length &&
      selPartyIds.length &&
      selArtIds.length &&
      selSizes.length
    )
      showReport();
    else
      Swal.fire(
        "Info",
        "Please select Destination, Party, Art and Size, then click Show",
        "info"
      );
  };

  const handleBack = () => setShowReportView(false);
  const handleExit = () => window.history.back();

  // Print
  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return window.print();

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return window.print();

    const title = `Sale-Order-Pendency-ArtSize_${fromDate}_to_${toDate}`;
    const styles = `
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; }

      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #D1D5DB; padding: 7px 9px; }
      thead th { background: #F3F4F6; }
      tbody tr:nth-child(even) { background: #FAFAFA; }
      tfoot td { background: #F9FAFB; font-weight: 700; }
      th:nth-child(5), th:nth-child(6), th:nth-child(7), th:nth-child(8),
      td:nth-child(5), td:nth-child(6), td:nth-child(7), td:nth-child(8) { text-align: right; }
    `;

    const header = `
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:20px;font-weight:bold">
          Sale Order Pendency (Art + Size Wise)
        </div>
        <div style="font-size:12px;margin-top:4px">
          <b>From:</b> ${fromDate} &nbsp; | &nbsp; <b>To:</b> ${toDate}
        </div>
        <hr/>
      </div>
    `;

    const html = content.outerHTML;

    printWindow.document.write(`
      <html>
        <head><title>${title}</title><style>${styles}</style></head>
        <body>${header}${html}
          <script>
            window.onload = () => {
              setTimeout(() => window.print(), 100);
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // PDF
  const handleExportPDF = async () => {
    const content = reportRef.current;
    if (!content) return Swal.fire("Info", "Nothing to export", "info");
    if (!rows.length) return Swal.fire("Info", "No rows to export", "info");

    const fileName = `Sale-Order-Pendency-ArtSize_${fromDate}_to_${toDate}.pdf`;

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.background = "#fff";
    wrapper.style.padding = "12px";
    wrapper.style.width = `${content.scrollWidth || 1200}px`;

    wrapper.innerHTML = `
      <style>
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #D1D5DB; padding: 7px 9px; }
        thead th { background: #F3F4F6; }
      </style>
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:20px;font-weight:bold">
          Sale Order Pendency (Art + Size Wise)
        </div>
        <div style="font-size:12px;margin-top:4px">
          <b>From:</b> ${fromDate} &nbsp; | &nbsp; <b>To:</b> ${toDate}
        </div>
        <hr/>
      </div>
    `;

    const cloned = content.cloneNode(true) as HTMLElement;
    cloned.style.overflow = "visible";
    wrapper.appendChild(cloned);

    document.body.appendChild(wrapper);
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: wrapper.scrollWidth,
      windowHeight: wrapper.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);

    let heightLeft = imgHeight - printableHeight;
    let yOffset = printableHeight;
    while (heightLeft > 0) {
      pdf.addPage("a4", "landscape");
      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        margin - yOffset,
        imgWidth,
        imgHeight
      );
      heightLeft -= printableHeight;
      yOffset += printableHeight;
    }

    pdf.save(fileName);
    wrapper.remove();
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.opening += r.opening || 0;
          acc.receipt += r.receipt || 0;
          acc.dispatch += r.dispatch || 0;
          acc.pending += r.pending || 0;
          return acc;
        },
        { opening: 0, receipt: 0, dispatch: 0, pending: 0 }
      ),
    [rows]
  );

  return (
    <Dashboard>
      <div className="max-w-6xl mx-auto p-6">
        {!showReportView && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-center mb-4">
              Sale Order Pendency (Art + Size Wise)
            </h2>

            {/* Dates */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
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
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-4 gap-6">
              {/* Destination */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Destination</div>
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={allDestSelected}
                      onChange={(e) => toggleAllDest(e.target.checked)}
                    />
                    Select All/Unselect All
                  </label>
                </div>
                <div className="border rounded h-48 overflow-auto p-2 bg-white">
                  {destinations.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No stations found
                    </div>
                  ) : (
                    destinations.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={selDestIds.includes(d.id)}
                          onChange={() => toggleDest(d.id)}
                        />
                        {d.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Party */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Party</div>
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={allPartySelected}
                      onChange={(e) => toggleAllParty(e.target.checked)}
                      disabled={availableParties.length === 0}
                    />
                    Select All/Unselect All
                  </label>
                </div>
                <div className="border rounded h-48 overflow-auto p-2 bg-white">
                  {availableParties.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Select Destination first
                    </div>
                  ) : (
                    availableParties.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={selPartyIds.includes(p.id)}
                          onChange={() => toggleParty(p.id)}
                        />
                        {p.partyName}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Art */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Art</div>
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={allArtSelected}
                      onChange={(e) => toggleAllArt(e.target.checked)}
                      disabled={availableArts.length === 0}
                    />
                    Select All/Unselect All
                  </label>
                </div>
                <div className="border rounded h-48 overflow-auto p-2 bg-white">
                  {availableArts.length === 0 ? (
                    <div className="text-sm text-gray-500">Select Party</div>
                  ) : (
                    availableArts.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={selArtIds.includes(a.id)}
                          onChange={() => toggleArt(a.id)}
                        />
                        {a.artNo} - {a.artName}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Size</div>
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={allSizeSelected}
                      onChange={(e) => toggleAllSize(e.target.checked)}
                      disabled={availableSizes.length === 0}
                    />
                    Select All/Unselect All
                  </label>
                </div>
                <div className="border rounded h-48 overflow-auto p-2 bg-white">
                  {availableSizes.length === 0 ? (
                    <div className="text-sm text-gray-500">Select Art</div>
                  ) : (
                    availableSizes.map((s) => (
                      <label key={s} className="flex items-center py-1 text-sm">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={selSizes.includes(s)}
                          onChange={() => toggleSize(s)}
                        />
                        {s}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={showReport}
                className="px-6 py-2 bg-indigo-600 text-white rounded shadow"
              >
                Show
              </button>
              <button
                onClick={handleExit}
                className="px-6 py-2 bg-gray-500 text-white rounded shadow"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Report View */}
        {showReportView && (
          <div className="bg-white rounded-2xl shadow-md p-6 w-full mx-auto mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">From:</span>
                  <span className="px-2 py-1 border rounded bg-gray-50">
                    {fromDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">To:</span>
                  <span className="px-2 py-1 border rounded bg-gray-50">
                    {toDate}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Print
                </button>
                <button
                  onClick={handleExportPDF}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  title="Export to PDF"
                >
                  Export PDF
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                No data found
              </div>
            ) : (
              <div ref={reportRef} className="overflow-x-auto bg-white">
                <table className="min-w-full border text-sm">
                  <thead className="bg-gray-200 text-gray-700">
                    <tr>
                      <th className="border p-2">S.No</th>
                      <th className="border p-2">Party Name</th>
                      <th className="border p-2">Art No</th>
                      <th className="border p-2">Size</th>
                      <th className="border p-2 text-right">Opening</th>
                      <th className="border p-2 text-right">Receipt</th>
                      <th className="border p-2 text-right">Dispatch</th>
                      <th className="border p-2 text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="border p-2 text-center">{i + 1}</td>
                        <td className="border p-2">{r.partyName}</td>
                        <td className="border p-2">{r.artNo}</td>
                        <td className="border p-2">{r.size}</td>
                        <td className="border p-2 text-right">
                          {fmt(r.opening)}
                        </td>
                        <td className="border p-2 text-right">
                          {fmt(r.receipt)}
                        </td>
                        <td className="border p-2 text-right">
                          {fmt(r.dispatch)}
                        </td>
                        <td className="border p-2 text-right">
                          {fmt(r.pending)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border p-2 text-right" colSpan={4}>
                        Total
                      </td>
                      <td className="border p-2 text-right">
                        {fmt(totals.opening)}
                      </td>
                      <td className="border p-2 text-right">
                        {fmt(totals.receipt)}
                      </td>
                      <td className="border p-2 text-right">
                        {fmt(totals.dispatch)}
                      </td>
                      <td className="border p-2 text-right">
                        {fmt(totals.pending)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={refresh}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default SaleOrderPendencyArtSizeWise;