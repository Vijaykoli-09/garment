import React, { useCallback, useEffect, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

interface RowData {
  id: number;
  yarnName: string;          // store simple yarn name string
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
  const [yarns, setYarns] = useState<any[]>([]);       // yarn list

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  // const [, setLoading] = useState(false);
  const [showOrderList, setShowOrderList] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔹 Generate Order No with auto-reset each year
  const generateOrderNo = useCallback(() => {
    const currentYear = new Date().getFullYear().toString();
    const storedYear = localStorage.getItem("lastPurchaseOrderYear");
    let serial = 1001;
    if (storedYear === currentYear) {
      const lastSerial = parseInt(
        localStorage.getItem("lastPurchaseOrderSerial") || "1000"
      );
      serial = lastSerial + 1;
    }
    localStorage.setItem("lastPurchaseOrderSerial", serial.toString());
    localStorage.setItem("lastPurchaseOrderYear", currentYear);
    return `${currentYear}/${serial}`;
  }, []);

  // 🔹 Auto-generate Order No on first load
  useEffect(() => {
    const savedOrderNo = localStorage.getItem("currentOrderNo");
    if (savedOrderNo) {
      setOrderNo(savedOrderNo);
    } else {
      const newOrderNo = generateOrderNo();
      setOrderNo(newOrderNo);
      localStorage.setItem("currentOrderNo", newOrderNo);
    }
  }, [generateOrderNo]);

  // 🔹 Add blank row
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

  // 🔹 Fetch parties, materials, shades, groups, yarns
  useEffect(() => {
    const fetchMeta = async () => {
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
    };
    fetchMeta();
  }, []);

  // 🔹 Handle input change with auto amount calc
  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === id) {
          const updated: RowData = { ...r, [field]: value } as RowData;

          if (field === "materialGroupId") {
            // Clear material if group changed
            updated.materialId = "";
            // Auto unit reset
            updated.unit = "";
          }

          // Handle when material selected
          if (field === "materialId") {
            const selectedMaterial = materials.find(
              (m: any) => m.id.toString() === value
            );
            updated.unit = selectedMaterial?.materialUnit || "";
          }

          // ✅ Auto-calc amount if quantity or rate changes
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

  // 🔹 Build payload for save/update
  const buildPayload = () => ({
    orderNo,
    date,
    partyId: partyId ? parseInt(partyId) : null,
    items: rows
      // ✅ allow either Yarn OR Material (plus quantity & rate)
      .filter(
        (r) =>
          (r.yarnName || r.materialId) &&
          r.quantity &&
          r.rate
      )
      .map((r) => ({
        yarnName: r.yarnName || null,
        materialGroupId: r.materialGroupId
          ? parseInt(r.materialGroupId)
          : null,
        materialId: r.materialId ? parseInt(r.materialId) : null,
        shadeCode: r.shadeCode,
        roll: parseFloat(r.roll) || 0,
        quantity: parseFloat(r.quantity) || 0,
        rate: parseFloat(r.rate) || 0,
        amount: parseFloat(r.amount) || 0,
        unit: r.unit,
      })),
  });

  // 🔹 Save
  const handleSave = async () => {
    const payload = buildPayload();
    // ✅ Client wants no frontend validation – just send to backend
    try {
      const res = await api.post("/purchase-orders", payload);
      Swal.fire({
        icon: "success",
        title: "Saved!",
        text: "Purchase Order saved successfully.",
        timer: 2000,
        showConfirmButton: false,
      });
      setSelectedOrderId(res.data.id);
    } catch (err: any) {
      console.error("Save error:", err.response?.data || err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err.response?.data?.message || "Failed to save purchase order.",
      });
    }
  };

  // 🔹 Fetch order list
  const fetchOrders = async () => {
    try {
      if (
        parties.length === 0 ||
        materials.length === 0 ||
        shades.length === 0
      ) {
        Swal.fire("Please wait", "Loading required data...", "info");
        return;
      }
      setShowOrderList(true);
      const res = await api.get("/purchase-orders");
      const data = res.data;
      const enriched = data.map((order: any) => ({
        ...order,
        partyName: order.partyName || "(Unknown Party)",
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
          const orderNo = o?.orderNo?.toLowerCase() || "";
          const date = o?.date?.toLowerCase() || "";
          const partyName =
            o?.party?.partyName?.toLowerCase() ||
            o?.partyName?.toLowerCase() ||
            "";
          return (
            orderNo.includes(term) ||
            partyName.includes(term) ||
            date.includes(term)
          );
        })
      );
    }
  }, [searchTerm, orders]);

  // ✅ Corrected Edit Order Handler
  const handleEditOrder = (order: any) => {
    setShowOrderList(false);
    setSelectedOrderId(order.id);
    setOrderNo(order.orderNo || "");
    setDate(order.date || "");

    // ✅ Find the matching party by name (since backend sends only partyName)
    const foundParty = parties.find(
      (p) => p.partyName === order.partyName
    );
    setPartyId(foundParty ? foundParty.id.toString() : "");

    // ✅ Map items according to backend DTO
    setRows(
      (order.items || []).map((i: any, idx: number) => ({
        id: idx + 1,
        yarnName: i.yarnName || "",
        materialGroupId: i.materialGroupId?.toString() || "",
        materialId: i.materialId?.toString() || "",
        materialName: i.materialName || "",
        shadeCode: i.shadeCode || "",
        roll: i.roll?.toString() || "",
        quantity: i.quantity?.toString() || "",
        unit: i.unit || "",
        rate: i.rate?.toString() || "",
        amount: i.amount?.toString() || "",
      }))
    );
  };

  // 🔹 Delete order
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
        setFilteredOrders((prev) =>
          prev.filter((o) => o.id !== id)
        );
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire("Error", "Failed to delete order", "error");
      }
    }
  };

  // 🔹 Issue To button
  const handleIssue = async () => {
    if (!selectedOrderId)
      return Swal.fire("No order selected to issue");
    try {
      await api.post(`/purchase-orders/${selectedOrderId}/issue`);
      Swal.fire({
        icon: "success",
        title: "Issued!",
        text: "Order issued to Purchase Entity.",
        timer: 2000,
        showConfirmButton: false,
      });
      const nextOrderNo = generateOrderNo();
      setOrderNo(nextOrderNo);
      localStorage.setItem("currentOrderNo", nextOrderNo);
    } catch (err) {
      console.error("Issue error:", err);
      Swal.fire("Error", "Failed to issue purchase order.", "error");
    }
  };

  const totalUnit = rows.reduce(
    (sum, r) => sum + (parseFloat(r.quantity) || 0),
    0
  );
  const totalAmount = rows.reduce(
    (sum, r) => sum + (parseFloat(r.amount) || 0),
    0
  );

  // ============================
  // PRINT FUNCTION (NEW)
  // ============================
  const handlePrint = () => {
    const w = window.open("", "_blank")!;
    const party = parties.find((p) => String(p.id) === String(partyId));
    const partyName = party ? party.partyName : "";

    const printableRows = rows.filter(
      (r) => r.yarnName || r.materialGroupId || r.materialId
    );

    const totalQty = printableRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
    const totalAmount = printableRows.reduce(
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
              <td>₹${totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <Dashboard>
      <div className="bg-gray-100 p-6 min-h-screen">
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-bold text-2xl text-center">
            Purchase Order
          </h2>

          {/* Header */}
          <div className="gap-4 grid grid-cols-3 mb-6">
            <div>
              <label className="block font-semibold">Order No.</label>
              <input
                type="text"
                value={orderNo}
                readOnly
                className="p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
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
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="p-2 border rounded w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="border w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border">S No</th>
                  <th className="p-2 border">Yarn Name</th>
                  <th className="p-2 border">Material Group</th>
                  <th className="p-2 border">Material(Item)</th>
                  <th className="p-2 border">Shade</th>
                  <th className="p-2 border">Roll</th>
                  <th className="p-2 border">Quantity</th>
                  <th className="p-2 border">Unit</th>
                  <th className="p-2 border">Rate</th>
                  <th className="p-2 border">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="p-2 border text-center">
                      {index + 1}
                    </td>

                    {/* Yarn Name column */}
                    <td className="p-1 border">
                      <select
                        value={row.yarnName}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "yarnName",
                            e.target.value
                          )
                        }
                        className="p-1 border rounded w-full"
                      >
                        <option value="">Select Yarn</option>
                        {yarns.map((y: any) => (
                          <option
                            key={y.serialNo}
                            value={y.yarnName}
                          >
                            {y.yarnName}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Material Group */}
                    <td className="p-1 border">
                      <select
                        value={row.materialGroupId}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "materialGroupId",
                            e.target.value
                          )
                        }
                        className="p-1 border rounded w-full"
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
                    <td className="p-1 border">
                      <select
                        value={row.materialId}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "materialId",
                            e.target.value
                          )
                        }
                        className="p-1 border rounded w-full"
                      >
                        <option value="">Select Item</option>
                        {materials
                          .filter(
                            (m: any) =>
                              row.materialGroupId &&
                              m.materialGroupId
                                ?.toString()
                                === row.materialGroupId
                          )
                          .map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.materialName}
                            </option>
                          ))}
                      </select>
                    </td>

                    {/* Shade */}
                    <td className="p-1 border">
                      <select
                        value={row.shadeCode}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "shadeCode",
                            e.target.value
                          )
                        }
                        className="p-1 border rounded w-full"
                      >
                        <option value="">Select Shade</option>
                        {shades.map((s) => (
                          <option
                            key={s.shadeCode}
                            value={s.shadeCode}
                          >
                            {s.shadeName}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Roll */}
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.roll}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "roll",
                            e.target.value
                          )
                        }
                        className="p-1 border rounded w-full"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.quantity}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "quantity",
                            e.target.value
                          )
                        }
                        className="p-1 border rounded w-full"
                      />
                    </td>

                    {/* Unit (readonly) */}
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.unit}
                        readOnly
                        className="bg-gray-100 p-1 border rounded w-full"
                      />
                    </td>

                    {/* Rate */}
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.rate}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "rate",
                            e.target.value
                          )
                        }
                        className="p-1 border rounded w-full"
                      />
                    </td>

                    {/* Amount */}
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.amount}
                        onChange={(e) =>
                          handleChange(
                            row.id,
                            "amount",
                            e.target.value
                          )
                        }
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
              <button
                onClick={addRow}
                className="bg-blue-500 mr-2 px-4 py-2 rounded text-white"
              >
                Add
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 mr-2 px-4 py-2 rounded text-white"
              >
                Save
              </button>
              {/* ⭐ NEW PRINT BUTTON */}
              <button
                onClick={handlePrint}
                className="bg-gray-600 mr-2 px-4 py-2 rounded text-white"
              >
                Print
              </button>
              <button
                onClick={handleIssue}
                className="bg-violet-400 mr-2 px-4 py-2 rounded text-white"
              >
                Issued To
              </button>
              <button
                onClick={() => fetchOrders()}
                className="bg-indigo-500 mr-2 px-4 py-2 rounded text-white"
              >
                Order List
              </button>
            </div>
            <div className="text-right">
              <p>Total Unit: {totalUnit}</p>
              <p>Total Amount: ₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* ✅ Order List Modal */}
          {showOrderList && (
            <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
              <div className="bg-white shadow-lg p-6 rounded-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 max-h-[90vh] overflow-y-auto">
                <h2 className="mb-4 font-semibold text-blue-600 text-2xl text-center">
                  Purchase Order List
                </h2>

                {/* Search Bar */}
                <div className="flex justify-center mb-4">
                  <input
                    type="text"
                    placeholder="Search by Challan No, Party, or Date"
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(e.target.value)
                    }
                    className="mb-4 p-2 border rounded w-full"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="border border-gray-300 min-w-full">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="p-2 border text-center">
                          #
                        </th>
                        <th className="p-2 border text-center">
                          Order No
                        </th>
                        <th className="p-2 border text-center">
                          Party Name
                        </th>
                        <th className="p-2 border text-center">
                          Date
                        </th>
                        <th className="p-2 border text-center">
                          Yarn Name
                        </th>
                        <th className="p-2 border text-center">
                          Material Name
                        </th>
                        <th className="p-2 border text-center">
                          Total Qty
                        </th>
                        <th className="p-2 border text-center">
                          Total Amount
                        </th>
                        <th className="p-2 border text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="py-3 text-gray-500 text-center"
                          >
                            No Orders Found
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(
                          (order, index) => {
                            const totalQty =
                              order.items?.reduce(
                                (
                                  sum: number,
                                  item: any
                                ) =>
                                  sum +
                                  (item.quantity ||
                                    0),
                                0
                              );
                            const totalAmount =
                              order.items?.reduce(
                                (
                                  sum: number,
                                  item: any
                                ) =>
                                  sum +
                                  (item.amount ||
                                    0),
                                0
                              );
                            return (
                              <tr key={order.id}>
                                <td className="p-2 border text-center">
                                  {index + 1}
                                </td>
                                <td className="p-2 border text-center">
                                  {order.orderNo}
                                </td>
                                <td className="p-2 border text-center">
                                  {order.partyName}
                                </td>
                                <td className="p-2 border text-center">
                                  {order.date}
                                </td>

                                {/* Yarn Name column in list */}
                                <td className="p-2 border text-center">
                                  {(order.items || [])
                                    .map(
                                      (i: any) =>
                                        i.yarnName ||
                                        "-"
                                    )
                                    .join(", ")}
                                </td>

                                <td className="p-2 border text-center">
                                  {(order.items || [])
                                    .map(
                                      (i: any) =>
                                        i.material
                                          ?.materialName ||
                                        i.materialName ||
                                        "-"
                                    )
                                    .join(", ")}
                                </td>
                                <td className="p-2 border text-center">
                                  {totalQty}
                                </td>
                                <td className="p-2 border text-center">
                                  ₹
                                  {totalAmount?.toFixed(
                                    2
                                  )}
                                </td>
                                <td className="p-2 border text-center">
                                  <button
                                    onClick={() =>
                                      handleEditOrder(
                                        order
                                      )
                                    }
                                    className="bg-green-500 mr-2 px-3 py-1 rounded text-white"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteOrder(
                                        order.id
                                      )
                                    }
                                    className="bg-red-500 mr-2 px-3 py-1 rounded text-white"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() =>
                      setShowOrderList(false)
                    }
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

export default PurchaseOrder;
