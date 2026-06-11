import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

type MaterialForm = {
  id: number | null;
  serialNumber: string;
  materialGroupId: number | "";// id
  materialGroupName: string;   // display name
  materialName: string;
  code: string;
  materialUnit: string;
  minimumStock: string | number;
  maximumStock: string | number;
  openingStock: string | number;
};

const MaterialCreation: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<MaterialForm>({
    id: null,
    serialNumber: "",
    materialGroupId: "",
    materialGroupName: "",
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

  // Load Material Groups
  const loadMaterialGroups = async () => {
    try {
      const res = await api.get("/material-groups");
      setMaterialGroups(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load material groups", "error");
    }
  };

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

  useEffect(() => {
    loadMaterials();
    loadMaterialGroups();
  }, []);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reset form (New)
  const handleAddNew = () => {
    setFormData({
      id: null,
      serialNumber: "",
      materialGroupId: "",
      materialGroupName: "",
      materialName: "",
      code: "",
      materialUnit: "",
      minimumStock: "",
      maximumStock: "",
      openingStock: "",
    });
  };

  // Save or Update
  const handleSave = async () => {
    // ✅ Minimum/Maximum/Opening validation removed (optional now)
    const requiredFields: (keyof MaterialForm)[] = [
      "serialNumber",
      "materialGroupId",
      "materialName",
      "code",
      "materialUnit",
    ];

    for (const field of requiredFields) {
      const value: any = formData[field];
      if (value === null || value === undefined || value.toString().trim() === "") {
        return Swal.fire("Validation Error", `Please fill the ${String(field)}`, "warning");
      }
    }

    try {
      // If empty -> save as 0 (so backend numeric fields won't fail)
      const min = formData.minimumStock === "" ? 0 : Number(formData.minimumStock);
      const max = formData.maximumStock === "" ? 0 : Number(formData.maximumStock);
      const opening = formData.openingStock === "" ? 0 : Number(formData.openingStock);

      const payload = {
        serialNumber: formData.serialNumber,
        materialGroupId: Number(formData.materialGroupId),
        materialName: formData.materialName,
        code: formData.code,
        materialUnit: formData.materialUnit,
        minimumStock: min,
        maximumStock: max,
        openingStock: opening,
      };

      if (formData.id) {
        await api.put(`/materials/${formData.id}`, payload);
        Swal.fire("Updated!", "Material updated successfully", "success"); // ✅ SMS
      } else {
        await api.post("/materials", payload);
        Swal.fire("Added!", "Material saved successfully", "success"); // ✅ SMS
      }

      await loadMaterials();
      handleAddNew();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save material", "error");
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      const res = await Swal.fire({
        title: "Are you sure?",
        text: "This material will be deleted.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete",
      });

      if (!res.isConfirmed) return;

      await api.delete(`/materials/${id}`);
      Swal.fire("Deleted!", "Material deleted successfully", "success"); // ✅ SMS
      await loadMaterials();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete material", "error");
    }
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
    if (formData.serialNumber === "") {
      const prefix = "MC";
      const year = new Date().getFullYear();
      const unique = Date.now().toString().slice(-4);
      const serial = `${prefix}${year}${unique}`;
      setFormData((prev) => ({ ...prev, serialNumber: serial }));
    }
  }, [formData.serialNumber]);

  const isEditMode = useMemo(() => {
    return (
      !!formData.serialNumber &&
      materials.some((t) => t.serialNumber === formData.serialNumber)
    );
  }, [formData.serialNumber, materials]);

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
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Material(Item) Creation
        </h2>

        {/* Form */}
        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial Number</label>
            <input
              name="serialNumber"
              value={formData.serialNumber || ""}
              onChange={handleChange}
              style={{ ...inputStyle, maxWidth: "800px", backgroundColor: "#e9ecef" }}
              disabled
              title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Material Group</label>
            <input
              type="text"
              name="materialGroupName"
              value={formData.materialGroupName}
              readOnly
              placeholder="Select Material Group"
              style={{ ...inputStyle, cursor: "pointer", background: "#f9f9f9" }}
              onClick={() => setShowGroupModal(true)}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Material Name</label>
            <input
              type="text"
              name="materialName"
              value={formData.materialName}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Material Unit</label>
            <input
              type="text"
              name="materialUnit"
              value={formData.materialUnit}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Minimum Stock</label>
            <input
              type="number"
              name="minimumStock"
              value={formData.minimumStock}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Maximum Stock</label>
            <input
              type="number"
              name="maximumStock"
              value={formData.maximumStock}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Opening Stock</label>
            <input
              type="number"
              name="openingStock"
              value={formData.openingStock}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginTop: "30px",
              flexWrap: "wrap",
            }}
          >
            {/* ✅ Back button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{ ...buttonStyle, backgroundColor: "#6c757d" }}
            >
              Back
            </button>

            {/* ✅ New button */}
            <button
              type="button"
              onClick={handleAddNew}
              style={{ ...buttonStyle, backgroundColor: "#17a2b8" }}
            >
              New
            </button>

            <button type="button" onClick={handleSave} style={buttonStyle}>
              {formData.id ? "Update" : "Save"}
            </button>

            <button
              type="button"
              onClick={() => setShowList(!showList)}
              style={{ ...buttonStyle, backgroundColor: "#343a40" }}
            >
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

              {/* Search bar */}
              <input
                type="text"
                placeholder="Search by Serial, Name, Group, or Code..."
                onChange={handleSearchChange}
                style={{
                  width: "100%",
                  padding: 8,
                  marginBottom: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                }}
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
                          onClick={() => {
                            // ✅ Edit -> auto close list
                            setFormData(m);
                            setShowList(false);
                          }}
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          style={{ ...buttonStyle, backgroundColor: "red" }}
                          onClick={() => handleDelete(m.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={() => setShowList(false)}
                style={{ marginTop: 10, padding: 6 }}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Material Group Selection Modal */}
        {showGroupModal && (
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
                width: 300,
              }}
            >
              <h3>Select Material Group</h3>

              <select
                style={{ width: "100%", padding: "6px", marginTop: 10 }}
                value={formData.materialGroupId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setFormData((prev) => ({
                      ...prev,
                      materialGroupId: "",
                      materialGroupName: "",
                    }));
                    return;
                  }

                  const selectedGroup = materialGroups.find(
                    (g) => g.id === parseInt(val, 10)
                  );

                  if (!selectedGroup) return;

                  setFormData((prev) => ({
                    ...prev,
                    materialGroupId: selectedGroup.id,
                    materialGroupName: selectedGroup.materialGroup,
                  }));
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

              <button
                onClick={() => setShowGroupModal(false)}
                style={{ marginTop: 10, padding: 6 }}
                type="button"
              >
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