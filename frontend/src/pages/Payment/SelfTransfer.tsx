import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

const CASH_VALUE = "CASH";
type AccountValue = string;
type PaymentMode = { id: number; bankNameOrUpiId: string; accountNo: string };
type Transfer = {
  id: number;
  transferDate: string;
  fromPaymentModeId: number | null;
  toPaymentModeId: number | null;
  fromAccountType?: string;
  toAccountType?: string;
  fromAccountName?: string;
  toAccountName?: string;
  amount: number;
  referenceNo?: string;
  narration?: string;
};
const getArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  for (const key of ["data", "content", "paymentModes", "items"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SelfTransfer: React.FC = () => {
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [rows, setRows] = useState<Transfer[]>([]);
  const [date, setDate] = useState(today());
  const [from, setFrom] = useState<AccountValue>("");
  const [to, setTo] = useState<AccountValue>("");
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [m, t] = await Promise.allSettled([
      api.get("/payment/payment-mode"),
      api.get("/self-transfer"),
    ]);
    if (m.status === "fulfilled") {
      const normalized = getArray(m.value.data).map((x: any) => ({
        id: Number(x?.id ?? x?.paymentModeId ?? x?.payment_mode_id),
        bankNameOrUpiId: String(x?.bankNameOrUpiId ?? x?.bank_name_or_upi_id ?? x?.bankName ?? x?.name ?? x?.upiId ?? "").trim(),
        accountNo: String(x?.accountNo ?? x?.account_no ?? x?.accountNumber ?? x?.account_number ?? "").trim(),
      })).filter((x: PaymentMode) => Number.isFinite(x.id) && x.id > 0 && x.bankNameOrUpiId);
      setModes(normalized);
    } else {
      console.error("Failed to load payment modes", m.reason);
      await Swal.fire("Payment Modes Error", "Could not load bank/UPI accounts. Check GET /payment/payment-mode authorization and response.", "error");
    }
    if (t.status === "fulfilled") setRows(getArray(t.value.data));
    else {
      console.error("Failed to load self-transfer history", t.reason);
      setRows([]);
      const status = t.reason?.response?.status;
      await Swal.fire(status === 403 ? "Access Denied (403)" : "Transfer History Error",
        status === 403 ? "Authorize /api/self-transfer in backend security configuration." : "Could not load transfer history.", "warning");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setEditingId(null); setDate(today()); setFrom(""); setTo("");
    setAmount(""); setReferenceNo(""); setNarration("");
  };
  const accountLabel = (value: AccountValue) => {
    if (value === CASH_VALUE) return "Cash";
    const m = modes.find(x => String(x.id) === value);
    return m ? `${m.bankNameOrUpiId} (${m.accountNo})` : `Account #${value}`;
  };
  const modeLabel = (id: number | null | undefined) => id == null ? "Cash" : accountLabel(String(id));

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!from || !to || from === to || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      await Swal.fire("Check details", "Select two different accounts and enter an amount greater than zero.", "warning"); return;
    }
    setLoading(true);
    const payload = {
      transferDate: date,
      fromPaymentModeId: from === CASH_VALUE ? null : Number(from),
      toPaymentModeId: to === CASH_VALUE ? null : Number(to),
      fromAccountType: from === CASH_VALUE ? "CASH" : "BANK",
      toAccountType: to === CASH_VALUE ? "CASH" : "BANK",
      fromAccountName: accountLabel(from), toAccountName: accountLabel(to),
      amount: numericAmount, referenceNo: referenceNo.trim(), narration: narration.trim(),
    };
    try {
      if (editingId != null) {
        await api.put(`/self-transfer/${editingId}`, payload);
        await Swal.fire("Updated", "Self transfer updated successfully.", "success");
      } else {
        await api.post("/self-transfer", payload);
        await Swal.fire("Saved", "Self transfer saved successfully.", "success");
      }
      resetForm(); await load();
    } catch (err: any) {
      await Swal.fire("Error", err?.response?.data?.message || `Could not ${editingId != null ? "update" : "save"} self transfer.`, "error");
    } finally { setLoading(false); }
  };
  const edit = (r: Transfer) => {
    setEditingId(r.id);
    setDate(r.transferDate ? String(r.transferDate).slice(0, 10) : today());
    setFrom(r.fromAccountType === "CASH" || r.fromPaymentModeId == null ? CASH_VALUE : String(r.fromPaymentModeId));
    setTo(r.toAccountType === "CASH" || r.toPaymentModeId == null ? CASH_VALUE : String(r.toPaymentModeId));
    setAmount(String(r.amount ?? "")); setReferenceNo(r.referenceNo ?? ""); setNarration(r.narration ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (r: Transfer) => {
    const result = await Swal.fire({ title: "Delete transfer?", text: "This transfer record will be permanently deleted.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#dc2626" });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/self-transfer/${r.id}`);
      if (editingId === r.id) resetForm();
      await Swal.fire("Deleted", "Transfer record deleted.", "success"); await load();
    } catch (err: any) {
      await Swal.fire("Delete failed", err?.response?.data?.message || "Could not delete transfer.", "error");
    }
  };

  const handlePrint = () => {
    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const printRows = rows.map((r, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(r.transferDate ? String(r.transferDate).slice(0, 10) : "—")}</td>
        <td>${escapeHtml(r.fromAccountName || modeLabel(r.fromPaymentModeId))}</td>
        <td>${escapeHtml(r.toAccountName || modeLabel(r.toPaymentModeId))}</td>
        <td class="amount">${escapeHtml(Number(r.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
        <td>${escapeHtml(r.referenceNo || "—")}</td>
        <td>${escapeHtml(r.narration || "—")}</td>
      </tr>`).join("");

    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) {
      void Swal.fire("Print blocked", "Please allow pop-ups for this site and try again.", "warning");
      return;
    }

    printWindow.document.write(`<!doctype html>
      <html><head><title>Self Transfer Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #172033; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        p { color: #667085; margin-top: 0; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
        th, td { border: 1px solid #d0d5dd; padding: 8px; text-align: left; }
        th { background: #f2f4f7; }
        .amount { text-align: right; white-space: nowrap; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Self Transfer Report</h1>
      <p>Printed on: ${escapeHtml(new Date().toLocaleString("en-IN"))} | Total records: ${rows.length}</p>
      <table><thead><tr><th>S.No.</th><th>Date</th><th>From Account</th><th>To Account</th><th>Amount (₹)</th><th>Reference / UTR</th><th>Narration</th></tr></thead>
      <tbody>${printRows || '<tr><td colspan="7" style="text-align:center">No transfers recorded.</td></tr>'}</tbody></table>
      <script>window.onload = function(){ window.focus(); window.print(); };</script>
      </body></html>`);
    printWindow.document.close();
  };

  return <Dashboard>
    <div style={pageStyle}>
      <style>{`
        .st-input:focus { outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
        .st-row:hover { background: #f8fafc; }
        .st-primary:hover { background: #1d4ed8 !important; transform: translateY(-1px); }
        .st-secondary:hover { filter: brightness(.96); }
        @media (max-width: 640px) {
          .st-page { padding: 14px !important; }
          .st-heading { font-size: 22px !important; }
          .st-form-grid { grid-template-columns: 1fr !important; }
          .st-actions { flex-wrap: wrap; }
        }
      `}</style>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={iconTileStyle}>↔</div>
          <div>
            <h2 className="st-heading" style={titleStyle}>Self Transfer</h2>
            <p style={subtitleStyle}>Move money between your own Cash and bank/UPI accounts.</p>
          </div>
        </div>
        <div style={headerPillStyle}>INTERNAL TRANSFER</div>
      </div>
      <div style={panelStyle}>
        <div style={panelHeadingStyle}>
          <div style={panelIconStyle}>₹</div>
          <div><h3 style={sectionTitleStyle}>{editingId != null ? "Edit Transfer" : "New Transfer"}</h3><p style={panelSubtitleStyle}>Enter the transfer details below.</p></div>
        </div>
      <form onSubmit={save} className="st-form-grid" style={formGridStyle}>
        <label style={labelStyle}>Transfer Date<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="st-input" style={inputStyle} /></label>
        <label style={labelStyle}>From Account<select required value={from} onChange={e => setFrom(e.target.value)} className="st-input" style={inputStyle}><option value="">Select source account</option><option value={CASH_VALUE}>Cash</option>{modes.map(m => <option key={m.id} value={String(m.id)}>{m.bankNameOrUpiId} — {m.accountNo}</option>)}</select></label>
        <label style={labelStyle}>To Account<select required value={to} onChange={e => setTo(e.target.value)} className="st-input" style={inputStyle}><option value="">Select destination account</option><option value={CASH_VALUE} disabled={from === CASH_VALUE}>Cash</option>{modes.map(m => <option key={m.id} value={String(m.id)} disabled={String(m.id) === from}>{m.bankNameOrUpiId} — {m.accountNo}</option>)}</select></label>
        <label style={labelStyle}>Amount (₹)<input required inputMode="decimal" type="text" value={amount} onChange={e => { const value = e.target.value; if (/^\\d*\\.?\\d{0,2}$/.test(value)) setAmount(value); }} placeholder="Enter amount" className="st-input" style={inputStyle} /></label>
        <label style={labelStyle}>Reference / UTR No.<input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="Optional" className="st-input" style={inputStyle} /></label>
        <label style={labelStyle}>Narration<input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Optional notes" className="st-input" style={inputStyle} /></label>
        <div className="st-actions" style={{ display: "flex", gap: 10, alignItems: "end" }}><button className="st-primary" type="submit" disabled={loading} style={buttonStyle}>{loading ? "Please wait..." : editingId != null ? "Update Transfer" : "Save Transfer"}</button>{editingId != null && <button type="button" onClick={resetForm} style={secondaryButtonStyle}>Cancel Edit</button>}</div>
      </form>
      </div>
      <div style={historyPanelStyle}>
      <div style={historyHeaderStyle}><div><h3 style={sectionTitleStyle}>Transfer History</h3><p style={panelSubtitleStyle}>Review, edit, print, or remove previous transfers.</p></div><div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={countStyle}>{rows.length} record{rows.length === 1 ? "" : "s"}</span><button type="button" onClick={handlePrint} style={printButtonStyle}>Print Report</button></div></div>
      <div style={tableWrapStyle}><table style={tableStyle}><thead><tr>{["Date", "From Account", "To Account", "Amount", "Reference", "Narration", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr className="st-row" key={r.id}><td style={tdStyle}>{r.transferDate ? String(r.transferDate).slice(0, 10) : "—"}</td><td style={tdStyle}>{r.fromAccountName || modeLabel(r.fromPaymentModeId)}</td><td style={tdStyle}>{r.toAccountName || modeLabel(r.toPaymentModeId)}</td><td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>{Number(r.amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td><td style={tdStyle}>{r.referenceNo || "—"}</td><td style={tdStyle}>{r.narration || "—"}</td><td style={{ ...tdStyle, whiteSpace: "nowrap" }}><button type="button" style={editButtonStyle} onClick={() => edit(r)}>Edit</button> <button type="button" style={deleteButtonStyle} onClick={() => void remove(r)}>Delete</button></td></tr>)}
          {rows.length === 0 && <tr><td style={emptyStyle} colSpan={7}>No transfers recorded yet.</td></tr>}</tbody></table></div>
      </div>
    </div>
  </Dashboard>;
};
const pageStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "28px clamp(14px, 3vw, 36px)", background: "#f3f6fb", minHeight: "calc(100vh - 40px)", fontFamily: "Inter, Arial, sans-serif", color: "#172033" };
const headerStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, padding: "24px 26px", borderRadius: 16, background: "linear-gradient(120deg, #102a56 0%, #1d4ed8 62%, #3b82f6 100%)", color: "#fff", boxShadow: "0 10px 25px rgba(30,64,175,.16)" };
const iconTileStyle: React.CSSProperties = { width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)", fontSize: 30, fontWeight: 500 };
const titleStyle: React.CSSProperties = { margin: "0 0 7px", fontSize: 28, lineHeight: 1.2, fontWeight: 750, color: "#fff", letterSpacing: "-.5px" };
const subtitleStyle: React.CSSProperties = { margin: 0, color: "rgba(255,255,255,.82)", fontSize: 14, lineHeight: 1.5 };
const headerPillStyle: React.CSSProperties = { padding: "7px 11px", borderRadius: 999, border: "1px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "1.2px", whiteSpace: "nowrap" };
const panelStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e5eaf2", borderRadius: 15, padding: "22px 24px 24px", marginBottom: 24, boxShadow: "0 4px 18px rgba(15,23,42,.035)" };
const panelHeadingStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid #edf0f5" };
const panelIconStyle: React.CSSProperties = { width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 11, background: "#eff6ff", color: "#2563eb", fontSize: 20, fontWeight: 800 };
const panelSubtitleStyle: React.CSSProperties = { margin: "4px 0 0", color: "#7b8495", fontSize: 12 };
const formGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px 18px", alignItems: "end", marginBottom: 0 };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, color: "#39445a", fontSize: 13, fontWeight: 650 };
const inputStyle: React.CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "11px 12px", border: "1px solid #d7deea", borderRadius: 9, background: "#fff", color: "#182235", fontSize: 14, height: 43, transition: "border-color .15s, box-shadow .15s" };
const buttonStyle: React.CSSProperties = { minHeight: 43, padding: "11px 22px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 10px rgba(37,99,235,.18)", transition: "all .15s" };
const secondaryButtonStyle: React.CSSProperties = { ...buttonStyle, background: "#eef2f7", color: "#374151", boxShadow: "none" };
const printButtonStyle: React.CSSProperties = { padding: "9px 14px", border: "1px solid #bfdbfe", borderRadius: 8, color: "#1d4ed8", background: "#eff6ff", cursor: "pointer", fontSize: 12, fontWeight: 750 };
const editButtonStyle: React.CSSProperties = { padding: "7px 11px", border: "1px solid #bbf7d0", borderRadius: 7, color: "#166534", background: "#f0fdf4", cursor: "pointer", fontSize: 12, fontWeight: 700 };
const deleteButtonStyle: React.CSSProperties = { padding: "7px 11px", border: "1px solid #fecaca", borderRadius: 7, color: "#b91c1c", background: "#fef2f2", cursor: "pointer", fontSize: 12, fontWeight: 700 };
const historyPanelStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e5eaf2", borderRadius: 15, padding: "22px 24px 24px", boxShadow: "0 4px 18px rgba(15,23,42,.035)" };
const historyHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 750, color: "#182235" };
const countStyle: React.CSSProperties = { color: "#1d4ed8", background: "#eff6ff", border: "1px solid #dbeafe", padding: "7px 11px", borderRadius: 999, fontSize: 12, fontWeight: 750, whiteSpace: "nowrap" };
const tableWrapStyle: React.CSSProperties = { width: "100%", overflowX: "auto", border: "1px solid #e6ebf3", borderRadius: 10 };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "13px 14px", borderBottom: "1px solid #e1e7f0", background: "#f7f9fc", color: "#566176", fontWeight: 750, whiteSpace: "nowrap", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px" };
const tdStyle: React.CSSProperties = { padding: "13px 14px", borderBottom: "1px solid #edf0f5", color: "#344054", verticalAlign: "middle" };
const emptyStyle: React.CSSProperties = { ...tdStyle, textAlign: "center", padding: 32, color: "#7b8495" };
export default SelfTransfer;
