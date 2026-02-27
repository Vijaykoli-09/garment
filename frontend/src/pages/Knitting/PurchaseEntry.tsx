import React, { useCallback, useEffect, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

interface RowData {
  id: number;
  orderNo: string;
  yarnName: string;
  materialGroupId?: string;
  materialId: string;
  materialName: string;
  unit: string;
  shadeCode: string;
  shadeName: string;
  receivedRolls: string;
  receivedWtBox: string;
  rate: string;
  amount: string;
}

interface Party {
  id: number;
  partyName: string;
}

interface Material {
  materialGroupId: any;
  id: number;
  materialName: string;
  materialUnit: string;
}

interface Shade {
  shadeCode: string;
  shadeName: string;
}

interface Yarn {
  serialNo: string;
  yarnName: string;
}

const PurchaseEntry: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<RowData[]>([]);
  const [date, setDate] = useState("");
  const [partyId, setPartyId] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [entryId, setEntryId] = useState<number | null>(null);

  const [allParties, setAllParties] = useState<Party[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [allShades, setAllShades] = useState<Shade[]>([]);
  const [allMaterialGroups, setAllMaterialGroups] = useState<any[]>([]);
  const [allYarns, setAllYarns] = useState<Yarn[]>([]);

  const [showEntryList, setShowEntryList] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  const handleOrderSelect = (orderId: number) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  useEffect(() => {
    setChallanNo(""); // user will type manually
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        orderNo: "",
        yarnName: "",
        materialGroupId: "",
        materialId: "",
        materialName: "",
        unit: "",
        shadeCode: "",
        shadeName: "",
        receivedRolls: "",
        receivedWtBox: "",
        rate: "",
        amount: "",
      },
    ]);
  }, []);

  // 🔹 Add ONE empty row on first mount (for new entry)
  useEffect(() => {
    if (rows.length === 0 && entryId === null) {
      addRow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load parties, materials, shades, material groups, yarns
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [partyRes, matRes, shadeRes, groupRes, yarnRes] =
          await Promise.all([
            api.get("/party/category/Purchase"),
            api.get(`/materials`),
            api.get("/shade/list"),
            api.get("/material-groups"),
            api.get("/yarn/list"),
          ]);
        setAllParties(partyRes.data);
        setAllMaterials(matRes.data);
        setAllShades(shadeRes.data);
        setAllMaterialGroups(groupRes.data);
        setAllYarns(yarnRes.data);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load data", "error");
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
  // Load draft items only when creating a NEW entry
  if (partyId && entryId === null) {
    fetchDraftByParty();
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [partyId, entryId]);


  const handleMaterialGroupSelect = (id: number, groupId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              materialGroupId: groupId,
              materialId: "",
              materialName: "",
              unit: "",
            }
          : r
      )
    );
  };

  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleMaterialSelect = (id: number, materialId: string) => {
    const selectedMaterial = allMaterials.find(
      (m) => m.id.toString() === materialId
    );
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              materialId,
              materialName: selectedMaterial?.materialName || "",
              unit: selectedMaterial?.materialUnit || "",
              shadeCode: "",
              shadeName: "",
            }
          : r
      )
    );
  };

  const handleShadeSelect = (id: number, shadeCode: string) => {
    const selectedShade = allShades.find((s) => s.shadeCode === shadeCode);
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              shadeCode: shadeCode || "",
              shadeName: selectedShade?.shadeName || "",
            }
          : r
      )
    );
  };

  const mapToRequestDTO = (selectedRows = rows) => ({
    date,
    partyId: Number(partyId),
    challanNo,
    items: selectedRows.map((r) => ({
      materialId: r.materialId ? Number(r.materialId) : null,
      materialName: r.materialName,
      shadeCode: r.shadeCode || "",
      shadeName: r.shadeName || "",
      roll: parseFloat(r.receivedRolls) || 0,
      wtPerBox: parseFloat(r.receivedWtBox) || 0,
      rate: parseFloat(r.rate) || 0,
      amount: parseFloat(r.amount) || 0,
      orderNo: r.orderNo || "",
      yarnName: r.yarnName || "",
    })),
  });

  const fetchDraftByParty = async () => {
    try {
      const res = await api.get(`/purchase-entry/draft-by-party/${partyId}`);

      const mappedRows = res.data.map((item: any, index: number) => ({
        id: index + 1,
        orderNo: item.orderNo || "",
        yarnName: item.yarnName || "",
        materialGroupId:
          item.materialGroupId?.toString() ||
          item.material?.materialGroup?.id?.toString() ||
          "",
        materialId:
          item.materialId?.toString() || item.material?.id?.toString() || "",
        materialName: item.materialName || item.material?.materialName || "N/A",
        unit: item.unit || item.material?.materialUnit || "",
        shadeCode: item.shadeCode || item.shade?.shadeCode || "",
        shadeName: item.shadeName || item.shade?.shadeName || "",
        receivedRolls: item.roll?.toString() || "",
        receivedWtBox: item.wtPerBox?.toString() || "",
        rate: item.rate?.toString() || "",
        amount: item.amount?.toString() || "",
      }));

      setRows(mappedRows);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to fetch draft", "error");
    }
  };

  const handleInputChange = (id: number, field: string, value: string) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id === id) {
          const updatedRow: RowData = { ...row, [field]: value } as RowData;
          const wtBox = parseFloat(updatedRow.receivedWtBox || "0");
          const rate = parseFloat(updatedRow.rate || "0");
          updatedRow.amount = (wtBox * rate).toFixed(2);
          return updatedRow;
        }
        return row;
      })
    );
  };

  const handleSave = async () => {
    if (!partyId)
      return Swal.fire("Validation Error", "Please select a Party.", "warning");

    const selectedRows = rows.filter((row) => selectedOrders.includes(row.id));
    if (selectedRows.length === 0)
      return Swal.fire(
        "No Selection",
        "Please select at least one order to save.",
        "warning"
      );

    try {
      setLoading(true);
      const payload = mapToRequestDTO(selectedRows);
      await (entryId
        ? api.put(`/purchase-entry/${entryId}`, payload)
        : api.post("/purchase-entry", payload));

      Swal.fire({
        icon: "success",
        title: entryId ? "Updated!" : "Saved!",
        text: `Purchase entry ${entryId ? "updated" : "saved"} successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });

      // Clear form
      setEntryId(null);
      setDate("");
      setPartyId("");
      setChallanNo("");
      setRows([]);
      setSelectedOrders([]);
      setShowEntryList(false);

      // Add a fresh empty row for new entry
      addRow();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Operation failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTo = async () => {
    const selectedRows = rows.filter((row) => selectedOrders.includes(row.id));

    if (!partyId) {
      return Swal.fire("Validation Error", "Please select a Party.", "warning");
    }
    if (selectedRows.length === 0) {
      return Swal.fire(
        "No Selection",
        "Please select at least one order to issue.",
        "warning"
      );
    }

    const result = await Swal.fire({
      title: "Issue To",
      text: "Select the next process:",
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Knitting Outward",
      denyButtonText: "Other Process",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isDismissed) return;

    if (result.isDenied) {
      return Swal.fire("Info", "Other process selected. Feature coming soon!", "info");
    }

    try {
      setLoading(true);

      Swal.fire({
        title: "Issuing...",
        html: "Please wait while we process your request.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const payload = mapToRequestDTO(selectedRows);

      let id = entryId;
      if (id) {
        await api.put(`/purchase-entry/${id}`, payload);
      } else {
        const res = await api.post("/purchase-entry", payload);
        id = res.data?.id;
        setEntryId(id);
      }

      await api.post(`/purchase-entry/${id}/issue`);

      Swal.close();

      await Swal.fire({
        icon: "success",
        title: "Issued!",
        text: "Issued to Knitting Outward.",
        timer: 1200,
        showConfirmButton: false,
      });

      const itemsForPrefill = selectedRows.map((r) => ({
        materialId: Number(r.materialId),
        materialName: r.materialName,
        shadeCode: r.shadeCode || "",
        shadeName: r.shadeName || "",
        roll: parseFloat(r.receivedRolls) || 0,
        wtPerBox: parseFloat(r.receivedWtBox) || 0,
        rate: parseFloat(r.rate) || 0,
        amount: parseFloat(r.amount) || 0,
        orderNo: r.orderNo || "",
        unit: r.unit || "",
      }));

      navigate("/knitting/challan/outward-challan", {
        state: {
          refPartyId: Number(partyId),
          fromPurchaseEntryId: id,
          date,
          items: itemsForPrefill,
        },
      });
    } catch (err: any) {
      console.error("Issue error:", err);
      Swal.close();
      Swal.fire("Error", err?.response?.data?.message || "Issue failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await api.get("/purchase-entry");
      const data = res.data.map((entry: any) => ({
        ...entry,
        partyName: entry.party?.partyName || "(Unknown Party)",
      }));
      setEntries(data);
      setFilteredEntries(data);
      setShowEntryList(true);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load purchase entries", "error");
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredEntries(entries);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredEntries(
        entries.filter((e) => {
          const challan = e?.challanNo?.toLowerCase() || "";
          const entryDate = e?.date?.toLowerCase() || "";
          const partyName =
            e?.partyName?.toLowerCase() ||
            e?.party?.partyName?.toLowerCase() ||
            "";
          return (
            challan.includes(term) ||
            partyName.includes(term) ||
            entryDate.includes(term)
          );
        })
      );
    }
  }, [searchTerm, entries]);

  const handleEditEntry = async (entrySummary: any) => {
    try {
      const res = await api.get(`/purchase-entry/${entrySummary.id}`);
      const entry = res.data;

      setShowEntryList(false);
      setEntryId(entry.id || null);
      setDate(entry.date || "");
      setChallanNo(entry.challanNo || "");
      setPartyId(entry.party?.id?.toString() || "");

      setRows(
        (entry.items || []).map((i: any, idx: number) => {
          const mat = i.material || {};
          const shadeObj = i.shade || {};
          return {
            id: i.id || idx + 1,
            orderNo: i.orderNo || "",
            yarnName: i.yarnName || "",
            materialGroupId: mat.materialGroup?.id?.toString() || "",
            materialId: mat.id?.toString() || "",
            materialName: mat.materialName || "",
            unit: mat.materialUnit || "",
            shadeCode: i.shadeCode || shadeObj.shadeCode || "",
            shadeName: i.shadeName || shadeObj.shadeName || "",
            receivedRolls: i.roll?.toString() || "",
            receivedWtBox: i.wtPerBox?.toString() || "",
            rate: i.rate?.toString() || "",
            amount: i.amount?.toString() || "",
          };
        })
      );
    } catch (err) {
      console.error("Edit load error", err);
      Swal.fire("Error", "Failed to load entry for editing", "error");
    }
  };

  const handleDeleteEntry = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Delete this entry?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });
    if (confirm.isConfirmed) {
      try {
        await api.delete(`/purchase-entry/${id}`);
        Swal.fire("Deleted!", "Entry removed successfully.", "success");
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setFilteredEntries((prev) => prev.filter((e) => e.id !== id));
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete entry", "error");
      }
    }
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">
            Purchase Entry
          </h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Party</option>
                {allParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-center">#</th>
                  <th className="border p-2 text-center">Select Order</th>
                  <th className="border p-2 text-center">Order No</th>
                  <th className="border p-2 text-center">Yarn Name</th>
                  <th className="border p-2 text-center">Material Group</th>
                  <th className="border p-2 text-center">Material</th>
                  <th className="border p-2 text-center">Unit</th>
                  <th className="border p-2 text-center">Shade Name</th>
                  <th className="border p-2 text-center">Received Rolls</th>
                  <th className="border p-2 text-center">Quantity</th>
                  <th className="border p-2 text-center">Rate</th>
                  <th className="border p-2 text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, index) => {
                    const isChecked = selectedOrders.includes(row.id);

                    const filteredMaterials = row.materialGroupId
                      ? allMaterials.filter(
                          (m) =>
                            m.materialGroupId?.toString() === row.materialGroupId
                        )
                      : allMaterials;

                    return (
                      <tr key={row.id}>
                        <td className="border p-2 text-center">
                          {index + 1}
                        </td>

                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleOrderSelect(row.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>

                        <td className="border p-1">
                          <input
                            type="text"
                            value={row.orderNo}
                            readOnly
                            className="border p-1 rounded w-full bg-gray-100"
                          />
                        </td>

                        <td className="border p-1">
                          <select
                            value={row.yarnName}
                            onChange={(e) =>
                              handleChange(row.id, "yarnName", e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          >
                            <option value="">Select Yarn</option>
                            {allYarns.map((y) => (
                              <option key={y.serialNo} value={y.yarnName}>
                                {y.yarnName}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border p-1">
                          <select
                            value={row.materialGroupId || ""}
                            onChange={(e) =>
                              handleMaterialGroupSelect(row.id, e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          >
                            <option value="">Select Group</option>
                            {allMaterialGroups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.materialGroup}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border p-1">
                          <select
                            value={row.materialId}
                            onChange={(e) =>
                              handleMaterialSelect(row.id, e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          >
                            <option value="">Select Material</option>
                            {filteredMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.materialName}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border p-1 text-center">
                          {row.unit || "-"}
                        </td>

                        <td className="border p-1">
                          <select
                            value={row.shadeCode}
                            onChange={(e) =>
                              handleShadeSelect(row.id, e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          >
                            <option value="">Select Shade</option>
                            {allShades.map((s) => (
                              <option key={s.shadeCode} value={s.shadeCode}>
                                {s.shadeName}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border p-1">
                          <input
                            type="text"
                            value={row.receivedRolls}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "receivedRolls",
                                e.target.value
                              )
                            }
                            className="border p-1 rounded w-full"
                          />
                        </td>

                        <td className="border p-1">
                          <input
                            type="text"
                            value={row.receivedWtBox}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "receivedWtBox",
                                e.target.value
                              )
                            }
                            className="border p-1 rounded w-full"
                          />
                        </td>

                        <td className="border p-1">
                          <input
                            type="text"
                            value={row.rate}
                            onChange={(e) =>
                              handleInputChange(row.id, "rate", e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          />
                        </td>

                        <td className="border p-1 bg-gray-100 text-right pr-2">
                          {row.amount}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="text-center p-4 text-gray-500">
                      No rows added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Buttons */}
          <div className="flex justify-start space-x-3 mt-5">
            <button
              onClick={addRow}
              className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {entryId ? "Update" : "Save"}
            </button>

            <button
              onClick={handleIssueTo}
              disabled={loading}
              className="px-5 py-2 bg紫-500 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Issued To
            </button>

            <button
              onClick={fetchEntries}
              className="px-5 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Entry List
            </button>
          </div>

          {/* Purchase Entry List Modal */}
          {showEntryList && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">
                  Purchase Entry List
                </h2>

                <div className="flex justify-center mb-4">
                  <input
                    type="text"
                    placeholder="Search by Challan No, Party, or Date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border p-2 rounded w-full mb-4"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="border p-2 text-center">#</th>
                        <th className="border p-2 text-center">Challan No</th>
                        <th className="border p-2 text-center">Party Name</th>
                        <th className="border p-2 text-center">Date</th>
                        <th className="border p-2 text-center">Yarn Name</th>
                        <th className="border p-2 text-center">
                          Material Name
                        </th>
                        <th className="border p-2 text-center">
                          Receive Wt/Box
                        </th>
                        <th className="border p-2 text-center">Amount</th>
                        <th className="border p-2 text-center">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="text-center py-3 text-gray-500"
                          >
                            No Entries Found
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry, index) => {
                          const totalWtBox = (entry.items || []).reduce(
                            (sum: number, i: { wtPerBox: number }) =>
                              sum + (Number(i.wtPerBox) || 0),
                            0
                          );
                          const totalAmount = (entry.items || []).reduce(
                            (sum: number, i: { amount: number }) =>
                              sum + (Number(i.amount) || 0),
                            0
                          );

                          return (
                            <tr key={entry.id}>
                              <td className="border p-2 text-center">
                                {index + 1}
                              </td>
                              <td className="border p-2 text-center">
                                {entry.challanNo || "-"}
                              </td>
                              <td className="border p-2 text-center">
                                {entry.partyName || "(Unknown)"}
                              </td>
                              <td className="border p-2 text-center">
                                {entry.date}
                              </td>
                              <td className="border p-2 text-center">
                                {(entry.items || [])
                                  .map(
                                    (i: any) => i.yarnName || "-"
                                  )
                                  .join(", ")}
                              </td>
                              <td className="border p-2 text-center">
                                {(entry.items || [])
                                  .map(
                                    (i: any) =>
                                      i.material?.materialName ||
                                      i.materialName ||
                                      "-"
                                  )
                                  .join(", ")}
                              </td>

                              <td className="border p-2 text-center">
                                {totalWtBox}
                              </td>
                              <td className="border p-2 text-center">
                                ₹{totalAmount?.toFixed(2)}
                              </td>
                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => handleEditEntry(entry)}
                                  className="px-3 py-1 bg-green-500 text-white rounded mr-2 hover:bg-green-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-center mt-6">
                  <button
                    onClick={() => setShowEntryList(false)}
                    className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Dashboard>
  );
};

export default PurchaseEntry;
