import React, { useMemo, useState } from "react";
import Dashboard from "../Dashboard";

interface SaleItem {
  productName: string;
  size: string;
  qty: number;
  pricePerPc: number;
}

interface Sale {
  id: number;
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerType: "Whole Seller" | "Semi Whole Seller" | "Retailer";
  items: SaleItem[];
  totalBill: number;
  paidAmount: number;
  creditAmount: number;
  paymentMode: "Full Payment" | "Credit" | "Advance + Credit";
  status: "Paid" | "Partial" | "Credit Pending";
}

const demoSales: Sale[] = [
  {
    id: 1,
    orderNo: "ORD-2026-001",
    orderDate: "2026-03-01",
    customerName: "Ravi Kumar",
    customerType: "Whole Seller",
    items: [
      { productName: "Plain White Tee", size: "M", qty: 24, pricePerPc: 200 },
      { productName: "Black Hoodie", size: "L", qty: 10, pricePerPc: 500 },
    ],
    totalBill: 9800,
    paidAmount: 9800,
    creditAmount: 0,
    paymentMode: "Full Payment",
    status: "Paid",
  },
  {
    id: 2,
    orderNo: "ORD-2026-002",
    orderDate: "2026-03-02",
    customerName: "Anita Sharma",
    customerType: "Retailer",
    items: [
      { productName: "Plain White Tee", size: "S", qty: 12, pricePerPc: 250 },
    ],
    totalBill: 3000,
    paidAmount: 900,
    creditAmount: 2100,
    paymentMode: "Advance + Credit",
    status: "Partial",
  },
  {
    id: 3,
    orderNo: "ORD-2026-003",
    orderDate: "2026-03-03",
    customerName: "Mehul Patel",
    customerType: "Semi Whole Seller",
    items: [
      { productName: "Black Hoodie", size: "XL", qty: 20, pricePerPc: 550 },
      { productName: "Plain White Tee", size: "L", qty: 36, pricePerPc: 220 },
    ],
    totalBill: 18920,
    paidAmount: 0,
    creditAmount: 18920,
    paymentMode: "Credit",
    status: "Credit Pending",
  },
  {
    id: 4,
    orderNo: "ORD-2026-004",
    orderDate: "2026-03-04",
    customerName: "Sunita Rao",
    customerType: "Retailer",
    items: [
      { productName: "Black Hoodie", size: "M", qty: 6, pricePerPc: 600 },
    ],
    totalBill: 3600,
    paidAmount: 3600,
    creditAmount: 0,
    paymentMode: "Full Payment",
    status: "Paid",
  },
  {
    id: 5,
    orderNo: "ORD-2026-005",
    orderDate: "2026-03-04",
    customerName: "Deepak Joshi",
    customerType: "Whole Seller",
    items: [
      { productName: "Plain White Tee", size: "XL", qty: 48, pricePerPc: 200 },
      { productName: "Black Hoodie", size: "L", qty: 15, pricePerPc: 500 },
    ],
    totalBill: 17100,
    paidAmount: 5130,
    creditAmount: 11970,
    paymentMode: "Advance + Credit",
    status: "Partial",
  },
];

const statusColor: Record<string, React.CSSProperties> = {
  Paid: { background: "#dcfce7", color: "#16a34a" },
  Partial: { background: "#fef9c3", color: "#ca8a04" },
  "Credit Pending": { background: "#fee2e2", color: "#dc2626" },
};

const typeColor: Record<string, React.CSSProperties> = {
  "Whole Seller": { background: "#dbeafe", color: "#1d4ed8" },
  "Semi Whole Seller": { background: "#ede9fe", color: "#7c3aed" },
  Retailer: { background: "#fce7f3", color: "#be185d" },
};

const ViewSales = () => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return demoSales.filter((s) =>
      s.customerName.toLowerCase().includes(search.toLowerCase()) &&
      (filterType ? s.customerType === filterType : true) &&
      (filterStatus ? s.status === filterStatus : true) &&
      (filterDate ? s.orderDate === filterDate : true)
    );
  }, [search, filterType, filterStatus, filterDate]);

  const totalRevenue = filtered.reduce((sum, s) => sum + s.totalBill, 0);
  const totalPaid = filtered.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalCredit = filtered.reduce((sum, s) => sum + s.creditAmount, 0);

  return (
    <Dashboard>
      <div style={{ padding: 20 }}>

        {/* Header */}
        <h2 style={{ marginBottom: 4 }}>Sales</h2>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
          All customer orders and payment details
        </p>

        {/* Summary Cards */}
        <div style={summaryRow}>
          <div style={summaryCard}>
            <div style={summaryLabel}>Total Revenue</div>
            <div style={{ ...summaryValue, color: "#1d4ed8" }}>₹{totalRevenue.toLocaleString()}</div>
          </div>
          <div style={summaryCard}>
            <div style={summaryLabel}>Total Paid</div>
            <div style={{ ...summaryValue, color: "#16a34a" }}>₹{totalPaid.toLocaleString()}</div>
          </div>
          <div style={summaryCard}>
            <div style={summaryLabel}>Total Credit Pending</div>
            <div style={{ ...summaryValue, color: "#dc2626" }}>₹{totalCredit.toLocaleString()}</div>
          </div>
          <div style={summaryCard}>
            <div style={summaryLabel}>Total Orders</div>
            <div style={{ ...summaryValue, color: "#7c3aed" }}>{filtered.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={filterRow}>
          <input
            placeholder="Search customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={inputStyle}
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={inputStyle}>
            <option value="">All Types</option>
            <option>Whole Seller</option>
            <option>Semi Whole Seller</option>
            <option>Retailer</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Credit Pending</option>
          </select>
          {(search || filterType || filterStatus || filterDate) && (
            <button
              style={clearBtn}
              onClick={() => { setSearch(""); setFilterType(""); setFilterStatus(""); setFilterDate(""); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>#</th>
                <th style={th}>Order No</th>
                <th style={th}>Date</th>
                <th style={th}>Customer</th>
                <th style={th}>Type</th>
                <th style={th}>Products</th>
                <th style={th}>Total Bill</th>
                <th style={th}>Paid</th>
                <th style={th}>Credit</th>
                <th style={th}>Payment Mode</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                    No orders found.
                  </td>
                </tr>
              )}
              {filtered.map((sale, idx) => (
                <React.Fragment key={sale.id}>
                  <tr
                    style={{ ...tbodyRow, background: expandedId === sale.id ? "#f8fafc" : "#fff" }}
                    onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                  >
                    <td style={td}>{idx + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: "#2563eb" }}>{sale.orderNo}</td>
                    <td style={td}>{sale.orderDate}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{sale.customerName}</td>
                    <td style={td}>
                      <span style={{ ...badge, ...typeColor[sale.customerType] }}>
                        {sale.customerType}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>
                        {sale.items.map((i) => i.productName).join(", ")}
                      </span>
                      <span style={expandHint}> {expandedId === sale.id ? "▲" : "▼"}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>₹{sale.totalBill.toLocaleString()}</td>
                    <td style={{ ...td, color: "#16a34a", fontWeight: 600 }}>₹{sale.paidAmount.toLocaleString()}</td>
                    <td style={{ ...td, color: sale.creditAmount > 0 ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>
                      {sale.creditAmount > 0 ? `₹${sale.creditAmount.toLocaleString()}` : "—"}
                    </td>
                    <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{sale.paymentMode}</td>
                    <td style={td}>
                      <span style={{ ...badge, ...statusColor[sale.status] }}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded product breakdown */}
                  {expandedId === sale.id && (
                    <tr>
                      <td colSpan={11} style={{ background: "#f1f5f9", padding: "10px 20px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Order Breakdown
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#e2e8f0" }}>
                              <th style={innerTh}>Product</th>
                              <th style={innerTh}>Size</th>
                              <th style={innerTh}>Qty</th>
                              <th style={innerTh}>Price/pc</th>
                              <th style={innerTh}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.items.map((item, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={innerTd}>{item.productName}</td>
                                <td style={innerTd}>{item.size}</td>
                                <td style={innerTd}>{item.qty}</td>
                                <td style={innerTd}>₹{item.pricePerPc}</td>
                                <td style={{ ...innerTd, fontWeight: 700 }}>₹{(item.qty * item.pricePerPc).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </Dashboard>
  );
};

/* ── Styles ── */

const summaryRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const summaryCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "14px 18px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const summaryLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 6,
};

const summaryValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
};

const filterRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 16,
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 13,
  minWidth: 150,
};

const clearBtn: React.CSSProperties = {
  padding: "6px 14px",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  color: "#64748b",
};

const tableWrapper: React.CSSProperties = {
  overflowX: "auto",
  borderRadius: 8,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  fontSize: 13,
};

const theadRow: React.CSSProperties = {
  background: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
};

const th: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 12,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  whiteSpace: "nowrap",
};

const tbodyRow: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  cursor: "pointer",
  transition: "background 0.15s",
};

const td: React.CSSProperties = {
  padding: "11px 14px",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const badge: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const expandHint: React.CSSProperties = {
  fontSize: 10,
  color: "#94a3b8",
  marginLeft: 4,
};

const innerTh: React.CSSProperties = {
  padding: "6px 12px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
};

const innerTd: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 13,
  color: "#334155",
};

export default ViewSales;