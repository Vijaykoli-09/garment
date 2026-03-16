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
interface ArtListItem {
  serialNumber?: string;
  serialNo?: string;
  artNo?: string;
  artName?: string;
  name?: string;
  id?: string;
}

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
        Swal.fire("Updated", "Inward Challan updated successfully.", "success");
      } else {
        const res = await api.post("/job-inward-challan", payload);
        if (res?.data?.id) patchForm({ id: res.data.id });
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

      setList(mapped);
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
        String(a.serialNumber ?? a.serialNo ?? a.id ?? "") === String(artVal) ||
        String(a.artName ?? a.name ?? "").toLowerCase().trim() === String(artVal).toLowerCase().trim(),
    );

    const serialToUse = masterMatch
      ? String(masterMatch.serialNumber ?? masterMatch.serialNo ?? masterMatch.id ?? "")
      : artVal;

    const artDetail = await fetchArtDetail(serialToUse);

    if (masterMatch && serialToUse !== artVal) {
      patchRow(rowId, { artNo: serialToUse });
    }

    const rate = deriveRateFromArt(artDetail ?? null, currentProcessName);
    patchRow(rowId, {
      rate: rate || "",
      amount: ((Number(form.rows.find((r) => r.id === rowId)?.pcs || 0) * Number(rate || 0))).toFixed(2),
    });
  };

  // Fill from outward challan when party selected — ✅ ensure lot no only
  const handlePartySelected = async (partyId: string) => {
    patchForm({ partyId });
    if (!partyId) return;

    try {
      const res = await api.get("/job-outward-challan", { params: { partyId } });
      const docs: any[] = Array.isArray(res.data) ? res.data : [];
      if (!docs.length) {
        patchForm({ rows: [emptyRow(1)], artHeader: "" });
        return;
      }

      // most recent for header art
      const sorted = docs.slice().sort((a: any, b: any) => {
        const da = a?.date ? new Date(a.date).getTime() : 0;
        const db = b?.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
      const mostRecent = sorted[0];
      const headerRawMostRecent =
        mostRecent.processArtNo || mostRecent.headerArtNo || mostRecent.processArt || "";

      // resolve header serial
      let headerSerial = "";
      if (headerRawMostRecent) {
        const masterHeader = arts.find(
          (a) =>
            String(a.serialNumber ?? a.serialNo ?? a.id ?? "") === String(headerRawMostRecent) ||
            String(a.artName ?? a.name ?? "").toLowerCase().trim() === String(headerRawMostRecent).toLowerCase().trim() ||
            String(a.artNo ?? "").toLowerCase().trim() === String(headerRawMostRecent).toLowerCase().trim(),
        );
        headerSerial = masterHeader
          ? String(masterHeader.serialNumber ?? masterHeader.serialNo ?? masterHeader.id ?? "")
          : headerRawMostRecent;
      }

      const allRows: RowData[] = [];
      let nextId = 1;

      docs.forEach((doc) => {
        const headerRawDoc =
          doc.processArtNo || doc.headerArtNo || doc.processArt || headerRawMostRecent || "";
        const outwardRows = Array.isArray(doc.rows) ? doc.rows : [];

        outwardRows.forEach((r: any) => {
          // ✅ normalize lot no here
          const cutLot = normalizeCutLotNoLoose(
            r.cutLotNo || r.cuttinglotNumber || r.cuttingLotNumber || r.cutlotNo || "",
          );

          const cuttingDozenVal = String(r.cuttingDozenPcs ?? r.cuttingDozen ?? "");
          const rawArtVal = String(r.artNo || r.art_no || r.art || headerRawDoc || "");
          const sizeNameVal = String(r.size || r.sizeName || r.itemName || "");

          const masterMatch = arts.find(
            (a) =>
              String(a.serialNumber ?? a.serialNo ?? a.id ?? "") === String(rawArtVal) ||
              String(a.artName ?? a.name ?? "").toLowerCase().trim() === String(rawArtVal).toLowerCase().trim() ||
              String(a.artNo ?? "").toLowerCase().trim() === String(rawArtVal).toLowerCase().trim(),
          );

          const artNoForRow = masterMatch
            ? String(masterMatch.serialNumber ?? masterMatch.serialNo ?? masterMatch.id ?? "")
            : rawArtVal;

          allRows.push({
            id: nextId++,
            cuttinglotNumber: cutLot, // ✅ only cutLotNo
            cuttingDozen: cuttingDozenVal,
            artNo: artNoForRow,
            sizeName: sizeNameVal,
            pcs: "",
            wastage: "",
            rate: "",
            amount: "0.00",
            selected: true,
          });
        });
      });

      patchForm({
        rows: allRows.length ? allRows : [emptyRow(1)],
        artHeader: headerSerial || "",
      });
    } catch (err) {
      console.error("Failed to fetch outward challans for party", partyId, err);
    }
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
              <select
                value={form.processId}
                onChange={(e) => patchForm({ processId: e.target.value })}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Process</option>
                {processes.map((p) => (
                  <option key={p.serialNo} value={p.serialNo}>
                    {p.processName}
                  </option>
                ))}
              </select>
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
                  const key = String(a.serialNumber ?? a.serialNo ?? a.id ?? "");
                  const label = String(a.artName ?? a.name ?? "");
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
                        className="border p-1 rounded w-full"
                        value={normalizeCutLotNoLoose(row.cuttinglotNumber)}
                        onChange={(e) => patchRow(row.id, { cuttinglotNumber: e.target.value })}
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
                            const key = String(a.serialNumber ?? a.serialNo ?? a.id ?? "");
                            const label = String(a.artName ?? a.name ?? "");
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
                        type="number"
                        className="border p-1 rounded w-full"
                        value={row.pcs}
                        onChange={(e) => patchRow(row.id, { pcs: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        type="number"
                        className="border p-1 rounded w-full"
                        value={row.wastage}
                        onChange={(e) => patchRow(row.id, { wastage: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        type="number"
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
              <button onClick={resetForm} className="px-4 py-2 bg-gray-600 text-white rounded mr-2">
                Cancel
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
                          const artNoDisplay = String(a.artNo ?? a.serialNumber ?? a.serialNo ?? a.id ?? "").toLowerCase();
                          const artName = String(a.artName ?? a.name ?? "").toLowerCase();
                          return artNoDisplay.includes(q) || artName.includes(q);
                        })
                        .map((a) => {
                          const artSerial = String(a.serialNumber ?? a.serialNo ?? a.id ?? "");
                          const artNoDisplay = String(a.artNo ?? a.serialNumber ?? a.serialNo ?? a.id ?? "");
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