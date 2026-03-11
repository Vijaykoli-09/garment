import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

type OpeningBalanceType = "CR" | "DR";

interface PaymentModeFormData {
  id?: number;
  bankNameOrUpiId: string;
  accountNo: string;
  openingBalance: string; // UI string
  openingBalanceType: OpeningBalanceType; // radio
}

const PaymentModeCreation: React.FC = () => {
  const initialFormData: PaymentModeFormData = {
    bankNameOrUpiId: "",
    accountNo: "",
    openingBalance: "",
    openingBalanceType: "CR",
  };

  const [formData, setFormData] = useState<PaymentModeFormData>(initialFormData);
  const [allPaymentModes, setAllPaymentModes] = useState<PaymentModeFormData[]>(
    [],
  );
  const [filteredPaymentModes, setFilteredPaymentModes] = useState<
    PaymentModeFormData[]
  >([]);
  const [showList, setShowList] = useState(false);

  const pick = <T,>(obj: any, keys: string[], fallback: T): T => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null) return v as T;
    }
    return fallback;
  };

  const normalizeOpeningType = (x: any): OpeningBalanceType => {
    const v = String(x ?? "").trim().toUpperCase();
    if (v === "DR" || v === "DEBIT" || v === "D") return "DR";
    return "CR";
  };

  const mapFromServer = (pm: any): PaymentModeFormData => {
    const openingBal = pick<any>(
      pm,
      ["openingBalance", "opening_balance", "openingBalanceAmount", "balance"],
      "",
    );

    const openingType = pick<any>(
      pm,
      ["openingBalanceType", "opening_balance_type", "crDr", "type"],
      "CR",
    );

    return {
      id: pm?.id,
      bankNameOrUpiId: pm?.bankNameOrUpiId ?? pm?.bank_name_or_upi_id ?? "",
      accountNo: pm?.accountNo ?? pm?.account_no ?? "",
      openingBalance:
        openingBal === "" ? "" : openingBal === 0 ? "0" : String(openingBal),
      openingBalanceType: normalizeOpeningType(openingType),
    };
  };

  const loadAllPaymentModes = useCallback(async () => {
  try {
    const res = await api.get("/payment/payment-mode");
    const raw = Array.isArray(res.data) ? res.data : [];
    const mapped = raw.map(mapFromServer);
    setAllPaymentModes(mapped);
    setFilteredPaymentModes(mapped);
  } catch (err) {
    console.error("Failed to load payment mode:", err);
    Swal.fire("Error", "Failed to load payment modes.", "error");
  }
}, []); // Empty dependency array since it doesn't depend on any props or state

useEffect(() => {
  loadAllPaymentModes();
}, [loadAllPaymentModes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => {
      if (type === "radio" && name === "openingBalanceType") {
        return { ...prev, openingBalanceType: value as OpeningBalanceType };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleAddNew = () => setFormData(initialFormData);

  const isEditMode = useMemo(() => !!formData.id, [formData.id]);

  const handleSave = async () => {
    if (!formData.bankNameOrUpiId.trim() || !formData.accountNo.trim()) {
      return Swal.fire(
        "Validation Error",
        "Please fill Bank Name / UPI ID and Account No",
        "warning",
      );
    }

    const payload: any = {
      bankNameOrUpiId: formData.bankNameOrUpiId,
      accountNo: formData.accountNo,
      openingBalance:
        formData.openingBalance.trim() === ""
          ? 0
          : Number(formData.openingBalance),
      openingBalanceType: formData.openingBalanceType,
    };

    try {
      if (formData.id) {
        await api.put(`/payment/payment-mode/${formData.id}`, payload);
        Swal.fire("Updated!", "Payment mode updated successfully", "success");
      } else {
        await api.post("/payment/payment-mode", payload);
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
        "error",
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
    Swal.fire("Selected!", "Payment mode loaded for editing", "info");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();

    const filtered = allPaymentModes.filter((p) => {
      const a = (p.bankNameOrUpiId || "").toLowerCase();
      const b = (p.accountNo || "").toLowerCase();
      const c = (p.openingBalance || "").toLowerCase();
      const d = (p.openingBalanceType || "").toLowerCase();
      return a.includes(term) || b.includes(term) || c.includes(term) || d.includes(term);
    });

    setFilteredPaymentModes(filtered);
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
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

        <form onSubmit={(e) => e.preventDefault()}>
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

          <div style={formRowStyle}>
            <label style={labelStyle}>Opening Balance</label>

            <input
              style={inputStyle}
              type="number"
              name="openingBalance"
              value={formData.openingBalance}
              onChange={handleChange}
              placeholder="Enter opening balance"
            />

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="openingBalanceType"
                  value="CR"
                  checked={formData.openingBalanceType === "CR"}
                  onChange={handleChange}
                />
                Cr
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="openingBalanceType"
                  value="DR"
                  checked={formData.openingBalanceType === "DR"}
                  onChange={handleChange}
                />
                Dr
              </label>
            </div>
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
                maxWidth: 1000,
                maxHeight: "80%",
                overflowY: "auto",
              }}
            >
              <input
                type="text"
                placeholder="Search by Bank/UPI / Account / Opening Balance / Type..."
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
                        Opening Balance
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                        Type
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
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                          {p.openingBalance === "" ? "-" : p.openingBalance}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                          {p.openingBalanceType || "-"}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                          <button
                            type="button"
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
                            type="button"
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
                        <td colSpan={5} style={{ textAlign: "center", padding: 10 }}>
                          No matching payment modes found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
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