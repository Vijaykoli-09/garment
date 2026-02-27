import React from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

interface RangeFormData {
  serialNumber: string;
  rangeName: string;
  startValue: string;
  endValue: string;
}

const RangeCreation = () => {
  const [formData, setFormData] = React.useState<RangeFormData>({
    serialNumber: "",
    rangeName: "",
    startValue: "",
    endValue: "",
  });

  const [showListModal, setShowListModal] = React.useState(false);
  const [rangeList, setRangeList] = React.useState<RangeFormData[]>([]);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    fetchRangeList();
  }, []);

  // Auto-generate serial number on component mount
  React.useEffect(() => {
    if (!isEditMode && !formData.serialNumber) {
      generateSerialNumber();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, formData.serialNumber]);

  const fetchRangeList = async () => {
    try {
      const res = await api.get("/range/list");
      console.log("API Response:", res.data);
      setRangeList(res.data);
    } catch (err) {
      console.error("Fetch range error:", err);
      setRangeList([]);
    }
  };

  const generateSerialNumber = () => {
    const prefix = "RNG";
    const year = new Date().getFullYear();
    const unique = Math.floor(10000 + Math.random() * 90000).toString();
    const serial = `${prefix}${year}${unique}`;
    
    setFormData(prev => ({ ...prev, serialNumber: serial }));
    console.log('Generated Range Serial Number:', serial);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    const requiredFields: (keyof RangeFormData)[] = [
      "serialNumber",
      "rangeName",
      "startValue",
      "endValue",
    ];

    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        return Swal.fire(
          "Validation Error",
          `Please fill the ${field} field`,
          "warning"
        );
      }
    }

    try {
      if (rangeList.find((r) => r.serialNumber === formData.serialNumber)) {
        await api.put(`/range/update/${formData.serialNumber}`, formData);
        Swal.fire("Updated!", "Range updated successfully", "success");
        setIsEditMode(false);
      } else {
        await api.post("/range/save", formData);
        Swal.fire("Added!", "Range saved successfully", "success");
      }

      setFormData({
        serialNumber: "",
        rangeName: "",
        startValue: "",
        endValue: "",
      });
      setIsEditMode(false);
      fetchRangeList();
      
      // Generate new serial number after save
      setTimeout(() => generateSerialNumber(), 100);
    } catch (err: any) {
      console.error("Save error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to save range.",
        "error"
      );
    }
  };

  const handleDelete = async (serialNumber: string) => {
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the Range",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });
    
    if (confirmResult.isConfirmed) {
      try {
        await api.delete(`/range/delete/${serialNumber}`);
        Swal.fire("Deleted!", "Range deleted successfully", "success");
        fetchRangeList();
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire("Error", "Failed to delete Range", "error");
      }
    }
  };

  const handleEdit = (range: RangeFormData) => {
    setFormData(range);
    setIsEditMode(true);
    setShowListModal(false);
  };

  const handleCancelEdit = () => {
    setFormData({
      serialNumber: "",
      rangeName: "",
      startValue: "",
      endValue: "",
    });
    setIsEditMode(false);
    generateSerialNumber();
  };

  const handleOpenList = () => setShowListModal(true);
  const handleCloseList = () => setShowListModal(false);

  // Filter ranges based on search query
  const filteredRangeList = React.useMemo(() => {
    if (!searchQuery) {
      return rangeList;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    return rangeList.filter(range =>
      range.serialNumber.toLowerCase().includes(lowerCaseQuery) ||
      range.rangeName.toLowerCase().includes(lowerCaseQuery) ||
      range.startValue.toLowerCase().includes(lowerCaseQuery) ||
      range.endValue.toLowerCase().includes(lowerCaseQuery)
    );
  }, [rangeList, searchQuery]);

  // Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: "700px",
    margin: "20px auto",
    padding: 20,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };

  const titleStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: 20,
  };
  
  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 15,
    alignItems: "center",
    marginBottom: 10,
  };
  
  const labelStyle: React.CSSProperties = {
    width: "160px",
    fontWeight: "bold",
  };
  
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

  const tableWrapperStyle: React.CSSProperties = {
    maxHeight: "400px",
    overflowY: "auto",
    border: "1px solid #eee",
    margin: "10px 0",
  };

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={titleStyle}>
          Range Creation
          {isEditMode && <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>(Editing)</span>}
        </h2>

        {/* Form */}
        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial Number</label>
            <input
              style={{ ...inputStyle, maxWidth: '400px' }}
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              disabled={isEditMode}
              title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Range Name</label>
            <input
              style={inputStyle}
              name="rangeName"
              value={formData.rangeName}
              onChange={handleChange}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Start Value</label>
            <input
              style={inputStyle}
              name="startValue"
              value={formData.startValue}
              onChange={handleChange}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>End Value</label>
            <input
              style={inputStyle}
              name="endValue"
              value={formData.endValue}
              onChange={handleChange}
            />
          </div>
        </form>

        {/* Buttons */}
        <div style={buttonGroupStyle}>
          <button
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }}
            onClick={handleSave}
          >
            {isEditMode ? "Update" : "Save"}
          </button>
          
          {isEditMode && (
            <button
              style={{ ...buttonStyle, backgroundColor: "#6c757d", color: "white" }}
              onClick={handleCancelEdit}
            >
              Cancel Edit
            </button>
          )}
          
          <button
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }}
            onClick={handleOpenList}
          >
            Range List
          </button>
        </div>

        {/* Modal */}
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
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 8,
                width: "85%",
                maxHeight: "80%",
                overflowY: "auto",
              }}
            >
              <input
                type="text"
                placeholder="Search by Serial Number, Range Name, Start or End Value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  marginBottom: 15,
                  padding: "8px 10px",
                }}
              />

              <h3>Range List (S = {filteredRangeList.length}) (Total: {rangeList.length})</h3>
              <div style={tableWrapperStyle}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Serial Number
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Range Name
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Start
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        End
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRangeList.map((r, idx) => (
                      <tr
                        key={r.serialNumber}
                        style={{
                          background: idx % 2 === 0 ? "#f9f9f9" : "#fff",
                        }}
                      >
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {r.serialNumber}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {r.rangeName}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {r.startValue}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {r.endValue}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8, display: "flex", gap: 5 }}>
                          <button
                            style={{
                              ...buttonStyle,
                              backgroundColor: "#ffc107",
                              fontSize: "12px",
                              padding: "4px 8px"
                            }}
                            onClick={() => handleEdit(r)}
                          >
                            Edit
                          </button>
                          <button
                            style={{
                              ...buttonStyle,
                              backgroundColor: "#dc3545",
                              color: "white",
                              fontSize: "12px",
                              padding: "4px 8px"
                            }}
                            onClick={() => handleDelete(r.serialNumber)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRangeList.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            border: "1px solid #ccc",
                            padding: 8,
                            textAlign: "center",
                          }}
                        >
                          No ranges found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 15, textAlign: "right" }}>
                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: "red",
                    color: "white",
                  }}
                  onClick={handleCloseList}
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

export default RangeCreation;