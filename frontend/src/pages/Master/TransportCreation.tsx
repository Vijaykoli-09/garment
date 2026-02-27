import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";

interface Transport {
  serialNumber: string;
  transportName: string;
  // transportCode: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNo: string;
  remarks: string;
}

// Initial empty state for a new transport
const initialFormState: Transport = {
  serialNumber: "",
  transportName: "",
  // transportCode: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstNo: "",
  remarks: "",
};

const TransportCreation: React.FC = () => {
  const [formData, setFormData] = useState<Transport>(initialFormState);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [showListModal, setShowListModal] = useState(false);

  const [searchParams] = useSearchParams();
  const editSerialNumber = searchParams.get("serialNumber");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTransports();

    // Ensure clean state on load unless deep-linking for edit
    if (!editSerialNumber) {
      setFormData(initialFormState);
    }
  }, [editSerialNumber]);

  const fetchTransports = async () => {
    try {
      const response = await api.get<Transport[]>("/transports");
      setTransports(response.data);
    } catch {
      // Handle error
    }
  };

  //🧑‍🏫✅Auto Generate serialNo
  useEffect(() => {
    const prefix = "TC";
    const year = new Date().getFullYear();
    const unique = Date.now().toString().slice(-3); // last 5 digits of timestamp
    const serial = `${prefix}${year}${unique}`;
    // setSerialNumber(serial);
    setFormData((prev) => ({ ...prev, serialNumber: serial }));
  }, []);

  // const generateSerialNumber = () => {
  //   // Logic to create a unique ID (T + Current Year + last 5 digits of timestamp)
  //   const prefix = "T";
  //   const year = new Date().getFullYear();
  //   // Using a random number instead of timestamp for better uniqueness if generated multiple times in the same millisecond
  //   const unique = Math.floor(10000 + Math.random() * 90000).toString();
  //   const serial = `${prefix}${year}${unique}`;

  //   setFormData((prev) => ({ ...prev, serialNumber: serial }));
  // };

  //🧑‍🏫✅Transport Search
  const filteredTransports = useMemo(() => {
    if (!searchQuery) {
      return transports; // Return the full list if the search query is empty
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    return transports.filter(
      (transport) =>
        // Check if the query matches any relevant field (e.g., name, code)
        transport.transportName.toLowerCase().includes(lowerCaseQuery) ||
        // transport.transportCode.toLowerCase().includes(lowerCaseQuery) ||
        transport.city.toLowerCase().includes(lowerCaseQuery)
      // transport.serialNumber.toLowerCase().includes(lowerCaseQuery)
    );
  }, [transports, searchQuery]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isEditMode = useMemo(() => {
    return (
      formData.serialNumber &&
      transports.some((t) => t.serialNumber === formData.serialNumber)
    );
  }, [formData.serialNumber, transports]);

  const handleSave = async () => {
    if (!formData.transportName || formData.transportName.trim() === "") {
      return Swal.fire(
        "Validation Error",
        "Transport Name is required",
        "warning"
      );
    }

    // if (!isEditMode && (!formData.serialNumber || !formData.transportCode)) {

    // CRITICAL: Require SerialNumber/TransportCode for new entry
    if (!isEditMode && !formData.serialNumber) {
      return Swal.fire(
        "Validation Error",
        "Serial Number and Transport Code are required for a new entry.",
        "warning"
      );
    }

    try {
      const serialNumber = formData.serialNumber;

      if (isEditMode) {
        // Update Logic (PUT request uses serialNumber in the path)
        const response = await api.put(`/transports/${serialNumber}`, formData);

        // Update list by finding and replacing the transport using serialNumber
        setTransports((prev) =>
          prev.map((t) => (t.serialNumber === serialNumber ? response.data : t))
        );
        Swal.fire("Updated!", "Transport updated successfully", "success");
      } else {
        // Create Logic (POST request)
        const response = await api.post("/transports", formData);
        setTransports((prev) => [...prev, response.data]);
        Swal.fire("Added!", "Transport created successfully", "success");
      }

      // Clear form state to switch back to "Save" mode
      setFormData(initialFormState);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        "Failed to save transport. Serial number or code may already exist.";
      Swal.fire("Error", errorMessage, "error");
    }
  };

  const handleCancelEdit = () => {
    // Reset to the clean state
    setFormData(initialFormState);
  };

  const handleEdit = (t: Transport) => {
    // Set the full transport object for editing
    setFormData(t);
    setShowListModal(false);
  };

  const handleDelete = async (t: Transport) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "You want to delete this transport?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed && t.serialNumber) {
      try {
        await api.delete(`/transports/${t.serialNumber}`);

        // Filter out the deleted transport using serialNumber
        setTransports((prev) =>
          prev.filter((tr) => tr.serialNumber !== t.serialNumber)
        );
        Swal.fire("Deleted!", "Transport deleted successfully", "success");

        // Clear form if the deleted transport was being edited
        if (formData.serialNumber === t.serialNumber)
          setFormData(initialFormState);
      } catch (err: any) {
        Swal.fire(
          "Error",
          err.response?.data?.message || "Failed to delete transport",
          "error"
        );
      }
    }
  };

  // ---- Styles ----
  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
    margin: "20px auto",
    padding: 20,
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };
  const titleStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: 20,
  };

  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 15,
    alignItems: "center",
    marginBottom: 10,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: "bold",
    marginBottom: 5,
    flexBasis: "150px",
  };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    border: "1px solid #ccc",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "none",
    height: 50,
  };
  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    fontWeight: "bold",
    backgroundColor: "#007bff",
    color: "white",
  };
  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
  };
  //🧑‍🏫✅Style for scroll bar
  const tableWrapperStyle: React.CSSProperties = {
    maxHeight: "400px", // Set a fixed height for the scrollable area
    overflowY: "auto", // Enable vertical scrollbar when content exceeds height
    border: "1px solid #eee", // Optional: visually separate the scrollable area
    margin: "10px 0",
  };

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Transport Creation</h2>

        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial Number</label>
            <input
              name="serialNumber"
              value={formData.serialNumber || ""}
              onChange={handleChange}
              style={inputStyle}
              // style={{ ...inputStyle, maxWidth: '400px' }}
              disabled={!!isEditMode} // prevent changing in edit mode
              title={
                isEditMode
                  ? "Serial Number cannot be changed during edit."
                  : undefined
              }
            />

            {/* 🧑‍🏫 New Generate ID Button */}
            {/* {!isEditMode && (
             <button 
                type="button" 
                onClick={generateSerialNumber}
             style={{ ...buttonStyle, backgroundColor: '#28a745', marginLeft: 'auto', flexGrow: 0 }}
             >
               Generate ID
              </button>
            )} */}
          </div>

          {/* <div style={formRowStyle}>
            <label style={labelStyle}>Transport Code</label>
            <input name="transportCode" value={formData.transportCode || ""} onChange={handleChange} style={inputStyle} />
          </div> */}

          <div style={formRowStyle}>
            <label style={labelStyle}>Transport Name</label>
            <input
              name="transportName"
              value={formData.transportName || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Mobile</label>
            <input
              name="mobile"
              value={formData.mobile || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Email</label>
            <input
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Gst No</label>
            <input
              name="gstNo"
              value={formData.gstNo || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>City</label>
            <input
              name="city"
              value={formData.city || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>State</label>
            <input
              name="state"
              value={formData.state || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Pincode</label>
            <input
              name="pincode"
              value={formData.pincode || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              name="address"
              value={formData.address || ""}
              onChange={handleChange}
              style={textareaStyle}
            ></textarea>
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Remarks</label>
            <input
              name="remarks"
              value={formData.remarks || ""}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={buttonGroupStyle}>
            <button type="button" style={buttonStyle} onClick={handleSave}>
              {isEditMode ? "Update" : "Save"}
            </button>

            {isEditMode && (
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: "#6c757d" }}
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              style={buttonStyle}
              onClick={() => setShowListModal(true)}
            >
              Transport List
            </button>
          </div>
        </form>

        {/* Transport List Modal */}
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
                width: "95%",
                maxHeight: "80%",
                overflowY: "auto",
              }}
            >
              {/* 🧑‍🏫✅Search */}
              <input
                type="text"
                placeholder="Search by Name, Code, City, or Serial No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  marginBottom: 15,
                  padding: "8px 10px",
                }}
              />

              <h3>
                All Transports (S = {filteredTransports.length}) (Total ={" "}
                {transports.length})
              </h3>
              <div style={tableWrapperStyle}>
                {" "}
                {/* 🧑‍🏫SCROll bar start */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Serial No
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Name
                      </th>
                      {/* <th style={{ border: "1px solid #ccc", padding: 8 }}>Code</th> */}
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        City
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Mobile
                      </th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* {transports.map(t => ( */}
                    {filteredTransports.map((t) => (
                      <tr key={t.serialNumber}>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {t.serialNumber}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {t.transportName}
                        </td>
                        {/* <td style={{ border: "1px solid #ccc", padding: 8 }}>{t.transportCode}</td> */}
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {t.city}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {t.mobile}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ccc",
                            padding: 8,
                            display: "flex",
                            gap: 5,
                          }}
                        >
                          {/* Edit Button */}
                          <button
                            style={{
                              ...buttonStyle,
                              fontSize: "12px",
                              padding: "4px 8px",
                              backgroundColor: "orange",
                              color: "white",
                            }}
                            onClick={() => handleEdit(t)}
                          >
                            Edit
                          </button>

                          {/* Delete Button */}
                          <button
                            style={{
                              ...buttonStyle,
                              fontSize: "12px",
                              padding: "4px 8px",
                              backgroundColor: "red",
                              color: "white",
                            }}
                            onClick={() => handleDelete(t)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 🧑‍🏫🔚Scroll End */}
              <div style={{ textAlign: "right", marginTop: 10 }}>
                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: "red",
                    color: "white",
                  }}
                  onClick={() => setShowListModal(false)}
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

export default TransportCreation;
