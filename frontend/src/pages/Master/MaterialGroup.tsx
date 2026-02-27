import React, { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

const MaterialGroup: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<any>({
    id: null,
    materialGroup: "",
    materialType: "",
    unitOfMeasure: "",
    costOfMaterial: "",
    //dateOfPurchased: "",
    supplierName: "",
  });

  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);

  // Load all materials
  const loadAllMaterials = async () => {
    try {
      const response = await api.get("/material-groups");
      setAllMaterials(response.data);
      setFilteredMaterials(response.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load material groups", "error");
    }
  };

  useEffect(() => {
    loadAllMaterials();
  }, []);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Save or update
  const handleSave = async () => {
    // const requiredFields = [
    //   "materialGroup",
    //   "materialType",
    //   "unitOfMeasure",
    //   "costOfMaterial",
    //   //"dateOfPurchased",
    //   "supplierName",
    // ];

    // for (const field of requiredFields) {
    //   if (!formData[field] || formData[field].toString().trim() === "") {
    //     return Swal.fire("Validation Error", `Please fill the ${field}`, "warning");
    //   }
    // }

    try {
      if (formData.id) {
        await api.put(`/material-groups/${formData.id}`, formData);
        Swal.fire("Updated!", "Material Group updated successfully", "success");
      } else {
        await api.post("/material-groups", formData);
        Swal.fire("Added!", "Material Group saved successfully", "success");
      }
      loadAllMaterials();
      handleAddNew();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save material group", "error");
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/material-groups/${id}`);
      Swal.fire("Deleted!", "Material Group deleted successfully", "success");
      loadAllMaterials();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete material group", "error");
    }
  };



  const handleAddNew = () => {
    setFormData({
      id: null,
      materialGroup: "",
      materialType: "",
      unitOfMeasure: "",
      costOfMaterial: "",
      //dateOfPurchased: "",
      supplierName: "",
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    const filtered = allMaterials.filter(
      (m) =>
        m.materialGroup.toLowerCase().includes(term) ||
        m.id.toString().includes(term) ||
        m.supplierName.toLowerCase().includes(term)
    );
    setFilteredMaterials(filtered);
  };

  // Inline styles
  const containerStyle: React.CSSProperties = {
    maxWidth: "900px",
    margin: "30px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };
  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "15px",
    alignItems: "center",
    marginBottom: "10px",
  };
  const labelStyle: React.CSSProperties = { width: "150px", fontWeight: "bold" };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
  };

  return (
  <Dashboard>
    <div style={containerStyle}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Material(Item) Group</h2>

      {/* Form */}
      <form>
        <div style={formRowStyle}>
          <label style={labelStyle}>Material Group</label>
          <input type="text" name="materialGroup" value={formData.materialGroup} onChange={handleChange} style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Material Type</label>
          <input type="text" name="materialType" value={formData.materialType} onChange={handleChange}style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Unit of Measure</label>
          <input type="text" name="unitOfMeasure" value={formData.unitOfMeasure} onChange={handleChange}style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Cost of Material</label>
          <input type="number" name="costOfMaterial" value={formData.costOfMaterial} onChange={handleChange} style={inputStyle}/>
        </div>

        {/* <div style={formRowStyle}>
          <label style={labelStyle}>Date of Purchased</label>
          <input type="date" name="dateOfPurchased" value={formData.dateOfPurchased} onChange={handleChange} style={inputStyle}/>
        </div> */}

        <div style={formRowStyle}>
          <label style={labelStyle}>Supplier Name</label>
          <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange}style={inputStyle}/>
        </div>

        {/* Buttons */}
        <div
          style={{display: "flex",justifyContent: "center",gap: "10px",marginTop: "30px",flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={handleSave} style={buttonStyle}>
            {formData.id ? "Update" : "Save"}
          </button>
          {/* <button type="button" onClick={handleAddNew} style={buttonStyle}>
            Clear
          </button>
         */}
          <button type="button" onClick={() => setShowList(!showList)} style={buttonStyle}>
            {showList ? "Hide List" : "View List"}
          </button>
          {/* <button type="button" onClick={handleExit} style={buttonStyle}>
            Exit
          </button> */}
        </div>
      </form>

       {/* Material Group List Modal */}
{showList && (
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
        width: "90%",
        maxHeight: "80%",
        overflowY: "auto",
      }}
    >
      <h3>All Material Groups</h3>

      {/* 🔍 Search bar */}
      <input
        type="text"
        placeholder="Search by Name, ID, or Supplier..."
        onChange={handleSearchChange}
        style={{ width: "100%", padding: 8, marginBottom: 12, border: "1px solid #ccc", borderRadius: 4 }}
      />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>ID</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Material Group</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Type</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Unit</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Cost</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Supplier</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredMaterials.map((m) => (
            <tr key={m.id}>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.id}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.materialGroup}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.materialType}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.unitOfMeasure}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.costOfMaterial}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.supplierName}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <button
                  style={{ ...buttonStyle, backgroundColor: "green", marginRight: "5px" }}
                  onClick={() => setFormData(m)}
                >
                  Edit
                </button>
                <button
                  style={{ ...buttonStyle, backgroundColor: "red" }}
                  onClick={() => handleDelete(m.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => setShowList(false)} style={{ marginTop: 10, padding: 6 }}>
        Close
      </button>
    </div>
  </div>
)}

      </div>
    </Dashboard>
  );
};

export default MaterialGroup;
