// src/pages/Reports/JobWorkReport.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

/**
 Job Work Report (Pending Pcs) - Aggregated by Lot
 - Loads Job Outward and Inward challans
 - Groups by Process + Party + Lot (single row per lot)
 - Art No column shows combined art values found in outward/inward (e.g. "AN-101 / ART202551344")
 - Date is taken from Inward (earliest inward date in range; fallback earliest inward overall)
 - Pending = max(0, Outward - Inward - Wastage)
 - Rate chosen from latest inward rate (prefer within range, else latest overall)
 - Amount = Pending * Rate
 - Display columns: S No | Date | Art No | Lot No | Outward | Inward | Wastage | Pending | Rate | Amount
 - Process dropdown includes "All Processes"
*/

type Party = { id: number | string; partyName: string };
type Process = { serialNo?: string; SerialNo?: string; processName: string };

type Tx = {
  pcs: number;
  dateTS: number;
  rate?: number;
  art?: string;
  wastage?: number;
};

type GroupState = {
  key: string;
  processSerial: string;
  processName: string;
  partyId: string;
  partyName: string;
  lotNo: string;
  artSet: Set<string>;
  outwardTx: Tx[];
  inwardTx: Tx[];
};

type Sorting = "Date Wise" | "Art No Wise" | "Lot Wise";

// ---------- utils ----------
const norm = (v: any) =>
  String(v ?? "")
    .trim()
    .toUpperCase();
const toTS = (iso: string) => {
  if (!iso) return 0;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};
const endOfDay = (iso: string) => toTS(iso) + 24 * 60 * 60 * 1000 - 1;
const dd = (n: number) => String(n).padStart(2, "0");
const fmtDate = (ts: number) => {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime())
    ? ""
    : `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const startOfYearISO = () => {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt2 = (n: number) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmt3 = (n: number) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

// join artSet to display string (unique, preserve order loosely)
const joinArts = (set: Set<string>) => {
  const arr = Array.from(set).filter(Boolean);
  return arr.join(" / ");
};

// ---------- component ----------
const JobWorkReport: React.FC = () => {
  // masters
  const [parties, setParties] = useState<Party[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  // raw docs
  const [outwardDocs, setOutwardDocs] = useState<any[]>([]);
  const [inwardDocs, setInwardDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  // empty processSerial means "All processes"
  const [processSerial, setProcessSerial] = useState<string>("");
  const [partyId, setPartyId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(startOfYearISO());
  const [toDate, setToDate] = useState<string>(todayISO());
  const [sorting, setSorting] = useState<Sorting>("Date Wise");

  const [showModal, setShowModal] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // ref for printing only the table/list area
  const printRef = useRef<HTMLDivElement | null>(null);

  // load all data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [partyRes, procRes, outRes, inRes] = await Promise.all([
          api.get("/party/category/Job_Work"),
          api.get("/process/list"),
          api.get("/job-outward-challan"),
          api.get("/job-inward-challan"),
        ]);
        setParties(Array.isArray(partyRes.data) ? partyRes.data : []);
        const proc = Array.isArray(procRes.data) ? procRes.data : [];
        setProcesses(proc);
        setOutwardDocs(Array.isArray(outRes.data) ? outRes.data : []);
        setInwardDocs(Array.isArray(inRes.data) ? inRes.data : []);
        // leave processSerial empty by default so user can pick "All Processes"
      } catch (e) {
        console.error("Failed to load report data:", e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // maps
  const processNameBySerial = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of processes) {
      m.set(
        String(p.serialNo ?? p.SerialNo ?? ""),
        String(p.processName ?? "")
      );
    }
    return m;
  }, [processes]);

  const partyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of parties) m.set(String(p.id), String(p.partyName || ""));
    return m;
  }, [parties]);

  // build groups aggregated by LOT (single row per lot)
  const groups = useMemo<GroupState[]>(() => {
    const map = new Map<string, GroupState>();

    const ensure = (
      ps: string,
      pid: string,
      lotRaw: string,
      docPartyName?: string
    ): GroupState => {
      const key = [ps, pid, norm(lotRaw)].join("||");
      let g = map.get(key);
      if (!g) {
        const pName = docPartyName || partyNameById.get(pid) || "";
        g = {
          key,
          processSerial: ps,
          processName: processNameBySerial.get(ps) || "",
          partyId: pid,
          partyName: pName,
          lotNo: String(lotRaw || ""),
          artSet: new Set<string>(),
          outwardTx: [],
          inwardTx: [],
        };
        map.set(key, g);
      } else {
        if (!g.partyName)
          g.partyName = docPartyName || partyNameById.get(pid) || "";
        if (!g.processName) g.processName = processNameBySerial.get(ps) || "";
      }
      return g;
    };

    // Outward: collect pcs & art
    for (const d of outwardDocs) {
      const ps = String(
        d.processSerialNo ?? d.processId ?? d.processSerial ?? ""
      );
      const pid = String(d.partyId ?? d.partyID ?? d.party ?? "");
      const pName = String(d.partyName ?? "") || partyNameById.get(pid) || "";
      const baseTS = toTS(String(d.date || ""));
      const rows = Array.isArray(d.rows) ? d.rows : [];
      for (const r of rows) {
        const lot = String(
          r.cutLotNo ??
            r.cuttinglotNumber ??
            r.cuttingLotNumber ??
            r.cutlotNo ??
            r.cuttingLotNo ??
            ""
        );
        const art = String(r.artNo ?? r.art_no ?? r.art ?? "").trim();
        const pcs = Number(r.pcs ?? 0) || 0;
        if (!ps || !pid || !lot) continue; // require lot to aggregate by lot
        const g = ensure(ps, pid, lot, pName);
        if (art) g.artSet.add(art);
        g.outwardTx.push({ pcs, dateTS: baseTS, art });
      }
    }

    // Inward: collect pcs, art, rate & wastage
    for (const d of inwardDocs) {
      const ps = String(
        d.processId ?? d.processSerialNo ?? d.processSerial ?? ""
      );
      const pid = String(d.partyId ?? d.partyID ?? d.party ?? "");
      const pName = String(d.partyName ?? "") || partyNameById.get(pid) || "";
      const baseTS = toTS(String(d.date || ""));
      const rows = Array.isArray(d.rows) ? d.rows : [];
      for (const r of rows) {
        const lot = String(
          r.cutLotNo ??
            r.cuttinglotNumber ??
            r.cuttingLotNumber ??
            r.cutlotNo ??
            ""
        );
        const art = String(r.artNo ?? r.art_no ?? r.art ?? "").trim();
        const pcs = Number(r.pcs ?? 0) || 0;
        // treat wastage as numeric pcs if provided; if it's percentage you'd need to convert
        const wastage =
          r.wastage == null || r.wastage === "" || isNaN(Number(r.wastage))
            ? 0
            : Number(r.wastage);
        const rate =
          r.rate == null || r.rate === "" || isNaN(Number(r.rate))
            ? undefined
            : Number(r.rate);
        if (!ps || !pid || !lot) continue; // require lot
        const g = ensure(ps, pid, lot, pName);
        if (art) g.artSet.add(art);
        g.inwardTx.push({ pcs, dateTS: baseTS, rate, art, wastage });
      }
    }

    return Array.from(map.values());
  }, [outwardDocs, inwardDocs, partyNameById, processNameBySerial]);

  // parties filtered by process + date range (has any tx within range)
  const partiesForProcess = useMemo(() => {
    const fromTS = toTS(fromDate);
    const toTSv = endOfDay(toDate);
    const set = new Map<string, string>();
    for (const g of groups) {
      if (processSerial && g.processSerial !== processSerial) continue;
      const hasInRange =
        g.outwardTx.some((t) => t.dateTS >= fromTS && t.dateTS <= toTSv) ||
        g.inwardTx.some((t) => t.dateTS >= fromTS && t.dateTS <= toTSv);
      if (!hasInRange) continue;
      set.set(
        g.partyId,
        g.partyName || partyNameById.get(g.partyId) || g.partyId
      );
    }
    return Array.from(set.entries())
      .map(([id, name]) => ({ id, name: name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, processSerial, fromDate, toDate, partyNameById]);

  // selected names
  const selectedProcessName = useMemo(
    () =>
      processSerial ? processNameBySerial.get(processSerial) || "" : "All",
    [processSerial, processNameBySerial]
  );
  const selectedPartyName = useMemo(() => {
    if (!partyId) return "";
    return (
      partiesForProcess.find((p) => String(p.id) === String(partyId))?.name ||
      ""
    );
  }, [partyId, partiesForProcess]);

  // build display rows for current filters (one row per lot)
  const displayRows = useMemo(() => {
    const fromTS = toTS(fromDate);
    const toTSv = endOfDay(toDate);

    type Row = {
      key: string;
      dateTS: number;
      dateStr: string;
      artNoCombined: string;
      lotNo: string;
      outward: number;
      inward: number;
      wastage: number;
      pending: number;
      rate: number;
      amount: number;
    };

    const rows: Row[] = [];

    for (const g of groups) {
      if (processSerial && g.processSerial !== processSerial) continue;
      if (partyId && g.partyId !== partyId) continue;

      const outsInRange = g.outwardTx.filter(
        (t) => t.dateTS >= fromTS && t.dateTS <= toTSv
      );
      const insInRange = g.inwardTx.filter(
        (t) => t.dateTS >= fromTS && t.dateTS <= toTSv
      );

      if (outsInRange.length === 0 && insInRange.length === 0) continue;

      const outward = outsInRange.reduce((s, t) => s + (t.pcs || 0), 0);
      const inward = insInRange.reduce((s, t) => s + (t.pcs || 0), 0);
      const wastageInRange = insInRange.reduce(
        (s, t) => s + (t.wastage || 0),
        0
      );

      // Pending calculation includes wastage (absolute pcs)
      const pending = Math.max(0, outward - inward - wastageInRange);

      // pick rate: prefer latest inward WITHIN range that has rate, else latest inward overall
      const latestInRange = insInRange
        .filter(
          (t) => (t as any).rate != null && !isNaN(Number((t as any).rate))
        )
        .sort((a, b) => b.dateTS - a.dateTS)[0];
      let rate = latestInRange?.rate ?? undefined;
      if (rate == null) {
        const latestOverall = g.inwardTx
          .filter(
            (t) => (t as any).rate != null && !isNaN(Number((t as any).rate))
          )
          .sort((a, b) => b.dateTS - a.dateTS)[0];
        rate = latestOverall?.rate ?? 0;
      }
      rate = Number(rate || 0);

      const amount = Number((pending * rate).toFixed(2));

      // date: earliest inward date in range; fallback earliest inward overall; fallback earliest overall
      const inwardDatesInRange = insInRange.map((t) => t.dateTS);
      const inwardAllDates = g.inwardTx.map((t) => t.dateTS);
      let dateTS = 0;
      if (inwardDatesInRange.length) dateTS = Math.min(...inwardDatesInRange);
      else if (inwardAllDates.length) dateTS = Math.min(...inwardAllDates);
      else {
        const allDates = [...g.outwardTx, ...g.inwardTx].map((t) => t.dateTS);
        dateTS = allDates.length ? Math.min(...allDates) : 0;
      }

      const artCombined = joinArts(g.artSet);

      rows.push({
        key: g.key,
        dateTS,
        dateStr: fmtDate(dateTS),
        artNoCombined: artCombined,
        lotNo: g.lotNo || "",
        outward,
        inward,
        wastage: wastageInRange,
        pending,
        rate,
        amount,
      });
    }

    // sorting
    switch (sorting) {
      case "Date Wise":
        rows.sort((a, b) => {
          if (a.dateTS !== b.dateTS) return a.dateTS - b.dateTS;
          if (a.lotNo !== b.lotNo) return a.lotNo.localeCompare(b.lotNo);
          return a.artNoCombined.localeCompare(b.artNoCombined);
        });
        break;
      case "Art No Wise":
        rows.sort((a, b) => {
          if (a.artNoCombined !== b.artNoCombined)
            return a.artNoCombined.localeCompare(b.artNoCombined);
          if (a.dateTS !== b.dateTS) return a.dateTS - b.dateTS;
          return a.lotNo.localeCompare(b.lotNo);
        });
        break;
      case "Lot Wise":
        rows.sort((a, b) => {
          if (a.lotNo !== b.lotNo) return a.lotNo.localeCompare(b.lotNo);
          if (a.dateTS !== b.dateTS) return a.dateTS - b.dateTS;
          return a.artNoCombined.localeCompare(b.artNoCombined);
        });
        break;
    }

    return rows;
  }, [groups, processSerial, partyId, fromDate, toDate, sorting]);

  // totals
  const totals = useMemo(() => {
    const outwardTotal = displayRows.reduce((s, r) => s + (r.outward || 0), 0);
    const inwardTotal = displayRows.reduce((s, r) => s + (r.inward || 0), 0);
    const pending = displayRows.reduce((s, r) => s + (r.pending || 0), 0);
    const totalWastage = displayRows.reduce((s, r) => s + (r.wastage || 0), 0);
    const amount = Number(
      displayRows.reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)
    );
    return {
      rows: displayRows.length,
      outwardTotal,
      inwardTotal,
      pending,
      amount,
      totalWastage,
    };
  }, [displayRows]);

  const handleShow = () => {
    if (!partyId) {
      alert("Please select a Party from the dropdown before clicking Show.");
      return;
    }
    setShowModal(true);
  };

  const resetAll = () => {
    setProcessSerial(""); // All
    setPartyId("");
    setFromDate(startOfYearISO());
    setToDate(todayISO());
    setSorting("Date Wise");
    setShowModal(false);
    setFullScreen(false);
  };

  // Print handler (prints only the table/list area)
  const handlePrint = () => {
    if (!printRef.current) return;

    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "", "height=800,width=1100");
    if (!printWindow) return;

    const fromStr = fmtDate(toTS(fromDate));
    const toStr = fmtDate(toTS(toDate));

    printWindow.document.write(`
      <html>
        <head>
          <title>Job Work Report (Pending Pcs)</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              padding: 10px;
            }
            h2 {
              margin: 0 0 6px 0;
            }
            .meta-line {
              margin-bottom: 4px;
              font-size: 11px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px 6px;
            }
            th {
              background: #f3f3f3;
            }
            .text-right {
              text-align: right;
            }
            .font-semibold {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <h2>Job Work Report (Pending Pcs)</h2>
          <div class="meta-line">
            <strong>Process:</strong> ${
              selectedProcessName || ""
            } &nbsp; | &nbsp;
            <strong>Party:</strong> ${selectedPartyName || ""} &nbsp; | &nbsp;
            <strong>From:</strong> ${fromStr} &nbsp; | &nbsp;
            <strong>To:</strong> ${toStr}
          </div>
          <div class="meta-line">
            Rows: ${totals.rows} &nbsp; | &nbsp;
            Outward Pcs: ${totals.outwardTotal.toLocaleString()} &nbsp; | &nbsp;
            Inward Pcs: ${totals.inwardTotal.toLocaleString()} &nbsp; | &nbsp;
            Pending Pcs: ${totals.pending.toLocaleString()} &nbsp; | &nbsp;
            Wastage Pcs: ${totals.totalWastage.toLocaleString()} &nbsp; | &nbsp;
            Amount: ${fmt2(totals.amount)}
          </div>
          ${printContents}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-3">
            Job Work Report (Pending Pcs)
          </h2>

          {/* Controls */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <label className="block text-sm">Process Name</label>
              <select
                value={processSerial}
                onChange={(e) => {
                  setProcessSerial(e.target.value);
                  setPartyId("");
                }}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">-- All Processes --</option>
                {processes.map((p, idx) => {
                  const val = String(p.serialNo ?? p.SerialNo ?? "");
                  return (
                    <option key={val || idx} value={val}>
                      {p.processName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="col-span-3">
              <label className="block text-sm">Party Name</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">-- Select Party --</option>
                {partiesForProcess.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm">Sort</label>
              <select
                value={sorting}
                onChange={(e) => setSorting(e.target.value as Sorting)}
                className="mt-1 p-2 border rounded w-full"
              >
                <option>Date Wise</option>
                <option>Art No Wise</option>
                <option>Lot Wise</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
              onClick={handleShow}
              disabled={loading}
            >
              {loading ? "Loading..." : "Show"}
            </button>
            <button className="px-4 py-2 border rounded" onClick={resetAll}>
              Reset
            </button>

            <div className="ml-auto text-sm text-gray-700">
              Rows: <strong>{totals.rows}</strong> | Outward Pcs:{" "}
              <strong>{totals.outwardTotal.toLocaleString()}</strong> | Inward
              Pcs: <strong>{totals.inwardTotal.toLocaleString()}</strong> |
              Pending Pcs: <strong>{totals.pending.toLocaleString()}</strong> |
              Wastage Pcs:{" "}
              <strong>{totals.totalWastage.toLocaleString()}</strong> | Amount:{" "}
              <strong>{fmt2(totals.amount)}</strong>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
            <div
              className="absolute inset-0 bg-black opacity-30"
              onClick={() => setShowModal(false)}
            />
            <div
              className={`relative bg-white rounded shadow overflow-hidden ${
                fullScreen ? "w-full h-full m-0" : "w-[95%] lg:w-[90%] m-4"
              }`}
              style={{ maxHeight: fullScreen ? "100vh" : "90vh" }}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div>
                  <div className="text-sm text-gray-700">
                    <strong>Process:</strong> {selectedProcessName} &nbsp; |
                    &nbsp;
                    <strong>Party:</strong> {selectedPartyName} &nbsp; | &nbsp;
                    <strong>From:</strong> {fmtDate(toTS(fromDate))} &nbsp; |
                    &nbsp;
                    <strong>To:</strong> {fmtDate(toTS(toDate))}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Rows: {totals.rows} | Outward Pcs:{" "}
                    {totals.outwardTotal.toLocaleString()} | Inward Pcs:{" "}
                    {totals.inwardTotal.toLocaleString()} | Pending Pcs:{" "}
                    {totals.pending.toLocaleString()} | WastagePcs:{" "}
                    {totals.totalWastage.toLocaleString()} | Amount:{" "}
                    {fmt2(totals.amount)} | Sort: {sorting} (Ascending)
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
                <div className="min-w-max" ref={printRef}>
                  <table className="w-full table-auto text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 border">S No</th>
                        <th className="px-2 py-1 border">Date</th>
                        <th className="px-2 py-1 border">Art No</th>
                        <th className="px-2 py-1 border">Lot No</th>
                        <th className="px-2 py-1 border text-right">
                          Outward Pcs
                        </th>
                        <th className="px-2 py-1 border text-right">
                          Inward Pcs
                        </th>
                        <th className="px-2 py-1 border text-right">
                          Wastage Pcs
                        </th>
                        <th className="px-2 py-1 border text-right">
                          Pending Pcs
                        </th>
                        <th className="px-2 py-1 border text-right">Rate</th>
                        <th className="px-2 py-1 border text-right">
                          Amount (Pending × Rate)
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {displayRows.map((r, idx) => (
                        <tr
                          key={r.key}
                          className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-2 py-1 border">{idx + 1}</td>
                          <td className="px-2 py-1 border">{r.dateStr}</td>
                          <td className="px-2 py-1 border">
                            {r.artNoCombined}
                          </td>
                          <td className="px-2 py-1 border">{r.lotNo}</td>
                          <td className="px-2 py-1 border text-right">
                            {r.outward.toLocaleString()}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {r.inward.toLocaleString()}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {Number(r.wastage || 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-1 border text-right font-semibold">
                            {r.pending.toLocaleString()}
                          </td>
                          <td className="px-2 py-1 border text-right">
                            {fmt3(r.rate)}
                          </td>
                          <td className="px-2 py-1 border text-right font-semibold">
                            {fmt2(r.amount)}
                          </td>
                        </tr>
                      ))}

                      {/* totals */}
                      <tr>
                        <td colSpan={10} className="p-0">
                          <div className="w-full bg-white border-t">
                            <div className="p-3 flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold">
                                  Totals
                                </div>
                                <div className="text-xs text-gray-700 mt-1">
                                  Rows: <strong>{totals.rows}</strong>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-semibold">
                                  Outward Pcs:{" "}
                                  <strong>
                                    {totals.outwardTotal.toLocaleString()}
                                  </strong>
                                </div>
                                <div className="text-sm font-semibold">
                                  Inward Pcs:{" "}
                                  <strong>
                                    {totals.inwardTotal.toLocaleString()}
                                  </strong>
                                </div>
                                <div className="text-sm font-semibold mt-1">
                                  Wastage Pcs:{" "}
                                  <strong>
                                    {totals.totalWastage.toLocaleString()}
                                  </strong>
                                </div>
                                <div className="text-sm font-semibold mt-1">
                                  Pending Pcs:{" "}
                                  <strong>
                                    {totals.pending.toLocaleString()}
                                  </strong>
                                </div>
                                <div className="text-sm font-semibold mt-1">
                                  Amount: <strong>{fmt2(totals.amount)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {displayRows.length === 0 && (
                        <tr>
                          <td
                            className="text-center text-gray-600 py-4"
                            colSpan={10}
                          >
                            No rows found for selected filters.
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
    </Dashboard>
  );
};

export default JobWorkReport;
