import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

/* =========================
   Types
========================= */
type ShadeOpt = { code: string; name: string };

type LotRecord = {
  lotNo: string;
  artNo: string;
  itemName: string;
  artGroup?: string; // optional pre-filled artGroup if available in cutting-entries
};

interface RowData {
  id: number; // local key
  cuttinglotNo: string;
  artNo: string;
  artGroup: string; // shown; saved as artGroupName
  workOnArt: string;

  // Dynamic per-size maps
  sizeRate: Record<string, string>; // sizeName -> rate
  sizeBox: Record<string, string>; // sizeName -> boxes
  sizePerBox: Record<string, string>; // sizeName -> perBox
  sizeIdByName: Record<string, number>; // sizeName -> id

  shade: string; // shown (shadeName)
  shadeCode?: string | null; // saved (pk)

  pcs: string; // auto: (sumBox * sumPerBox)
  amount: string; // auto: (sumRates * pcs)
}

/* =========================
   Utils
========================= */
const sanitizeNumber = (v: string) => {
  const cleaned = v.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  return cleaned;
};
const toNum = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const sizeSort = (a: string, b: string) => {
  const known = [
    "3XS",
    "XXXS",
    "2XS",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "2XL",
    "3XL",
    "4XL",
    "5XL",
  ];
  const ai = known.indexOf(a.toUpperCase());
  const bi = known.indexOf(b.toUpperCase());
  if (ai !== -1 && bi !== -1) return ai - bi;
  const an = Number(a);
  const bn = Number(b);
  if (!isNaN(an) && !isNaN(bn)) return an - bn;
  if (!isNaN(an)) return -1;
  if (!isNaN(bn)) return 1;
  return a.localeCompare(b);
};

/* ========== Cutting Lot Modal (Sale style) ========== */
const CuttingLotModal: React.FC<{
  open: boolean;
  lots: LotRecord[];
  onClose: () => void;
  onSelect: (lot: LotRecord) => void;
}> = ({ open, lots, onClose, onSelect }) => {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return lots;
    return lots.filter(
      (x) =>
        x.lotNo.toLowerCase().includes(s) ||
        (x.artNo || "").toLowerCase().includes(s) ||
        (x.itemName || "").toLowerCase().includes(s)
    );
  }, [q, lots]);

  if (!open) return null;
  return (
    <div className="z-[1200] fixed inset-0 flex justify-center items-center bg-black/50">
      <div className="flex flex-col bg-white shadow-lg p-5 rounded-lg w-full max-w-4xl max-h-[85vh]">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg">Select Cutting Lot</h3>
          <button onClick={onClose} className="bg-gray-200 px-3 py-1 rounded">
            Close
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lot no / art no / item…"
          className="mb-3 p-2 border rounded w-full"
        />
        <div className="border rounded overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Lot No</th>
                <th className="p-2 border">Art No</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="p-3 border text-gray-500 text-center" colSpan={4}>
                    No records
                  </td>
                </tr>
              ) : (
                filtered.map((x) => (
                  <tr key={x.lotNo} className="hover:bg-gray-50">
                    <td className="p-2 border">{x.lotNo}</td>
                    <td className="p-2 border">{x.artNo}</td>
                    <td className="p-2 border">{x.itemName}</td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => onSelect(x)}
                        className="bg-blue-600 px-3 py-1 rounded text-white"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ========== Shade Modal (Sale style) ========== */
const ShadeModal: React.FC<{
  open: boolean;
  shades: ShadeOpt[];
  onClose: () => void;
  onSelect: (shade: ShadeOpt) => void;
}> = ({ open, shades, onClose, onSelect }) => {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return shades;
    return shades.filter(
      (sh) =>
        (sh.name || "").toLowerCase().includes(s) ||
        (sh.code || "").toLowerCase().includes(s)
    );
  }, [q, shades]);

  if (!open) return null;
  return (
    <div className="z-[1200] fixed inset-0 flex justify-center items-center bg-black/50">
      <div className="bg-white shadow-lg p-5 rounded-lg w-full max-w-3xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg">Select Shade</h3>
          <button onClick={onClose} className="bg-gray-200 px-3 py-1 rounded">
            Close
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shade name / code"
          className="mb-3 p-2 border rounded w-full"
        />
        <div className="border max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Shade Code</th>
                <th className="p-2 border">Shade Name</th>
                <th className="p-2 border text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="p-3 border text-gray-500 text-center" colSpan={3}>
                    No shades found
                  </td>
                </tr>
              ) : (
                filtered.map((sh) => (
                  <tr key={`${sh.code}-${sh.name}`} className="hover:bg-gray-50">
                    <td className="p-2 border">{sh.code}</td>
                    <td className="p-2 border">{sh.name}</td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => onSelect(sh)}
                        className="bg-blue-600 px-3 py-1 rounded text-white"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Main Component
========================= */
const PackingChallan: React.FC = () => {
  const [date, setDate] = useState("");
  const [partyId, setPartyId] = useState("");
  const [parties, setParties] = useState<any[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);

  // ⭐ NEW: defaults from Packing Challan table per ArtNo+Size
  const [artDefaults, setArtDefaults] = useState<{
    [artNo: string]: {
      sizeRate: Record<string, string>;
      sizePerBox: Record<string, string>;
    };
  }>({});

  // View List modal
  const [listOpen, setListOpen] = useState(false);
  const [listData, setListData] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState("");

  // Cutting Lot modal
  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [lotModalForRowId, setLotModalForRowId] = useState<number | null>(null);
  const [lots, setLots] = useState<LotRecord[]>([]);

  // Shade modal
  const [shadeModalOpen, setShadeModalOpen] = useState(false);
  const [shadeModalForRowId, setShadeModalForRowId] = useState<number | null>(null);
  const [shades, setShades] = useState<ShadeOpt[]>([]);

  // editing marker (serialNo) — determines Save vs Update
  const [editingSerial, setEditingSerial] = useState<string | null>(null);

  const addBlankRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        cuttinglotNo: "",
        artNo: "",
        artGroup: "",
        workOnArt: "",
        sizeRate: {},
        sizeBox: {},
        sizePerBox: {},
        sizeIdByName: {},
        shade: "",
        shadeCode: null,
        pcs: "",
        amount: "",
      },
    ]);

  useEffect(() => {
    if (rows.length === 0) addBlankRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial row

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/party/category/Packing");
        setParties(res.data || []);
      } catch {}
    })();
  }, []);

  // Load Cutting Lots with art/item
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<any[]>("/cutting-entries");
        const docs = Array.isArray(data) ? data : [];
        const map = new Map<string, LotRecord>();
        for (const d of docs) {
          for (const r of d?.lotRows || []) {
            const lotNo = String(
              r.cutLotNo || r.cutlotNo || r.cuttingLotNo || ""
            ).trim();
            if (!lotNo) continue;
            if (!map.has(lotNo)) {
              map.set(lotNo, {
                lotNo,
                artNo: String(r.artNo || ""),
                itemName: String(r.itemName || ""),
                artGroup: String(
                  r.artGroupName || r.artGroup || r.group || ""
                ), // try common keys
              });
            }
          }
        }
        if (map.size > 0) {
          setLots(Array.from(map.values()));
          return;
        }
      } catch {}
      // Fallback only lot nos
      try {
        const { data } = await api.get<string[]>("/packing-challans/cutting-lots");
        const list: string[] = Array.isArray(data)
          ? data.filter(Boolean).map(String)
          : [];
        setLots(list.map((x) => ({ lotNo: x, artNo: "", itemName: "" })));
      } catch {
        setLots([]);
      }
    })();
  }, []);

  // Load shades once
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any[]>("/shade/list");
        const list: ShadeOpt[] = (Array.isArray(res.data) ? res.data : []).map(
          (x) => ({
            code: String(x.shadeCode || "").trim().toUpperCase(),
            name: String(x.shadeName || "").trim(),
          })
        );
        setShades(list);
      } catch {
        setShades([]);
      }
    })();
  }, []);

  // ⭐ NEW: Load stored Rate & Per/Box per ArtNo/Size from Packing Challan table
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<any[]>("/packing-challans");
        const challans = Array.isArray(data) ? data : [];

        const map: {
          [artNo: string]: {
            sizeRate: Record<string, string>;
            sizePerBox: Record<string, string>;
          };
        } = {};

        for (const ch of challans) {
  const challanRows: any[] = Array.isArray(ch.rows) ? ch.rows : [];
  for (const r of challanRows) {
    const artNo = String(r.artNo || "").trim();
    if (!artNo) continue;

    const details: any[] = Array.isArray(r.sizeDetails)
      ? r.sizeDetails
      : [];

    if (!map[artNo]) {
      map[artNo] = {
        sizeRate: {},
        sizePerBox: {},
      };
    }
    const entry = map[artNo];

    details.forEach((sd) => {
      const sizeName = String(sd.sizeName || sd.size || "").trim();
      if (!sizeName) return;

      const rateVal = sd.rate;
      const perBoxVal = sd.perBox;

      // 👉 ALWAYS overwrite, so the *last* challan row for this Art+Size wins
      if (rateVal !== null && rateVal !== undefined && rateVal !== "") {
        entry.sizeRate[sizeName] = String(rateVal);
      }

      if (perBoxVal !== null && perBoxVal !== undefined && perBoxVal !== "") {
        entry.sizePerBox[sizeName] = String(perBoxVal);
      }
    });
  }
}


        setArtDefaults(map);
        // console.log("artDefaults", map);
      } catch (err) {
        console.error("Failed to load art defaults from packing challans", err);
      }
    })();
  }, []);

  // Recalc based on per-size Box * PerBox
  const recalcRow = (r: RowData): RowData => {
    const next: RowData = { ...r };

    // collect union of all size keys
    const keys = new Set<string>([
      ...Object.keys(next.sizeRate || {}),
      ...Object.keys(next.sizeBox || {}),
      ...Object.keys(next.sizePerBox || {}),
    ]);

    let totalPcs = 0;
    let totalAmount = 0;

    keys.forEach((k) => {
      const box = toNum(next.sizeBox?.[k] || 0);
      const perBox = toNum(next.sizePerBox?.[k] || 0);
      const rate = toNum(next.sizeRate?.[k] || 0);

      const pcs = box * perBox; // ✅ separate for each size column
      const amt = pcs * rate; // per-size amount

      totalPcs += pcs;
      totalAmount += amt;
    });

    next.pcs = totalPcs ? String(totalPcs) : "";
    next.amount = Number(totalAmount).toFixed(2);
    return next;
  };

  const patchRow = (rowId: number, patch: Partial<RowData>) =>
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? recalcRow({ ...r, ...patch }) : r))
    );

  // Per-size handlers
  const handleSizeBoxChange = (id: number, sizeName: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const sizeBox = { ...(r.sizeBox || {}) };
        sizeBox[sizeName] = sanitizeNumber(value);
        return recalcRow({ ...r, sizeBox });
      })
    );
  };
  const handleSizePerBoxChange = (id: number, sizeName: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const sizePerBox = { ...(r.sizePerBox || {}) };
        sizePerBox[sizeName] = sanitizeNumber(value);
        return recalcRow({ ...r, sizePerBox });
      })
    );
  };
  const handleSizeRateChange = (id: number, sizeName: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const sizeRate = { ...(r.sizeRate || {}) };
        sizeRate[sizeName] = sanitizeNumber(value);
        return recalcRow({ ...r, sizeRate });
      })
    );
  };

  // Derived size columns across all rows (union of all keys)
  const sizeColumns = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      Object.keys(r.sizeRate || {}).forEach((k) => s.add(k));
      Object.keys(r.sizeBox || {}).forEach((k) => s.add(k));
      Object.keys(r.sizePerBox || {}).forEach((k) => s.add(k));
    });
    return Array.from(s).sort(sizeSort);
  }, [rows]);

  // Totals
  const totalBox = useMemo(
    () =>
      rows.reduce(
        (sum, r) =>
          sum +
          Object.values(r.sizeBox || {}).reduce(
            (a, v) => a + (toNum(v) || 0),
            0
          ),
        0
      ),
    [rows]
  );
  const totalPerBox = useMemo(
    () =>
      rows.reduce(
        (sum, r) =>
          sum +
          Object.values(r.sizePerBox || {}).reduce(
            (a, v) => a + (toNum(v) || 0),
            0
          ),
        0
      ),
    [rows]
  );
  const totalPcs = useMemo(
    () => rows.reduce((s, r) => s + (toNum(r.pcs) || 0), 0),
    [rows]
  );
  const totalAmount = useMemo(
    () => rows.reduce((s, r) => s + (toNum(r.amount) || 0), 0),
    [rows]
  );

  // Cutting Lot selection
  const openLotModalForRow = (rowId: number) => {
    setLotModalForRowId(rowId);
    setLotModalOpen(true);
  };

  const loadSizesByArtNo = async (artNo: string) => {
    if (!artNo)
      return {
        sizeRate: {},
        sizeBox: {},
        sizePerBox: {},
        sizeIdByName: {},
        artGroup: "",
      };
    try {
      const listRes = await api.get<any[]>("/arts");
      const list = Array.isArray(listRes.data) ? listRes.data : [];
      const found = list.find(
        (a) =>
          String(a.artNo || "").trim().toLowerCase() ===
          artNo.trim().toLowerCase()
      );

      // try artGroup from list item first
      let artGroup = String(
        found?.artGroupName ||
          found?.artGroup ||
          found?.group ||
          found?.groupName ||
          found?.name ||
          ""
      ).trim();

      // If art not found in /arts, still try using defaults from packing challan
      if (!found?.serialNumber) {
        const defaults = artDefaults[artNo] || {
          sizeRate: {},
          sizePerBox: {},
        };
        const sizeRate = { ...defaults.sizeRate };
        const sizeBox: Record<string, string> = {};
        const sizePerBox = { ...defaults.sizePerBox };
        const sizeIdByName: Record<string, number> = {};
        return { sizeRate, sizeBox, sizePerBox, sizeIdByName, artGroup };
      }

      const det = await api
        .get<any>(`/arts/${found.serialNumber}`)
        .catch(() => null);
      const detData = det?.data ?? null;

      // sizes from detail
      const sizes = Array.isArray(detData?.sizes) ? detData.sizes : [];

      // try artGroup from detail if not on list
      if (!artGroup && detData) {
        artGroup = String(
          detData.artGroupName ||
            detData.artGroup ||
            detData.group ||
            detData.groupName ||
            detData.name ||
            (Array.isArray(detData) &&
              detData[0] &&
              (detData[0].artGroupName ||
                detData[0].name ||
                detData[0].artGroup)) ||
            ""
        ).trim();
      }

      const sizeRate: Record<string, string> = {};
      const sizeBox: Record<string, string> = {};
      const sizePerBox: Record<string, string> = {};
      const sizeIdByName: Record<string, number> = {};

      sizes.forEach((s: any) => {
        const name = String(s.sizeName || s.name || "").trim();
        const id = Number(s.id || s.sizeId || 0);
        if (name) {
          sizeRate[name] =
            s?.rate !== undefined && s?.rate !== null
              ? String(s.rate)
              : "";
          sizeBox[name] = "";
          sizePerBox[name] = "";
          if (id) sizeIdByName[name] = id;
        }
      });

      // Overlay stored defaults from Packing Challan table (Rate & Per/Box)
      const defaults = artDefaults[artNo];
      if (defaults) {
        // override rate where stored
        Object.keys(defaults.sizeRate).forEach((sizeName) => {
          const v = defaults.sizeRate[sizeName];
          if (v !== undefined && v !== null && v !== "") {
            sizeRate[sizeName] = v;
          }
        });

        // override perBox where stored
        Object.keys(defaults.sizePerBox).forEach((sizeName) => {
          const v = defaults.sizePerBox[sizeName];
          if (v !== undefined && v !== null && v !== "") {
            sizePerBox[sizeName] = v;
          }
        });

        // if there is a size only in defaults (not in /arts), still include it
        Object.keys(defaults.sizeRate).forEach((sizeName) => {
          if (!(sizeName in sizeRate)) {
            sizeRate[sizeName] = defaults.sizeRate[sizeName];
            sizeBox[sizeName] = "";
            sizePerBox[sizeName] = defaults.sizePerBox[sizeName] || "";
          }
        });
      }

      return { sizeRate, sizeBox, sizePerBox, sizeIdByName, artGroup };
    } catch (err) {
      return {
        sizeRate: {},
        sizeBox: {},
        sizePerBox: {},
        sizeIdByName: {},
        artGroup: "",
      };
    }
  };

  const handleLotPicked = async (lot: LotRecord) => {
    const rowId = lotModalForRowId;
    setLotModalOpen(false);
    setLotModalForRowId(null);
    if (rowId == null) return; // allow 0

    const artNo = (lot.artNo || "").trim();

    // Prefer artGroup already on lot (from cutting-entries) if present
    const lotArtGroup = String((lot as any).artGroup || "").trim();

    // Load sizes AND artGroup together
    const sizesRes = await loadSizesByArtNo(artNo);
    const {
      sizeRate,
      sizeBox,
      sizePerBox,
      sizeIdByName,
      artGroup: artGroupFromSizes,
    } =
      sizesRes || {
        sizeRate: {},
        sizeBox: {},
        sizePerBox: {},
        sizeIdByName: {},
        artGroup: "",
      };

    // Final artGroup prefers lot -> sizes -> (fallback empty)
    const finalArtGroup = lotArtGroup || (artGroupFromSizes || "");

    // Patch row with everything
    patchRow(rowId, {
      cuttinglotNo: lot.lotNo,
      artNo: artNo,
      workOnArt: lot.itemName || "",
      artGroup: finalArtGroup,
      sizeRate,
      sizeBox,
      sizePerBox,
      sizeIdByName,
      pcs: "",
      amount: "0.00",
    });
  };

  // Shade select
  const openShadeModalForRow = (rowId: number) => {
    setShadeModalForRowId(rowId);
    setShadeModalOpen(true);
  };
  const handleShadePicked = (shade: ShadeOpt) => {
    const rowId = shadeModalForRowId;
    setShadeModalOpen(false);
    setShadeModalForRowId(null);
    if (!rowId) return;
    patchRow(rowId, { shade: shade.name, shadeCode: shade.code });
  };

  // -------- Save / Delete / Print --------
  const buildPayload = () => ({
    date,
    partyId: partyId ? parseInt(partyId) : null,
    rows: rows
      .filter((r) => r.cuttinglotNo || r.artNo || r.workOnArt)
      .map((r, idx) => {
        const keys = new Set<string>([
          ...Object.keys(r.sizeRate || {}),
          ...Object.keys(r.sizeBox || {}),
          ...Object.keys(r.sizePerBox || {}),
        ]);

        const sizeDetails = Array.from(keys).map((k) => {
          const box = toNum(r.sizeBox?.[k] || 0);
          const perBox = toNum(r.sizePerBox?.[k] || 0);
          const pcs = box * perBox; // ✅ per-size pcs
          const rate = toNum(r.sizeRate?.[k] || 0);
          const amount = Number((pcs * rate).toFixed(2)); // per-size amount

          return {
            sizeId: r.sizeIdByName?.[k] || null,
            sizeName: k,
            boxCount: box,
            perBox,
            pcs,
            rate,
            amount,
          };
        });

        // ✅ row totals = sum of per-size values
        const rowPcs = sizeDetails.reduce((sum, d) => sum + d.pcs, 0);
        const rowAmount = sizeDetails.reduce((sum, d) => sum + d.amount, 0);

        return {
          sno: idx + 1,
          cuttingLotNo: (r.cuttinglotNo || "").trim(),
          artNo: (r.artNo || "").trim(),
          workOnArt: (r.workOnArt || "").trim(),
          artGroupName: (r.artGroup || "").trim(),
          shadeCode: r.shadeCode ?? null,
          pcs: rowPcs, // ✅ 120 + 50 = 170, etc.
          amount: Number(rowAmount.toFixed(2)),
          sizeDetails,
        };
      }),
  });

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload.partyId || !date) {
      return Swal.fire("Validation", "Date and Party are required.", "warning");
    }
    if (payload.rows.length === 0) {
      return Swal.fire("Validation", "Add at least one row.", "warning");
    }
    const anyPcs = payload.rows.some(
      (r: any) =>
        Array.isArray(r.sizeDetails) &&
        r.sizeDetails.some((sd: any) => Number(sd.pcs) > 0)
    );
    if (!anyPcs) {
      return Swal.fire(
        "Validation",
        "Please enter Box & Per/Box for at least one size.",
        "warning"
      );
    }

    try {
      if (editingSerial) {
        // Update flow
        await api.put(
          `/packing-challans/${encodeURIComponent(editingSerial)}`,
          payload
        );
        Swal.fire({
          icon: "success",
          title: "Updated!",
          timer: 2000,
          showConfirmButton: false,
        });
        setEditingSerial(null);
      } else {
        // Create flow
        await api.post("/packing-challans", payload);
        Swal.fire({
          icon: "success",
          title: "Saved!",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (e: any) {
      Swal.fire(
        "Error",
        e?.response?.data?.message || "Failed to save challan.",
        "error"
      );
    }
  };

  // const _handleDelete = async () => {
  //   const ok = await Swal.fire({
  //     title: "Delete this challan?",
  //     text: "This cannot be undone.",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonText: "Yes, delete",
  //   });
  //   if (!ok.isConfirmed) return;
  //   setRows([{ ...rows[0], id: Date.now() }]);
  //   setPartyId("");
  //   setDate("");
  //   Swal.fire("Deleted!", "", "success");
  // };

  //Print Function
  const handlePrint = () => {
    const w = window.open("", "_blank")!;

    // get party name
    const party = parties.find((p) => String(p.id) === String(partyId));
    const partyName = party ? party.partyName : "";

    // only non-empty rows
    const printableRows = rows.filter(
      (r) => r.cuttinglotNo || r.artNo || r.workOnArt
    );

    const html = `
    <html>
    <head>
      <title>Packing Challan</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 8px; }
        h2 { text-align:center; margin: 0 0 4px; }
        .subtitle { text-align:center; margin: 0 0 10px; font-size: 12px; }

        table { 
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;         /* keeps layout stable for A4 & A5 */
        }
        th, td {
          border: 1px solid #333;
          padding: 4px 3px;
          font-size: 10px;             /* a bit smaller so A5 is OK */
          text-align: center;
          word-wrap: break-word;
        }
        thead th { background: #eee; }
        tfoot td { background: #fff59d; font-weight: 600; }

        th.col-sr,   td.col-sr   { width: 9%;  }
        th.col-cl,   td.col-cl   { width: 15%; }
        th.col-art,  td.col-art  { width: 15%; }
        th.col-ag,   td.col-ag   { width: 15%; }
        th.col-woa,  td.col-woa  { width: 15%; }
        th.col-size, td.col-size { width: 50%; text-align: left; }
        th.col-sh,   td.col-sh   { width: 13%;  }
        th.col-pcs,  td.col-pcs  { width: 9%;  }
        th.col-amt,  td.col-amt  { width: 20%; }

        @media print {
          @page { margin: 10mm; }      /* user can choose A4 or A5 */
        }
      </style>
    </head>
    <body>
      <h2>Packing Challan</h2>
      <p class="subtitle">
        ${date ? `Date: ${date}` : ""}${date && partyName ? " | " : ""}${
      partyName ? `Party: ${partyName}` : ""
    }
      </p>

      <table>
        <thead>
          <tr>
            <th class="col-sr">Sr.No</th>
            <th class="col-cl">Cutting Lot No</th>
            <th class="col-art">Art No</th>
            <th class="col-ag">Art Group</th>
            <th class="col-woa">Work on Art</th>
            <th class="col-size">Size</th>
            <th class="col-sh">Shade</th>
            <th class="col-pcs">Pcs</th>
            <th class="col-amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${printableRows
            .map((r, idx) => {
              // only show sizes which have any value (box/perBox/rate)
              const sizeParts = sizeColumns
                .map((s) => {
                  const box = Number(r.sizeBox?.[s] || 0);
                  const perBox = Number(r.sizePerBox?.[s] || 0);
                  const rate = Number(r.sizeRate?.[s] || 0);
                  if (!box && !perBox && !rate) return null; // skip empty size
                  return `${s}: Box ${box || ""}, PB ${perBox || ""}, ₹${
                    rate ? rate.toFixed(2) : ""
                  }`;
                })
                .filter(Boolean) as string[];

              const sizeHtml = sizeParts.length ? sizeParts.join("<br/>") : "";

              return `
                <tr>
                  <td class="col-sr">${idx + 1}</td>
                  <td class="col-cl">${r.cuttinglotNo || ""}</td>
                  <td class="col-art">${r.artNo || ""}</td>
                  <td class="col-ag">${r.artGroup || ""}</td>
                  <td class="col-woa">${r.workOnArt || ""}</td>
                  <td class="col-size">${sizeHtml}</td>
                  <td class="col-sh">${r.shade || ""}</td>
                  <td class="col-pcs">${r.pcs || ""}</td>
                  <td class="col-amt">${r.amount || ""}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:right">Totals</td>
            <td class="col-size">
              Box: ${totalBox} <br/> Per/Box: ${totalPerBox}
            </td>
            <td></td>
            <td class="col-pcs">${totalPcs}</td>
            <td class="col-amt">₹${totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

    w.document.write(html);
    w.document.close();
    w.print();
  };

  // -------- View List --------
  const openList = async () => {
    try {
      const { data } = await api.get<any[]>("/packing-challans");
      const list = Array.isArray(data) ? data : [];
      setListData(list);
      setListOpen(true);
    } catch {
      setListData([]);
      setListOpen(true);
    }
  };

  // map listData -> flatRows for display (and include serialNo so we can edit/delete)
  const flatRows = useMemo(() => {
    const out: any[] = [];
    for (const ch of listData) {
      const date = ch.date || ch.dated || "";
      const partyName = ch.partyName || "";
      const rows = Array.isArray(ch.rows) ? ch.rows : [];

      rows.forEach((r: any, i: number) => {
        const details: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];

        // sort sizes like main table
        const sortedDetails = [...details].sort((a, b) =>
          sizeSort(
            String(a.sizeName || a.size || ""),
            String(b.sizeName || b.size || "")
          )
        );

        // ✅ keep only sizes that have some value (box / perBox / rate)
        const nonEmptyDetails = sortedDetails.filter((sd: any) => {
          const box = Number(sd.boxCount ?? sd.box ?? 0);
          const perBox = Number(sd.perBox ?? 0);
          const rate = Number(sd.rate ?? 0);
          return box !== 0 || perBox !== 0 || rate !== 0;
        });

        const sizeLabel = nonEmptyDetails.length
          ? nonEmptyDetails
              .map(
                (sd: any) =>
                  `${sd.sizeName ?? sd.size ?? ""}: Box ${
                    sd.boxCount ?? 0
                  }, PB ${sd.perBox ?? 0}, ₹${Number(
                    sd.rate ?? 0
                  ).toFixed(2)}`
              )
              .join("\n") // each size on a new line
          : ""; // nothing if all sizes are empty

        out.push({
          serialNo: ch.serialNo ?? ch.serialNo,
          sno: i + 1,
          date,
          partyName,
          cuttingLotNo: r.cuttingLotNo || r.cutLotNo || "",
          artGroup: r.artGroupName || "",
          workOnArt: r.workOnArt || "",
          size: sizeLabel,
          shade: r.shadeName || "",
          box: details.length
            ? details.reduce(
                (s: number, sd: any) => s + Number(sd.boxCount || 0),
                0
              )
            : r.box || r.boxCount || 0,
          pcs: r.pcs || 0,
          rate: nonEmptyDetails.length
            ? nonEmptyDetails
                .map((sd: any) => Number(sd.rate || 0).toFixed(2))
                .join(", ")
            : r.rate || 0,
          amount: r.amount || 0,
        });
      });
    }

    const q = listSearch.trim().toLowerCase();
    if (!q) return out;
    return out.filter((x) =>
      Object.values(x).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [listData, listSearch]);

  // Edit from modal: load challan DTO, map to local form (rows etc.)
  const handleEditFromList = async (serialNo: string) => {
    try {
      const res = await api.get(
        `/packing-challans/${encodeURIComponent(serialNo)}`
      );
      const dto = res.data;
      // Map dto -> form fields (date, partyId, rows)
      setDate(dto.date || "");
      setPartyId(dto.partyId != null ? String(dto.partyId) : "");
      // Build rows array
      const mappedRows: RowData[] = (Array.isArray(dto.rows) ? dto.rows : []).map(
        (r: any, idx: number) => {
          const sizeRate: Record<string, string> = {};
          const sizeBox: Record<string, string> = {};
          const sizePerBox: Record<string, string> = {};
          const sizeIdByName: Record<string, number> = {};
          if (Array.isArray(r.sizeDetails)) {
            r.sizeDetails.forEach((sd: any) => {
              const name = (sd.sizeName || sd.size || "") as string;
              if (!name) return;
              sizeRate[name] = sd.rate != null ? String(sd.rate) : "";
              sizeBox[name] = sd.boxCount != null ? String(sd.boxCount) : "";
              sizePerBox[name] = sd.perBox != null ? String(sd.perBox) : "";
              if (sd.sizeId) sizeIdByName[name] = sd.sizeId;
            });
          } else if (r.sizeName) {
            // fallback single size field
            sizeRate[r.sizeName] = r.rate != null ? String(r.rate) : "";
            sizeBox[r.sizeName] = r.box != null ? String(r.box) : "";
            sizePerBox[r.sizeName] = r.perBox != null ? String(r.perBox) : "";
          }
          return recalcRow({
            id: Date.now() + idx,
            cuttinglotNo: r.cuttingLotNo || r.cutLotNo || "",
            artNo: r.artNo || "",
            artGroup: r.artGroupName || r.artGroup || "",
            workOnArt: r.workOnArt || "",
            sizeRate,
            sizeBox,
            sizePerBox,
            sizeIdByName,
            shade: r.shadeName || "",
            shadeCode: r.shadeCode || null,
            pcs: r.pcs != null ? String(r.pcs) : "",
            amount: r.amount != null ? String(r.amount) : "0.00",
          });
        }
      );
      setRows(
        mappedRows.length
          ? mappedRows
          : [
              /* keep one blank row */ {
                id: Date.now(),
                cuttinglotNo: "",
                artNo: "",
                artGroup: "",
                workOnArt: "",
                sizeRate: {},
                sizeBox: {},
                sizePerBox: {},
                sizeIdByName: {},
                shade: "",
                shadeCode: null,
                pcs: "",
                amount: "",
              },
            ]
      );

      setEditingSerial(serialNo);
      setListOpen(false);
      Swal.fire("Loaded", "Challan loaded for editing.", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load challan for edit.", "error");
    }
  };

  // Delete from modal (by serialNo)
  const handleDeleteFromList = async (serialNo: string) => {
    const ask = await Swal.fire({
      title: "Delete?",
      text: `Delete challan ${serialNo}? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });
    if (!ask.isConfirmed) return;
    try {
      await api.delete(`/packing-challans/${encodeURIComponent(serialNo)}`);
      // refresh list
      const { data } = await api.get<any[]>("/packing-challans");
      setListData(Array.isArray(data) ? data : []);
      Swal.fire("Deleted", "Challan deleted.", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to delete challan.", "error");
    }
  };

  return (
    <Dashboard>
      {/* Modals */}
      <CuttingLotModal
        open={lotModalOpen}
        lots={lots}
        onClose={() => setLotModalOpen(false)}
        onSelect={handleLotPicked}
      />
      <ShadeModal
        open={shadeModalOpen}
        shades={shades}
        onClose={() => setShadeModalOpen(false)}
        onSelect={handleShadePicked}
      />

      {/* ======= View List Modal ======= */}
      {listOpen && (
        <div className="z-[1500] fixed inset-0 flex justify-center items-center bg-black/50">
          <div className="bg-white shadow-lg p-6 rounded-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 font-semibold text-blue-600 text-2xl text-center">
              Packing Challans
            </h2>

            <div className="flex justify-center mb-4">
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search anything…"
                className="p-2 border rounded w-full"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="border border-gray-300 min-w-full text-sm">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="p-2 border text-center">S.No</th>
                    <th className="p-2 border text-center">Date</th>
                    <th className="p-2 border text-center">Party Name</th>
                    <th className="p-2 border text-center">Cutting Lot No</th>
                    <th className="p-2 border text-center">Art Group</th>
                    <th className="p-2 border text-center">Work on Art</th>
                    <th className="p-2 border text-center">Size</th>
                    <th className="p-2 border text-center">Shade</th>
                    <th className="p-2 border text-center">Box</th>
                    <th className="p-2 border text-center">Pcs</th>
                    {/* <th className="p-2 border text-center">Rate</th> */}
                    <th className="p-2 border text-center">Amount</th>
                    <th className="p-2 border text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map((r, i) => (
                    <tr key={i}>
                      {/* <td className="p-2 border text-center">{r.sno}</td> */}
                       <td className="p-2 border text-center">{i + 1}</td>
                      <td className="p-2 border text-center">{r.date}</td>
                      <td className="p-2 border text-center">{r.partyName}</td>
                      <td className="p-2 border text-center">
                        {r.cuttingLotNo}
                      </td>
                      <td className="p-2 border text-center">{r.artGroup}</td>
                      <td className="p-2 border text-center">
                        {r.workOnArt}
                      </td>
                      <td className="p-2 border min-w-[260px] text-center whitespace-pre-line">
                        {r.size}
                      </td>
                      <td className="p-2 border text-center">{r.shade}</td>
                      <td className="p-2 border text-center">{r.box}</td>
                      <td className="p-2 border text-center">{r.pcs}</td>
                      {/* <td className="p-2 border text-center">{r.rate}</td> */}
                      <td className="p-2 border text-center">
                        {Number(r.amount).toFixed(2)}
                      </td>
                      <td className="p-2 border">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleEditFromList(r.serialNo)}
                            className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFromList(r.serialNo)}
                            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {flatRows.length === 0 && (
                    <tr>
                      <td
                        className="p-3 border text-gray-500 text-center"
                        colSpan={13}
                      >
                        No records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setListOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 px-5 py-2 rounded text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= Page ======= */}
      <div className="bg-gray-100 p-6 min-h-screen">
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-bold text-2xl text-center">
            Packing Challan
          </h2>

          {/* Header */}
          <div className="gap-4 grid grid-cols-3 mb-6">
            <div>
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="p-2 border rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="p-2 border rounded w-full"
              >
                <option value="">Select Party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="border min-w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border text-center">Sr No.</th>
                  <th className="p-2 border text-center">Cutting Lot No.</th>
                  <th className="p-2 border text-center">Art No</th>
                  <th className="p-2 border text-center">Art Group</th>
                  <th className="p-2 border text-center">Work on Art</th>
                  {/* Dynamic Size Columns → Box / Rate / PerBox (stacked) */}
                  {sizeColumns.map((s) => (
                    <th key={s} className="p-2 border text-center">
                      <div className="flex flex-col items-center">
                        <div>{s}</div>
                        <div className="font-normal text-[10px] text-gray-600">
                          Box / Rate / PerBox
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="p-2 border text-center">Shade</th>
                  <th className="p-2 border text-center">Pcs</th>
                  <th className="p-2 border text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="p-1 border text-center">{idx + 1}</td>

                    {/* Cutting Lot: input opens modal (no button) */}
                    <td className="p-1 border">
                      <input
                        className="bg-yellow-50 hover:bg-yellow-100 p-1 border rounded w-full cursor-pointer"
                        value={r.cuttinglotNo}
                        readOnly
                        onClick={() => openLotModalForRow(r.id)}
                        placeholder="Click to select"
                        title="Click to select cutting lot"
                      />
                    </td>

                    {/* Art No */}
                    <td className="p-1 border">
                      <input
                        className="p-1 border rounded w-full"
                        value={r.artNo}
                        onChange={(e) =>
                          patchRow(r.id, { artNo: e.target.value })
                        }
                      />
                    </td>

                    {/* Art Group */}
                    <td className="p-1 border">
                      <input
                        className="p-1 border rounded w-full"
                        value={r.artGroup}
                        onChange={(e) =>
                          patchRow(r.id, { artGroup: e.target.value })
                        }
                      />
                    </td>

                    {/* Work on Art */}
                    <td className="p-1 border">
                      <input
                        className="p-1 border rounded w-full"
                        value={r.workOnArt}
                        onChange={(e) =>
                          patchRow(r.id, { workOnArt: e.target.value })
                        }
                      />
                    </td>

                    {/* Size-wise cells: Box / Rate / PerBox stacked vertically */}
                    {sizeColumns.map((s) => {
                      const enabled =
                        Object.prototype.hasOwnProperty.call(
                          r.sizeRate || {},
                          s
                        ) ||
                        Object.prototype.hasOwnProperty.call(
                          r.sizeBox || {},
                          s
                        ) ||
                        Object.prototype.hasOwnProperty.call(
                          r.sizePerBox || {},
                          s
                        );
                      return (
                        <td key={s} className="p-1 border">
                          <div className={`${enabled ? "" : "opacity-60"}`}>
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={r.sizeBox[s] || ""}
                                onChange={(e) =>
                                  handleSizeBoxChange(
                                    r.id,
                                    s,
                                    e.target.value
                                  )
                                }
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right ${
                                  enabled
                                    ? ""
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                placeholder="Box"
                                title="Boxes"
                              />
                              <input
                                type="text"
                                value={r.sizeRate[s] || ""}
                                onChange={(e) =>
                                  handleSizeRateChange(
                                    r.id,
                                    s,
                                    e.target.value
                                  )
                                }
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right ${
                                  enabled
                                    ? ""
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                placeholder="Rate"
                                title="Rate"
                              />
                              <input
                                type="text"
                                value={r.sizePerBox[s] || ""}
                                onChange={(e) =>
                                  handleSizePerBoxChange(
                                    r.id,
                                    s,
                                    e.target.value
                                  )
                                }
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right ${
                                  enabled
                                    ? ""
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                placeholder="Per/Box"
                                title="Per Box"
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Shade: input opens modal (no button) */}
                    <td className="p-1 border">
                      <input
                        className="bg-yellow-50 hover:bg-yellow-100 p-1 border rounded w-full cursor-pointer"
                        value={r.shade}
                        readOnly
                        onClick={() => openShadeModalForRow(r.id)}
                        placeholder="Click to select"
                        title="Click to select shade"
                      />
                    </td>

                    {/* Pcs (auto) */}
                    <td className="p-1 border">
                      <input
                        readOnly
                        className="bg-gray-100 p-1 border rounded w-full text-right"
                        value={r.pcs}
                        title="Auto: (Total Box × Total Per/Box)"
                      />
                    </td>

                    {/* Amount (auto) */}
                    <td className="p-1 border">
                      <input
                        readOnly
                        className="bg-gray-100 p-1 border rounded w-full text-right"
                        value={r.amount}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals + Buttons */}
          <div className="flex flex-wrap justify-end items-center gap-6 mt-4 font-semibold">
            <p>Total Box: {totalBox}</p>
            <p>Total Per/Box: {totalPerBox}</p>
            <p>Total Pcs: {totalPcs}</p>
            <p>Total Amount: ₹{totalAmount.toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={addBlankRow}
              className="bg-blue-500 px-4 py-2 rounded text-white"
            >
              Add Row
            </button>

            {/* Single Save/Update button — label changes with editingSerial */}
            <button
              onClick={handleSave}
              className="bg-green-600 px-4 py-2 rounded text-white"
            >
              {editingSerial ? "Update" : "Save"}
            </button>

            <button
              onClick={handlePrint}
              className="bg-yellow-500 px-4 py-2 rounded text-white"
            >
              Print
            </button>
            <button
              onClick={openList}
              className="bg-gray-600 px-4 py-2 rounded text-white"
            >
              View List
            </button>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default PackingChallan;
