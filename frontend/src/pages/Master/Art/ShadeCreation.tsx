import React from 'react'
import Dashboard from '../../Dashboard'
import api from '../../../api/axiosInstance';
import Swal from 'sweetalert2';

interface ShadeFormData {
  shadeCode: string;
  shadeName: string;
}

const ShadeCreation = () => {
  const [formData, setFormData] = React.useState<ShadeFormData>({
    shadeCode: "",
    shadeName: ""
  });
  const [showListModal, setShowListModal] = React.useState(false);
  const [shadeList, setShadeList] = React.useState<ShadeFormData[]>([]);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    fetchShadeList();
  }, []);

  // Auto-generate shade code on component mount
  React.useEffect(() => {
    if (!isEditMode && !formData.shadeCode) {
      generateShadeCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, formData.shadeCode]);

  const fetchShadeList = async () => {
    try {
      const res = await api.get("/shade/list");
      setShadeList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateShadeCode = () => {
    const prefix = "SH"; 
    const year = new Date().getFullYear().toString().slice(-2); 
    const unique = Math.floor(100 + Math.random() * 900).toString(); 
    const code = `${prefix}${year}${unique}`; 

    setFormData(prev => ({ ...prev, shadeCode: code }));
    console.log('Generated Shade Code:', code);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert shade code to uppercase as user types
    const finalValue = name === 'shadeCode' ? value.toUpperCase() : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  const handleSave = async () => {
    const requiredFields: (keyof ShadeFormData)[] = ["shadeCode", "shadeName"];
    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        return Swal.fire("Validation Error", `Please fill the ${field} field`, "warning");
      }
    }

    try {
      if (shadeList.find((s) => s.shadeCode === formData.shadeCode)) {
        await api.put(`/shade/update/${formData.shadeCode}`, formData);
        Swal.fire("Updated!", "Shade updated successfully", "success");
        setIsEditMode(false);
      } else {
        await api.post("/shade/save", formData);
        Swal.fire("Added!", "Shade saved successfully", "success");
      }
      
      setFormData({ shadeCode: "", shadeName: "" });
      setIsEditMode(false);
      fetchShadeList();
      
      // Generate new shade code after save
      setTimeout(() => generateShadeCode(), 100);
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err.response?.data?.message || "Failed to save shade", "error");
    }
  };

  const handleDelete = async (shadeCode: string) => {
    const confirmResult = await Swal.fire({
      title: 'Are you Sure',
      text: "This Will Delete the Shade",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (confirmResult.isConfirmed) {
      try {
        await api.delete('/shade/delete/' + shadeCode);
        Swal.fire('Deleted!', 'Shade deleted successfully', 'success');
        fetchShadeList();
      } catch (err) {
        Swal.fire('Error', 'Failed to Delete Shade', 'error');
      }
    }
  };

  const handleProcessList = () => setShowListModal(true);
  const handleCloseModal = () => setShowListModal(false);

  const handleEdit = (shade: ShadeFormData) => {
    setFormData(shade);
    setIsEditMode(true);
    setShowListModal(false);
  };

  const handleCancelEdit = () => {
    setFormData({ shadeCode: "", shadeName: "" });
    setIsEditMode(false);
    generateShadeCode();
  };

  // Filter shades based on search query
  const filteredShadeList = React.useMemo(() => {
    if (!searchQuery) {
      return shadeList;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    return shadeList.filter(shade =>
      shade.shadeCode.toLowerCase().includes(lowerCaseQuery) ||
      shade.shadeName.toLowerCase().includes(lowerCaseQuery)
    );
  }, [shadeList, searchQuery]);

  // Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: "600px",
    margin: "20px auto",
    padding: 20,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif"
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
    width: "120px", 
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
          Shade Creation
          {isEditMode && <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>(Editing)</span>}
        </h2>

        {/* Form */}
        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Shade Code</label>
            <input 
              style={{ ...inputStyle, maxWidth: '350px' }} 
              name='shadeCode' 
              value={formData.shadeCode}
              onChange={handleChange}
              disabled={isEditMode}
              title={isEditMode ? "Shade Code cannot be changed during edit." : undefined}
              placeholder="e.g., sh202512345"
            />
          </div>
          
          <div style={formRowStyle}>
            <label style={labelStyle}>Shade Name</label>
            <input 
              style={inputStyle} 
              name='shadeName' 
              value={formData.shadeName}
              onChange={handleChange} 
            />
          </div>
        </form>

        <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
          <button 
            type='button' 
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} 
            onClick={handleSave}
          >
            {isEditMode ? "Update" : "Save"}
          </button>
          
          {isEditMode && (
            <button 
              type='button' 
              style={{ ...buttonStyle, backgroundColor: "#6c757d", color: "white" }} 
              onClick={handleCancelEdit}
            >
              Cancel Edit
            </button>
          )}
          
          <button 
            type='button' 
            style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} 
            onClick={handleProcessList}
          >
            Shade List
          </button>
        </div>

        {showListModal && (
          <div style={{
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
            <div style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              width: "85%",
              maxHeight: "80%",
              overflowY: "auto"
            }}
            >
              <input
                type="text"
                placeholder="Search by Shade Code or Shade Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  marginBottom: 15,
                  padding: "8px 10px",
                }}
              />
              
              <h3>Shade List (S = {filteredShadeList.length}) (Total: {shadeList.length})</h3>
              <div style={tableWrapperStyle}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Shade Code</th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Shade Name</th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShadeList.map(s => (
                      <tr key={s.shadeCode}>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {s.shadeCode}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{s.shadeName}</td>
                        <td style={{ border: "1px solid #ccc", padding: "8px", display: "flex", gap: 5 }}>
                          <button 
                            style={{ ...buttonStyle, backgroundColor: "#ffc107", fontSize: "12px", padding: "4px 8px" }} 
                            onClick={() => handleEdit(s)}
                          >
                            Edit
                          </button>
                          <button 
                            style={{ ...buttonStyle, backgroundColor: "#dc3545", color: "white", fontSize: "12px", padding: "4px 8px" }} 
                            onClick={() => handleDelete(s.shadeCode)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 15, textAlign: "right" }}>
                <button 
                  style={{ ...buttonStyle, backgroundColor: "red", color: "white" }} 
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  )
}

export default ShadeCreation;