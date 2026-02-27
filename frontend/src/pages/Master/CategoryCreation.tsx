import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from '../Dashboard';
import Swal from 'sweetalert2';
import api from '../../api/axiosInstance';

interface CategoryFormData {
    serialNo: string;
    categoryName: string;
}

const Category = () => {
    const [formData, setFormData] = useState<CategoryFormData>({ serialNo: "", categoryName: "" });
    const [showListModal, setShowListModal] = useState(false);
    const [categoryList, setCategoryList] = useState<CategoryFormData[]>([]);
    const [categories] = useState<any[]>([]);
    // const [searchParams] = useSearchParams();

    useEffect(() => {
        fetchCategoryList();
    }, []);

    const fetchCategoryList = async () => {
        try {
            const res = await api.get("/categories");   // <-- API endpoint for category
            setCategoryList(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSave = async () => {
        const requiredFields: (keyof CategoryFormData)[] = ["serialNo", "categoryName"];
        for (const field of requiredFields) {
            if (!formData[field]?.trim()) {
                return Swal.fire("Validation Error", `Please fill the ${field} field`, "warning");
            }
        }

        try {
            if (categoryList.find(c => c.serialNo === formData.serialNo)) {
                await api.put(`/categories/${formData.serialNo}`, formData);
                Swal.fire("Updated!", "Category updated successfully", "success");
            } else {
                await api.post("/categories", formData);
                Swal.fire("Added!", "Category saved successfully", "success");
            }
            setFormData({ serialNo: "", categoryName: "" });
            fetchCategoryList();
        } catch (err: any) {
            console.error(err);
            Swal.fire("Error", err.response?.data?.message || "Failed to save category", "error");
        }
    };

    const handleCategoryList = () => setShowListModal(true);
    const handleCloseModal = () => setShowListModal(false);
    const handleEdit = (category: CategoryFormData) => { setFormData(category); setShowListModal(false); };
    const handleDelete = async (serialNo: string) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will delete the category",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        });
        if (result.isConfirmed) {
            try {
                await api.delete(`/categories/${serialNo}`);
                Swal.fire("Deleted!", "Category has been deleted.", "success");
                fetchCategoryList();
            } catch (err) {
                Swal.fire("Error", "Failed to delete category", "error");
            }
        }
    };

    // Auto Generate serialNo
    useEffect(() => {
        if (formData.serialNo === "") {
            const prefix = "CAT";
            const year = new Date().getFullYear();
            const unique = Date.now().toString().slice(-4);
            const serial = `${prefix}${year}${unique}`;
            setFormData((prev) => ({ ...prev, serialNo: serial }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.serialNo]);

    const isEditMode = useMemo(() => {
        return formData.serialNo
            && categories.some(t => t.serialNumber === formData.serialNo);
    }, [formData.serialNo, categories]);

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
                <h2 style={titleStyle}>Category Creation</h2>
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
                        <label style={labelStyle}>Category Name</label>
                        <input style={inputStyle} name='categoryName' value={formData.categoryName} onChange={handleChange} />
                    </div>
                </form>

                <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
                    <button type='button' style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={handleSave}>Save</button>
                    <button type='button' style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} onClick={handleCategoryList}>Category List</button>
                </div>

                {showListModal && (
                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: "85%", maxHeight: "80%", overflowY: "auto" }}>
                            <h3>Category List</h3>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Serial No</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Category Name</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryList.map(c => (
                                        <tr key={c.serialNo}>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.serialNo}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{c.categoryName}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                                <button style={{ ...buttonStyle, backgroundColor: "#ffc107", marginRight: 8 }} onClick={() => handleEdit(c)}>Edit</button>
                                                <button style={{ ...buttonStyle, backgroundColor: "#dc3545", color: "white" }} onClick={() => handleDelete(c.serialNo)}>Delete</button>
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

export default Category;
