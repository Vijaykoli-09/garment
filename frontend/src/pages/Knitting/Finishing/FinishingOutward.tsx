import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import Dashboard from "../../Dashboard";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

// --- Types ---
type IdLike = number | string;

interface RowData {
  id: number; // UI row id (local)
  lotNo: string; // Fabric Lot No
  itemName: string; // Fabrication Name
  shade: string;
  mcSize: string;
  greyGsm: string;
  regdGsm: string;

  // Rates (from Dyeing Inward)
  knittingYarnRate: string; // shown in modal; saved in row for reference
  dyeingRate: string; // shown in modal; saved in row for reference

  // Sum of knittingYarnRate + dyeingRate (read-only in row)
  rateFND: string;

  // Finishing Rate (entered manually by user) - remains in data model for compatibility
  rate: string;

  rolls: string;
  weight: string;
  clothWeight: string;
  ribWeight: string;
  amount: string; // computed as rate * weight
}

interface LotFromDyeingInward {
  fabricLotNo: string;
  fabric: string; // fabrication name
  shade: string;
  rolls: string | number;
  weight: string | number;
  knittingYarnRate?: string | number;
  dyeingRate?: string | number;
}

interface Party {
  id: number | string;
  partyName: string;
}

// --- Small helpers ---
const toNum = (v: any) => parseFloat(String(v || 0)) || 0;
const uniq = (arr: (string | number | null | undefined)[]) =>
  Array.from(new Set(arr.map((x) => String(x ?? "").trim()).filter(Boolean)));
const todayISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
const toInputDate = (d?: any) => {
  if (!d) return "";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const FinishingOutward: React.FC = () => {
  const navigate = useNavigate();

  // --- Form State ---
  const [rows, setRows] = useState<RowData[]>([]);
  const [originalRows, setOriginalRows] = useState<RowData[]>([]); // snapshot on edit
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [challanNo, setChallanNo] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyId, setPartyId] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO()); // auto-fill today's date
  const [vehicleNo, setVehicleNo] = useState("");
  const [through, setThrough] = useState("");
  const [narration, setNarration] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep track of the most recently saved document for auto Issue To
  const lastSavedRef = useRef<{
    header: {
      dated: string;
      partyId: string;
      partyName: string;
      challanNo: string;
      vehicleNo: string;
      through: string;
      narration: string;
    };
    rows: RowData[];
  } | null>(null);

  // --- Parties ---
  const [allParties, setAllParties] = useState<Party[]>([]);

  // --- Lot Modal State (from Dyeing Inward) ---
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotSearchText, setLotSearchText] = useState("");
  const [lotSearchQuery, setLotSearchQuery] = useState("");
  const [currentRowId, setCurrentRowId] = useState<number | null>(null);
  const [dyeingInwardLots, setDyeingInwardLots] = useState<
    LotFromDyeingInward[]
  >([]);
  const [selectedLotNos, setSelectedLotNos] = useState<Set<string>>(new Set());

  // --- List Modal State ---
  const [showList, setShowList] = useState(false);
  const [finishingOutwardList, setFinishingOutwardList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<IdLike | null>(null);

  // Helpers
  const sumRatesToString = (kyr: string | number, dr: string | number) => {
    const sum = toNum(kyr) + toNum(dr);
    return sum ? sum.toFixed(2) : "";
  };

  // Amount = Finishing Rate (rate) * weight
  const computeAmountByWeight = (rate: string, weight: string | number) => {
    const rateNum = toNum(rate);
    const weightNum = typeof weight === "number" ? weight : toNum(weight);
    const res = rateNum * weightNum;
    return res ? res.toFixed(2) : "";
  };

  // Add new row
  const createNewRow = useCallback(
    (id: number): RowData => ({
      id,
      lotNo: "",
      itemName: "",
      shade: "",
      mcSize: "",
      greyGsm: "",
      regdGsm: "",
      knittingYarnRate: "",
      dyeingRate: "",
      rateFND: "",
      rate: "",
      rolls: "",
      weight: "",
      clothWeight: "",
      ribWeight: "",
      amount: "",
    }),
    []
  );

  const addRow = useCallback(() => {
    setRows((prevRows) => {
      const nextId = prevRows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
      return [...prevRows, createNewRow(nextId)];
    });
  }, [createNewRow]);

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, [addRow, rows.length]);

  // Master select state
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

  // Handle input change; recalc amount if rate/weight changes
  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === id) {
          const updatedRow: RowData = { ...r, [field]: value } as RowData;

          if (field === "rate" || field === "weight") {
            updatedRow.amount = computeAmountByWeight(
              updatedRow.rate,
              updatedRow.weight
            );
          }

          if (field === "knittingYarnRate" || field === "dyeingRate") {
            updatedRow.rateFND = sumRatesToString(
              updatedRow.knittingYarnRate,
              updatedRow.dyeingRate
            );
          }

          return updatedRow;
        }
        return r;
      })
    );
  };

  // Parties (Dropdown)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [partyRes] = await Promise.all([
          api.get(`/party/category/Finishing`),
        ]);
        setAllParties(Array.isArray(partyRes.data) ? partyRes.data : []);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load party list", "error");
      }
    };
    loadInitialData();
  }, []);

  // Lot Modal Logic (Load from Dyeing Inward)
  useEffect(() => {
    api
      .get("/dyeing-inward")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const lots: LotFromDyeingInward[] = [];
        data.forEach((doc: any) => {
          if (Array.isArray(doc.rows)) {
            doc.rows.forEach((row: any) => {
              lots.push({
                fabricLotNo: row.fabricLotNo || "",
                fabric: row.fabric || row.item || row.itemName || "",
                shade: row.shade || "",
                rolls: row.rolls || row.roll || 0,
                weight: row.weight || 0,
                knittingYarnRate: row.knittingYarnRate || "",
                dyeingRate: row.dyeingRate || "",
              });
            });
          }
        });
        setDyeingInwardLots(lots);
      })
      .catch((err) => {
        console.error("Error loading dyeing inward lots:", err);
        Swal.fire("Error", "Failed to load lot numbers", "error");
      });
  }, []);

  const openLotModal = (rowId: number) => {
    setCurrentRowId(rowId);
    setLotSearchText("");
    setSelectedLotNos(new Set());
    setShowLotModal(true);
  };

  // Quick add single lot
  const quickAddLot = (lot: LotFromDyeingInward) => {
    setSelectedLotNos(new Set([String(lot.fabricLotNo || "")]));
    addSelectedLotsToRow([lot]);
  };

  // Toggle checkbox for multi-select
  const toggleLotSelect = (lotNo: string) => {
    setSelectedLotNos((prev) => {
      const next = new Set(prev);
      const key = String(lotNo || "");
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Utility: is row "empty" placeholder (so we can reuse it)
  const isRowEmpty = (r: RowData) =>
    !String(r.lotNo || "").trim() &&
    !String(r.itemName || "").trim() &&
    !String(r.weight || "").trim() &&
    !String(r.rolls || "").trim();

  // Add selected lots to current row
  // Fix: fill subsequent empty rows first instead of appending (prevents skipping second row)
  const addSelectedLotsToRow = (lotsExplicit?: LotFromDyeingInward[]) => {
    const selectedLotsArr =
      lotsExplicit ||
      dyeingInwardLots.filter((l) =>
        selectedLotNos.has(String(l.fabricLotNo || ""))
      );

    if (currentRowId === null || selectedLotsArr.length === 0) {
      if (selectedLotsArr.length === 0) {
        Swal.fire("Info", "No lots selected", "info");
      }
      return;
    }

    setRows((prevRows) => {
      const next = [...prevRows];
      let idx = next.findIndex((r) => r.id === currentRowId);
      if (idx === -1) idx = 0;

      const fillRowFromLot = (
        row: RowData,
        lot: LotFromDyeingInward
      ): RowData => {
        const rateFNDsum = sumRatesToString(
          lot.knittingYarnRate ?? "",
          lot.dyeingRate ?? ""
        );
        const updated: RowData = {
          ...row,
          lotNo: String(lot.fabricLotNo || ""),
          itemName: String(lot.fabric || ""),
          shade: String(lot.shade || ""),
          rolls: String(lot.rolls ?? ""),
          weight: String(lot.weight ?? ""),
          knittingYarnRate: String(lot.knittingYarnRate ?? ""),
          dyeingRate: String(lot.dyeingRate ?? ""),
          rateFND: rateFNDsum,
          // keep existing finishing rate if present; user enters this manually (field removed from form UI)
          rate: row.rate || "",
        };
        updated.amount = computeAmountByWeight(updated.rate, updated.weight);
        return updated;
      };

      // First lot -> current row
      const first = selectedLotsArr[0];
      next[idx] = fillRowFromLot(next[idx], first);

      // Subsequent lots -> fill next empty rows after idx first
      let remaining = selectedLotsArr.slice(1);

      if (remaining.length > 0) {
        // Find indices after idx that are empty
        const emptyTargets: number[] = [];
        for (let i = idx + 1; i < next.length; i++) {
          if (isRowEmpty(next[i])) emptyTargets.push(i);
        }

        // Fill as many empties as we have remaining lots
        for (let t = 0; t < emptyTargets.length && remaining.length > 0; t++) {
          const targetIdx = emptyTargets[t];
          const lot = remaining.shift()!;
          next[targetIdx] = fillRowFromLot(next[targetIdx], lot);
        }

        // If still remaining, append new rows
        if (remaining.length > 0) {
          let nextId = next.reduce((m, r) => Math.max(m, r.id), 0);
          while (remaining.length > 0) {
            const lot = remaining.shift()!;
            nextId += 1;
            const newRow: RowData = fillRowFromLot(createNewRow(nextId), lot);
            next.push(newRow);
          }
        }
      }

      return next;
    });

    setShowLotModal(false);
    setCurrentRowId(null);
    setSelectedLotNos(new Set());
  };

  // Debounce search text for lots
  useEffect(() => {
    const h = setTimeout(() => setLotSearchQuery(lotSearchText), 200);
    return () => clearTimeout(h);
  }, [lotSearchText]);

  const filteredLots = useMemo(() => {
    const q = lotSearchQuery.trim().toLowerCase();
    if (!q) return dyeingInwardLots;
    const tokens = q.split(/\s+/).filter(Boolean);

    const matches = (l: LotFromDyeingInward) => {
      const f = [
        String(l.fabricLotNo || "").toLowerCase(),
        String(l.fabric || "").toLowerCase(),
        String(l.shade || "").toLowerCase(),
        String(l.rolls ?? "").toLowerCase(),
        String(l.weight ?? "").toLowerCase(),
        String(l.knittingYarnRate ?? "").toLowerCase(),
        String(l.dyeingRate ?? "").toLowerCase(),
      ];
      return tokens.every((t) => f.some((v) => v.includes(t)));
    };

    return dyeingInwardLots.filter(matches);
  }, [dyeingInwardLots, lotSearchQuery]);

  const allVisibleSelected = useMemo(() => {
    if (filteredLots.length === 0) return false;
    return filteredLots.every((l) =>
      selectedLotNos.has(String(l.fabricLotNo || ""))
    );
  }, [filteredLots, selectedLotNos]);

  const toggleSelectAllVisible = () => {
    setSelectedLotNos((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredLots.forEach((l) => next.delete(String(l.fabricLotNo || "")));
      } else {
        filteredLots.forEach((l) => next.add(String(l.fabricLotNo || "")));
      }
      return next;
    });
  };

  // --- Auto-generate challan number ---
  const autoGenerateChallanNo = useCallback(async () => {
    const year = new Date().getFullYear();
    try {
      const res = await api.get("/finishing-outwards");
      const data = Array.isArray(res.data) ? res.data : [];
      const re = new RegExp(`^P-${year}/(\\d{4})$`);
      let maxNum = 0;

      data.forEach((doc: any) => {
        const cn = doc.challanNo || "";
        const m = cn.match(re);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n)) maxNum = Math.max(maxNum, n);
        }
      });

      const next = (maxNum + 1).toString().padStart(4, "0");
      setChallanNo(`P-${year}/${next}`);
    } catch {
      setChallanNo(`P-${year}/0001`);
    }
  }, []);

  useEffect(() => {
    autoGenerateChallanNo();
  }, [autoGenerateChallanNo]);

  // === Save / Update / Delete ===
  const buildPayload = (rowsForPayload: RowData[]) => ({
    dated: date,
    partyId,
    partyName,
    challanNo,
    vehicleNo,
    through,
    narration,
    rows: rowsForPayload.map((r) => ({
      lotNo: r.lotNo,
      itemName: r.itemName,
      shade: r.shade,
      mcSize: r.mcSize,
      greyGsm: r.greyGsm,
      regdGsm: r.regdGsm,
      knittingYarnRate: r.knittingYarnRate,
      dyeingRate: r.dyeingRate,
      rateFND: r.rateFND, // sum of KYR + Dyeing
      rate: r.rate, // finishing rate (still sent for compatibility; form input removed)
      rolls: r.rolls,
      weight: r.weight,
      clothWeight: r.clothWeight,
      ribWeight: r.ribWeight,
      amount: r.amount,
    })),
  });

  const buildCurrentHeader = () => ({
    dated: date,
    partyId,
    partyName,
    challanNo,
    vehicleNo,
    through,
    narration,
  });

  const resetForm = () => {
    setRows([createNewRow(1)]);
    setOriginalRows([]);
    setSelectedRowIds([]);
    setPartyName("");
    setPartyId("");
    setDate(todayISO()); // auto to today's date again
    setVehicleNo("");
    setThrough("");
    setNarration("");
    setEditingId(null);
    autoGenerateChallanNo();
  };

  // Validation: Party + Date + at least one selected row with Lot No
  const validateCore = (rowsToValidate: RowData[]) => {
    const partySelected =
      (partyId && String(partyId).trim()) || (partyName && partyName.trim());
    if (!partySelected) {
      Swal.fire("Validation Error", "Party is required", "warning");
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

  const handleCreate = async () => {
    const selected = rows.filter((r) => selectedRowIds.includes(r.id));
    if (!validateCore(selected)) return;

    try {
      setLoading(true);
      await api.post("/finishing-outwards", buildPayload(selected));

      // Store the last saved header+rows so "Issue To" can use it automatically
      lastSavedRef.current = {
        header: buildCurrentHeader(),
        rows: selected,
      };

      Swal.fire("Success", "Finishing outward saved!", "success");
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

  // Update without deleting unchecked rows:
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

      await api.put(
        `/finishing-outwards/${editingId}`,
        buildPayload(finalRows)
      );

      // Also consider latest update as "last saved" for Issue To
      lastSavedRef.current = {
        header: buildCurrentHeader(),
        rows: finalRows,
      };

      Swal.fire("Success", "Finishing outward updated!", "success");
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
        await api.delete(`/finishing-outwards/${editingId}`);
        Swal.fire("Deleted", "Record deleted successfully", "success");
        resetForm();
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  // === View List / Edit / Delete ===
  const openList = async () => {
    try {
      const res = await api.get("/finishing-outwards");
      const data = Array.isArray(res.data) ? res.data : [];
      setFinishingOutwardList(data);
      setShowList(true);
    } catch (err) {
      console.error("List Load Error:", err);
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

  const handleEditFromList = async (id: IdLike) => {
    try {
      const res = await api.get(`/finishing-outwards/${id}`);
      const data = res.data;

      setEditingId(id);
      setChallanNo(data.challanNo || challanNo);

      const editDate = toInputDate(data.dated || data.date) || todayISO();
      setDate(editDate);

      setPartyName(data.partyName || "");
      if (data.partyId) setPartyId(String(data.partyId));
      else {
        const match = allParties.find((p) => p.partyName === data.partyName);
        setPartyId(match ? String(match.id) : "");
      }
      setVehicleNo(data.vehicleNo || "");
      setThrough(data.through || "");
      setNarration(data.narration || "");

      const mapped: RowData[] = (Array.isArray(data.rows) ? data.rows : []).map(
        (r: any, idx: number) => ({
          id: idx + 1, // local stable id for this edit session
          lotNo: String(r.lotNo || r.fabricLotNo || ""),
          itemName: String(r.itemName || r.item || r.fabric || ""),
          shade: String(r.shade || ""),
          mcSize: String(r.mcSize || r.mcsize || ""),
          greyGsm: String(r.greyGsm || r.greyGSM || ""),
          regdGsm: String(r.regdGsm || r.regdGSM || ""),
          knittingYarnRate: String(r.knittingYarnRate || ""),
          dyeingRate: String(r.dyeingRate || ""),
          rateFND: String(r.rateFND || ""),
          rate: String(r.rate || ""),
          rolls: String(r.rolls || ""),
          weight: String(r.weight || ""),
          clothWeight: String(r.clothWeight || r.clothWt || ""),
          ribWeight: String(r.ribWeight || r.ribWt || ""),
          amount: String(r.amount || toNum(r.rate) * toNum(r.weight) || ""),
        })
      );
      setRows(mapped);
      setOriginalRows(mapped);
      setSelectedRowIds(mapped.map((r) => r.id));
      setShowList(false);
    } catch (err) {
      console.error("Error", err);
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
        await api.delete(`/finishing-outwards/${id}`);
        setFinishingOutwardList((prev) =>
          prev.filter((x: any) => (x.id ?? x._id) !== id)
        );
        Swal.fire("Deleted", "Record deleted successfully", "success");
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  // === Print (prints all rows) ===
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalRolls = rows.reduce(
      (sum, r) => sum + (parseFloat(r.rolls) || 0),
      0
    );
    const totalAmountNum = rows.reduce(
      (sum, r) => sum + (parseFloat(r.amount) || 0),
      0
    );

    const html = `
      <html>
        <head>
          <title>Finishing Outward - ${challanNo}</title>
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
          <h2>Finishing Outward / Issue</h2>
          <div class="info">
            <p><b>Date:</b> ${date}</p>
            <p><b>Party:</b> ${partyName}</p>
            <p><b>Challan No:</b> ${challanNo}</p>
            <p><b>Vehicle No:</b> ${vehicleNo}</p>
            <p><b>Through:</b> ${through}</p>
            <p><b>Narration:</b> ${narration}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fabric Lot No</th>
                <th>Fabrication Name</th>
                <th>Shade</th>
                <th>Weight</th>
                <th>M/C Size</th>
                <th>Grey GSM</th>
                <th>Regd GSM</th>
                <th>KYR + Dyeing (Sum)</th>
                <th>Rolls</th>
                <th>Cloth Wt</th>
                <th>Rib Wt</th>
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
                  <td>${r.weight}</td>
                  <td>${r.mcSize}</td>
                  <td>${r.greyGsm}</td>
                  <td>${r.regdGsm}</td>
                  <td>${r.rateFND}</td>
                  <td>${r.rolls}</td>
                  <td>${r.clothWeight}</td>
                  <td>${r.ribWeight}</td>
                  <td>${r.amount}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Rolls: ${totalRolls}</p>
            <p>Total Amount: ₹${totalAmountNum.toFixed(2)}</p>
          </div>
          <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // === Issue To -> Finishing Inward
  // If there is a recently saved document (lastSavedRef), use it automatically.
  // Otherwise, fall back to selected rows (existing behavior).
  const handleIssueTo = async () => {
    let headerToSend: {
      dated: string;
      partyId: string;
      partyName: string;
      challanNo: string;
      vehicleNo: string;
      through: string;
      narration: string;
    } | null = null;
    let rowsToSend: RowData[] = [];

    if (lastSavedRef.current) {
      headerToSend = lastSavedRef.current.header;
      rowsToSend = lastSavedRef.current.rows;
    } else {
      rowsToSend = rows.filter((r) => selectedRowIds.includes(r.id));
      if (rowsToSend.length === 0) {
        Swal.fire(
          "No Selection",
          "Please select at least one row to issue.",
          "warning"
        );
        return;
      }
      headerToSend = buildCurrentHeader();
    }

    const result = await Swal.fire({
      title: "Issue To",
      text: lastSavedRef.current
        ? "Proceed to Finishing Inward with the recently saved item?"
        : "Proceed to Finishing Inward with selected rows?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Finishing Inward",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      Swal.fire("Redirecting", "Opening Finishing Inward...", "info");
      setTimeout(() => {
        navigate("/knitting/finishing/inward-challan", {
          state: {
            fromOutward: {
              header: headerToSend,
              rows: rowsToSend,
            },
          },
        });
      }, 400);
    }
  };

  // --- Totals ---
  const totalRolls = rows.reduce(
    (sum, r) => sum + (parseFloat(r.rolls) || 0),
    0
  );
  const totalAmount = rows
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    .toFixed(2);

  // Debounce global search input for view list
  useEffect(() => {
    const h = setTimeout(() => setSearchQuery(searchText), 250);
    return () => clearTimeout(h);
  }, [searchText]);

  // Improved search with robust party filtering:
  // - Free text matches include party name
  // - key: party:xyz (also supports p: and pn:) works reliably
  // - Supports numeric comparators: amount, weight, rolls, rate
  const filteredList = useMemo(() => {
    const s = searchQuery.trim();
    if (!s) return finishingOutwardList;

    // split by spaces but keep quoted strings intact
    const rawTokens = s.match(/"[^"]+"|\S+/g) || [];
    const tokens = rawTokens.map((t) =>
      t.replace(/^"(.*)"$/, "$1").toLowerCase()
    );

    const normalize = (v: any) =>
      String(v ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const parseComparator = (tok: string) => {
      const m = tok.match(
        /^(amount|weight|rolls|rate)\s*(<=|>=|=|<|>)\s*([0-9]+(?:\.[0-9]+)?)$/
      );
      if (!m) return null;
      return {
        field: m[1] as "amount" | "weight" | "rolls" | "rate",
        op: m[2] as "<=" | ">=" | "=" | "<" | ">",
        value: parseFloat(m[3]),
      };
    };

    const keyMatch = (key: string, hay: string) =>
      normalize(hay).includes(normalize(key));

    const recordMatches = (x: any) => {
      const rowsArr = Array.isArray(x.rows) ? x.rows : [];

      // Aggregates
      const lotNosStr = uniq(
        rowsArr.map((r: any) => r.lotNo || r.fabricLotNo)
      ).join(", ");
      const itemsStr = uniq(
        rowsArr.map((r: any) => r.itemName || r.item || r.fabric)
      ).join(", ");
      const shadeStr = uniq(rowsArr.map((r: any) => r.shade)).join(", ");
      const totalWeight = rowsArr.reduce(
        (sum: number, r: any) => sum + toNum(r.weight),
        0
      );
      const totalRolls = rowsArr.reduce(
        (sum: number, r: any) => sum + toNum(r.rolls),
        0
      );
      const totalAmount = rowsArr.reduce((sum: number, r: any) => {
        const amt = toNum(r.amount);
        const fallback = toNum(r.rate) * toNum(r.weight);
        return sum + (amt || fallback);
      }, 0);

      const dateStr = x.dated
        ? new Date(x.dated).toLocaleDateString()
        : x.date
        ? new Date(x.date).toLocaleDateString()
        : "";

      const partyStr =
        x.partyName || x.party || x.party_name || x.partyname || "";

      // Build free-text haystack
      const haystack = [
        x.challanNo,
        partyStr,
        x.vehicleNo,
        x.through,
        x.narration,
        dateStr,
        lotNosStr,
        itemsStr,
        shadeStr,
        ...rowsArr.flatMap((r: any) => [
          r.rate,
          r.rateFND,
          r.knittingYarnRate,
          r.dyeingRate,
          r.weight,
          r.rolls,
          r.amount,
        ]),
      ]
        .map(normalize)
        .join(" ");

      // Evaluate tokens
      for (const rawTok of tokens) {
        const tok = rawTok.trim();

        // numeric comparators
        const comp = parseComparator(tok);
        if (comp) {
          const cmp = (a: number, b: number) =>
            comp.op === ">"
              ? a > b
              : comp.op === "<"
              ? a < b
              : comp.op === ">="
              ? a >= b
              : comp.op === "<="
              ? a <= b
              : a === b;

          if (comp.field === "amount") {
            if (!cmp(totalAmount, comp.value)) return false;
            continue;
          }
          if (comp.field === "weight") {
            if (!cmp(totalWeight, comp.value)) return false;
            continue;
          }
          if (comp.field === "rolls") {
            if (!cmp(totalRolls, comp.value)) return false;
            continue;
          }
          if (comp.field === "rate") {
            // any row rate matches comparator
            const anyRate = rowsArr.some((r: any) =>
              cmp(toNum(r.rate), comp.value)
            );
            if (!anyRate) return false;
            continue;
          }
        }

        // key:value tokens
        const kv = tok.split(":");
        if (kv.length === 2) {
          const [kRaw, vRaw] = kv;
          const k = kRaw.trim();
          const v = vRaw.trim();
          if (!v) continue;

          if (["party", "p", "pn", "name"].includes(k)) {
            if (!keyMatch(v, partyStr)) return false;
            continue;
          }
          if (k === "challan") {
            if (!keyMatch(v, x.challanNo || "")) return false;
            continue;
          }
          if (k === "lot") {
            if (!keyMatch(v, lotNosStr)) return false;
            continue;
          }
          if (k === "item" || k === "fabric") {
            if (!keyMatch(v, itemsStr)) return false;
            continue;
          }
          if (k === "shade") {
            if (!keyMatch(v, shadeStr)) return false;
            continue;
          }
          if (k === "vehicle") {
            if (!keyMatch(v, x.vehicleNo || "")) return false;
            continue;
          }
          if (k === "through") {
            if (!keyMatch(v, x.through || "")) return false;
            continue;
          }
          if (k === "narration") {
            if (!keyMatch(v, x.narration || "")) return false;
            continue;
          }
          if (k === "date") {
            if (!keyMatch(v, dateStr)) return false;
            continue;
          }
        }

        // fall back to free-text (includes party name as part of haystack)
        if (!haystack.includes(normalize(tok))) return false;
      }

      return true;
    };

    return finishingOutwardList.filter(recordMatches);
  }, [finishingOutwardList, searchQuery]);

  return (
    <Dashboard>
      <div className="p-2 min-m-screen text-sm flex justify-center">
        <div className="bg-white p-2 rounded shadow-xl w-full max-w-7xl">
          <h2 className="text-3xl font-bold text-center mb-3 text-gray-800">
            Finishing Outward / Issue
          </h2>

          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 mb-4">
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={partyId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPartyId(id);
                  const selected = allParties.find((p) => String(p.id) === id);
                  setPartyName(selected?.partyName || "");
                }}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Party</option>
                {allParties.map((party) => (
                  <option key={party.id} value={String(party.id)}>
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Party Challan No.</label>
              <input
                type="text"
                value={challanNo}
                readOnly
                className="border p-2 rounded w-full bg-gray-100 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full text-x focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold">Vehicle No.</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="border p-2 rounded w-full text-sm focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold">Through</label>
              <input
                type="text"
                value={through}
                onChange={(e) => setThrough(e.target.value)}
                className="border p-2 rounded w-full text-sm focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold">Narration</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="border p-2 rounded w-full text-sm focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="max-w-full overflow-x-scroll mb-4 border rounded">
            <table className="min-w-[1500px] border text-xs table-auto">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allRowsSelected}
                      onChange={toggleSelectAllRows}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="border p-2 w-10">Sr No</th>
                  <th className="border p-2 w-28">Fabric Lot No</th>
                  <th className="border p-2 w-36">Fabrication Name</th>
                  <th className="border p-2 w-24">Shade</th>
                  <th className="border p-2 w-20">Weight</th>
                  <th className="border p-2 w-24">M/C Size</th>
                  <th className="border p-2 w-24">Grey GSM</th>
                  <th className="border p-2 w-24">Regd GSM</th>
                  <th className="border p-2 w-28">KYR + Dyeing (Sum)</th>
                  {/* Finishing Rate column removed from form */}
                  <th className="border p-2 w-20">Rolls</th>
                  <th className="border p-2 w-24">Cloth Wt.</th>
                  <th className="border p-2 w-24">Rib Wt.</th>
                  <th className="border p-2 w-24">Amount</th>
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
                          checked={isChecked}
                          onChange={() => toggleRowSelect(row.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>

                      <td className="border p-1 text-center font-medium">
                        {index + 1}
                      </td>

                      {/* Fabric Lot No: open modal on click */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.lotNo}
                          readOnly
                          onClick={() => openLotModal(row.id)}
                          className="w-full p-1 text-xs focus:ring-1 focus:ring-indigo-500 rounded border-none cursor-pointer bg-yellow-50"
                          placeholder="Click to select"
                          title="Click to select lot from Dyeing Inward"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.itemName}
                          onChange={(e) =>
                            handleChange(row.id, "itemName", e.target.value)
                          }
                          className="w-full p-1 text-xs rounded border-none"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.shade}
                          onChange={(e) =>
                            handleChange(row.id, "shade", e.target.value)
                          }
                          className="w-full p-1 text-xs rounded border-none"
                        />
                      </td>
                      <td className="border p-1 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={row.weight}
                          onChange={(e) =>
                            handleChange(row.id, "weight", e.target.value)
                          }
                          className="w-full p-1 text-xs text-right rounded border-none"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.mcSize}
                          onChange={(e) =>
                            handleChange(row.id, "mcSize", e.target.value)
                          }
                          className="w-full p-1 text-xs rounded border-none"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.greyGsm}
                          onChange={(e) =>
                            handleChange(row.id, "greyGsm", e.target.value)
                          }
                          className="w-full p-1 text-xs rounded border-none"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.regdGsm}
                          onChange={(e) =>
                            handleChange(row.id, "regdGsm", e.target.value)
                          }
                          className="w-full p-1 text-xs rounded border-none"
                        />
                      </td>

                      {/* KYR + Dyeing (Sum) - read only */}
                      <td className="border p-1 text-right">
                        <input
                          type="text"
                          value={row.rateFND}
                          readOnly
                          className="w-full p-1 text-xs text-right rounded border-none bg-gray-100"
                          title={`KYR: ${
                            row.knittingYarnRate || "-"
                          } + Dyeing: ${row.dyeingRate || "-"} = ${
                            row.rateFND || "-"
                          }`}
                        />
                      </td>

                      {/* Finishing Rate field removed from the form UI */}

                      <td className="border p-1 text-right">
                        <input
                          type="number"
                          value={row.rolls}
                          onChange={(e) =>
                            handleChange(row.id, "rolls", e.target.value)
                          }
                          className="w-full p-1 text-xs text-right rounded border-none"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.clothWeight}
                          onChange={(e) =>
                            handleChange(row.id, "clothWeight", e.target.value)
                          }
                          className="w-full p-1 text-xs text-right rounded border-none"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.ribWeight}
                          onChange={(e) =>
                            handleChange(row.id, "ribWeight", e.target.value)
                          }
                          className="w-full p-1 text-xs text-right rounded border-none"
                        />
                      </td>

                      {/* Amount (Read Only) */}
                      <td className="border p-1 text-right font-semibold bg-gray-100">
                        {row.amount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Buttons and Totals */}
          <div className="flex flex-col md:flex-row justify-between items-center text-sm">
            <div className="flex flex-wrap gap-2 mb-2 md:mb-0 items-center">
              <button
                onClick={addRow}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm transition duration-150"
              >
                Add New
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition duration-150 disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition duration-150 disabled:opacity-60"
              >
                Update
              </button>
              <button
                onClick={handleDeleteCurrent}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition duration-150"
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
                Issue To
              </button>

              <span className="ml-2 text-gray-600">
                Selected: <b>{selectedRowIds.length}</b> / {rows.length}
              </span>
            </div>

            <div className="text-right font-bold space-y-1">
              <p>
                Total Rolls:{" "}
                <span className="text-indigo-700 ml-2">{totalRolls}</span>
              </p>
              <p>
                Total Amount:{" "}
                <span className="text-indigo-700 ml-2">{totalAmount}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LOT SELECTION MODAL */}
      {showLotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center">
          <div
            id="lot-modal"
            className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-3xl max-h-[80vh] flex flex-col"
          >
            <div className="p-3 bg-gray-800 text-white font-bold text-lg flex items-center justify-between">
              <span>Select Lot (From Dyeing Inward)</span>
              <span className="text-sm font-normal">
                Selected: {selectedLotNos.size}
              </span>
            </div>

            <div className="p-3">
              <input
                type="text"
                placeholder="Search by lot, fabric, shade, rolls, weight, rates..."
                value={lotSearchText}
                onChange={(e) => setLotSearchText(e.target.value)}
                className="border p-2 rounded w-full mb-3 text-sm"
              />

              <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
                <div>Total lots available: {dyeingInwardLots.length}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAllVisible}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs transition duration-150"
                  >
                    {allVisibleSelected ? "Unselect Visible" : "Select Visible"}
                  </button>
                  <button
                    onClick={() => addSelectedLotsToRow()}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition duration-150"
                  >
                    Add Selected
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[50vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 border-b text-center w-10">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                        />
                      </th>
                      <th className="p-2 border-b text-left">Fabric Lot No</th>
                      <th className="p-2 border-b text-left">
                        Fabrication Name
                      </th>
                      <th className="p-2 border-b text-left">Shade</th>
                      <th className="p-2 border-b text-right">Rolls</th>
                      <th className="p-2 border-b text-right">Weight</th>
                      <th className="p-2 border-b text-right">
                        KYR Dyeing Sum
                      </th>
                      <th className="p-2 border-b"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLots.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-4 text-center text-gray-500"
                        >
                          {dyeingInwardLots.length === 0
                            ? "No lots found. Please save Dyeing Inward records first."
                            : "No matching lot numbers found."}
                        </td>
                      </tr>
                    ) : (
                      filteredLots.map((lot, idx) => {
                        const key = String(lot.fabricLotNo || "");
                        const checked = selectedLotNos.has(key);
                        const sum = sumRatesToString(
                          lot.knittingYarnRate ?? "",
                          lot.dyeingRate ?? ""
                        );
                        return (
                          <tr key={idx} className="hover:bg-gray-100 border-b">
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLotSelect(key)}
                              />
                            </td>
                            <td className="p-2">{lot.fabricLotNo}</td>
                            <td className="p-2">{lot.fabric}</td>
                            <td className="p-2">{lot.shade}</td>
                            <td className="p-2 text-right">{lot.rolls}</td>
                            <td className="p-2 text-right">
                              {Number(lot.weight || 0).toFixed(3)}
                            </td>
                            <td className="p-2 text-right">{sum}</td>
                            <td className="p-2 text-right">
                              <button
                                onClick={() => quickAddLot(lot)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs transition duration-150"
                              >
                                Add
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 text-right border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowLotModal(false);
                    setCurrentRowId(null);
                    setSelectedLotNos(new Set());
                  }}
                  className="text-gray-700 hover:text-gray-900 px-3 py-1 rounded border border-gray-300 bg-white text-sm transition duration-150"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW LIST MODAL */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-7xl max-h-[90vh] border border-gray-300 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white font-semibold text-lg sticky top-0 z-20 shadow">
              <span>Finishing Outward List</span>
              <button
                onClick={() => setShowList(false)}
                className="text-white hover:text-gray-200 text-1xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-5 border-b border-gray-200">
              <input
                type="text"
                placeholder='🔍 Search (e.g. party:xyz lot:F121 amount>1000 date:"10/2025")'
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg px-3 py-2 w-full text-sm outline-none"
              />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-5 pb-5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-[1500px] w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10 text-gray-700 shadow-sm">
                  <tr>
                    <th className="px-3 py-2 border border-gray-200">#</th>
                    <th className="px-3 py-2 border border-gray-200">
                      Fabric Lot No
                    </th>
                    <th className="px-3 py-2 border border-gray-200">
                      Fabrication Name
                    </th>
                    <th className="px-3 py-2 border border-gray-200">Shade</th>
                    <th className="px-3 py-2 border border-gray-200 text-right">
                      Weight
                    </th>
                    <th className="px-3 py-2 border border-gray-200">
                      KYR + Dyeing (Sum) Rate
                    </th>
                    <th className="px-3 py-2 border border-gray-200 text-right">
                      Rolls
                    </th>
                    {/* <th className="px-3 py-2 border border-gray-200 text-right">
                      Finishing Rate
                    </th> */}
                    <th className="px-3 py-2 border border-gray-200 text-right">
                      Amount
                    </th>
                    <th className="px-3 py-2 border border-gray-200">
                      Party Name
                    </th>
                    <th className="px-3 py-2 border border-gray-200">
                      Party Challan No
                    </th>
                    <th className="px-3 py-2 border border-gray-200">Dated</th>
                    <th className="px-3 py-2 border border-gray-200 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="p-5 text-center text-gray-500 italic border border-gray-200"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((entry: any, index: number) => {
                      const rowsArr = Array.isArray(entry.rows)
                        ? entry.rows
                        : [];
                      const recId: IdLike = entry.id ?? entry._id;

                      const lotNosStr = uniq(
                        rowsArr.map((r: any) => r.lotNo || r.fabricLotNo)
                      ).join(", ");
                      const itemsStr = uniq(
                        rowsArr.map(
                          (r: any) => r.itemName || r.item || r.fabric
                        )
                      ).join(", ");
                      const shadeStr = uniq(
                        rowsArr.map((r: any) => r.shade)
                      ).join(", ");
                      const totalWeight = rowsArr.reduce(
                        (sum: number, r: any) => sum + toNum(r.weight),
                        0
                      );
                      // const finishingRatesStr = uniq(
                      //   rowsArr.map((r: any) => r.rate || r.finishingRate)
                      // ).join(", ");

                      const ratesStr = uniq(
                        rowsArr.map((r: any) => r.rateFND)
                      ).join(", ");
                      const totalRolls = rowsArr.reduce(
                        (sum: number, r: any) => sum + toNum(r.rolls),
                        0
                      );
                      const totalAmount = rowsArr.reduce(
                        (sum: number, r: any) =>
                          sum +
                          (toNum(r.amount) || toNum(r.rate) * toNum(r.weight)),
                        0
                      );

                      const dateStr = entry.dated
                        ? new Date(entry.dated).toLocaleDateString()
                        : entry.date
                        ? new Date(entry.date).toLocaleDateString()
                        : "";

                      const partyDisplay =
                        entry.partyName ||
                        entry.party ||
                        entry.party_name ||
                        entry.partyname ||
                        "-";

                      return (
                        <tr
                          key={String(recId)}
                          className="hover:bg-indigo-50 transition-colors"
                        >
                          <td className="px-3 py-2 border border-gray-200">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            {lotNosStr || "-"}
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            {itemsStr || "-"}
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            {shadeStr || "-"}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-right">
                            {totalWeight.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            {ratesStr || "-"}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-right">
                            {totalRolls}
                          </td>
                          {/* <td className="px-3 py-2 border border-gray-200 text-right">
                            {finishingRatesStr || "-"}
                          </td> */}

                          <td className="px-3 py-2 border border-gray-200 text-right">
                            ₹{totalAmount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            {partyDisplay}
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            {entry.challanNo || "-"}
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            {dateStr || "-"}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-center space-x-2">
                            <button
                              onClick={() => handleEditFromList(recId)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFromList(recId)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
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

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-right">
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

export default FinishingOutward;
