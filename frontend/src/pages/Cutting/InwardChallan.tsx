"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

interface RowData {
  id: number;
  cuttinglotNumber: string; // ✅ ONLY cutLotNo
  cuttingDozen: string;
  artNo: string;
  sizeName: string;
  pcs: string | number;
  wastage: string | number;
  rate: string | number;
  amount: string | number;
  selected: boolean;
}

interface InwardChallanForm {
  id?: number;
  date: string;
  challanNo: string;
  partyId: string;
  processId: string;
  artHeader: string;
  remarks: string;
  adjustLot: string;
  rows: RowData[];
}

interface Party {
  id: number;
  partyName: string;
}
interface Process {
  serialNo: string;
  processName: string;
}

const ProcessSearchSelect: React.FC<{
  processes: Process[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ processes, value, onChange, placeholder = "Select Process" }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedProcess = processes.find((process) => String(process.serialNo) === String(value));
  const filteredProcesses = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    if (!searchText) return processes;
    return processes.filter((process) =>
      String(process.processName || "").toLowerCase().includes(searchText) ||
      String(process.serialNo || "").toLowerCase().includes(searchText)
    );
  }, [processes, query]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setOpen((previous) => !previous);
          setQuery("");
        }}
        className="border p-2 rounded w-full bg-white text-left flex items-center justify-between min-h-[42px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedProcess ? "text-gray-900" : "text-gray-500"}>
          {selectedProcess?.processName || placeholder}
        </span>
        <span className="ml-2 text-gray-600">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b bg-white">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search process..."
              className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto" role="listbox">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-500"
            >
              {placeholder}
            </button>
            {filteredProcesses.map((process) => (
              <button
                type="button"
                key={process.serialNo}
                role="option"
                aria-selected={String(process.serialNo) === String(value)}
                onClick={() => {
                  onChange(process.serialNo);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                  String(process.serialNo) === String(value) ? "bg-blue-100 font-semibold" : ""
                }`}
              >
                {process.processName}
              </button>
            ))}
            {filteredProcesses.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">No matching processes found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ArtListItem {
  serialNumber?: string;
  serialNo?: string;
  artNo?: string;
  artName?: string;
  name?: string;
  id?: string;
}

interface OutwardLotOption { key: string; cuttinglotNumber: string; cuttingDozen: string; artNo: string; sizeName: string; pcs: string; }

interface ChallanListItem {
  id: number;
  challanNo: string;
  partyName: string;
  date: string;
  totalPcs: number;
  lotSummary: string; // ✅ NEW
}

/* Minimal art detail */
interface ArtProcess {
  processName: string;
  rate?: string | number;
  rate1?: string | number;
}
interface ArtDetail {
  serialNumber?: string;
  serialNo?: string;
  artName?: string;
  processes?: ArtProcess[];
}

const normalizeCutLotNoLoose = (raw: any) => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const i = s.indexOf("-");
  if (i > 0 && i < s.length - 1) return s.slice(i + 1).trim();
  return s;
};

// Lot numbers can arrive from older records either as the full generated value
// (2026-0066-1283) or as the short value (1283). Keep both forms for matching.
const cuttingLotMatchKeys = (raw: any): string[] => {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return [];
  const normalized = normalizeCutLotNoLoose(value).toLowerCase();
  const lastPart = value.split("-").filter(Boolean).pop() || normalized;
  return Array.from(new Set([value, normalized, lastPart].filter(Boolean)));
};

const buildLotSummary = (rows: any[]) => {
  const lots = Array.from(
    new Set(
      (rows || [])
        .map((r) => normalizeCutLotNoLoose(r.cuttinglotNumber || r.cuttingLotNumber || r.cutLotNo || ""))
        .filter(Boolean),
    ),
  );
  if (lots.length === 0) return "-";
  const first = lots.slice(0, 5).join(", ");
  return lots.length > 5 ? `${first} (+${lots.length - 5})` : first;
};

const emptyRow = (id: number, defaultArt?: string): RowData => ({
  id,
  cuttinglotNumber: "",
  cuttingDozen: "",
  artNo: defaultArt ?? "",
  sizeName: "",
  pcs: "",
  wastage: "",
  rate: "",
  amount: "0.00",
  selected: true,
});


// Newest challans first. If dates are equal (or unavailable), use the
// generated database ID / serial as a deterministic newest-first fallback.
const compareRecentFirst = (
  aDate: string,
  aId: string | number,
  bDate: string,
  bId: string | number,
): number => {
  const aTime = aDate ? Date.parse(aDate) : Number.NaN;
  const bTime = bDate ? Date.parse(bDate) : Number.NaN;
  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }
  const aNumber = Number(aId);
  const bNumber = Number(bId);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
    return bNumber - aNumber;
  }
  return String(bId ?? "").localeCompare(String(aId ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const InwardChallan: React.FC = () => {
  const [form, setForm] = useState<InwardChallanForm>({
    date: "",
    challanNo: "",
    partyId: "",
    processId: "",
    artHeader: "",
    remarks: "",
    adjustLot: "",
    rows: [emptyRow(1)],
  });

  const isEdit = useMemo(() => !!form.id, [form.id]);

  const [parties, setParties] = useState<Party[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [arts, setArts] = useState<ArtListItem[]>([]);

  const [artDetailsCache, setArtDetailsCache] = useState<Record<string, ArtDetail | null | undefined>>({});

  const [showList, setShowList] = useState(false);
  const [list, setList] = useState<ChallanListItem[]>([]);
  const [search, setSearch] = useState("");

  // Art picker modal (same as your code)
  const [artPickerRowId, setArtPickerRowId] = useState<number | null>(null);
  const [artPickerSearch, setArtPickerSearch] = useState<string>("");
  const [cuttingLotOptions, setCuttingLotOptions] = useState<OutwardLotOption[]>([]);
  const [showCuttingLotPicker, setShowCuttingLotPicker] = useState(false);
  const [cuttingLotSearch, setCuttingLotSearch] = useState("");
  const [selectedCuttingLotKeys, setSelectedCuttingLotKeys] = useState<string[]>([]);

  // load masters
  useEffect(() => {
    (async () => {
      try {
        const [partyRes, procRes, artRes] = await Promise.all([
          api.get("/party/category/Job_Work"),
          api.get("/process/list"),
          api.get("/arts"),
        ]);
        setParties(partyRes.data || []);
        setProcesses(procRes.data || []);
        setArts(Array.isArray(artRes.data) ? artRes.data : []);
      } catch (e) {
        console.error("Failed to load masters:", e);
      }
    })();
  }, []);

  const patchForm = (patch: Partial<InwardChallanForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const patchRow = (rowId: number, patch: Partial<RowData>) =>
    setForm((prev) => {
      const newRows = prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const merged: RowData = { ...r, ...patch };
        const pcsNum = Number(merged.pcs ?? 0) || 0;
        const rateNum = Number(merged.rate ?? 0) || 0;
        merged.amount = (pcsNum * rateNum).toFixed(2);
        // ✅ always keep only cutLotNo
        merged.cuttinglotNumber = normalizeCutLotNoLoose(merged.cuttinglotNumber);
        return merged;
      });
      return { ...prev, rows: newRows };
    });

  const addRow = () =>
    setForm((prev) => ({
      ...prev,
      rows: [...prev.rows, emptyRow(prev.rows.length + 1, prev.artHeader || undefined)],
    }));

  const resetForm = () =>
    setForm({
      date: "",
      challanNo: "",
      partyId: "",
      processId: "",
      artHeader: "",
      remarks: "",
      adjustLot: "",
      rows: [emptyRow(1)],
    });

  const validate = () => {
    if (!form.challanNo.trim()) {
      Swal.fire("Missing", "Challan No. is required", "warning");
      return false;
    }
    if (!form.partyId) {
      Swal.fire("Missing", "Please select Party Name", "warning");
      return false;
    }
    if (!form.date) {
      Swal.fire("Missing", "Please select Date", "warning");
      return false;
    }
    const selectedRows = form.rows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      Swal.fire("Missing", "Select at least one row to save", "warning");
      return false;
    }
    return true;
  };

  const handleSaveOrUpdate = async () => {
    if (!validate()) return;

    const selectedRows = form.rows.filter((r) => r.selected);

    const payload = {
      date: form.date || null,
      challanNo: form.challanNo || "",
      partyId: form.partyId ? String(form.partyId) : null,
      processId: form.processId || null,
      artHeader: form.artHeader || null,
      remarks: form.remarks || null,
      adjustLot: form.adjustLot || null,
      rows: selectedRows.map((r) => ({
        // ✅ save only cutLotNo
        cuttinglotNumber: normalizeCutLotNoLoose(r.cuttinglotNumber) || null,
        cuttingDozen: r.cuttingDozen || null,
        artNo: r.artNo || null,
        sizeName: r.sizeName || null,
        pcs: r.pcs === "" ? null : r.pcs == null ? null : Number(r.pcs),
        wastage: r.wastage || null,
        rate: r.rate == null ? null : String(r.rate),
        amount: r.amount == null ? null : String(r.amount),
      })),
    };

    try {
      if (isEdit) {
        await api.put(`/job-inward-challan/${form.id}`, payload);
        const savedLotKeys = new Set(selectedRows.flatMap((r) => cuttingLotMatchKeys(r.cuttinglotNumber)));
        setCuttingLotOptions((prev) => prev.filter((lot) =>
          !cuttingLotMatchKeys(lot.cuttinglotNumber).some((key) => savedLotKeys.has(key)),
        ));
        setSelectedCuttingLotKeys([]);
        Swal.fire("Updated", "Inward Challan updated successfully.", "success");
      } else {
        const res = await api.post("/job-inward-challan", payload);
        if (res?.data?.id) patchForm({ id: res.data.id });
        const savedLotKeys = new Set(selectedRows.flatMap((r) => cuttingLotMatchKeys(r.cuttinglotNumber)));
        setCuttingLotOptions((prev) => prev.filter((lot) =>
          !cuttingLotMatchKeys(lot.cuttinglotNumber).some((key) => savedLotKeys.has(key)),
        ));
        setSelectedCuttingLotKeys([]);
        Swal.fire("Saved", "Inward Challan saved successfully.", "success");
      }
    } catch (e: any) {
      console.error("Save error:", e);
      const msg = e?.response?.data?.message || e?.response?.data || e?.message;
      Swal.fire("Error", String(msg || "Save failed"), "error");
    }
  };

  const openList = async () => {
    setShowList(true);
    try {
      const res = await api.get("/job-inward-challan");
      const data: any[] = res.data || [];

      const mapped: ChallanListItem[] = data.map((d: any) => {
        const party = parties.find((p) => String(p.id) === String(d.partyId));
        const totalPcs = (d.rows || []).reduce((sum: number, r: any) => sum + (Number(r.pcs) || 0), 0);

        return {
          id: d.id,
          challanNo: d.challanNo || "",
          partyName: party?.partyName || d.partyName || "",
          date: d.date || "",
          totalPcs,
          // ✅ NEW lot summary
          lotSummary: buildLotSummary(d.rows || []),
        };
      });

      setList(
        mapped.sort((a, b) =>
          compareRecentFirst(a.date, a.id, b.date, b.id),
        ),
      );
    } catch (err) {
      console.error("Failed to load inward challan list", err);
      setList([]);
    }
  };

  const onEditFromList = async (id: number) => {
    try {
      const res = await api.get(`/job-inward-challan/${id}`);
      const d = res.data;

      setForm({
        id: d.id,
        date: d.date || "",
        challanNo: d.challanNo || "",
        partyId: String(d.partyId || ""),
        processId: String(d.processId || ""),
        artHeader: String(d.artHeader || ""),
        remarks: d.remarks || "",
        adjustLot: d.adjustLot || "",
        rows:
          (d.rows || []).map((r: any, idx: number) => ({
            id: idx + 1,
            // ✅ normalize old "serial-lot"
            cuttinglotNumber: normalizeCutLotNoLoose(r.cuttinglotNumber || r.cutLotNo || ""),
            cuttingDozen: r.cuttingDozen || "",
            artNo: r.artNo || "",
            sizeName: r.sizeName || "",
            pcs: r.pcs ?? "",
            wastage: r.wastage ?? "",
            rate: r.rate ?? "",
            amount: r.amount ?? "0.00",
            selected: true,
          })) || [emptyRow(1, d.artHeader || undefined)],
      });

      setShowList(false);
      Swal.fire("Loaded", "Challan loaded for editing.", "success");
    } catch {
      Swal.fire("Error", "Failed to load challan.", "error");
    }
  };

  const onDeleteFromList = async (id: number) => {
    const ask = await Swal.fire({
      title: "Delete?",
      text: "This will permanently delete the challan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });
    if (!ask.isConfirmed) return;

    try {
      await api.delete(`/job-inward-challan/${id}`);
      setList((p) => p.filter((x) => x.id !== id));
      Swal.fire("Deleted", "Challan deleted.", "success");
    } catch {
      Swal.fire("Error", "Failed to delete.", "error");
    }
  };

  // fetch art detail cache
  const fetchArtDetail = async (serialNumber: string): Promise<ArtDetail | null> => {
    if (!serialNumber) return null;
    const cached = artDetailsCache[serialNumber];
    if (cached !== undefined) return cached ?? null;
    try {
      const res = await api.get<ArtDetail>(`/arts/${serialNumber}`);
      setArtDetailsCache((prev) => ({ ...prev, [serialNumber]: res.data }));
      return res.data;
    } catch {
      setArtDetailsCache((prev) => ({ ...prev, [serialNumber]: null }));
      return null;
    }
  };

  const currentProcessName = useMemo(() => {
    const p = processes.find((x) => String(x.serialNo) === String(form.processId));
    return p?.processName ?? "";
  }, [form.processId, processes]);

  const deriveRateFromArt = (artDetail: ArtDetail | null | undefined, processName: string): string => {
    if (!artDetail || !artDetail.processes || !processName) return "";
    const match = artDetail.processes.find((pr) => (pr.processName || "").trim() === processName.trim());
    if (!match) return "";
    const r1 = match.rate1;
    const r = match.rate;
    if (r1 !== undefined && r1 !== null && String(r1).trim() !== "") return String(r1);
    if (r !== undefined && r !== null && String(r).trim() !== "") return String(r);
    return "";
  };

  const onRowArtSelected = async (rowId: number, artVal: string) => {
    patchRow(rowId, { artNo: artVal });
    if (!artVal) {
      patchRow(rowId, { rate: "", amount: "0.00" });
      return;
    }

    const masterMatch = arts.find(
      (a) =>
        String(a.artNo ?? "").toLowerCase().trim() === String(artVal).toLowerCase().trim() ||
        String(a.serialNumber ?? a.serialNo ?? a.id ?? "") === String(artVal) ||
        String(a.artName ?? a.name ?? "").toLowerCase().trim() === String(artVal).toLowerCase().trim(),
    );

    const serialToUse = masterMatch
      ? String(masterMatch.serialNumber ?? masterMatch.serialNo ?? masterMatch.id ?? "")
      : artVal;

    const artDetail = await fetchArtDetail(serialToUse);

    if (masterMatch) {
      patchRow(rowId, { artNo: String(masterMatch.artNo || artVal) });
    }

    const rate = deriveRateFromArt(artDetail ?? null, currentProcessName);
    patchRow(rowId, {
      rate: rate || "",
      amount: ((Number(form.rows.find((r) => r.id === rowId)?.pcs || 0) * Number(rate || 0))).toFixed(2),
    });
  };

  // Load pending outward lots for the exact Party + Process.
  // IMPORTANT: inward lots from other parties/processes must never block this list.
  const handlePartySelected = async (partyId: string, processOverride?: string) => {
    patchForm({ partyId, rows: [emptyRow(1)], artHeader: "" });
    setCuttingLotOptions([]);
    setSelectedCuttingLotKeys([]);
    setShowCuttingLotPicker(false);

    if (!partyId) return;

    const currentProcess = String(processOverride ?? form.processId ?? "").trim();
    if (!currentProcess) {
      Swal.fire("Select Process", "Please select Process Name to load matching outward lots.", "info");
      return;
    }

    const normalizeId = (value: any) => String(value ?? "").trim();

    try {
      const [outwardRes, inwardRes] = await Promise.all([
        api.get("/job-outward-challan", { params: { partyId } }),
        api.get("/job-inward-challan"),
      ]);

      const outwardDocs: any[] = Array.isArray(outwardRes.data) ? outwardRes.data : [];
      const inwardDocs: any[] = Array.isArray(inwardRes.data) ? inwardRes.data : [];

      // Build received-lot keys only for this Party + Process.
      // The previous code added every inward lot globally, which caused a lot
      // received by another party/process to disappear from this party's list.
      const alreadyReceived = new Set<string>();

      inwardDocs.forEach((doc: any) => {
        const inwardPartyId = normalizeId(doc.partyId);
        const inwardProcessId = normalizeId(
          doc.processId ?? doc.processSerialNo ?? doc.process?.serialNo
        );

        if (inwardPartyId !== normalizeId(partyId)) return;
        if (inwardProcessId !== currentProcess) return;

        // While editing, do not let this same inward challan hide its own lots.
        if (form.id && normalizeId(doc.id) === normalizeId(form.id)) return;

        (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
          const rawLot = row.cuttinglotNumber ?? row.cutLotNo ?? row.cuttingLotNumber ?? row.cutlotNo ?? "";
          cuttingLotMatchKeys(rawLot).forEach((key) => alreadyReceived.add(key));
        });
      });

      const options: OutwardLotOption[] = [];

      outwardDocs.forEach((doc: any, docIndex: number) => {
        if (normalizeId(doc.partyId) !== normalizeId(partyId)) return;

        const outwardProcessId = normalizeId(
          doc.processSerialNo ?? doc.processId ?? doc.process?.serialNo
        );
        if (outwardProcessId !== currentProcess) return;

        (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any, rowIndex: number) => {
          const rawLot = row.cutLotNo ?? row.cuttinglotNumber ?? row.cuttingLotNumber ?? row.cutlotNo ?? "";
          const lotNo = normalizeCutLotNoLoose(rawLot);
          if (!lotNo) return;

          const lotKeys = cuttingLotMatchKeys(rawLot);
          if (lotKeys.some((key) => alreadyReceived.has(key))) return;

          const rawArt = String(
            row.artNo || row.art_no || row.art ||
            doc.processArtNo || doc.headerArtNo || doc.processArt || ""
          );

          const artMatch = arts.find((a) =>
            String(a.artNo || "").trim().toLowerCase() === rawArt.trim().toLowerCase() ||
            String(a.serialNumber ?? a.serialNo ?? a.id ?? "").trim().toLowerCase() === rawArt.trim().toLowerCase() ||
            String(a.artName ?? a.name ?? "").trim().toLowerCase() === rawArt.trim().toLowerCase()
          );

          options.push({
            key: `${doc.id ?? doc.challanNo ?? docIndex}::${rowIndex}::${lotNo}`,
            cuttinglotNumber: lotNo,
            cuttingDozen: String(row.cuttingDozenPcs ?? row.cuttingDozen ?? ""),
            artNo: artMatch
              ? String(artMatch.artNo || artMatch.serialNumber || artMatch.serialNo || artMatch.id || "")
              : rawArt,
            sizeName: String(row.size || row.sizeName || row.itemName || ""),
            pcs: String(row.pcs ?? ""),
          });
        });
      });

      setCuttingLotOptions(options);
      setSelectedCuttingLotKeys([]);
      setCuttingLotSearch("");

      if (options.length > 0) {
        setShowCuttingLotPicker(true);
      } else {
        Swal.fire(
          "No Pending Lots",
          "No pending outward lots are available for this party and process.",
          "info"
        );
      }
    } catch (err) {
      console.error("Failed to load pending outward lots", err);
      Swal.fire("Error", "Failed to load pending cutting lots.", "error");
    }
  };

  const openCuttingLotPicker = (rowId: number) => {
    if (!form.partyId) {
      Swal.fire("Select Party", "Please select Party Name first.", "warning");
      return;
    }
    if (!form.processId) {
      Swal.fire("Select Process", "Please select Process Name first.", "warning");
      return;
    }
    setCuttingLotSearch("");
    setShowCuttingLotPicker(true);
  };

  const toggleCuttingLotSelection = (key: string) => {
    setSelectedCuttingLotKeys((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const addSelectedCuttingLots = () => {
    const selected = cuttingLotOptions.filter((lot) => selectedCuttingLotKeys.includes(lot.key));
    if (!selected.length) {
      Swal.fire("Select Lots", "Please tick at least one cutting lot.", "warning");
      return;
    }

    setForm((prev) => {
      const existing = new Set(prev.rows.map((r) => normalizeCutLotNoLoose(r.cuttinglotNumber).toLowerCase()).filter(Boolean));
      const fresh = selected.filter((lot) => !existing.has(lot.cuttinglotNumber.toLowerCase()));
      const baseRows = prev.rows.filter((r) => r.cuttinglotNumber || r.pcs || r.artNo || r.sizeName);
      let nextId = Math.max(0, ...baseRows.map((r) => r.id));
      const newRows: RowData[] = fresh.map((lot) => ({
        id: ++nextId,
        cuttinglotNumber: lot.cuttinglotNumber,
        cuttingDozen: lot.cuttingDozen,
        artNo: lot.artNo,
        sizeName: lot.sizeName,
        pcs: "",
        wastage: "",
        rate: "",
        amount: "0.00",
        selected: true,
      }));
      return { ...prev, rows: [...baseRows, ...newRows] };
    });
    setSelectedCuttingLotKeys([]);
    setShowCuttingLotPicker(false);
  };

  // totals (ONLY selected)
  const totalPcs = useMemo(
    () => form.rows.filter((r) => r.selected).reduce((s, r) => s + (Number(r.pcs) || 0), 0),
    [form.rows],
  );
  const totalDozen = useMemo(
    () => form.rows.filter((r) => r.selected).reduce((s, r) => s + (Number(r.cuttingDozen) || 0), 0),
    [form.rows],
  );
  const totalAmount = useMemo(
    () => form.rows.filter((r) => r.selected).reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [form.rows],
  );

  const allSelected = form.rows.length > 0 && form.rows.every((r) => r.selected);
  const toggleSelectAll = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => ({ ...r, selected: checked })),
    }));
  };

  // Art picker helpers
  const openArtPickerForRow = (rowId: number) => {
    setArtPickerRowId(rowId);
    setArtPickerSearch("");
  };

  const handleArtPickerSelect = async (rowId: number, artSerial: string) => {
    await onRowArtSelected(rowId, artSerial);
    setArtPickerRowId(null);
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Job Work Inward Challan</h2>

          {/* Header grid 1 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => patchForm({ date: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input
                type="text"
                value={form.challanNo}
                onChange={(e) => patchForm({ challanNo: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={form.partyId}
                onChange={(e) => handlePartySelected(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Header grid 2 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Process Name</label>
              <ProcessSearchSelect
                processes={processes}
                value={form.processId}
                onChange={(processId) => {
                  patchForm({ processId });
                  if (form.partyId) {
                    handlePartySelected(form.partyId, processId);
                  }
                }}
              />
            </div>

            <div>
              <label className="block font-semibold">Art No. (Header)</label>
              <select
                value={form.artHeader}
                onChange={(e) => patchForm({ artHeader: e.target.value })}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Art (optional)</option>
                {arts.map((a) => {
                  const key = String(a.artNo || a.serialNumber || a.serialNo || a.id || "");
                  const label = String(a.artNo || a.serialNumber || a.serialNo || a.id || "");
                  return (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Remarks</label>
              <input
                type="text"
                value={form.remarks}
                onChange={(e) => patchForm({ remarks: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Header grid 3 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Adjust Lot</label>
              <input
                type="text"
                value={form.adjustLot}
                onChange={(e) => patchForm({ adjustLot: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div />
            <div />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      title="Select / Deselect All"
                    />
                  </th>
                  <th className="border p-2">S No</th>
                  <th className="border p-2">Cutting Lot Number</th>
                  <th className="border p-2">CUTTING Dozen Pcs</th>
                  <th className="border p-2">Art No</th>
                  <th className="border p-2">Size Name</th>
                  <th className="border p-2">Pcs</th>
                  <th className="border p-2">Wastage</th>
                  <th className="border p-2">Rate</th>
                  <th className="border p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {form.rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="border p-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => patchRow(row.id, { selected: e.target.checked })}
                      />
                    </td>
                    <td className="border p-2 text-center">{idx + 1}</td>

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                        value={normalizeCutLotNoLoose(row.cuttinglotNumber)}
                        placeholder="Click to Select"
                        readOnly
                        onClick={() => openCuttingLotPicker(row.id)}
                        title="Click to select Cutting Lot Number"
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full"
                        value={row.cuttingDozen}
                        onChange={(e) => patchRow(row.id, { cuttingDozen: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <div className="flex gap-2 items-center">
                        <select
                          className="border p-1 rounded w-full"
                          value={row.artNo}
                          onChange={(e) => onRowArtSelected(row.id, e.target.value)}
                        >
                          <option value="">Select Art</option>
                          {arts.map((a) => {
                            const key = String(a.artNo || a.serialNumber || a.serialNo || a.id || "");
                            const label = String(a.artNo || a.serialNumber || a.serialNo || a.id || "");
                            return (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={() => openArtPickerForRow(row.id)}
                          className="px-2 py-1 border rounded bg-white hover:bg-gray-50"
                        >
                          List
                        </button>
                      </div>
                    </td>

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full"
                        value={row.sizeName}
                        onChange={(e) => patchRow(row.id, { sizeName: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        type="text" inputMode="decimal"
                        className="border p-1 rounded w-full"
                        value={row.pcs}
                        onChange={(e) => patchRow(row.id, { pcs: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        type="text" inputMode="decimal"
                        className="border p-1 rounded w-full"
                        value={row.wastage}
                        onChange={(e) => patchRow(row.id, { wastage: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        type="text" inputMode="decimal"
                        className="border p-1 rounded w-full"
                        value={row.rate}
                        onChange={(e) => patchRow(row.id, { rate: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        readOnly
                        className="border p-1 rounded w-full bg-gray-100 text-right"
                        value={String(row.amount ?? "0.00")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-4">
            <div>
              <button onClick={addRow} className="px-4 py-2 bg-blue-500 text-white rounded mr-2">
                Add
              </button>
              <button onClick={handleSaveOrUpdate} className="px-4 py-2 bg-green-500 text-white rounded mr-2">
                {isEdit ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowList(false);
                  setSearch("");
                  setCuttingLotOptions([]);
                  setSelectedCuttingLotKeys([]);
                  setShowCuttingLotPicker(false);
                  setCuttingLotSearch("");
                  setArtPickerRowId(null);
                  setArtPickerSearch("");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded mr-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowList(false);
                  setSearch("");
                  setCuttingLotOptions([]);
                  setSelectedCuttingLotKeys([]);
                  setShowCuttingLotPicker(false);
                  setCuttingLotSearch("");
                  setArtPickerRowId(null);
                  setArtPickerSearch("");
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded mr-2"
              >
                New Entry
              </button>
              <button onClick={openList} className="px-4 py-2 bg-indigo-500 text-white rounded mr-2">
                View List
              </button>
            </div>

            <div className="text-right">
              <p>Total Dozen (selected): {totalDozen}</p>
              <p>Total Pcs (selected): {totalPcs}</p>
              <p>Total Amount (selected): ₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Inward List Modal */}
          {showList && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">Inward Challan List</h2>

                <input
                  type="text"
                  placeholder="Search by Challan No, Party, Date, Lot"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border p-2 rounded w-full mb-4"
                />

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="border p-2 text-center">#</th>
                        <th className="border p-2 text-center">Challan No</th>
                        <th className="border p-2 text-center">Party Name</th>
                        <th className="border p-2 text-center">Date</th>
                        <th className="border p-2 text-center">Cutting Lot No(s)</th>
                        <th className="border p-2 text-center">Total Pcs</th>
                        <th className="border p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list
                        .filter((x) => {
                          const q = search.toLowerCase();
                          return (
                            !q ||
                            x.challanNo.toLowerCase().includes(q) ||
                            x.partyName.toLowerCase().includes(q) ||
                            x.date.toLowerCase().includes(q) ||
                            x.lotSummary.toLowerCase().includes(q)
                          );
                        })
                        .map((x, i) => (
                          <tr key={x.id}>
                            <td className="border p-2 text-center">{i + 1}</td>
                            <td className="border p-2 text-center">{x.challanNo}</td>
                            <td className="border p-2 text-center">{x.partyName}</td>
                            <td className="border p-2 text-center">{x.date}</td>
                            <td className="border p-2 text-center">{x.lotSummary}</td>
                            <td className="border p-2 text-center">{x.totalPcs}</td>
                            <td className="border p-2 text-center">
                              <button onClick={() => onEditFromList(x.id)} className="px-3 py-1 bg-green-500 text-white rounded mr-2">
                                Edit
                              </button>
                              <button onClick={() => onDeleteFromList(x.id)} className="px-3 py-1 bg-red-500 text-white rounded">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}

                      {list.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-3 text-gray-500">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-center mt-6">
                  <button onClick={() => setShowList(false)} className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cutting Lot Picker: select lots manually after choosing party */}
          {showCuttingLotPicker && (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-start z-[1200] pt-16">
              <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-9/12 p-4 max-h-[82vh] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Select Cutting Lot Number</h3>
                  <button type="button" onClick={() => setShowCuttingLotPicker(false)} className="px-3 py-1 bg-gray-300 rounded">Close</button>
                </div>
                <input type="text" autoFocus placeholder="Search Cutting Lot / Art No" value={cuttingLotSearch} onChange={(e) => setCuttingLotSearch(e.target.value)} className="w-full border p-2 rounded mb-3" />
                <div className="overflow-auto border rounded">
                  <table className="w-full text-sm"><thead className="bg-gray-100 sticky top-0"><tr><th className="border p-2">Select</th><th className="border p-2">Cutting Lot No.</th><th className="border p-2">Cutting Dozen Pcs</th><th className="border p-2">Art No.</th><th className="border p-2">Size</th></tr></thead>
                    <tbody>{cuttingLotOptions.filter((x) => { const q = cuttingLotSearch.trim().toLowerCase(); return !q || [x.cuttinglotNumber, x.artNo, x.sizeName].some((v) => v.toLowerCase().includes(q)); }).map((lot) => (
                      <tr key={lot.key} className="hover:bg-gray-50">
                        <td className="border p-2 text-center"><input type="checkbox" checked={selectedCuttingLotKeys.includes(lot.key)} onChange={() => toggleCuttingLotSelection(lot.key)} /></td>
                        <td className="border p-2">{lot.cuttinglotNumber}</td>
                        <td className="border p-2">{lot.cuttingDozen}</td>
                        <td className="border p-2">{lot.artNo}</td>
                        <td className="border p-2">{lot.sizeName}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <span className="mr-auto text-sm text-gray-600">{selectedCuttingLotKeys.length} lot(s) selected</span>
                  <button type="button" onClick={() => setShowCuttingLotPicker(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                  <button type="button" onClick={addSelectedCuttingLots} className="px-4 py-2 bg-blue-600 text-white rounded">Add Selected Lots</button>
                </div>
              </div>
            </div>
          )}

          {/* Art Picker Modal (same as before, optional) */}
          {artPickerRowId !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-60 pt-20">
              <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-8/12 lg:w-6/12 p-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Select Art</h3>
                  <button onClick={() => setArtPickerRowId(null)} className="px-3 py-1 bg-gray-300 rounded">
                    Close
                  </button>
                </div>

                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Filter Art No or Art Name"
                    value={artPickerSearch}
                    onChange={(e) => setArtPickerSearch(e.target.value)}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-2 text-left">Art No</th>
                        <th className="border p-2 text-left">Art Name</th>
                        <th className="border p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arts
                        .filter((a) => {
                          const q = artPickerSearch.trim().toLowerCase();
                          if (!q) return true;
                          const artNoDisplay = String(a.artNo || a.serialNumber || a.serialNo || a.id || "").toLowerCase();
                          const artName = String(a.artName ?? a.name ?? "").toLowerCase();
                          return artNoDisplay.includes(q) || artName.includes(q);
                        })
                        .map((a) => {
                          const artSerial = String(a.artNo || a.serialNumber || a.serialNo || a.id || "");
                          const artNoDisplay = String(a.artNo || a.serialNumber || a.serialNo || a.id || "");
                          const artName = String(a.artName ?? a.name ?? "");
                          return (
                            <tr key={artSerial}>
                              <td className="border p-2">{artNoDisplay}</td>
                              <td className="border p-2">{artName}</td>
                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => handleArtPickerSelect(artPickerRowId as number, artSerial)}
                                  className="px-3 py-1 bg-green-500 text-white rounded"
                                >
                                  Select
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
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

export default InwardChallan;