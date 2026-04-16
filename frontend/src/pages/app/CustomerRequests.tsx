import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

interface Customer {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  customerType: string;
  deliveryAddress: string;
  gstNo: string;
  brokerName: string;
  brokerPhone: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  creditEnabled?: boolean;
  creditLimit?: number;
  advanceOption?: boolean;
  partyId?: number | null;   // null until admin links a party
}

interface Party {
  id: number;
  serialNumber: string;
  partyName: string;
  mobileNo: string;
}

type ModalMode = "approve" | "edit";

const CustomerRequests = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("approve");
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // form fields inside modal
  const [formStatus, setFormStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [advanceOption, setAdvanceOption] = useState(false);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  // link party state
  const [linkingCustomerId, setLinkingCustomerId] = useState<number | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    fetchCustomers();
    fetchParties();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/customers");
      setCustomers(res.data);
    } catch {
      setPageError("Failed to load customers. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const res = await api.get("/party/all");
      setParties(res.data);
    } catch {
      // non-critical — link party UI just won't show party list
    }
  };

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const dateStr = c.createdAt?.split("T")[0] ?? "";
      return (
        c.fullName.toLowerCase().includes(search.toLowerCase()) &&
        (selectedType ? c.customerType === selectedType : true) &&
        (selectedDate ? dateStr === selectedDate : true) &&
        (selectedStatus ? c.status === selectedStatus : true)
      );
    });
  }, [customers, search, selectedType, selectedDate, selectedStatus]);

  // ── Open approve modal (for PENDING customers) ──────────────────
  const openApproveModal = (customer: Customer) => {
    setActiveCustomer(customer);
    setModalMode("approve");
    setFormStatus("APPROVED");
    setCreditEnabled(false);
    setCreditLimit("");
    setAdvanceOption(false);
    setModalError("");
    setModalOpen(true);
  };

  // ── Open edit modal (for already APPROVED / REJECTED customers) ─
  const openEditModal = (customer: Customer) => {
    setActiveCustomer(customer);
    setModalMode("edit");
    setFormStatus(customer.status === "REJECTED" ? "REJECTED" : "APPROVED");
    setCreditEnabled(customer.creditEnabled ?? false);
    setCreditLimit(customer.creditLimit?.toString() ?? "0");
    setAdvanceOption(customer.advanceOption ?? false);
    setModalError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveCustomer(null);
  };

  // ── Validate ────────────────────────────────────────────────────
  const validate = () => {
    if (formStatus === "APPROVED" && creditEnabled) {
      if (!creditLimit || Number(creditLimit) <= 0) {
        setModalError("Credit limit must be greater than 0 when credit is enabled.");
        return false;
      }
    }
    return true;
  };

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!activeCustomer || !validate()) return;
    setSaving(true);
    setModalError("");

    try {
      if (modalMode === "approve") {
        await api.post(`/admin/customers/${activeCustomer.id}/approve`, {
          creditEnabled,
          creditLimit: creditEnabled ? Number(creditLimit) : 0,
          advanceOption,
        });
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === activeCustomer.id
              ? { ...c, status: "APPROVED", creditEnabled, creditLimit: creditEnabled ? Number(creditLimit) : 0, advanceOption }
              : c
          )
        );
      } else {
        await api.post(`/admin/customers/${activeCustomer.id}/update`, {
          status: formStatus,
          creditEnabled: formStatus === "APPROVED" ? creditEnabled : false,
          creditLimit: formStatus === "APPROVED" && creditEnabled ? Number(creditLimit) : 0,
          advanceOption: formStatus === "APPROVED" ? advanceOption : false,
        });
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === activeCustomer.id
              ? {
                  ...c,
                  status: formStatus,
                  creditEnabled: formStatus === "APPROVED" ? creditEnabled : false,
                  creditLimit: formStatus === "APPROVED" && creditEnabled ? Number(creditLimit) : 0,
                  advanceOption: formStatus === "APPROVED" ? advanceOption : false,
                }
              : c
          )
        );
      }
      closeModal();
    } catch {
      setModalError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Quick reject from card (pending only) ───────────────────────
  const handleQuickReject = async (customer: Customer) => {
    if (!window.confirm(`Reject ${customer.fullName}?`)) return;
    try {
      await api.post(`/admin/customers/${customer.id}/reject`);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: "REJECTED" } : c))
      );
    } catch {
      alert("Failed to reject. Please try again.");
    }
  };

  // ── Link Party ──────────────────────────────────────────────────
  const openLinkParty = (customerId: number) => {
    setLinkingCustomerId(customerId);
    setSelectedPartyId("");
    setLinkError("");
  };

  const closeLinkParty = () => {
    setLinkingCustomerId(null);
    setSelectedPartyId("");
    setLinkError("");
  };

  const handleLinkParty = async (customerId: number) => {
    if (!selectedPartyId) {
      setLinkError("Please select a party.");
      return;
    }
    setLinkSaving(true);
    setLinkError("");
    try {
      await api.put(`/customer/auth/admin/customers/${customerId}/link-party`, null, {
        params: { partyId: selectedPartyId },
      });
      // Update local state so UI reflects the new partyId immediately
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, partyId: Number(selectedPartyId) } : c
        )
      );
      closeLinkParty();
    } catch {
      setLinkError("Failed to link party. Please try again.");
    } finally {
      setLinkSaving(false);
    }
  };

  if (loading) {
    return (
      <Dashboard>
        <div style={loadingWrap}>
          <div style={spinner} />
          <p style={{ color: "#64748b", marginTop: 12 }}>Loading customers...</p>
        </div>
      </Dashboard>
    );
  }

  const counts = {
    all: customers.length,
    pending: customers.filter((c) => c.status === "PENDING").length,
    approved: customers.filter((c) => c.status === "APPROVED").length,
    rejected: customers.filter((c) => c.status === "REJECTED").length,
  };

  return (
    <Dashboard>
      <div style={page}>

        {/* ── Page Header ── */}
        <div style={pageHeader}>
          <div>
            <h2 style={pageTitle}>Customer Requests</h2>
            <p style={pageSubtitle}>Manage customer approvals and payment configuration</p>
          </div>
          <button style={refreshBtn} onClick={fetchCustomers}>↻ Refresh</button>
        </div>

        {pageError && <div style={errorBanner}>{pageError}</div>}

        {/* ── Summary Chips ── */}
        <div style={chipRow}>
          {[
            { label: "All", value: counts.all, color: "#6366f1" },
            { label: "Pending", value: counts.pending, color: "#f59e0b" },
            { label: "Approved", value: counts.approved, color: "#10b981" },
            { label: "Rejected", value: counts.rejected, color: "#ef4444" },
          ].map((chip) => (
            <div key={chip.label} style={summaryChip(chip.color)}>
              <span style={chipNum(chip.color)}>{chip.value}</span>
              <span style={chipLabel}>{chip.label}</span>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={filterRow}>
          <input
            placeholder="🔍 Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={filterInput}
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={filterInput}
          />
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={filterInput}>
            <option value="">All Types</option>
            <option value="Wholesaler">Wholesaler</option>
            <option value="Semi_Wholesaler">Semi Wholesaler</option>
            <option value="Retailer">Retailer</option>
          </select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={filterInput}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {(search || selectedType || selectedDate || selectedStatus) && (
            <button style={clearBtn}
              onClick={() => { setSearch(""); setSelectedType(""); setSelectedDate(""); setSelectedStatus(""); }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── Cards ── */}
        {filtered.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48 }}>📭</div>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>No customers found.</p>
          </div>
        ) : (
          <div style={cardGrid}>
            {filtered.map((cust) => (
              <div key={cust.id} style={card}>

                {/* Card top: name + status badge */}
                <div style={cardTop}>
                  <div style={avatar}>{cust.fullName.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={cardName}>{cust.fullName}</div>
                    <div style={cardType}>{cust.customerType?.replace("_", " ")}</div>
                  </div>
                  <span style={statusBadgeStyle(cust.status)}>{cust.status}</span>
                </div>

                <div style={divider} />

                {/* Details */}
                <div style={detailGrid}>
                  <Detail label="📧" value={cust.email} />
                  <Detail label="📱" value={cust.phone} />
                  <Detail label="📍" value={cust.deliveryAddress} />
                  {cust.gstNo && <Detail label="🏢 GST" value={cust.gstNo} />}
                  {cust.brokerName && <Detail label="🤝 Broker" value={`${cust.brokerName} ${cust.brokerPhone ? `(${cust.brokerPhone})` : ""}`} />}
                  <Detail label="📅" value={cust.createdAt?.split("T")[0]} />
                </div>

                {/* Payment info (approved only) */}
                {cust.status === "APPROVED" && (
                  <div style={paymentInfo}>
                    <div style={paymentRow}>
                      <span style={payLabel}>Credit</span>
                      <span style={payVal(cust.creditEnabled ? "#10b981" : "#94a3b8")}>
                        {cust.creditEnabled ? "✓ Enabled" : "✗ Disabled"}
                      </span>
                    </div>
                    {cust.creditEnabled && (
                      <>
                        <div style={paymentRow}>
                          <span style={payLabel}>Limit</span>
                          <span style={payVal("#2563eb")}>₹{cust.creditLimit?.toLocaleString()}</span>
                        </div>
                        <div style={paymentRow}>
                          <span style={payLabel}>30% Advance</span>
                          <span style={payVal(cust.advanceOption ? "#10b981" : "#94a3b8")}>
                            {cust.advanceOption ? "✓ Enabled" : "✗ Disabled"}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Party Link Info */}
                    <div style={{ ...paymentRow, marginTop: 6, paddingTop: 6, borderTop: "1px solid #e2e8f0" }}>
                      <span style={payLabel}>🏷️ Party</span>
                      {cust.partyId ? (
                        <span style={payVal("#10b981")}>✓ Linked (#{cust.partyId})</span>
                      ) : (
                        <span style={payVal("#f59e0b")}>⚠ Not linked</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Link Party inline panel (approved + no party yet) */}
                {cust.status === "APPROVED" && linkingCustomerId === cust.id && (
                  <div style={linkPartyPanel}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                      🔗 Link Party to Customer
                    </div>
                    <select
                      value={selectedPartyId}
                      onChange={(e) => { setSelectedPartyId(e.target.value); setLinkError(""); }}
                      style={{ ...filterInput, width: "100%", marginBottom: 8 }}
                    >
                      <option value="">-- Select Party --</option>
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.partyName} ({p.serialNumber}) {p.mobileNo ? `· ${p.mobileNo}` : ""}
                        </option>
                      ))}
                    </select>
                    {linkError && <p style={errText}>{linkError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{ ...btnApprove, fontSize: 12, padding: "7px 0" }}
                        onClick={() => handleLinkParty(cust.id)}
                        disabled={linkSaving}
                      >
                        {linkSaving ? "Linking..." : "✓ Confirm Link"}
                      </button>
                      <button
                        style={{ ...btnEdit, fontSize: 12, padding: "7px 0" }}
                        onClick={closeLinkParty}
                        disabled={linkSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={cardActions}>
                  {cust.status === "PENDING" && (
                    <>
                      <button style={btnApprove} onClick={() => openApproveModal(cust)}>
                        ✓ Approve
                      </button>
                      <button style={btnReject} onClick={() => handleQuickReject(cust)}>
                        ✗ Reject
                      </button>
                    </>
                  )}
                  {(cust.status === "APPROVED" || cust.status === "REJECTED") && (
                    <button style={btnEdit} onClick={() => openEditModal(cust)}>
                      ✎ Edit
                    </button>
                  )}
                  {/* Show Link Party button for approved customers */}
                  {cust.status === "APPROVED" && (
                    <button
                      style={cust.partyId ? btnLinked : btnLinkParty}
                      onClick={() => {
                        if (linkingCustomerId === cust.id) {
                          closeLinkParty();
                        } else {
                          openLinkParty(cust.id);
                        }
                      }}
                    >
                      {cust.partyId
                        ? "🔗 Relink Party"
                        : linkingCustomerId === cust.id
                        ? "✕ Cancel"
                        : "🔗 Link Party"}
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            MODAL — Approve (new) or Edit (existing)
        ══════════════════════════════════════════════ */}
        {modalOpen && activeCustomer && (
          <div style={overlay} onClick={closeModal}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>

              {/* Modal Header */}
              <div style={modalHeader}>
                <div>
                  <div style={modalTitle}>
                    {modalMode === "approve" ? "Approve Customer" : "Edit Customer"}
                  </div>
                  <div style={modalSubtitle}>{activeCustomer.fullName}</div>
                </div>
                <button style={closeBtn} onClick={closeModal}>✕</button>
              </div>

              {/* Status Toggle (edit mode only) */}
              {modalMode === "edit" && (
                <div style={section}>
                  <div style={sectionLabel}>Account Status</div>
                  <div style={toggleRow}>
                    {(["APPROVED", "REJECTED"] as const).map((s) => (
                      <button
                        key={s}
                        style={statusToggleBtn(formStatus === s, s)}
                        onClick={() => {
                          setFormStatus(s);
                          setModalError("");
                          if (s === "REJECTED") {
                            setCreditEnabled(false);
                            setCreditLimit("0");
                            setAdvanceOption(false);
                          }
                        }}
                      >
                        {s === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Config (only when status is APPROVED) */}
              {formStatus === "APPROVED" && (
                <>
                  {/* Credit Enable Toggle */}
                  <div style={section}>
                    <div style={sectionLabel}>Credit Settings</div>
                    <label style={checkRow}>
                      <div
                        style={toggle(creditEnabled)}
                        onClick={() => {
                          setCreditEnabled(!creditEnabled);
                          if (creditEnabled) { setCreditLimit("0"); setAdvanceOption(false); }
                          setModalError("");
                        }}
                      >
                        <div style={toggleThumb(creditEnabled)} />
                      </div>
                      <span style={checkLabel}>Enable Credit Buy</span>
                    </label>
                  </div>

                  {/* Credit Limit */}
                  {creditEnabled && (
                    <div style={section}>
                      <div style={sectionLabel}>Credit Limit (₹)</div>

                      <div style={presetRow}>
                        {[50000, 100000, 250000, 500000, 1000000].map((amt) => (
                          <button
                            key={amt}
                            style={presetBtn(Number(creditLimit) === amt)}
                            onClick={() => setCreditLimit(amt.toString())}
                          >
                            ₹{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}K`}
                          </button>
                        ))}
                      </div>

                      <div style={amountRow}>
                        <button
                          style={amtBtn}
                          onClick={() => setCreditLimit((prev) => Math.max(0, Number(prev) - 10000).toString())}
                        >
                          −
                        </button>
                        <div style={amountInputWrap}>
                          <span style={rupeeSign}>₹</span>
                          <input
                            type="number"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            style={amountInput}
                            min={0}
                            step={10000}
                          />
                        </div>
                        <button
                          style={amtBtn}
                          onClick={() => setCreditLimit((prev) => (Number(prev) + 10000).toString())}
                        >
                          +
                        </button>
                      </div>

                      {modalError && <p style={errText}>{modalError}</p>}

                      {/* Advance Option */}
                      <div style={{ marginTop: 16 }}>
                        <label style={checkRow}>
                          <div
                            style={toggle(advanceOption)}
                            onClick={() => setAdvanceOption(!advanceOption)}
                          >
                            <div style={toggleThumb(advanceOption)} />
                          </div>
                          <div>
                            <span style={checkLabel}>30% Advance + 70% Credit</span>
                            <div style={checkDesc}>Customer pays 30% upfront, rest on credit</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Non-credit modal error */}
              {modalError && !creditEnabled && <p style={{ ...errText, marginTop: 0, marginBottom: 12 }}>{modalError}</p>}

              {/* Modal Footer */}
              <div style={modalFooter}>
                <button style={cancelBtn} onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button style={saveBtn(formStatus)} onClick={handleSave} disabled={saving}>
                  {saving
                    ? "Saving..."
                    : modalMode === "approve"
                    ? "✓ Approve & Save"
                    : "✓ Save Changes"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Dashboard>
  );
};

/* ── Small helper component ── */
const Detail = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4 }}>
    <span style={{ fontSize: 12, minWidth: 16 }}>{label}</span>
    <span style={{ fontSize: 12, color: "#374151", wordBreak: "break-all" }}>{value || "—"}</span>
  </div>
);

/* ══════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════ */

const page: React.CSSProperties = { padding: 24, minHeight: "100vh", background: "#f8fafc" };

const pageHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20,
};
const pageTitle: React.CSSProperties = { margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" };
const pageSubtitle: React.CSSProperties = { margin: "4px 0 0", fontSize: 13, color: "#64748b" };
const refreshBtn: React.CSSProperties = {
  padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0",
  borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600,
};

const errorBanner: React.CSSProperties = {
  background: "#fee2e2", color: "#dc2626", padding: "10px 14px",
  borderRadius: 8, marginBottom: 16, fontSize: 13,
};

const chipRow: React.CSSProperties = { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" };
const summaryChip = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, background: "#fff",
  border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`,
  borderRadius: 8, padding: "10px 16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
});
const chipNum = (color: string): React.CSSProperties => ({
  fontSize: 20, fontWeight: 800, color,
});
const chipLabel: React.CSSProperties = { fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px" };

const filterRow: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" };
const filterInput: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: 13, minWidth: 150, background: "#fff", color: "#374151",
};
const clearBtn: React.CSSProperties = {
  padding: "8px 14px", background: "#fef2f2", border: "1px solid #fecaca",
  borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#dc2626", fontWeight: 600,
};

const cardGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16,
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 16,
  border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};
const cardTop: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 };
const avatar: React.CSSProperties = {
  width: 40, height: 40, borderRadius: "50%", background: "#e0e7ff",
  color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, fontWeight: 800, flexShrink: 0,
};
const cardName: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#0f172a" };
const cardType: React.CSSProperties = { fontSize: 11, color: "#64748b", marginTop: 2 };
const divider: React.CSSProperties = { height: 1, background: "#f1f5f9", margin: "8px 0 10px" };
const detailGrid: React.CSSProperties = { marginBottom: 10 };

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const map: Record<string, React.CSSProperties> = {
    PENDING: { background: "#fef9c3", color: "#b45309", border: "1px solid #fde68a" },
    APPROVED: { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
    REJECTED: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" },
  };
  return {
    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
    whiteSpace: "nowrap", ...(map[status] ?? {}),
  };
};

const paymentInfo: React.CSSProperties = {
  background: "#f8fafc", borderRadius: 8, padding: "10px 12px",
  border: "1px solid #e2e8f0", marginBottom: 12,
};
const paymentRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: 4 };
const payLabel: React.CSSProperties = { fontSize: 12, color: "#64748b" };
const payVal = (color: string): React.CSSProperties => ({ fontSize: 12, fontWeight: 700, color });

const cardActions: React.CSSProperties = { display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" };
const btnApprove: React.CSSProperties = {
  flex: 1, padding: "8px", background: "#10b981", color: "#fff",
  border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
};
const btnReject: React.CSSProperties = {
  flex: 1, padding: "8px", background: "#ef4444", color: "#fff",
  border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
};
const btnEdit: React.CSSProperties = {
  flex: 1, padding: "8px", background: "#f1f5f9", color: "#475569",
  border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
};
const btnLinkParty: React.CSSProperties = {
  flex: 1, padding: "8px", background: "#eff6ff", color: "#2563eb",
  border: "1px solid #bfdbfe", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
};
const btnLinked: React.CSSProperties = {
  flex: 1, padding: "8px", background: "#f0fdf4", color: "#15803d",
  border: "1px solid #bbf7d0", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
};
const linkPartyPanel: React.CSSProperties = {
  background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
  padding: "12px", marginBottom: 10,
};

/* Modal */
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 14, width: 440, maxWidth: "95vw",
  maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};
const modalHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  padding: "20px 20px 14px", borderBottom: "1px solid #f1f5f9",
};
const modalTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "#0f172a" };
const modalSubtitle: React.CSSProperties = { fontSize: 13, color: "#64748b", marginTop: 2 };
const closeBtn: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer",
  color: "#94a3b8", lineHeight: 1, padding: 4,
};
const section: React.CSSProperties = { padding: "14px 20px", borderBottom: "1px solid #f1f5f9" };
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 };

const toggleRow: React.CSSProperties = { display: "flex", gap: 8 };
const statusToggleBtn = (active: boolean, status: string): React.CSSProperties => {
  const colors = status === "APPROVED"
    ? { bg: "#dcfce7", activeBg: "#10b981", color: "#15803d", activeColor: "#fff", border: "#bbf7d0" }
    : { bg: "#fee2e2", activeBg: "#ef4444", color: "#b91c1c", activeColor: "#fff", border: "#fecaca" };
  return {
    flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
    background: active ? colors.activeBg : colors.bg,
    color: active ? colors.activeColor : colors.color,
    border: `1px solid ${colors.border}`,
    transition: "all 0.15s",
  };
};

const toggle = (on: boolean): React.CSSProperties => ({
  width: 44, height: 24, borderRadius: 12, cursor: "pointer", flexShrink: 0,
  background: on ? "#10b981" : "#e2e8f0", position: "relative", transition: "background 0.2s",
});
const toggleThumb = (on: boolean): React.CSSProperties => ({
  position: "absolute", top: 2, left: on ? 22 : 2,
  width: 20, height: 20, borderRadius: "50%", background: "#fff",
  boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s",
});

const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" };
const checkLabel: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "#1e293b" };
const checkDesc: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 2 };

const presetRow: React.CSSProperties = { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" };
const presetBtn = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 600,
  background: active ? "#2563eb" : "#f1f5f9",
  color: active ? "#fff" : "#475569",
  border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
});

const amountRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const amtBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0",
  background: "#f8fafc", cursor: "pointer", fontSize: 20, fontWeight: 700,
  color: "#374151", display: "flex", alignItems: "center", justifyContent: "center",
};
const amountInputWrap: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", border: "1.5px solid #e2e8f0",
  borderRadius: 8, overflow: "hidden", background: "#fff",
};
const rupeeSign: React.CSSProperties = {
  padding: "0 10px", fontSize: 15, color: "#64748b", fontWeight: 600,
  borderRight: "1px solid #e2e8f0", background: "#f8fafc",
};
const amountInput: React.CSSProperties = {
  flex: 1, padding: "9px 10px", border: "none", outline: "none",
  fontSize: 15, fontWeight: 700, color: "#0f172a",
};

const errText: React.CSSProperties = { color: "#dc2626", fontSize: 12, marginTop: 8, marginBottom: 0 };

const modalFooter: React.CSSProperties = {
  padding: "16px 20px", display: "flex", gap: 10, justifyContent: "flex-end",
};
const cancelBtn: React.CSSProperties = {
  padding: "10px 20px", background: "#f1f5f9", color: "#475569",
  border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
};
const saveBtn = (status: string): React.CSSProperties => ({
  padding: "10px 20px", color: "#fff", border: "none", borderRadius: 8,
  cursor: "pointer", fontWeight: 700, fontSize: 13,
  background: status === "APPROVED" ? "#10b981" : "#ef4444",
});

const loadingWrap: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300 };
const spinner: React.CSSProperties = {
  width: 36, height: 36, border: "3px solid #e2e8f0",
  borderTop: "3px solid #6366f1", borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const emptyState: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", padding: 60, color: "#94a3b8",
};

export default CustomerRequests;