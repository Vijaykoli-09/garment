import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";

type BalanceType = "CR" | "DR";

interface AgentFormData {
  serialNo: string;
  agentName: string;
  contactNo: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;

  openingBalance: number;
  openingBalanceType: BalanceType;
}

const AgentCreation = () => {
  const [formData, setFormData] = useState<AgentFormData>({
    serialNo: "",
    agentName: "",
    contactNo: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    openingBalance: 0,
    openingBalanceType: "DR",
  });

  const [agents, setAgents] = useState<AgentFormData[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // NEW: search
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all agents
  const loadAllAgents = async () => {
    try {
      const res = await api.get("/agent/list");
      setAgents(res.data || []);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to fetch agents", "error");
    }
  };

  useEffect(() => {
    if (showListModal) loadAllAgents();
    if (!showListModal) setSearchTerm(""); // reset search when modal closed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showListModal]);

  // Auto Generate serialNo (only when creating new)
  useEffect(() => {
    if (!isEditMode && formData.serialNo === "") {
      const prefix = "AG";
      const year = new Date().getFullYear();
      const unique = Date.now().toString().slice(-4);
      const serial = `${prefix}${year}${unique}`;
      setFormData((prev) => ({ ...prev, serialNo: serial }));
    }
  }, [formData.serialNo, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "openingBalance") {
      setFormData((prev) => ({ ...prev, openingBalance: value === "" ? 0 : Number(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      serialNo: "",
      agentName: "",
      contactNo: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      openingBalance: 0,
      openingBalanceType: "DR",
    });
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!formData.serialNo?.trim()) {
      return Swal.fire("Validation Error", "Serial No is missing", "warning");
    }
    if (!formData.agentName?.trim()) {
      return Swal.fire("Validation Error", "Please fill the agentName field", "warning");
    }
    if (Number.isNaN(formData.openingBalance) || formData.openingBalance < 0) {
      return Swal.fire("Validation Error", "Opening Balance must be 0 or greater", "warning");
    }
    if (formData.openingBalanceType !== "CR" && formData.openingBalanceType !== "DR") {
      return Swal.fire("Validation Error", "Please select CR or DR", "warning");
    }

    try {
      if (isEditMode) {
        await api.put(`/agent/update/${formData.serialNo}`, formData);
        Swal.fire("Updated!", "Agent updated successfully", "success");
      } else {
        await api.post("/agent/save", formData);
        Swal.fire("Added!", "Agent saved successfully", "success");
      }
      resetForm();
      loadAllAgents();
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err.response?.data?.message || "Failed to save agent", "error");
    }
  };

  const handleEdit = (agent: AgentFormData) => {
    setFormData({
      ...agent,
      openingBalance: agent.openingBalance ?? 0,
      openingBalanceType: (agent.openingBalanceType as BalanceType) ?? "DR",
    });
    setIsEditMode(true);
    setShowListModal(false);
  };

  const handleDelete = async (serialNo: string) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "You want to delete this agent?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      try {
        await api.delete(`/agent/delete/${serialNo}`);
        Swal.fire("Deleted!", "Agent deleted successfully", "success");
        loadAllAgents();
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.message || "Failed to delete agent", "error");
      }
    }
  };

  // NEW: filtered agents for search
  const filteredAgents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return agents;

    return agents.filter((a) => {
      const haystack = [
        a.serialNo,
        a.agentName,
        a.contactNo,
        a.email,
        a.address,
        a.city,
        a.state,
        a.zipCode,
        String(a.openingBalance ?? ""),
        a.openingBalanceType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [agents, searchTerm]);

  // ---- Styles ----
  const containerStyle: React.CSSProperties = {
    maxWidth: "700px",
    margin: "20px auto",
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
  const labelStyle: React.CSSProperties = { width: "160px", fontWeight: "bold" };
  const inputStyle: React.CSSProperties = { flex: 1, padding: 6, borderRadius: 4, border: "1px solid #ccc" };
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

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Agent Creation</h2>

        {/* ---- FORM ---- */}
        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial No</label>
            <input
              name="serialNo"
              value={formData.serialNo || ""}
              onChange={handleChange}
              style={{
                ...inputStyle,
                backgroundColor: isEditMode ? "#f8f9fa" : "#e9ecef",
              }}
              disabled
              title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Agent Name</label>
            <input style={inputStyle} name="agentName" value={formData.agentName} onChange={handleChange} />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Contact No</label>
            <input style={inputStyle} name="contactNo" value={formData.contactNo} onChange={handleChange} />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} name="email" value={formData.email} onChange={handleChange} />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} name="address" value={formData.address} onChange={handleChange} />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} name="city" value={formData.city} onChange={handleChange} />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} name="state" value={formData.state} onChange={handleChange} />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Zip Code</label>
            <input style={inputStyle} name="zipCode" value={formData.zipCode} onChange={handleChange} />
          </div>

          {/* Opening Balance + CR/DR */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Opening Balance</label>
            <input
              style={inputStyle}
              type="number"
              name="openingBalance"
              value={formData.openingBalance}
              onChange={handleChange}
              min={0}
              step="0.01"
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Balance Type</label>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flex: 1 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="openingBalanceType"
                  value="DR"
                  checked={formData.openingBalanceType === "DR"}
                  onChange={handleChange}
                />
                DR
              </label>

              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="openingBalanceType"
                  value="CR"
                  checked={formData.openingBalanceType === "CR"}
                  onChange={handleChange}
                />
                CR
              </label>
            </div>
          </div>
        </form>

        {/* Buttons */}
        <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
          <button
            type="button"
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }}
            onClick={handleSave}
          >
            {isEditMode ? "Update" : "Save"}
          </button>

          <button
            type="button"
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }}
            onClick={() => setShowListModal(true)}
          >
            Agent List
          </button>

          {isEditMode && (
            <button
              type="button"
              style={{ ...buttonStyle, backgroundColor: "#6c757d", color: "white" }}
              onClick={resetForm}
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* List Modal */}
        {showListModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 8,
                width: "95%",
                maxHeight: "80%",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h3 style={{ margin: 0 }}>Agent List</h3>

                {/* NEW: Search Bar */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Search (name, serial, city, contact...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      width: 320,
                      maxWidth: "60vw",
                    }}
                  />
                  <button
                    type="button"
                    style={{ ...buttonStyle, backgroundColor: "#6c757d", color: "white" }}
                    onClick={() => setSearchTerm("")}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8, marginBottom: 10, color: "#555", fontSize: 13 }}>
                Showing <b>{filteredAgents.length}</b> of <b>{agents.length}</b>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Serial No</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Agent Name</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Contact</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Email</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>City</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>State</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Zip</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Opening Bal</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>CR/DR</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => (
                    <tr key={agent.serialNo}>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.serialNo}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.agentName}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.contactNo}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.email}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.city}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.state}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.zipCode}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                        {Number(agent.openingBalance ?? 0).toFixed(2)}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.openingBalanceType}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                        <button
                          type="button"
                          style={{ ...buttonStyle, backgroundColor: "orange", color: "white", marginRight: 5 }}
                          onClick={() => handleEdit(agent)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          style={{ ...buttonStyle, backgroundColor: "red", color: "white" }}
                          onClick={() => handleDelete(agent.serialNo)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredAgents.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ border: "1px solid #ccc", padding: "12px", textAlign: "center" }}>
                        No matching agents found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ textAlign: "right", marginTop: 15 }}>
                <button
                  type="button"
                  style={{ ...buttonStyle, backgroundColor: "red", color: "white" }}
                  onClick={() => setShowListModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default AgentCreation;