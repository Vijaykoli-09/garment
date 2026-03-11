// src/components/DispatchReport.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";

type RecordItem = {
  serial: number; // challan serial or running number
  dated: string; // ISO yyyy-mm-dd
  challanNo: string;
  brokerName: string;
  partyName: string;
  artName: string; // from row.description
  artNo: string;
  lotNo: string; // from row.lotNumber (not displayed, but kept)
  shade: string;
  size: string;
  agent: string; // here = brokerName (or adjust as needed)
  pcs: number;
  rate: number;
  amt: number;
  totalAmt: number; // challan.totalAmt
  taxPercent: number; // challan.taxPercent
  taxAmt: number; // challan.tax (amount)
  cartage: number; // challan.cartage
  discount: number; // challan.discount
  netAmt: number; // challan.netAmt
  description?: string; // from row.description
};

const unique = (arr: string[]) =>
  Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

// Safer ISO parsing (avoids timezone date shift)
const parseISODateParts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return { y, mo, d };
};

const toComparable = (s: string) => {
  const p = parseISODateParts(s);
  if (p) return Date.UTC(p.y, p.mo - 1, p.d);
  return new Date(s).getTime();
};

const formatDateDMY = (iso: string) => {
  const p = parseISODateParts(iso);
  if (p) {
    const dd = String(p.d).padStart(2, "0");
    const mm = String(p.mo).padStart(2, "0");
    return `${dd}-${mm}-${p.y}`;
  }
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return iso;
  }
};

const filterOptions = (options: string[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((v) => v.toLowerCase().includes(q));
};

const DispatchReport: React.FC = () => {
  const navigate = useNavigate();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [reportType, setReportType] = useState<string>("Bill Details");

  const [selectedParties, setSelectedParties] = useState<Set<string>>(
    new Set()
  );
  const [selectedArtNames, setSelectedArtNames] = useState<Set<string>>(
    new Set()
  );
  const [selectedArtNos, setSelectedArtNos] = useState<Set<string>>(new Set());
  const [selectedShades, setSelectedShades] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  // Search states (for all filters)
  const [partySearch, setPartySearch] = useState<string>("");
  const [artNameSearch, setArtNameSearch] = useState<string>("");
  const [artNoSearch, setArtNoSearch] = useState<string>("");
  const [shadeSearch, setShadeSearch] = useState<string>("");
  const [sizeSearch, setSizeSearch] = useState<string>("");
  const [agentSearch, setAgentSearch] = useState<string>("");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // --- Load data from /dispatch-challan ---
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/dispatch-challan");
        const challans = Array.isArray(res.data) ? res.data : [];

        const items: RecordItem[] = [];

        challans.forEach((ch: any, challanIndex: number) => {
          const dated = ch.date || ch.dated || "";
          const serialRaw = ch.serialNo || ch.serial || challanIndex + 1;
          const serial = Number.isFinite(Number(serialRaw))
            ? Number(serialRaw)
            : challanIndex + 1;

          const challanNo = ch.challanNo || "";
          const brokerName = ch.brokerName || "";
          const partyName = ch.partyName || "";
          const agent = brokerName;

          const totalAmt = Number(ch.totalAmt ?? 0);
          const taxPercent = Number(ch.taxPercent ?? 0);
          const taxAmt = Number(ch.tax ?? 0);
          const cartage = Number(ch.cartage ?? 0);
          const discount = Number(ch.discount ?? 0);
          const netAmt = Number(ch.netAmt ?? 0);

          const rows = Array.isArray(ch.rows) ? ch.rows : [];

          if (!rows.length) {
            items.push({
              serial,
              dated,
              challanNo,
              brokerName,
              partyName,
              artName: "",
              artNo: "",
              lotNo: "",
              shade: "",
              size: "",
              agent,
              pcs: 0,
              rate: 0,
              amt: 0,
              totalAmt,
              taxPercent,
              taxAmt,
              cartage,
              discount,
              netAmt,
              description: "",
            });
          } else {
            rows.forEach((r: any) => {
              const artNo = r.artNo || "";
              const description = r.description || "";
              const lotNo = r.lotNumber || "";
              const shade = r.shade || "";
              const size = r.size || "";

              const pcs = Number(r.pcs ?? 0) || 0;
              const rate = Number(r.rate ?? 0) || 0;
              const amt = Number(r.amt != null ? r.amt : pcs * rate);

              items.push({
                serial,
                dated,
                challanNo,
                brokerName,
                partyName,
                artName: description,
                artNo,
                lotNo,
                shade,
                size,
                agent,
                pcs,
                rate,
                amt,
                totalAmt,
                taxPercent,
                taxAmt,
                cartage,
                discount,
                netAmt,
                description,
              });
            });
          }
        });

        setRecords(items);

        // Initialize date range based on data if not already set
        if (!fromDate || !toDate) {
          const validDates = items
            .map((i) => i.dated)
            .filter((d) => d && !isNaN(toComparable(d)));

          if (validDates.length) {
            const timestamps = validDates.map((d) => toComparable(d));
            const minTs = Math.min(...timestamps);
            const maxTs = Math.max(...timestamps);

            const fromIso = new Date(minTs).toISOString().slice(0, 10);
            const toIso = new Date(maxTs).toISOString().slice(0, 10);

            setFromDate(fromIso);
            setToDate(toIso);
          } else {
            const today = new Date().toISOString().slice(0, 10);
            setFromDate(today);
            setToDate(today);
          }
        }
      } catch (err: any) {
        console.error("Failed to load dispatch challans:", err);
        setError(err?.message || "Failed to load dispatch data");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Options for filters ---
  const { parties, artNames, artNos, shades, sizes, agents } = useMemo(() => {
    return {
      parties: unique(records.map((d) => d.partyName)),
      artNames: unique(records.map((d) => d.artName)),
      artNos: unique(records.map((d) => d.artNo)),
      shades: unique(records.map((d) => d.shade)),
      sizes: unique(records.map((d) => d.size)),
      agents: unique(records.map((d) => d.agent)),
    };
  }, [records]);

  // --- Filtered options by search ---
  const partyOptionsFiltered = useMemo(
    () => filterOptions(parties, partySearch),
    [parties, partySearch]
  );
  const artNameOptionsFiltered = useMemo(
    () => filterOptions(artNames, artNameSearch),
    [artNames, artNameSearch]
  );
  const artNoOptionsFiltered = useMemo(
    () => filterOptions(artNos, artNoSearch),
    [artNos, artNoSearch]
  );
  const shadeOptionsFiltered = useMemo(
    () => filterOptions(shades, shadeSearch),
    [shades, shadeSearch]
  );
  const sizeOptionsFiltered = useMemo(
    () => filterOptions(sizes, sizeSearch),
    [sizes, sizeSearch]
  );
  const agentOptionsFiltered = useMemo(
    () => filterOptions(agents, agentSearch),
    [agents, agentSearch]
  );

  // --- Helpers to manage Set-based filters ---
  function toggleInSet(
    setState: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string
  ) {
    setState((prev) => {
      const copy = new Set(prev);
      if (copy.has(value)) copy.delete(value);
      else copy.add(value);
      return copy;
    });
  }

  function setAll(
    setState: React.Dispatch<React.SetStateAction<Set<string>>>,
    values: string[],
    selectAll: boolean
  ) {
    setState(() => (selectAll ? new Set(values) : new Set()));
  }

  function addSome(
    setState: React.Dispatch<React.SetStateAction<Set<string>>>,
    values: string[]
  ) {
    setState((prev) => {
      const copy = new Set(prev);
      values.forEach((v) => copy.add(v));
      return copy;
    });
  }

  function removeSome(
    setState: React.Dispatch<React.SetStateAction<Set<string>>>,
    values: string[]
  ) {
    setState((prev) => {
      const copy = new Set(prev);
      values.forEach((v) => copy.delete(v));
      return copy;
    });
  }

  // --- Filter records by date and selected filters ---
  const filtered = useMemo(() => {
    if (!records.length) return [];

    const from = toComparable(fromDate || "1970-01-01");
    const to =
      toComparable(toDate || "2999-12-31") + 24 * 60 * 60 * 1000 - 1;

    return records.filter((r) => {
      const d = toComparable(r.dated);
      if (isNaN(d)) return false;
      if (d < from || d > to) return false;

      if (selectedParties.size && !selectedParties.has(r.partyName))
        return false;
      if (selectedArtNames.size && !selectedArtNames.has(r.artName))
        return false;
      if (selectedArtNos.size && !selectedArtNos.has(r.artNo)) return false;
      if (selectedShades.size && !selectedShades.has(r.shade)) return false;
      if (selectedSizes.size && !selectedSizes.has(r.size)) return false;
      if (selectedAgents.size && !selectedAgents.has(r.agent)) return false;

      return true;
    });
  }, [
    records,
    fromDate,
    toDate,
    selectedParties,
    selectedArtNames,
    selectedArtNos,
    selectedShades,
    selectedSizes,
    selectedAgents,
  ]);

  // Sort filtered data (by date, challan, artNo, size)
  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const da = toComparable(a.dated);
      const db = toComparable(b.dated);
      if (da !== db) return da - db;

      if (a.challanNo !== b.challanNo)
        return a.challanNo.localeCompare(b.challanNo);

      if (a.artNo !== b.artNo) return a.artNo.localeCompare(b.artNo);

      return a.size.localeCompare(b.size);
    });
    return data;
  }, [filtered]);

  /**
   * Build unique challan rows for Bill Details
   * (prevents repeated challan totals from showing multiple times)
   */
  const billDetailsRows = useMemo(() => {
    const map = new Map<string, RecordItem>();
    for (const r of sorted) {
      const key = `${r.dated}||${r.challanNo}||${r.partyName}||${r.brokerName}`;
      if (!map.has(key)) map.set(key, r);
    }
    const rows = Array.from(map.values());
    rows.sort((a, b) => {
      const da = toComparable(a.dated);
      const db = toComparable(b.dated);
      if (da !== db) return da - db;
      return (a.challanNo || "").localeCompare(b.challanNo || "");
    });
    return rows;
  }, [sorted]);

  // --- Totals: line-level (Packing List) ---
  const lineTotals = useMemo(() => {
    return {
      rows: sorted.length,
      pcs: sorted.reduce((s, r) => s + r.pcs, 0),
      amt: sorted.reduce((s, r) => s + r.amt, 0),
    };
  }, [sorted]);

  // --- Totals: challan-level (Bill Details) ---
  const billTotals = useMemo(() => {
    return {
      rows: billDetailsRows.length,
      totalAmt: billDetailsRows.reduce((s, r) => s + r.totalAmt, 0),
      taxAmt: billDetailsRows.reduce((s, r) => s + r.taxAmt, 0),
      cartage: billDetailsRows.reduce((s, r) => s + r.cartage, 0),
      discount: billDetailsRows.reduce((s, r) => s + r.discount, 0),
      netAmt: billDetailsRows.reduce((s, r) => s + r.netAmt, 0),
    };
  }, [billDetailsRows]);

  // --- UI state & handlers ---
  function openModal() {
    setShowModal(true);
  }

  function resetFilters() {
    setSelectedParties(new Set());
    setSelectedArtNames(new Set());
    setSelectedArtNos(new Set());
    setSelectedShades(new Set());
    setSelectedSizes(new Set());
    setSelectedAgents(new Set());

    setPartySearch("");
    setArtNameSearch("");
    setArtNoSearch("");
    setShadeSearch("");
    setSizeSearch("");
    setAgentSearch("");

    setShowModal(false);
  }

  const showFullColumns = reportType === "Bill Details";
  const showPackingColumns = reportType === "Packing List";

  // Base columns:
  // - Bill Details: only "Dated"
  // - Packing List: "#", "Dated"
  const baseCols = showPackingColumns ? 2 : 1;

  // Bill Details columns (excluding Dated): 8
  // Packing List columns (excluding #, Dated): 9
  const tableColSpan =
    baseCols + (showFullColumns ? 8 : 0) + (showPackingColumns ? 9 : 0);

  const displayRowsCount = showFullColumns ? billTotals.rows : lineTotals.rows;

  // --- Print (hidden iframe) ---
  function handlePrint() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const printData = showFullColumns ? billDetailsRows : sorted;

    if (!printData.length) {
      alert("No records to print for the selected filters.");
      return;
    }

    try {
      const headerSummary = showFullColumns
        ? `<strong>Rows:</strong> ${billTotals.rows}
           &nbsp; | &nbsp;
           <strong>Net Amt:</strong> ${billTotals.netAmt}`
        : `<strong>Rows:</strong> ${lineTotals.rows}
           &nbsp; | &nbsp;
           <strong>PCS:</strong> ${lineTotals.pcs}
           &nbsp; | &nbsp;
           <strong>Amt:</strong> ${lineTotals.amt}`;

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dispatch Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
    h2 { text-align: center; margin-bottom: 8px; }
    .info { margin-bottom: 12px; font-size: 12px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #444; padding: 4px 6px; text-align: left; }
    th { background: #eee; }
    .text-right { text-align: right; }
    .totals { margin-top: 12px; font-weight: bold; font-size: 12px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h2>Dispatch Report</h2>
  <div class="info">
    <div><strong>Report Type:</strong> ${reportType}</div>
    <div><strong>From:</strong> ${formatDateDMY(fromDate || "")} &nbsp; <strong>To:</strong> ${formatDateDMY(toDate || "")}</div>
    <div style="margin-top:4px;">
      ${headerSummary}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${
          showPackingColumns
            ? `<th>#</th>`
            : ``
        }
        <th>Dated</th>
        ${
          showPackingColumns
            ? `
        <th>Challan No</th>
        <th>Art No</th>
        <th>Art Name</th>
        <th>Shade</th>
        <th>Size</th>
        <th class="text-right">PCS</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amt</th>
        <th>Description</th>
        `
            : ""
        }
        ${
          showFullColumns
            ? `
        <th>Challan No</th>
        <th>Broker Name</th>
        <th>Party Name</th>
        <th class="text-right">Total Amt</th>
        <th class="text-right">Tax</th>
        <th class="text-right">Cartage</th>
        <th class="text-right">Discount</th>
        <th class="text-right">Net Amt</th>
        `
            : ""
        }
      </tr>
    </thead>
    <tbody>
      ${printData
        .map((r) => {
          const datedStr = formatDateDMY(r.dated);
          return `
      <tr>
        ${
          showPackingColumns
            ? `<td>${r.serial}</td>`
            : ``
        }
        <td>${datedStr}</td>
        ${
          showPackingColumns
            ? `
        <td>${r.challanNo}</td>
        <td>${r.artNo}</td>
        <td>${r.artName}</td>
        <td>${r.shade}</td>
        <td>${r.size}</td>
        <td class="text-right">${r.pcs}</td>
        <td class="text-right">${r.rate}</td>
        <td class="text-right">${r.amt}</td>
        <td>${r.description ?? ""}</td>
        `
            : ""
        }
        ${
          showFullColumns
            ? `
        <td>${r.challanNo}</td>
        <td>${r.brokerName}</td>
        <td>${r.partyName}</td>
        <td class="text-right">${r.totalAmt}</td>
        <td class="text-right">${r.taxAmt}</td>
        <td class="text-right">${r.cartage}</td>
        <td class="text-right">${r.discount}</td>
        <td class="text-right">${r.netAmt}</td>
        `
            : ""
        }
      </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    ${
      showFullColumns
        ? `
    <div>Total Amt: ${billTotals.totalAmt}</div>
    <div>Tax: ${billTotals.taxAmt}</div>
    <div>Cartage: ${billTotals.cartage}</div>
    <div>Discount: ${billTotals.discount}</div>
    <div>Net Amt: ${billTotals.netAmt}</div>
    `
        : `
    <div>PCS: ${lineTotals.pcs}</div>
    <div>Amt: ${lineTotals.amt}</div>
    `
    }
  </div>

  <script>
    window.onload = function () {
      try { window.focus(); window.print(); } catch (e) { console.error('Print error', e); }
      setTimeout(function () {
        try {
          if (window.frameElement && window.frameElement.parentNode) {
            window.frameElement.parentNode.removeChild(window.frameElement);
          }
        } catch (e) {}
      }, 500);
    };
  </script>
</body>
</html>`;

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";

      document.body.appendChild(iframe);

      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        document.body.removeChild(iframe);
        alert("Unable to open print preview.");
        return;
      }

      const printDoc = printWindow.document;
      printDoc.open();
      printDoc.write(html);
      printDoc.close();
    } catch (err) {
      console.error("Print generation failed:", err);
      alert("Failed to generate print preview. See console for details.");
    }
  }

  // Helpers for "Select All / Unselect" with search-aware behavior
  const handleSelectAll = (
    searchValue: string,
    allValues: string[],
    filteredValues: string[],
    setState: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    if (searchValue.trim()) addSome(setState, filteredValues);
    else setAll(setState, allValues, true);
  };

  const handleUnselect = (
    searchValue: string,
    allValues: string[],
    filteredValues: string[],
    setState: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    if (searchValue.trim()) removeSome(setState, filteredValues);
    else setAll(setState, allValues, false);
  };

  // Data to render in modal table depending on report type
  const modalTableData = showFullColumns ? billDetailsRows : sorted;

  // Header summary text depending on report type
  const modalSummary = showFullColumns ? (
    <>
      {displayRowsCount} rows | Net Amount: {billTotals.netAmt}
    </>
  ) : (
    <>
      {displayRowsCount} rows | PCS {lineTotals.pcs} | Amt: {lineTotals.amt}
    </>
  );

  return (
    <Dashboard>
      <div className="p-3 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Dispatch Report</h2>
          </div>

          {loading && (
            <div className="text-sm text-gray-600 mb-2">
              Loading dispatch challans...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 mb-2">Error: {error}</div>
          )}

          {/* Date + Report Type */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              >
                <option>Bill Details</option>
                <option>Packing List</option>
              </select>
            </div>
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* Party */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Party Name</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={() =>
                      handleSelectAll(
                        partySearch,
                        parties,
                        partyOptionsFiltered,
                        setSelectedParties
                      )
                    }
                    disabled={!parties.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={() =>
                      handleUnselect(
                        partySearch,
                        parties,
                        partyOptionsFiltered,
                        setSelectedParties
                      )
                    }
                    disabled={!parties.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  placeholder="Search party..."
                  className="p-2 border rounded w-full text-sm"
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{partyOptionsFiltered.length}</strong> of{" "}
                  <strong>{parties.length}</strong>
                </div>
              </div>

              <div className="h-44 overflow-auto">
                {partyOptionsFiltered.map((p) => (
                  <label key={p} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedParties.has(p)}
                      onChange={() => toggleInSet(setSelectedParties, p)}
                    />{" "}
                    <span className="ml-2">{p}</span>
                  </label>
                ))}

                {!!parties.length && !partyOptionsFiltered.length && (
                  <div className="text-xs text-gray-500">
                    No parties match “{partySearch}”
                  </div>
                )}

                {!parties.length && (
                  <div className="text-xs text-gray-500">
                    No parties (data not loaded or empty)
                  </div>
                )}
              </div>
            </div>

            {/* Art Name */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Select Art Name</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={() =>
                      handleSelectAll(
                        artNameSearch,
                        artNames,
                        artNameOptionsFiltered,
                        setSelectedArtNames
                      )
                    }
                    disabled={!artNames.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={() =>
                      handleUnselect(
                        artNameSearch,
                        artNames,
                        artNameOptionsFiltered,
                        setSelectedArtNames
                      )
                    }
                    disabled={!artNames.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={artNameSearch}
                  onChange={(e) => setArtNameSearch(e.target.value)}
                  placeholder="Search art name..."
                  className="p-2 border rounded w-full text-sm"
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{artNameOptionsFiltered.length}</strong> of{" "}
                  <strong>{artNames.length}</strong>
                </div>
              </div>

              <div className="h-44 overflow-auto">
                {artNameOptionsFiltered.map((a) => (
                  <label key={a} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedArtNames.has(a)}
                      onChange={() => toggleInSet(setSelectedArtNames, a)}
                    />{" "}
                    <span className="ml-2">{a}</span>
                  </label>
                ))}

                {!!artNames.length && !artNameOptionsFiltered.length && (
                  <div className="text-xs text-gray-500">
                    No art names match “{artNameSearch}”
                  </div>
                )}

                {!artNames.length && (
                  <div className="text-xs text-gray-500">
                    No art names (data not loaded or empty)
                  </div>
                )}
              </div>
            </div>

            {/* Art No */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Select Art No</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={() =>
                      handleSelectAll(
                        artNoSearch,
                        artNos,
                        artNoOptionsFiltered,
                        setSelectedArtNos
                      )
                    }
                    disabled={!artNos.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={() =>
                      handleUnselect(
                        artNoSearch,
                        artNos,
                        artNoOptionsFiltered,
                        setSelectedArtNos
                      )
                    }
                    disabled={!artNos.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={artNoSearch}
                  onChange={(e) => setArtNoSearch(e.target.value)}
                  placeholder="Search art no..."
                  className="p-2 border rounded w-full text-sm"
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{artNoOptionsFiltered.length}</strong> of{" "}
                  <strong>{artNos.length}</strong>
                </div>
              </div>

              <div className="h-44 overflow-auto">
                {artNoOptionsFiltered.map((a) => (
                  <label key={a} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedArtNos.has(a)}
                      onChange={() => toggleInSet(setSelectedArtNos, a)}
                    />{" "}
                    <span className="ml-2">{a}</span>
                  </label>
                ))}

                {!!artNos.length && !artNoOptionsFiltered.length && (
                  <div className="text-xs text-gray-500">
                    No art numbers match “{artNoSearch}”
                  </div>
                )}

                {!artNos.length && (
                  <div className="text-xs text-gray-500">
                    No art numbers (data not loaded or empty)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* More filters */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            {/* Shade */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Select Shade</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={() =>
                      handleSelectAll(
                        shadeSearch,
                        shades,
                        shadeOptionsFiltered,
                        setSelectedShades
                      )
                    }
                    disabled={!shades.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={() =>
                      handleUnselect(
                        shadeSearch,
                        shades,
                        shadeOptionsFiltered,
                        setSelectedShades
                      )
                    }
                    disabled={!shades.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={shadeSearch}
                  onChange={(e) => setShadeSearch(e.target.value)}
                  placeholder="Search shade..."
                  className="p-2 border rounded w-full text-sm"
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{shadeOptionsFiltered.length}</strong> of{" "}
                  <strong>{shades.length}</strong>
                </div>
              </div>

              <div className="h-36 overflow-auto">
                {shadeOptionsFiltered.map((s) => (
                  <label key={s} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedShades.has(s)}
                      onChange={() => toggleInSet(setSelectedShades, s)}
                    />{" "}
                    <span className="ml-2">{s}</span>
                  </label>
                ))}

                {!!shades.length && !shadeOptionsFiltered.length && (
                  <div className="text-xs text-gray-500">
                    No shades match “{shadeSearch}”
                  </div>
                )}

                {!shades.length && (
                  <div className="text-xs text-gray-500">
                    No shades (data not loaded or empty)
                  </div>
                )}
              </div>
            </div>

            {/* Size */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Select Size</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={() =>
                      handleSelectAll(
                        sizeSearch,
                        sizes,
                        sizeOptionsFiltered,
                        setSelectedSizes
                      )
                    }
                    disabled={!sizes.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={() =>
                      handleUnselect(
                        sizeSearch,
                        sizes,
                        sizeOptionsFiltered,
                        setSelectedSizes
                      )
                    }
                    disabled={!sizes.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={sizeSearch}
                  onChange={(e) => setSizeSearch(e.target.value)}
                  placeholder="Search size..."
                  className="p-2 border rounded w-full text-sm"
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{sizeOptionsFiltered.length}</strong> of{" "}
                  <strong>{sizes.length}</strong>
                </div>
              </div>

              <div className="h-36 overflow-auto">
                {sizeOptionsFiltered.map((s) => (
                  <label key={s} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSizes.has(s)}
                      onChange={() => toggleInSet(setSelectedSizes, s)}
                    />{" "}
                    <span className="ml-2">{s}</span>
                  </label>
                ))}

                {!!sizes.length && !sizeOptionsFiltered.length && (
                  <div className="text-xs text-gray-500">
                    No sizes match “{sizeSearch}”
                  </div>
                )}

                {!sizes.length && (
                  <div className="text-xs text-gray-500">
                    No sizes (data not loaded or empty)
                  </div>
                )}
              </div>
            </div>

            {/* Agent */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Select Agent</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={() =>
                      handleSelectAll(
                        agentSearch,
                        agents,
                        agentOptionsFiltered,
                        setSelectedAgents
                      )
                    }
                    disabled={!agents.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={() =>
                      handleUnselect(
                        agentSearch,
                        agents,
                        agentOptionsFiltered,
                        setSelectedAgents
                      )
                    }
                    disabled={!agents.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Search agent..."
                  className="p-2 border rounded w-full text-sm"
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{agentOptionsFiltered.length}</strong> of{" "}
                  <strong>{agents.length}</strong>
                </div>
              </div>

              <div className="h-36 overflow-auto">
                {agentOptionsFiltered.map((a) => (
                  <label key={a} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAgents.has(a)}
                      onChange={() => toggleInSet(setSelectedAgents, a)}
                    />{" "}
                    <span className="ml-2">{a}</span>
                  </label>
                ))}

                {!!agents.length && !agentOptionsFiltered.length && (
                  <div className="text-xs text-gray-500">
                    No agents match “{agentSearch}”
                  </div>
                )}

                {!agents.length && (
                  <div className="text-xs text-gray-500">
                    No agents (data not loaded or empty)
                  </div>
                )}
              </div>
            </div>

            {/* Empty cell to keep 4-column grid alignment */}
            <div className="hidden lg:block" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={openModal}
              disabled={loading || !records.length}
            >
              Show
            </button>

            <button className="px-4 py-2 border rounded" onClick={resetFilters}>
              Reset
            </button>

            {/* NEW: Exit button */}
            <button
              className="px-4 py-2 border rounded"
              onClick={() => navigate(-1)}
            >
              Exit
            </button>

            <div className="ml-auto text-sm text-gray-600">
              {showFullColumns ? (
                <>
                  Rows: <strong>{billTotals.rows}</strong> | Net:{" "}
                  <strong>{billTotals.netAmt}</strong>
                </>
              ) : (
                <>
                  Rows: <strong>{lineTotals.rows}</strong> | PCS:{" "}
                  <strong>{lineTotals.pcs}</strong> | Amt:{" "}
                  <strong>{lineTotals.amt}</strong>
                </>
              )}
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black opacity-30"
                onClick={() => setShowModal(false)}
              />

              <div
                className={`relative bg-white rounded shadow overflow-hidden ${
                  fullScreen
                    ? "w-full h-full m-0"
                    : "w-[95%] md:w-[92%] lg:w-[88%] m-4"
                }`}
                style={{ maxHeight: fullScreen ? "100vh" : "92vh" }}
              >
                <div className="flex items-center justify-between p-3 border-b">
                  <div>
                    <div className="text-sm text-gray-700">
                      <strong>Report Type:</strong> {reportType} &nbsp; | &nbsp;{" "}
                      <strong>From:</strong> {formatDateDMY(fromDate)} &nbsp;|{" "}
                      &nbsp; <strong>To:</strong> {formatDateDMY(toDate)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {modalSummary}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 border rounded text-sm"
                      onClick={() => setFullScreen(!fullScreen)}
                    >
                      {fullScreen ? "Exit Fullscreen" : "Fullscreen"}
                    </button>
                    <button
                      className="px-2 py-1 border rounded text-sm"
                      onClick={handlePrint}
                    >
                      Print
                    </button>
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                      onClick={() => setShowModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div
                  className="p-2 overflow-auto"
                  style={{ height: fullScreen ? "calc(100vh - 72px)" : "78vh" }}
                >
                  <div className="min-w-max">
                    <table className="text-sm border-collapse w-full table-auto">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {/* Packing List keeps #, Bill Details hides # */}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border">#</th>
                          )}

                          <th className="px-2 py-1 border">Dated</th>

                          {showPackingColumns && (
                            <th className="px-2 py-1 border">Challan No</th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border">Art No</th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border">Art Name</th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border">Shade</th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border">Size</th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border text-right">PCS</th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border text-right">
                              Rate
                            </th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border text-right">Amt</th>
                          )}
                          {showPackingColumns && (
                            <th className="px-2 py-1 border">Description</th>
                          )}

                          {showFullColumns && (
                            <th className="px-2 py-1 border">Challan No</th>
                          )}
                          {showFullColumns && (
                            <th className="px-2 py-1 border">Broker Name</th>
                          )}
                          {showFullColumns && (
                            <th className="px-2 py-1 border">Party Name</th>
                          )}
                          {showFullColumns && (
                            <th className="px-2 py-1 border text-right">
                              Total Amt
                            </th>
                          )}
                          {showFullColumns && (
                            <th className="px-2 py-1 border text-right">Tax</th>
                          )}
                          {showFullColumns && (
                            <th className="px-2 py-1 border text-right">
                              Cartage
                            </th>
                          )}
                          {showFullColumns && (
                            <th className="px-2 py-1 border text-right">
                              Discount
                            </th>
                          )}
                          {showFullColumns && (
                            <th className="px-2 py-1 border text-right">
                              Net Amt
                            </th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {modalTableData.map((r, idx) => (
                          <tr
                            key={
                              showFullColumns
                                ? `${r.dated}-${r.challanNo}-${idx}`
                                : `${r.challanNo}-${idx}-${r.artNo}-${r.size}`
                            }
                            className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {showPackingColumns && (
                              <td className="px-2 py-1 border">{r.serial}</td>
                            )}

                            <td className="px-2 py-1 border">
                              {formatDateDMY(r.dated)}
                            </td>

                            {showPackingColumns && (
                              <>
                                <td className="px-2 py-1 border">
                                  {r.challanNo}
                                </td>
                                <td className="px-2 py-1 border">{r.artNo}</td>
                                <td className="px-2 py-1 border">
                                  {r.artName}
                                </td>
                                <td className="px-2 py-1 border">{r.shade}</td>
                                <td className="px-2 py-1 border">{r.size}</td>
                                <td className="px-2 py-1 border text-right">
                                  {r.pcs}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {r.rate}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {r.amt}
                                </td>
                                <td className="px-2 py-1 border">
                                  {r.description}
                                </td>
                              </>
                            )}

                            {showFullColumns && (
                              <>
                                <td className="px-2 py-1 border">
                                  {r.challanNo}
                                </td>
                                <td className="px-2 py-1 border">
                                  {r.brokerName}
                                </td>
                                <td className="px-2 py-1 border">
                                  {r.partyName}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {r.totalAmt}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {r.taxAmt}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {r.cartage}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {r.discount}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {r.netAmt}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}

                        {/* Totals row */}
                        <tr>
                          <td colSpan={tableColSpan} className="p-0">
                            <div className="w-full bg-blue-700 text-white text-sm font-semibold">
                              <div className="flex items-center justify-between px-2 py-1">
                                <div>Totals</div>
                                <div className="flex items-center gap-4">
                                  {showFullColumns ? (
                                    <>
                                      <div>
                                        Total Amt:{" "}
                                        <strong>{billTotals.totalAmt}</strong>
                                      </div>
                                      <div>
                                        Tax: <strong>{billTotals.taxAmt}</strong>
                                      </div>
                                      <div>
                                        Cartage:{" "}
                                        <strong>{billTotals.cartage}</strong>
                                      </div>
                                      <div>
                                        Discount:{" "}
                                        <strong>{billTotals.discount}</strong>
                                      </div>
                                      <div>
                                        Net: <strong>{billTotals.netAmt}</strong>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        PCS: <strong>{lineTotals.pcs}</strong>
                                      </div>
                                      <div>
                                        Amt: <strong>{lineTotals.amt}</strong>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {!modalTableData.length && (
                          <tr>
                            <td
                              colSpan={tableColSpan}
                              className="border p-3 text-center text-gray-500"
                            >
                              No records for the selected filters / dates
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default DispatchReport;