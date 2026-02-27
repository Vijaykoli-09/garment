import React, { useState, useEffect, useMemo } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";


interface OrderItem {
  srNo: string;
  artNo: string;
  shade: string;
  description: string;
  sizes: string[]; // dynamic sizes per row
}

interface OrderRegisterForm {
  serialNo: string;
  date: string;
  deliveryDate?: string;
  partyName: string;
  remarks?: string;
  artGroup: string;
  agent: { serialNo: string };
  transport: { serialNumber: string };
  items: OrderItem[];
}

const OrderRegister: React.FC = () => {
  const [formData, setFormData] = useState<OrderRegisterForm>({
    serialNo: "",
    date: "",
    deliveryDate: "",
    partyName: "",
    remarks: "",
    artGroup: "",
    agent: { serialNo: "" },
    transport: { serialNumber: "" },
    items: [],
  });

  const [parties, setParties] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [, setOrderRegister] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [artGroups, setArtGroups] = useState<string[]>([]);
  const [sizesByArtGroup, setSizesByArtGroup] = useState<{ [key: string]: string[] }>({});

  // Load all orders
  const loadAllOrder = async () => {
    try {
      const response = await api.get("/order-register/all");
      setOrderRegister(response.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load order", "error");
    }
  };

  useEffect(() => {
    loadAllOrder();
  }, []);

  // Mock data
  useEffect(() => {
    setParties([
      { serialNo: "P1", partyName: "ABC Garments" },
      { serialNo: "P2", partyName: "XYZ Textiles" },
    ]);
    setAgents([
      { serialNo: "A1", agentName: "John Doe" },
      { serialNo: "A2", agentName: "Jane Smith" },
    ]);
    setTransports([
      { serialNumber: "T1", transportName: "DHL" },
      { serialNumber: "T2", transportName: "FedEx" },
    ]);
    setArtGroups(["S", "M", "L", "XL", "XXL", "XXXL"]);

    // Mock sizes per art group (usually from backend)
    setSizesByArtGroup({
      S: ["S"],
      M: ["S", "M"],
      L: ["S", "M", "L"],
      XL: ["S", "M", "L", "XL"],
      XXL: ["S", "M", "L", "XL", "XXL"],
      XXXL: ["S", "M", "L", "XL", "XXL", "XXXL"],
    });
  }, []);

  // Handle form field change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "agent") {
      setFormData({ ...formData, agent: { serialNo: value } });
    } else if (name === "transport") {
      setFormData({ ...formData, transport: { serialNumber: value } });
    } else if (name === "artGroup") {
      setFormData({
        ...formData,
        artGroup: value,
        items: formData.items.map((item) => ({
          ...item,
          sizes: sizesByArtGroup[value] || [],
        })),
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle item field changes (artNo, shade, description)
  const handleItemChange = (
  index: number,
  field: "artNo" | "shade" | "description",
  value: string
) => {
  const newItems = [...formData.items];
  newItems[index][field] = value;
  setFormData({ ...formData, items: newItems });
};


  // Handle size input change
  const handleSizeChange = (itemIndex: number, sizeIndex: number, value: string) => {
    const newItems = [...formData.items];
    newItems[itemIndex].sizes[sizeIndex] = value;
    setFormData({ ...formData, items: newItems });
  };

  // Add new item row
  const addItemRow = () => {
    const newSizes = sizesByArtGroup[formData.artGroup] || [];
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          srNo: (formData.items.length + 1).toString(),
          artNo: "",
          shade: "",
          description: "",
          sizes: newSizes,
        },
      ],
    });
  };

  // Remove item row
  const removeItemRow = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const isEditMode = useMemo(
    () => formData.serialNo && parties.some((t) => t.serialNo === formData.serialNo),
    [formData.serialNo, parties]
  );

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.serialNo) {
        await api.put(`/order-register/update/${formData.serialNo}`, formData);
        Swal.fire("Updated!", "Order-Register successfully", "success");
      } else {
        await api.post("/order-register/save", formData);
        Swal.fire("Added!", "Order Register saved successfully", "success");
      }
      loadAllOrder();
      setFormData({
        serialNo: "",
        date: "",
        deliveryDate: "",
        partyName: "",
        remarks: "",
        artGroup: "",
        agent: { serialNo: "" },
        transport: { serialNumber: "" },
        items: [],
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save the Order Register", "error");
    }
  };

  const goToOrderList = () => {
    console.log("Navigating to Order List...");
  };

  // ---------- Styles ----------
  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "10px auto",
    padding: 20,
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };
  const titleStyle: React.CSSProperties = { textAlign: "center", marginBottom: 20 };
  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 15,
    alignItems: "center",
    marginBottom: 10,
  };
  const labelStyle: React.CSSProperties = { width: "100px", fontWeight: "bold" };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    border: "1px solid #ccc",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    fontWeight: "bold",
  };
  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
  };
  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  };
  const thTdStyle: React.CSSProperties = {
    border: "1px solid #ccc",
    padding: 5,
    textAlign: "center",
  };

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Order Register {isEditMode && "(Edit Mode)"}</h2>

        <form onSubmit={handleSubmit}>
          {/* Serial No + Date */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial No </label>
            <input
              type="text"
              name="serialNo"
              value={formData.serialNo}
              onChange={handleChange}
              style={inputStyle}
              required
            />

            <label style={labelStyle}>Date </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          {/* Delivery Date */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Delivery Date</label>
            <input
              type="date"
              name="deliveryDate"
              value={formData.deliveryDate || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Party Name + Agent */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Party Name </label>
            <input
              type="text"
              name="partyName"
              list="partyList"
              value={formData.partyName}
              onChange={handleChange}
              style={inputStyle}
              required
            />
            <datalist id="partyList">
              {parties.map((p) => (
                <option key={p.serialNo} value={p.partyName} />
              ))}
            </datalist>

            <label style={labelStyle}>Agent </label>
            <input
              type="text"
              name="agent"
              list="agentList"
              value={formData.agent?.serialNo || ""}
              onChange={handleChange}
              style={inputStyle}
              required
            />
            <datalist id="agentList">
              {agents.map((a) => (
                <option key={a.serialNo} value={a.serialNo}>
                  {a.agentName}
                </option>
              ))}
            </datalist>
          </div>

          {/* Transport */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Transport </label>
            <input
              type="text"
              name="transport"
              list="transportList"
              value={formData.transport?.serialNumber || ""}
              onChange={handleChange}
              style={inputStyle}
              required
            />
            <datalist id="transportList">
              {transports.map((t) => (
                <option key={t.serialNumber} value={t.serialNumber}>
                  {t.transportName}
                </option>
              ))}
            </datalist>
          </div>

          {/* Art Group */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Art Group </label>
            <input
              type="text"
              name="artGroup"
              list="artGroupList"
              value={formData.artGroup}
              onChange={handleChange}
              style={inputStyle}
              required
            />
            <datalist id="artGroupList">
              {artGroups.map((g, i) => (
                <option key={i} value={g} />
              ))}
            </datalist>
          </div>

          {/* Remarks */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Table */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Sr.no</th>
                <th style={thTdStyle}>Art no</th>
                <th style={thTdStyle}>Shade</th>
                <th style={thTdStyle}>Work On Art</th>
                {formData.artGroup &&
                  (sizesByArtGroup[formData.artGroup] || []).map((size) => (
                    <th key={size} style={thTdStyle}>{size}</th>
                  ))}
                <th style={thTdStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td style={thTdStyle}>{item.srNo}</td>
                  <td style={thTdStyle}>
                    <input
                      type="text"
                      value={item.artNo}
                      onChange={(e) => handleItemChange(index, "artNo", e.target.value)}
                    />
                  </td>
                  <td style={thTdStyle}>
                    <input
                      type="text"
                      value={item.shade}
                      onChange={(e) => handleItemChange(index, "shade", e.target.value)}
                    />
                  </td>
                  <td style={thTdStyle}>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    />
                  </td>
                  {item.sizes.map((sizeVal, sizeIdx) => (
                    <td key={sizeIdx} style={thTdStyle}>
                      <input
                        type="text"
                        value={sizeVal}
                        onChange={(e) => handleSizeChange(index, sizeIdx, e.target.value)}
                        style={{ width: "50px" }}
                      />
                    </td>
                  ))}
                  <td style={thTdStyle}>
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      style={{ ...buttonStyle, background: "red", color: "white" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            onClick={addItemRow}
            style={{ ...buttonStyle, background: "green", color: "white", marginTop: 10 }}
          >
            + Add Item
          </button>

          <div style={buttonGroupStyle}>
            <button
              type="submit"
              style={{ ...buttonStyle, background: "#007bff", color: "white" }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={goToOrderList}
              style={{ ...buttonStyle, background: "#007bff", color: "white" }}
            >
              Order List
            </button>
          </div>
        </form>
      </div>
    </Dashboard>
  );
};

export default OrderRegister;


