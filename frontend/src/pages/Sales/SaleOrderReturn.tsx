"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";
import Dashboard from "../Dashboard";

/* ============== Types ============== */
interface Party {
  id?: number;
  partyName: string;
  station?: string;
  agent?: { agentName?: string };
  transport?: { transportName?: string };
}

interface ReturnRow {
  id: number;
  selected: boolean;
  dispatchChallanId?: number | null;
  dispatchChallanNo?: string;
  barCode: string;
  artNo: string;
  description: string;
  lotNumber: string;
  size: string;
  shade: string;
  box: string;
  pcsPerBox: string;
  pcs: string;          // Remaining dispatch pcs (after deducting returns)
  originalPcs: string;  // Original dispatch pcs
  rate: string;
  amt: string;
  returnQty: string;    // **Fully manual/editable**
  reason: string;       // **Manual**
}

/* ============== Component ============== */
const SaleOrderReturn: React.FC = () => {
  // Header
  const [returnNo, setReturnNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyName, setPartyName] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [transportName, setTransportName] = useState("");
  const [remarks1, setRemarks1] = useState("");
  const [remarks2, setRemarks2] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  // Right side totals
  const [totalAmt, setTotalAmt] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [tax, setTax] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [cartage, setCartage] = useState("");
  const [netAmt, setNetAmt] = useState("");

  // Rows
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Masters
  const [partyList, setPartyList] = useState<Party[]>([]);
  const [savedReturns, setSavedReturns] = useState<any[]>([]);

  // Modals
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partySearch, setPartySearch] = useState("");

  const [showReturnListModal, setShowReturnListModal] = useState(false);
  const [returnList, setReturnList] = useState<any[]>([]);
  const [returnListSearch, setReturnListSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  /* ============== Filtered Lists ============== */
  const filteredParties = useMemo(() => {
    const s = partySearch.toLowerCase();
    return partyList.filter(
      (p) =>
        (p.partyName || "").toLowerCase().includes(s) ||
        (p.station || "").toLowerCase().includes(s)
    );
  }, [partyList, partySearch]);

  const filteredReturnList = useMemo(() => {
    const s = returnListSearch.toLowerCase();
    return returnList.filter(
      (r) =>
        (r.returnNo || "").toLowerCase().includes(s) ||
        (r.partyName || "").toLowerCase().includes(s) ||
        (r.date || "").toLowerCase().includes(s)
    );
  }, [returnList, returnListSearch]);

  /* ============== Selected Rows Count ============== */
  const selectedCount = useMemo(() => {
    return rows.filter((r) => r.selected).length;
  }, [rows]);

  const selectedPcs = useMemo(() => {
    return rows.filter((r) => r.selected).reduce((sum, r) => sum + (parseFloat(r.returnQty) || 0), 0);
  }, [rows]);

  /* ============== Init Load ============== */
  useEffect(() => {
    const init = async () => {
      try {
        // Load next voucher no
        try {
          const { data } = await api.get<string>("/sale-order-returns/next-no");
          if (data) setReturnNo(data);
        } catch {}

        // Load parties
        const partiesRes = await api.get<Party[]>("/party/all");
        setPartyList(Array.isArray(partiesRes.data) ? partiesRes.data : []);

        // Load saved returns
        await loadSavedReturns();
      } catch (e) {
        console.error(e);
        Swal.fire("Error", "Failed to load masters", "error");
      }
    };
    init();
  }, []);

  /* ============== Load Saved Returns ============== */
  const loadSavedReturns = async () => {
    try {
      const { data } = await api.get("/sale-order-returns");
      const returns = Array.isArray(data) ? data : [];
      setSavedReturns(returns);
      return returns;
    } catch (e) {
      console.error("Failed to load saved returns:", e);
      return [];
    }
  };

  /* ============== Auto-fill broker & transport on party change ============== */
  useEffect(() => {
    const selectedParty = partyList.find((p) => p.partyName === partyName);
    if (selectedParty) {
      const broker = selectedParty.agent?.agentName || "";
      setBrokerName(broker);
      setTransportName(selectedParty.transport?.transportName || "");
    } else {
      setBrokerName("");
      setTransportName("");
    }
  }, [partyName, partyList]);

  /* ============== Calculate Consumed Return Qty ============== */
  const getConsumedReturnQty = useCallback(
    (challanId: number, barCode: string, artNo: string, shade: string): number => {
      let consumed = 0;
      savedReturns.forEach((returnRecord) => {
        (returnRecord.rows || []).forEach((row: any) => {
          if (
            row.dispatchChallanId === challanId &&
            row.barCode === barCode &&
            row.artNo === artNo &&
            row.shade === shade
          ) {
            consumed += parseFloat(row.returnQty) || 0;
          }
        });
      });
      return consumed;
    },
    [savedReturns]
  );

  /* ============== Fetch Dispatch Challans for Party ============== */
  const fetchDispatchChallansForParty = async (party: string) => {
    try {
      const { data } = await api.get("/dispatch-challan");
      const challans = Array.isArray(data) ? data : [];
      const partyChallans = challans.filter(
        (ch: any) => (ch.partyName || "").toLowerCase() === party.toLowerCase()
      );
      return partyChallans;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  /* ============== Map Dispatch Challans to Return Rows ============== */
  const mapDispatchChallansToRows = (challans: any[]): ReturnRow[] => {
    const rows: ReturnRow[] = [];

    challans.forEach((challan) => {
      const challanId = challan.id;
      const challanNo = challan.challanNo || challan.serialNo || "";

      const challanRows = Array.isArray(challan.rows) ? challan.rows : [];

      challanRows.forEach((row: any, idx: number) => {
        const originalPcs = parseFloat(row.pcs) || 0;
        const consumedQty = getConsumedReturnQty(
          challanId,
          row.barCode || "",
          row.artNo || "",
          row.shade || ""
        );
        const remainingPcs = Math.max(0, originalPcs - consumedQty);

        // Only add rows with remaining pieces
        if (remainingPcs > 0) {
          rows.push({
            id: Date.now() + idx + Math.random(),
            selected: false,
            dispatchChallanId: challanId,
            dispatchChallanNo: challanNo,
            barCode: row.barCode || "",
            artNo: row.artNo || "",
            description: row.description || "",
            lotNumber: row.lotNumber || "",
            size: row.size || "",
            shade: row.shade || "",
            box: row.box !== null && row.box !== undefined ? String(row.box) : "",
            pcsPerBox:
              row.pcsPerBox !== null && row.pcsPerBox !== undefined
                ? String(row.pcsPerBox)
                : "",
            pcs: String(remainingPcs),
            originalPcs: String(originalPcs),
            rate: String(row.rate || "0"),
            amt: "0.00",
            returnQty: "0",
            reason: "",
          });
        }
      });
    });

    return rows;
  };

  /* ============== Select Party & Auto-fill ============== */
  const selectParty = async (p: Party) => {
    setPartyName(p.partyName);
    setShowPartyModal(false);

    const hasRows = rows.some((r) => (r.artNo || "").trim() !== "");
    if (hasRows) {
      const res = await Swal.fire({
        title: "Auto-fill Dispatch Challans?",
        text: "Current rows will be replaced with dispatch challan data for this party.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, auto-fill",
      });
      if (!res.isConfirmed) return;
    }

    try {
      // Reload saved returns first
      await loadSavedReturns();

      const challans = await fetchDispatchChallansForParty(p.partyName);

      if (!challans.length) {
        setRows([]);
        Swal.fire("Info", "No dispatch challans found for this party.", "info");
        return;
      }

      const mappedRows = mapDispatchChallansToRows(challans);
      setRows(mappedRows);

      if (mappedRows.length > 0) {
        Swal.fire(
          "Success",
          `Loaded ${mappedRows.length} items with remaining pieces for party: ${p.partyName}`,
          "success"
        );
      } else {
        Swal.fire({
          icon: "info",
          title: "No Remaining Items",
          text: "All dispatch challan items have been fully returned.",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load dispatch challans", "error");
    }
  };

  /* ============== Row Management ============== */
  const addMainRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        selected: false,
        dispatchChallanId: null,
        dispatchChallanNo: "",
        barCode: "",
        artNo: "",
        description: "",
        lotNumber: "",
        size: "",
        shade: "",
        box: "",
        pcsPerBox: "",
        pcs: "0",
        originalPcs: "0",
        rate: "0",
        amt: "0",
        returnQty: "0",
        reason: "",
      },
    ]);
  }, []);

  const deleteMainRow = useCallback(() => {
    setRows((prev) => prev.filter((r) => !r.selected));
    setSelectAll(false);
  }, []);

  /* ============== Selection Handlers ============== */
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleRowSelect = (id: number, checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: checked } : r))
    );
  };

  useEffect(() => {
    if (rows.length === 0) {
      setSelectAll(false);
    } else {
      setSelectAll(rows.every((r) => r.selected));
    }
  }, [rows]);

  /* ============== Row Change Handlers ============== */
  const handleChange = (id: number, field: keyof ReturnRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        let updated: ReturnRow = { ...r, [field]: value };

        if (field === "returnQty") {
          const returnQty = parseFloat(value) || 0;
          const availablePcs = parseFloat(updated.pcs) || 0;

          if (returnQty < 0) {
            Swal.fire("Error", "Return quantity cannot be negative", "error");
            updated.returnQty = "0";
          } else if (returnQty > availablePcs) {
            Swal.fire(
              "Error",
              `Return quantity cannot exceed available pieces (${availablePcs})`,
              "error"
            );
            updated.returnQty = String(availablePcs);
          }

          const rate = parseFloat(updated.rate) || 0;
          const finalReturnQty = parseFloat(updated.returnQty) || 0;
          updated.amt = String(finalReturnQty * rate);
        } else if (field === "rate") {
          const returnQty = parseFloat(updated.returnQty) || 0;
          const rate = parseFloat(value) || 0;
          updated.amt = String(returnQty * rate);
        }

        return updated;
      })
    );
  };

  /* ============== Total Calculations ============== */
  useEffect(() => {
    const total = rows.reduce((sum, row) => {
      const returnQty = parseFloat(row.returnQty) || 0;
      const rate = parseFloat(row.rate) || 0;
      return sum + returnQty * rate;
    }, 0);
    setTotalAmt(total ? String(total.toFixed(2)) : "0.00");
  }, [rows]);

  const handleDiscountPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDiscountPercent(val);
    const t = parseFloat(totalAmt);
    const p = parseFloat(val);
    if (!isNaN(t) && !isNaN(p)) {
      const amt = (t * p) / 100;
      setDiscount(amt ? String(amt.toFixed(2)) : "0.00");
    }
  };

  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDiscount(val);
    const t = parseFloat(totalAmt);
    const a = parseFloat(val);
    if (!isNaN(t) && t !== 0 && !isNaN(a)) {
      const pct = (a / t) * 100;
      setDiscountPercent(pct ? String(pct.toFixed(2)) : "0.00");
    }
  };

  const handleTaxPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTaxPercent(val);
    const t = parseFloat(totalAmt);
    const p = parseFloat(val);
    if (!isNaN(t) && !isNaN(p)) {
      const amt = (t * p) / 100;
      setTax(amt ? String(amt.toFixed(2)) : "0.00");
    }
  };

  const handleTaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTax(val);
    const t = parseFloat(totalAmt);
    const a = parseFloat(val);
    if (!isNaN(t) && t !== 0 && !isNaN(a)) {
      const pct = (a / t) * 100;
      setTaxPercent(pct ? String(pct.toFixed(2)) : "0.00");
    }
  };

  useEffect(() => {
    const t = parseFloat(totalAmt) || 0;
    const d = parseFloat(discount) || 0;
    const tx = parseFloat(tax) || 0;
    const c = parseFloat(cartage) || 0;
    const net = t - d + tx + c;
    setNetAmt(net ? String(net.toFixed(2)) : "0.00");
  }, [totalAmt, discount, tax, cartage]);

  /* ============== Save / Update / Delete ============== */
  const handleSave = async () => {
    if (!date || !returnNo || !partyName) {
      Swal.fire("Error", "Please fill Date, Return No and Party Name", "error");
      return;
    }

    const hasReturnData = rows.some((r) => parseFloat(r.returnQty) > 0);
    if (!hasReturnData) {
      Swal.fire("Error", "Please enter at least one return quantity", "error");
      return;
    }

    const payload = {
      returnNo,
      date,
      partyName,
      brokerName,
      transportName,
      receivedBy,
      remarks1,
      remarks2,
      totalAmt: parseFloat(totalAmt) || 0,
      discount: parseFloat(discount) || 0,
      discountPercent: parseFloat(discountPercent) || 0,
      tax: parseFloat(tax) || 0,
      taxPercent: parseFloat(taxPercent) || 0,
      cartage: parseFloat(cartage) || 0,
      netAmt: parseFloat(netAmt) || 0,
      rows: rows
        .filter((r) => parseFloat(r.returnQty) > 0)
        .map((r) => ({
          dispatchChallanId: r.dispatchChallanId,
          dispatchChallanNo: r.dispatchChallanNo,
          barCode: r.barCode,
          artNo: r.artNo,
          description: r.description,
          lotNumber: r.lotNumber,
          size: r.size,
          shade: r.shade,
          box: parseFloat(r.box) || 0,
          pcsPerBox: parseFloat(r.pcsPerBox) || 0,
          pcs: parseFloat(r.pcs) || 0,
          originalPcs: parseFloat(r.originalPcs) || 0,
          rate: parseFloat(r.rate) || 0,
          amt: parseFloat(r.amt) || 0,
          returnQty: parseFloat(r.returnQty) || 0,
          reason: r.reason,
        })),
    };

    try {
      if (editingId) {
        await api.put(`/sale-order-returns/${editingId}`, payload);
        Swal.fire("Success", "Return updated successfully!", "success");
      } else {
        await api.post("/sale-order-returns", payload);
        Swal.fire("Success", "Return saved successfully!", "success");
      }

      await loadSavedReturns();
      handleAddNew(false);
    } catch (error: any) {
      console.error("Error saving return:", error);
      Swal.fire("Error", error?.response?.data?.message || "Failed to save return", "error");
    }
  };

  const handleAddNew = (showToast = false) => {
    setReturnNo("");
    setDate(new Date().toISOString().split("T")[0]);
    setPartyName("");
    setBrokerName("");
    setTransportName("");
    setRemarks1("");
    setRemarks2("");
    setReceivedBy("");
    setTotalAmt("0.00");
    setDiscount("0.00");
    setDiscountPercent("0.00");
    setTax("0.00");
    setTaxPercent("0.00");
    setCartage("0.00");
    setNetAmt("0.00");
    setRows([]);
    setEditingId(null);
    setSelectAll(false);

    if (showToast) {
      Swal.fire("Cleared", "Ready for new return entry", "success");
    }

    (async () => {
      try {
        const { data } = await api.get<string>("/sale-order-returns/next-no");
        if (data) setReturnNo(data);
      } catch {}
    })();
  };

  /* ============== Return List Operations ============== */
  const openReturnList = async () => {
    try {
      const { data } = await api.get("/sale-order-returns");
      setReturnList(Array.isArray(data) ? data : []);
      setShowReturnListModal(true);
    } catch {
      setReturnList([]);
      setShowReturnListModal(true);
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const { data } = await api.get(`/sale-order-returns/${id}`);

      setReturnNo(data.returnNo || "");
      setDate(data.date || new Date().toISOString().split("T")[0]);
      setPartyName(data.partyName || "");
      setBrokerName(data.brokerName || "");
      setTransportName(data.transportName || "");
      setRemarks1(data.remarks1 || "");
      setRemarks2(data.remarks2 || "");
      setReceivedBy(data.receivedBy || "");
      setTotalAmt(String(data.totalAmt || "0.00"));
      setDiscount(String(data.discount || "0.00"));
      setDiscountPercent(String(data.discountPercent || "0.00"));
      setTax(String(data.tax || "0.00"));
      setTaxPercent(String(data.taxPercent || "0.00"));
      setCartage(String(data.cartage || "0.00"));
      setNetAmt(String(data.netAmt || "0.00"));

      const mappedRows: ReturnRow[] = Array.isArray(data.rows)
        ? data.rows.map((r: any, idx: number) => ({
            id: Date.now() + idx,
            selected: false,
            dispatchChallanId: r.dispatchChallanId || null,
            dispatchChallanNo: r.dispatchChallanNo || "",
            barCode: r.barCode || "",
            artNo: r.artNo || "",
            description: r.description || "",
            lotNumber: r.lotNumber || "",
            size: r.size || "",
            shade: r.shade || "",
            box: String(r.box || ""),
            pcsPerBox: String(r.pcsPerBox || ""),
            pcs: String(r.pcs || "0"),
            originalPcs: String(r.originalPcs || r.pcs || "0"),
            rate: String(r.rate || "0"),
            amt: String(r.amt || "0"),
            returnQty: String(r.returnQty || "0"),
            reason: r.reason || "",
          }))
        : [];

      setRows(mappedRows);
      setEditingId(data.id || id);
      setShowReturnListModal(false);
    } catch (err) {
      console.error("Error loading return:", err);
      Swal.fire("Error", "Failed to load return", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the return permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/sale-order-returns/${id}`);
      Swal.fire("Deleted!", "Return deleted successfully", "success");
      await loadSavedReturns();
      handleAddNew(false);
    } catch (err) {
      console.error("Delete Error:", err);
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  /* ============== Print ============== */
  const handlePrint = () => {
    const formattedDate = date ? new Date(date).toLocaleDateString() : "";

    const rowHtml = rows
      .filter((r) => parseFloat(r.returnQty) > 0)
      .map(
        (r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.dispatchChallanNo || ""}</td>
          <td>${r.lotNumber || ""}</td>
          <td>${r.artNo || ""}</td>
          <td>${r.description || ""}</td>
          <td>${r.size || ""}</td>
          <td>${r.shade || ""}</td>
          <td style="text-align:right;">${r.box || ""}</td>
          <td style="text-align:right;">${r.pcsPerBox || ""}</td>
          <td style="text-align:right;">${r.pcs || ""}</td>
          <td style="text-align:right;">${r.returnQty || ""}</td>
          <td style="text-align:right;">${r.rate || ""}</td>
          <td style="text-align:right;">${r.amt || ""}</td>
          <td>${r.reason || ""}</td>
        </tr>`
      )
      .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sale Order Return</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
    h2 { text-align: center; margin-bottom: 20px; }
    .header { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 8px; }
    th, td { border: 1px solid #444; padding: 4px 6px; }
    th { background: #eee; }
    .totals-right { width: 40%; float: right; margin-top: 20px; font-size: 12px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  </style>
</head>
<body>
  <h2>Sale Order Return</h2>
  
  <div class="header">
    <div>
      <div><strong>Return No:</strong> ${returnNo || ""}</div>
      <div><strong>Party:</strong> ${partyName || ""}</div>
      <div><strong>Broker:</strong> ${brokerName || ""}</div>
      <div><strong>Transport:</strong> ${transportName || ""}</div>
    </div>
    <div style="text-align: right;">
      <div><strong>Date:</strong> ${formattedDate}</div>
      <div><strong>Received By:</strong> ${receivedBy || ""}</div>
      <div><strong>Remarks 1:</strong> ${remarks1 || ""}</div>
      <div><strong>Remarks 2:</strong> ${remarks2 || ""}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Challan No</th>
        <th>Lot No</th>
        <th>Art No</th>
        <th>Description</th>
        <th>Size</th>
        <th>Shade</th>
        <th>Box</th>
        <th>Pcs/Box</th>
        <th>Avail. Pcs</th>
        <th>Return Qty</th>
        <th>Rate</th>
        <th>Amt</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      ${rowHtml || `<tr><td colspan="14" style="text-align:center;">No rows</td></tr>`}
    </tbody>
  </table>

  <div class="totals-right">
    <div class="totals-row">
      <span><strong>Total Amount:</strong></span>
      <span>${totalAmt || "0.00"}</span>
    </div>
    <div class="totals-row">
      <span><strong>Discount (${discountPercent || "0"}%):</strong></span>
      <span>${discount || "0.00"}</span>
    </div>
    <div class="totals-row">
      <span><strong>Tax (${taxPercent || "0"}%):</strong></span>
      <span>${tax || "0.00"}</span>
    </div>
    <div class="totals-row">
      <span><strong>Cartage:</strong></span>
      <span>${cartage || "0.00"}</span>
    </div>
    <div class="totals-row" style="margin-top:8px;">
      <span><strong>Net Amount:</strong></span>
      <span><strong>${netAmt || "0.00"}</strong></span>
    </div>
  </div>

  <script>
    window.onload = function () {
      window.print();
      setTimeout(function () {
        try {
          if (window.frameElement && window.frameElement.parentNode) {
            window.frameElement.parentNode.removeChild(window.frameElement);
          }
        } catch (e) {}
      }, 500);
    };
  </script>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";

    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      document.body.removeChild(iframe);
      alert("Unable to open print preview.");
      return;
    }

    const printDoc = printWindow.document;
    printDoc.open();
    printDoc.write(html);
    printDoc.close();
  };

  /* ============== Field Order for Table ============== */
  const fieldOrder: (keyof ReturnRow)[] = [
    "dispatchChallanNo",
    "barCode",
    "artNo",
    "description",
    "size",
    "shade",
    "box",
    "pcsPerBox",
    "pcs",
    "returnQty",
    "rate",
    "amt",
    "reason",
  ];

  /* ============== Render ============== */
  return (
    <Dashboard>
      {/* Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-5xl p-4">
            <h3 className="text-xl font-bold mb-4 text-blue-800">Select Party</h3>
            <input
              type="text"
              placeholder="Search by party name / station..."
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
              className="border p-2 rounded w-full mb-4 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="overflow-auto max-h-96 border border-gray-300">
              <table className="w-full text-sm">
                <thead className="bg-blue-100 sticky top-0">
                  <tr>
                    <th className="border p-2">S.No</th>
                    <th className="border p-2">Party Name</th>
                    <th className="border p-2">Station</th>
                    <th className="border p-2">Agent</th>
                    <th className="border p-2">Transport</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((party, index) => (
                    <tr
                      key={party.id || index}
                      className="cursor-pointer hover:bg-yellow-100 transition-colors"
                    >
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{party.partyName}</td>
                      <td className="border p-2">{party.station || ""}</td>
                      <td className="border p-2">{party.agent?.agentName || ""}</td>
                      <td className="border p-2">{party.transport?.transportName || ""}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectParty(party)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredParties.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border p-2 text-center text-gray-500">
                        No parties found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPartyModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return List Modal */}
      {showReturnListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-6xl p-4 max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold mb-3 text-blue-800">Return List</h3>
            <input
              type="text"
              placeholder="Search by Return No / Party / Date..."
              value={returnListSearch}
              onChange={(e) => setReturnListSearch(e.target.value)}
              className="border p-2 rounded w-full mb-3 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="overflow-auto max-h-[430px] border border-gray-300">
              <table className="w-full text-sm">
                <thead className="bg-green-100 sticky top-0">
                  <tr>
                    <th className="border p-2">Sr.No</th>
                    <th className="border p-2">Return No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">Return Qty</th>
                    <th className="border p-2">Net Amt</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturnList.length === 0 ? (
                    <tr>
                      <td className="border p-3 text-center text-gray-500" colSpan={7}>
                        No returns found
                      </td>
                    </tr>
                  ) : (
                    filteredReturnList.map((r: any, idx: number) => {
                      const totalReturnQty = (r.rows || []).reduce(
                        (sum: number, row: any) => sum + (parseFloat(row.returnQty) || 0),
                        0
                      );

                      return (
                        <tr key={r.id || idx} className="hover:bg-green-50">
                          <td className="border p-2 text-center">{idx + 1}</td>
                          <td className="border p-2">{r.returnNo}</td>
                          <td className="border p-2">
                            {r.date ? new Date(r.date).toLocaleDateString() : ""}
                          </td>
                          <td className="border p-2">{r.partyName}</td>
                          <td className="border p-2 text-right">{totalReturnQty}</td>
                          <td className="border p-2 text-right">{r.netAmt ?? ""}</td>
                          <td className="border p-2 text-center space-x-1">
                            <button
                              onClick={() => handleEdit(r.id)}
                              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowReturnListModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-blue-800">Sale Order Return</h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div>
              <label className="block font-semibold">Return No.</label>
              <input type="text" value={returnNo} readOnly className="border p-2 rounded w-full bg-gray-100" />
            </div>
            <div>
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <input
                type="text"
                value={partyName}
                readOnly
                onClick={() => setShowPartyModal(true)}
                placeholder="Click to select party"
                className="border p-2 rounded w-full bg-gray-50 cursor-pointer hover:bg-gray-100"
              />
            </div>
            <div>
              <label className="block font-semibold">Received By</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">Remarks 1</label>
              <input
                type="text"
                value={remarks1}
                onChange={(e) => setRemarks1(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Remarks 2</label>
              <input
                type="text"
                value={remarks2}
                onChange={(e) => setRemarks2(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Broker Name</label>
              <input
                type="text"
                value={brokerName}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="block font-semibold">Transport Name</label>
              <input
                type="text"
                value={transportName}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
          </div>

          {/* Selection Info */}
          {selectedCount > 0 && (
            <div className="mb-2 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
              {selectedCount} row(s) selected | Selected Pcs: {selectedPcs}
            </div>
          )}

          {/* Main Table */}
          <div className="h-[250px] w-full overflow-auto border">
            <table className="w-full text-sm">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="border p-2 w-8">S.N</th>
                  {fieldOrder.map((field) => (
                    <th key={field} className="border p-2">
                      {field === "dispatchChallanNo" && "Challan No"}
                      {field === "barCode" && "Bar Code"}
                      {field === "artNo" && "Art No"}
                      {field === "description" && "Description"}
                      {field === "size" && "Size"}
                      {field === "shade" && "Shade"}
                      {field === "box" && "Box"}
                      {field === "pcsPerBox" && "Pcs/Box"}
                      {field === "pcs" && "Avail. Pcs"}
                      {field === "returnQty" && "Return Qty"}
                      {field === "rate" && "Rate"}
                      {field === "amt" && "Amt"}
                      {field === "reason" && "Reason"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className={row.selected ? "bg-blue-50" : ""}>
                    <td className="border p-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => handleRowSelect(row.id, e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="border p-1 text-center">{index + 1}</td>
                    {fieldOrder.map((field) => (
                      <td key={field} className="border p-1">
                        {["dispatchChallanNo", "barCode", "artNo", "description", "size", "shade", "box", "pcsPerBox", "pcs", "rate", "amt"].includes(field) && (
                          <input
                            type="text"
                            value={row[field] as string}
                            onChange={(e) => handleChange(row.id, field, e.target.value)}
                            className="border p-1 rounded w-full bg-gray-100"
                            readOnly
                          />
                        )}
                        {field === "reason" && (
                          <input
                            type="text"
                            value={row[field] as string}
                            onChange={(e) => handleChange(row.id, field, e.target.value)}
                            className="border p-1 rounded w-full"
                          />
                        )}
                        {field === "returnQty" && (
                          <input
                            type="text"
                            value={row[field] as string}
                            onChange={(e) => handleChange(row.id, field, e.target.value)}
                            className="border p-1 rounded w-full bg-yellow-50"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={fieldOrder.length + 2} className="border p-4 text-center text-gray-500">
                      No items found. Select a party to load dispatch challans.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Row buttons */}
          <div className="flex justify-start mt-6 space-x-3">
            <button
              onClick={addMainRow}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2"
            >
              Add Row
            </button>
            <button
              onClick={deleteMainRow}
              disabled={selectedCount === 0}
              className={`px-4 py-2 text-white rounded mt-2 ${
                selectedCount === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              Delete Selected ({selectedCount})
            </button>
          </div>

          {/* Totals */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="col-span-2"></div>
            <div className="col-span-1 text-right space-y-2">
              <div>
                <label className="font-semibold mr-2">Total Amt:</label>
                <input
                  type="text"
                  value={totalAmt}
                  readOnly
                  className="border p-1 rounded w-32 text-right bg-gray-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <label className="font-semibold">Disc(%):</label>
                <input
                  type="text"
                  value={discountPercent}
                  onChange={handleDiscountPercentChange}
                  className="border p-1 rounded w-16 text-right"
                  placeholder="%"
                />
                <input
                  type="text"
                  value={discount}
                  onChange={handleDiscountAmountChange}
                  className="border p-1 rounded w-24 text-right"
                  placeholder="Amt"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <label className="font-semibold">Tax(%):</label>
                <input
                  type="text"
                  value={taxPercent}
                  onChange={handleTaxPercentChange}
                  className="border p-1 rounded w-16 text-right"
                  placeholder="%"
                />
                <input
                  type="text"
                  value={tax}
                  onChange={handleTaxAmountChange}
                  className="border p-1 rounded w-24 text-right"
                  placeholder="Amt"
                />
              </div>

              <div>
                <label className="font-semibold mr-2">Cartage:</label>
                <input
                  type="text"
                  value={cartage}
                  onChange={(e) => setCartage(e.target.value)}
                  className="border p-1 rounded w-32 text-right"
                />
              </div>

              <div>
                <label className="font-semibold mr-2">Net Amt:</label>
                <input
                  type="text"
                  value={netAmt}
                  readOnly
                  className="border p-1 rounded w-32 text-right bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-start mt-6 space-x-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={openReturnList}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              List View
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Print
            </button>
            <button
              onClick={() => handleAddNew(true)}
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
            >
              New
            </button>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default SaleOrderReturn;