// src/pages/Knitting/MaterialStockReport.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard"; // adjust path if needed
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

interface MaterialGroup {
  id: number;
  materialGroup: string;
  materialType: string;
  unitOfMeasure: string;
  costOfMaterial: number;
  supplierName: string;
}

interface MaterialItem {
  id: number;
  serialNumber: string;
  materialGroupId: number;
  materialGroupName: string;
  materialName: string;
  code: string;
  materialUnit: string;
  minimumStock: number;
  maximumStock: number;
  openingStock: number;
}

interface StockData {
  id: number;
  groupName: string;
  itemName: string;
  shadeName: string;
  openingStock: number;
  purchase: number;
  consumed: number;
  balance: number;
}

/** ---------------- Helpers (same UI behavior as DispatchReport) ---------------- */

const uniqueBy = <T, K extends string | number>(arr: T[], getKey: (t: T) => K) => {
  const map = new Map<K, T>();
  for (const it of arr) {
    const k = getKey(it);
    if (!map.has(k)) map.set(k, it);
  }
  return Array.from(map.values());
};

const filterOptions = (options: { id: number; label: string }[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((v) => v.label.toLowerCase().includes(q));
};

function toggleInNumberSet(
  setState: React.Dispatch<React.SetStateAction<Set<number>>>,
  value: number
) {
  setState((prev) => {
    const copy = new Set(prev);
    if (copy.has(value)) copy.delete(value);
    else copy.add(value);
    return copy;
  });
}

function setAllNumbers(
  setState: React.Dispatch<React.SetStateAction<Set<number>>>,
  values: number[],
  selectAll: boolean
) {
  setState(() => (selectAll ? new Set(values) : new Set()));
}

function addSomeNumbers(
  setState: React.Dispatch<React.SetStateAction<Set<number>>>,
  values: number[]
) {
  setState((prev) => {
    const copy = new Set(prev);
    values.forEach((v) => copy.add(v));
    return copy;
  });
}

function removeSomeNumbers(
  setState: React.Dispatch<React.SetStateAction<Set<number>>>,
  values: number[]
) {
  setState((prev) => {
    const copy = new Set(prev);
    values.forEach((v) => copy.delete(v));
    return copy;
  });
}

/** ---------------- Date: DD-MM-YYYY input + validation + API conversion ---------------- */

const dateRegex = /^\d{2}-\d{2}-\d{4}$/;

const todayDMY = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const isValidDMY = (dmy: string) => {
  if (!dmy || !dateRegex.test(dmy)) return false;

  const [ddStr, mmStr, yyyyStr] = dmy.split("-");
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  const yyyy = Number(yyyyStr);

  if (!dd || !mm || !yyyy) return false;

  const dt = new Date(yyyy, mm - 1, dd);
  return (
    dt.getFullYear() === yyyy &&
    dt.getMonth() === mm - 1 &&
    dt.getDate() === dd
  );
};

const convertDMYToISO = (dmy: string) => {
  if (!dmy || !dmy.trim()) return null;
  if (!isValidDMY(dmy)) return null;
  const [dd, mm, yyyy] = dmy.split("-");
  return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
};

const MaterialStockReport: React.FC = () => {
  const navigate = useNavigate();

  const [allGroups, setAllGroups] = useState<MaterialGroup[]>([]);
  const [allItems, setAllItems] = useState<MaterialItem[]>([]);

  // ✅ FIX for CI ESLint: initialize dates here (no need to set in useEffect)
  const [fromDate, setFromDate] = useState<string>(() => todayDMY());
  const [toDate, setToDate] = useState<string>(() => todayDMY());

  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Search states
  const [groupSearch, setGroupSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  // Modal like DispatchReport
  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // Report data
  const [reportData, setReportData] = useState<StockData[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Load Material Groups + Items */
  useEffect(() => {
    const load = async () => {
      try {
        const [gRes, iRes] = await Promise.all([
          api.get("/material-groups"),
          api.get("/materials"),
        ]);

        const gData: MaterialGroup[] = Array.isArray(gRes.data) ? gRes.data : [];
        const iData: MaterialItem[] = Array.isArray(iRes.data) ? iRes.data : [];

        // keep your earlier behavior: unique by materialGroup name
        const uniqueGroups = uniqueBy(gData, (g) => g.materialGroup);
        setAllGroups(uniqueGroups);

        setAllItems(iData);
      } catch (err) {
        Swal.fire("Error", "Failed to load material groups/items", "error");
      }
    };

    load();
  }, []);

  /** Options for selection boxes */
  const groupOptions = useMemo(() => {
    return allGroups
      .map((g) => ({ id: g.id, label: g.materialGroup || "" }))
      .filter((x) => x.label);
  }, [allGroups]);

  const itemsBySelectedGroups = useMemo(() => {
    if (!selectedGroups.size) return [];
    return allItems.filter((m) => selectedGroups.has(m.materialGroupId));
  }, [allItems, selectedGroups]);

  const itemOptions = useMemo(() => {
    return itemsBySelectedGroups
      .map((m) => ({ id: m.id, label: m.materialName || "" }))
      .filter((x) => x.label);
  }, [itemsBySelectedGroups]);

  /** Search filtered lists */
  const groupOptionsFiltered = useMemo(
    () => filterOptions(groupOptions, groupSearch),
    [groupOptions, groupSearch]
  );

  const itemOptionsFiltered = useMemo(
    () => filterOptions(itemOptions, itemSearch),
    [itemOptions, itemSearch]
  );

  /** When groups change, drop selected items not in those groups */
  useEffect(() => {
    if (!selectedItems.size) return;

    const allowed = new Set(itemsBySelectedGroups.map((x) => x.id));
    setSelectedItems((prev) => {
      const next = new Set<number>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [itemsBySelectedGroups, selectedItems.size]);

  /** Totals */
  const totals = useMemo(() => {
    return {
      rows: reportData.length,
      opening: reportData.reduce((s, r) => s + Number(r.openingStock ?? 0), 0),
      purchase: reportData.reduce((s, r) => s + Number(r.purchase ?? 0), 0),
      consumed: reportData.reduce((s, r) => s + Number(r.consumed ?? 0), 0),
      balance: reportData.reduce((s, r) => s + Number(r.balance ?? 0), 0),
    };
  }, [reportData]);

  /** Select All / Unselect (search-aware) */
  const handleSelectAllGroups = () => {
    const allValues = groupOptions.map((x) => x.id);
    const filteredValues = groupOptionsFiltered.map((x) => x.id);
    if (groupSearch.trim()) addSomeNumbers(setSelectedGroups, filteredValues);
    else setAllNumbers(setSelectedGroups, allValues, true);
  };

  const handleUnselectGroups = () => {
    const allValues = groupOptions.map((x) => x.id);
    const filteredValues = groupOptionsFiltered.map((x) => x.id);
    if (groupSearch.trim()) removeSomeNumbers(setSelectedGroups, filteredValues);
    else setAllNumbers(setSelectedGroups, allValues, false);
  };

  const handleSelectAllItems = () => {
    const allValues = itemOptions.map((x) => x.id);
    const filteredValues = itemOptionsFiltered.map((x) => x.id);
    if (itemSearch.trim()) addSomeNumbers(setSelectedItems, filteredValues);
    else setAllNumbers(setSelectedItems, allValues, true);
  };

  const handleUnselectItems = () => {
    const allValues = itemOptions.map((x) => x.id);
    const filteredValues = itemOptionsFiltered.map((x) => x.id);
    if (itemSearch.trim()) removeSomeNumbers(setSelectedItems, filteredValues);
    else setAllNumbers(setSelectedItems, allValues, false);
  };

  /** Reset */
  const resetFilters = () => {
    setSelectedGroups(new Set());
    setSelectedItems(new Set());
    setGroupSearch("");
    setItemSearch("");
    setReportData([]);
    setError(null);
    setShowModal(false);
  };

  /** Fetch report */
  const handleShow = async () => {
    if (!selectedGroups.size) {
      return Swal.fire("Warning", "Please select at least one Material Group.", "warning");
    }
    if (!selectedItems.size) {
      return Swal.fire("Warning", "Please select at least one Material Item.", "warning");
    }

    // DD-MM-YYYY validation
    if (fromDate?.trim() && !isValidDMY(fromDate)) {
      return Swal.fire("Invalid Date", "Enter From Date in DD-MM-YYYY format", "warning");
    }
    if (toDate?.trim() && !isValidDMY(toDate)) {
      return Swal.fire("Invalid Date", "Enter To Date in DD-MM-YYYY format", "warning");
    }

    const apiFromDate = convertDMYToISO(fromDate);
    const apiToDate = convertDMYToISO(toDate);

    if (fromDate?.trim() && !apiFromDate) {
      return Swal.fire("Invalid Date", "From Date is invalid", "warning");
    }
    if (toDate?.trim() && !apiToDate) {
      return Swal.fire("Invalid Date", "To Date is invalid", "warning");
    }

    setShowModal(true);
    setFullScreen(false);
    setLoadingReport(true);
    setError(null);
    setReportData([]);

    try {
      const res = await api.post("/stock-report", {
        groupIds: Array.from(selectedGroups),
        itemIds: Array.from(selectedItems),
        fromDate: apiFromDate, // YYYY-MM-DD or null
        toDate: apiToDate, // YYYY-MM-DD or null
      });

      const data: StockData[] = Array.isArray(res.data) ? res.data : [];
      if (!data.length) {
        Swal.fire("Info", "No stock data found for selected items.", "info");
      }
      setReportData(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to fetch stock report");
      Swal.fire("Error", "Failed to fetch stock report", "error");
    } finally {
      setLoadingReport(false);
    }
  };

  /** Print (hidden iframe) */
  const handlePrint = () => {
    if (!reportData.length) {
      alert("No records to print for the selected filters.");
      return;
    }

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Material Stock Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
    h2 { text-align: center; margin-bottom: 6px; }
    .info { margin-bottom: 12px; font-size: 12px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #444; padding: 4px 6px; }
    th { background: #eee; text-align: center; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals { margin-top: 12px; font-weight: bold; font-size: 12px; }
  </style>
</head>
<body>
  <h2>Material Stock Report</h2>
  <div class="info">
    <div><strong>Period:</strong> ${fromDate || "-"} to ${toDate || "-"}</div>
    <div style="margin-top:4px;">
      <strong>Rows:</strong> ${totals.rows}
      &nbsp; | &nbsp;
      <strong>Balance Total:</strong> ${totals.balance}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>Material Group</th>
        <th>Material Name</th>
        <th>Shade Name</th>
        <th>Opening</th>
        <th>Purchase (Cr)</th>
        <th>Consumed (Dr)</th>
        <th>Balance</th>
      </tr>
    </thead>
    <tbody>
      ${reportData
        .map(
          (r, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${r.groupName ?? ""}</td>
        <td>${r.itemName ?? ""}</td>
        <td>${r.shadeName ?? ""}</td>
        <td class="text-right">${r.openingStock ?? 0}</td>
        <td class="text-right">${r.purchase ?? 0}</td>
        <td class="text-right">${r.consumed ?? 0}</td>
        <td class="text-right">${r.balance ?? 0}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    Opening: ${totals.opening} &nbsp; | &nbsp;
    Purchase: ${totals.purchase} &nbsp; | &nbsp;
    Consumed: ${totals.consumed} &nbsp; | &nbsp;
    Balance: ${totals.balance}
  </div>

  <script>
    window.onload = function () {
      try { window.focus(); window.print(); } catch (e) {}
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

    const doc = printWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  };

  return (
    <Dashboard>
      <div className="p-3 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Material Stock Report</h2>
          </div>

          {/* Date Range (DD-MM-YYYY) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm">From (DD-MM-YYYY):</label>
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm">To (DD-MM-YYYY):</label>
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
            <div className="hidden md:block" />
          </div>

          {/* Selection boxes (with Search + Select All + Unselect) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* Groups */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Material Group</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={handleSelectAllGroups}
                    disabled={!groupOptions.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={handleUnselectGroups}
                    disabled={!groupOptions.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Search group..."
                  className="p-2 border rounded w-full text-sm"
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{groupOptionsFiltered.length}</strong> of{" "}
                  <strong>{groupOptions.length}</strong>
                </div>
              </div>

              <div className="h-52 overflow-auto">
                {groupOptionsFiltered.map((g) => (
                  <label key={g.id} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(g.id)}
                      onChange={() => toggleInNumberSet(setSelectedGroups, g.id)}
                    />{" "}
                    <span className="ml-2">{g.label}</span>
                  </label>
                ))}

                {!!groupOptions.length && !groupOptionsFiltered.length && (
                  <div className="text-xs text-gray-500">
                    No groups match “{groupSearch}”
                  </div>
                )}

                {!groupOptions.length && (
                  <div className="text-xs text-gray-500">No groups loaded</div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <strong>Material Item</strong>
                <div className="text-xs">
                  <button
                    className="mr-2 underline"
                    onClick={handleSelectAllItems}
                    disabled={!itemOptions.length}
                  >
                    Select All
                  </button>
                  <button
                    className="underline"
                    onClick={handleUnselectItems}
                    disabled={!itemOptions.length}
                  >
                    Unselect
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder={selectedGroups.size ? "Search item..." : "Select group(s) first..."}
                  className="p-2 border rounded w-full text-sm"
                  disabled={!selectedGroups.size}
                />
                <div className="mt-1 text-[11px] text-gray-600">
                  Showing <strong>{itemOptionsFiltered.length}</strong> of{" "}
                  <strong>{itemOptions.length}</strong>
                </div>
              </div>

              <div className="h-52 overflow-auto">
                {!selectedGroups.size ? (
                  <div className="text-xs text-gray-500">
                    Select Material Group(s) to view items.
                  </div>
                ) : (
                  <>
                    {itemOptionsFiltered.map((m) => (
                      <label key={m.id} className="block text-sm">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(m.id)}
                          onChange={() => toggleInNumberSet(setSelectedItems, m.id)}
                        />{" "}
                        <span className="ml-2">{m.label}</span>
                      </label>
                    ))}

                    {!!itemOptions.length && !itemOptionsFiltered.length && (
                      <div className="text-xs text-gray-500">
                        No items match “{itemSearch}”
                      </div>
                    )}

                    {!itemOptions.length && (
                      <div className="text-xs text-gray-500">
                        No items for selected group(s)
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleShow}
            >
              Show
            </button>

            <button className="px-4 py-2 border rounded" onClick={resetFilters}>
              Reset
            </button>

            <button className="px-4 py-2 border rounded" onClick={() => navigate(-1)}>
              Exit
            </button>

            <div className="ml-auto text-sm text-gray-600">
              Rows: <strong>{totals.rows}</strong> | Balance Total:{" "}
              <strong>{totals.balance}</strong>
            </div>
          </div>

          {/* Modal (DispatchReport UI) */}
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
                      <strong>Material Stock Report</strong> &nbsp; | &nbsp;
                      <strong>Period:</strong> {fromDate || "-"} to {toDate || "-"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Rows: {totals.rows} | Opening: {totals.opening} | Purchase:{" "}
                      {totals.purchase} | Consumed: {totals.consumed} | Balance:{" "}
                      {totals.balance}
                    </div>
                    {error && (
                      <div className="text-xs text-red-600 mt-1">Error: {error}</div>
                    )}
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
                      disabled={!reportData.length}
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
                  {loadingReport ? (
                    <div className="text-sm text-gray-600 p-3">Loading report...</div>
                  ) : (
                    <div className="min-w-max">
                      <table className="text-sm border-collapse w-full table-auto">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 border text-center">#</th>
                            <th className="px-2 py-1 border">Material Group</th>
                            <th className="px-2 py-1 border">Material Name</th>
                            <th className="px-2 py-1 border">Shade Name</th>
                            <th className="px-2 py-1 border text-right">Opening</th>
                            <th className="px-2 py-1 border text-right">
                              Purchase (Cr)
                            </th>
                            <th className="px-2 py-1 border text-right">
                              Consumed (Dr)
                            </th>
                            <th className="px-2 py-1 border text-right">Balance</th>
                          </tr>
                        </thead>

                        <tbody>
                          {reportData.map((r, idx) => (
                            <tr
                              key={r.id ?? idx}
                              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            >
                              <td className="px-2 py-1 border text-center">
                                {idx + 1}
                              </td>
                              <td className="px-2 py-1 border">{r.groupName}</td>
                              <td className="px-2 py-1 border">{r.itemName}</td>
                              <td className="px-2 py-1 border">{r.shadeName}</td>
                              <td className="px-2 py-1 border text-right">
                                {r.openingStock ?? 0}
                              </td>
                              <td className="px-2 py-1 border text-right">
                                {r.purchase ?? 0}
                              </td>
                              <td className="px-2 py-1 border text-right">
                                {r.consumed ?? 0}
                              </td>
                              <td className="px-2 py-1 border text-right font-semibold">
                                {r.balance ?? 0}
                              </td>
                            </tr>
                          ))}

                          {/* Totals bar (same style as DispatchReport) */}
                          <tr>
                            <td colSpan={8} className="p-0">
                              <div className="w-full bg-blue-700 text-white text-sm font-semibold">
                                <div className="flex items-center justify-between px-2 py-1">
                                  <div>Totals</div>
                                  <div className="flex items-center gap-4">
                                    <div>
                                      Opening: <strong>{totals.opening}</strong>
                                    </div>
                                    <div>
                                      Purchase: <strong>{totals.purchase}</strong>
                                    </div>
                                    <div>
                                      Consumed: <strong>{totals.consumed}</strong>
                                    </div>
                                    <div>
                                      Balance: <strong>{totals.balance}</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {!reportData.length && !loadingReport && (
                            <tr>
                              <td
                                colSpan={8}
                                className="border p-3 text-center text-gray-500"
                              >
                                No records for the selected filters / dates
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default MaterialStockReport;
