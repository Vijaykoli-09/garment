import React from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

interface ArtGroupFormData {
  serialNo: string;
  artGroupName: string;
  seriesRangeStart: string;
  seriesRangeEnd: string;
}

const ArtGroupCreation = () => {
  const [formData, setFormData] = React.useState<ArtGroupFormData>({
    serialNo: "",
    artGroupName: "",
    seriesRangeStart: "",
    seriesRangeEnd: "",
  });
  const [showListModal, setShowListModal] = React.useState(false);
  const [artGroupList, setArtGroupList] = React.useState<ArtGroupFormData[]>([]);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    fetchArtGroupList();
  }, []);

  // Auto-generate serial number on component mount
  React.useEffect(() => {
    if (!isEditMode && !formData.serialNo) {
      generateSerialNumber();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, formData.serialNo]);

  const fetchArtGroupList = async () => {
    try {
      const res = await api.get("/artgroup/list");
      setArtGroupList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateSerialNumber = () => {
    const prefix = "AG";
    const year = new Date().getFullYear();
    const unique = Math.floor(10000 + Math.random() * 90000).toString();
    const serial = `${prefix}${year}${unique}`;
    
    setFormData(prev => ({ ...prev, serialNo: serial }));
    console.log('Generated Art Group Serial Number:', serial);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = async () => {
    const requiredFields: (keyof ArtGroupFormData)[] = [
      "serialNo",
      "artGroupName",
      "seriesRangeStart",
      "seriesRangeEnd",
    ];
    
    for (const field of requiredFields) {
      if (!formData[field]?.toString().trim()) {
        return Swal.fire(
          "Validation Error",
          `Please fill the ${field} field`,
          "warning"
        );
      }
    }

    try {
      if (artGroupList.find((a) => a.serialNo === formData.serialNo)) {
        await api.put(`/artgroup/update/${formData.serialNo}`, formData);
        Swal.fire("Updated!", "Art Group updated successfully", "success");
        setIsEditMode(false);
      } else {
        await api.post("/artgroup/save", formData);
        Swal.fire("Added!", "Art Group saved successfully", "success");
      }
      
      setFormData({
        serialNo: "",
        artGroupName: "",
        seriesRangeStart: "",
        seriesRangeEnd: "",
      });
      setIsEditMode(false);
      fetchArtGroupList();
      
      // Generate new serial number after save
      setTimeout(() => generateSerialNumber(), 100);
    } catch (err: any) {
      console.error(err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to save Art Group",
        "error"
      );
    }
  };

  const handleDelete = async (serialNo: string) => {
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the Art Group",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });
    
    if (confirmResult.isConfirmed) {
      try {
        await api.delete(`/artgroup/delete/${serialNo}`);
        Swal.fire("Deleted!", "Art Group deleted successfully", "success");
        fetchArtGroupList();
      } catch (err) {
        Swal.fire("Error", "Failed to delete Art Group", "error");
      }
    }
  };

  const handleEdit = (artGroup: ArtGroupFormData) => {
    setFormData(artGroup);
    setIsEditMode(true);
    setShowListModal(false);
  };

  const handleCancelEdit = () => {
    setFormData({
      serialNo: "",
      artGroupName: "",
      seriesRangeStart: "",
      seriesRangeEnd: "",
    });
    setIsEditMode(false);
    generateSerialNumber();
  };

  const handleOpenList = () => setShowListModal(true);
  const handleCloseList = () => setShowListModal(false);

  // Filter art groups based on search query
  const filteredArtGroupList = React.useMemo(() => {
    if (!searchQuery) {
      return artGroupList;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    return artGroupList.filter(artGroup =>
      artGroup.serialNo.toLowerCase().includes(lowerCaseQuery) ||
      artGroup.artGroupName.toLowerCase().includes(lowerCaseQuery) ||
      artGroup.seriesRangeStart.toLowerCase().includes(lowerCaseQuery) ||
      artGroup.seriesRangeEnd.toLowerCase().includes(lowerCaseQuery)
    );
  }, [artGroupList, searchQuery]);

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
    marginBottom: 20 
  };
  
  const formRowStyle: React.CSSProperties = { 
    display: "flex", 
    gap: 15, 
    alignItems: "center", 
    marginBottom: 10 
  };
  
  const labelStyle: React.CSSProperties = { 
    width: "160px", 
    fontWeight: "bold" 
  };
  
  const inputStyle: React.CSSProperties = { 
    flex: 1, 
    padding: 6, 
    borderRadius: 4, 
    border: "1px solid #ccc" 
  };
  
  const buttonStyle: React.CSSProperties = { 
    padding: "6px 12px", 
    border: "none", 
    borderRadius: 5, 
    cursor: "pointer", 
    fontWeight: "bold" 
  };
  
  const buttonGroupStyle: React.CSSProperties = { 
    display: "flex", 
    justifyContent: "center", 
    gap: 10, 
    marginTop: 20, 
    flexWrap: "wrap" 
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
          Art Group Creation
          {isEditMode && <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>(Editing)</span>}
        </h2>
        
        {/* Form */}
        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial Number</label>
            <input
              style={{ ...inputStyle, maxWidth: '400px' }}
              type="text"
              name="serialNo"
              value={formData.serialNo}
              onChange={handleChange}
              disabled={isEditMode}
              title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
            />
          </div>
          
          <div style={formRowStyle}>
            <label style={labelStyle}>Art Group Name</label>
            <input
              style={inputStyle}
              name="artGroupName"
              value={formData.artGroupName}
              onChange={handleChange}
            />
          </div>
          
          <div style={formRowStyle}>
            <label style={labelStyle}>Series Range Start</label>
            <input
              style={inputStyle}
              name="seriesRangeStart"
              value={formData.seriesRangeStart}
              onChange={handleChange}
            />
          </div>
          
          <div style={formRowStyle}>
            <label style={labelStyle}>Series Range End</label>
            <input
              style={inputStyle}
              name="seriesRangeEnd"
              value={formData.seriesRangeEnd}
              onChange={handleChange}
            />
          </div>
        </form>
        
        {/* Buttons */}
        <div style={buttonGroupStyle}>
          <button
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }}
            onClick={handleSave}
            type="button"
          >
            {isEditMode ? "Update" : "Save"}
          </button>
          
          {isEditMode && (
            <button
              style={{ ...buttonStyle, backgroundColor: "#6c757d", color: "white" }}
              onClick={handleCancelEdit}
              type="button"
            >
              Cancel Edit
            </button>
          )}
          
          <button
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }}
            onClick={handleOpenList}
            type="button"
          >
            Art Group List
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
                placeholder="Search by Serial No, Art Group Name, or Series Range..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  marginBottom: 15,
                  padding: "8px 10px",
                }}
              />

              <h3>Art Group List (S = {filteredArtGroupList.length}) (Total: {artGroupList.length})</h3>
              <div style={tableWrapperStyle}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Serial No</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Art Group Name</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Series Start</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Series End</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArtGroupList.map((a) => (
                      <tr key={a.serialNo}>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.serialNo}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.artGroupName}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.seriesRangeStart}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.seriesRangeEnd}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8, display: "flex", gap: 5 }}>
                          <button
                            style={{ ...buttonStyle, backgroundColor: "#ffc107", fontSize: "12px", padding: "4px 8px" }}
                            onClick={() => handleEdit(a)}
                          >
                            Edit
                          </button>
                          <button
                            style={{ ...buttonStyle, backgroundColor: "#dc3545", color: "white", fontSize: "12px", padding: "4px 8px" }}
                            onClick={() => handleDelete(a.serialNo)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredArtGroupList.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            border: "1px solid #ccc",
                            padding: 8,
                            textAlign: "center",
                          }}
                        >
                          No art groups found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 15, textAlign: "right" }}>
                <button
                  style={{ ...buttonStyle, backgroundColor: "red", color: "white" }}
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

export default ArtGroupCreation;