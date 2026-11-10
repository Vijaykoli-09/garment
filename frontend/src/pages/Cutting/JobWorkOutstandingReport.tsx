import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";

interface Party {
  id: number | string;
  partyName: string;
}

interface Process {
  serialNo: string;
  processName: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface JobWorkReportRow {
  partyId: string;
  partyName: string;
  processId: string;
  processName: string;
  cuttingLotNo: string;
  artNo: string;
  sizeName: string;
  outwardPcs: number;
  inwardPcs: number;
  outstandingPcs: number;
  outwardChallans: string[];
  inwardChallans: string[];
  outwardDate: string;
}

const normalizeText = (value: any): string =>
  String(value ?? "").trim();

// Preserve the original lot number for display and exact matching.
const normalizeLotNo = (value: any): string => normalizeText(value);

// A legacy inward may store only the final cutting lot segment.
// Use it only as a fallback, and only when it identifies one outward row.
const shortLotNo = (value: any): string => {
  const full = normalizeLotNo(value);
  return full.split("-").pop()?.trim() || "";
};

const normalizeKey = (value: any): string =>
  normalizeText(value).toLocaleLowerCase();

const toNumber = (value: any): number => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateKey = (value: any): string => {
  if (!value) return "";
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatNumber = (value: number): string =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const MultiSelectFilter: React.FC<{
  title: string;
  placeholder: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  accent?: string;
}> = ({ title, placeholder, options, selected, onChange, accent = "blue" }) => {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? options.filter((option) =>
          `${option.label} ${option.value}`.toLowerCase().includes(query)
        )
      : options;
  }, [options, search]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  const selectVisible = () => {
    const visibleValues = filtered.map((option) => option.value);
    const allVisibleSelected =
      visibleValues.length > 0 &&
      visibleValues.every((value) => selected.includes(value));

    onChange(
      allVisibleSelected
        ? selected.filter((value) => !visibleValues.includes(value))
        : Array.from(new Set([...selected, ...visibleValues]))
    );
  };

  const colorClass =
    accent === "green"
      ? "bg-green-100"
      : accent === "purple"
      ? "bg-purple-100"
      : accent === "amber"
      ? "bg-amber-100"
      : "bg-blue-100";

  return (
    <section className="rounded-lg border border-gray-200 p-3 bg-white min-w-0">
      <div className={`text-center font-semibold py-2 mb-2 rounded ${colorClass}`}>
        {title}
        <span className="block text-xs font-normal text-gray-600">Optional · {selected.length} selected</span>
      </div>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
        className="w-full border rounded px-3 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-blue-400"
      />
      <div className="h-44 overflow-y-auto border rounded bg-white">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No matching records</div>
        ) : (
          filtered.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-2 px-2 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                selected.includes(option.value) ? "bg-blue-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span className="break-all">{option.label}</span>
            </label>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={selectVisible}
        disabled={filtered.length === 0}
        className="text-xs text-blue-700 mt-2 hover:underline disabled:text-gray-400"
      >
        Select / Unselect Visible
      </button>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-red-600 mt-2 ml-3 hover:underline"
        >
          Clear
        </button>
      )}
    </section>
  );
};

const JobWorkOutstandingReport: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [outwardDocs, setOutwardDocs] = useState<any[]>([]);
  const [inwardDocs, setInwardDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [selectedArts, setSelectedArts] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [reportRows, setReportRows] = useState<JobWorkReportRow[]>([]);

  // Load the required master and challan data once. Show/filters work locally
  // and do not send repeated requests to the database.
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [partyResponse, processResponse, outwardResponse, inwardResponse] =
          await Promise.all([
            api.get("/party/category/Job_Work"),
            api.get("/process/list"),
            api.get("/job-outward-challan"),
            api.get("/job-inward-challan"),
          ]);

        if (!active) return;

        const partyData = Array.isArray(partyResponse.data)
          ? partyResponse.data
          : [];
        const processData = Array.isArray(processResponse.data)
          ? processResponse.data
          : [];
        const outwardData = Array.isArray(outwardResponse.data)
          ? outwardResponse.data
          : [];
        const inwardData = Array.isArray(inwardResponse.data)
          ? inwardResponse.data
          : [];

        setParties(partyData);
        setProcesses(
          processData
            .map((item: any) => ({
              serialNo: normalizeText(
                item.serialNo ?? item.processSerialNo ?? item.processId ??
                item.ProcessSerialNo ?? item.id ?? item.processCode
              ),
              processName: normalizeText(
                item.processName ?? item.ProcessName ?? item.name ??
                item.process ?? item.description
              ),
            }))
            .filter((item: Process) => item.serialNo || item.processName)
        );
        setOutwardDocs(outwardData);
        setInwardDocs(inwardData);
      } catch (loadError) {
        console.error("Failed to load Job Work Outstanding data:", loadError);
        if (active) {
          setError("Unable to load Job Work challan data. Please refresh and try again.");
          Swal.fire("Error", "Failed to load Job Work challan data.", "error");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const partyMap = useMemo(
    () => new Map(parties.map((party) => [normalizeText(party.id), party.partyName])),
    [parties]
  );
  const processMap = useMemo(
    () => new Map(processes.map((process) => [process.serialNo, process.processName])),
    [processes]
  );

  const options = useMemo(() => {
    const processValues = new Map<string, string>();
    const lotValues = new Set<string>();
    const artValues = new Set<string>();

    // Include every process from the process master, even if no challan exists yet.
    processes.forEach((process) => {
      const value = normalizeText(process.serialNo || process.processName);
      const label = normalizeText(process.processName || process.serialNo);
      if (value) processValues.set(value, label || value);
    });

    const collectOptions = (documents: any[]) => {
      documents.forEach((doc: any) => {
        const processId = normalizeText(
          doc.processSerialNo ?? doc.processId ?? doc.process?.serialNo ??
          doc.process?.id ?? doc.processName
        );
        const processLabel = normalizeText(
          doc.processName ?? doc.process?.processName ?? doc.process?.name
        );
        if (processId && !processValues.has(processId)) {
          processValues.set(processId, processMap.get(processId) || processLabel || processId);
        }

        (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
          const lot = normalizeLotNo(
            row.cutLotNo ?? row.cuttinglotNumber ?? row.cuttingLotNumber ??
            row.cutlotNo ?? row.lotNo
          );
          const art = normalizeText(row.artNo ?? row.art_no ?? row.art ?? row.artNumber);
          if (lot) lotValues.add(lot);
          if (art) artValues.add(art);
        });
      });
    };

    collectOptions(outwardDocs);
    collectOptions(inwardDocs);

    const sortOptions = (values: FilterOption[]) =>
      values.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

    return {
      parties: sortOptions(
        parties.map((party) => ({
          value: normalizeText(party.id),
          label: normalizeText(party.partyName),
        }))
      ),
      processes: sortOptions(
        Array.from(processValues.entries()).map(([value, label]) => ({ value, label }))
      ),
      lots: sortOptions(Array.from(lotValues).map((value) => ({ value, label: value }))),
      arts: sortOptions(Array.from(artValues).map((value) => ({ value, label: value }))),
    };
  }, [parties, processes, processMap, outwardDocs, inwardDocs]);

  const generatedRows = useMemo(() => {
    const map = new Map<string, JobWorkReportRow>();
    const outwardKeysByLot = new Map<string, string[]>();
    const outwardKeysByShortLot = new Map<string, string[]>();

    const makeKey = (
      partyId: string,
      processId: string,
      lotNo: string,
      artNo: string
    ) =>
      [
        normalizeKey(partyId),
        normalizeKey(processId),
        normalizeKey(lotNo),
        normalizeKey(artNo || "NO-ART"),
      ].join("|||");

    const dateInRange = (dateValue: any) => {
      const dateKey = toDateKey(dateValue);
      if (!fromDate && !toDate) return true;
      if (!dateKey) return false;
      if (fromDate && dateKey < fromDate) return false;
      if (toDate && dateKey > toDate) return false;
      return true;
    };

    const ensureRow = (
      partyId: string,
      processId: string,
      lotNo: string,
      artNo: string,
      sizeName: string,
      dateValue: any
    ) => {
      const key = makeKey(partyId, processId, lotNo, artNo);
      if (!map.has(key)) {
        map.set(key, {
          partyId,
          partyName: partyMap.get(partyId) || "Unknown Party",
          processId,
          processName: processMap.get(processId) || "Unknown Process",
          cuttingLotNo: lotNo,
          artNo,
          sizeName,
          outwardPcs: 0,
          inwardPcs: 0,
          outstandingPcs: 0,
          outwardChallans: [],
          inwardChallans: [],
          outwardDate: toDateKey(dateValue),
        });
      } else {
        const current = map.get(key)!;
        if (sizeName && !current.sizeName) current.sizeName = sizeName;
        const currentDate = current.outwardDate;
        const nextDate = toDateKey(dateValue);
        if (nextDate && (!currentDate || nextDate < currentDate)) {
          current.outwardDate = nextDate;
        }
      }
      return key;
    };

    outwardDocs.forEach((doc: any) => {
      const partyId = normalizeText(doc.partyId ?? doc.party?.id);
      const processId = normalizeText(doc.processSerialNo ?? doc.processId ?? doc.process?.serialNo ?? doc.process?.id ?? doc.processName);
      const challanDate = doc.date ?? doc.dated;
      if (!dateInRange(challanDate)) return;

      (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
        const lotNo = normalizeLotNo(
          row.cutLotNo ?? row.cuttinglotNumber ?? row.cuttingLotNumber
        );
        const artNo = normalizeText(row.artNo ?? row.art_no);
        const sizeName = normalizeText(row.size ?? row.sizeName);
        if (!partyId || !processId || !lotNo) return;

        const key = ensureRow(
          partyId,
          processId,
          lotNo,
          artNo,
          sizeName,
          challanDate
        );
        const current = map.get(key)!;
        current.outwardPcs += toNumber(row.pcs);
        const challanNo = normalizeText(doc.orderChallanNo ?? doc.challanNo ?? doc.serialNo);
        if (challanNo && !current.outwardChallans.includes(challanNo)) {
          current.outwardChallans.push(challanNo);
        }

        const lotKey = [
          normalizeKey(partyId),
          normalizeKey(processId),
          normalizeKey(lotNo),
        ].join("|||");
        const keys = outwardKeysByLot.get(lotKey) || [];
        if (!keys.includes(key)) keys.push(key);
        outwardKeysByLot.set(lotKey, keys);
        const shortKey = [
          normalizeKey(partyId),
          normalizeKey(processId),
          normalizeKey(shortLotNo(lotNo)),
        ].join("|||");
        const shortKeys = outwardKeysByShortLot.get(shortKey) || [];
        if (!shortKeys.includes(key)) shortKeys.push(key);
        outwardKeysByShortLot.set(shortKey, shortKeys);
      });
    });

    inwardDocs.forEach((doc: any) => {
      const partyId = normalizeText(doc.partyId ?? doc.party?.id);
      const processId = normalizeText(doc.processId ?? doc.processSerialNo ?? doc.process?.serialNo ?? doc.process?.id ?? doc.processName);
      const challanDate = doc.date;
      if (!dateInRange(challanDate)) return;

      (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
        const lotNo = normalizeLotNo(
          row.cuttinglotNumber ?? row.cutLotNo ?? row.cuttingLotNumber
        );
        const artNo = normalizeText(row.artNo ?? row.art_no);
        const sizeName = normalizeText(row.sizeName ?? row.size);
        if (!partyId || !processId || !lotNo) return;

        // First try the exact composite key. Legacy inward records often store
        // only the final lot segment (e.g. 1283), while outward stores the full
        // generated lot (e.g. 2026-0066-1283). Also, older API records can expose
        // process id/name differently between the two challan endpoints.
        let key = makeKey(partyId, processId, lotNo, artNo);
        if (!map.has(key)) {
          const samePartyLotArt = Array.from(map.entries()).filter(([, outward]) => {
            if (outward.outwardPcs <= 0) return false;
            if (normalizeKey(outward.partyId) !== normalizeKey(partyId)) return false;

            const outwardLot = normalizeKey(outward.cuttingLotNo);
            const inwardLot = normalizeKey(lotNo);
            const sameLot = outwardLot === inwardLot ||
              normalizeKey(shortLotNo(outward.cuttingLotNo)) === normalizeKey(shortLotNo(lotNo));
            if (!sameLot) return false;

            // If inward art is supplied, require it to match. If it is absent,
            // only a unique lot candidate may be used below.
            if (artNo && normalizeKey(outward.artNo) !== normalizeKey(artNo)) return false;
            return true;
          });

          const processNameFor = (id: string, docName?: any) =>
            normalizeKey(processMap.get(id) || docName || id);
          const inwardProcessName = processNameFor(
            processId,
            doc.processName ?? doc.process?.processName ?? doc.process?.name
          );
          const processMatches = samePartyLotArt.filter(([, outward]) =>
            normalizeKey(outward.processId) === normalizeKey(processId) ||
            processNameFor(outward.processId, outward.processName) === inwardProcessName
          );

          // Prefer a unique process match. If process identifiers differ across
          // legacy records, accept a unique party + lot + art match; never guess
          // when more than one outward row could receive the inward quantity.
          const candidates = processMatches.length ? processMatches : samePartyLotArt;
          if (candidates.length === 1) key = candidates[0][0];
        }

        if (!map.has(key)) {
          // Keep unmatched inward quantities visible rather than silently
          // dropping a transaction. The normal report will show it separately.
          key = ensureRow(partyId, processId, lotNo, artNo, sizeName, challanDate);
        }

        const current = map.get(key)!;
        current.inwardPcs += toNumber(row.pcs);
        const challanNo = normalizeText(doc.challanNo ?? doc.serialNo ?? doc.id);
        if (challanNo && !current.inwardChallans.includes(challanNo)) {
          current.inwardChallans.push(challanNo);
        }
      });
    });

    const rows = Array.from(map.values()).map((row) => ({
      ...row,
      outstandingPcs: row.outwardPcs - row.inwardPcs,
    }));

    return rows
      .filter((row) => {
        if (selectedParties.length && !selectedParties.includes(row.partyId)) return false;
        if (selectedProcesses.length && !selectedProcesses.includes(row.processId)) return false;
        if (selectedLots.length && !selectedLots.some((lot) => normalizeKey(lot) === normalizeKey(row.cuttingLotNo))) return false;
        if (selectedArts.length && !selectedArts.some((art) => normalizeKey(art) === normalizeKey(row.artNo))) return false;
        if (!includeCompleted && row.outstandingPcs <= 0.000001) return false;
        return true;
      })
      .sort((a, b) =>
        a.partyName.localeCompare(b.partyName) ||
        a.processName.localeCompare(b.processName) ||
        a.cuttingLotNo.localeCompare(b.cuttingLotNo, undefined, { numeric: true }) ||
        a.artNo.localeCompare(b.artNo)
      );
  }, [
    outwardDocs,
    inwardDocs,
    partyMap,
    processMap,
    selectedParties,
    selectedProcesses,
    selectedLots,
    selectedArts,
    fromDate,
    toDate,
    includeCompleted,
  ]);

  const handleShowReport = () => {
    if (fromDate && toDate && fromDate > toDate) {
      Swal.fire("Invalid Date Range", "From Date cannot be later than To Date.", "warning");
      return;
    }
    setReportRows(generatedRows);
    setHasGenerated(true);
  };

  const clearFilters = () => {
    setSelectedParties([]);
    setSelectedProcesses([]);
    setSelectedLots([]);
    setSelectedArts([]);
    setFromDate("");
    setToDate("");
    setIncludeCompleted(false);
    setReportRows([]);
    setHasGenerated(false);
  };

  const totals = useMemo(
    () =>
      reportRows.reduce(
        (result, row) => ({
          outward: result.outward + row.outwardPcs,
          inward: result.inward + row.inwardPcs,
          outstanding: result.outstanding + row.outstandingPcs,
        }),
        { outward: 0, inward: 0, outstanding: 0 }
      ),
    [reportRows]
  );

  const handleExportCsv = () => {
    if (!reportRows.length) {
      Swal.fire("No Data", "There are no report rows to export.", "info");
      return;
    }
    const headers = [
      "Party Name",
      "Process Name",
      "Cutting Lot No",
      "Art No",
      "Size",
      "Outward Pcs",
      "Inward Pcs",
      "Outstanding Pcs",
      "Outward Challan No(s)",
      "Inward Challan No(s)",
      "Outward Date",
    ];
    const escapeCsv = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escapeCsv).join(","),
      ...reportRows.map((row) =>
        [
          row.partyName,
          row.processName,
          row.cuttingLotNo,
          row.artNo,
          row.sizeName,
          row.outwardPcs,
          row.inwardPcs,
          row.outstandingPcs,
          row.outwardChallans.join("; "),
          row.inwardChallans.join("; "),
          row.outwardDate,
        ]
          .map(escapeCsv)
          .join(",")
      ),
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        totals.outward,
        totals.inward,
        totals.outstanding,
        "",
        "",
        "",
      ]
        .map(escapeCsv)
        .join(","),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Job_Work_Outstanding_Report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!reportRows.length) {
      Swal.fire("No Data", "There are no report rows to print.", "info");
      return;
    }
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      Swal.fire("Popup Blocked", "Please allow popups to print the report.", "warning");
      return;
    }
    const escapeHtml = (value: any) =>
      String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[char];
      });

    const rowsHtml = reportRows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.partyName)}</td>
            <td>${escapeHtml(row.processName)}</td>
            <td>${escapeHtml(row.cuttingLotNo)}</td>
            <td>${escapeHtml(row.artNo)}</td>
            <td>${escapeHtml(row.sizeName)}</td>
            <td class="number">${formatNumber(row.outwardPcs)}</td>
            <td class="number">${formatNumber(row.inwardPcs)}</td>
            <td class="number outstanding">${formatNumber(row.outstandingPcs)}</td>
          </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Job Work Outstanding Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            h1 { text-align: center; font-size: 22px; }
            .subtitle { text-align: center; margin-bottom: 16px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #555; padding: 7px; }
            th { background: #e5e7eb; }
            .number { text-align: right; }
            .outstanding { font-weight: bold; }
            tfoot td { font-weight: bold; background: #e5e7eb; }
            @page { size: landscape; margin: 10mm; }
          </style>
        </head>
        <body>
          <h1>Job Work Outstanding Report</h1>
          <div class="subtitle">Outstanding Pcs = Outward Pcs - Inward Pcs</div>
          <table>
            <thead>
              <tr>
                <th>S.No.</th><th>Party</th><th>Process</th><th>Cutting Lot No.</th>
                <th>Art No.</th><th>Size</th><th>Outward Pcs</th>
                <th>Inward Pcs</th><th>Outstanding Pcs</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="text-align:right">TOTAL</td>
                <td class="number">${formatNumber(totals.outward)}</td>
                <td class="number">${formatNumber(totals.inward)}</td>
                <td class="number">${formatNumber(totals.outstanding)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dashboard>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto bg-white rounded-xl shadow-md p-4 md:p-6">
          <div className="bg-blue-600 text-white text-center rounded-lg py-3 mb-5">
            <h1 className="text-xl md:text-2xl font-bold">Job Work Outstanding Report</h1>
            <p className="text-sm opacity-90 mt-1">Outward Pcs - Inward Pcs = Outstanding Pcs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block font-semibold mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <MultiSelectFilter
              title="Select Party"
              placeholder="Search Party..."
              options={options.parties}
              selected={selectedParties}
              onChange={setSelectedParties}
              accent="blue"
            />
            <MultiSelectFilter
              title="Select Process"
              placeholder="Search Process..."
              options={options.processes}
              selected={selectedProcesses}
              onChange={setSelectedProcesses}
              accent="green"
            />
            <MultiSelectFilter
              title="Select Cutting Lot No."
              placeholder="Search Cutting Lot..."
              options={options.lots}
              selected={selectedLots}
              onChange={setSelectedLots}
              accent="amber"
            />
            <MultiSelectFilter
              title="Select Art No."
              placeholder="Search Art No..."
              options={options.arts}
              selected={selectedArts}
              onChange={setSelectedArts}
              accent="purple"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCompleted}
                onChange={(event) => setIncludeCompleted(event.target.checked)}
              />
              Include completed and excess records
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleShowReport}
                disabled={loading}
                className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Show Report"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="py-10 text-center text-gray-500">Loading Job Work challan data...</div>
          )}
          {!loading && error && (
            <div className="py-6 text-center text-red-600">{error}</div>
          )}

          {!loading && hasGenerated && (
            <div className="fixed inset-0 z-[1300] bg-black/60 flex items-start justify-center p-3 md:p-6">
              <div className="bg-white w-full max-w-[1600px] max-h-[94vh] overflow-y-auto rounded-xl shadow-2xl p-4 md:p-6">
                <div className="flex items-center justify-between gap-3 border-b pb-3 mb-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">Job Work Outstanding Report</h2>
                    <p className="text-sm text-gray-500">{reportRows.length} record(s) · Outstanding = Outward - Inward</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasGenerated(false)}
                    className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-800"
                  >
                    Close
                  </button>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="text-sm text-gray-600">Total Outward Pcs</div>
                  <div className="text-2xl font-bold">{formatNumber(totals.outward)}</div>
                </div>
                <div className="rounded-lg border bg-green-50 p-4">
                  <div className="text-sm text-gray-600">Total Inward Pcs</div>
                  <div className="text-2xl font-bold">{formatNumber(totals.inward)}</div>
                </div>
                <div className="rounded-lg border bg-amber-50 p-4">
                  <div className="text-sm text-gray-600">Total Outstanding Pcs</div>
                  <div className="text-2xl font-bold">{formatNumber(totals.outstanding)}</div>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <div className="text-sm text-gray-600">
                  {reportRows.length} record(s) · {selectedParties.length ? selectedParties.length + " party selected" : "All parties"}
                  {" · "}{selectedProcesses.length ? selectedProcesses.length + " process selected" : "All processes"}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Print
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-[1100px] w-full text-sm border-collapse">
                  <thead className="bg-blue-100 sticky top-0">
                    <tr>
                      {[
                        "S.No.",
                        "Party Name",
                        "Process",
                        "Cutting Lot No.",
                        "Art No.",
                        "Size",
                        "Outward Pcs",
                        "Inward Pcs",
                        "Outstanding Pcs",
                        "Outward Challan",
                        "Inward Challan",
                      ].map((heading) => (
                        <th key={heading} className="border p-2 text-center whitespace-nowrap">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-gray-500">
                          No outstanding records found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      reportRows.map((row, index) => (
                        <tr key={`${row.partyId}-${row.processId}-${row.cuttingLotNo}-${row.artNo}-${index}`} className="hover:bg-gray-50">
                          <td className="border p-2 text-center">{index + 1}</td>
                          <td className="border p-2">{row.partyName}</td>
                          <td className="border p-2">{row.processName}</td>
                          <td className="border p-2 font-medium">{row.cuttingLotNo}</td>
                          <td className="border p-2">{row.artNo || "-"}</td>
                          <td className="border p-2">{row.sizeName || "-"}</td>
                          <td className="border p-2 text-right">{formatNumber(row.outwardPcs)}</td>
                          <td className="border p-2 text-right">{formatNumber(row.inwardPcs)}</td>
                          <td className={`border p-2 text-right font-bold ${row.outstandingPcs > 0 ? "text-orange-700" : row.outstandingPcs < 0 ? "text-red-700" : "text-green-700"}`}>
                            {formatNumber(row.outstandingPcs)}
                          </td>
                          <td className="border p-2">{row.outwardChallans.join(", ") || "-"}</td>
                          <td className="border p-2">{row.inwardChallans.join(", ") || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {reportRows.length > 0 && (
                    <tfoot className="bg-gray-100 font-bold">
                      <tr>
                        <td colSpan={6} className="border p-2 text-right">TOTAL</td>
                        <td className="border p-2 text-right">{formatNumber(totals.outward)}</td>
                        <td className="border p-2 text-right">{formatNumber(totals.inward)}</td>
                        <td className="border p-2 text-right">{formatNumber(totals.outstanding)}</td>
                        <td colSpan={2} className="border p-2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default JobWorkOutstandingReport;
