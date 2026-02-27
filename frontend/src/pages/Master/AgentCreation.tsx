import React, { useState, useEffect } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";

interface AgentFormData {
  serialNo: string;
  agentName: string;
  contactNo: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
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
  });

  const [agents, setAgents] = useState<AgentFormData[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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
  }, [showListModal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    });
    setIsEditMode(false);
  };

  const handleSave = async () => {
    const requiredFields: (keyof AgentFormData)[] = ["serialNo", "agentName"];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") {
        return Swal.fire("Validation Error", `Please fill the ${field} field`, "warning");
      }
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
    setFormData(agent);
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

   // Auto Generate serialNo
      useEffect(() => {
          // Only generate a new serial number if it's a new record and serialNo is empty
          if (formData.serialNo === "") { 
              const prefix = "AG";
              const year = new Date().getFullYear();
              const unique = Date.now().toString().slice(-4); 
              const serial = `${prefix}${year}${unique}`;
              setFormData((prev) => ({ ...prev, serialNo: serial }));
          }
      }, [formData.serialNo]);
  
      // const isEditMode = useMemo(() => {
      //     return !!formData.serialNo; 
      // }, [formData.serialNo]);

  // ---- Styles ----
  const containerStyle: React.CSSProperties = {
    maxWidth: "600px",
    margin: "20px auto",
    padding: 20,
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };
  const titleStyle: React.CSSProperties = { textAlign: "center", marginBottom: 20 };
  const formRowStyle: React.CSSProperties = { display: "flex", gap: 15, alignItems: "center", marginBottom: 10 };
  const labelStyle: React.CSSProperties = { width: "120px", fontWeight: "bold" };
  const inputStyle: React.CSSProperties = { flex: 1, padding: 6, borderRadius: 4, border: "1px solid #ccc" };
  const buttonStyle: React.CSSProperties = { padding: "6px 12px", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" };
  const buttonGroupStyle: React.CSSProperties = { display: "flex", justifyContent: "center", gap: 10, marginTop: 20, flexWrap: "wrap" };

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
              style={{ ...inputStyle, maxWidth: "800px", backgroundColor: isEditMode ? "#f8f9fa" : "#e9ecef" }}
              disabled
              title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
  />
</div>
          {Object.keys(formData)
  .filter((key) => key !== "serialNo")
  .map((key) => (
    <div style={formRowStyle} key={key}>
      <label style={labelStyle}>
        {key.charAt(0).toUpperCase() + key.slice(1)}
      </label>
      <input
        style={inputStyle}
        name={key}
        value={(formData as any)[key]}
        onChange={handleChange}
      />
            </div>
          ))}
        </form>

        {/* Buttons */}
        <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
          <button type="button" style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={handleSave}>
            {isEditMode ? "Update" : "Save"} 
          </button>
          <button type="button" style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={() => setShowListModal(true)}>
            Agent List
          </button>
          {isEditMode && (
            <button type="button" style={{ ...buttonStyle, backgroundColor: "#6c757d", color: "white" }} onClick={resetForm}>
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
              <h3>Agent List</h3>
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
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.serialNo}>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.serialNo}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.agentName}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.contactNo}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.email}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.city}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.state}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{agent.zipCode}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                        <button
                          style={{ ...buttonStyle, backgroundColor: "orange", color: "white", marginRight: 5 }}
                          onClick={() => handleEdit(agent)}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...buttonStyle, backgroundColor: "red", color: "white" }}
                          onClick={() => handleDelete(agent.serialNo)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
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
