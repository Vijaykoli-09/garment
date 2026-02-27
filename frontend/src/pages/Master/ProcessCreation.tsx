// Import and interface remain same
import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from '../Dashboard';
import Swal from 'sweetalert2';
import api from '../../api/axiosInstance';

interface ProcessFormData {
    serialNo: string;
    processName: string;
    //category: string;
}

const ProcessCreation = () => {
    const [formData, setFormData] = useState<ProcessFormData>({ serialNo: "", processName: ""});
    const [showListModal, setShowListModal] = useState(false);
    const [processList, setProcessList] = useState<ProcessFormData[]>([]);
    const [process] = useState<any[]>([]);
    const [, setFilteredProcesses] = useState(processList);


    useEffect(() => {
        fetchProcessList();
    }, []);

    const fetchProcessList = async () => {
        try {
            const res = await api.get("/process/list");
            setProcessList(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSave = async () => {
        const requiredFields: (keyof ProcessFormData)[] = ["serialNo", "processName"];
        for (const field of requiredFields) {
            if (!formData[field]?.trim()) {
                return Swal.fire("Validation Error", `Please fill the ${field} field`, "warning");
            }
        }

        try {
            if (processList.find(p => p.serialNo === formData.serialNo)) {
                await api.put(`/process/update/${formData.serialNo}`, formData);
                Swal.fire("Updated!", "Process updated successfully", "success");
            } else {
                await api.post("/process/save", formData);
                Swal.fire("Added!", "Process saved successfully", "success");
            }
            setFormData({ serialNo: "", processName: ""});
            fetchProcessList();
        } catch (err: any) {
            console.error(err);
            Swal.fire("Error", err.response?.data?.message || "Failed to save process", "error");
        }
    };

    const handleProcessList = () => setShowListModal(true);
    const handleCloseModal = () => setShowListModal(false);
    const handleEdit = (process: ProcessFormData) => { setFormData(process); setShowListModal(false); };
    const handleDelete = async (serialNo: string) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will delete the process",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        });
        if (result.isConfirmed) {
            try {
                await api.delete(`/process/delete/${serialNo}`);
                Swal.fire("Deleted!", "Process has been deleted.", "success");
                fetchProcessList();
            } catch (err) {
                Swal.fire("Error", "Failed to delete process", "error");
            }
        }
    };
    // Auto Generate serialNo
      useEffect(() => {
          if (formData.serialNo === "") { 
              const prefix = "PC";
              const year = new Date().getFullYear();
              const unique = Date.now().toString().slice(-4); 
              const serial = `${prefix}${year}${unique}`;
              setFormData((prev) => ({ ...prev, serialNo: serial }));
          }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [formData.serialNo]);
      
    const isEditMode = useMemo(() => {
        return formData.serialNo 
            && process.some(t => t.serialNumber === formData.serialNo);
    }, [formData.serialNo, process]);


    const handleProcessSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  const term = e.target.value.toLowerCase();
  const filtered = processList.filter(
    (p) =>
      p.serialNo.toString().toLowerCase().includes(term) ||
      p.processName.toLowerCase().includes(term)
    // you can also include category if you want
    // || p.category.toLowerCase().includes(term)
  );
  setFilteredProcesses(filtered);
};


    // Styles
    const containerStyle: React.CSSProperties = { maxWidth: "600px", margin: "20px auto", padding: 20, background: "#fff", borderRadius: "8px", boxShadow: "0 0 10px rgba(0,0,0,0.1)", fontFamily: "Arial, sans-serif" };
    const titleStyle: React.CSSProperties = { textAlign: "center", marginBottom: 20 };
    const formRowStyle: React.CSSProperties = { display: "flex", gap: 15, alignItems: "center", marginBottom: 10 };
    const labelStyle: React.CSSProperties = { width: "120px", fontWeight: "bold" };
    const inputStyle: React.CSSProperties = { flex: 1, padding: 6, borderRadius: 4, border: "1px solid #ccc" };
    const buttonStyle: React.CSSProperties = { padding: "6px 12px", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" };
    const buttonGroupStyle: React.CSSProperties = { display: "flex", justifyContent: "center", gap: 10, marginTop: 20, flexWrap: "wrap" };

    return (
        <Dashboard>
            <div style={containerStyle}>
                <h2 style={titleStyle}>Process Creation</h2>
                <form>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Serial No</label>
            <input
               name="serialNo"
              value={formData.serialNo || ""}
               onChange={handleChange}
              // style={inputStyle}
              style={{ ...inputStyle, maxWidth: '800px', backgroundColor: "#e9ecef" }}
               disabled// prevent changing in edit mode
               title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
            />
                    </div>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Process Name</label>
                        <input style={inputStyle} name='processName' value={formData.processName} onChange={handleChange} />
                    </div>
                </form>

                <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
                    <button type='button' style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={handleSave}>Save</button>
                    <button type='button' style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={handleProcessList}>Process List</button>
                </div>

                {showListModal && (
                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: "85%", maxHeight: "80%", overflowY: "auto" }}>
                            <input
                            type="text" placeholder="Search by Serial No or Process Name..." onChange={handleProcessSearch} style={{ width: "100%", padding: 6, marginBottom: 10 }}/>

                            <h3>Process List</h3>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Serial No</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Process</th>
                                        {/* <th style={{ border: "1px solid #ccc", padding: "8px" }}>Category</th> */}
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processList.map(p => (
                                        <tr key={p.serialNo}>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.serialNo}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.processName}</td>
                                            {/* <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.category}</td> */}
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                                <button style={{ ...buttonStyle, backgroundColor: "#ffc107", marginRight: 8 }} onClick={() => handleEdit(p)}>Edit</button>
                                                <button style={{ ...buttonStyle, backgroundColor: "#dc3545", color: "white" }} onClick={() => handleDelete(p.serialNo)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: 15, textAlign: "right" }}>
                                <button style={{ ...buttonStyle, backgroundColor: "red", color: "white" }} onClick={handleCloseModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Dashboard>
    );
};

export default ProcessCreation;
