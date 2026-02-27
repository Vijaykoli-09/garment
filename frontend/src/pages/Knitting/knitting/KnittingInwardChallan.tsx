import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

// Default prefix when nothing set
const DEFAULT_LOT_PREFIX = "SR-";

// Extract numeric suffix from lot string, e.g. "SR-0012" -> 12
const parseLot = (s: string): number | null => {
  const m = String(s || "")
    .trim()
    .match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
};

// Get prefix from a single lot string, e.g. "FB-0010" -> "FB-"
const getPrefixFromLot = (lot: string): string => {
  if (!lot) return DEFAULT_LOT_PREFIX;
  const m = lot.match(/^(.*?)(\d+)\s*$/);
  return m ? m[1] || DEFAULT_LOT_PREFIX : DEFAULT_LOT_PREFIX;
};

// Format lot: prefix + 4-digit number
const formatLot = (num: number, prefix: string) =>
  `${prefix}${String(num).padStart(2, "0")}`;

// Max number from rows + 1
const getNextNumberFromRows = (rows: RowData[]): number => {
  let max = 0;
  rows.forEach((r) => {
    const n = parseLot(r.fabricLotNo);
    if (n && n > max) max = n;
  });
  return max + 1;
};

// --- Types ---
interface RowData {
  id: number;
  fabricLotNo: string;
  item: string;
  fabricationName?: string;
  shade: string;
  processing: string;
  rolls: string;
  weight: string;
  knittingRate: string;
  yarnRate?: string;
  unit: string;
  selected: boolean; // row save selection
}

type Fabrication = {
  serialNo: string;
  fabricName: string;
  yarns?: Array<{ yarnSerialNo: string; percent: number }>;
};

type Yarn = { serialNo: string; yarnName: string; rate: number; unit: string };

type FabRow = Fabrication & {
  effectiveRate: number;
  composition: string;
  compositionLines: string[];
};

const KnittingInwardChallan: React.FC = () => {
  const navigate = useNavigate();

  // Current prefix used for auto-generation
  const [currentPrefix, setCurrentPrefix] = useState<string>(DEFAULT_LOT_PREFIX);
  const nextLotRef = useRef<number>(1); // cached next number

  // Rows
  const [rows, setRows] = useState<RowData[]>([]);

  // Header
  const [challanNo, setChallanNo] = useState<string>("");
  const [dated, setDated] = useState<string>("");
  const [accountHead, setAccountHead] = useState<string>("");

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);

  // Totals (overall, UI display)
  const [totalRolls, setTotalRolls] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  // Master Data
  const [partyList, setPartyList] = useState<any[]>([]);
  const [fabricationList, setFabricationList] = useState<any[]>([]);
  const [yarnList, setYarnList] = useState<any[]>([]);

  // View List
  const [showList, setShowList] = useState<boolean>(false);
  const [knittingList, setKnittingList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  // Fabrication selection modal
  const [fabModalOpen, setFabModalOpen] = useState(false);
  const [fabRowId, setFabRowId] = useState<number | null>(null);
  const [fabSearch, setFabSearch] = useState("");
  const [fabRows, setFabRows] = useState<FabRow[]>([]);
  const [selectedFabSerials, setSelectedFabSerials] = useState<Set<string>>(
    new Set()
  );

  // --- INITIAL ROW: only once (React StrictMode safe) ---
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const prefix = DEFAULT_LOT_PREFIX;
    const firstLot = formatLot(1, prefix);
    nextLotRef.current = 2;
    setCurrentPrefix(prefix);

    setRows([
      {
        id: 1,
        fabricLotNo: firstLot,
        item: "",
        fabricationName: "",
        shade: "",
        processing: "",
        rolls: "",
        weight: "",
        knittingRate: "",
        yarnRate: "",
        unit: "Kg",
        selected: false,
      },
    ]);
  }, []);

  // Load Master Data
  useEffect(() => {
    api
      .get("/party/category/Knitting")
      .then((r) => setPartyList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Party load failed", "error"));

    api
      .get("/fabrication")
      .then((r) => setFabricationList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Fabrication load failed", "error"));

    api
      .get("/yarn/list")
      .then((r) => setYarnList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Yarn load failed", "error"));
  }, []);

  // Recalculate totals (based on all rows)
  const recalcTotals = (updated: RowData[]) => {
    let rolls = 0,
      weight = 0,
      amt = 0;
    updated.forEach((r) => {
      const rollsVal = Number(r.rolls) || 0;
      const weightVal = Number(r.weight) || 0;
      const knitRate = Number(r.knittingRate) || 0;
      rolls += rollsVal;
      weight += weightVal;
      amt += weightVal * knitRate;
    });
    setTotalRolls(rolls);
    setTotalWeight(weight);
    setTotalAmount(amt);
  };

  useEffect(() => {
    if (rows.length > 0) recalcTotals(rows);
  }, [rows]);

  // Add new row (always recompute next from existing rows)
  const addRow = useCallback(() => {
    setRows((prev) => {
      const nextId = prev.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const nextNum = getNextNumberFromRows(prev);
      const prefix =
        (currentPrefix && currentPrefix.trim()) || DEFAULT_LOT_PREFIX;
      const newLot = formatLot(nextNum, prefix);
      nextLotRef.current = nextNum + 1;

      return [
        ...prev,
        {
          id: nextId,
          fabricLotNo: newLot,
          item: "",
          fabricationName: "",
          shade: "",
          processing: "",
          rolls: "",
          weight: "",
          knittingRate: "",
          yarnRate: "",
          unit: "Kg",
          selected: false,
        },
      ];
    });
  }, [currentPrefix]);

  // Row change handler
  const handleRowChange = (id: number, field: keyof RowData, val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  // Toggle row checkbox
  const toggleRowSelect = (id: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, selected: !r.selected } : r
      )
    );
  };

  // Editable Fabric Lot No change (typing)
  const handleFabricLotChange = (id: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, fabricLotNo: value.toUpperCase() } : r
      )
    );
  };

  // On blur: normalize, update prefix+next number, and update other rows with old prefix
  const normalizeFabricLotOnBlur = (id: number) => {
    const oldPrefix = currentPrefix;

    setRows((prev) => {
      // 1) normalize this row
      const temp = prev.map((r) =>
        r.id === id
          ? {
              ...r,
              fabricLotNo: String(r.fabricLotNo || "").trim().toUpperCase(),
            }
          : r
      );

      const changedRow = temp.find((r) => r.id === id);
      if (!changedRow || !changedRow.fabricLotNo) {
        nextLotRef.current = getNextNumberFromRows(temp);
        return temp;
      }

      const newPrefix =
        getPrefixFromLot(changedRow.fabricLotNo) || DEFAULT_LOT_PREFIX;

      // global prefix update
      setCurrentPrefix(newPrefix);

      // 2) update all other rows whose prefix == oldPrefix
      const finalRows = temp.map((row) => {
        if (row.id === id) return row;
        if (!row.fabricLotNo) return row;

        const n = parseLot(row.fabricLotNo);
        if (!n) return row;

        const rowPrefix = getPrefixFromLot(row.fabricLotNo);
        if (rowPrefix === oldPrefix) {
          return { ...row, fabricLotNo: formatLot(n, newPrefix) };
        }
        return row;
      });

      nextLotRef.current = getNextNumberFromRows(finalRows);
      return finalRows;
    });
  };

  // Remove a row
  const handleRemoveRow = (id: number) => {
    setRows((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      nextLotRef.current = getNextNumberFromRows(updated);
      return updated;
    });
  };

  // Helper: get Fabrication Name
  const getFabricationName = useCallback(
    (serialNo: string) => {
      const f = fabricationList.find(
        (x: any) => String(x.serialNo) === String(serialNo)
      );
      return f?.fabricName || "";
    },
    [fabricationList]
  );

  // Compute effective yarn rate from fabrication serial
  const computeEffectiveYarnRateFromSerial = useCallback(
    (serialNo: string): number => {
      if (!serialNo) return 0;
      const fab: Fabrication | undefined = fabricationList.find(
        (x: any) => String(x.serialNo) === String(serialNo)
      );
      if (!fab || !Array.isArray(fab.yarns)) return 0;

      const yarnMap = new Map<string, Yarn>();
      (yarnList || []).forEach((y: any) =>
        yarnMap.set(String(y.serialNo), {
          serialNo: String(y.serialNo),
          yarnName: y.yarnName,
          rate: Number(y.rate) || 0,
          unit: y.unit || "kg",
        })
      );

      let total = 0;
      fab.yarns.forEach((c) => {
        const y = yarnMap.get(String(c.yarnSerialNo));
        const rate = y ? Number(y.rate) : 0;
        total += ((Number(c.percent) || 0) / 100) * rate;
      });
      return Number(total.toFixed(2));
    },
    [fabricationList, yarnList]
  );

  // Build Fabrication rows for modal
  useEffect(() => {
    if (!Array.isArray(fabricationList) || !Array.isArray(yarnList)) return;

    const yarnMap = new Map<string, Yarn>();
    yarnList.forEach((y: any) =>
      yarnMap.set(String(y.serialNo), {
        serialNo: String(y.serialNo),
        yarnName: y.yarnName,
        rate: Number(y.rate) || 0,
        unit: y.unit || "kg",
      })
    );

    const rowsDecorated: FabRow[] = fabricationList.map((f: Fabrication) => {
      const comps = Array.isArray(f.yarns) ? f.yarns : [];
      let total = 0;
      const lines: string[] = [];
      comps.forEach((c) => {
        const y = yarnMap.get(String(c.yarnSerialNo));
        const rate = y ? Number(y.rate) : 0;
        const name = y?.yarnName || c.yarnSerialNo;
        const unit = y?.unit || "kg";

        total += ((Number(c.percent) || 0) / 100) * rate;
        lines.push(`${name} - ${Number(c.percent || 0)}% - ₹${rate}/${unit}`);
      });

      return {
        ...f,
        effectiveRate: Number(total.toFixed(2)),
        composition: lines.join(" "),
        compositionLines: lines,
      };
    });

    setFabRows(rowsDecorated);
  }, [fabricationList, yarnList]);

  const filteredFabRows = useMemo(() => {
    const q = fabSearch.toLowerCase().trim();
    if (!q) return fabRows;
    return fabRows.filter((fr) =>
      `${fr.fabricName} ${fr.serialNo} ${fr.composition}`
        .toLowerCase()
        .includes(q)
    );
  }, [fabRows, fabSearch]);

  const allVisibleSelected = useMemo(() => {
    if (filteredFabRows.length === 0) return false;
    return filteredFabRows.every((fr) =>
      selectedFabSerials.has(String(fr.serialNo))
    );
  }, [filteredFabRows, selectedFabSerials]);

  const toggleSelectFabRow = (serialNo: string) => {
    setSelectedFabSerials((prev) => {
      const next = new Set(prev);
      const key = String(serialNo);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllVisibleFabs = () => {
    setSelectedFabSerials((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredFabRows.forEach((fr) => next.delete(String(fr.serialNo)));
      } else {
        filteredFabRows.forEach((fr) => next.add(String(fr.serialNo)));
      }
      return next;
    });
  };

  // Backfill fabrication names & yarn rates
  useEffect(() => {
    if (!fabricationList.length) return;
    setRows((prev) =>
      prev.map((r) => {
        let changed = false;
        const newR = { ...r };
        if (r.item && !r.fabricationName) {
          const nm = getFabricationName(r.item);
          if (nm) {
            newR.fabricationName = nm;
            changed = true;
          }
        }
        if (!r.yarnRate || r.yarnRate === "0" || r.yarnRate === "0.00") {
          if (r.item) {
            const eff = computeEffectiveYarnRateFromSerial(r.item);
            if (eff) {
              newR.yarnRate = String(eff);
              changed = true;
            }
          }
        }
        return changed ? newR : r;
      })
    );
  }, [
    fabricationList,
    yarnList,
    getFabricationName,
    computeEffectiveYarnRateFromSerial,
  ]);

  // Open/Apply Fabrication Modal
  const openFabSelect = (rowId: number) => {
    setFabRowId(rowId);
    setFabSearch("");
    setSelectedFabSerials(new Set());
    setFabModalOpen(true);
  };

  const applySingleFabricationToRow = (fab: FabRow) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === fabRowId
          ? {
              ...r,
              item: String(fab.serialNo),
              fabricationName: fab.fabricName,
              yarnRate: String(fab.effectiveRate),
            }
          : r
      )
    );
    setFabRowId(null);
    setFabModalOpen(false);
  };

  const isRowEmptyForFab = (r: RowData) =>
    !String(r.item || "").trim() && !String(r.fabricationName || "").trim();

  const applyMultipleFabrications = () => {
    if (fabRowId == null) return;
    const selected = fabRows.filter((fr) =>
      selectedFabSerials.has(String(fr.serialNo))
    );
    if (selected.length === 0) {
      Swal.fire("Info", "Please select at least one fabrication", "info");
      return;
    }

    setRows((prev) => {
      const next = [...prev];
      let idx = next.findIndex((x) => x.id === fabRowId);
      if (idx === -1) idx = 0;

      const fill = (row: RowData, fr: FabRow): RowData => ({
        ...row,
        item: String(fr.serialNo),
        fabricationName: fr.fabricName,
        yarnRate: String(fr.effectiveRate),
      });

      // First selection -> current row
      next[idx] = fill(next[idx], selected[0]);
      let remaining = selected.slice(1);

      // Fill next empty rows first
      if (remaining.length > 0) {
        const empties: number[] = [];
        for (let i = idx + 1; i < next.length; i++) {
          if (isRowEmptyForFab(next[i])) empties.push(i);
        }
        for (let t = 0; t < empties.length && remaining.length > 0; t++) {
          const targetIdx = empties[t];
          const fr = remaining.shift()!;
          next[targetIdx] = fill(next[targetIdx], fr);
        }
      }

      // Append rows for any remaining selections (Fabric Lot No auto, no skip)
      let latestId = next.reduce((m, r) => Math.max(m, r.id), 0);
      let nextNum = getNextNumberFromRows(next);
      const prefix =
        (currentPrefix && currentPrefix.trim()) || DEFAULT_LOT_PREFIX;

      while (remaining.length > 0) {
        const fr = remaining.shift()!;
        latestId += 1;

        const newLot = formatLot(nextNum, prefix);
        nextNum += 1;

        next.push({
          id: latestId,
          fabricLotNo: newLot,
          item: String(fr.serialNo),
          fabricationName: fr.fabricName,
          shade: "",
          processing: "",
          rolls: "",
          weight: "",
          knittingRate: "",
          yarnRate: String(fr.effectiveRate),
          unit: "Kg",
          selected: false,
        });
      }

      nextLotRef.current = nextNum;
      return next;
    });

    setFabRowId(null);
    setFabModalOpen(false);
    setSelectedFabSerials(new Set());
  };

  // Row ko "empty" maana hai ya nahi -> yahi function use kareinge
  const rowHasFabrication = (r: RowData) =>
    String(r.item || "").trim() !== "" ||
    String(r.fabricationName || "").trim() !== "";

  // Save
  const handleSave = () => {
    if (!challanNo || !accountHead) {
      Swal.fire("Missing Fields", "Challan No & Party required", "warning");
      return;
    }

    let workingRows: RowData[] = [...rows];

    const anySelected = workingRows.some((r) => r.selected);

    // Pehle checkbox lagaya gaya rows le lo (agar hai to), warna sab rows
    const baseRows = anySelected
      ? workingRows.filter((r) => r.selected)
      : workingRows;

    // Empty rows hatao: jisme fabrication select nahi hai
    const rowsWithFab = baseRows.filter(rowHasFabrication);

    if (rowsWithFab.length === 0) {
      Swal.fire(
        "No Fabrication",
        "Please select Fabrication for at least one row.",
        "warning"
      );
      return;
    }

    const idsToSave = new Set(rowsWithFab.map((r) => r.id));

    // Auto-generate missing Fabric Lot Nos for rowsToSave only
    let num = getNextNumberFromRows(workingRows);
    const prefix =
      (currentPrefix && currentPrefix.trim()) || DEFAULT_LOT_PREFIX;

    workingRows = workingRows.map((r) => {
      if (!idsToSave.has(r.id)) return r; // is row ko save hi nahi karna
      const trimmed = String(r.fabricLotNo || "").trim();
      if (trimmed) return r;
      const lot = formatLot(num, prefix);
      num += 1;
      return { ...r, fabricLotNo: lot };
    });

    nextLotRef.current = num;
    setRows(workingRows);

    const rowsForPayload = workingRows.filter((r) => idsToSave.has(r.id));

    // Totals sirf payload rows ke hisaab se
    let pRolls = 0,
      pWeight = 0,
      pAmount = 0;
    rowsForPayload.forEach((r) => {
      const rollsVal = Number(r.rolls) || 0;
      const weightVal = Number(r.weight) || 0;
      const rateVal = Number(r.knittingRate) || 0;
      pRolls += rollsVal;
      pWeight += weightVal;
      pAmount += weightVal * rateVal;
    });

    const payload = {
      challanNo,
      dated: dated ? new Date(dated).toISOString() : null,
      party: { id: Number(accountHead) },
      totalRolls: pRolls,
      totalWeight: pWeight,
      totalAmount: pAmount,
      rows: rowsForPayload.map((r) => ({
        fabricLotNo: r.fabricLotNo,
        shade: r.shade,
        processing: r.processing,
        rolls: Number(r.rolls) || 0,
        weight: Number(r.weight) || 0,
        knittingRate: Number(r.knittingRate) || 0,
        fabrication: r.item ? { serialNo: r.item } : null,
        yarnRate: r.yarnRate ? Number(r.yarnRate) : 0,
        yarn: null,
      })),
    };

    Swal.fire({
      title: "Confirm Save",
      text: anySelected
        ? `Save ${rowsForPayload.length} selected row(s) with fabrication?`
        : `Save ${rowsForPayload.length} row(s) with fabrication?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Save it!",
    }).then((res) => {
      if (!res.isConfirmed) return;

      if (editingId) {
        api
          .put(`/knitting/update/${editingId}`, payload)
          .then(() => {
            Swal.fire("Updated!", "Knitting Challan updated.", "success");
            setEditingId(null);
          })
          .catch(() => Swal.fire("Error", "Update failed", "error"));
      } else {
        api
          .post("/knitting/save", payload)
          .then(() => Swal.fire("Saved!", "Knitting Challan saved.", "success"))
          .catch(() => Swal.fire("Error", "Save failed", "error"));
      }
    });
  };

  // List open
  const openList = () => {
    api
      .get("/knitting/list")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setKnittingList(data);
        setShowList(true);
      })
      .catch(() => Swal.fire("Error", "List load failed", "error"));
  };

  // Delete from list
  const handleDelete = (id: number) => {
    Swal.fire({
      title: "Delete?",
      text: "This will delete record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((res) => {
      if (res.isConfirmed) {
        api
          .delete(`/knitting/delete/${id}`)
          .then(() => {
            setKnittingList((prev) => prev.filter((x) => x.id !== id));
            Swal.fire("Deleted", "Record removed", "success");
          })
          .catch(() => Swal.fire("Error", "Delete failed", "error"));
      }
    });
  };

  // Edit from list
  const handleEdit = (id: number) => {
    api
      .get(`/knitting/${id}`)
      .then((r) => {
        const d = r.data;
        setChallanNo(d.challanNo || "");
        setDated(d.dated ? d.dated.substring(0, 10) : "");
        setAccountHead(d.party ? String(d.party.id) : "");

        const mapped: RowData[] = (d.rows || []).map((row: any, i: number) => {
          const fabSerial =
            row.fabrication?.serialNo != null
              ? String(row.fabrication.serialNo)
              : row.item
              ? String(row.item)
              : row.itemSerialNo
              ? String(row.itemSerialNo)
              : "";

          const nameFromBackend =
            row.fabrication?.fabricName ||
            row.itemName ||
            getFabricationName(fabSerial) ||
            "";

          let yRate = "";
          if (row.yarnRate != null && row.yarnRate !== "") {
            yRate = String(row.yarnRate);
          } else if (fabSerial) {
            const eff = computeEffectiveYarnRateFromSerial(fabSerial);
            if (eff) yRate = String(eff);
          }

          return {
            id: i + 1,
            fabricLotNo: row.fabricLotNo || "",
            item: fabSerial || "",
            fabricationName: nameFromBackend,
            shade: row.shade || "",
            processing: row.processing || "",
            rolls: String(row.rolls || ""),
            weight: String(row.weight || ""),
            knittingRate: String(row.knittingRate || ""),
            yarnRate: yRate,
            unit: "Kg",
            selected: false,
          } as RowData;
        });

        setRows(mapped);
        recalcTotals(mapped);

        if (mapped.length > 0) {
          const last = mapped[mapped.length - 1];
          const pfx = getPrefixFromLot(last.fabricLotNo || "");
          setCurrentPrefix(pfx || DEFAULT_LOT_PREFIX);
          nextLotRef.current = getNextNumberFromRows(mapped);
        } else {
          setCurrentPrefix(DEFAULT_LOT_PREFIX);
          nextLotRef.current = 1;
        }

        setShowList(false);
        setEditingId(id);
      })
      .catch(() => Swal.fire("Error", "Load failed", "error"));
  };

  // Print
  const handlePrint = () => {
    if (!rows || rows.length === 0) {
      Swal.fire("Error", "No data available to print!", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHTML = rows
      .map((r, i) => {
        const weight = Number(r.weight) || 0;
        const rate = Number(r.knittingRate) || 0;
        const amount = (weight * rate).toFixed(2);
        const yarnRateText = r.yarnRate
          ? `₹${Number(r.yarnRate).toFixed(2)}/Kg`
          : "-";
        const fabName = r.fabricationName || getFabricationName(r.item) || "-";
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${r.fabricLotNo || "-"}</td>
            <td>${fabName}</td>
            <td>${r.shade || "-"}</td>
            <td>${r.processing || "-"}</td>
            <td>${r.rolls || "-"}</td>
            <td>${r.weight || "-"}</td>
            <td>${r.unit || "Kg"}</td>
            <td>${r.knittingRate || "-"}</td>
            <td>${yarnRateText}</td>
            <td>${amount}</td>
          </tr>`;
      })
      .join("");

    const partyName =
      partyList.find((p) => String(p.id) === String(accountHead))?.partyName ||
      "-";

    const html = `
      <html>
        <head>
          <title>Knitting Inward Challan - ${challanNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            .header-info { margin-top: 10px; font-size: 14px; }
            .header-info span { display: inline-block; width: 200px; }
            .totals { margin-top: 20px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <h2>Knitting Inward Challan</h2>
          <div class="header-info">
            <span><strong>Challan No:</strong> ${challanNo || "-"}</span>
            <span><strong>Date:</strong> ${dated || "-"}</span><br/>
            <span><strong>Party:</strong> ${partyName}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fabric Lot No</th>
                <th>Fabrication</th>
                <th>Shade</th>
                <th>Processing</th>
                <th>Rolls</th>
                <th>Weight</th>
                <th>Unit</th>
                <th>Knitting Rate (₹/Kg)</th>
                <th>Yarn Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <div class="totals">
            <p>Total Rolls: ${totalRolls}</p>
            <p>Total Weight: ${totalWeight.toFixed(3)} Kg</p>
            <p>Total Amount: ₹${totalAmount.toFixed(2)}</p>
          </div>

          <script>
            window.print();
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Issue To
  const handleIssueTo = async () => {
    const res = await Swal.fire({
      title: "Issue To",
      text: "Proceed to issue this fabric to Dyeing Outward?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Proceed",
    });

    if (!res.isConfirmed) return;

    await Swal.fire({
      icon: "success",
      title: "Issued!",
      text: "Fabric issued successfully.",
      timer: 900,
      showConfirmButton: false,
    });

    navigate("/knitting/dyeing/outward-challan");
  };

  // Filtered List for modal
  const filteredListView = Array.isArray(knittingList)
    ? knittingList.filter((x) => {
        const s = searchText.toLowerCase();
        return (
          !searchText ||
          (x.challanNo || "").toLowerCase().includes(s) ||
          (x.party?.partyName || "").toLowerCase().includes(s)
        );
      })
    : [];

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">
            Knitting Receipt
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Party</label>
              <select
                value={accountHead}
                onChange={(e) => setAccountHead(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Party</option>
                {partyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={dated}
                onChange={(e) => setDated(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S No</th>
                  <th className="border p-2 text-center">Select</th>
                  <th className="border p-2">Fabric Lot No.</th>
                  <th className="border p-2">Fabrication</th>
                  <th className="border p-2">Shade</th>
                  <th className="border p-2">Processing</th>
                  <th className="border p-2">Rolls</th>
                  <th className="border p-2">Weight</th>
                  <th className="border p-2">Unit</th>
                  <th className="border p-2">Knitting Rate (₹/Kg)</th>
                  <th className="border p-2">Yarn Rate</th>
                  <th className="border p-2">Amount</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const weightVal = Number(r.weight) || 0;
                  const knitRate = Number(r.knittingRate) || 0;
                  const amount = weightVal * knitRate;

                  return (
                    <tr key={r.id}>
                      <td className="border p-1 text-center">{i + 1}</td>

                      {/* Select checkbox for row */}
                      <td className="border p-1 text-center">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={() => toggleRowSelect(r.id)}
                        />
                      </td>

                      {/* Fabric Lot No – auto-generated but editable */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={r.fabricLotNo}
                          onChange={(e) =>
                            handleFabricLotChange(r.id, e.target.value)
                          }
                          onBlur={() => normalizeFabricLotOnBlur(r.id)}
                          className="border p-1 rounded w-full bg-white border-gray-300"
                          placeholder="Fabric Lot No"
                          title="Auto-generated; prefix/number edit kar sakte ho."
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={
                            r.fabricationName ||
                            getFabricationName(r.item) ||
                            ""
                          }
                          readOnly
                          onClick={() => openFabSelect(r.id)}
                          className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                          placeholder="Click to select"
                          title="Click to select Fabrication"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={r.shade}
                          onChange={(e) =>
                            handleRowChange(r.id, "shade", e.target.value)
                          }
                          className="border p-1 rounded w-full"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="text"
                          value={r.processing}
                          onChange={(e) =>
                            handleRowChange(r.id, "processing", e.target.value)
                          }
                          className="border p-1 rounded w-full"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="number"
                          value={r.rolls}
                          onChange={(e) =>
                            handleRowChange(r.id, "rolls", e.target.value)
                          }
                          className="border p-1 rounded w-full text-right"
                        />
                      </td>

                      <td className="border p-1">
                        <input
                          type="number"
                          value={r.weight}
                          onChange={(e) =>
                            handleRowChange(r.id, "weight", e.target.value)
                          }
                          className="border p-1 rounded w-full text-right"
                        />
                      </td>

                      <td className="border p-1 text-center">{r.unit}</td>

                      <td className="border p-1">
                        <input
                          type="number"
                          value={r.knittingRate}
                          onChange={(e) =>
                            handleRowChange(
                              r.id,
                              "knittingRate",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full text-right"
                          placeholder="₹/Kg"
                        />
                      </td>

                      {/* Effective Yarn Rate - read-only */}
                      <td className="border p-1 text-right bg-gray-50 font-semibold">
                        {r.yarnRate ? `₹${Number(r.yarnRate).toFixed(2)}` : "-"}
                      </td>

                      <td className="border p-1 text-right bg-gray-50 font-semibold">
                        {amount.toFixed(2)}
                      </td>

                      <td className="border p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(r.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Buttons */}
          <div className="flex justify-between mt-4">
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={addRow}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Add
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded"
              >
                Save
              </button>
              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded"
              >
                View List
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-700 text-white rounded"
              >
                Print
              </button>
              <button
                onClick={handleIssueTo}
                className="px-4 py-2 bg-purple-600 text-white rounded"
              >
                Issue To
              </button>
            </div>
            <div className="text-right">
              <p className="font-semibold">Total Rolls: {totalRolls}</p>
              <p className="font-semibold">
                Total Weight: {totalWeight.toFixed(3)} Kg
              </p>
              <p className="font-semibold text-green-700">
                Total Amount: ₹{totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fabrication Modal */}
      {fabModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Select Fabrication</h3>
              <div className="text-sm text-gray-600">
                Selected: {selectedFabSerials.size}
              </div>
            </div>

            <input
              placeholder="Search by fabrication, yarn or rate..."
              value={fabSearch}
              onChange={(e) => setFabSearch(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />

            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisibleFabs}
                      />
                    </th>
                    <th className="border p-2">Serial No</th>
                    <th className="border p-2">Fabrication Name</th>
                    <th className="border p-2">Yarn Composition</th>
                    <th className="border p-2 text-right">
                      Yarn Rate (Eff.)
                      <br />
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">
                        Yarn Rate = Σ(percent/100 × yarn.rate)
                      </span>
                    </th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFabRows.length === 0 ? (
                    <tr>
                      <td
                        className="border p-3 text-center text-gray-500"
                        colSpan={6}
                      >
                        No fabrications found
                      </td>
                    </tr>
                  ) : (
                    filteredFabRows.map((f) => {
                      const checked = selectedFabSerials.has(
                        String(f.serialNo)
                      );
                      return (
                        <tr key={f.serialNo} className="hover:bg-gray-50">
                          <td className="border p-2 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleSelectFabRow(String(f.serialNo))
                              }
                            />
                          </td>
                          <td className="border p-2">{f.serialNo}</td>
                          <td className="border p-2">{f.fabricName}</td>
                          <td className="border p-2">
                            <div className="flex flex-col space-y-0.5">
                              {f.compositionLines.length > 0
                                ? f.compositionLines.map((line, idx) => (
                                    <span key={idx} className="block">
                                      {line}
                                    </span>
                                  ))
                                : "-"}
                            </div>
                          </td>
                          <td className="border p-2 text-right">
                            ₹{f.effectiveRate.toFixed(2)}
                          </td>
                          <td className="border p-2 text-center">
                            <button
                              onClick={() => applySingleFabricationToRow(f)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-x-2">
                <button
                  onClick={() => setSelectedFabSerials(new Set())}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Clear
                </button>
              </div>
              <div className="space-x-2">
                <button
                  onClick={applyMultipleFabrications}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Add Selected
                </button>
                <button
                  onClick={() => setFabModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5 flex flex-col">
            <h3 className="text-xl font-bold text-center mb-4">
              Knitting Inward List
            </h3>

            <input
              placeholder="Search by Challan or Party"
              className="border p-2 rounded w-full mb-3"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Challan No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">Rolls</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListView.map((k, i) => (
                    <tr key={k.id}>
                      <td className="border p-2 text-center">{i + 1}</td>
                      <td className="border p-2">{k.challanNo}</td>
                      <td className="border p-2">
                        {k.dated?.substring(0, 10)}
                      </td>
                      <td className="border p-2">{k.party?.partyName}</td>
                      <td className="border p-2 text-right">
                        {k.totalRolls || 0}
                      </td>
                      <td className="border p-2 text-right">
                        ₹{(k.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => handleEdit(k.id)}
                          className="px-2 py-1 bg-blue-500 text-white rounded mr-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(k.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-5">
              <button
                onClick={() => setShowList(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
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

export default KnittingInwardChallan;