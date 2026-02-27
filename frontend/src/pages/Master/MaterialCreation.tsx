import React, { useState, useEffect, useMemo } from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

const MaterialCreation: React.FC = () => {
  // const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<any>({
  id: null,
  serialNumber: "",
  materialGroupId: "",   // id
  materialGroupName: "", // display name
  materialName: "",
  code: "",
  materialUnit: "",
  minimumStock: "",
  maximumStock: "",
  openingStock: "",
});


  const [materials, setMaterials] = useState<any[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);
  const [materialGroups, setMaterialGroups] = useState<any[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Load Material- Group 
  const loadMaterialGroups = async () => {
  try {
    const res = await api.get("/material-groups");
    setMaterialGroups(res.data);
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to load material groups", "error");
  }
};

useEffect(() => {
  loadMaterials();
  loadMaterialGroups();
}, []);


 // Load all materials
const loadMaterials = async () => {
  try {
    const response = await api.get(`/materials`);
    setMaterials(response.data);
    setFilteredMaterials(response.data);
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to load materials", "error");
  }
};

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Save or Update
  const handleSave = async () => {
  const requiredFields = [
    "serialNumber",
    "materialGroupId",
    "materialName",
    "code",
    "materialUnit",
    "minimumStock",
    "maximumStock",
    "openingStock",
  ];

  for (const field of requiredFields) {
    const value = (formData as any)[field];
    if (!value || value.toString().trim() === "") {
      return Swal.fire("Validation Error", `Please fill the ${String(field)}`, "warning");
    }
  }

  try {
    const payload = {
  serialNumber: formData.serialNumber,
  materialGroupId: Number(formData.materialGroupId),
  materialName: formData.materialName,
  code: formData.code,
  materialUnit: formData.materialUnit,
  minimumStock: Number(formData.minimumStock),
  maximumStock: Number(formData.maximumStock),
  openingStock: Number(formData.openingStock),
};







    if (formData.id) {
      await api.put(`/materials/${formData.id}`, payload); // ✅ Corrected
      Swal.fire("Updated!", "Material updated successfully", "success");
    } else {
      await api.post("/materials", payload); // ✅ Corrected
      Swal.fire("Added!", "Material saved successfully", "success");
    }

    loadMaterials();
    handleAddNew();
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to save material", "error");
  }
};

  // Delete
  const handleDelete = async (id: number) => {
  try {
    await api.delete(`/materials/${id}`); // ✅ Corrected
    Swal.fire("Deleted!", "Material deleted successfully", "success");
    loadMaterials();
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Failed to delete material", "error");
  }
};



  // Reset form
  const handleAddNew = () => {
  setFormData({
    id: null,
    serialNumber: "",
    materialGroupId: "",   // ✅ correct
    materialGroupName: "", // ✅ correct
    materialName: "",
    code: "",
    materialUnit: "",
    minimumStock: "",
    maximumStock: "",
    openingStock: "",
  });
};


  // Search filter
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const term = e.target.value.toLowerCase();

  const filtered = materials.filter((m) => {
    const id = m.id?.toString().toLowerCase() || "";
    const serial = m.serialNumber?.toLowerCase() || "";
    const group = m.materialGroupName?.toLowerCase() || "";
    const name = m.materialName?.toLowerCase() || "";
    const code = m.code?.toLowerCase() || "";

    return (
      id.includes(term) ||
      serial.includes(term) ||
      group.includes(term) ||
      name.includes(term) ||
      code.includes(term)
    );
  });

  setFilteredMaterials(filtered);
};

  // Auto Generate serialNo
    useEffect(() => {
    // Only generate a new serial number if it's a new record and serialNo is empty
    if (formData.serialNumber === "") { 
    const prefix = "MC";
    const year = new Date().getFullYear();
    const unique = Date.now().toString().slice(-4); 
    const serial = `${prefix}${year}${unique}`;
    setFormData((prev: any) => ({ ...prev, serialNumber: serial }));
    }
  }, [formData.serialNumber]);

  const isEditMode = useMemo(() => {
      return formData.serialNumber 
             && materials.some(t => t.serialNumber === formData.serialNumber);
    }, [formData.serialNumber, materials]);

  // // Exit
  // const handleExit = () => {
  //   navigate("/dashboard");
  // };

  // Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: "900px",
    margin: "30px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };
  const formRowStyle: React.CSSProperties = { display: "flex", gap: "15px", alignItems: "center", marginBottom: "10px" };
  const labelStyle: React.CSSProperties = { width: "150px", fontWeight: "bold" };
  const inputStyle: React.CSSProperties = { flex: 1, padding: "6px 10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" };
  const buttonStyle: React.CSSProperties = { padding: "8px 16px", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", backgroundColor: "#007bff", color: "white" };

  return (
  <Dashboard>
    <div style={containerStyle}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Material(Item) Creation</h2>

      {/* Form */}
      <form>
        <div style={formRowStyle}>
          <label style={labelStyle}>Serial Number</label>
            <input
               name="serialNumber"
              value={formData.serialNumber || ""}
               onChange={handleChange}
              // style={inputStyle}
              style={{ ...inputStyle, maxWidth: '800px', backgroundColor: "#e9ecef" }}
               disabled //Disable for new form
               title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
            />
        </div>

        <div style={formRowStyle}>
        <label style={labelStyle}>Material Group</label>
        <input type="text" name="materialGroupName" value={formData.materialGroupName} readOnly placeholder="Select Material Group" style={{ ...inputStyle, cursor: "pointer", background: "#f9f9f9" }} onClick={() => setShowGroupModal(true)}/>
        </div>


        <div style={formRowStyle}>
          <label style={labelStyle}>Material Name</label>
          <input type="text" name="materialName" value={formData.materialName} onChange={handleChange} style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Code</label>
          <input type="text" name="code" value={formData.code} onChange={handleChange} style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Material Unit</label>
          <input type="text" name="materialUnit" value={formData.materialUnit} onChange={handleChange} style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Minimum Stock</label>
          <input type="number" name="minimumStock" value={formData.minimumStock} onChange={handleChange} style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Maximum Stock</label>
          <input type="number" name="maximumStock" value={formData.maximumStock} onChange={handleChange} style={inputStyle}/>
        </div>

        <div style={formRowStyle}>
          <label style={labelStyle}>Opening Stock</label>
          <input type="number" name="openingStock" value={formData.openingStock} onChange={handleChange} style={inputStyle}/>
        </div>

        {/* Buttons */}
        <div
          style={{display: "flex", justifyContent: "center",gap: "10px",marginTop: "30px",flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={handleSave} style={buttonStyle}>
            {formData.id ? "Update" : "Save"}
          </button>
          {/* <button type="button" onClick={handleAddNew} style={buttonStyle}>
            Clear
          </button> */}
          {/* <button type="button" onClick={() => setShowModal(true)} style={buttonStyle}>
            Search
          </button> */}
          <button type="button" onClick={() => setShowList(!showList)} style={buttonStyle}>
            {showList ? "Hide List" : "View List"}
          </button>
        </div>
      </form>

        {/* Material Creation List Modal */}
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
      <h3>All Materials</h3>

      {/* 🔍 Search bar */}
      <input
        type="text"
        placeholder="Search by Serial, Name, Group, or Code..."
        onChange={handleSearchChange}
        style={{ width: "100%", padding: 8, marginBottom: 12, border: "1px solid #ccc", borderRadius: 4 }}
      />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Serial No</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Group</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Name</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Code</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Unit</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Min Stock</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Max Stock</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Opening Stock</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredMaterials.map((m) => (
            <tr key={m.id}>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.serialNumber}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.materialGroupName}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.materialName}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.code}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.materialUnit}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.minimumStock}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.maximumStock}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{m.openingStock}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
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

{/* Material Group Selection Modal */}
{showGroupModal && (
  <div
    style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.3)", display: "flex",
      justifyContent: "center", alignItems: "center"
    }}
  >
    <div style={{
      background: "#fff", padding: 20, borderRadius: 8,
      width: 300
    }}>
      <h3>Select Material Group</h3>
      
      <select
        style={{ width: "100%", padding: "6px", marginTop: 10 }}
        value={formData.materialGroupId || ""}
        onChange={(e) => {
          const selectedGroup = materialGroups.find(g => g.id === parseInt(e.target.value));
          setFormData({
            ...formData,
            materialGroupId: selectedGroup.id,
            materialGroupName: selectedGroup.materialGroup
          });
          setShowGroupModal(false);
        }}
      >
        <option value="">-- Select Group --</option>
        {materialGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.materialGroup}
          </option>
        ))}
      </select>

      <button onClick={() => setShowGroupModal(false)} style={{ marginTop: 10, padding: 6 }}>
        Close
      </button>
    </div>
  </div>
)}

      </div>
    </Dashboard>
  );
};

export default MaterialCreation;
