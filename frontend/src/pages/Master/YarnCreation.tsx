import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from '../Dashboard';
import Swal from 'sweetalert2';
import api from '../../api/axiosInstance';

interface YarnFormData {
    serialNo: string;
    yarnName: string;
    unit: string;
    rate: string;
}

const YarnCreation = () => {
    const [formData, setFormData] = useState<YarnFormData>({
        serialNo: "",
        yarnName: "",
        unit: "kg",
        rate: ""
    });
    const [showListModal, setShowListModal] = useState(false);
    const [yarnList, setYarnList] = useState<YarnFormData[]>([]);
    const [filteredYarns, setFilteredYarns] = useState<YarnFormData[]>([]);

    // Fetch yarn list
    useEffect(() => {
        fetchYarnList();
    }, []);

    const fetchYarnList = async () => {
        try {
            const res = await api.get("/yarn/list");
            setYarnList(res.data);
            setFilteredYarns(res.data);
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Failed to fetch yarn list", "error");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSave = async () => {
        const requiredFields: (keyof YarnFormData)[] = ["serialNo", "yarnName", "rate"];
        for (const field of requiredFields) {
            if (!formData[field]?.trim()) {
                return Swal.fire("Validation Error", `Please fill the ${field} field`, "warning");
            }
        }

        try {
            if (yarnList.find(y => y.serialNo === formData.serialNo)) {
                await api.put(`/yarn/update/${formData.serialNo}`, formData);
                Swal.fire("Updated!", "Yarn updated successfully", "success");
            } else {
                await api.post("/yarn/save", formData);
                Swal.fire("Added!", "Yarn saved successfully", "success");
            }
            setFormData({ serialNo: "", yarnName: "", unit: "kg", rate: "" });
            fetchYarnList();
        } catch (err: any) {
            console.error(err);
            Swal.fire("Error", err.response?.data?.message || "Failed to save yarn", "error");
        }
    };

    const handleYarnList = () => setShowListModal(true);
    const handleCloseModal = () => setShowListModal(false);

    const handleEdit = (yarn: YarnFormData) => {
        setFormData(yarn);
        setShowListModal(false);
    };

    const handleDelete = async (serialNo: string) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will delete the yarn record",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        });
        if (result.isConfirmed) {
            try {
                await api.delete(`/yarn/delete/${serialNo}`);
                Swal.fire("Deleted!", "Yarn has been deleted.", "success");
                fetchYarnList();
            } catch (err) {
                Swal.fire("Error", "Failed to delete yarn", "error");
            }
        }
    };

    // Auto-generate serial number
    useEffect(() => {
        if (formData.serialNo === "") {
            const prefix = "YN";
            const year = new Date().getFullYear();
            const unique = Date.now().toString().slice(-4);
            const serial = `${prefix}${year}${unique}`;
            setFormData(prev => ({ ...prev, serialNo: serial }));
        }
    }, [formData.serialNo]);

    const isEditMode = useMemo(() => {
        return formData.serialNo && yarnList.some(y => y.serialNo === formData.serialNo);
    }, [formData.serialNo, yarnList]);

    const handleYarnSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value.toLowerCase();
        const filtered = yarnList.filter(
            (y) =>
                y.serialNo.toString().toLowerCase().includes(term) ||
                y.yarnName.toLowerCase().includes(term)
        );
        setFilteredYarns(filtered);
    };

    // Styles
    const containerStyle: React.CSSProperties = {
        maxWidth: "800px",
        margin: "20px auto",
        padding: 20,
        background: "#fff",
        borderRadius: "8px",
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
        width: "120px",
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
        fontWeight: "bold"
    };

    const buttonGroupStyle: React.CSSProperties = {
        display: "flex",
        justifyContent: "center",
        gap: 15,
        marginTop: 25,
        flexWrap: "wrap"
    };

    return (
        <Dashboard>
            <div style={containerStyle}>
                <h2 style={titleStyle}>Yarn Creation</h2>
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
                        <label style={labelStyle}>Yarn Name</label>
                        <input
                            style={inputStyle}
                            name="yarnName"
                            value={formData.yarnName}
                            onChange={handleChange}
                            placeholder="Enter yarn name"
                        />
                    </div>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Unit</label>
                        <input
                            style={{ ...inputStyle, backgroundColor: "#e9ecef" }}
                            name="unit"
                            value={formData.unit}
                            disabled
                        />
                    </div>
                    <div style={formRowStyle}>
                        <label style={labelStyle}>Rate (per kg)</label>
                        <input
                            style={inputStyle}
                            type="number"
                            name="rate"
                            value={formData.rate}
                            onChange={handleChange}
                            placeholder="Enter rate per kg"
                        />
                    </div>
                </form>

                <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
                    <button
                        type='button'
                        style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }}
                        onClick={handleSave}
                    >
                        Save
                    </button>
                    <button
                        type='button'
                        style={{ ...buttonStyle, backgroundColor: "#28a745", color: "white" }}
                        onClick={handleYarnList}
                    >
                        Yarn List
                    </button>
                </div>

                {showListModal && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000
                    }}>
                        <div style={{
                            background: "#fff",
                            padding: 25,
                            borderRadius: 8,
                            width: "85%",
                            maxWidth: "1000px",
                            maxHeight: "80vh",
                            overflowY: "auto",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ marginBottom: 15 }}>
                                <input
                                    type="text"
                                    placeholder="Search by Serial No or Yarn Name..."
                                    onChange={handleYarnSearch}
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        borderRadius: 4,
                                        border: "1px solid #ddd"
                                    }}
                                />
                            </div>

                            <h3 style={{ marginBottom: 15, color: "#333" }}>Yarn List</h3>
                            <table style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                marginBottom: 15
                            }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                                        <th style={{ border: "1px solid #dee2e6", padding: "10px", textAlign: "left" }}>Serial No</th>
                                        <th style={{ border: "1px solid #dee2e6", padding: "10px", textAlign: "left" }}>Yarn Name</th>
                                        <th style={{ border: "1px solid #dee2e6", padding: "10px", textAlign: "left" }}>Unit</th>
                                        <th style={{ border: "1px solid #dee2e6", padding: "10px", textAlign: "left" }}>Rate (per kg)</th>
                                        <th style={{ border: "1px solid #dee2e6", padding: "10px", textAlign: "center" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredYarns.map(y => (
                                        <tr key={y.serialNo}>
                                            <td style={{ border: "1px solid #dee2e6", padding: "10px" }}>{y.serialNo}</td>
                                            <td style={{ border: "1px solid #dee2e6", padding: "10px" }}>{y.yarnName}</td>
                                            <td style={{ border: "1px solid #dee2e6", padding: "10px" }}>{y.unit || 'kg'}</td>
                                            <td style={{ border: "1px solid #dee2e6", padding: "10px" }}>{y.rate}</td>
                                            <td style={{ border: "1px solid #dee2e6", padding: "10px", textAlign: "center" }}>
                                                <button
                                                    style={{
                                                        ...buttonStyle,
                                                        backgroundColor: "#ffc107",
                                                        marginRight: 8,
                                                        padding: "5px 10px"
                                                    }}
                                                    onClick={() => handleEdit(y)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    style={{
                                                        ...buttonStyle,
                                                        backgroundColor: "#dc3545",
                                                        color: "white",
                                                        padding: "5px 10px"
                                                    }}
                                                    onClick={() => handleDelete(y.serialNo)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ textAlign: "right" }}>
                                <button
                                    style={{
                                        ...buttonStyle,
                                        backgroundColor: "#6c757d",
                                        color: "white",
                                        padding: "8px 20px"
                                    }}
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
    );
};

export default YarnCreation;
