import React, { useState, useEffect, useMemo } from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

interface PaymentModeFormData {
  id?: number;
  bankNameOrUpiId: string;
  accountNo: string;
}

const PaymentModeCreation: React.FC = () => {
  const initialFormData: PaymentModeFormData = {
    bankNameOrUpiId: "",
    accountNo: "",
  };

  const [formData, setFormData] = useState<PaymentModeFormData>(initialFormData);
  const [allPaymentModes, setAllPaymentModes] = useState<PaymentModeFormData[]>([]);
  const [filteredPaymentModes, setFilteredPaymentModes] = useState<PaymentModeFormData[]>([]);
  const [showList, setShowList] = useState(false);

  const loadAllPaymentModes = async () => {
    try {
      // Adjust the URL to match your backend
      const res = await api.get("/payment/payment-mode");
      setAllPaymentModes(res.data);
      setFilteredPaymentModes(res.data);
    } catch (err) {
      console.error("Failed to load payment mode:", err);
      Swal.fire("Error", "Failed to load payment modes.", "error");
    }
  };

  useEffect(() => {
    loadAllPaymentModes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => {
    setFormData(initialFormData);
  };

  const isEditMode = useMemo(() => !!formData.id, [formData.id]);

  const handleSave = async () => {
    const requiredFields: (keyof PaymentModeFormData)[] = [
      "bankNameOrUpiId",
      "accountNo",
    ];

    for (const field of requiredFields) {
      const value = formData[field];

      // For our required fields we expect strings
      if (typeof value !== "string" || value.trim() === "") {
        return Swal.fire(
          "Validation Error",
          `Please fill the ${String(field)} field`,
          "warning"
        );
      }
    }

    try {
      if (formData.id) {
        await api.put(`/payment/payment-mode/${formData.id}`, formData);
        Swal.fire("Updated!", "Payment mode updated successfully", "success");
      } else {
        await api.post("/payment/payment-mode", formData);
        Swal.fire("Added!", "Payment mode saved successfully", "success");
      }
      loadAllPaymentModes();
      handleAddNew();
    } catch (err: any) {
      console.error("Save Error:", err.response || err);
      const serverErrorMessage =
        err.response?.data?.message || "Please check if the data is valid.";
      Swal.fire(
        "Error",
        `Failed to save payment mode: ${serverErrorMessage}`,
        "error"
      );
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (!id) {
      return Swal.fire("Info", "Cannot delete a record without an ID.", "info");
    }
    try {
      await api.delete(`/payment/payment-mode/${id}`);
      Swal.fire("Deleted!", "Payment mode deleted successfully", "success");
      loadAllPaymentModes();
      handleAddNew();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete payment mode", "error");
    }
  };

  const handleSelectPaymentMode = (pm: PaymentModeFormData) => {
    setFormData(pm);
    Swal.fire("Selected!", `Payment mode loaded for editing`, "info");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    const filtered = allPaymentModes.filter(
      (p) =>
        p.bankNameOrUpiId.toLowerCase().includes(term) ||
        p.accountNo.toLowerCase().includes(term)
    );
    setFilteredPaymentModes(filtered);
  };

  // Styles (same pattern as your SizeCreation component)
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
  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 15,
    alignItems: "center",
    marginBottom: 10,
  };
  const labelStyle: React.CSSProperties = { width: "140px", fontWeight: "bold" };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    border: "1px solid #ccc",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    fontWeight: "bold",
  };
  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
  };

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Payment Mode Creation</h2>

        {/* Form */}
        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Bank Name / UPI ID</label>
            <input
              style={inputStyle}
              name="bankNameOrUpiId"
              value={formData.bankNameOrUpiId}
              onChange={handleChange}
              placeholder="e.g. SBI, HDFC or your@upi"
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Account No</label>
            <input
              style={inputStyle}
              name="accountNo"
              value={formData.accountNo}
              onChange={handleChange}
              placeholder="Enter account number"
            />
          </div>
        </form>

        {/* Buttons */}
        <div style={{ ...buttonGroupStyle, marginTop: 30 }}>
          <button type="button" style={buttonStyle} onClick={handleSave}>
            {isEditMode ? "Update" : "Save"}
          </button>

          <button type="button" style={buttonStyle} onClick={handleAddNew}>
            Clear
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => setShowList(!showList)}
          >
            {showList ? "Hide List" : "View List"}
          </button>

          {isEditMode && (
            <button
              type="button"
              style={{ ...buttonStyle, backgroundColor: "red" }}
              onClick={() => handleDelete(formData.id)}
            >
              Delete Current
            </button>
          )}
        </div>

        {/* View List Modal */}
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
              <input
                type="text"
                placeholder="Search by Bank/UPI or Account No..."
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
                All Payment Modes (S = {filteredPaymentModes.length}) (Total ={" "}
                {allPaymentModes.length})
              </h3>

              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  border: "1px solid #eee",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f0f0f0" }}>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                        Bank Name / UPI ID
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                        Account No
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaymentModes.map((p) => (
                      <tr key={p.id}>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {p.bankNameOrUpiId}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          {p.accountNo}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          <button
                            style={{
                              ...buttonStyle,
                              backgroundColor: "green",
                              marginRight: "5px",
                            }}
                            onClick={() => {
                              handleSelectPaymentMode(p);
                              setShowList(false);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            style={{
                              ...buttonStyle,
                              backgroundColor: "red",
                            }}
                            onClick={() => handleDelete(p.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPaymentModes.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: 10 }}>
                          No matching payment modes found.
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

export default PaymentModeCreation;