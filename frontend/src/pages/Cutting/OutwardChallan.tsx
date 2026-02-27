//Frontend Code of Job Outward Challan

// OutwardChallan.tsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

interface RowData {
  id: number;
  cuttinglotNumber: string;
  cuttingDozen: string;
  artNo: string;
  size: string;
  pcs: number | string;
  narration: string;
  targetDate: string;
}

interface OutwardChallanForm {
  serialNo?: string;
  date: string;
  challanNo: string;
  partyId: string;
  processSerialNo: string;
  headerArtNo: string;
  remarks1: string;
  rows: RowData[];
}

interface Party { id: number; partyName: string }
// <-- changed Process interface to use lowercase serialNo (normalized from API)
interface Process { processName: string; serialNo: string; }
interface ChallanListItem {
  serialNo: string;
  challanNo: string;
  partyName: string;
  date: string;
  totalPcs: number;
}

/** CuttingEntry DTO shape (based on sample you provided) */
interface CuttingEntryLotRowDTO {
  id?: number;
  sno?: number;
  cutLotNo?: string;
  artNo?: string;
  itemName?: string;
  shade?: string;
  pcs?: string | number;
  rate?: string;
  amount?: string;
}
interface CuttingEntryDTO {
  serialNo?: string;
  date?: string;
  lotRows?: CuttingEntryLotRowDTO[];
}

/* ---------- Modals ---------- */

const CuttingLotModal: React.FC<{
  open: boolean;
  lots: { displayLotNo: string; artNo: string; itemName: string; cutLotNo: string; parentSerial?: string }[];
  onClose: () => void;
  onSelect: (lot: { displayLotNo: string; artNo: string; itemName: string; cutLotNo: string; parentSerial?: string }) => void;
}> = ({ open, lots, onClose, onSelect }) => {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return lots;
    return lots.filter(
      (x) =>
        x.displayLotNo.toLowerCase().includes(s) ||
        (x.artNo || "").toLowerCase().includes(s) ||
        (x.itemName || "").toLowerCase().includes(s)
    );
  }, [q, lots]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Select Cutting Lot</h3>
          <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">Close</button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lot no / art no / item…"
          className="border p-2 rounded w-full mb-3"
        />
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Lot No</th>
                <th className="border p-2">Art No</th>
                <th className="border p-2">Item</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="border p-3 text-center text-gray-500" colSpan={4}>No records</td>
                </tr>
              ) : (
                filtered.map((x) => (
                  <tr key={x.displayLotNo} className="hover:bg-gray-50">
                    <td className="border p-2">{x.cutLotNo}</td>
                    <td className="border p-2">{x.artNo}</td>
                    <td className="border p-2">{x.itemName}</td>
                    <td className="border p-2 text-center">
                      <button onClick={() => onSelect(x)} className="px-3 py-1 bg-blue-600 text-white rounded">
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SizeModal: React.FC<{
  open: boolean;
  sizes: { id: number; name: string }[];
  onClose: () => void;
  onSelect: (sizeName: string) => void;
}> = ({ open, sizes, onClose, onSelect }) => {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sizes;
    return sizes.filter((sz) => (sz.name || "").toLowerCase().includes(s));
  }, [q, sizes]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Select Size</h3>
          <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">Close</button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search size..." className="border p-2 rounded w-full mb-3" />
        <div className="border rounded">
          <table className="w-full text-sm">
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className="p-3 text-center text-gray-500">No sizes</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="p-2 border">{s.name}</td>
                    <td className="p-2 border text-right">
                      <button onClick={() => onSelect(s.name)} className="px-3 py-1 bg-blue-600 text-white rounded">Choose</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ---------- Component ---------- */

const emptyRow = (id: number): RowData => ({
  id,
  cuttinglotNumber: "",
  cuttingDozen: "",
  artNo: "",
  size: "",
  pcs: "",
  narration: "",
  targetDate: "",
});

const OutwardChallan: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [showList, setShowList] = useState(false);
  const [list, setList] = useState<ChallanListItem[]>([]);
  const [search, setSearch] = useState("");

  const [parties, setParties] = useState<Party[]>([]);
  // <-- ensure Process state uses the updated Process interface
  const [processes, setProcesses] = useState<Process[]>([]);
  const [, setArts] = useState<any[]>([]);

  // cutting lot select modal
  const [showCuttingLotModal, setShowCuttingLotModal] = useState(false);
  const [cuttingLotOptions, setCuttingLotOptions] = useState<
    { displayLotNo: string; artNo: string; itemName: string; cutLotNo: string; parentSerial?: string }[]
  >([]);
  const [activeRowForSelect, setActiveRowForSelect] = useState<number | null>(null);
  const [, setIsFetchingLots] = useState(false);

  // size modal
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [activeRowForSize, setActiveRowForSize] = useState<number | null>(null);
  const [sizes, setSizes] = useState<{ id: number; name: string }[]>([]);

  const [form, setForm] = useState<OutwardChallanForm>({
    date: "",
    challanNo: "",
    partyId: "",
    processSerialNo: "",
    headerArtNo: "",
    remarks1: "",
    rows: [emptyRow(1)],
  });

  const isEdit = useMemo(() => !!form.serialNo, [form.serialNo]);

  // --- load masters ---
  useEffect(() => {
    (async () => {
      try {
        const [partyRes, procRes, artRes] = await Promise.all([
          api.get("/party/category/Job_Work"),
          api.get("/process/list"),
          api.get("/arts"), // still fine to keep; optional
        ]);
        setParties(partyRes.data || []);

        // Normalize process objects to ensure we always have `serialNo` and `processName`
        const procData: any[] = Array.isArray(procRes.data) ? procRes.data : [];
        const normalized = procData.map((p: any) => ({
          processName: String(p.processName ?? p.name ?? ""),
          // prefer serialNo, fallback to SerialNo or id
          serialNo: String(p.serialNo ?? p.SerialNo ?? p.id ?? ""),
        }));
        setProcesses(normalized);

        setArts(artRes.data || []);
      } catch (err) {
        console.error("Failed to load masters", err);
      }
    })();
  }, []);

  // load sizes once (GET /sizes)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/sizes");
        const data = Array.isArray(res.data) ? res.data : [];
        // normalize to {id,name}
        const list = data.map((s: any, i: number) => ({ id: Number(s.id ?? i + 1), name: String(s.sizeName ?? s.name ?? s) }));
        setSizes(list);
      } catch (err) {
        console.error("Failed to load sizes", err);
        setSizes([]);
      }
    })();
  }, []);

  // next serial / challan no (optional)
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/job-outward-challan/next-serial", {
          params: { date: form.date || undefined },
        });
        if (r?.data) setForm((p) => ({ ...p, challanNo: r.data }));
      } catch (e) {/* ignore */ }
    })();
  }, [form.date]);

  // helpers
  const patchForm = (patch: Partial<OutwardChallanForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const patchRow = (rowId: number, patch: Partial<RowData>) =>
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));

  const addRow = () =>
    setForm((prev) => ({ ...prev, rows: [...prev.rows, emptyRow(prev.rows.length + 1)] }));

  const removeEmptyTailRows = () =>
    setForm((prev) => ({
      ...prev,
      rows:
        prev.rows.length > 1
          ? prev.rows.filter(
              (r, idx) =>
                idx < prev.rows.length - 1 ||
                Object.values({ ...r, id: 0 }).join("").trim() !== ""
            )
          : prev.rows,
    }));

  const resetForm = () =>
    setForm({
      date: "",
      challanNo: "",
      partyId: "",
      processSerialNo: "",
      headerArtNo: "",
      remarks1: "",
      rows: [emptyRow(1)],
    });

  const validate = (): boolean => {
    if (!form.challanNo.trim()) { Swal.fire("Missing", "Challan No. is required", "warning"); return false; }
    if (!form.partyId) { Swal.fire("Missing", "Please select Party Name", "warning"); return false; }
    if (!form.date) { Swal.fire("Missing", "Please select Date", "warning"); return false; }
    if (form.rows.length === 0) { Swal.fire("Missing", "Add at least one row", "warning"); return false; }
    return true;
  };

  // Save or Update single button
  const saveOrUpdate = async () => {
    removeEmptyTailRows();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = {
        serialNo: form.serialNo,
        orderChallanNo: form.challanNo,
        partyId: Number(form.partyId) || null,
        processSerialNo: form.processSerialNo || null,
        date: form.date || null,
        remarks1: form.remarks1,
        rows: form.rows.map((r) => ({
          sno: r.id,
          cutLotNo: r.cuttinglotNumber,
          artNo: r.artNo,
          cuttingDozenPcs: r.cuttingDozen,
          size: r.size,
          pcs: String(r.pcs),
          narration: r.narration,
          targetDate: r.targetDate || null,
        })),
      };

      if (isEdit && form.serialNo) {
        await api.put(`/job-outward-challan/${encodeURIComponent(form.serialNo)}`, payload);
        Swal.fire("Updated", "Outward Challan updated successfully.", "success");
      } else {
        const res = await api.post("/job-outward-challan", payload);
        const createdSerial = res?.data?.serialNo || res?.data?.id || null;
        if (createdSerial) patchForm({ serialNo: String(createdSerial) });
        Swal.fire("Saved", "Outward Challan saved successfully.", "success");
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", e?.response?.data?.message || "Failed to save", "error");
    } finally { setIsSaving(false); }
  };

  // open list & fetch
  const openList = async () => {
    setShowList(true);
    try {
      const res = await api.get("/job-outward-challan");
      const items: ChallanListItem[] = (res.data || []).map((d: any) => ({
        serialNo: d.serialNo || d.id || "",
        challanNo: d.orderChallanNo || d.challanNo || "",
        partyName: d.partyName || "",
        date: d.date || "",
        totalPcs: (d.rows || []).reduce((s: number, r: any) => s + (Number(r.pcs) || 0), 0),
      }));
      setList(items);
    } catch (err) {
      console.error("Failed to load list", err);
      setList([]);
    }
  };

  const onEditFromList = async (serialNo: string) => {
    try {
      const res = await api.get(`/job-outward-challan/${encodeURIComponent(serialNo)}`);
      const d = res.data;
      setForm({
        serialNo: d.serialNo || d.id || undefined,
        date: d.date || "",
        challanNo: d.orderChallanNo || d.challanNo || "",
        partyId: String(d.partyId || ""),
        processSerialNo: String(d.processSerialNo || ""),
        headerArtNo: String(d.processArtNo || d.headerArtNo || d.processArt || ""),
        remarks1: d.remarks1 || "",
        rows:
          (d.rows || []).map((r: any, idx: number) => ({
            id: idx + 1,
            cuttinglotNumber: r.cutLotNo || r.cuttinglotNumber || "",
            cuttingDozen: r.cuttingDozenPcs || r.cuttingDozen || "",
            artNo: r.artNo || "",
            size: r.size || "",
            pcs: r.pcs ?? "",
            narration: r.narration || "",
            targetDate: r.targetDate || "",
          })) || [emptyRow(1)],
      });
      setShowList(false);
      Swal.fire("Loaded", "Challan loaded for editing.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load challan for edit.", "error");
    }
  };

  const onDeleteFromList = async (serialNo: string) => {
    const ask = await Swal.fire({
      title: "Delete?",
      text: "This will permanently delete the challan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });
    if (!ask.isConfirmed) return;
    try {
      await api.delete(`/job-outward-challan/${encodeURIComponent(serialNo)}`);
      setList((p) => p.filter((x) => x.serialNo !== serialNo));
      Swal.fire("Deleted", "Challan deleted.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete.", "error");
    }
  };

  const totalPcs = useMemo(
    () => form.rows.reduce((sum, r) => sum + (Number(r.pcs) || 0), 0),
    [form.rows]
  );

  // ------------------ Cutting Lot Select flow ------------------
  // build lot list from GET /cutting-entries (uses lotRows)
  useEffect(() => {
    (async () => {
      setIsFetchingLots(true);
      try {
        const res = await api.get<CuttingEntryDTO[]>("/cutting-entries");
        const docs: CuttingEntryDTO[] = res.data || [];
        const map = new Map<string, { displayLotNo: string; artNo: string; itemName: string; cutLotNo: string; parentSerial?: string }>();

        for (const entry of docs) {
          const parentSerial = entry.serialNo || "";
          const lotRows = Array.isArray((entry as any).lotRows) ? (entry as any).lotRows : (entry as any).rows || [];
          for (const r of lotRows) {
            const cutLotNo = String(r.cutLotNo || r.cutlotNo || r.cuttingLotNo || "").trim();
            if (!cutLotNo) continue;
            const display = parentSerial ? `${parentSerial}-${cutLotNo}` : cutLotNo;
            if (!map.has(display)) {
              map.set(display, { displayLotNo: display, artNo: String(r.artNo || ""), itemName: String(r.itemName || ""), cutLotNo, parentSerial });
            }
          }
        }

        setCuttingLotOptions(Array.from(map.values()));
      } catch (err) {
        console.error("Failed to build cutting lot options from /cutting-entries", err);
        setCuttingLotOptions([]);
      } finally {
        setIsFetchingLots(false);
      }
    })();
  }, []);

  // open selector (row-level)
  const openCuttingLotSelector = (rowId: number) => {
    setActiveRowForSelect(rowId);
    setShowCuttingLotModal(true);
  };

  // when user chooses a cutting lot from modal -> fetch the parent cutting-entry and find lotRow
  const chooseCuttingLotForRow = async (displayLotNo: string) => {
    if (activeRowForSelect == null) return;
    setShowCuttingLotModal(false);

    const selected = cuttingLotOptions.find((x) => x.displayLotNo === displayLotNo);
    if (!selected) {
      Swal.fire("Error", "Selected lot not found.", "error");
      setActiveRowForSelect(null);
      return;
    }

    // patch display lot into the row
    patchRow(activeRowForSelect, { cuttinglotNumber: selected.displayLotNo });

    try {
      if (selected.parentSerial) {
        const res = await api.get<CuttingEntryDTO>(`/cutting-entries/${encodeURIComponent(selected.parentSerial)}`);
        const entry = res.data;
        const lotRows = Array.isArray((entry as any).lotRows) ? (entry as any).lotRows : (entry as any).rows || [];
        const found = lotRows.find((r: any) => String(r.cutLotNo || r.cutlotNo || r.cuttingLotNo || "").trim() === String(selected.cutLotNo).trim());
        if (found) {
          const artVal = String(found.artNo || found.art_no || "");
          const pcsVal = String(found.pcs ?? found.pcs ?? found.cuttingDozen ?? "");
          // set both row art and header art
          patchRow(activeRowForSelect, {
            artNo: artVal || "",
            cuttingDozen: pcsVal || "",
          });
          patchForm({ headerArtNo: artVal || "" });
        } else {
          // fallback
          patchRow(activeRowForSelect, { artNo: selected.artNo || "", cuttingDozen: "" });
          if (selected.artNo) patchForm({ headerArtNo: selected.artNo });
          Swal.fire("Info", `Selected lot found but row details missing in ${selected.parentSerial}`, "info");
        }
      } else {
        // no parentSerial -> use map info
        patchRow(activeRowForSelect, { artNo: selected.artNo || "", cuttingDozen: "" });
        if (selected.artNo) patchForm({ headerArtNo: selected.artNo });
      }
    } catch (err) {
      console.error("Failed to fetch cutting entry", err);
      Swal.fire("Error", "Failed to fetch cutting lot details", "error");
    } finally {
      setActiveRowForSelect(null);
    }
  };

  // ------------------ Size select flow ------------------
  const openSizeSelector = (rowId: number) => {
    setActiveRowForSize(rowId);
    setShowSizeModal(true);
  };
  const chooseSizeForRow = (sizeName: string) => {
    if (activeRowForSize == null) return;
    patchRow(activeRowForSize, { size: sizeName });
    setActiveRowForSize(null);
    setShowSizeModal(false);
  };

  // ------------------ UI -------------------------------------
  return (
    <Dashboard>
      {/* Modals */}
      <CuttingLotModal
        open={showCuttingLotModal}
        lots={cuttingLotOptions}
        onClose={() => { setShowCuttingLotModal(false); setActiveRowForSelect(null); }}
        onSelect={(lot) => chooseCuttingLotForRow(lot.displayLotNo)}
      />
      <SizeModal open={showSizeModal} sizes={sizes} onClose={() => { setShowSizeModal(false); setActiveRowForSize(null); }} onSelect={chooseSizeForRow} />

      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Job Work Outward Challan</h2>

          {/* Header */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Order / Challan No.</label>
              <input
                type="text"
                value={form.challanNo}
                onChange={(e) => patchForm({ challanNo: e.target.value })}
                className="border p-2 rounded w-full"
                placeholder="e.g. JO-2025-0001"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={form.partyId}
                onChange={(e) => patchForm({ partyId: e.target.value })}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.partyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => patchForm({ date: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Process Name</label>
              <select
                value={form.processSerialNo}
                onChange={(e) => patchForm({ processSerialNo: e.target.value })}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Process</option>
                {processes.map((p) => (
                  // use normalized serialNo
                  <option key={p.serialNo} value={p.serialNo}>{p.processName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold">Art No. (auto)</label>
              <input
                type="text"
                value={form.headerArtNo}
                readOnly
                onClick={() => Swal.fire("Info", "Art No auto-filled from Cutting Lot", "info")}
                className="border p-2 rounded w-full bg-gray-50 cursor-not-allowed"
                placeholder="Art auto-filled"
              />
            </div>
            <div>
              <label className="block font-semibold">Remarks 1</label>
              <input
                type="text"
                value={form.remarks1}
                onChange={(e) => patchForm({ remarks1: e.target.value })}
                className="border p-2 rounded w-full"
                placeholder="Any remarks"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S No</th>
                  <th className="border p-2">Cutting Lot Number</th>
                  <th className="border p-2">Cutting Dozen Pcs</th>
                  <th className="border p-2">Art No (auto)</th>
                  <th className="border p-2">Size</th>
                  <th className="border p-2">Pcs</th>
                  <th className="border p-2">Narration</th>
                  <th className="border p-2">Target Date</th>
                </tr>
              </thead>
              <tbody>
                {form.rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-1">
                      <div className="flex gap-2">
                        <input
                          value={row.cuttinglotNumber}
                          readOnly
                          className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                          onClick={() => openCuttingLotSelector(row.id)}
                          title="Click to select Cutting Lot"
                        />
                        <button
                          onClick={() => openCuttingLotSelector(row.id)}
                          className="px-2 py-1 bg-blue-500 text-white rounded whitespace-nowrap"
                          title="Select Cutting Lot"
                        >
                          Select
                        </button>
                      </div>
                    </td>
                    <td className="border p-1">
                      <input
                        value={row.cuttingDozen}
                        onChange={(e) => patchRow(row.id, { cuttingDozen: e.target.value })}
                        className="border p-1 rounded w-full"
                        type="text"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        value={row.artNo}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50 cursor-not-allowed"
                        title="Art auto-filled from Cutting Lot"
                      />
                    </td>
                    <td className="border p-1">
                      <div className="flex gap-2">
                        <input
                          value={row.size}
                          readOnly
                          className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                          onClick={() => openSizeSelector(row.id)}
                          placeholder="Click to select"
                        />
                        <button onClick={() => openSizeSelector(row.id)} className="px-2 py-1 bg-indigo-600 text-white rounded">Size</button>
                      </div>
                    </td>
                    <td className="border p-1">
                      <input
                        value={row.pcs}
                        onChange={(e) => patchRow(row.id, { pcs: e.target.value })}
                        className="border p-1 rounded w-full"
                        type="number"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        value={row.narration}
                        onChange={(e) => patchRow(row.id, { narration: e.target.value })}
                        className="border p-1 rounded w-full"
                        type="text"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="date"
                        value={row.targetDate}
                        onChange={(e) => patchRow(row.id, { targetDate: e.target.value })}
                        className="border p-1 rounded w-full"
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
              <button onClick={addRow} className="px-4 py-2 bg-blue-500 text-white rounded mr-2">Add</button>
              <button onClick={saveOrUpdate} disabled={isSaving} className="px-4 py-2 bg-green-500 text-white rounded mr-2 disabled:opacity-70">
                {isEdit ? "Update" : "Save"}
              </button>
              <button onClick={resetForm} disabled={isSaving} className="px-4 py-2 bg-gray-600 text-white rounded mr-2 disabled:opacity-70">Cancel</button>
              <button onClick={openList} className="px-4 py-2 bg-indigo-500 text-white rounded mr-2">View List</button>
            </div>
            <div className="text-right">
              <p>Total Pcs: {totalPcs}</p>
            </div>
          </div>

          {/* List Modal */}
          {showList && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">Outward Challan List</h2>
                <div className="flex justify-center mb-4">
                  <input type="text" placeholder="Search by Challan No, Party, or Date" value={search} onChange={(e) => setSearch(e.target.value)} className="border p-2 rounded w-full mb-4" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="border p-2 text-center">#</th>
                        <th className="border p-2 text-center">Challan No</th>
                        <th className="border p-2 text-center">Party Name</th>
                        <th className="border p-2 text-center">Date</th>
                        <th className="border p-2 text-center">Total Pcs</th>
                        <th className="border p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.filter((x) => {
                        const q = search.toLowerCase();
                        return (!q || x.challanNo.toLowerCase().includes(q) || x.partyName.toLowerCase().includes(q) || x.date.toLowerCase().includes(q));
                      }).map((x, i) => (
                        <tr key={x.serialNo}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2 text-center">{x.challanNo}</td>
                          <td className="border p-2 text-center">{x.partyName}</td>
                          <td className="border p-2 text-center">{x.date}</td>
                          <td className="border p-2 text-center">{x.totalPcs}</td>
                          <td className="border p-2 text-center">
                            <button onClick={() => onEditFromList(x.serialNo)} className="px-3 py-1 bg-green-500 text-white rounded mr-2">Edit</button>
                            <button onClick={() => onDeleteFromList(x.serialNo)} className="px-3 py-1 bg-red-500 text-white rounded mr-2">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {list.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-3 text-gray-500">No data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="text-center mt-6">
                  <button onClick={() => setShowList(false)} className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default OutwardChallan;
