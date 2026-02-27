import React from 'react'
import Dashboard from '../../Dashboard'
import api from '../../../api/axiosInstance';
import Swal from 'sweetalert2';

interface AccessoriesFormData {
  serialNumber: string;
  processName: string;
  materialName: string;
}

interface Process {
  serialNo: string;
  processName: string;
}

interface Material {
  id: string;
  materialName: string;
}

const AccessoriesCreation = () => {
  const [formData, setFormData] = React.useState<AccessoriesFormData>({
    serialNumber: "",
    processName: "",
    materialName: ""
  });
  const [showListModal, setShowListModal] = React.useState(false);
  const [accessoriesList, setAccessoriesList] = React.useState<AccessoriesFormData[]>([]);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [processes, setProcesses] = React.useState<Process[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);

  React.useEffect(() => {
    fetchAccessoriesList();
    fetchProcesses();
    fetchMaterials();
  }, []);

  // Auto-generate serial number on component mount
  React.useEffect(() => {
    if (!isEditMode && !formData.serialNumber) {
      generateSerialNumber();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, formData.serialNumber]);

  const fetchMaterials = async () => {
    try {
      const res = await api.get("/materials");
      setMaterials(res.data);
    } catch (err) {
      console.error("Failed to fetch materials:", err);
      Swal.fire("Error", "Failed to load materials", "error");
    }
  };

  const fetchAccessoriesList = async () => {
    try {
      const res = await api.get("/accessories/list");
      setAccessoriesList(res.data || []);
    } catch (err: any) {
      console.error("Error loading accessories:", err);
      if (err.response?.status !== 404) {
        console.error("Failed to load accessories list:", err);
      }
      setAccessoriesList([]);
    }
  };

  const fetchProcesses = async () => {
    try {
      const res = await api.get("/process/list");
      setProcesses(res.data);
    } catch (err) {
      console.error("Failed to fetch processes:", err);
      Swal.fire("Error", "Failed to load processes", "error");
    }
  };

  const generateSerialNumber = () => {
    const prefix = "ACC"; 
    const year = new Date().getFullYear().toString().slice(-2); 
    const unique = Math.floor(100 + Math.random() * 900).toString(); 
    const serial = `${prefix}${year}${unique}`; 
    setFormData(prev => ({ ...prev, serialNumber: serial }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const finalValue = name === 'serialNumber' ? value.toUpperCase() : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  const handleSave = async () => {
    const requiredFields: (keyof AccessoriesFormData)[] = ["serialNumber", "processName", "materialName"];
    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        return Swal.fire("Validation Error", `Please select ${field}`, "warning");
      }
    }

    try {
      const payload = {
        serialNumber: formData.serialNumber,
        processName: formData.processName,
        materialName: formData.materialName
      };

      if (accessoriesList.find(a => a.serialNumber === formData.serialNumber)) {
        await api.put(`/accessories/update/${formData.serialNumber}`, payload);
        Swal.fire("Updated!", "Accessory updated successfully", "success");
        setIsEditMode(false);
      } else {
        await api.post("/accessories/save", payload);
        Swal.fire("Added!", "Accessory saved successfully", "success");
      }
      
      setFormData({ 
        serialNumber: "", 
        processName: "", 
        materialName: ""
      });
      setIsEditMode(false);
      fetchAccessoriesList();
      setTimeout(() => generateSerialNumber(), 100);
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err.response?.data?.message || "Failed to save accessory", "error");
    }
  };

  const handleDelete = async (serialNumber: string) => {
    const confirmResult = await Swal.fire({
      title: 'Are you Sure',
      text: "This Will Delete the Accessory",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (confirmResult.isConfirmed) {
      try {
        await api.delete(`/accessories/delete/${serialNumber}`);
        Swal.fire('Deleted!', 'Accessory deleted successfully', 'success');
        fetchAccessoriesList();
      } catch (err) {
        Swal.fire('Error', 'Failed to Delete Accessory', 'error');
      }
    }
  };

  const handleAccessoriesList = () => setShowListModal(true);
  const handleCloseModal = () => setShowListModal(false);

  const handleEdit = (accessory: AccessoriesFormData) => {
    setFormData(accessory);
    setIsEditMode(true);
    setShowListModal(false);
  };

  const handleCancelEdit = () => {
    setFormData({ 
      serialNumber: "", 
      processName: "", 
      materialName: ""
    });
    setIsEditMode(false);
    generateSerialNumber();
  };

  const filteredAccessoriesList = React.useMemo(() => {
    if (!searchQuery) return accessoriesList;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return accessoriesList.filter(accessory =>
      accessory.serialNumber.toLowerCase().includes(lowerCaseQuery) ||
      accessory.processName.toLowerCase().includes(lowerCaseQuery) ||
      accessory.materialName?.toLowerCase().includes(lowerCaseQuery)
    );
  }, [accessoriesList, searchQuery]);

  // Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
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
    marginBottom: 15 
  };
  
  const labelStyle: React.CSSProperties = { 
    width: "150px", 
    fontWeight: "bold" 
  };
  
  const inputStyle: React.CSSProperties = { 
    flex: 1, 
    padding: 8, 
    borderRadius: 4, 
    border: "1px solid #ccc" 
  };
  
  const buttonStyle: React.CSSProperties = { 
    padding: "8px 16px", 
    border: "none", 
    borderRadius: 5, 
    cursor: "pointer", 
    fontWeight: "bold",
    margin: "5px 0" 
  };
  
  const buttonGroupStyle: React.CSSProperties = { 
    display: "flex", 
    justifyContent: "center", 
    gap: 10, 
    marginTop: 25, 
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
          Accessories Creation
          {isEditMode && <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>(Editing)</span>}
        </h2>

        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial Number</label>
            <input 
              style={{ ...inputStyle, maxWidth: '350px' }} 
              name='serialNumber' 
              value={formData.serialNumber}
              onChange={handleChange}
              disabled={isEditMode}
              title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
              placeholder="e.g., ACC25001"
            />
          </div>
          
          <div style={formRowStyle}>
            <label style={labelStyle}>Process Name</label>
            <select 
              style={inputStyle} 
              name='processName' 
              value={formData.processName}
              onChange={handleChange}
              required
            >
              <option value="">Select Process</option>
              {processes.map(process => (
                <option key={process.serialNo} value={process.processName}>
                  {process.processName}
                </option>
              ))}
            </select>
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Material Name</label>
            <select
              style={inputStyle}
              name='materialName'
              value={formData.materialName}
              onChange={handleChange}
              required
            >
              <option value="">Select Material</option>
              {materials.map(material => (
                <option key={material.id} value={material.materialName}>
                  {material.materialName}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div style={{ ...buttonGroupStyle }}>
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
            onClick={handleAccessoriesList}
          >
            Accessories List
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
          }}>
            <div style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              width: "90%",
              maxHeight: "80%",
              overflowY: "auto"
            }}>
              <input
                type="text"
                placeholder="Search by Serial Number, Process Name, or Material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  marginBottom: 15,
                  padding: "10px 12px",
                }}
              />
              
              <h3>Accessories List (Showing: {filteredAccessoriesList.length} of {accessoriesList.length} total)</h3>
              <div style={tableWrapperStyle}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ccc", padding: "10px", backgroundColor: "#f5f5f5" }}>Serial Number</th>
                      <th style={{ border: "1px solid #ccc", padding: "10px", backgroundColor: "#f5f5f5" }}>Process Name</th>
                      <th style={{ border: "1px solid #ccc", padding: "10px", backgroundColor: "#f5f5f5" }}>Material Name</th>
                      <th style={{ border: "1px solid #ccc", padding: "10px", backgroundColor: "#f5f5f5" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccessoriesList.length > 0 ? (
                      filteredAccessoriesList.map(a => (
                        <tr key={a.serialNumber}>
                          <td style={{ border: "1px solid #eee", padding: "10px" }}>{a.serialNumber}</td>
                          <td style={{ border: "1px solid #eee", padding: "10px" }}>{a.processName}</td>
                          <td style={{ border: "1px solid #eee", padding: "10px" }}>{a.materialName}</td>
                          <td style={{ border: "1px solid #eee", padding: "10px", display: "flex", gap: 5, justifyContent: "center" }}>
                            <button 
                              style={{ ...buttonStyle, backgroundColor: "#ffc107", fontSize: "12px", padding: "6px 12px" }} 
                              onClick={() => handleEdit(a)}
                            >
                              Edit
                            </button>
                            <button 
                              style={{ ...buttonStyle, backgroundColor: "#dc3545", color: "white", fontSize: "12px", padding: "6px 12px" }} 
                              onClick={() => handleDelete(a.serialNumber)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '15px', color: '#666' }}>
                          No accessories found. {searchQuery ? 'Try a different search term.' : 'Add a new accessory to get started.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 15, textAlign: "right" }}>
                <button 
                  style={{ ...buttonStyle, backgroundColor: "#6c757d", color: "white" }} 
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

export default AccessoriesCreation;