import React, { useState, useEffect, useMemo } from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

// Interface for ArtGroup data fetched from API
interface ArtGroupData {
    serialNo: string;
    artGroupName: string;
}

// Interface for Size form data
// This stores the selected ArtGroup NAME (string)
interface SizeFormData {
    id?: number;
    serialNo: string;
    sizeName: string;
    artGroup: string; 
}

const SizeCreation: React.FC = () => {
    

    // ⭐️ Initial state for a new record
    const initialFormData: SizeFormData = {
        serialNo: "",
        sizeName: "",
        artGroup: "", // Stores the selected artGroupName
    };

    const [formData, setFormData] = useState<SizeFormData>(initialFormData);
    const [allSizes, setAllSizes] = useState<SizeFormData[]>([]);
    const [filteredSizes, setFilteredSizes] = useState<SizeFormData[]>([]);
    const [allArtGroups, setAllArtGroups] = useState<ArtGroupData[]>([]);
    const [, setShowModal] = useState(false);
    const [showList, setShowList] = useState(false);
    
    //const [searchParams] = useSearchParams();

    // Load all Art Groups
    const loadAllArtGroups = async () => {
        try {
            const res = await api.get("/artgroup/list"); 
            setAllArtGroups(res.data);
        } catch (err) {
            console.error("Failed to load Art Groups:", err);
            Swal.fire("Error", "Failed to load Art Groups list.", "error");
        }
    };

    // Load all sizes
    const loadAllSizes = async () => {
        try {
            const res = await api.get("/sizes");
            // Mapping ArtGroup object from API response to simple string name for form display
            const mappedSizes = res.data.map((size: any) => ({
                ...size,
                // Check for nested ArtGroup object and safely extract the name
                artGroup: size.artGroup?.artGroupName || "", 
            }));
            setAllSizes(mappedSizes);
            setFilteredSizes(mappedSizes);
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Failed to load sizes", "error");
        }
    };

    // Load initial data
    useEffect(() => {
        loadAllArtGroups(); 
        loadAllSizes();
    }, []);

    // Handle input change (now handles select too)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddNew = () => {
        // Reset to initial form state
        setFormData(initialFormData); 
    };
    //🧑‍🏫✅Transport Search
//       const filteredSizes = allSizes.filter(
//   (s) =>
//     s.serialNo.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
//     s.sizeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     s.artGroup.toLowerCase().includes(searchQuery.toLowerCase())
// );

    // Auto Generate serialNo
    useEffect(() => {
        // Only generate a new serial number if it's a new record and serialNo is empty
        if (!formData.id && formData.serialNo === "") { 
            const prefix = "SZ";
            const year = new Date().getFullYear();
            const unique = Date.now().toString().slice(-4); 
            const serial = `${prefix}${year}${unique}`;
            setFormData((prev) => ({ ...prev, serialNo: serial }));
        }
    }, [formData.id, formData.serialNo]);

    const isEditMode = useMemo(() => {
        return !!formData.id; 
    }, [formData.id]);

    // ⭐️ FIX: Correctly structure the ArtGroup payload for the backend
    const handleSave = async () => {
        // Validation (simplified)
        const requiredFields = ["serialNo", "sizeName", "artGroup"];
        for (const field of requiredFields) {
            if (!formData[field as keyof SizeFormData] || formData[field as keyof SizeFormData]?.toString().trim() === "") {
                return Swal.fire("Validation Error", `Please fill the ${field} field`, "warning");
            }
        }

        // 1. Find the ArtGroup object matching the selected name
        const selectedArtGroup = allArtGroups.find(
            (group) => group.artGroupName === formData.artGroup
        );

        if (!selectedArtGroup) {
            return Swal.fire("Validation Error", "Invalid Art Group selected. Please select from the list.", "warning");
        }

        // 2. Transformation for API Payload
        const apiPayload = {
            id: formData.id,
            serialNo: formData.serialNo,
            sizeName: formData.sizeName,
            
            // Send the required ArtGroup object containing the serialNo (Primary Key of ArtGroup)
            artGroup: { 
                serialNo: selectedArtGroup.serialNo, 
                artGroupName: selectedArtGroup.artGroupName // Include name for completeness/logging
            },
        };

        try {
            if (formData.id) {
                await api.put(`/sizes/${formData.id}`, apiPayload);
                Swal.fire("Updated!", "Size updated successfully", "success");
            } else {
                await api.post("/sizes", apiPayload);
                Swal.fire("Added!", "Size saved successfully", "success");
            }
            loadAllSizes();
            handleAddNew();
        } catch (err: any) {
            console.error("Save Error:", err.response || err);
            // Enhanced Error message extraction (depends on how Spring Boot throws/maps the error)
            const serverErrorMessage = err.response?.data?.message || "Check if the Serial No is unique or Art Group exists.";
            Swal.fire("Error", `Failed to save size: ${serverErrorMessage}`, "error");
        }
    };

    // Delete size
    const handleDelete = async (id: number | undefined) => {
        if (!id) return Swal.fire("Info", "Cannot delete a record without an ID.", "info");
        try {
            await api.delete(`/sizes/${id}`);
            Swal.fire("Deleted!", "Size deleted successfully", "success");
            loadAllSizes();
            handleAddNew();
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Failed to delete size", "error");
        }
    };

    // Select size from modal
    const handleSelectSize = (size: SizeFormData) => {
        setFormData(size);
        Swal.fire("Selected!", `${size.sizeName} loaded for editing`, "info");
        handleCloseModal();
    };

    const handleCloseModal = () => setShowModal(false);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value.toLowerCase();
        const filtered = allSizes.filter(
            (s) =>
                s.serialNo.toLowerCase().includes(term) ||
                s.sizeName.toLowerCase().includes(term) ||
                s.artGroup.toLowerCase().includes(term)
        );
        setFilteredSizes(filtered);
    };

    // Styles
    const containerStyle: React.CSSProperties = {
        maxWidth: "600px",
        margin: "50px auto",
        padding: 20,
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        fontFamily: "Arial, sans-serif",
    };
    const titleStyle: React.CSSProperties = { textAlign: "center", marginBottom: 20 };
    const formRowStyle: React.CSSProperties = { display: "flex", gap: 15, alignItems: "center", marginBottom: 10 };
    const labelStyle: React.CSSProperties = { width: "120px", fontWeight: "bold" };
    const inputStyle: React.CSSProperties = { flex: 1, padding: 6, borderRadius: 4, border: "1px solid #ccc" };
    const buttonStyle: React.CSSProperties = { padding: "8px 16px", border: "none", borderRadius: 5, cursor: "pointer", backgroundColor: "#007bff", color: "white", fontWeight: "bold" };
    const buttonGroupStyle: React.CSSProperties = { display: "flex", justifyContent: "center", gap: 10, marginTop: 20, flexWrap: "wrap" };

    

    return (
        <Dashboard>
            <div style={containerStyle}>
                <h2 style={titleStyle}>Size Creation</h2>

                {/* Size Form */}
                <form>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Serial No</label>
                        <input
                            name="serialNo"
                            value={formData.serialNo || ""}
                            onChange={handleChange}
                            style={{ ...inputStyle, maxWidth: '800px', backgroundColor: isEditMode ? "#f8f9fa" : "#e9ecef" }}
                            disabled={isEditMode} // Disable serialNo on edit
                            title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
                        />
                    </div>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Size Name</label>
                        <input style={inputStyle} name="sizeName" value={formData.sizeName} onChange={handleChange} />
                    </div>
                    

                    {/* Select dropdown for Art Group */}
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Art Group</label>
                        <select
                            style={inputStyle}
                            name="artGroup"
                            value={formData.artGroup} 
                            onChange={handleChange}
                        >
                            <option value="">-- Select Art Group --</option>
                            {allArtGroups.map((group) => (
                                <option key={group.serialNo} value={group.artGroupName}>
                                    {group.artGroupName}
                                </option>
                            ))}
                        </select>
                    </div>

                </form>

                {/* Buttons placed below the form */}
                <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
                    <button type="button" style={buttonStyle} onClick={handleSave}>
                        {isEditMode ? "Update" : "Save"}
                    </button>
                    <button type="button" style={buttonStyle} onClick={handleAddNew}>
                        Clear
                    </button>
                    {/* <button type="button" style={buttonStyle} onClick={handleEditClick}>
                        Search
                    </button> */}
                    <button type="button" style={buttonStyle} onClick={() => setShowList(!showList)}>
                        {showList ? "Hide List" : "View List"}
                    </button>
                    
                    {isEditMode && (
                        <button type="button" style={{...buttonStyle, backgroundColor: 'red'}} onClick={() => handleDelete(formData.id)}>
                            Delete Current
                        </button>
                    )}
                </div>
                
                {/* View Size List Modal */}
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
      {/* 🧑‍🏫✅ Search Input */}
      <input
  type="text"
  placeholder="Search by Serial No, Size Name, or Art Group..."
  onChange={handleSearchChange}
  style={{
    width: "100%",
    padding: "8px 10px",
    marginBottom: 15,
    border: "1px solid #ccc",
    borderRadius: 4,
  }}
/>


      <h3>
        All Sizes (S = {filteredSizes.length}) (Total = {allSizes.length})
      </h3>

      <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Serial No</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Size Name</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Art Group</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSizes.map((s) => (
              <tr key={s.id}>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{s.serialNo}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{s.sizeName}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{s.artGroup}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  <button
                    style={{ ...buttonStyle, backgroundColor: "green", marginRight: "5px" }}
                    onClick={() => {
                      handleSelectSize(s);
                      setShowList(false);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...buttonStyle, backgroundColor: "red" }}
                    onClick={() => handleDelete(s.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredSizes.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 10 }}>
                  No matching sizes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

export default SizeCreation;