import React, { useCallback, useEffect, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

interface RowData {
  id: number;
  yarnName: string;
  materialGroupId: string;
  materialId: string;
  shadeCode: string;
  roll: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
}

const PurchaseOrder: React.FC = () => {
  const [rows, setRows] = useState<RowData[]>([]);
  const [orderNo, setOrderNo] = useState("");
  const [partyId, setPartyId] = useState("");
  const [date, setDate] = useState("");
  const [parties, setParties] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [shades, setShades] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [yarns, setYarns] = useState<any[]>([]);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showOrderList, setShowOrderList] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ============================
  // BACKEND ORDER NO (auto-generate)
  // ============================
  const fetchNextOrderNo = useCallback(async () => {
    try {
      const res = await api.get("/purchase-orders/next-order-no");
      setOrderNo(res.data); // e.g. "2025/1001"
    } catch (err) {
      console.error("Failed to fetch next order no", err);
      Swal.fire("Error", "Failed to get next Order No from server", "error");
    }
  }, []);

  // First load -> get next order no from backend
  useEffect(() => {
    fetchNextOrderNo();
  }, [fetchNextOrderNo]);

  // ============================
  // ROW HANDLING
  // ============================
  const addRow = useCallback(() => {
    setRows((prevRows) => [
      ...prevRows,
      {
        id: prevRows.length + 1,
        yarnName: "",
        materialGroupId: "",
        materialId: "",
        shadeCode: "",
        roll: "",
        quantity: "",
        unit: "",
        rate: "",
        amount: "",
      },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, [addRow, rows.length]);

  // ============================
  // FETCH MASTER DATA
  // ============================
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [partyRes, materialRes, shadeRes, groupRes, yarnRes] =
          await Promise.all([
            api.get("/party/category/Purchase"),
            api.get("/materials"),
            api.get("/shade/list"),
            api.get("/material-groups"),
            api.get("/yarn/list"),
          ]);
        setParties(partyRes.data);
        setMaterials(materialRes.data);
        setShades(shadeRes.data);
        setGroups(groupRes.data);
        setYarns(yarnRes.data);
      } catch (err) {
        console.error("Meta fetch error:", err);
        Swal.fire("Error", "Failed to load dropdown data", "error");
      }
    };
    fetchMeta();
  }, []);

  // ============================
  // HANDLE ROW CHANGE
  // ============================
  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === id) {
          const updated: RowData = { ...r, [field]: value } as RowData;

          if (field === "materialGroupId") {
            updated.materialId = "";
            updated.unit = "";
          }

          if (field === "materialId") {
            const selectedMaterial = materials.find(
              (m: any) => m.id.toString() === value
            );
            updated.unit = selectedMaterial?.materialUnit || "";
          }

          if (field === "quantity" || field === "rate") {
            const qty = parseFloat(updated.quantity) || 0;
            const rate = parseFloat(updated.rate) || 0;
            updated.amount = (qty * rate).toFixed(2);
          }

          return updated;
        }
        return r;
      })
    );
  };

  // ============================
  // BUILD PAYLOAD
  // ============================
  const buildPayload = () => ({
    orderNo, // backend ignore/override on create, keep on update
    date,
    partyId: partyId ? parseInt(partyId) : null,
    items: rows
      .filter((r) => (r.yarnName || r.materialId) && r.quantity && r.rate)
      .map((r) => ({
        yarnName: r.yarnName || null,
        materialGroupId: r.materialGroupId ? parseInt(r.materialGroupId) : null,
        materialId: r.materialId ? parseInt(r.materialId) : null,
        shadeCode: r.shadeCode || null,
        roll: r.roll || null,
        quantity: r.quantity ? parseInt(r.quantity) : null,
        rate: r.rate ? parseFloat(r.rate) : null,
        amount: r.amount ? parseFloat(r.amount) : null,
        unit: r.unit || null,
      })),
  });

  // ============================
  // SAVE (CREATE / UPDATE)
  // ============================
  const handleSave = async () => {
    const payload = buildPayload();
    try {
      if (selectedOrderId) {
        // UPDATE existing order
        await api.put(
          `/purchase-orders/${selectedOrderId}`,
          payload
        );
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Purchase Order updated successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        // OrderNo update nahi karein (backend same hi rakhega)
      } else {
        // CREATE new order
        const res = await api.post("/purchase-orders", payload);
        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: "Purchase Order saved successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        setSelectedOrderId(res.data.id);
        setOrderNo(res.data.orderNo); // backend generated number
      }
    } catch (err: any) {
      console.error("Save error:", err.response?.data || err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to save purchase order.",
      });
    }
  };

  // ============================
  // ORDER LIST
  // ============================
  const fetchOrders = async () => {
    try {
      if (parties.length === 0 || materials.length === 0 || shades.length === 0) {
        Swal.fire("Please wait", "Loading required data...", "info");
        return;
      }
      setShowOrderList(true);
      const res = await api.get("/purchase-orders");
      const data = res.data;
      const enriched = data.map((order: any) => ({
        ...order,
        partyName: order.partyName || order.party?.partyName || "(Unknown Party)",
      }));
      setOrders(enriched);
      setFilteredOrders(enriched);
    } catch (err) {
      console.error("Order fetch error:", err);
      Swal.fire("Error", "Failed to load purchase orders", "error");
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOrders(orders);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredOrders(
        orders.filter((o) => {
          const oNo = o?.orderNo?.toLowerCase() || "";
          const dt = (o?.date || "").toString().toLowerCase();
          const pName =
            o?.party?.partyName?.toLowerCase() ||
            o?.partyName?.toLowerCase() ||
            "";
          return oNo.includes(term) || pName.includes(term) || dt.includes(term);
        })
      );
    }
  }, [searchTerm, orders]);

  // ============================
  // EDIT ORDER
  // ============================
  const handleEditOrder = (order: any) => {
    setShowOrderList(false);
    setSelectedOrderId(order.id);
    setOrderNo(order.orderNo || "");
    setDate(order.date || "");

    const foundParty = parties.find((p) => p.partyName === order.partyName);
    setPartyId(foundParty ? foundParty.id.toString() : "");

    setRows(
      (order.items || []).map((i: any, idx: number) => ({
        id: idx + 1,
        yarnName: i.yarnName || "",
        materialGroupId: i.materialGroupId?.toString() || "",
        materialId: i.materialId?.toString() || "",
        shadeCode: i.shadeCode || "",
        roll: i.roll?.toString() || "",
        quantity: i.quantity?.toString() || "",
        unit: i.unit || "",
        rate: i.rate?.toString() || "",
        amount: i.amount?.toString() || "",
      }))
    );
  };

  // ============================
  // DELETE ORDER
  // ============================
  const handleDeleteOrder = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Delete this order?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });
    if (confirm.isConfirmed) {
      try {
        await api.delete(`/purchase-orders/${id}`);
        Swal.fire("Deleted!", "Order removed successfully.", "success");
        setOrders((prev) => prev.filter((o) => o.id !== id));
        setFilteredOrders((prev) => prev.filter((o) => o.id !== id));

        // If currently editing same order, reset screen
        if (selectedOrderId === id) {
          setSelectedOrderId(null);
          setRows([]);
          setPartyId("");
          setDate("");
          await fetchNextOrderNo();
        }
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire("Error", "Failed to delete order", "error");
      }
    }
  };

  // ============================
  // ISSUE TO PURCHASE ENTITY
  // ============================
  const handleIssue = async () => {
    if (!selectedOrderId) {
      Swal.fire("No order selected to issue");
      return;
    }
    try {
      await api.post(`/purchase-orders/${selectedOrderId}/issue`);
      Swal.fire({
        icon: "success",
        title: "Issued!",
        text: "Order issued to Purchase Entity.",
        timer: 2000,
        showConfirmButton: false,
      });

      // New blank order after issue
      setSelectedOrderId(null);
      setRows([]);
      setPartyId("");
      setDate("");
      await fetchNextOrderNo();
    } catch (err) {
      console.error("Issue error:", err);
      Swal.fire("Error", "Failed to issue purchase order.", "error");
    }
  };

  // ============================
  // TOTALS
  // ============================
  const totalUnit = rows.reduce(
    (sum, r) => sum + (parseFloat(r.quantity) || 0),
    0
  );
  const totalAmount = rows.reduce(
    (sum, r) => sum + (parseFloat(r.amount) || 0),
    0
  );

  // ============================
  // PRINT
  // ============================
  const handlePrint = () => {
    const w = window.open("", "_blank")!;
    const party = parties.find((p) => String(p.id) === String(partyId));
    const partyName = party ? party.partyName : "";

    const printableRows = rows.filter(
      (r) => r.yarnName || r.materialGroupId || r.materialId
    );

    const totalQty = printableRows.reduce(
      (s, r) => s + (parseFloat(r.quantity) || 0),
      0
    );
    const totalAmt = printableRows.reduce(
      (s, r) => s + (parseFloat(r.amount) || 0),
      0
    );

    const html = `
      <html>
      <head>
        <title>Purchase Order</title>
        <style>
          body { font-family: Arial; padding: 10px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #444; padding: 6px; font-size: 12px; text-align: center; }
          thead th { background: #eee; }
          tfoot td { background: #f0f0a0; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Purchase Order</h2>
        <p style="text-align:center;">
          Order No: ${orderNo} &nbsp; | &nbsp; 
          Date: ${date} &nbsp; | &nbsp;
          Party: ${partyName}
        </p>

        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Yarn Name</th>
              <th>Material Group</th>
              <th>Material</th>
              <th>Shade</th>
              <th>Roll</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${printableRows
              .map((r, i) => {
                const groupName =
                  groups.find((g) => g.id === r.materialGroupId)?.materialGroup || "";
                const materialName =
                  materials.find((m) => m.id === r.materialId)?.materialName || "";
                const shadeName =
                  shades.find((s) => s.shadeCode === r.shadeCode)?.shadeName || "";

                return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.yarnName || ""}</td>
                  <td>${groupName}</td>
                  <td>${materialName}</td>
                  <td>${shadeName}</td>
                  <td>${r.roll}</td>
                  <td>${r.quantity}</td>
                  <td>${r.unit}</td>
                  <td>${r.rate}</td>
                  <td>${r.amount}</td>
                </tr>`;
              })
              .join("")}
          </tbody>

          <tfoot>
            <tr>
              <td colspan="6" style="text-align:right;">TOTAL</td>
              <td>${totalQty}</td>
              <td></td>
              <td></td>
              <td>₹${totalAmt.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  // ============================
  // RENDER
  // ============================
  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">
            Purchase Order
          </h2>

          {/* Header */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Order No.</label>
              <input
                type="text"
                value={orderNo}
                readOnly
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
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S No</th>
                  <th className="border p-2">Yarn Name</th>
                  <th className="border p-2">Material Group</th>
                  <th className="border p-2">Material(Item)</th>
                  <th className="border p-2">Shade</th>
                  <th className="border p-2">Roll</th>
                  <th className="border p-2">Quantity</th>
                  <th className="border p-2">Unit</th>
                  <th className="border p-2">Rate</th>
                  <th className="border p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border p-2 text-center">{index + 1}</td>

                    {/* Yarn Name */}
                    <td className="border p-1">
                      <select
                        value={row.yarnName}
                        onChange={(e) =>
                          handleChange(row.id, "yarnName", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      >
                        <option value="">Select Yarn</option>
                        {yarns.map((y: any) => (
                          <option key={y.serialNo} value={y.yarnName}>
                            {y.yarnName}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Material Group */}
                    <td className="border p-1">
                      <select
                        value={row.materialGroupId}
                        onChange={(e) =>
                          handleChange(row.id, "materialGroupId", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      >
                        <option value="">Select Group</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.materialGroup}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Material(Item) */}
                    <td className="border p-1">
                      <select
                        value={row.materialId}
                        onChange={(e) =>
                          handleChange(row.id, "materialId", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      >
                        <option value="">Select Item</option>
                        {materials
                          .filter(
                            (m: any) =>
                              row.materialGroupId &&
                              m.materialGroupId?.toString() === row.materialGroupId
                          )
                          .map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.materialName}
                            </option>
                          ))}
                      </select>
                    </td>

                    {/* Shade */}
                    <td className="border p-1">
                      <select
                        value={row.shadeCode}
                        onChange={(e) =>
                          handleChange(row.id, "shadeCode", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      >
                        <option value="">Select Shade</option>
                        {shades.map((s) => (
                          <option key={s.shadeCode} value={s.shadeCode}>
                            {s.shadeName}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Roll */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.roll}
                        onChange={(e) =>
                          handleChange(row.id, "roll", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.quantity}
                        onChange={(e) =>
                          handleChange(row.id, "quantity", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>

                    {/* Unit */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.unit}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-100"
                      />
                    </td>

                    {/* Rate */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.rate}
                        onChange={(e) =>
                          handleChange(row.id, "rate", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>

                    {/* Amount */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.amount}
                        onChange={(e) =>
                          handleChange(row.id, "amount", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Buttons / Totals */}
          <div className="flex justify-between mt-4">
            <div>
              <button
                onClick={addRow}
                className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
              >
                Add
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded mr-2"
              >
                Save
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-600 text-white rounded mr-2"
              >
                Print
              </button>
              <button
                onClick={handleIssue}
                className="px-4 py-2 bg-violet-400 text-white rounded mr-2"
              >
                Issued To
              </button>
              <button
                onClick={fetchOrders}
                className="px-4 py-2 bg-indigo-500 text-white rounded mr-2"
              >
                Order List
              </button>
            </div>
            <div className="text-right">
              <p>Total Unit: {totalUnit}</p>
              <p>Total Amount: ₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Order List Modal */}
          {showOrderList && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">
                  Purchase Order List
                </h2>

                <div className="flex justify-center mb-4">
                  <input
                    type="text"
                    placeholder="Search by Order No, Party, or Date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border p-2 rounded w-full mb-4"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="border p-2 text-center">#</th>
                        <th className="border p-2 text-center">Order No</th>
                        <th className="border p-2 text-center">Party Name</th>
                        <th className="border p-2 text-center">Date</th>
                        <th className="border p-2 text-center">Yarn Name</th>
                        <th className="border p-2 text-center">Material Name</th>
                        <th className="border p-2 text-center">Total Qty</th>
                        <th className="border p-2 text-center">Total Amount</th>
                        <th className="border p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="text-center py-3 text-gray-500"
                          >
                            No Orders Found
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order, index) => {
                          const totalQty = order.items?.reduce(
                            (sum: number, item: any) =>
                              sum + (item.quantity || 0),
                            0
                          );
                          const totalAmt = order.items?.reduce(
                            (sum: number, item: any) =>
                              sum + (item.amount || 0),
                            0
                          );
                          return (
                            <tr key={order.id}>
                              <td className="border p-2 text-center">
                                {index + 1}
                              </td>
                              <td className="border p-2 text-center">
                                {order.orderNo}
                              </td>
                              <td className="border p-2 text-center">
                                {order.partyName}
                              </td>
                              <td className="border p-2 text-center">
                                {order.date}
                              </td>
                              <td className="border p-2 text-center">
                                {(order.items || [])
                                  .map((i: any) => i.yarnName || "-")
                                  .join(", ")}
                              </td>
                              <td className="border p-2 text-center">
                                {(order.items || [])
                                  .map((i: any) => i.materialName || "-")
                                  .join(", ")}
                              </td>
                              <td className="border p-2 text-center">
                                {totalQty}
                              </td>
                              <td className="border p-2 text-center">
                                ₹{totalAmt?.toFixed(2)}
                              </td>
                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => handleEditOrder(order)}
                                  className="px-3 py-1 bg-green-500 text-white rounded mr-2"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="px-3 py-1 bg-red-500 text-white rounded mr-2"
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
                    onClick={() => setShowOrderList(false)}
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

export default PurchaseOrder;