import React, { useMemo, useState, useEffect, useCallback } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";


// ── Mappings ─────────────────────────────────────────────────────────
const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  Wholesaler:      "Whole Seller",
  Semi_Wholesaler: "Semi Whole Seller",
  Retailer:        "Retailer",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  UPI:           "UPI",
  BANK_TRANSFER: "Bank Transfer",
  DEBIT_CARD:    "Debit Card",
  CREDIT_CARD:   "Credit Card",
  CREDIT_ORDER:  "Credit",
  ADVANCE_CREDIT:"Advance + Credit",
};

function paymentModeLabel(method: string): string {
  return PAYMENT_METHOD_LABEL[method] ?? "Full Payment";
}

function deriveStatus(order: any): "Paid" | "Partial" | "Credit Pending" {
  if (order.paymentStatus === "PAID")                               return "Paid";
  if (order.paymentMethod === "ADVANCE_CREDIT"
      && order.paymentStatus !== "PAID")                            return "Partial";
  if (order.paymentMethod === "CREDIT_ORDER"
      && order.paymentStatus !== "PAID")                            return "Credit Pending";
  return "Paid";
}

function derivePaidAmount(order: any): number {
  if (order.paymentStatus === "PAID" && order.paymentMethod !== "CREDIT_ORDER")
    return order.totalAmount ?? 0;
  if (order.paymentMethod === "ADVANCE_CREDIT")
    return order.advanceAmount ?? 0;
  return 0;
}

// ── Types ─────────────────────────────────────────────────────────────
interface SaleItem {
  productName: string;
  size:        string;
  qty:         number;
  pricePerPc:  number;
  itemTotal:   number;
}

interface Sale {
  id:            number;
  orderNo:       string;
  orderDate:     string;
  customerName:  string;
  customerType:  string;
  customerPhone: string;
  deliveryAddress: string;
  items:         SaleItem[];
  totalBill:     number;
  subtotal:      number;
  gstAmount:     number;
  paidAmount:    number;
  creditAmount:  number;
  advanceAmount: number;
  paymentMode:   string;
  paymentMethod: string;
  paymentStatus: string;
  status:        "Paid" | "Partial" | "Credit Pending";
  orderStatus:   string;
  createdAt:     string;
}

function mapOrder(o: any): Sale {
  return {
    id:             o.id,
    orderNo:        `ORD-${String(o.id).padStart(4, "0")}`,
    orderDate:      o.createdAt ? o.createdAt.substring(0, 10) : "—",
    customerName:   o.customerName  ?? "Unknown",
    customerType:   CUSTOMER_TYPE_LABEL[o.customerType] ?? o.customerType ?? "—",
    customerPhone:  o.customerPhone ?? "",
    deliveryAddress: o.deliveryAddress ?? "",
    items: (o.items ?? []).map((i: any) => ({
      productName: i.productName,
      size:        i.selectedSize,
      qty:         i.quantity,
      pricePerPc:  i.pricePerPc,
      itemTotal:   i.itemTotal ?? i.quantity * i.pricePerPc,
    })),
    totalBill:     o.totalAmount   ?? 0,
    subtotal:      o.subtotal      ?? 0,
    gstAmount:     o.gstAmount     ?? 0,
    paidAmount:    derivePaidAmount(o),
    creditAmount:  o.creditAmount  ?? 0,
    advanceAmount: o.advanceAmount ?? 0,
    paymentMode:   paymentModeLabel(o.paymentMethod),
    paymentMethod: o.paymentMethod ?? "",
    paymentStatus: o.paymentStatus ?? "",
    status:        deriveStatus(o),
    orderStatus:   o.orderStatus   ?? "PENDING",
    createdAt:     o.createdAt     ?? "",
  };
}

// ── Colours ───────────────────────────────────────────────────────────
const statusColor: Record<string, React.CSSProperties> = {
  Paid:             { background: "#dcfce7", color: "#16a34a" },
  Partial:          { background: "#fef9c3", color: "#ca8a04" },
  "Credit Pending": { background: "#fee2e2", color: "#dc2626" },
};

const typeColor: Record<string, React.CSSProperties> = {
  "Whole Seller":      { background: "#dbeafe", color: "#1d4ed8" },
  "Semi Whole Seller": { background: "#ede9fe", color: "#7c3aed" },
  Retailer:            { background: "#fce7f3", color: "#be185d" },
};

const orderStatusStyle: Record<string, React.CSSProperties> = {
  PENDING:    { background: "#fef9c3", color: "#ca8a04" },
  ACCEPTED:   { background: "#dcfce7", color: "#16a34a" },
  PROCESSING: { background: "#dbeafe", color: "#1d4ed8" },
  SHIPPED:    { background: "#ede9fe", color: "#7c3aed" },
  DELIVERED:  { background: "#d1fae5", color: "#059669" },
  CANCELLED:  { background: "#fee2e2", color: "#dc2626" },
};

// ── Order Detail Modal ────────────────────────────────────────────────
function OrderModal({
  sale, onClose, onAction,
}: {
  sale: Sale;
  onClose: () => void;
  onAction: (id: number, status: string) => Promise<void>;
}) {
  const [acting, setActing] = useState(false);

  const isPending   = sale.orderStatus === "PENDING";
  const isAccepted  = sale.orderStatus === "ACCEPTED";
  const isCancelled = sale.orderStatus === "CANCELLED";
  const isDelivered = sale.orderStatus === "DELIVERED";

  const handleAction = async (status: string) => {
    setActing(true);
    await onAction(sale.id, status);
    setActing(false);
    onClose();
  };

  // Next logical statuses depending on current
  const nextStatuses: { label: string; status: string; color: string }[] = [];
  if (isPending) {
    nextStatuses.push(
      { label: "✅ Accept Order",   status: "ACCEPTED",   color: "#16a34a" },
      { label: "❌ Reject Order",   status: "CANCELLED",  color: "#dc2626" },
    );
  } else if (isAccepted) {
    nextStatuses.push(
      { label: "⚙️ Mark Processing", status: "PROCESSING", color: "#1d4ed8" },
      { label: "❌ Cancel Order",    status: "CANCELLED",  color: "#dc2626" },
    );
  } else if (sale.orderStatus === "PROCESSING") {
    nextStatuses.push(
      { label: "🚚 Mark Shipped",   status: "SHIPPED",    color: "#7c3aed" },
      { label: "❌ Cancel Order",   status: "CANCELLED",  color: "#dc2626" },
    );
  } else if (sale.orderStatus === "SHIPPED") {
    nextStatuses.push(
      { label: "📦 Mark Delivered", status: "DELIVERED",  color: "#059669" },
    );
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              {sale.orderNo}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
              {sale.orderDate}  ·  {sale.paymentMode}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...badgeSm, ...orderStatusStyle[sale.orderStatus] }}>
              {sale.orderStatus}
            </span>
            <button onClick={onClose} style={closeBtn}>✕</button>
          </div>
        </div>

        <div style={modalBody}>

          {/* Customer info */}
          <Section title="👤 Customer">
            <Row label="Name"    value={sale.customerName} />
            <Row label="Phone"   value={sale.customerPhone ? `+91 ${sale.customerPhone}` : "—"} />
            <Row label="Type"    value={sale.customerType} />
            <Row label="Address" value={sale.deliveryAddress || "—"} />
          </Section>

          {/* Items */}
          <Section title="🛍️ Items">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Product", "Size", "Qty (pcs)", "Price/pc", "Amount"].map(h => (
                    <th key={h} style={innerTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={innerTd}>{item.productName}</td>
                    <td style={innerTd}>{item.size}</td>
                    <td style={innerTd}>{item.qty}</td>
                    <td style={innerTd}>₹{item.pricePerPc?.toFixed(2)}</td>
                    <td style={{ ...innerTd, fontWeight: 700 }}>
                      ₹{(item.qty * item.pricePerPc).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Payment breakdown */}
          <Section title="💰 Payment">
            <Row label="Subtotal (before GST)" value={`₹${sale.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            <Row label="GST (18%)"             value={`₹${sale.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            <Row label="Total Bill"            value={`₹${sale.totalBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} bold />
            <Row label="Payment Mode"          value={sale.paymentMode} />
            {sale.advanceAmount > 0 && (
              <Row label="Advance Paid (30%)" value={`₹${sale.advanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            )}
            {sale.creditAmount > 0 && (
              <Row label="Credit Amount"      value={`₹${sale.creditAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} highlight="#dc2626" />
            )}
            <Row label="Payment Status"       value={sale.paymentStatus} />
          </Section>

          {/* Action buttons */}
          {!isCancelled && !isDelivered && nextStatuses.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Actions
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {nextStatuses.map(({ label, status, color }) => (
                  <button
                    key={status}
                    disabled={acting}
                    onClick={() => handleAction(status)}
                    style={{
                      padding: "10px 20px",
                      background: acting ? "#e2e8f0" : color,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: acting ? "not-allowed" : "pointer",
                      opacity: acting ? 0.7 : 1,
                    }}
                  >
                    {acting ? "Updating…" : label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCancelled && (
            <div style={{ marginTop: 16, padding: 12, background: "#fee2e2", borderRadius: 8, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
              ❌ This order has been cancelled.
            </div>
          )}
          {isDelivered && (
            <div style={{ marginTop: 16, padding: 12, background: "#dcfce7", borderRadius: 8, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
              ✅ This order has been delivered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>{title}</div>
      <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, border: "1px solid #e2e8f0" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, bold, highlight }: {
  label: string; value: string; bold?: boolean; highlight?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: highlight ?? "#0f172a" }}>
        {value}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
const ViewSales = () => {
  const [sales, setSales]           = useState<Sale[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selectedSale, setSelectedSale]   = useState<Sale | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/admin/orders`);
      setSales((res.data as any[]).map(mapOrder));
    } catch (e: any) {
      setError("Failed to load orders. " + (e?.message ?? ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Update order status ────────────────────────────────────────
  const updateOrderStatus = useCallback(async (id: number, newStatus: string) => {
    await api.post(`/admin/orders/${id}/status`, { status: newStatus });
    // Update local state immediately
    setSales(prev =>
      prev.map(s => s.id === id ? { ...s, orderStatus: newStatus } : s)
    );
  }, []);

  // ── Filters ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return sales.filter(s =>
      s.customerName.toLowerCase().includes(search.toLowerCase()) &&
      (filterType        ? s.customerType === filterType           : true) &&
      (filterStatus      ? s.status === filterStatus               : true) &&
      (filterOrderStatus ? s.orderStatus === filterOrderStatus     : true) &&
      (filterDate        ? s.orderDate === filterDate              : true)
    );
  }, [sales, search, filterType, filterStatus, filterOrderStatus, filterDate]);

  const pendingCount = sales.filter(s => s.orderStatus === "PENDING").length;
  const totalRevenue = filtered.reduce((sum, s) => sum + s.totalBill,    0);
  const totalPaid    = filtered.reduce((sum, s) => sum + s.paidAmount,   0);
  const totalCredit  = filtered.reduce((sum, s) => sum + s.creditAmount, 0);

  const hasFilter = search || filterType || filterStatus || filterOrderStatus || filterDate;

  return (
    <Dashboard>
      <div style={{ padding: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: 4 }}>
              Sales
              {pendingCount > 0 && (
                <span style={{ marginLeft: 10, background: "#ef4444", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>
                  {pendingCount} pending
                </span>
              )}
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              All customer orders — click any row to view details and take action
            </p>
          </div>
          <button onClick={fetchOrders} disabled={loading} style={refreshBtn}>
            {loading ? "⏳ Loading…" : "🔄 Refresh"}
          </button>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Summary */}
        <div style={summaryRow}>
          {[
            { label: "Total Revenue",    value: `₹${totalRevenue.toLocaleString()}`, color: "#1d4ed8" },
            { label: "Total Paid",       value: `₹${totalPaid.toLocaleString()}`,    color: "#16a34a" },
            { label: "Credit Pending",   value: `₹${totalCredit.toLocaleString()}`,  color: "#dc2626" },
            { label: "Total Orders",     value: `${filtered.length}`,                color: "#7c3aed" },
          ].map(({ label, value, color }) => (
            <div key={label} style={summaryCard}>
              <div style={summaryLabel}>{label}</div>
              <div style={{ ...summaryValue, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={filterRow}>
          <input placeholder="Search customer…" value={search}
            onChange={e => setSearch(e.target.value)} style={inputStyle} />
          <input type="date" value={filterDate}
            onChange={e => setFilterDate(e.target.value)} style={inputStyle} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
            <option value="">All Types</option>
            <option>Whole Seller</option>
            <option>Semi Whole Seller</option>
            <option>Retailer</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
            <option value="">All Payment Status</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Credit Pending</option>
          </select>
          <select value={filterOrderStatus} onChange={e => setFilterOrderStatus(e.target.value)} style={inputStyle}>
            <option value="">All Order Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {hasFilter && (
            <button style={clearBtn} onClick={() => {
              setSearch(""); setFilterType(""); setFilterStatus("");
              setFilterOrderStatus(""); setFilterDate("");
            }}>Clear</button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>⏳ Loading orders…</div>
        ) : (
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr style={theadRow}>
                  {["#","Order No","Date","Customer","Type","Products","Total Bill","Paid","Credit","Payment Mode","Status","Order Status","Action"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={13} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                      No orders found.
                    </td>
                  </tr>
                )}
                {filtered.map((sale, idx) => (
                  <tr
                    key={sale.id}
                    style={{ ...tbodyRow, background: "#fff" }}
                    onClick={() => setSelectedSale(sale)}
                  >
                    <td style={td}>{idx + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: "#2563eb" }}>{sale.orderNo}</td>
                    <td style={td}>{sale.orderDate}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{sale.customerName}</div>
                      {sale.customerPhone && (
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>+91 {sale.customerPhone}</div>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ ...badge, ...(typeColor[sale.customerType] ?? { background: "#f1f5f9", color: "#475569" }) }}>
                        {sale.customerType}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>
                        {sale.items.map(i => i.productName).join(", ")}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>₹{sale.totalBill.toLocaleString()}</td>
                    <td style={{ ...td, color: "#16a34a", fontWeight: 600 }}>₹{sale.paidAmount.toLocaleString()}</td>
                    <td style={{ ...td, color: sale.creditAmount > 0 ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>
                      {sale.creditAmount > 0 ? `₹${sale.creditAmount.toLocaleString()}` : "—"}
                    </td>
                    <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{sale.paymentMode}</td>
                    <td style={td}>
                      <span style={{ ...badge, ...statusColor[sale.status] }}>{sale.status}</span>
                    </td>
                    <td style={td}>
                      <span style={{ ...badge, ...orderStatusStyle[sale.orderStatus] }}>
                        {sale.orderStatus}
                      </span>
                    </td>
                    {/* Action button — stops row click, opens modal */}
                    <td style={td} onClick={e => { e.stopPropagation(); setSelectedSale(sale); }}>
                      {sale.orderStatus === "PENDING" ? (
                        <button style={viewBtn("#2563eb")}>View & Act</button>
                      ) : sale.orderStatus === "CANCELLED" || sale.orderStatus === "DELIVERED" ? (
                        <button style={viewBtn("#64748b")}>View</button>
                      ) : (
                        <button style={viewBtn("#7c3aed")}>Update</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail + action modal */}
      {selectedSale && (
        <OrderModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onAction={updateOrderStatus}
        />
      )}
    </Dashboard>
  );
};

const viewBtn = (color: string): React.CSSProperties => ({
  padding: "5px 12px", background: color, color: "#fff",
  border: "none", borderRadius: 6, fontWeight: 700,
  fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
});

/* ── Styles ── */
const summaryRow: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 16, marginBottom: 24,
};
const summaryCard: React.CSSProperties = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
  padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};
const summaryLabel: React.CSSProperties = {
  fontSize: 12, color: "#94a3b8", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6,
};
const summaryValue: React.CSSProperties = { fontSize: 22, fontWeight: 700 };
const filterRow: React.CSSProperties = {
  display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center",
};
const inputStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, minWidth: 150,
};
const clearBtn: React.CSSProperties = {
  padding: "6px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0",
  borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#64748b",
};
const refreshBtn: React.CSSProperties = {
  padding: "7px 16px", background: "#2563eb", color: "#fff",
  border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
};
const tableWrapper: React.CSSProperties = {
  overflowX: "auto", borderRadius: 8,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0",
};
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13,
};
const theadRow: React.CSSProperties = { background: "#f8fafc", borderBottom: "2px solid #e2e8f0" };
const th: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left", fontWeight: 700,
  fontSize: 12, color: "#64748b", textTransform: "uppercase",
  letterSpacing: "0.5px", whiteSpace: "nowrap",
};
const tbodyRow: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.15s",
};
const td: React.CSSProperties = { padding: "11px 14px", verticalAlign: "middle", whiteSpace: "nowrap" };
const badge: React.CSSProperties = {
  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
};
const badgeSm: React.CSSProperties = {
  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 16, width: "min(640px, 94vw)",
  maxHeight: "90vh", display: "flex", flexDirection: "column",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};
const modalHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  padding: "20px 24px 16px", borderBottom: "1px solid #e5e7eb",
};
const modalBody: React.CSSProperties = {
  overflowY: "auto", flex: 1, padding: "20px 24px",
};
const closeBtn: React.CSSProperties = {
  background: "#f3f4f6", border: "none", borderRadius: "50%",
  width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#374151",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const innerTh: React.CSSProperties = {
  padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b",
};
const innerTd: React.CSSProperties = { padding: "8px 12px", fontSize: 13, color: "#334155" };

export default ViewSales;