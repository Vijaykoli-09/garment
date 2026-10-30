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
  receivedWeight: string;
  wastage: string;
  extraWt: string;

  // ✅ NEW (manual entry)
  percentage: string;

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

  // Transfer to Stock checkbox
  const [transferToStock, setTransferToStock] = useState<boolean>(false);

  // This ref holds the recently-saved selection (for auto-issue to stock statement)
  const lastSavedForStockRef = useRef<LastSavedForStock | null>(null);

  // --- Meta ---
  const [loading, setLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<IdLike | null>(null);
  const [, setPrefilledFromOutward] = useState<boolean>(false);

  // --- Party dropdown ---
  const [partyList, setPartyList] = useState<Party[]>([]);

  // --- Finishing Outward docs (to prefill lots by party) ---
  const [finishingOutwardDocs, setFinishingOutwardDocs] = useState<
    FinishingOutwardDoc[]
  >([]);
  const [usedInwardLotNos, setUsedInwardLotNos] = useState<Set<string>>(new Set());
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotSearchText, setLotSearchText] = useState("");
  const [lotSearchQuery, setLotSearchQuery] = useState("");
  const lotSearchInputRef = useRef<HTMLInputElement>(null);
  const [currentRowId, setCurrentRowId] = useState<number | null>(null);
  const [selectedLotNos, setSelectedLotNos] = useState<Set<string>>(new Set());
  const [removedLotKeys, setRemovedLotKeys] = useState<Set<string>>(new Set());

  // --- List modal ---
  const [showList, setShowList] = useState(false);
  const [finishingInwardList, setFinishingInwardList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const listSearchInputRef = useRef<HTMLInputElement>(null);

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
      receivedWeight: "",
      wastage: "",
      extraWt: "",
      percentage: "", // ✅ NEW
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

  // Handle row changes
  // Finishing formula:
  //   Wastage = Weight × Percentage / 100
  //   Percentage = Wastage × 100 / Weight
  // Both fields remain editable. Weight changes recalculate whichever
  // percentage/wastage value is already present.
  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id !== id) return r;

        const u: RowData = { ...r, [field]: value };

        // Amount = Weight × Finishing Rate
        if (field === "rate" || field === "weight") {
          u.amount = calculateAmount(u.rate, u.weight);
        }

        const weightNum = parseFloat(u.weight) || 0;

        if (field === "receivedWeight") {
          const receivedNum = parseFloat(value) || 0;
          if (weightNum > 0) {
            const wastageNum = Math.max(0, weightNum - receivedNum);
            u.wastage = String(Number(wastageNum.toFixed(3)));
            u.percentage = String(Number(((wastageNum * 100) / weightNum).toFixed(4)));
          }
        }

        if (field === "wastage") {
          const wastageNum = Math.max(0, parseFloat(value) || 0);
          if (weightNum > 0) {
            const receivedNum = Math.max(0, weightNum - wastageNum);
            u.receivedWeight = String(Number(receivedNum.toFixed(3)));
            u.percentage = String(Number(((wastageNum * 100) / weightNum).toFixed(4)));
          }
        }

        if (field === "weight" && weightNum > 0) {
          const receivedNum = parseFloat(u.receivedWeight);
          const wastageNum = parseFloat(u.wastage);
          if (u.receivedWeight !== "" && !isNaN(receivedNum)) {
            const w = Math.max(0, weightNum - receivedNum);
            u.wastage = String(Number(w.toFixed(3)));
            u.percentage = String(Number(((w * 100) / weightNum).toFixed(4)));
          } else if (u.wastage !== "" && !isNaN(wastageNum)) {
            const rw = Math.max(0, weightNum - wastageNum);
            u.receivedWeight = String(Number(rw.toFixed(3)));
            u.percentage = String(Number(((wastageNum * 100) / weightNum).toFixed(4)));
          }
        }

        return u;
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

  // Load source lots from Finishing Outward and exclude lots already saved in Finishing Inward.
  useEffect(() => {
    const loadSourceLots = async () => {
      try {
        const [outwardRes, inwardRes] = await Promise.all([
          api.get("/finishing-outwards"),
          api.get("/finishing-inwards"),
        ]);
        const outwardDocs = Array.isArray(outwardRes.data) ? outwardRes.data : [];
        const inwardDocs = Array.isArray(inwardRes.data) ? inwardRes.data : [];
        setFinishingOutwardDocs(outwardDocs);
        const used = new Set<string>();
        inwardDocs.forEach((doc: any) => {
          (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
            const lotNo = String(row.lotNo || row.fabricLotNo || "").trim().toUpperCase();
            const fabric = String(row.itemName || row.item || row.fabric || row.fabricName || "").trim().toUpperCase();
            if (lotNo) used.add(`${lotNo}|${fabric}`);
          });
        });
        setUsedInwardLotNos(used);
      } catch (err) {
        console.error("Error loading Finishing Outward/Inward lots:", err);
        Swal.fire("Error", "Failed to load available lot numbers", "error");
      }
    };
    loadSourceLots();
  }, []);

  // Prefill from Finishing Outward "Issue To" while blocking lots already received in Finishing Inward.
  useEffect(() => {
    const s: any = (location as any)?.state?.fromOutward;
    if (!s) return;

    let cancelled = false;
    const prefillFromOutward = async () => {
      try {
        const hdr = s.header || {};
        const rowsArr: any[] = Array.isArray(s.rows) ? s.rows : [];

        // Refresh saved inward records here too: Issue To must not bypass duplicate-lot protection.
        let usedLots = new Set<string>();
        try {
          const inwardRes = await api.get("/finishing-inwards");
          const inwardDocs = Array.isArray(inwardRes.data) ? inwardRes.data : [];
          inwardDocs.forEach((doc: any) => {
            (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
              const lotNo = String(row.lotNo || row.fabricLotNo || "").trim().toUpperCase();
              const fabric = String(row.itemName || row.item || row.fabric || row.fabricName || "").trim().toUpperCase();
              if (lotNo) usedLots.add(`${lotNo}|${fabric}`);
            });
          });
          if (!cancelled) setUsedInwardLotNos(usedLots);
        } catch (loadError) {
          console.error("Could not refresh existing Finishing Inward lots:", loadError);
        }

        const sourceLotKey = (r: any) => {
          const lotNo = String(r.lotNo || r.fabricLotNo || "").trim().toUpperCase();
          const fabric = String(r.itemName || r.item || r.fabric || r.fabricName || "").trim().toUpperCase();
          return lotNo ? `${lotNo}|${fabric}` : "";
        };
        const duplicates = rowsArr.filter((r: any) => {
          const key = sourceLotKey(r);
          return key && usedLots.has(key);
        });
        const availableRows = rowsArr.filter((r: any) => {
          const key = sourceLotKey(r);
          return !key || !usedLots.has(key);
        });

        if (cancelled) return;
        setPartyName(hdr.partyName || "");
        setChallanNo(hdr.challanNo || "");
        const hdrDate = toInputDate(hdr.dated || hdr.date);
        if (hdrDate) setDate(hdrDate);
        setVehicleNo(hdr.vehicleNo || "");
        setThrough(hdr.through || "");

        const mapped: RowData[] = availableRows.map((r: any, idx: number) => {
          const rateFND = r.rateFND || sumRatesToString(r.knittingYarnRate, r.dyeingRate) || "";
          const weightStr = String(r.weight ?? "");
          const rateStr = ""; // Finishing rate is entered manually.
          return {
            id: idx + 1,
            lotNo: String(r.lotNo || r.fabricLotNo || ""),
            itemName: String(r.itemName || r.item || r.fabric || r.fabricName || ""),
            shade: String(r.shade || ""),
            processing: "",
            rolls: String(r.rolls ?? ""),
            weight: weightStr,
            receivedWeight: String(r.receivedWeight ?? ""),
            wastage: String(r.wastage ?? r.shortage ?? ""),
            percentage: String(r.percentage ?? ""),
            extraWt: String(r.extraWt ?? ""),
            rate: rateStr,
            amount: calculateAmount(rateStr, weightStr),
            rateFND: String(rateFND),
          };
        });

        if (mapped.length) {
          setRows(mapped);
          setSelectedRowIds(mapped.map((x) => x.id));
        } else {
          setRows([createNewRow(1)]);
          setSelectedRowIds([]);
        }

        if (duplicates.length) {
          const duplicateNames = uniq(duplicates.map((r: any) => r.lotNo || r.fabricLotNo)).join(", ");
          Swal.fire({
            title: "Lot Already Exists",
            text: `These lot(s) are already saved in Finishing Inward and were not added again: ${duplicateNames}`,
            icon: "warning",
          });
        }
        setPrefilledFromOutward(true);
      } catch (e) {
        console.error("Prefill from Outward failed:", e);
      }
    };

    prefillFromOutward();
    return () => { cancelled = true; };
  }, [location, createNewRow]);

  // Lot picker: choose a saved Finishing Outward lot manually instead of auto-filling all rows on party selection.
  const openLotModal = (rowId: number) => {
    setCurrentRowId(rowId);
    setLotSearchText("");
    setLotSearchQuery("");
    setSelectedLotNos(new Set());
    setShowLotModal(true);
  };

  const toggleLotSelect = (selectionKey: string) => {
    setSelectedLotNos((prev) => {
      const next = new Set(prev);
      if (next.has(selectionKey)) next.delete(selectionKey);
      else next.add(selectionKey);
      return next;
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setLotSearchQuery(lotSearchText), 200);
    return () => clearTimeout(timer);
  }, [lotSearchText]);

  useEffect(() => {
    if (!showLotModal) return;
    const timer = window.setTimeout(() => {
      lotSearchInputRef.current?.focus();
      lotSearchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showLotModal]);

  useEffect(() => {
    if (!showList) return;
    const timer = window.setTimeout(() => {
      listSearchInputRef.current?.focus();
      listSearchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showList]);

  const availableOutwardLots = useMemo(() => {
    const currentLots = new Set(
      rows
        .filter((r) => r.id !== currentRowId)
        .map((r) => `${String(r.lotNo || "").trim().toUpperCase()}|${String(r.itemName || "").trim().toUpperCase()}`)
        .filter(Boolean)
    );
    const seen = new Set<string>();
    const q = lotSearchQuery.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const lots: any[] = [];

    finishingOutwardDocs.forEach((doc) => {
      if (partyName.trim() && String(doc.partyName || "").trim().toLowerCase() !== partyName.trim().toLowerCase()) return;
      (Array.isArray(doc.rows) ? doc.rows : []).forEach((r: any) => {
        const lotNo = String(r.lotNo || r.fabricLotNo || "").trim();
        const itemName = String(r.itemName || r.item || r.fabric || r.fabricName || "");
        const key = `${lotNo.toUpperCase()}|${itemName.trim().toUpperCase()}`;
        if (removedLotKeys.has(key) || !lotNo || usedInwardLotNos.has(key) || currentLots.has(key) || seen.has(key)) return;
        const shade = String(r.shade || "");
        const rateFND = String(r.rateFND || sumRatesToString(r.knittingYarnRate, r.dyeingRate) || "");
        const candidate = {
          // Lot numbers can repeat for different fabrics; use the composite key for React and selection state.
          selectionKey: key,
          lotNo,
          itemName,
          shade,
          processing: String(r.processing || ""),
          rolls: r.rolls ?? r.roll ?? 0,
          weight: r.weight ?? 0,
          receivedWeight: r.receivedWeight ?? "",
          wastage: r.wastage ?? r.shortage ?? "",
          extraWt: r.extraWt ?? "",
          percentage: r.percentage ?? "",
          rateFND,
          partyName: doc.partyName || "",
        };
        const hay = [candidate.lotNo, candidate.itemName, candidate.shade, candidate.processing, candidate.rolls, candidate.weight, candidate.wastage, candidate.percentage, candidate.rateFND, candidate.partyName].join(" ").toLowerCase();
        if (tokens.every((t) => hay.includes(t))) {
          seen.add(key);
          lots.push(candidate);
        }
      });
    });
    return lots;
  }, [finishingOutwardDocs, usedInwardLotNos, rows, partyName, lotSearchQuery, currentRowId, removedLotKeys]);

  const allVisibleLotsSelected = availableOutwardLots.length > 0 && availableOutwardLots.every((lot) => selectedLotNos.has(lot.selectionKey));

  const addSelectedLotsToRow = (explicitLots?: any[]) => {
    const selectedLots = explicitLots || availableOutwardLots.filter((lot) => selectedLotNos.has(lot.selectionKey));
    if (currentRowId === null || selectedLots.length === 0) {
      if (!selectedLots.length) Swal.fire("Info", "Please select at least one lot", "info");
      return;
    }
    setRows((prev) => {
      const next = [...prev];
      let target = next.findIndex((r) => r.id === currentRowId);
      if (target < 0) target = 0;
      const mapLot = (row: RowData, lot: any): RowData => {
        const weight = String(lot.weight ?? "");
        const rate = row.rate || "";
        return {
          ...row,
          lotNo: String(lot.lotNo || ""),
          itemName: String(lot.itemName || ""),
          shade: String(lot.shade || ""),
          processing: String(lot.processing || ""),
          rolls: String(lot.rolls ?? ""),
          weight,
          receivedWeight: String(lot.receivedWeight ?? ""),
          wastage: String(lot.wastage ?? ""),
          extraWt: String(lot.extraWt ?? ""),
          percentage: String(lot.percentage ?? ""),
          rateFND: String(lot.rateFND || ""),
          rate,
          amount: calculateAmount(rate, weight),
        };
      };
      next[target] = mapLot(next[target], selectedLots[0]);
      let nextId = next.reduce((max, row) => Math.max(max, row.id), 0);
      selectedLots.slice(1).forEach((lot) => {
        const emptyIndex = next.findIndex((r) => !String(r.lotNo || "").trim() && !String(r.itemName || "").trim());
        if (emptyIndex >= 0) next[emptyIndex] = mapLot(next[emptyIndex], lot);
        else next.push(mapLot(createNewRow(++nextId), lot));
      });
      return next;
    });
    const maxExistingId = rows.reduce((max, row) => Math.max(max, row.id), 0);
    setSelectedRowIds((prev) => Array.from(new Set([
      ...prev,
      ...rows.map((row) => row.id),
      currentRowId,
      ...selectedLots.slice(1).map((_, index) => maxExistingId + index + 1),
    ].filter((id): id is number => typeof id === "number"))));
    setShowLotModal(false);
    setCurrentRowId(null);
    setSelectedLotNos(new Set());
  };

  // Payload
  const buildPayload = (rowsForPayload: RowData[]) => ({
    dated: date,
    partyName,
    challanNo,
    vehicleNo,
    through,
    transferToStock,
    rows: rowsForPayload.map((r) => ({
      lotNo: r.lotNo,
      itemName: r.itemName,
      shade: r.shade,
      processing: r.processing,
      rolls: r.rolls,
      weight: r.weight,
      receivedWeight: r.receivedWeight,
      wastage: r.wastage,
      extraWt: r.extraWt,

      // ✅ NEW
      percentage: r.percentage,

      rateFND: r.rateFND,
      rate: r.rate,
      amount: r.amount,
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

      lastSavedForStockRef.current = {
        date,
        partyName,
        itemNames: uniq(selected.map((r) => r.itemName)),
        lotNos: uniq(selected.map((r) => r.lotNo)),
        docId: res?.data?.id ?? res?.data?._id,
        challanNo,
      };

      Swal.fire(
        "Success",
        transferToStock
          ? "Saved and transferred to stock!"
          : "Finishing inward saved!",
        "success"
      );

      resetForm();
      try {
        const inwardRes = await api.get("/finishing-inwards");
        const inwardDocs = Array.isArray(inwardRes.data) ? inwardRes.data : [];
        const used = new Set<string>();
        inwardDocs.forEach((doc: any) => (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
          const lotNo = String(row.lotNo || row.fabricLotNo || "").trim().toUpperCase();
          const fabric = String(row.itemName || row.item || row.fabric || row.fabricName || "").trim().toUpperCase();
          if (lotNo) used.add(`${lotNo}|${fabric}`);
        }));
        setUsedInwardLotNos(used);
      } catch (refreshError) { console.error("Could not refresh used inward lots:", refreshError); }
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

  // Update (merge)
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
      try {
        const inwardRes = await api.get("/finishing-inwards");
        const inwardDocs = Array.isArray(inwardRes.data) ? inwardRes.data : [];
        const used = new Set<string>();
        inwardDocs.forEach((doc: any) => (Array.isArray(doc.rows) ? doc.rows : []).forEach((row: any) => {
          const lotNo = String(row.lotNo || row.fabricLotNo || "").trim().toUpperCase();
          const fabric = String(row.itemName || row.item || row.fabric || row.fabricName || "").trim().toUpperCase();
          if (lotNo) used.add(`${lotNo}|${fabric}`);
        }));
        setUsedInwardLotNos(used);
      } catch (refreshError) {
        console.error("Could not refresh used inward lots after update:", refreshError);
      }
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
      const data = Array.isArray(res.data) ? [...res.data] : [];
      data.sort((a: any, b: any) => {
        const getTimestamp = (record: any) => {
          const value =
            record.createdAt ||
            record.updatedAt ||
            record.dated ||
            record.date ||
            0;
          const timestamp = new Date(value).getTime();
          return Number.isFinite(timestamp) ? timestamp : 0;
        };
        const timeDifference = getTimestamp(b) - getTimestamp(a);
        if (timeDifference !== 0) return timeDifference;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
      setFinishingInwardList(data);
      setSearchText("");
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
          id: idx + 1,
          lotNo: String(r.lotNo || ""),
          itemName: String(r.itemName || r.item || ""),
          shade: String(r.shade || ""),
          processing: String(r.processing || ""),
          rolls: String(r.rolls ?? ""),
          weight: String(r.weight ?? ""),
          // Keep every controlled input defined when loading an existing record.
          receivedWeight: String(r.receivedWeight ?? ""),
          wastage: String(r.wastage ?? ""),
          percentage: String(r.percentage ?? ""),
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
                <th>Received Weight</th>
                <th>Wastage</th>
                <th>Extra Wt</th>
                <th>%</th>
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
                  <td>${r.receivedWeight}</td>
                  <td>${r.wastage}</td>
                  <td>${r.extraWt}</td>
                  <td>${r.percentage}</td>
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

  // Issue To (stock statement)
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

        const percentageStr = uniq(rowsArr.map((r: any) => r.percentage)).join(
          ", "
        );

        const totalRolls2 = rowsArr.reduce(
          (sum: number, r: any) => sum + toNum(r.rolls),
          0
        );
        const totalWeight2 = rowsArr.reduce(
          (sum: number, r: any) => sum + toNum(r.weight),
          0
        );

        const totalAmount2 = rowsArr.reduce((sum: number, r: any) => {
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
          percentageStr,
          totalRolls: totalRolls2,
          totalWeight: totalWeight2,
          amount: totalAmount2,
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
          row.percentageStr,
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
                onChange={(e) => setPartyName(e.target.value)}
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
                  <th className="border p-2 w-[9%]">Received Weight</th>
                  <th className="border p-2 w-[7%]">Wastage</th>
                  <th className="border p-2 w-[7%]">Extra Wt</th>
                  <th className="border p-2 w-[7%]">%</th>
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

                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.lotNo ?? ""}
                          readOnly
                          onClick={() => openLotModal(row.id)}
                          className="w-full min-w-[110px] p-1 text-xs rounded border-none cursor-pointer bg-yellow-50"
                          placeholder="Click to select"
                          title="Click to select lot from Finishing Outward"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.itemName ?? ""}
                          readOnly
                          className="w-full p-1 text-xs border rounded bg-gray-100"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.shade ?? ""}
                          onChange={(e) =>
                            handleChange(row.id, "shade", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.processing ?? ""}
                          onChange={(e) =>
                            handleChange(row.id, "processing", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.rateFND ?? ""}
                          readOnly
                          className="w-full p-1 text-xs border rounded bg-gray-100 text-right"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="number"
                          value={row.rolls ?? ""}
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
                          value={row.weight ?? ""}
                          onChange={(e) =>
                            handleChange(row.id, "weight", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                        />
                      </td>
                      <td className="border p-1">
                        <input type="number" min="0" value={row.receivedWeight ?? ""}
                          onChange={(e) => handleChange(row.id, "receivedWeight", e.target.value)}
                          className="w-full p-1 text-xs border rounded text-right" placeholder="Received" />
                      </td>

                      <td className="border p-1">
                        <input
                          type="number"
                          step="0.001"
                          value={row.wastage ?? ""}
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
                          value={row.extraWt ?? ""}
                          onChange={(e) =>
                            handleChange(row.id, "extraWt", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.percentage ?? ""}
                          onChange={(e) =>
                            handleChange(row.id, "percentage", e.target.value)
                          }
                          className="w-full p-1 text-xs border rounded text-right"
                          placeholder="%"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="number"
                          step="0.01"
                          value={row.rate ?? ""}
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
                onClick={openList}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition duration-150"
              >
                View List
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-900 text-white rounded text-sm transition duration-150"
              >
                Print
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
                <strong className="text-gray-700">Tot. Wastage:</strong>{" "}
                <span className="text-blue-700">{totalWastage}</span>
              </p>
              <p>
                <strong className="text-gray-700">Total Amount:</strong>{" "}
                <span className="text-blue-700">{totalAmount}</span>
              </p>
            </div>
          </div>

          {/* FINISHING OUTWARD LOT SELECTION MODAL */}
      {showLotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex justify-center items-center p-2">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-5xl max-h-[85vh] flex flex-col">
            <div className="p-3 bg-gray-800 text-white font-bold text-lg flex items-center justify-between">
              <span>Select Lot (From Finishing Outward)</span>
              <span className="text-sm font-normal">Selected: {selectedLotNos.size}</span>
            </div>
            <div className="p-3 flex flex-col min-h-0">
              <input
                ref={lotSearchInputRef}
                type="text"
                autoFocus
                placeholder="Search lot, fabric, shade, party, rolls, weight..."
                value={lotSearchText}
                onChange={(e) => setLotSearchText(e.target.value)}
                className="border p-2 rounded w-full mb-3 text-sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-gray-600">
                <span>Available lots: {availableOutwardLots.length}{partyName ? ` for ${partyName}` : ""}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLotNos((prev) => {
                      const next = new Set(prev);
                      if (allVisibleLotsSelected) availableOutwardLots.forEach((lot) => next.delete(lot.selectionKey));
                      else availableOutwardLots.forEach((lot) => next.add(lot.selectionKey));
                      return next;
                    })}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs"
                  >{allVisibleLotsSelected ? "Unselect Visible" : "Select Visible"}</button>
                  <button type="button" onClick={() => addSelectedLotsToRow()} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">Add Selected</button>
                </div>
              </div>
              <div className="overflow-auto max-h-[55vh] border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 border-b text-center"><input type="checkbox" checked={allVisibleLotsSelected} onChange={() => setSelectedLotNos((prev) => { const next = new Set(prev); if (allVisibleLotsSelected) availableOutwardLots.forEach((lot) => next.delete(lot.selectionKey)); else availableOutwardLots.forEach((lot) => next.add(lot.selectionKey)); return next; })} /></th>
                      <th className="p-2 border-b text-left">Lot No</th><th className="p-2 border-b text-left">Fabrication</th><th className="p-2 border-b text-left">Shade</th><th className="p-2 border-b text-left">Party</th><th className="p-2 border-b text-right">Rolls</th><th className="p-2 border-b text-right">Weight</th><th className="p-2 border-b text-right">Wastage</th><th className="p-2 border-b text-right">%</th><th className="p-2 border-b text-right">Rate Sum</th><th className="p-2 border-b">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableOutwardLots.length === 0 ? (
                      <tr><td colSpan={11} className="p-5 text-center text-gray-500">{finishingOutwardDocs.length === 0 ? "No Finishing Outward records found." : "No available lots found. Lots already used in Finishing Inward are hidden."}</td></tr>
                    ) : availableOutwardLots.map((lot) => (
                      <tr key={lot.selectionKey} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-center"><input type="checkbox" checked={selectedLotNos.has(lot.selectionKey)} onChange={() => toggleLotSelect(lot.selectionKey)} /></td>
                        <td className="p-2 whitespace-nowrap">{lot.lotNo}</td><td className="p-2">{lot.itemName}</td><td className="p-2">{lot.shade}</td><td className="p-2">{lot.partyName}</td><td className="p-2 text-right">{lot.rolls}</td><td className="p-2 text-right">{Number(lot.weight || 0).toFixed(3)}</td><td className="p-2 text-right">{String(lot.wastage ?? "")}</td><td className="p-2 text-right">{String(lot.percentage ?? "")}</td><td className="p-2 text-right">{lot.rateFND}</td>
                        <td className="p-2 text-right"><button type="button" onClick={() => addSelectedLotsToRow([lot])} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs mr-1">Add</button><button type="button" onClick={() => { const k = `${String(lot.lotNo).trim().toUpperCase()}|${String(lot.itemName || "").trim().toUpperCase()}`; setRemovedLotKeys(prev => new Set(prev).add(k)); setSelectedLotNos(prev => { const n = new Set(prev); n.delete(lot.selectionKey); return n; }); }} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 text-right border-t bg-gray-50 mt-3">
                <button type="button" onClick={() => { setShowLotModal(false); setCurrentRowId(null); setSelectedLotNos(new Set()); }} className="text-gray-700 px-3 py-1 rounded border border-gray-300 bg-white text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW LIST MODAL */}
          {showList && (
            <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-200">
                <div className="px-4 py-2 bg-gray-800 text-white font-semibold text-lg flex justify-between items-center">
                  <span>Finishing Inward List</span>
                  <button
                    onClick={() => setShowList(false)}
                    className="text-white hover:text-gray-300 text-1xl leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 border-b border-gray-200">
                  <input
                    ref={listSearchInputRef}
                    type="text"
                    placeholder="🔍 Search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="border border-gray-300 p-2 rounded-lg w-full text-sm outline-none"
                  />
                </div>

                <div className="overflow-auto px-4 pb-4">
                  <table className="min-w-[1400px] w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 border">#</th>
                        <th className="p-2 border">Lot(s)</th>
                        <th className="p-2 border">Item(s)</th>
                        <th className="p-2 border">Shade(s)</th>
                        <th className="p-2 border">Fin Rate</th>
                        <th className="p-2 border">Sum</th>
                        <th className="p-2 border">%</th>
                        <th className="p-2 border text-right">Rolls</th>
                        <th className="p-2 border text-right">Weight</th>
                        <th className="p-2 border">Party</th>
                        <th className="p-2 border text-right">Amount</th>
                        <th className="p-2 border">Challan</th>
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedList.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="p-5 text-center text-gray-500 border">
                            No records found
                          </td>
                        </tr>
                      ) : (
                        aggregatedList.map((r: any, i: number) => (
                          <tr key={String(r.id)} className="hover:bg-gray-50">
                            <td className="p-2 border">{i + 1}</td>
                            <td className="p-2 border">{r.lotNosStr || "-"}</td>
                            <td className="p-2 border">{r.itemsStr || "-"}</td>
                            <td className="p-2 border">{r.shadeStr || "-"}</td>
                            <td className="p-2 border">{r.finishingRatesStr || "-"}</td>
                            <td className="p-2 border">{r.rateFNDsStr || "-"}</td>
                            <td className="p-2 border">{r.percentageStr || "-"}</td>
                            <td className="p-2 border text-right">{r.totalRolls}</td>
                            <td className="p-2 border text-right">{Number(r.totalWeight).toFixed(3)}</td>
                            <td className="p-2 border">{r.partyName}</td>
                            <td className="p-2 border text-right">₹{Number(r.amount).toFixed(2)}</td>
                            <td className="p-2 border">{r.challanNo}</td>
                            <td className="p-2 border">{r.dated}</td>
                            <td className="p-2 border text-center">
                              <button
                                onClick={() => handleEditFromList(r.id)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded mr-2 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFromList(r.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-xs"
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

                <div className="px-5 py-3 bg-gray-50 border-t text-right">
                  <button
                    onClick={() => setShowList(false)}
                    className="px-4 py-2 rounded border bg-white text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Dashboard>
  );
};

export default FinishingInward;