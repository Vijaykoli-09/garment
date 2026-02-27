import React, { useCallback, useEffect, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

interface RowData {
  id: number;
  orderNo: string;
  materialId?: number;   // ✅ add this line
  itemName: string;
  unit: string;
  shadeCode?: string;
  shadeName?: string;
  returnRolls: string;
  returnQuantity: string;
  returnWeight: string;
  rate: string;
  amount: string;
}


const PurchaseReturn: React.FC = () => {
  const [rows, setRows] = useState<RowData[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [partyId, setPartyId] = useState("");
  const [date, setDate] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [returns, setReturns] = useState<any[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);
  const [showReturnList, setShowReturnList] = useState(false);
  const [, setLoading] = useState(false);
  

  // Fetch party list
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await api.get("/party/category/Purchase");
        setParties(res.data);
      } catch (err) {
        console.error("Party fetch error:", err);
        Swal.fire("Error", "Failed to load parties", "error");
      }
    };
    fetchParties();
  }, []);

  // 🔹 When party is selected, fetch template items from backend
const handlePartyChange = async (partyId: string) => {
  setPartyId(partyId);
  if (!partyId) return;

  try {
    const res = await api.get(`/purchase-returns/template/${partyId}`);
    if (res.data && Array.isArray(res.data)) {
      setRows(
  res.data.map((item: any, index: number) => ({
    id: index + 1,
    orderNo: item.orderNo || "",
    materialId: item.materialId || null, // ✅ ADD THIS
    itemName: item.materialName || "",
    unit: item.unit || "",
    shadeCode: item.shadeCode || "",
    shadeName: item.shadeName || "",
    returnRolls: item.returnRolls?.toString() || "",
    returnQuantity: item.quantity?.toString() || "",
    returnWeight: item.returnWeight?.toString() || "",
    rate: item.rate?.toString() || "",
    amount: item.amount?.toString() || "",
  }))
);

    } else {
      Swal.fire("Info", "No purchase order items found for this party", "info");
      setRows([]);
    }
  } catch (err) {
    console.error("Error fetching template by party:", err);
    Swal.fire("Error", "Failed to load purchase items for party", "error");
  }
};

  // Add empty row
  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        orderNo: "",
        itemName: "",
        unit: "",
        shadeName: "",
        returnRolls: "",
        returnQuantity: "",
        returnWeight: "",
        rate: "",
        amount: "",
      },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, [addRow, rows.length]);

  // Handle input change + auto amount calc
  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === "returnQuantity" || field === "rate") {
            const qty = parseFloat(updated.returnQuantity) || 0;
            const rate = parseFloat(updated.rate) || 0;
            updated.amount = (qty * rate).toFixed(2);
          }
          return updated;
        }
        return r;
      })
    );
  };

  // Checkbox select
  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedRows((prev) =>
      checked ? [...prev, id] : prev.filter((rowId) => rowId !== id)
    );
  };

  // Selected row data
  // const getSelectedData = () => rows.filter((r) => selectedRows.includes(r.id));

  // Build payload for Save/Update
const buildPayload = () => ({
  date,
  challanNo,
  partyId: partyId ? parseInt(partyId) : null,
  items: rows.map((r) => ({
    orderNo: r.orderNo,
    materialId: r.materialId ?? null,
    materialName: r.itemName,
    shadeCode: r.shadeCode || "",
    shadeName: r.shadeName || "",
    unit: r.unit,
    returnRolls: r.returnRolls,
    quantity: parseFloat(r.returnQuantity) || 0,
    rate: parseFloat(r.rate) || 0,
    amount: parseFloat(r.amount) || 0,
  })),
});




  const handleSubmit = async () => {
  if (!partyId) return Swal.fire("Validation Error", "Please select a Party.", "warning");
  if (rows.length === 0) return Swal.fire("No Selection", "Please add at least one item.", "warning");

  try {
    setLoading(true);
    const payload = buildPayload();
    await (selectedReturnId
      ? api.put(`/purchase-returns/${selectedReturnId}`, payload)
      : api.post("/purchase-returns", payload));

    Swal.fire({
      icon: "success",
      title: selectedReturnId ? "Updated!" : "Saved!",
      text: `Purchase Return ${selectedReturnId ? "updated" : "saved"} successfully.`,
      timer: 2000,
      showConfirmButton: false,
    });

    setSelectedReturnId(null);
    setPartyId("");
    setChallanNo("");
    setDate("");
    setRows([]);
    setSelectedRows([]);
    setShowReturnList(false);

  } catch (err: any) {
    console.error(err);
    Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Operation failed." });
  } finally {
    setLoading(false);
  }
};


  // Delete
  const handleDelete = async () => {
    if (!selectedReturnId)
      return Swal.fire("No record selected", "Please select a record first", "warning");

    const confirm = await Swal.fire({
      title: "Delete this Return?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });
    if (confirm.isConfirmed) {
      try {
        await api.delete(`/purchase-returns/${selectedReturnId}`);
        Swal.fire("Deleted!", "Purchase Return deleted successfully", "success");
        fetchReturns();
        setShowReturnList(false);
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire("Error", "Failed to delete return", "error");
      }
    }
  };

  // Fetch Return List
  const fetchReturns = async () => {
    try {
      const res = await api.get("/purchase-returns");
      setReturns(res.data);
      setFilteredReturns(res.data);
      setShowReturnList(true);
    } catch (err) {
      console.error("Fetch error:", err);
      Swal.fire("Error", "Failed to fetch returns", "error");
    }
  };

  // Edit handler to populate form
const handleEditReturn = (ret: any) => {
  setShowReturnList(false);
  setSelectedReturnId(ret.id);
  setDate(ret.date || "");
  setChallanNo(ret.challanNo || "");

  const foundParty = parties.find((p) => p.id === ret.partyId);
  setPartyId(foundParty ? foundParty.id.toString() : "");

  setRows(
    (ret.items || []).map((i: any, idx: number) => ({
      orderNo: i.orderNo || "",
      itemName: i.itemName || "",
      unit: i.unit || "",
      shadeCode: i.shadeCode || "",
      shadeName: i.shadeName || "",
      returnRolls: i.returnRolls?.toString() || "",
      returnQuantity: i.quantity?.toString() || "",
      returnWeight: i.returnWeight?.toString() || "",
      rate: i.rate?.toString() || "",
      amount: i.amount?.toString() || "",
      materialId: i.materialId || null,
    }))
  );
};


  // Search filter
  useEffect(() => {
    if (searchTerm.trim() === "") setFilteredReturns(returns);
    else {
      const term = searchTerm.toLowerCase();
      setFilteredReturns(
        returns.filter((r) => {
          const challan = r.challanNo?.toLowerCase() || "";
          const dateStr = r.date?.toLowerCase() || "";
          const party = r.partyName?.toLowerCase() || "";
          return challan.includes(term) || dateStr.includes(term) || party.includes(term);
        })
      );
    }
  }, [searchTerm, returns]);

  

  return (
    <Dashboard>
      <div className="bg-gray-100 p-6 min-h-screen">
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-bold text-2xl text-center">Purchase Return</h2>

          {/* Header */}
          <div className="gap-4 grid grid-cols-4 mb-6">
            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
  value={partyId}
  onChange={(e) => handlePartyChange(e.target.value)}
  className="p-2 border rounded w-full"
>
                <option value="">Select Party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partyName}
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
                className="p-2 border rounded w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="border border-gray-400 w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border text-center">Select</th>
                  <th className="p-2 border">S No</th>
                  <th className="p-2 border">Order No</th>
                  <th className="p-2 border">Item Name</th>
                  <th className="p-2 border">Unit</th>
                  <th className="p-2 border">Shade Name</th>
                  <th className="p-2 border">Return Rolls/Box</th>
                  <th className="p-2 border">Quantity</th>
                  <th className="p-2 border">Weight</th>
                  <th className="p-2 border">Rate</th>
                  <th className="p-2 border">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) =>
                          handleSelectRow(row.id, e.target.checked)
                        }
                      />
                    </td>
                    <td className="p-2 border text-center">{index + 1}</td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.orderNo}
                        onChange={(e) => handleChange(row.id, "orderNo", e.target.value)}
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.itemName}
                        onChange={(e) => handleChange(row.id, "itemName", e.target.value)}
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => handleChange(row.id, "unit", e.target.value)}
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.shadeName}
                        onChange={(e) =>
                          handleChange(row.id, "shadeName", e.target.value)
                        }
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.returnRolls}
                        onChange={(e) =>
                          handleChange(row.id, "returnRolls", e.target.value)
                        }
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.returnQuantity}
                        onChange={(e) =>
                          handleChange(row.id, "returnQuantity", e.target.value)
                        }
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.returnWeight}
                        onChange={(e) =>
                          handleChange(row.id, "returnWeight", e.target.value)
                        }
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.rate}
                        onChange={(e) => handleChange(row.id, "rate", e.target.value)}
                        className="p-1 border rounded w-full"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.amount}
                        onChange={(e) => handleChange(row.id, "amount", e.target.value)}
                        className="p-1 border rounded w-full"
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
              <button onClick={addRow} className="bg-blue-500 mr-2 px-4 py-2 rounded text-white">Add</button>
              <button onClick={handleSubmit} className="bg-green-500 mr-2 px-4 py-2 rounded text-white">Save</button>
              {/* <button onClick={handleUpdate} className="bg-yellow-500 mr-2 px-4 py-2 rounded text-white">Update</button> */}
              <button onClick={handleDelete} className="bg-red-500 mr-2 px-4 py-2 rounded text-white">Delete</button>
              <button onClick={fetchReturns} className="bg-indigo-500 mr-2 px-4 py-2 rounded text-white">Return List</button>
            </div>
            <div className="text-right">
              <p>
                Rolls:{" "}
                {rows.reduce((sum, r) => sum + (parseFloat(r.returnRolls) || 0), 0)}
              </p>
              <p>
                Weight:{" "}
                {rows
                  .reduce((sum, r) => sum + (parseFloat(r.returnWeight) || 0), 0)
                  .toFixed(3)}
              </p>
              <p>
                Amount:{" "}
                {rows
                  .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
          {/* Return List Modal */}
{showReturnList && (
  <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
    <div className="bg-white shadow-lg p-6 rounded-lg w-11/12 md:w-9/12 max-h-[90vh] overflow-y-auto">
      <h2 className="mb-4 font-semibold text-blue-600 text-2xl text-center">
        Purchase Return List
      </h2>

      <input
        type="text"
        placeholder="Search by Challan No, Party, or Date"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />

      <div className="overflow-x-auto">
        <table className="border border-gray-300 min-w-full text-sm">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 border text-center">#</th>
              <th className="p-2 border text-center">Date</th>
              <th className="p-2 border text-center">Order No</th>
              <th className="p-2 border text-center">Party</th>
              <th className="p-2 border text-center">Items</th>
              <th className="p-2 border text-center">Amount</th>
              <th className="p-2 border text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-gray-500 text-center">
                  No Returns Found
                </td>
              </tr>
            ) : (
              filteredReturns.map((ret, idx) => (
                <tr key={ret.id}>
                  <td className="p-2 border text-center">{idx + 1}</td>
                  <td className="p-2 border text-center">{ret.date}</td>
                  <td className="p-2 border text-center">
  {(ret.items || [])
    .map((i: any) => i.orderNo)
    .filter(Boolean)
    .join(", ")}
</td>
                  <td className="p-2 border text-center">{ret.partyName}</td>
                  <td className="p-2 border text-center">
  {(ret.items || []).map((i: any) => i.itemName).join(", ")}
</td>

                  <td className="p-2 border text-center">
  {(ret.items || [])
    .map((i: any) => i.amount)
    .filter((a: null | undefined) => a !== undefined && a !== null)
    .join(", ")}
</td>


                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleEditReturn(ret)}
                      className="bg-green-500 mr-2 px-3 py-1 rounded text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReturnId(ret.id);
                        handleDelete();
                      }}
                      className="bg-red-500 px-3 py-1 rounded text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => setShowReturnList(false)}
          className="bg-gray-600 hover:bg-gray-700 px-5 py-2 rounded text-white transition-all"
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

export default PurchaseReturn;
        

