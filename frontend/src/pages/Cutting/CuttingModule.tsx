"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

// ================= Types =================
type CuttingRow = {
  id: number;
  cutLotNo: string;
  artNo: string;
  itemName: string;
  shade: string;
  pcs: string;
  rate: string;
  amount: string;
};

type StockDetailRow = {
  id: number;
  finishingInwardRowId?: number | null;
  itemName: string;
  shade: string;
  unit: string;
  consumption: string;
  kho: string; // manual KHO
  consRate: string;
  consAmount: string;
};

type Employee = {
  code: string;
  employeeName: string;
  process?: { serialNo: string; processName: string };
};

type ArtListItem = {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  saleRate?: string;
  styleRate?: string;
};

type FinishingInwardRow = {
  id?: number;
  lotNo?: string;
  itemName?: string;
  shade?: string;
  rolls?: string;
  weight?: string;
  rate?: string; // Finishing Rate
  rateFND?: string; // KYR + Dyeing (Sum)
};

type FinishingInwardDoc = {
  id: number;
  partyName?: string;
  dated?: string;
  challanNo?: string;
  rows?: FinishingInwardRow[];
};

type IssueTo = "Inside" | "Outside";

type CuttingEntryDTO = {
  serialNo: string;
  date: string;
  employeeId?: string;
  employeeName?: string;

  totalPcs?: string;
  totalCuttingAmount?: string;
  totalConsumption?: string;
  totalKho?: string;
  totalConsAmount?: string;

  issueTo?: IssueTo;
  issueBranchId?: string | number;
  issueBranchName?: string;

  lotRows: {
    id?: number;
    sno?: number;
    cutLotNo: string;
    artNo: string;
    itemName: string;
    shade: string;
    pcs: string;
    rate: string;
    amount: string;
  }[];
  stockRows: {
    id?: number;
    sno?: number;
    finishingInwardRowId?: number | null;
    itemName: string;
    shade: string;
    unit: string;
    consumption: string;
    kho?: string;
    consRate: string;
    consAmount: string;
  }[];
};

type Shade = { shadeCode: string; shadeName: string };

type Location = {
  id: number | string;
  branchName: string;
  serialNumber?: string;
  branchCode?: string;
};

type ArtProcess = {
  processName?: string;
  rate?: string | number;
  rate1?: string | number;
};
type ArtDetail = {
  serialNumber: string;
  artName?: string;
  artNo?: string;
  processes?: ArtProcess[];
};

// ================= Utils =================
const toNum = (v: any) =>
  v === null || v === undefined || v === "" || isNaN(Number(v)) ? 0 : Number(v);
const fmt = (v: number, d = 2) => v.toFixed(d);

// ================= API helpers =================
const getNextSerial = async (dateISO: string) =>
  (
    await api.get<string>("/cutting-entries/next-serial", {
      params: { date: dateISO },
    })
  ).data;

const listCuttings = async () =>
  (await api.get<CuttingEntryDTO[]>("/cutting-entries")).data;
const getCutting = async (serialNo: string) =>
  (await api.get<CuttingEntryDTO>(`/cutting-entries/${serialNo}`)).data;
const saveCutting = async (payload: CuttingEntryDTO) =>
  (await api.post<CuttingEntryDTO>("/cutting-entries", payload)).data;
const updateCutting = async (serialNo: string, payload: CuttingEntryDTO) =>
  (await api.put<CuttingEntryDTO>(`/cutting-entries/${serialNo}`, payload))
    .data;
const deleteCutting = async (serialNo: string) => {
  await api.delete(`/cutting-entries/${serialNo}`);
};

const listEmployees = async () =>
  (await api.get<Employee[]>("/employees")).data;
const listArts = async () => (await api.get<ArtListItem[]>("/arts")).data;
const getArtDetail = async (serialNumber: string) =>
  (await api.get<ArtDetail>(`/arts/${serialNumber}`)).data;

const listFinishingRows = async (): Promise<FinishingInwardRow[]> => {
  const res = await api.get<FinishingInwardDoc[]>("/finishing-inwards");
  const docs = Array.isArray(res.data) ? res.data : [];
  const flat: FinishingInwardRow[] = [];
  for (const d of docs) {
    for (const r of d.rows || []) flat.push(r);
  }
  return flat;
};

const listShades = async (): Promise<Shade[]> => {
  const res = await api.get<any[]>("/shade/list");
  const data = Array.isArray(res.data) ? res.data : [];
  return data
    .map((x) => ({
      shadeCode: String(x.shadeCode || "").toUpperCase(),
      shadeName: String(x.shadeName || ""),
    }))
    .sort((a, b) => a.shadeName.localeCompare(b.shadeName));
};

const listLocations = async (): Promise<Location[]> =>
  (await api.get<Location[]>("/locations")).data;

// Extract Cutting process rate by IssueTo
const extractCuttingRate = (
  detail: ArtDetail | undefined,
  issueTo: IssueTo
): number => {
  const list = detail?.processes || [];
  if (!list || list.length === 0) return 0;
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const procs = list.map((p) => ({ ...p, _n: norm(p.processName) }));

  let chosen: ArtProcess | undefined;
  if (issueTo === "Inside") {
    chosen = procs.find((p) => p._n.includes("cut") && p._n.includes("inside"));
  } else {
    chosen = procs.find(
      (p) =>
        p._n.includes("cut") &&
        (p._n.includes("outside") || p._n.includes("out"))
    );
  }
  if (!chosen) chosen = procs.find((p) => p._n === "cutting");
  if (!chosen) chosen = procs.find((p) => p._n.includes("cut"));

  const rateVal = toNum(chosen?.rate);
  return rateVal;
};

// ================= Shade Dropdown =================
type ShadeDropdownProps = {
  value?: string;
  onChange: (val: string) => void;
  options: Shade[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const ShadeDropdown: React.FC<ShadeDropdownProps> = ({
  value = "",
  onChange,
  options,
  placeholder = "Select shade...",
  className = "",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<number>(-1);
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => {
    const v = String(value || "")
      .trim()
      .toLowerCase();
    if (!v) return null;
    return options.find((s) => s.shadeName.trim().toLowerCase() === v) || null;
  }, [options, value]);

  const label = selected ? selected.shadeName : value || "";

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (s) =>
        s.shadeName.toLowerCase().includes(query) ||
        s.shadeCode.toLowerCase().includes(query)
    );
  }, [options, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const openBox = () => {
    if (disabled) return;
    setOpen(true);
    setActive(-1);
    setTimeout(() => (inputRef as any).current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openBox();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((p) =>
        Math.min(p < 0 ? 0 : p + 1, Math.max(0, filtered.length - 1))
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((p) => Math.max(p <= 0 ? 0 : p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const choice = filtered[active];
      if (choice) {
        onChange(choice.shadeName);
        setQ("");
        setOpen(false);
        setActive(-1);
      }
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <div
        onClick={openBox}
        className={`flex items-center justify-between border rounded px-2 py-1 bg-white cursor-pointer ${
          disabled ? "opacity-60 cursor-not-allowed" : "border-gray-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={label || placeholder}
      >
        <div className="truncate text-sm">
          {label ? label : <span className="text-gray-400">{placeholder}</span>}
        </div>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              title="Clear"
            >
              ×
            </button>
          )}
          <span className="text-gray-500">▾</span>
        </div>
      </div>

      {open && (
        <div className="absolute z-[200] mt-1 w-full bg-white border border-gray-200 rounded shadow-lg">
          <div className="p-2 border-b">
            <input
              ref={inputRef as any}
              type="text"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Search shade..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              disabled={disabled}
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">No shades found</div>
            ) : (
              filtered.map((s, idx) => {
                const isActive = idx === active;
                const isSel =
                  selected?.shadeName.toLowerCase() ===
                  s.shadeName.toLowerCase();
                return (
                  <div
                    key={`${s.shadeCode}-${s.shadeName}`}
                    role="option"
                    aria-selected={isSel}
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      isActive ? "bg-blue-50" : ""
                    } ${isSel ? "font-semibold" : ""}`}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(s.shadeName);
                      setQ("");
                      setOpen(false);
                      setActive(-1);
                    }}
                    title={s.shadeName}
                  >
                    {s.shadeName}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Cutting Lot Uniqueness Check ============

const checkDuplicateCutLots = async (
  payload: CuttingEntryDTO
): Promise<string | null> => {
  const norm = (s: string) => s.trim().toUpperCase();

  // 1) Current entry lot numbers (non-empty)
  const currentLots = (payload.lotRows || [])
    .map((r) => norm(r.cutLotNo || ""))
    .filter((v) => v);

  if (currentLots.length === 0) return null;

  // 1a) Duplicate in the same entry?
  const selfMap = new Map<string, number>();
  for (const lot of currentLots) {
    selfMap.set(lot, (selfMap.get(lot) || 0) + 1);
  }
  const selfDups = Array.from(selfMap.entries())
    .filter(([, c]) => c > 1)
    .map(([lot]) => lot);

  if (selfDups.length > 0) {
    const listStr = selfDups.join(", ");
    const verb = selfDups.length > 1 ? "are" : "is";
    return `Cutting Lot No(s) ${listStr} ${verb} duplicated within this cutting entry. Each Cutting Lot No must be unique inside a single entry.`;
  }

  // 2) Check against other entries
  let allEntries: CuttingEntryDTO[];
  try {
    allEntries = await listCuttings();
  } catch (e) {
    console.error("Failed to load cutting entries for uniqueness check:", e);
    return "Could not verify Cutting Lot No uniqueness. Please try again later.";
  }

  if (!allEntries || allEntries.length === 0) return null;

  const others = allEntries.filter((e) => e.serialNo !== payload.serialNo);

  const usedLots = new Set<string>();
  for (const e of others) {
    for (const r of e.lotRows || []) {
      const lot = norm(r.cutLotNo || "");
      if (lot) usedLots.add(lot);
    }
  }

  const conflicts = Array.from(
    new Set(currentLots.filter((lot) => usedLots.has(lot)))
  );
  if (conflicts.length > 0) {
    const listStr = conflicts.join(", ");
    const verb = conflicts.length > 1 ? "are" : "is";
    return `Cutting Lot No(s) ${listStr} ${verb} already used in another cutting entry. Each Cutting Lot No can only be used once across all cutting entries.`;
  }

  return null;
};

// ================= Component =================
const CuttingModule: React.FC = () => {
  // Header
  const [serialNo, setSerialNo] = useState("");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [employeeId, setEmployeeId] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");

  // Cutting Lot Details
  const [rows, setRows] = useState<CuttingRow[]>([]);

  // Cutting Stock Details
  const [stockRows, setStockRows] = useState<StockDetailRow[]>([]);

  // Masters
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [arts, setArts] = useState<ArtListItem[]>([]);
  const [finishingRows, setFinishingRows] = useState<FinishingInwardRow[]>([]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const cuttingEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        const pName = emp.process?.processName?.trim().toLowerCase() || "";
        const isCutting = pName === "cutting";
        const isSelected =
          employeeId && String(emp.code) === String(employeeId);
        return isCutting || isSelected;
      }),
    [employees, employeeId]
  );

  const [issueTo, setIssueTo] = useState<IssueTo>("Inside");
  const [issueBranchId, setIssueBranchId] = useState<string | number>("");
  const [issueBranchName, setIssueBranchName] = useState<string>("");

  const [rateCache, setRateCache] = useState<Record<string, number>>({});
  const fetchingRatesRef = useRef<Set<string>>(new Set());

  // Modals
  const [artModalOpen, setArtModalOpen] = useState(false);
  const [artSearch, setArtSearch] = useState("");
  const [artRowId, setArtRowId] = useState<number | null>(null);

  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishSearch, setFinishSearch] = useState("");
  const [finishRowId, setFinishRowId] = useState<number | null>(null);

  // List modal
  const [listOpen, setListOpen] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [entryList, setEntryList] = useState<CuttingEntryDTO[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  // ---------- Helpers ----------
  const resolveEmployeeName = useCallback(
    (empCode?: string | null) => {
      if (!empCode) return "";
      const emp = employees.find((e) => String(e.code) === String(empCode));
      return (emp?.employeeName || "").trim();
    },
    [employees]
  );

  const resolveBranchName = useCallback(
    (idVal?: string | number) => {
      if (idVal === null || idVal === undefined || idVal === "") return "";
      const b = locations.find((x) => String(x.id) === String(idVal));
      return (b?.branchName || "").trim();
    },
    [locations]
  );

  const rateKey = (serial: string, it: IssueTo) => `${serial}|${it}`;

  const addCuttingRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        cutLotNo: "",
        artNo: "",
        itemName: "",
        shade: "",
        pcs: "",
        rate: "",
        amount: "",
      },
    ]);
  }, []);
  const addStockRow = useCallback(() => {
    setStockRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        finishingInwardRowId: null,
        itemName: "",
        shade: "",
        unit: "Kg",
        consumption: "",
        kho: "",
        consRate: "",
        consAmount: "",
      },
    ]);
  }, []);

  const resetForm = useCallback(
    async (keepDate = true) => {
      const d = keepDate ? date : new Date().toISOString().slice(0, 10);
      const next = await getNextSerial(d);
      setSerialNo(next);
      if (!keepDate) setDate(d);
      setEmployeeId("");
      setEmployeeName("");
      setIssueTo("Inside");
      setIssueBranchId("");
      setIssueBranchName("");
      setRows([]);
      setStockRows([]);
      setTimeout(() => {
        addCuttingRow();
        addStockRow();
      }, 0);
    },
    [date, addCuttingRow, addStockRow]
  );

  useEffect(() => {
    (async () => {
      try {
        setSerialNo(await getNextSerial(date));
      } catch {}
      if (rows.length === 0) addCuttingRow();
      if (stockRows.length === 0) addStockRow();
      try {
        setEmployees(await listEmployees());
      } catch {}
      try {
        setShades(await listShades());
      } catch {}
      try {
        setLocations(await listLocations());
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setSerialNo(await getNextSerial(date));
      } catch {}
    })();
  }, [date]);

  const handleEmployeeChange = (val: string, labelText?: string) => {
    setEmployeeId(val);
    const nm = (labelText || "").trim() || resolveEmployeeName(val);
    setEmployeeName(nm);
  };

  // ---------- Masters ----------
  const openArtModal = async (rowId: number) => {
    setArtRowId(rowId);
    setArtSearch("");
    setArtModalOpen(true);
    if (arts.length === 0) {
      try {
        setArts(await listArts());
      } catch {}
    }
  };
  const openFinishModal = async (rowId: number) => {
    setFinishRowId(rowId);
    setFinishSearch("");
    setFinishModalOpen(true);
    try {
      setFinishingRows(await listFinishingRows());
    } catch {}
  };

  const ensureRateLoaded = useCallback(
    async (a: ArtListItem, it: IssueTo) => {
      const key = rateKey(a.serialNumber, it);
      if (key in rateCache) return rateCache[key];
      if (fetchingRatesRef.current.has(key)) return undefined;
      fetchingRatesRef.current.add(key);
      try {
        const detail = await getArtDetail(a.serialNumber);
        const procRate =
          extractCuttingRate(detail, it) ||
          toNum(a.saleRate || a.styleRate || "");
        setRateCache((prev) => ({ ...prev, [key]: procRate }));
        return procRate;
      } catch {
        const fallback = toNum(a.saleRate || a.styleRate || "");
        setRateCache((prev) => ({ ...prev, [key]: fallback }));
        return fallback;
      } finally {
        fetchingRatesRef.current.delete(key);
      }
    },
    [rateCache]
  );

  const filteredArts = useMemo(() => {
    const q = artSearch.trim().toLowerCase();
    if (!q) return arts;
    return arts.filter((a) => {
      const key = rateKey(a.serialNumber, issueTo);
      const rateFromCache =
        key in rateCache
          ? rateCache[key]
          : toNum(a.saleRate || a.styleRate || "");
      return (
        (a.artNo || "").toLowerCase().includes(q) ||
        (a.artName || "").toLowerCase().includes(q) ||
        rateFromCache.toString().toLowerCase().includes(q)
      );
    });
  }, [artSearch, arts, rateCache, issueTo]);

  useEffect(() => {
    if (!artModalOpen) return;
    const top = filteredArts.slice(0, 50);
    top.forEach((a) => {
      const key = rateKey(a.serialNumber, issueTo);
      if (!(key in rateCache)) {
        ensureRateLoaded(a, issueTo);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artModalOpen, filteredArts, issueTo]);

  // ---------- Row handlers ----------
  const handleCuttingChange = (
    id: number,
    field: keyof CuttingRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: value } as CuttingRow;
        const pcs = toNum(next.pcs);
        const rate = toNum(next.rate);
        next.amount = pcs && rate ? (pcs * rate).toFixed(2) : "";
        return next;
      })
    );
  };
  const handleStockChange = (
    id: number,
    field: keyof StockDetailRow,
    value: string
  ) => {
    setStockRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: value } as StockDetailRow;
        const cons = toNum(next.consumption);
        const rate = toNum(next.consRate);
        next.consAmount = cons && rate ? (cons * rate).toFixed(2) : "";
        return next;
      })
    );
  };

  const applyArtToRow = async (a: ArtListItem) => {
    if (artRowId == null) return;
    const key = rateKey(a.serialNumber, issueTo);

    let finalRate: number;
    if (key in rateCache) {
      finalRate = rateCache[key];
    } else {
      try {
        const detail = await getArtDetail(a.serialNumber);
        const pr =
          extractCuttingRate(detail, issueTo) ||
          toNum(a.saleRate || a.styleRate || "");
        setRateCache((prev) => ({ ...prev, [key]: pr }));
        finalRate = pr;
      } catch {
        finalRate = toNum(a.saleRate || a.styleRate || "");
        setRateCache((prev) => ({ ...prev, [key]: finalRate }));
      }
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== artRowId) return r;
        const pcs = toNum(r.pcs);
        const amount = pcs && finalRate ? (pcs * finalRate).toFixed(2) : "";
        return {
          ...r,
          artNo: a.artNo || "",
          itemName: a.artName || "",
          rate: finalRate ? String(finalRate) : "",
          amount,
        };
      })
    );
    setArtModalOpen(false);
    setArtRowId(null);
  };

  const applyFinishingRow = (fr: FinishingInwardRow) => {
    if (finishRowId == null) return;
    setStockRows((prev) =>
      prev.map((r) => {
        if (r.id !== finishRowId) return r;
        const cons = toNum(r.consumption);

        const kyrDyeingSum = toNum(fr.rateFND);
        const finishingRate = toNum(fr.rate);
        const totalFabricRate = kyrDyeingSum + finishingRate;

        return {
          ...r,
          finishingInwardRowId: fr.id ?? null,
          itemName: fr.itemName || "",
          shade: fr.shade || "",
          unit: r.unit || "Kg",
          consRate: totalFabricRate ? String(totalFabricRate) : "",
          consAmount:
            cons && totalFabricRate ? (cons * totalFabricRate).toFixed(2) : "",
        };
      })
    );
    setFinishModalOpen(false);
    setFinishRowId(null);
  };

  // ---------- Totals ----------
  const totalPcs = useMemo(
    () => rows.reduce((s, r) => s + toNum(r.pcs), 0),
    [rows]
  );
  const totalCuttingAmount = useMemo(
    () => rows.reduce((s, r) => s + toNum(r.amount), 0),
    [rows]
  );

  const totalConsumption = useMemo(
    () => stockRows.reduce((s, r) => s + toNum(r.consumption), 0),
    [stockRows]
  );
  const totalKho = useMemo(
    () => stockRows.reduce((s, r) => s + toNum(r.kho), 0),
    [stockRows]
  );
  const totalConsAmount = useMemo(
    () => stockRows.reduce((s, r) => s + toNum(r.consAmount), 0),
    [stockRows]
  );

  const overallAvgPerPcs = useMemo(() => {
    const pcs = totalPcs || 0;
    return pcs > 0
      ? ((totalConsumption + totalKho) / pcs).toFixed(4)
      : "0.0000";
  }, [totalPcs, totalConsumption, totalKho]);

  // ---------- PRUNE + VALIDATE ----------
  const buildValidatedPayload = (): {
    ok: boolean;
    payload?: CuttingEntryDTO;
    msg?: string;
  } => {
    if (!date) return { ok: false, msg: "Date is required" };
    if (!employeeId)
      return { ok: false, msg: "Please select Employee (Cutting)" };

    const empNameResolved =
      (employeeName || "").trim() || resolveEmployeeName(employeeId) || "";

    const lotRowsPruned = rows
      .map((r, idx) => ({
        sno: idx + 1,
        cutLotNo: (r.cutLotNo || "").trim(),
        artNo: (r.artNo || "").trim(),
        itemName: (r.itemName || "").trim(),
        shade: (r.shade || "").trim(),
        pcs: (r.pcs || "").trim(),
        rate: (r.rate || "").trim(),
        amount: (r.amount || "").trim(),
      }))
      .filter((r) => (r.artNo || r.itemName) && toNum(r.pcs) > 0);

    if (lotRowsPruned.length === 0)
      return {
        ok: false,
        msg: "Add at least one Lot row with Art/Item and PCs > 0",
      };

    const stockRowsPruned = stockRows
      .map((r, idx) => ({
        sno: idx + 1,
        finishingInwardRowId: r.finishingInwardRowId ?? null,
        itemName: (r.itemName || "").trim(),
        shade: (r.shade || "").trim(),
        unit: (r.unit || "Kg").trim(),
        consumption: (r.consumption || "").trim(),
        kho: (r.kho || "").trim(),
        consRate: (r.consRate || "").trim(),
        consAmount: (r.consAmount || "").trim(),
      }))
      .filter(
        (r) =>
          r.itemName &&
          toNum(r.consumption) + toNum(r.kho) > 0 &&
          toNum(r.consRate) > 0
      );

    if (stockRowsPruned.length === 0)
      return {
        ok: false,
        msg: "Add at least one Stock row with Item + (Consumption or KHO) + Rate > 0",
      };

    const branchNameResolved =
      issueTo === "Outside"
        ? issueBranchName || resolveBranchName(issueBranchId)
        : "";

    if (issueTo === "Outside" && !issueBranchId) {
      return {
        ok: false,
        msg: "Please select Issue Branch (for Outside)",
      };
    }

    const payload: CuttingEntryDTO = {
      serialNo,
      date,
      employeeId,
      employeeName: empNameResolved,
      issueTo,
      issueBranchId: issueTo === "Outside" ? issueBranchId : undefined,
      issueBranchName: issueTo === "Outside" ? branchNameResolved : undefined,

      totalPcs: String(lotRowsPruned.reduce((s, r) => s + toNum(r.pcs), 0)),
      totalCuttingAmount: fmt(
        lotRowsPruned.reduce((s, r) => s + toNum(r.amount), 0),
        2
      ),
      totalConsumption: stockRowsPruned
        .reduce((s, r) => s + toNum(r.consumption), 0)
        .toFixed(3),
      totalKho: stockRowsPruned
        .reduce((s, r) => s + toNum(r.kho), 0)
        .toFixed(3),
      totalConsAmount: fmt(
        stockRowsPruned.reduce((s, r) => s + toNum(r.consAmount), 0),
        2
      ),
      lotRows: lotRowsPruned,
      stockRows: stockRowsPruned,
    };
    return { ok: true, payload };
  };

  const formInvalid = useMemo(() => {
    if (!date || !employeeId) return true;
    if (issueTo === "Outside" && !issueBranchId) return true;
    const lotOk = rows.some((r) => (r.artNo || r.itemName) && toNum(r.pcs) > 0);
    const stockOk = stockRows.some(
      (r) =>
        r.itemName &&
        toNum(r.consumption) + toNum(r.kho) > 0 &&
        toNum(r.consRate) > 0
    );
    return !(lotOk && stockOk);
  }, [date, employeeId, rows, stockRows, issueTo, issueBranchId]);

  // ---------- Actions ----------
  const handleSave = async () => {
    const { ok, payload, msg } = buildValidatedPayload();
    if (!ok) {
      Swal.fire("Validation", msg!, "warning");
      return;
    }

    try {
      const dupMsg = await checkDuplicateCutLots(payload!);
      if (dupMsg) {
        Swal.fire("Error", dupMsg, "error");
        return;
      }
    } catch (e) {
      Swal.fire(
        "Error",
        "Failed to run Cutting Lot No uniqueness check. Please try again.",
        "error"
      );
      return;
    }

    const saved = await saveCutting(payload!);
    await Swal.fire({
      icon: "success",
      title: "Saved",
      text: `Serial: ${saved.serialNo}`,
      timer: 1400,
      showConfirmButton: false,
    });
    setSerialNo(await getNextSerial(date));
  };

  const handleUpdate = async () => {
    const { ok, payload, msg } = buildValidatedPayload();
    if (!ok) {
      Swal.fire("Validation", msg!, "warning");
      return;
    }

    try {
      const dupMsg = await checkDuplicateCutLots(payload!);
      if (dupMsg) {
        Swal.fire("Error", dupMsg, "error");
        return;
      }
    } catch (e) {
      Swal.fire(
        "Error",
        "Failed to run Cutting Lot No uniqueness check. Please try again.",
        "error"
      );
      return;
    }

    await updateCutting(serialNo, payload!);
    await Swal.fire({
      icon: "success",
      title: "Updated",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const handleDelete = async () => {
    const res = await Swal.fire({
      icon: "warning",
      title: `Delete entry ${serialNo}?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!res.isConfirmed) return;
    await deleteCutting(serialNo);
    await Swal.fire({
      icon: "success",
      title: "Deleted",
      timer: 1200,
      showConfirmButton: false,
    });
    await resetForm(true);
  };

  // ---- View List: sorted by serialNo (challan no) ----
  const openList = async () => {
    const data = await listCuttings();

    // Sort by serialNo in sequence (serial wise)
    const sorted = data
      .slice()
      .sort((a, b) =>
        String(a.serialNo || "").localeCompare(String(b.serialNo || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

    setEntryList(sorted);
    setListOpen(true);
  };

  const loadFromList = async (sn: string) => {
    const data = await getCutting(sn);
    const empNameResolved =
      (data.employeeName || "").trim() ||
      resolveEmployeeName(data.employeeId || "") ||
      "";

    setSerialNo(data.serialNo);
    setDate(data.date);

    setEmployeeId(data.employeeId || "");
    setEmployeeName(empNameResolved);

    setIssueTo((data.issueTo as IssueTo) || "Inside");
    setIssueBranchId((data.issueBranchId as any) || "");
    setIssueBranchName(data.issueBranchName || "");

    setRows(
      (data.lotRows || []).map((r, i) => ({
        id: i + 1,
        cutLotNo: r.cutLotNo || "",
        artNo: r.artNo || "",
        itemName: r.itemName || "",
        shade: r.shade || "",
        pcs: r.pcs || "",
        rate: r.rate || "",
        amount: r.amount || "",
      }))
    );
    setStockRows(
      (data.stockRows || []).map((r, i) => ({
        id: i + 1000,
        finishingInwardRowId: r.finishingInwardRowId || null,
        itemName: r.itemName || "",
        shade: r.shade || "",
        unit: r.unit || "Kg",
        consumption: r.consumption || "",
        kho: r.kho || "",
        consRate: r.consRate || "",
        consAmount: r.consAmount || "",
      }))
    );
    setListOpen(false);
  };

  // ---------- Issue To ----------
  const recalcRatesForCurrentRows = async (it: IssueTo) => {
    try {
      let artsList = arts;
      if (!artsList || artsList.length === 0) {
        try {
          artsList = await listArts();
          setArts(artsList);
        } catch {}
      }

      const updated = [...rows];
      let changed = 0;

      for (let idx = 0; idx < updated.length; idx++) {
        const r = updated[idx];
        if (!(r.artNo || r.itemName)) continue;

        const a =
          artsList.find(
            (x) =>
              (x.artNo || "").toLowerCase() === (r.artNo || "").toLowerCase()
          ) ||
          artsList.find(
            (x) =>
              (x.artName || "").toLowerCase() ===
              (r.itemName || "").toLowerCase()
          );
        if (!a) continue;

        const key = rateKey(a.serialNumber, it);
        let newRate: number;
        if (key in rateCache) {
          newRate = rateCache[key];
        } else {
          try {
            const detail = await getArtDetail(a.serialNumber);
            const pr =
              extractCuttingRate(detail, it) ||
              toNum(a.saleRate || a.styleRate || "");
            setRateCache((prev) => ({ ...prev, [key]: pr }));
            newRate = pr;
          } catch {
            newRate = toNum(a.saleRate || a.styleRate || "");
            setRateCache((prev) => ({ ...prev, [key]: newRate }));
          }
        }

        if (newRate) {
          updated[idx].rate = String(newRate);
          const pcsNum = toNum(updated[idx].pcs);
          updated[idx].amount = pcsNum ? (pcsNum * newRate).toFixed(2) : "";
          changed += 1;
        }
      }

      setRows(updated);
      if (changed > 0) {
        Swal.fire({
          icon: "success",
          title: "Rates updated",
          text: `Applied new rates to ${changed} rows`,
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "No changes",
          text: "No rows updated (missing art or same rate).",
          timer: 1200,
          showConfirmButton: false,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleIssueToButton = async () => {
    const res = await Swal.fire({
      icon: "question",
      title: "Issue To",
      text: "Select the process to use for Cutting rates",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Inside",
      denyButtonText: "Outside",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (res.isDismissed) return;

    const newIt: IssueTo = res.isDenied ? "Outside" : "Inside";
    setIssueTo(newIt);

    if (newIt === "Outside") {
      try {
        if (locations.length === 0) setLocations(await listLocations());
        if (!issueBranchId) {
          const inputOptions: Record<string, string> = {};
          locations.forEach((b) => (inputOptions[String(b.id)] = b.branchName));
          const pick = await Swal.fire({
            title: "Select Issue Branch",
            input: "select",
            inputOptions,
            inputPlaceholder: "Select branch",
            showCancelButton: true,
            confirmButtonText: "OK",
          });
          if (pick.isConfirmed && pick.value) {
            setIssueBranchId(pick.value);
            setIssueBranchName(resolveBranchName(pick.value));
          }
        }
      } catch {}
    } else {
      setIssueBranchId("");
      setIssueBranchName("");
    }

    const res2 = await Swal.fire({
      icon: "question",
      title: `Apply ${newIt} rates to current rows?`,
      text: "This will recalculate Cutting rate for rows where Art is selected.",
      showCancelButton: true,
      confirmButtonText: "Yes, apply",
      cancelButtonText: "No",
    });
    if (res2.isConfirmed) {
      await recalcRatesForCurrentRows(newIt);
    }
  };

  // ---------- Print ----------
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const empDisplay =
      (employeeName || "").trim() ||
      resolveEmployeeName(employeeId) ||
      employeeId ||
      "";

    const branchDisplay =
      issueTo === "Outside"
        ? issueBranchName || resolveBranchName(issueBranchId) || ""
        : "";

    const pcsTotal = rows.reduce((s, x) => s + toNum(x.pcs), 0);

    const lotRowsHTML = rows
      .map((r, i) => {
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${r.cutLotNo || "-"}</td>
            <td>${r.artNo || "-"}</td>
            <td>${r.itemName || "-"}</td>
            <td>${r.shade || "-"}</td>
            <td style="text-align:right">${r.pcs || "-"}</td>
            <td style="text-align:right">${r.rate || "-"}</td>
            <td style="text-align:right">${r.amount || "-"}</td>
          </tr>
        `;
      })
      .join("");

    const stockRowsHTML = stockRows
      .map((r, i) => {
        const cons = toNum(r.consumption);
        const kho = toNum(r.kho);
        const perPcs = pcsTotal > 0 ? ((cons + kho) / pcsTotal).toFixed(4) : "";
        const perPcsRate =
          toNum(perPcs) && toNum(r.consRate)
            ? (toNum(perPcs) * toNum(r.consRate)).toFixed(2)
            : "";
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${r.itemName || "-"}</td>
            <td>${r.shade || "-"}</td>
            <td style="text-align:right">${r.consumption || "-"}</td>
            <td style="text-align:right">${r.kho || "-"}</td>
            <td>${r.unit || "-"}</td>
            <td style="text-align:right">${perPcs || "-"}</td>
            <td style="text-align:right">${r.consRate || "-"}</td>
            <td style="text-align:right">${perPcsRate || "-"}</td>
            <td style="text-align:right">${r.consAmount || "-"}</td>
          </tr>`;
      })
      .join("");

    const totals = {
      pcs: pcsTotal,
      lotAmount: rows.reduce((s, r) => s + toNum(r.amount), 0),
      cons: stockRows.reduce((s, r) => s + toNum(r.consumption), 0),
      kho: stockRows.reduce((s, r) => s + toNum(r.kho), 0),
      consAmount: stockRows.reduce((s, r) => s + toNum(r.consAmount), 0),
      avgPerPcs:
        pcsTotal > 0
          ? (
              (stockRows.reduce((s, r) => s + toNum(r.consumption), 0) +
                stockRows.reduce((s, r) => s + toNum(r.kho), 0)) /
              pcsTotal
            ).toFixed(4)
          : "0.0000",
    };

    const html = `
      <html>
        <head>
          <title>Cutting Entry - ${serialNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; margin: 8px 0 16px; }
            h3 { margin: 18px 0 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #555; padding: 6px; text-align: center; }
            th { background: #f0f0f0; }
            .info p { margin: 2px 0; }
            .totals { margin-top: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Cutting Entry</h2>
          <div class="info">
            <p><b>Serial:</b> ${serialNo || "-"}</p>
            <p><b>Date:</b> ${date || "-"}</p>
            <p><b>Employee:</b> ${empDisplay || "-"}</p>
            <p><b>Issue To:</b> ${issueTo}</p>
            ${
              issueTo === "Outside"
                ? `<p><b>Branch:</b> ${branchDisplay || "-"}</p>`
                : ""
            }
          </div>

          <h3>Lot Details</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cutting Lot No</th>
                <th>Art No</th>
                <th>Item Name</th>
                <th>Shade</th>
                <th>PCs</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${
              lotRowsHTML || `<tr><td colspan="8">No rows</td></tr>`
            }</tbody>
          </table>

          <div class="totals">
            <p>Total PCs: ${totals.pcs}</p>
            <p>Total Cutting Amount: ₹${totals.lotAmount.toFixed(2)}</p>
          </div>

          <h3 style="margin-top:20px;">Stock Consumption</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fabric Name</th>
                <th>Shade</th>
                <th>Consumption</th>
                <th>KHO</th>
                <th>Unit</th>
                <th>Avg/Per Pcs</th>
                <th>Fabric Rate</th>
                <th>Per Pcs Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${
              stockRowsHTML || `<tr><td colspan="10">No rows</td></tr>`
            }</tbody>
          </table>

          <div class="totals">
            <p>Total Consumption: ${totals.cons.toFixed(3)} ${
      stockRows[0]?.unit || "Kg"
    }</p>
            <p>Total KHO: ${totals.kho.toFixed(3)} ${
      stockRows[0]?.unit || "Kg"
    }</p>
            <p>Overall Avg/Per Pcs: ${totals.avgPerPcs}</p>
            <p>Total Cons. Amount: ₹${totals.consAmount.toFixed(2)}</p>
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

  // ================= JSX =================
  return (
    <Dashboard>
      {/* LIST MODAL */}
      {listOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Cutting Entries</h3>
              <button
                onClick={() => setListOpen(false)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Close
              </button>
            </div>
            <input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search serial / lot no / employee / date / issue to / branch"
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-[70vh] border">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">S.No</th>
                    <th className="border p-2">Serial</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Cutting Lot No</th>
                    <th className="border p-2">Issue To</th>
                    <th className="border p-2">Branch</th>
                    <th className="border p-2">Employee</th>
                    <th className="border p-2 text-right">Total PCs</th>
                    <th className="border p-2 text-right">Consumption</th>
                    <th className="border p-2 text-right">KHO</th>
                    <th className="border p-2 text-right">Cons Amount</th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entryList
                    .filter((e) => {
                      const q = listSearch.trim().toLowerCase();
                      if (!q) return true;
                      const lotNos = (e.lotRows || [])
                        .map((r) => r.cutLotNo || "")
                        .join(", ");
                      return (
                        (e.serialNo || "").toLowerCase().includes(q) ||
                        lotNos.toLowerCase().includes(q) ||
                        (
                          (e.employeeName ||
                            resolveEmployeeName(e.employeeId || "") ||
                            "") as string
                        )
                          .toLowerCase()
                          .includes(q) ||
                        (e.date || "").toLowerCase().includes(q) ||
                        String(e.issueTo || "")
                          .toLowerCase()
                          .includes(q) ||
                        String(e.issueBranchName || "")
                          .toLowerCase()
                          .includes(q)
                      );
                    })
                    .map((e, i) => {
                      const nameResolved =
                        (e.employeeName || "").trim() ||
                        resolveEmployeeName(e.employeeId || "") ||
                        e.employeeId ||
                        "-";
                      const lotNos = (e.lotRows || [])
                        .map((r) => r.cutLotNo)
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <tr key={e.serialNo} className="hover:bg-gray-50">
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">{e.serialNo}</td>
                          <td className="border p-2">{e.date}</td>
                          <td className="border p-2">{lotNos || "-"}</td>
                          <td className="border p-2">{e.issueTo || "-"}</td>
                          <td className="border p-2">
                            {e.issueTo === "Outside"
                              ? e.issueBranchName || "-"
                              : "-"}
                          </td>
                          <td className="border p-2">{nameResolved}</td>
                          <td className="border p-2 text-right">
                            {e.totalPcs || "0"}
                          </td>
                          <td className="border p-2 text-right">
                            {e.totalConsumption || "0.000"}
                          </td>
                          <td className="border p-2 text-right">
                            {e.totalKho || "0.000"}
                          </td>
                          <td className="border p-2 text-right">
                            ₹{e.totalConsAmount || "0.00"}
                          </td>
                          <td className="border p-2 text-center space-x-2">
                            <button
                              onClick={() => loadFromList(e.serialNo)}
                              className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                const res = await Swal.fire({
                                  icon: "warning",
                                  title: `Delete ${e.serialNo}?`,
                                  showCancelButton: true,
                                  confirmButtonText: "Delete",
                                  confirmButtonColor: "#dc2626",
                                });
                                if (!res.isConfirmed) return;
                                await deleteCutting(e.serialNo);
                                setEntryList((prev) =>
                                  prev.filter((x) => x.serialNo !== e.serialNo)
                                );
                                Swal.fire({
                                  icon: "success",
                                  title: "Deleted",
                                  timer: 1200,
                                  showConfirmButton: false,
                                });
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {entryList.length === 0 && (
                    <tr>
                      <td
                        className="border p-3 text-center text-gray-500"
                        colSpan={12}
                      >
                        No entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAGE */}
      <div className="p-4 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Cutting Entry</h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Serial No.
              </label>
              <input
                value={serialNo}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1">
                Employee (Cutting)
              </label>
              <select
                value={employeeId}
                onChange={(e) => {
                  const val = e.target.value;
                  const labelText =
                    e.target.options[e.target.selectedIndex]?.text || "";
                  handleEmployeeChange(val, labelText);
                }}
                className="border p-2 rounded w-full bg-white"
              >
                <option value="">Select Cutting employee</option>
                {cuttingEmployees.map((emp) => (
                  <option key={emp.code} value={emp.code}>
                    {emp.employeeName}
                  </option>
                ))}
              </select>
            </div>

            {issueTo === "Outside" && (
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">
                  Issue Branch (Outside)
                </label>
                <select
                  value={issueBranchId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIssueBranchId(val);
                    setIssueBranchName(resolveBranchName(val));
                  }}
                  className="border p-2 rounded w-full bg-white"
                >
                  <option value="">Select Branch</option>
                  {locations.map((b) => (
                    <option key={String(b.id)} value={String(b.id)}>
                      {b.branchName}
                      {b.branchCode ? ` (${b.branchCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cutting Lot + Stock */}
          <div ref={printRef}>
            {/* Cutting Lot Details */}
            <h3 className="text-lg font-semibold mb-2">Cutting Lot Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-center">S.No</th>
                    <th className="border p-2">Cutting Lot No.</th>
                    <th className="border p-2">Art No.</th>
                    <th className="border p-2">Item Name</th>
                    <th className="border p-2">Colour/Shade</th>
                    <th className="border p-2 text-right">PCs</th>
                    <th className="border p-2 text-right">Rate</th>
                    <th className="border p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="border p-1 text-center">{i + 1}</td>
                      <td className="border p-1">
                        <input
                          value={r.cutLotNo}
                          onChange={(e) =>
                            handleCuttingChange(
                              r.id,
                              "cutLotNo",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full"
                          placeholder="Type cutting lot no."
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          value={r.artNo}
                          readOnly
                          onClick={() => openArtModal(r.id)}
                          className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                          placeholder="Click to select Art"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          value={r.itemName}
                          readOnly
                          className="border p-1 rounded w-full bg-gray-50"
                        />
                      </td>
                      <td className="border p-1">
                        <ShadeDropdown
                          value={r.shade}
                          onChange={(val) =>
                            handleCuttingChange(r.id, "shade", val)
                          }
                          options={shades}
                          className="w-full"
                          placeholder="Select shade"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="number"
                          value={r.pcs}
                          onChange={(e) =>
                            handleCuttingChange(r.id, "pcs", e.target.value)
                          }
                          className="border p-1 rounded w-full text-right"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          value={r.rate}
                          readOnly
                          className="border p-1 rounded w-full text-right bg-gray-50"
                          placeholder={`Auto from Art (Cutting ${issueTo})`}
                        />
                      </td>
                      <td className="border p-1 text-right bg-gray-50">
                        {r.amount ? `₹${Number(r.amount).toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border p-2 text-right" colSpan={5}>
                        Totals
                      </td>
                      <td className="border p-2 text-right">{totalPcs}</td>
                      <td className="border p-2 text-right">—</td>
                      <td className="border p-2 text-right">
                        ₹{fmt(totalCuttingAmount, 2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Cutting Stock Details */}
            <h3 className="text-lg font-semibold mt-6 mb-2">
              Cutting Stock Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-center">S.No</th>
                    <th className="border p-2">Fabric Name (In-house)</th>
                    <th className="border p-2">Shade</th>
                    <th className="border p-2 text-right">Consumption</th>
                    <th className="border p-2 text-right">KHO</th>
                    <th className="border p-2 text-center">Unit</th>
                    <th className="border p-2 text-right">Avg/Per Pcs</th>
                    <th className="border p-2 text-right">Fabric Rate</th>
                    <th className="border p-2 text-right">Per Pcs Rate</th>
                    <th className="border p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((r, i) => {
                    const pcs = totalPcs || 0;
                    const avg =
                      pcs > 0
                        ? ((toNum(r.consumption) + toNum(r.kho)) / pcs).toFixed(
                            4
                          )
                        : "";
                    const ppr =
                      toNum(avg) && toNum(r.consRate)
                        ? (toNum(avg) * toNum(r.consRate)).toFixed(2)
                        : "";
                    return (
                      <tr key={r.id}>
                        <td className="border p-1 text-center">{i + 1}</td>
                        <td className="border p-1">
                          <input
                            value={r.itemName}
                            readOnly
                            onClick={() => openFinishModal(r.id)}
                            className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                            placeholder="Click to select Fabric"
                          />
                        </td>
                        <td className="border p-1">
                          <ShadeDropdown
                            value={r.shade}
                            onChange={(val) =>
                              handleStockChange(r.id, "shade", val)
                            }
                            options={shades}
                            className="w-full"
                            placeholder="Select shade"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            value={r.consumption}
                            onChange={(e) =>
                              handleStockChange(
                                r.id,
                                "consumption",
                                e.target.value
                              )
                            }
                            className="border p-1 rounded w-full text-right"
                            placeholder="0.000"
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            value={r.kho}
                            onChange={(e) =>
                              handleStockChange(r.id, "kho", e.target.value)
                            }
                            className="border p-1 rounded w-full text-right"
                            placeholder="0.000"
                            title="Manual KHO (wastage)"
                          />
                        </td>
                        <td className="border p-1 text-center">
                          <select
                            value={r.unit}
                            onChange={(e) =>
                              handleStockChange(r.id, "unit", e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          >
                            <option value="Kg">Kg</option>
                            <option value="Mtr">Mtr</option>
                          </select>
                        </td>
                        <td className="border p-1 text-right bg-gray-50">
                          {avg || "-"}
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            value={r.consRate}
                            readOnly
                            className="border p-1 rounded w-full text-right bg-gray-50"
                            title="Sum of (KYR+Dyeing Rate) and Finishing Rate from Finishing Inward"
                          />
                        </td>
                        <td className="border p-1 text-right bg-gray-50">
                          {ppr || "-"}
                        </td>
                        <td className="border p-1 text-right bg-gray-50">
                          {r.consAmount
                            ? `₹${Number(r.consAmount).toFixed(2)}`
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {stockRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border p-2 text-right" colSpan={3}>
                        Totals
                      </td>
                      <td className="border p-2 text-right">
                        {totalConsumption.toFixed(3)}
                      </td>
                      <td className="border p-2 text-right">
                        {totalKho.toFixed(3)}
                      </td>
                      <td className="border p-2 text-right">—</td>
                      <td className="border p-2 text-right">
                        {overallAvgPerPcs}
                      </td>
                      <td className="border p-2 text-right">—</td>
                      <td className="border p-2 text-right">—</td>
                      <td className="border p-2 text-right">
                        ₹{fmt(totalConsAmount, 2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={addCuttingRow}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Add Cutting Row
            </button>
            <button
              onClick={addStockRow}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Add Stock Row
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-700 text-white rounded"
            >
              Print
            </button>

            <div className="grow" />

            <button
              onClick={handleSave}
              disabled={formInvalid}
              className={`px-4 py-2 rounded text-white ${
                formInvalid
                  ? "bg-emerald-300 cursor-not-allowed"
                  : "bg-emerald-600"
              }`}
            >
              Save
            </button>
            <button
              onClick={handleUpdate}
              disabled={formInvalid}
              className={`px-4 py-2 rounded text-white ${
                formInvalid ? "bg-amber-300 cursor-not-allowed" : "bg-amber-600"
              }`}
            >
              Update
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Delete
            </button>
            <button
              onClick={openList}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              View List
            </button>
            <button
              onClick={handleIssueToButton}
              className="px-4 py-2 bg-purple-600 text-white rounded"
            >
              Issue To
            </button>
          </div>
        </div>
      </div>

      {/* ART SELECT MODAL */}
      {artModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Select Art</h3>
              <button
                onClick={() => setArtModalOpen(false)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Close
              </button>
            </div>
            <input
              value={artSearch}
              onChange={(e) => setArtSearch(e.target.value)}
              placeholder={`Search art no/name/rate (Cutting ${issueTo})`}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96 border">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Art No</th>
                    <th className="border p-2 text-left">Art Name</th>
                    <th className="border p-2 text-right">
                      Proc. Rate ({issueTo})
                    </th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArts.map((a) => {
                    const key = rateKey(a.serialNumber, issueTo);
                    const cached =
                      key in rateCache ? rateCache[key] : undefined;
                    if (cached === undefined) {
                      ensureRateLoaded(a, issueTo);
                    }
                    const showRate =
                      cached ?? toNum(a.saleRate || a.styleRate || "");
                    return (
                      <tr key={a.serialNumber} className="hover:bg-gray-50">
                        <td className="border p-2">{a.artNo}</td>
                        <td className="border p-2">{a.artName}</td>
                        <td className="border p-2 text-right">
                          {showRate ? showRate.toFixed(2) : "..."}
                        </td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => applyArtToRow(a)}
                            className="px-3 py-1 bg-blue-600 text-white rounded"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredArts.length === 0 && (
                    <tr>
                      <td
                        className="border p-3 text-center text-gray-500"
                        colSpan={4}
                      >
                        No arts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FINISHING ROW SELECT MODAL */}
      {finishModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Select In-house Fabric</h3>
              <button
                onClick={() => setFinishModalOpen(false)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Close
              </button>
            </div>
            <input
              value={finishSearch}
              onChange={(e) => setFinishSearch(e.target.value)}
              placeholder="Search lot/item/shade/rate"
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96 border">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Lot No</th>
                    <th className="border p-2">Item Name</th>
                    <th className="border p-2">Shade</th>
                    <th className="border p-2 text-right">KYR+Dyeing Rate</th>
                    <th className="border p-2 text-right">Finishing Rate</th>
                    <th className="border p-2 text-right">Total Rate</th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {finishingRows
                    .filter((f) => {
                      const q = finishSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (f.lotNo || "").toLowerCase().includes(q) ||
                        (f.itemName || "").toLowerCase().includes(q) ||
                        (f.shade || "").toLowerCase().includes(q) ||
                        (f.rate || "").toString().includes(q) ||
                        (f.rateFND || "").toString().includes(q)
                      );
                    })
                    .map((f, idx) => {
                      const kyrDyeingSum = toNum(f.rateFND);
                      const finishingRate = toNum(f.rate);
                      const totalFabricRate = kyrDyeingSum + finishingRate;

                      return (
                        <tr
                          key={f.id ?? `row-${idx}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="border p-2">{f.lotNo || "-"}</td>
                          <td className="border p-2">{f.itemName || "-"}</td>
                          <td className="border p-2">{f.shade || "-"}</td>
                          <td className="border p-2 text-right">
                            {kyrDyeingSum ? kyrDyeingSum.toFixed(2) : "-"}
                          </td>
                          <td className="border p-2 text-right">
                            {finishingRate ? finishingRate.toFixed(2) : "-"}
                          </td>
                          <td className="border p-2 text-right font-bold">
                            {totalFabricRate ? totalFabricRate.toFixed(2) : "-"}
                          </td>
                          <td className="border p-2 text-center">
                            <button
                              onClick={() => applyFinishingRow(f)}
                              className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {finishingRows.length === 0 && (
                    <tr>
                      <td
                        className="border p-3 text-center text-gray-500"
                        colSpan={7}
                      >
                        No rows found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default CuttingModule;