import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Dashboard from "../../Dashboard";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

// --- Types ---
type IdLike = number | string;

interface RowData {
  id: number; // local UI id
  lotNo: string;
  itemName: string;
  shade: string;
  processing: string;
  rolls: string;
  weight: string;
  wastage: string;
  extraWt: string;
  rate: string; // finishing rate (entered manually)
  amount: string; // weight * rate
  rateFND: string; // KYR + Dyeing (Sum) from Finishing Outward
}

interface Party {
  id?: string | number;
  partyName: string;
  category?: { categoryName?: string };
}

interface FinishingOutwardDoc {
  id?: IdLike;
  _id?: IdLike;
  partyName?: string;
  dated?: string;
  date?: string;
  challanNo?: string;
  rows?: any[];
}

type LastSavedForStock = {
  date: string;
  partyName: string;
  itemNames: string[];
  lotNos: string[];
  docId?: IdLike;
  challanNo?: string;
};

const toNum = (v: any) => parseFloat(String(v || 0)) || 0;
const uniq = (arr: any[]) =>
  Array.from(new Set(arr.map((x) => String(x ?? "").trim()).filter(Boolean)));

const sumRatesToString = (kyr?: string | number, dr?: string | number) => {
  const sum = toNum(kyr) + toNum(dr);
  return sum ? sum.toFixed(2) : "";
};

// Helpers for dates
const todayISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
const toInputDate = (d?: any) => {
  if (!d) return "";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already YYYY-MM-DD
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const FinishingInward: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Form State ---
  const [rows, setRows] = useState<RowData[]>([]);
  const [originalRows, setOriginalRows] = useState<RowData[]>([]); // snapshot for update-merge
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

  const [partyName, setPartyName] = useState<string>("");
  const [challanNo, setChallanNo] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO()); // default to today's date
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [through, setThrough] = useState<string>("");

  // New: Transfer to Stock checkbox
  const [transferToStock, setTransferToStock] = useState<boolean>(false);

  // This ref holds the recently-saved selection (for auto-issue to stock statement)
  const lastSavedForStockRef = useRef<LastSavedForStock | null>(null);

  // --- Meta ---
  const [loading, setLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<IdLike | null>(null);
  const [prefilledFromOutward, setPrefilledFromOutward] =
    useState<boolean>(false);

  // --- Party dropdown ---
  const [partyList, setPartyList] = useState<Party[]>([]);

  // --- Finishing Outward docs (to prefill lots by party) ---
  const [finishingOutwardDocs, setFinishingOutwardDocs] = useState<
    FinishingOutwardDoc[]
  >([]);

  // --- List modal ---
  const [showList, setShowList] = useState(false);
  const [finishingInwardList, setFinishingInwardList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

  // --- Helpers ---
  const calculateAmount = (rate: string, weight: string): string => {
    const rateNum = parseFloat(rate) || 0;
    const weightNum = parseFloat(weight) || 0;
    const res = rateNum * weightNum;
    return res ? res.toFixed(2) : "";
  };

  // Create a new row
  const createNewRow = useCallback(
    (id: number): RowData => ({
      id,
      lotNo: "",
      itemName: "",
      shade: "",
      processing: "",
      rolls: "",
      weight: "",
      wastage: "",
      extraWt: "",
      rate: "",
      amount: "",
      rateFND: "", // read-only, from Outward
    }),
    []
  );

  // Add row
  const addRow = useCallback(() => {
    setRows((prev) => {
      const nextId = prev.reduce((m, r) => Math.max(m, r.id), 0) + 1;
      return [...prev, createNewRow(nextId)];
    });
  }, [createNewRow]);

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, [addRow, rows.length]);

  // Row selection
  const allRowsSelected =
    rows.length > 0 && selectedRowIds.length === rows.length;
  const toggleRowSelect = (id: number) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAllRows = () => {
    if (allRowsSelected) setSelectedRowIds([]);
    else setSelectedRowIds(rows.map((r) => r.id));
  };

  // Handle row input changes; recalc amount when rate/weight changes
  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === id) {
          const u: RowData = { ...r, [field]: value };
          if (field === "rate" || field === "weight") {
            u.amount = calculateAmount(u.rate, u.weight);
          }
          return u;
        }
        return r;
      })
    );
  };

  // Load Parties (Finishing category only)
  useEffect(() => {
    api
      .get("/party/all")
      .then((r) => setPartyList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load party list", "error"));
  }, []);

  // Load Finishing Outward docs for prefill by party
  useEffect(() => {
    api
      .get("/finishing-outwards")
      .then((res) => {
        const docs = Array.isArray(res.data) ? res.data : [];
        setFinishingOutwardDocs(docs);
      })
      .catch((err) => {
        console.error("Error loading finishing outward docs:", err);
        Swal.fire("Error", "Failed to load Finishing Outward data", "error");
      });
  }, []);

  // Optional: Prefill from Finishing Outward "Issue To" navigation state
  useEffect(() => {
    const s: any = (location as any)?.state?.fromOutward;
    if (!s) return;
    try {
      const hdr = s.header || {};
      setPartyName(hdr.partyName || "");
      setChallanNo(hdr.challanNo || "");

      const hdrDate = toInputDate(hdr.dated || hdr.date);
      if (hdrDate) setDate(hdrDate);

      setVehicleNo(hdr.vehicleNo || "");
      setThrough(hdr.through || "");

      const rowsArr: any[] = Array.isArray(s.rows) ? s.rows : [];
      const mapped: RowData[] = rowsArr.map((r: any, idx: number) => {
        const rateFND =
          r.rateFND || sumRatesToString(r.knittingYarnRate, r.dyeingRate) || "";
        const weightStr = String(r.weight ?? "");
        const rateStr = ""; // finishing rate to be entered manually by user
        return {
          id: idx + 1,
          lotNo: String(r.lotNo || r.fabricLotNo || ""),
          itemName: String(r.itemName || r.item || r.fabric || ""),
          shade: String(r.shade || ""),
          processing: "",
          rolls: String(r.rolls ?? ""),
          weight: weightStr,
          wastage: "",
          extraWt: "",
          rate: rateStr,
          amount: calculateAmount(rateStr, weightStr),
          rateFND: String(rateFND),
        };
      });

      if (mapped.length) {
        setRows(mapped);
        setSelectedRowIds(mapped.map((x) => x.id));
        setPrefilledFromOutward(true);
      }
    } catch (e) {
      console.error("Prefill from Outward failed:", e);
    }
  }, [location]);

  // When party is selected (and not editing / not prefilled from Issue-To), prefill rows from Finishing Outward for that party
  useEffect(() => {
    if (!partyName?.trim()) return;
    if (editingId) return;
    if (prefilledFromOutward) return;

    const rowsFlat: any[] = [];
    finishingOutwardDocs
      .filter(
        (d) =>
          (d.partyName || "").trim().toLowerCase() ===
          partyName.trim().toLowerCase()
      )
      .forEach((doc) => {
        (doc.rows || []).forEach((r: any) => {
          rowsFlat.push({
            lotNo: r.lotNo || r.fabricLotNo || "",
            itemName: r.itemName || r.item || r.fabric || "",
            shade: r.shade || "",
            rolls: r.rolls || 0,
            weight: r.weight || 0,
            rateFND:
              r.rateFND ||
              sumRatesToString(r.knittingYarnRate, r.dyeingRate) ||
              "",
          });
        });
      });

    // Unique by lotNo + itemName + shade
    const seen = new Set<string>();
    const uniqueLots = rowsFlat.filter((x) => {
      const key = `${x.lotNo}|${x.itemName}|${x.shade}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueLots.length === 0) {
      setRows([createNewRow(1)]);
      setSelectedRowIds([]);
      return;
    }

    const mapped: RowData[] = uniqueLots.map((l, idx) => {
      const weightStr = String(l.weight ?? "");
      const rateStr = ""; // finishing rate to be entered manually
      return {
        id: idx + 1,
        lotNo: String(l.lotNo || ""),
        itemName: String(l.itemName || ""),
        shade: String(l.shade || ""),
        processing: "",
        rolls: String(l.rolls ?? ""),
        weight: weightStr,
        wastage: "",
        extraWt: "",
        rate: rateStr,
        amount: calculateAmount(rateStr, weightStr),
        rateFND: String(l.rateFND || ""),
      };
    });

    setRows(mapped);
    setSelectedRowIds(mapped.map((r) => r.id)); // pre-select all
  }, [
    partyName,
    editingId,
    prefilledFromOutward,
    finishingOutwardDocs,
    createNewRow,
  ]);

  // Payload
  const buildPayload = (rowsForPayload: RowData[]) => ({
    dated: date,
    partyName,
    challanNo,
    vehicleNo,
    through,
    transferToStock, // optional flag (for server if supported)
    rows: rowsForPayload.map((r) => ({
      lotNo: r.lotNo,
      itemName: r.itemName,
      shade: r.shade,
      processing: r.processing,
      rolls: r.rolls,
      weight: r.weight,
      wastage: r.wastage,
      extraWt: r.extraWt,
      rateFND: r.rateFND, // preserve KYR + Dyeing (Sum) from Outward
      rate: r.rate, // finishing rate (manual)
      amount: r.amount, // weight * finishing rate
    })),
  });

  const resetForm = () => {
    setRows([]);
    setOriginalRows([]);
    setSelectedRowIds([]);
    addRow();
    setPartyName("");
    setChallanNo("");
    setDate(todayISO()); // reset to today's date automatically
    setVehicleNo("");
    setThrough("");
    setTransferToStock(false);
    setEditingId(null);
    setPrefilledFromOutward(false);
    // Note: we intentionally DO NOT clear lastSavedForStockRef
  };

  // Validation
  const validateCore = (rowsToValidate: RowData[]) => {
    if (!partyName?.trim()) {
      Swal.fire("Validation Error", "Party name is required", "warning");
      return false;
    }
    if (!date) {
      Swal.fire("Validation Error", "Date is required", "warning");
      return false;
    }
    if (rowsToValidate.length === 0) {
      Swal.fire("No Selection", "Please select at least one row.", "warning");
      return false;
    }
    const hasLot = rowsToValidate.some((r) => (r.lotNo || "").trim() !== "");
    if (!hasLot) {
      Swal.fire(
        "Validation Error",
        "At least one selected row must have a Fabric Lot No.",
        "warning"
      );
      return false;
    }
    return true;
  };

  // Save
  const handleCreate = async () => {
    const selected = rows.filter((r) => selectedRowIds.includes(r.id));
    if (!validateCore(selected)) return;

    try {
      setLoading(true);
      const payload = buildPayload(selected);
      const res = await api.post("/finishing-inwards", payload);

      // Prepare auto-issue payload for Stock Statement
      if (transferToStock) {
        lastSavedForStockRef.current = {
          date,
          partyName,
          itemNames: uniq(selected.map((r) => r.itemName)),
          lotNos: uniq(selected.map((r) => r.lotNo)),
          docId: res?.data?.id ?? res?.data?._id,
          challanNo,
        };
        Swal.fire("Success", "Saved and transferred to stock!", "success");
      } else {
        lastSavedForStockRef.current = {
          date,
          partyName,
          itemNames: uniq(selected.map((r) => r.itemName)),
          lotNos: uniq(selected.map((r) => r.lotNo)),
          docId: res?.data?.id ?? res?.data?._id,
          challanNo,
        };
        Swal.fire("Success", "Finishing inward saved!", "success");
      }
      resetForm();
    } catch (err: any) {
      console.error("Save Error:", err);
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to save",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update (merge: checked rows updated; unchecked original rows preserved; new checked rows added)
  const handleUpdate = async () => {
    if (!editingId) {
      Swal.fire("Info", "No record selected to update", "info");
      return;
    }
    const selected = rows.filter((r) => selectedRowIds.includes(r.id));
    if (!validateCore(selected)) return;

    try {
      setLoading(true);
      const originalIds = new Set(originalRows.map((r) => r.id));

      const mergedExisting = originalRows.map((orow) => {
        if (selectedRowIds.includes(orow.id)) {
          const updated = rows.find((r) => r.id === orow.id);
          return updated || orow;
        }
        return orow;
      });

      const selectedNewRows = rows.filter(
        (r) => !originalIds.has(r.id) && selectedRowIds.includes(r.id)
      );

      const finalRows = [...mergedExisting, ...selectedNewRows];

      await api.put(`/finishing-inwards/${editingId}`, buildPayload(finalRows));
      Swal.fire("Success", "Finishing inward updated!", "success");

      // If transferToStock checked on update, set the last saved for Stock as well
      if (transferToStock) {
        lastSavedForStockRef.current = {
          date,
          partyName,
          itemNames: uniq(finalRows.map((r) => r.itemName)),
          lotNos: uniq(finalRows.map((r) => r.lotNo)),
          docId: editingId,
          challanNo,
        };
      }

      resetForm();
    } catch (err: any) {
      console.error("Update Error:", err);
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to update",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete current
  const handleDeleteCurrent = async () => {
    if (!editingId) {
      Swal.fire("Info", "Open a record (Edit) before deleting", "info");
      return;
    }
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/finishing-inwards/${editingId}`);
        Swal.fire("Deleted", "Record deleted successfully", "success");
        resetForm();
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  // View List / Edit / Delete
  const openList = async () => {
    try {
      const res = await api.get("/finishing-inwards");
      const data = Array.isArray(res.data) ? res.data : [];
      setFinishingInwardList(data);
      setShowList(true);
    } catch (err) {
      console.error("List Load Error:", err);
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

  const handleEditFromList = async (id: IdLike) => {
    try {
      const res = await api.get(`/finishing-inwards/${id}`);
      const data = res.data;

      setEditingId(id);
      setChallanNo(data.challanNo || "");

      const editDate = toInputDate(data.dated || data.date);
      if (editDate) setDate(editDate);

      setPartyName(data.partyName || "");
      setVehicleNo(data.vehicleNo || "");
      setThrough(data.through || "");

      const mapped: RowData[] = (Array.isArray(data.rows) ? data.rows : []).map(
        (r: any, idx: number) => ({
          id: idx + 1, // local stable id
          lotNo: String(r.lotNo || ""),
          itemName: String(r.itemName || r.item || ""),
          shade: String(r.shade || ""),
          processing: String(r.processing || ""),
          rolls: String(r.rolls ?? ""),
          weight: String(r.weight ?? ""),
          wastage: String(r.wastage ?? ""),
          extraWt: String(r.extraWt ?? ""),
          rate: String(r.rate ?? ""),
          amount: String(r.amount ?? ""),
          rateFND: String(r.rateFND ?? ""),
        })
      );
      setRows(mapped);
      setOriginalRows(mapped);
      setSelectedRowIds(mapped.map((r) => r.id));
      setShowList(false);
    } catch (err) {
      console.error("Edit Load Error:", err);
      Swal.fire("Error", "Failed to load record", "error");
    }
  };

  const handleDeleteFromList = async (id: IdLike) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/finishing-inwards/${id}`);
        setFinishingInwardList((prev) =>
          prev.filter((x: any) => (x.id ?? x._id) !== id)
        );
        Swal.fire("Deleted", "Record deleted successfully", "success");
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  // Print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalRolls = rows.reduce(
      (sum, r) => sum + (parseFloat(r.rolls) || 0),
      0
    );
    const totalWeight = rows.reduce(
      (sum, r) => sum + (parseFloat(r.weight) || 0),
      0
    );
    const totalAmount = rows.reduce(
      (sum, r) => sum + (parseFloat(r.amount) || 0),
      0
    );
    const totalWastage = rows.reduce(
      (sum, r) => sum + (parseFloat(r.wastage) || 0),
      0
    );

    const html = `
      <html>
        <head>
          <title>Finishing Inward - ${challanNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #555; padding: 6px; text-align: center; font-size: 11px; }
            th { background-color: #f0f0f0; }
            h2 { text-align: center; }
            .info { margin: 10px 0; }
            .totals { margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Finishing Inward</h2>
          <div class="info">
            <p><b>Date:</b> ${date}</p>
            <p><b>Party:</b> ${partyName}</p>
            <p><b>Challan No:</b> ${challanNo}</p>
            <p><b>Vehicle No:</b> ${vehicleNo}</p>
            <p><b>Through:</b> ${through}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fabric Lot No</th>
                <th>Fabrication Name</th>
                <th>Shade</th>
                <th>Processing</th>
                <th>KYR + Dyeing (Sum)</th>
                <th>Rolls</th>
                <th>Weight</th>
                <th>Wastage</th>
                <th>Extra Wt</th>
                <th>Finishing Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.lotNo}</td>
                  <td>${r.itemName}</td>
                  <td>${r.shade}</td>
                  <td>${r.processing}</td>
                  <td>${r.rateFND}</td>
                  <td>${r.rolls}</td>
                  <td>${r.weight}</td>
                  <td>${r.wastage}</td>
                  <td>${r.extraWt}</td>
                  <td>${r.rate}</td>
                  <td>${r.amount}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Rolls: ${totalRolls}</p>
            <p>Total Weight: ${totalWeight.toFixed(3)}</p>
            <p>Total Wastage: ${totalWastage.toFixed(3)}</p>
            <p>Total Amount: ₹${totalAmount.toFixed(2)}</p>
          </div>
          <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Issue To (navigate to Stock Statement with last saved selection if available)
  const handleIssueTo = async () => {
    const result = await Swal.fire({
      title: "Issue To Finishing  In House ",
      text: "Proceed to Finishing  In House Stock Statement?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      Swal.fire("Redirecting", "Opening Stock Statement...", "info");
      setTimeout(() => {
        if (lastSavedForStockRef.current) {
          navigate("/knitting/finishing/in-house-stock-statement", {
            state: { fromInward: lastSavedForStockRef.current },
          });
        } else {
          navigate("/knitting/finishing/in-house-stock-statement");
        }
      }, 500);
    }
  };

  // Totals
  const totalRolls = rows.reduce(
    (sum, r) => sum + (parseFloat(r.rolls) || 0),
    0
  );
  const totalWeight = rows
    .reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0)
    .toFixed(3);
  const totalAmount = rows
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    .toFixed(2);
  const totalWastage = rows
    .reduce((sum, r) => sum + (parseFloat(r.wastage) || 0), 0)
    .toFixed(3);

  // Aggregated list (1 row per document)
  const aggregatedList = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    return (Array.isArray(finishingInwardList) ? finishingInwardList : [])
      .map((doc: any) => {
        const rowsArr = Array.isArray(doc.rows) ? doc.rows : [];
        const lotNosStr = uniq(rowsArr.map((r: any) => r.lotNo)).join(", ");
        const itemsStr = uniq(
          rowsArr.map((r: any) => r.itemName || r.item)
        ).join(", ");
        const shadeStr = uniq(rowsArr.map((r: any) => r.shade)).join(", ");
        const finishingRatesStr = uniq(rowsArr.map((r: any) => r.rate)).join(
          ", "
        );
        const rateFNDsStr = uniq(rowsArr.map((r: any) => r.rateFND)).join(", ");
        const totalRolls = rowsArr.reduce(
          (sum: number, r: any) => sum + toNum(r.rolls),
          0
        );
        const totalWeight = rowsArr.reduce(
          (sum: number, r: any) => sum + toNum(r.weight),
          0
        );

        // Total Amount = Finishing Inward amount (fin rate * weight or saved amount)
        const totalAmount = rowsArr.reduce((sum: number, r: any) => {
          const amt = toNum(r.amount);
          const calc = toNum(r.rate) * toNum(r.weight);
          return sum + (amt || calc);
        }, 0);

        const dateValue = doc.dated || doc.date || "";
        const dateStr = dateValue
          ? new Date(dateValue).toLocaleDateString()
          : "";

        const row = {
          id: doc.id ?? doc._id,
          partyName: doc.partyName || "",
          challanNo: doc.challanNo || "",
          dated: dateStr,
          lotNosStr,
          itemsStr,
          shadeStr,
          finishingRatesStr,
          rateFNDsStr,
          totalRolls,
          totalWeight,
          amount: totalAmount, // numeric; format on render
        };

        if (!s) return row;

        const hay = [
          row.partyName,
          row.challanNo,
          row.dated,
          row.lotNosStr,
          row.itemsStr,
          row.shadeStr,
          row.finishingRatesStr,
          row.rateFNDsStr,
          String(row.totalRolls),
          String(row.totalWeight),
          String(row.amount),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(s) ? row : null;
      })
      .filter(Boolean) as any[];
  }, [finishingInwardList, searchText]);

  return (
    <Dashboard>
      <div className="p-2 min-h-screen text-lg">
        <div className="bg-white p-2 rounded shadow-lg max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
            Finishing Inward / Receipt
          </h2>

          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block font-semibold text-xs text-gray-700">
                Party Name
              </label>
              <select
                className="border p-1 rounded w-full text-sm focus:border-blue-500 bg-white"
                value={partyName}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  setPartyName(selectedName);
                }}
              >
                <option value="">Select Finishing Party</option>
                {partyList
                  .filter(
                    (p) =>
                      p.category?.categoryName?.toLowerCase() === "finishing"
                  )
                  .map((p, idx) => (
                    <option key={String(p.id ?? idx)} value={p.partyName}>
                      {p.partyName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-xs text-gray-700">
                Challan No.
              </label>
              <input
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                placeholder="Enter Challan Number"
                className="border p-1 rounded w-full text-sm focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-xs text-gray-700">
                Dated
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-1 rounded w-full text-sm focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-xs text-gray-700">
                Vehicle No.
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="border p-1 rounded w-full text-sm focus:border-blue-500"
              />
            </div>
          </div>

          {/* Through + Transfer to Stock */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block font-semibold text-xs text-gray-700">
                Through
              </label>
              <input
                type="text"
                value={through}
                onChange={(e) => setThrough(e.target.value)}
                className="border p-1 rounded  text-sm focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={transferToStock}
                  onChange={(e) => setTransferToStock(e.target.checked)}
                />
                <span className="font-semibold text-gray-700">
                  Transfer to Stock
                </span>
              </label>
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-x-auto mb-6 border rounded">
            <table className="w-full text-xs min-w-[1400px]">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 w-[4%] text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={allRowsSelected}
                      onChange={toggleSelectAllRows}
                    />
                  </th>
                  <th className="border p-2 w-[5%]">Sr No</th>
                  <th className="border p-2 w-[10%]">Fabric Lot No</th>
                  <th className="border p-2 w-[18%]">Fabrication Name</th>
                  <th className="border p-2 w-[10%]">Shade</th>
                  <th className="border p-2 w-[10%]">Processing</th>
                  <th className="border p-2 w-[10%]">KYR + Dyeing (Sum)</th>
                  <th className="border p-2 w-[7%]">Rolls</th>
                  <th className="border p-2 w-[7%]">Weight</th>
                  <th className="border p-2 w-[7%]">Wastage</th>
                  <th className="border p-2 w-[7%]">Extra Wt</th>
                  <th className="border p-2 w-[7%]">Finishing Rate</th>
                  <th className="border p-2 w-[8%]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const isChecked = selectedRowIds.includes(row.id);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border p-1 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={isChecked}
                          onChange={() => toggleRowSelect(row.id)}
                        />
                      </td>
                      <td className="border p-1 text-center font-medium">
                        {index + 1}
                      </td>

                      {/* Read-only fields for lot and item */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.lotNo}
                          readOnly
                          className="w-full p-1 text-xs border rounded bg-gray-100"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.itemName}
                          readOnly
                          className="w-full p-1 text-xs border rounded bg-gray-100"
                        />
                      </td>

                      {/* Editable fields */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.shade}
                          onChange={(e) =>
                            handleChange(row.id, "shade", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.processing}
                          onChange={(e) =>
                            handleChange(row.id, "processing", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded"
                        />
                      </td>

                      {/* rateFND - read-only */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.rateFND}
                          readOnly
                          className="w-full p-1 text-xs border rounded bg-gray-100 text-right"
                          title="KYR + Dyeing (Sum)"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="number"
                          value={row.rolls}
                          onChange={(e) =>
                            handleChange(row.id, "rolls", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="number"
                          step="0.001"
                          value={row.weight}
                          onChange={(e) =>
                            handleChange(row.id, "weight", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="number"
                          step="0.001"
                          value={row.wastage}
                          onChange={(e) =>
                            handleChange(row.id, "wastage", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="number"
                          step="0.001"
                          value={row.extraWt}
                          onChange={(e) =>
                            handleChange(row.id, "extraWt", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="number"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) =>
                            handleChange(row.id, "rate", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                          placeholder="Enter finishing rate"
                        />
                      </td>

                      <td className="border p-1 bg-gray-100 font-semibold text-right">
                        {row.amount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Buttons and Totals */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm">
            <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-0">
              <button
                onClick={addRow}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition duration-150"
              >
                Add New
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition duration-150 disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm transition duration-150 disabled:opacity-60"
              >
                Update
              </button>
              <button
                onClick={handleDeleteCurrent}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition duration-150"
              >
                Delete
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-900 text-white rounded text-sm transition duration-150"
              >
                Print
              </button>
              <button
                onClick={openList}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition duration-150"
              >
                View List
              </button>
              <button
                onClick={handleIssueTo}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm transition duration-150"
              >
                Issue To F InHouse
              </button>

              <span className="ml-2 text-gray-600">
                Selected: <b>{selectedRowIds.length}</b> / {rows.length}
              </span>
            </div>

            <div className="text-right space-y-1 font-medium">
              <p>
                <strong className="text-gray-700">Tot. Rolls:</strong>{" "}
                <span className="text-blue-700">{totalRolls}</span>
              </p>
              <p>
                <strong className="text-gray-700">Tot. Wt:</strong>{" "}
                <span className="text-blue-700">{totalWeight}</span>
              </p>
              <p>
                <strong className="text-gray-700">Total Amount:</strong>{" "}
                <span className="text-blue-700">{totalAmount}</span>
              </p>
              <p>
                <strong className="text-gray-700">Tot. Wastage:</strong>{" "}
                <span className="text-blue-700">{totalWastage}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW LIST MODAL (aggregated, includes Finishing Rate & Amount) */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-200">
            {/* Header */}
            <div className="px-4 py-2 bg-gray-800 text-white font-semibold text-lg flex justify-between items-center">
              <span>Finishing Inward List</span>
              <button
                onClick={() => setShowList(false)}
                className="text-white hover:text-gray-300 text-1xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="🔍 Search by any field (Party, Challan, Date, Lot, Item, Shade, Rate, Amount...)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-2 rounded-lg w-full text-sm outline-none"
              />
            </div>

            {/* Table Section */}
            <div className="overflow-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-[1400px] w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="text-gray-700">
                    <th className="p-2 border border-gray-300">#</th>
                    <th className="p-2 border border-gray-300">
                      Fabric Lot No(s)
                    </th>
                    <th className="p-2 border border-gray-300">
                      Fabrication Name(s)
                    </th>
                    <th className="p-2 border border-gray-300">Shade(s)</th>
                    <th className="p-2 border border-gray-300">
                      Finishing Rate
                    </th>
                    <th className="p-2 border border-gray-300">
                      KYR + Dyeing (Sum)
                    </th>
                    <th className="p-2 border border-gray-300 text-right">
                      Rolls
                    </th>
                    <th className="p-2 border border-gray-300 text-right">
                      Weight
                    </th>
                    <th className="p-2 border border-gray-300">Party Name</th>
                    <th className="p-2 border border-gray-300 text-right">
                      Amount
                    </th>
                    <th className="p-2 border border-gray-300">
                      Party Challan No
                    </th>
                    <th className="p-2 border border-gray-300">Dated</th>
                    <th className="p-2 border border-gray-300 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {aggregatedList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="p-5 text-center text-gray-500 border border-gray-300"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    aggregatedList.map((r: any, i: number) => (
                      <tr
                        key={`${r.id}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-2 border border-gray-200">{i + 1}</td>
                        <td className="p-2 border border-gray-200">
                          {r.lotNosStr || "-"}
                        </td>
                        <td className="p-2 border border-gray-200">
                          {r.itemsStr || "-"}
                        </td>
                        <td className="p-2 border border-gray-200">
                          {r.shadeStr || "-"}
                        </td>
                        <td className="p-2 border border-gray-200">
                          {r.finishingRatesStr || "-"}
                        </td>
                        <td className="p-2 border border-gray-200">
                          {r.rateFNDsStr || "-"}
                        </td>
                        <td className="p-2 border border-gray-200 text-right">
                          {r.totalRolls}
                        </td>
                        <td className="p-2 border border-gray-200 text-right">
                          {Number(r.totalWeight).toFixed(3)}
                        </td>
                        <td className="p-2 border border-gray-200">
                          {r.partyName}
                        </td>
                        <td className="p-2 border border-gray-200 text-right">
                          ₹{Number(r.amount).toFixed(2)}
                        </td>
                        <td className="p-2 border border-gray-200">
                          {r.challanNo}
                        </td>
                        <td className="p-2 border border-gray-200">
                          {r.dated}
                        </td>

                        <td className="p-2 border border-gray-200 text-center">
                          <button
                            onClick={() => handleEditFromList(r.id)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded mr-2 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFromList(r.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-right">
              <button
                onClick={() => setShowList(false)}
                className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded border border-gray-300 bg-white text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default FinishingInward;
