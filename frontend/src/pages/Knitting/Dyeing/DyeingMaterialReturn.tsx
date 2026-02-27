import React, { useState, useCallback, useEffect } from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

// Interface for table rows
interface RowData {
  id: number;
  lotNo: string;
  item: string;
  shade: string;
  processing: string;
  rolls: string;
  weight: string;
  wastage: string;
  remarks: string;
}

// Interface for party
interface Party {
  id: number;
  partyName: string;
}

const DyeingMaterialReturn: React.FC = () => {
  const [rows, setRows] = useState<RowData[]>([]);
  const [docType, setDocType] = useState<string>("Return");
  const [challanNo, setChallanNo] = useState<string>("");
  const [dated, setDated] = useState<string>("");
  const [partyName, setPartyName] = useState<string>("");
  const [partyId, setPartyId] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [through, setThrough] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [totalRolls, setTotalRolls] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalWastage, setTotalWastage] = useState<number>(0);
  const [parties, setParties] = useState<Party[]>([]);
  const [dyeingInwardList, setDyeingInwardList] = useState<any[]>([]);
  const [selectedInward, setSelectedInward] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showInwardModal, setShowInwardModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Load parties on mount
  useEffect(() => {
    const loadParties = async () => {
      try {
        const response = await api.get("/party/category/Dyeing");
        setParties(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to fetch parties", err);
        Swal.fire("Error", "Failed to load party list", "error");
      }
    };
    loadParties();
  }, []);

  // Load dyeing inwards when party changes
  useEffect(() => {
    if (!partyId) {
      setDyeingInwardList([]);
      setSelectedInward("");
      return;
    }

    const loadInwards = async () => {
      try {
        const response = await api.get("/dyeing-inward");
        const allInwards = Array.isArray(response.data) ? response.data : [];
        const filtered = allInwards.filter((inward: any) => inward.partyName === partyName);
        setDyeingInwardList(filtered);
      } catch (err) {
        console.error("Failed to fetch dyeing inwards", err);
        Swal.fire("Error", "Failed to load dyeing inwards", "error");
        setDyeingInwardList([]);
      }
    };
    loadInwards();
  }, [partyId, partyName]);

  // Auto-fill rows from selected inward
  useEffect(() => {
    if (!selectedInward || isEditMode) return;

    const inward = dyeingInwardList.find((i: any) => String(i.id) === String(selectedInward));
    if (!inward || !inward.rows) {
      setRows([]);
      return;
    }

    const mappedRows = inward.rows.map((row: any, idx: number) => ({
      id: Date.now() + idx,
      lotNo: row.fabricLotNo || "",
      item: row.fabric || "",
      shade: row.shade || "",
      processing: "",
      rolls: row.rolls?.toString() || "",
      weight: row.weight?.toString() || "",
      wastage: "",
      remarks: "",
    }));

    setRows(mappedRows);
  }, [selectedInward, isEditMode, dyeingInwardList]);

  // Add a new empty row
  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: prev.length > 0 ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
        lotNo: "",
        item: "",
        shade: "",
        processing: "",
        rolls: "",
        weight: "",
        wastage: "",
        remarks: "",
      },
    ]);
  }, []);

  // Recalculate totals whenever rows change
  useEffect(() => {
    let rollsTotal = 0;
    let weightTotal = 0;
    let wastageTotal = 0;
    rows.forEach((row) => {
      rollsTotal += Number(row.rolls) || 0;
      weightTotal += Number(row.weight) || 0;
      wastageTotal += Number(row.wastage) || 0;
    });
    setTotalRolls(rollsTotal);
    setTotalWeight(weightTotal);
    setTotalWastage(wastageTotal);
  }, [rows]);

  // Initialize with one row
  useEffect(() => {
    if (rows.length === 0) {
      addRow();
    }
  }, [rows.length, addRow]);

  // Handle row field change
  const handleRowChange = (id: number, field: keyof RowData, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Prepare payload for API
  const preparePayload = () => ({
    docType,
    challanNo,
    dated,
    partyName,
    partyId: Number(partyId),
    inwardId: selectedInward ? Number(selectedInward) : null,
    vehicleNo,
    through,
    narration,
    totalRolls,
    totalWeight,
    totalWastage,
    rows: rows.map((row) => ({
      id: row.id, // optional if backend doesn't require
      lotNo: row.lotNo,
      item: row.item,
      shade: row.shade,
      processing: row.processing,
      rolls: Number(row.rolls) || 0,
      weight: Number(row.weight) || 0,
      wastage: Number(row.wastage) || 0,
      remarks: row.remarks,
    })),
  });

  // Save new record
  const handleSave = async () => {
    if (!partyName || !dated || !challanNo) {
      Swal.fire("Validation Error", "Please fill: Party, Date, and Challan No.", "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = preparePayload();
      const response = await api.post("/material-return/save", payload);
      const savedId = response.data.id;

      Swal.fire("Success", "Material return saved successfully!", "success");
      setEditId(savedId);
      setIsEditMode(true);
    } catch (err: any) {
      console.error("Save Error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to save material return",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update existing record
  const handleUpdate = async () => {
    if (!editId) {
      Swal.fire("Error", "No record selected for update", "warning");
      return;
    }

    if (!partyName || !dated || !challanNo) {
      Swal.fire("Validation Error", "Please fill required fields", "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = preparePayload();
      await api.put(`/material-return/update/${editId}`, payload);
      Swal.fire("Success", "Material return updated successfully!", "success");
    } catch (err: any) {
      console.error("Update Error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to update material return",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete record
  const handleDelete = async () => {
    if (!editId) {
      Swal.fire("Info", "No record to delete", "info");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the record.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/material-return/delete/${editId}`);
        Swal.fire("Deleted", "Record deleted successfully", "success");
        handleClear();
      } catch (err: any) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Failed to delete record", "error");
      }
    }
  };

  // Clear form
  const handleClear = () => {
    setDocType("Return");
    setChallanNo("");
    setDated("");
    setPartyName("");
    setPartyId("");
    setVehicleNo("");
    setThrough("");
    setNarration("");
    setRows([]);
    setTotalRolls(0);
    setTotalWeight(0);
    setTotalWastage(0);
    setIsEditMode(false);
    setEditId(null);
    setSelectedInward("");
    addRow();
  };

  // Fetch and edit existing record
  const handleEdit = async (id: number) => {
    try {
      setLoading(true);
      const response = await api.get(`/material-return/${id}`);
      const data = response.data;

      setEditId(data.id);
      setDocType(data.docType || "Return");
      setChallanNo(data.challanNo || "");
      setDated(data.dated || "");
      setPartyName(data.partyName || "");
      setPartyId(String(data.partyId) || "");
      setVehicleNo(data.vehicleNo || "");
      setThrough(data.through || "");
      setNarration(data.narration || "");
      setSelectedInward(String(data.inwardId) || "");

      // ✅ Critical Fix: Map with `id` field
      const mappedRows = data.rows.map((row: any, idx: number) => ({
        id: Date.now() + idx, // Ensure unique ID
        lotNo: row.lotNo || "",
        item: row.item || "",
        shade: row.shade || "",
        processing: row.processing || "",
        rolls: String(row.rolls || ""),
        weight: String(row.weight || ""),
        wastage: String(row.wastage || ""),
        remarks: row.remarks || "",
      }));

      setRows(mappedRows);
      setIsEditMode(true);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      Swal.fire("Error", "Failed to load record", "error");
    } finally {
      setLoading(false);
    }
  };

  // Show list of saved records
  const openListModal = async () => {
    try {
      setLoading(true);
      const response = await api.get("/material-return/list");
      const list = Array.isArray(response.data) ? response.data : [];

      Swal.fire({
        title: "Material Return List",
        html: `
          <div style="max-height: 400px; overflow-y: auto; text-align: left;">
            <table class="swal2-table" border="1" cellspacing="0" cellpadding="8" style="width: 100%; font-size: 13px;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th>#</th>
                  <th>Date</th>
                  <th>Challan No</th>
                  <th>Party</th>
                  <th>Total Weight</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list
                  .map(
                    (item: any, i: number) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${new Date(item.dated).toLocaleDateString()}</td>
                    <td>${item.challanNo}</td>
                    <td>${item.partyName}</td>
                    <td>${item.totalWeight.toFixed(2)}</td>
                    <td>
                      <button class="edit-btn" data-id="${
                        item.id
                      }" style="margin: 0 4px; padding: 2px 6px; background: #007bff; color: white; border: none; border-radius: 4px;">Edit</button>
                      <button class="delete-btn" data-id="${
                        item.id
                      }" style="margin: 0 4px; padding: 2px 6px; background: #dc3545; color: white; border: none; border-radius: 4px;">Delete</button>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `,
        width: "80%",
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
          // Attach event listeners
          document.querySelectorAll(".edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const id = Number((e.target as HTMLElement).getAttribute("data-id"));
              Swal.close();
              handleEdit(id);
            });
          });
          document.querySelectorAll(".delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const id = Number((e.target as HTMLElement).getAttribute("data-id"));
              Swal.close();
              setEditId(id);
              handleDelete();
            });
          });
        },
      });
    } catch (err: any) {
      console.error("List Error:", err);
      Swal.fire("Error", "Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Dyeing Material Return</h2>

          {/* Form Fields */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Doc Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="border p-2 rounded w-full"
                disabled={isEditMode}
              >
                <option value="Return">Return</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input
                type="text"
                value={challanNo}
                onClick={() => setShowInwardModal(true)}
                readOnly
                className="border p-2 rounded w-full cursor-pointer bg-gray-50 hover:bg-gray-100"
                placeholder="Click to select Inward"
              />
            </div>
            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={dated}
                onChange={(e) => setDated(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">
                Party Name <span className="text-red-500">*</span>
              </label>
              <select
                value={partyId}
                onChange={(e) => {
                  const selectedParty = parties.find((p) => String(p.id) === e.target.value);
                  setPartyId(e.target.value);
                  setPartyName(selectedParty?.partyName || "");
                }}
                className="border p-2 rounded w-full"
                disabled={isEditMode}
              >
                <option value="">-- Select Party --</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Vehicle No.</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Through</label>
              <input
                type="text"
                value={through}
                onChange={(e) => setThrough(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold">Narration</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-red-500 text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S No</th>
                  <th className="border p-2">Lot No</th>
                  <th className="border p-2">Item</th>
                  <th className="border p-2">Shade</th>
                  <th className="border p-2">Processing</th>
                  <th className="border p-2">Rolls</th>
                  <th className="border p-2">Weight</th>
                  <th className="border p-2">Wastage</th>
                  <th className="border p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.lotNo}
                        onChange={(e) => handleRowChange(row.id, "lotNo", e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => handleRowChange(row.id, "item", e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.shade}
                        onChange={(e) => handleRowChange(row.id, "shade", e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.processing}
                        onChange={(e) => handleRowChange(row.id, "processing", e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.rolls}
                        onChange={(e) => handleRowChange(row.id, "rolls", e.target.value)}
                        className="border p-1 rounded w-full text-right"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.weight}
                        onChange={(e) => handleRowChange(row.id, "weight", e.target.value)}
                        className="border p-1 rounded w-full text-right"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.wastage}
                        onChange={(e) => handleRowChange(row.id, "wastage", e.target.value)}
                        className="border p-1 rounded w-full text-right"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleRowChange(row.id, "remarks", e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border p-2 text-right" colSpan={5}>
                    Total
                  </td>
                  <td className="border p-2 text-right">{totalRolls}</td>
                  <td className="border p-2 text-right">{totalWeight.toFixed(2)}</td>
                  <td className="border p-2 text-right">{totalWastage.toFixed(2)}</td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mt-4">
            <button
              onClick={addRow}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add Row
            </button>
            <div className="space-x-2">
              <button
                onClick={handleSave}
                disabled={loading || isEditMode}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading && !isEditMode ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading || !isEditMode}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-400"
              >
                {loading && isEditMode ? "Updating..." : "Update"}
              </button>
              <button
                onClick={openListModal}
                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
              >
                List
              </button>
              <button
                onClick={handleClear}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Clear
              </button>
              <button
                onClick={() => window.history.back()}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Select Dyeing Inward Modal */}
      {showInwardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Dyeing Inward</h3>
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">S No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Challan No</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dyeingInwardList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border p-4 text-center text-gray-500">
                        No records found for this party.
                      </td>
                    </tr>
                  ) : (
                    dyeingInwardList.map((inward: any, idx: number) => (
                      <tr key={inward.id}>
                        <td className="border p-2">{idx + 1}</td>
                        <td className="border p-2">
                          {inward.dated ? new Date(inward.dated).toLocaleDateString() : "-"}
                        </td>
                        <td className="border p-2">{inward.challanNo || "-"}</td>
                        <td className="border p-2">{inward.partyName || "-"}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedInward(String(inward.id));
                              setChallanNo(inward.challanNo || "");
                              setShowInwardModal(false);
                            }}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowInwardModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default DyeingMaterialReturn;