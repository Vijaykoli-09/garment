import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";
import Dashboard from "../Dashboard";

const FabricationCreation: React.FC = () => {
  const [formData, setFormData] = useState<any>({
    id: null,
    serialNo: "",
    fabricName: "",
    yarns: [{ yarnSerialNo: "", percent: "" }],
  });

  const [fabrications, setFabrications] = useState<any[]>([]);
  const [filteredFabrications, setFilteredFabrications] = useState<any[]>([]);
  const [yarns, setYarns] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);

  // 🔹 Load Yarns for dropdown
  const loadYarns = async () => {
    try {
      const res = await api.get("/yarn/list");
      setYarns(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load yarn list", "error");
    }
  };

  // 🔹 Load Fabrications
  const loadFabrications = async () => {
    try {
      const res = await api.get("/fabrication");
      setFabrications(res.data);
      setFilteredFabrications(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load fabrications", "error");
    }
  };

  useEffect(() => {
    loadYarns();
    loadFabrications();
  }, []);

  // 🔹 Auto-generate Serial No.
  useEffect(() => {
    if (!formData.serialNo) {
      const prefix = "FAB";
      const year = new Date().getFullYear();
      const unique = Date.now().toString().slice(-5);
      const serial = `${prefix}-${year}${unique}`;
      setFormData((prev: any) => ({ ...prev, serialNo: serial }));
    }
  }, [formData.serialNo]);

  // 🔹 Input change handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleYarnChange = (index: number, field: string, value: string) => {
    const updatedYarns = [...formData.yarns];
    updatedYarns[index][field] = value;
    setFormData({ ...formData, yarns: updatedYarns });
  };

  // 🔹 Add/Remove yarn rows
  const addYarnRow = () => {
    setFormData({
      ...formData,
      yarns: [...formData.yarns, { yarnSerialNo: "", percent: "" }],
    });
  };

  const removeYarnRow = (index: number) => {
    const updated = formData.yarns.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, yarns: updated });
  };

  // 🔹 Save / Update Fabrication
  // ✅ Updated handleSave()
  const handleSave = async () => {
    if (!formData.fabricName) {
      return Swal.fire(
        "Validation Error",
        "Please enter Fabric Name",
        "warning"
      );
    }

    if (formData.yarns.some((y: any) => !y.yarnSerialNo || !y.percent)) {
      return Swal.fire(
        "Validation Error",
        "Please fill all Yarn fields",
        "warning"
      );
    }

    try {
      const payload = {
        serialNo: formData.serialNo,
        fabricName: formData.fabricName,
        yarns: formData.yarns.map((y: any) => ({
          yarnSerialNo: y.yarnSerialNo,
          percent: parseFloat(y.percent),
        })),
      };

      const exists = fabrications.some((f) => f.serialNo === formData.serialNo);

      if (exists) {
        await api.put(`/fabrication/${formData.serialNo}`, payload);
        Swal.fire("Updated!", "Fabrication updated successfully", "success");
      } else {
        await api.post("/fabrication", payload);
        Swal.fire("Added!", "Fabrication saved successfully", "success");
      }

      loadFabrications();
      handleAddNew();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save fabrication", "error");
    }
  };

  // 🔹 Delete Fabrication
  const handleDelete = async (serialNo: string) => {
    try {
      await api.delete(`/fabrication/${serialNo}`);
      Swal.fire("Deleted!", "Fabrication deleted successfully", "success");
      loadFabrications();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete fabrication", "error");
    }
  };

  // 🔹 Reset Form
  const handleAddNew = () => {
    const prefix = "FAB";
    const year = new Date().getFullYear();
    const unique = Date.now().toString().slice(-5);
    const serial = `${prefix}-${year}${unique}`;
    setFormData({
      id: null,
      serialNo: serial,
      fabricName: "",
      yarns: [{ yarnSerialNo: "", percent: "" }],
    });
  };

  // 🔹 Search Filter
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    const filtered = fabrications.filter((f) => {
      const serial = f.serialNo?.toLowerCase() || "";
      const fabric = f.fabricName?.toLowerCase() || "";
      return serial.includes(term) || fabric.includes(term);
    });
    setFilteredFabrications(filtered);
  };

  const isEditMode = useMemo(() => {
    return (
      formData.serialNo &&
      fabrications.some((t) => t.serialNo === formData.serialNo)
    );
  }, [formData.serialNo, fabrications]);

  // 🎨 Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
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
  const labelStyle: React.CSSProperties = {
    width: "150px",
    fontWeight: "bold",
  };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    fontWeight: "bold",
  };

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Fabrication Creation
        </h2>

        <form>
          {/* Serial No */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial No.</label>
            <input
              name="serialNo"
              value={formData.serialNo}
              disabled
              style={{ ...inputStyle, backgroundColor: "#e9ecef" }}
              title={
                isEditMode
                  ? "Serial Number cannot be changed during edit."
                  : undefined
              }
            />
          </div>

          {/* Fabric Name */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Fabric Name</label>
            <input
              name="fabricName"
              value={formData.fabricName}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Yarn Rows */}
          <div>
            <label style={{ fontWeight: "bold" }}>Yarn Details:</label>
            {formData.yarns.map((y: any, index: number) => (
              <div
                key={index}
                style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
              >
                <select
                  value={y.yarnSerialNo}
                  onChange={(e) =>
                    handleYarnChange(index, "yarnSerialNo", e.target.value)
                  }
                  style={{ ...inputStyle, flex: 2 }}
                >
                  <option value="">-- Select Yarn --</option>
                  {yarns.map((yarn) => (
                    <option key={yarn.serialNo} value={yarn.serialNo}>
                      {yarn.yarnName}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="%"
                  type="number"
                  value={y.percent}
                  onChange={(e) =>
                    handleYarnChange(index, "percent", e.target.value)
                  }
                  style={{ ...inputStyle, flex: 1 }}
                />
                {formData.yarns.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeYarnRow(index)}
                    style={{ ...buttonStyle, backgroundColor: "red" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addYarnRow}
              style={{ ...buttonStyle, marginBottom: "10px" }}
            >
              + Add Yarn
            </button>
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
            <button type="button" onClick={handleSave} style={buttonStyle}>
              {isEditMode ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowList(!showList)}
              style={buttonStyle}
            >
              {showList ? "Hide List" : "View List"}
            </button>
          </div>
        </form>

        {/* 📋 Modal List */}
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
              zIndex: 1000,
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
              <h3>All Fabrications</h3>
              <input
                type="text"
                placeholder="Search..."
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
                    <th style={{ border: "1px solid #ccc", padding: 8 }}>
                      Serial No
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: 8 }}>
                      Fabric Name
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: 8 }}>
                      Yarn
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: 8 }}>
                      Percent
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: 8 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFabrications.map((f) => (
                    <tr key={f.serialNo}>
                      {/* Serial No */}
                      <td style={{ border: "1px solid #ccc", padding: 8 }}>
                        {f.serialNo}
                      </td>

                      {/* Fabric Name */}
                      <td style={{ border: "1px solid #ccc", padding: 8 }}>
                        {f.fabricName}
                      </td>

                      {/* Yarn Names (comma-separated) */}
                      <td style={{ border: "1px solid #ccc", padding: 8 }}>
                        {f.yarns
                          ?.map((y: any) => y.yarnName || y.yarnSerialNo)
                          .join(", ")}
                      </td>

                      {/* Percentages (comma-separated) */}
                      <td style={{ border: "1px solid #ccc", padding: 8 }}>
                        {f.yarns
                          ?.map((y: any) => (y.percent ? y.percent + "%" : ""))
                          .join(", ")}
                      </td>

                      {/* Actions */}
                      <td style={{ border: "1px solid #ccc", padding: 8 }}>
                        {/* ✅ Edit Button */}
                        <button
                          style={{
                            ...buttonStyle,
                            backgroundColor: "green",
                            marginRight: "5px",
                          }}
                          onClick={() => {
  setFormData({
    id: f.id,
    serialNo: f.serialNo,
    fabricName: f.fabricName,
    yarns: f.yarns?.map((y: any) => ({
      yarnSerialNo: y.yarnSerialNo || "",
      percent: y.percent || "",
    })) || [{ yarnSerialNo: "", percent: "" }],
  });
  setShowList(false); // 🔥 Close the modal on edit
}}

                        >
                          Edit
                        </button>

                        {/* ❌ Delete Button */}
                        <button
                          style={{ ...buttonStyle, backgroundColor: "red" }}
                          onClick={() => handleDelete(f.serialNo)}
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

export default FabricationCreation;
