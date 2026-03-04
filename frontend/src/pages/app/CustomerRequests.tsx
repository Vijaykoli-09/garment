import React, { useMemo, useState } from "react";
import Dashboard from "../Dashboard";

interface Customer {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  customerType: "Whole Seller" | "Semi Whole Seller" | "Retailer";
  deliveryAddress: string;
  gstNo: string;
  brokerName: string;
  brokerPhone: string;
  createdDate: string;
  status: "Pending" | "Approved" | "Rejected";

  creditEnabled?: boolean;
  creditLimit?: number;
  advanceOption?: boolean;
}

const CustomerRequests = () => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [advanceOption, setAdvanceOption] = useState(false);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 1,
      fullName: "Ravi Kumar",
      email: "ravi@gmail.com",
      phone: "9876543210",
      customerType: "Whole Seller",
      deliveryAddress: "Chennai",
      gstNo: "33ABCDE1234F1Z5",
      brokerName: "Suresh",
      brokerPhone: "9123456789",
      createdDate: "2026-03-01",
      status: "Pending",
    },
    {
      id: 2,
      fullName: "Anita Sharma",
      email: "anita@gmail.com",
      phone: "9876501234",
      customerType: "Retailer",
      deliveryAddress: "Mumbai",
      gstNo: "27ABCDE1234F1Z5",
      brokerName: "Ramesh",
      brokerPhone: "9988776655",
      createdDate: "2026-03-03",
      status: "Approved",
      creditEnabled: true,
      creditLimit: 500000,
      advanceOption: true,
    },
  ]);

  // 🔎 Filtering
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      return (
        cust.fullName.toLowerCase().includes(search.toLowerCase()) &&
        (selectedType ? cust.customerType === selectedType : true) &&
        (selectedDate ? cust.createdDate === selectedDate : true) &&
        (selectedStatus ? cust.status === selectedStatus : true)
      );
    });
  }, [customers, search, selectedType, selectedDate, selectedStatus]);

  // Open modal
  const handleApproveClick = (id: number) => {
    setSelectedCustomerId(id);
    setShowModal(true);
  };

  // Reject
  const handleReject = (id: number) => {
    setCustomers((prev) =>
      prev.map((cust) =>
        cust.id === id ? { ...cust, status: "Rejected" } : cust
      )
    );
  };

  // Save Approval
  const handleSaveApproval = () => {
    if (selectedCustomerId === null) return;

    // 🔥 VALIDATION
    if (creditEnabled && (!creditLimit || Number(creditLimit) <= 0)) {
      setError("Credit limit is required and must be greater than 0.");
      return;
    }

    setCustomers((prev) =>
      prev.map((cust) =>
        cust.id === selectedCustomerId
          ? {
              ...cust,
              status: "Approved",
              creditEnabled,
              creditLimit: creditEnabled ? Number(creditLimit) : undefined,
              advanceOption,
            }
          : cust
      )
    );

    // Reset
    setShowModal(false);
    setCreditEnabled(false);
    setCreditLimit("");
    setAdvanceOption(false);
    setError("");
  };

  return (
    <Dashboard>
      <div style={{ padding: "20px" }}>
        <h2>Customer Requests</h2>

        {/* Filters */}
        <div style={filterContainer}>
          <input
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={inputStyle}
          />

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Types</option>
            <option value="Whole Seller">Whole Seller</option>
            <option value="Semi Whole Seller">Semi Whole Seller</option>
            <option value="Retailer">Retailer</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Cards */}
        <div style={cardContainer}>
          {filteredCustomers.map((cust) => (
            <div key={cust.id} style={cardStyle}>
              <h3>{cust.fullName}</h3>
              <p>Email: {cust.email}</p>
              <p>Phone: {cust.phone}</p>
              <p>Type: {cust.customerType}</p>
              <p>Address: {cust.deliveryAddress}</p>
              <p>GST: {cust.gstNo}</p>
              <p>Broker: {cust.brokerName} ({cust.brokerPhone})</p>
              <p>Date: {cust.createdDate}</p>
              <p>Status: <strong>{cust.status}</strong></p>

              {/* Payment Details */}
              {cust.status === "Approved" && (
                <div style={paymentBox}>
                  <p><strong>Credit Enabled:</strong> {cust.creditEnabled ? "Yes" : "No"}</p>
                  {cust.creditEnabled && (
                    <>
                      <p><strong>Credit Limit:</strong> ₹{cust.creditLimit}</p>
                      <p>
                        <strong>30% Advance / 70% Credit:</strong>{" "}
                        {cust.advanceOption ? "Enabled" : "Disabled"}
                      </p>
                    </>
                  )}
                </div>
              )}

              {cust.status === "Pending" && (
                <div style={{ marginTop: "10px" }}>
                  <button style={approveBtn} onClick={() => handleApproveClick(cust.id)}>
                    Approve
                  </button>

                  <button style={rejectBtn} onClick={() => handleReject(cust.id)}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div style={modalOverlay}>
            <div style={modalStyle}>
              <h3>Payment Configuration</h3>

              <label>
                <input
                  type="checkbox"
                  checked={creditEnabled}
                  onChange={() => setCreditEnabled(!creditEnabled)}
                />
                Enable Credit Buy
              </label>

              {creditEnabled && (
                <>
                  <input
                    type="number"
                    placeholder="Enter Credit Limit"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    style={{ marginTop: "10px", width: "100%", padding: "6px" }}
                  />
                  {error && <p style={{ color: "red" }}>{error}</p>}
                </>
              )}

              <div style={{ marginTop: "10px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={advanceOption}
                    onChange={() => setAdvanceOption(!advanceOption)}
                  />
                  Enable 30% Advance & 70% Credit
                </label>
              </div>

              <div style={{ marginTop: "15px", textAlign: "right" }}>
                <button onClick={() => setShowModal(false)}>Cancel</button>
                <button style={approveBtn} onClick={handleSaveApproval}>
                  Save & Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

/* Styles */

const filterContainer: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const inputStyle: React.CSSProperties = {
  padding: "6px",
  minWidth: "160px",
};

const cardContainer: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: "20px",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: "15px",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const paymentBox: React.CSSProperties = {
  background: "#f1f5f9",
  padding: "8px",
  borderRadius: "6px",
  marginTop: "8px",
};

const approveBtn: React.CSSProperties = {
  marginLeft: "10px",
  padding: "6px 12px",
  backgroundColor: "green",
  color: "white",
  border: "none",
};

const rejectBtn: React.CSSProperties = {
  marginLeft: "10px",
  padding: "6px 12px",
  backgroundColor: "red",
  color: "white",
  border: "none",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  padding: "20px",
  borderRadius: "8px",
  width: "350px",
};

export default CustomerRequests;