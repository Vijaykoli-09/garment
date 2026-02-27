import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from '../Dashboard';
import Swal from 'sweetalert2';
import api from '../../api/axiosInstance';

interface CustomerGradeFormData {
    serialNo: string;
    gradeName: string;
}

const CustomerGrade = () => {
    const [formData, setFormData] = useState<CustomerGradeFormData>({ serialNo: "", gradeName: "" });
    const [showListModal, setShowListModal] = useState(false);
    const [gradeList, setGradeList] = useState<CustomerGradeFormData[]>([]);
    const [grades] = useState<any[]>([]);

    useEffect(() => {
        fetchGradeList();
    }, []);

    const fetchGradeList = async () => {
        try {
            const res = await api.get("/grades");
            setGradeList(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSave = async () => {
        const requiredFields: (keyof CustomerGradeFormData)[] = ["serialNo", "gradeName"];
        for (const field of requiredFields) {
            if (!formData[field]?.trim()) {
                return Swal.fire("Validation Error", `Please fill the ${field} field`, "warning");
            }
        }

        try {
            if (gradeList.find(g => g.serialNo === formData.serialNo)) {
                await api.put(`/grades/${formData.serialNo}`, formData);
                Swal.fire("Updated!", "Customer Grade updated successfully", "success");
            } else {
                await api.post("/grades", formData);
                Swal.fire("Added!", "Customer Grade saved successfully", "success");
            }
            setFormData({ serialNo: "", gradeName: "" });
            fetchGradeList();
        } catch (err: any) {
            console.error(err);
            Swal.fire("Error", err.response?.data?.message || "Failed to save grade", "error");
        }
    };

    const handleGradeList = () => setShowListModal(true);
    const handleCloseModal = () => setShowListModal(false);
    const handleEdit = (grade: CustomerGradeFormData) => { setFormData(grade); setShowListModal(false); };
    const handleDelete = async (serialNo: string) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will delete the customer grade",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        });
        if (result.isConfirmed) {
            try {
                await api.delete(`/grades/${serialNo}`);
                Swal.fire("Deleted!", "Customer Grade has been deleted.", "success");
                fetchGradeList();
            } catch (err) {
                Swal.fire("Error", "Failed to delete grade", "error");
            }
        }
    };

    // Auto Generate serialNo
      useEffect(() => {
          // Only generate a new serial number if it's a new record and serialNo is empty
          if (formData.serialNo === "") { 
              const prefix = "CG";
              const year = new Date().getFullYear();
              const unique = Date.now().toString().slice(-4); 
              const serial = `${prefix}${year}${unique}`;
              setFormData((prev) => ({ ...prev, serialNo: serial }));
          }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [formData.serialNo]);

    const isEditMode = useMemo(() => {
        return formData.serialNo
            && grades.some(t => t.serialNumber === formData.serialNo);
    }, [formData.serialNo, grades]);

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
                <h2 style={titleStyle}>Customer Grade</h2>
                <form>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Serial No</label>
                        <input
                            name="serialNo"
                            value={formData.serialNo || ""}
                            onChange={handleChange}
                            style={{ ...inputStyle, maxWidth: '800px', backgroundColor: "#e9ecef" }}
                            disabled
                            title={isEditMode ? "Serial Number cannot be changed during edit." : undefined}
                        />
                    </div>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Customer Grade</label>
                        <input style={inputStyle} name='gradeName' value={formData.gradeName} onChange={handleChange} />
                    </div>
                </form>

                <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
                    <button type='button' style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={handleSave}>Save</button>
                    <button type='button' style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={handleGradeList}>Grade List</button>
                </div>

                {showListModal && (
                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: "85%", maxHeight: "80%", overflowY: "auto" }}>
                            <h3>Customer Grade List</h3>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Serial No</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Customer Grade</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gradeList.map(g => (
                                        <tr key={g.serialNo}>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{g.serialNo}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{g.gradeName}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                                <button style={{ ...buttonStyle, backgroundColor: "#ffc107", marginRight: 8 }} onClick={() => handleEdit(g)}>Edit</button>
                                                <button style={{ ...buttonStyle, backgroundColor: "#dc3545", color: "white" }} onClick={() => handleDelete(g.serialNo)}>Delete</button>
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

export default CustomerGrade;
