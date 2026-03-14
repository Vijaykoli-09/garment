"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";
import axios from "axios";

/* --------------------------------- TYPES --------------------------------- */
interface ArtGroupFromCreation {
  serialNo: number;
  artGroupName: string;
  yearsToleranceFrom?: string;
  yearsToleranceTo?: string;
  seriesRangeStart?: string;
  seriesRangeEnd?: string;
}

interface ArtListView {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  styleName: string;
  season: string;
  brandName: string;
  saleRate: string;
}

interface ShadeDetail {
  id: number;
  shadeCode: string;
  shadeName: string;
  colorFamily: string;
}

interface SizeDetail {
  id: number;
  serialNo: string;
  sizeName: string;
  orderNo: string;
  artGroup?: string;
  box?: string; // opening box
  pcs?: string; // pcs per box
  rate?: string;
}

interface ArtDetailView {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  styleRate: string;
  saleRate: string;
  styleName: string;
  season: string;
  copyFromArtName: string;
  openingBalance: string;
  wtPcs: string;
  reference: string;
  brandName: string;
  workOnArt: string;
  processes: any[];
  shades: ShadeDetail[];
  sizes: SizeDetail[];
  sizeDetails?: SizeDetail[];
  accessories: any[];
}

interface ShadeFromCreation {
  shadeCode: string;
  shadeName: string;
  colorFamily: string;
}

interface SizeFromCreation {
  id?: number;
  serialNo: string;
  sizeName: string;
  orderNo: string;
}

/** Detail row (per size) after aggregation */
interface DetailRow {
  artSerial: string;
  artNo: string;
  artName: string;
  shadeName: string;
  sizeName: string;
  openingBox: number; // final box qty
  rate: number; // final rate (latest incoming)
  pcs: number; // final pcs
  amount: number; // rate * pcs
}

/** Grouped row (one row per art+shade, sizes pivoted horizontally) */
interface GroupRow {
  artSerial: string;
  artNo: string;
  artName: string;
  shadeName: string;
  sizes: Record<
    string,
    {
      openingBox: number;
      rate: number;
      pcs: number;
      amount: number;
    }
  >;
}

/* ---------------------------- HELPER FUNCTIONS --------------------------- */
const toNum = (v: any): number => {
  const n =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

type SortField = "artNo" | "artName" | "shadeName";

/* ---------------------- SIZE SEQUENCE / COMPARATOR ---------------------- */
const alphaOrder = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
];

const alphaIndexMap: Record<string, number> = {};
alphaOrder.forEach((label, idx) => {
  alphaIndexMap[label] = idx;
});

type SizeClass =
  | { kind: "alpha"; alphaIndex: number }
  | { kind: "range"; a: number; b: number }
  | { kind: "numeric"; n: number }
  | { kind: "other"; raw: string };

const classifySizeName = (name: string): SizeClass => {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();

  if (alphaIndexMap[upper] !== undefined) {
    return { kind: "alpha", alphaIndex: alphaIndexMap[upper] };
  }

  const rangeMatch = upper.match(/^(\d+(?:\.\d+)?)\s*[*Xx]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return {
      kind: "range",
      a: parseFloat(rangeMatch[1]),
      b: parseFloat(rangeMatch[2]),
    };
  }

  const numMatch = upper.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    return { kind: "numeric", n: parseFloat(numMatch[1]) };
  }

  return { kind: "other", raw: upper };
};

const sizeKindPriority: Record<SizeClass["kind"], number> = {
  alpha: 0,
  range: 1,
  numeric: 2,
  other: 3,
};

const compareSizeNames = (a: string, b: string): number => {
  const ca = classifySizeName(a);
  const cb = classifySizeName(b);

  if (sizeKindPriority[ca.kind] !== sizeKindPriority[cb.kind]) {
    return sizeKindPriority[ca.kind] - sizeKindPriority[cb.kind];
  }

  switch (ca.kind) {
    case "alpha": {
      const ai = ca.alphaIndex;
      const bi = (cb as any).alphaIndex as number;
      return ai - bi || a.localeCompare(b);
    }
    case "range": {
      const ra = ca;
      const rb = cb as any;
      if (ra.a !== rb.a) return ra.a - rb.a;
      if (ra.b !== rb.b) return ra.b - rb.b;
      return a.localeCompare(b);
    }
    case "numeric": {
      const na = ca.n;
      const nb = (cb as any).n as number;
      return na - nb || a.localeCompare(b);
    }
    case "other":
    default:
      return a.localeCompare(b);
  }
};

/* ---------------------------- STOCK AGGREGATION -------------------------- */
interface StockAgg {
  artSerial: string;
  artNo: string;
  artName: string;
  artGroup: string;
  shadeName: string;
  sizeName: string;
  perBox: number; // last non-zero perBox
  rate: number; // last incoming rate (creation + packing)
  pcs: number; // net pcs (Opening + Packing - Dispatch)
}

/* --------------------------------- UI ------------------------------------ */
const ArtReport: React.FC = () => {
  const [asOn, setAsOn] = useState<string>(todayStr());

  const [loading, setLoading] = useState<boolean>(false);
  const [showingResults, setShowingResults] = useState<boolean>(false);

  // master data
  const [artGroups, setArtGroups] = useState<ArtGroupFromCreation[]>([]);
  const [arts, setArts] = useState<ArtListView[]>([]);
  const [shades, setShades] = useState<ShadeFromCreation[]>([]);
  const [sizes, setSizes] = useState<SizeFromCreation[]>([]);

  // selections
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedArtSerials, setSelectedArtSerials] = useState<Set<string>>(
    new Set()
  );
  const [selectedArtNos, setSelectedArtNos] = useState<Set<string>>(new Set());
  const [selectedShadeCodes, setSelectedShadeCodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedSizeSerials, setSelectedSizeSerials] = useState<Set<string>>(
    new Set()
  );

  // NEW: search bars for all lists
  const [searchGroup, setSearchGroup] = useState("");
  const [searchArtNo, setSearchArtNo] = useState("");
  const [searchArtName, setSearchArtName] = useState("");
  const [searchShade, setSearchShade] = useState("");
  const [searchSize, setSearchSize] = useState("");

  // detail rows
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [sortField, setSortField] = useState<SortField>("artNo");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  /* -------------------------- LOAD MASTER DATA --------------------------- */
  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        const [grpRes, artRes, shadeRes, sizeRes] = await Promise.all([
          api.get<ArtGroupFromCreation[]>("/artgroup/list"),
          api.get<ArtListView[]>("/arts"),
          api.get<ShadeFromCreation[]>("/shade/list"),
          api.get<SizeFromCreation[]>("/sizes"),
        ]);
        setArtGroups(Array.isArray(grpRes.data) ? grpRes.data : []);
        setArts(Array.isArray(artRes.data) ? artRes.data : []);
        setShades(Array.isArray(shadeRes.data) ? shadeRes.data : []);
        setSizes(Array.isArray(sizeRes.data) ? sizeRes.data : []);
      } catch (err) {
        console.error("ArtReport bootstrap error:", err);
        let msg = "Could not load master data.";
        if (axios.isAxiosError(err)) {
          const url = `${err.config?.baseURL || ""}${err.config?.url || ""}`;
          const status = err.response?.status ?? "NO_RESPONSE";
          msg += `\nURL: ${url}\nStatus: ${status}`;
        }
        Swal.fire({
          icon: "error",
          title: "Load Failed",
          text: msg,
        });
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  /* ------------------------ FILTERED MASTER LISTS ------------------------ */
  const filteredArtGroups = useMemo(() => {
    const s = searchGroup.trim().toLowerCase();
    if (!s) return artGroups;
    return artGroups.filter((g) =>
      (g.artGroupName || "").toLowerCase().includes(s)
    );
  }, [artGroups, searchGroup]);

  const filteredArts = useMemo(() => {
    if (selectedGroups.size === 0) return arts;
    return arts.filter((a) => selectedGroups.has(a.artGroup));
  }, [arts, selectedGroups]);

  const filteredArtsForArtNo = useMemo(() => {
    const s = searchArtNo.trim().toLowerCase();
    if (!s) return filteredArts;
    return filteredArts.filter((a) =>
      (a.artNo || "").toLowerCase().includes(s)
    );
  }, [filteredArts, searchArtNo]);

  const filteredArtsForArtName = useMemo(() => {
    const s = searchArtName.trim().toLowerCase();
    if (!s) return filteredArts;
    return filteredArts.filter((a) =>
      (a.artName || "").toLowerCase().includes(s)
    );
  }, [filteredArts, searchArtName]);

  const filteredShades = useMemo(() => {
    const s = searchShade.trim().toLowerCase();
    if (!s) return shades;
    return shades.filter((sh) => {
      const a = (sh.shadeName || "").toLowerCase();
      const b = (sh.shadeCode || "").toLowerCase();
      const c = (sh.colorFamily || "").toLowerCase();
      return a.includes(s) || b.includes(s) || c.includes(s);
    });
  }, [shades, searchShade]);

  const filteredSizes = useMemo(() => {
    const s = searchSize.trim().toLowerCase();
    const base = !s
      ? sizes
      : sizes.filter((sz) => (sz.sizeName || "").toLowerCase().includes(s));
    return base.slice().sort((a, b) =>
      compareSizeNames(a.sizeName || "", b.sizeName || "")
    );
  }, [sizes, searchSize]);

  /* --------------------------- SET HELPERS ------------------------------- */
  const toggleSetItem = <T extends string>(
    set: React.Dispatch<React.SetStateAction<Set<T>>>,
    curr: Set<T>,
    key: T
  ) => {
    const next = new Set(curr);
    next.has(key) ? next.delete(key) : next.add(key);
    set(next);
  };

  const setAllOrNone = <T extends string>(
    set: React.Dispatch<React.SetStateAction<Set<T>>>,
    list: T[],
    all: boolean
  ) => {
    set(all ? new Set(list) : new Set());
  };

  /* ------------------------ SIZE NAMES (SEQUENCE) ------------------------ */
  const sizeNames = useMemo(() => {
    const used = new Set<string>();
    detailRows.forEach((r) => {
      if (r.sizeName) used.add(r.sizeName);
    });
    const arr = Array.from(used);
    arr.sort(compareSizeNames);
    return arr;
  }, [detailRows]);

  /* ----------------------- GROUP & SORT RESULT ROWS ---------------------- */
  const groupRows: GroupRow[] = useMemo(() => {
    const map = new Map<string, GroupRow>();

    for (const r of detailRows) {
      const key = `${r.artSerial}|${r.shadeName || ""}`;
      let g = map.get(key);
      if (!g) {
        g = {
          artSerial: r.artSerial,
          artNo: r.artNo,
          artName: r.artName,
          shadeName: r.shadeName,
          sizes: {},
        };
        map.set(key, g);
      }
      g.sizes[r.sizeName] = {
        openingBox: r.openingBox,
        rate: r.rate,
        pcs: r.pcs,
        amount: r.amount,
      };
    }

    return Array.from(map.values());
  }, [detailRows]);

  const sortedGroupRows = useMemo(() => {
    const copy = [...groupRows];
    copy.sort((a, b) => {
      const factor = sortAsc ? 1 : -1;
      let av = "";
      let bv = "";
      switch (sortField) {
        case "artNo":
          av = a.artNo || "";
          bv = b.artNo || "";
          break;
        case "artName":
          av = a.artName || "";
          bv = b.artName || "";
          break;
        case "shadeName":
          av = a.shadeName || "";
          bv = b.shadeName || "";
          break;
      }
      return av.localeCompare(bv) * factor;
    });
    return copy;
  }, [groupRows, sortField, sortAsc]);

  const handleHeaderClick = (field: SortField) => {
    if (field === sortField) setSortAsc((s) => !s);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  /* --------------------------- GRAND TOTALS ------------------------------ */
  const grandTotalOpeningBox = useMemo(
    () => detailRows.reduce((acc, r) => acc + toNum(r.openingBox), 0),
    [detailRows]
  );
  const grandTotalPcs = useMemo(
    () => detailRows.reduce((acc, r) => acc + toNum(r.pcs), 0),
    [detailRows]
  );
  const grandTotalAmount = useMemo(
    () => detailRows.reduce((acc, r) => acc + toNum(r.amount), 0),
    [detailRows]
  );

  const sizeTotalAmount = useMemo(() => {
    const m: Record<string, number> = {};
    detailRows.forEach((r) => {
      const k = r.sizeName;
      m[k] = (m[k] || 0) + toNum(r.amount);
    });
    return m;
  }, [detailRows]);

  /* ------------------------------ SHOW REPORT ---------------------------- */
  const handleShow = async () => {
    try {
      setLoading(true);

      // Map ArtNo -> ArtListView for quick lookup
      const artByNo = new Map<string, ArtListView>();
      arts.forEach((a) => {
        if (a.artNo) artByNo.set(a.artNo.trim().toUpperCase(), a);
      });

      // Art selection based on Art Group + (Art Name and/or Art No)
      let artsToUse = filteredArts;

      if (selectedArtSerials.size > 0 || selectedArtNos.size > 0) {
        artsToUse = filteredArts.filter((a) => {
          const bySerial =
            selectedArtSerials.size === 0 ||
            selectedArtSerials.has(a.serialNumber);
          const byArtNo =
            selectedArtNos.size === 0 ||
            (a.artNo && selectedArtNos.has(a.artNo));
          return bySerial && byArtNo;
        });
      }

      if (artsToUse.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Nothing Selected",
          text: "Please select Art Group / Art No / Art Name.",
        });
        return;
      }

      const artNosFilter = new Set(
        artsToUse.map((a) => a.artNo?.trim().toUpperCase()).filter((x) => !!x)
      );

      // Helper to get base art info by Art No
      const getArtInfo = (artNo: string) => {
        const key = artNo.trim().toUpperCase();
        const a = artByNo.get(key);
        return {
          artSerial: a?.serialNumber || key,
          artName: a?.artName || "",
          artGroup: a?.artGroup || "",
        };
      };

      // Build shade name <-> code maps
      const shadeCodeToName = new Map<string, string>();
      const shadeNameToCode = new Map<string, string>();
      shades.forEach((s) => {
        shadeCodeToName.set(s.shadeCode, s.shadeName);
        shadeNameToCode.set(s.shadeName.trim(), s.shadeCode);
      });

      // Map sizeName -> serialNo for filter
      const sizeNameToSerial = new Map<string, string>();
      sizes.forEach((s) => {
        if (s.sizeName) sizeNameToSerial.set(s.sizeName.trim(), s.serialNo);
      });

      // Aggregation map
      const aggMap = new Map<string, StockAgg>();

      const addDelta = (params: {
        artNo: string;
        shadeName: string;
        sizeName: string;
        pcsDelta: number;
        perBox?: number;
        rate?: number; // only for incoming
        artSerial?: string;
        artName?: string;
        artGroup?: string;
      }) => {
        const artNoTrim = (params.artNo || "").trim();
        if (!artNoTrim || !params.sizeName) return;

        const shade = (params.shadeName || "").trim();
        const sizeName = params.sizeName.trim();

        const key = `${artNoTrim}|${shade}|${sizeName}`;
        let agg = aggMap.get(key);
        if (!agg) {
          const base = getArtInfo(artNoTrim);
          agg = {
            artSerial: params.artSerial || base.artSerial,
            artNo: artNoTrim,
            artName: params.artName || base.artName,
            artGroup: params.artGroup || base.artGroup,
            shadeName: shade,
            sizeName,
            perBox: 0,
            rate: 0,
            pcs: 0,
          };
          aggMap.set(key, agg);
        }

        agg.pcs += params.pcsDelta;

        const perBox = params.perBox || 0;
        if (perBox > 0) agg.perBox = perBox;

        const rate = params.rate || 0;
        if (rate > 0) agg.rate = rate; // last incoming wins
      };

      /* ---------- 1) Opening stock from ART CREATION ---------- */
      const artDetails = await Promise.all(
        artsToUse.map((a) =>
          api
            .get<ArtDetailView>(`/arts/${a.serialNumber}`)
            .then((res) => res.data)
            .catch((e) => {
              console.error("Failed to load art detail:", e);
              return null;
            })
        )
      );

      for (const det of artDetails) {
        if (!det) continue;
        if (!det.artNo) continue;

        const artNo = det.artNo.trim();
        const artSerial = det.serialNumber;
        const artName = det.artName;
        const artGroup = det.artGroup;

        const artShadesRaw = Array.isArray(det.shades) ? det.shades : [];
        const artShades =
          artShadesRaw.length > 0
            ? artShadesRaw
            : [{ shadeCode: "", shadeName: "", colorFamily: "" }];

        const sizeList: SizeDetail[] =
          Array.isArray(det.sizeDetails) && det.sizeDetails.length > 0
            ? (det.sizeDetails as any)
            : Array.isArray(det.sizes)
            ? det.sizes
            : [];

        for (const sz of sizeList) {
          const sizeName = sz.sizeName?.trim();
          if (!sizeName) continue;

          const perBox = toNum(sz.pcs); // perBox from art creation
          const box = toNum(sz.box);
          const pcs = box * perBox;
          const rate = toNum(sz.rate || det.saleRate || 0);

          for (const sh of artShades) {
            const shadeName = (sh.shadeName || "").trim();

            addDelta({
              artNo,
              shadeName,
              sizeName,
              pcsDelta: pcs,
              perBox,
              rate,
              artSerial,
              artName,
              artGroup,
            });
          }
        }
      }

      /* ---------- 2) Incoming from PACKING CHALLAN ---------- */
      const [packingRes, dispatchRes] = await Promise.all([
        api.get<any[]>("/packing-challans"),
        api.get<any[]>("/dispatch-challan"),
      ]);

      const packingList: any[] = Array.isArray(packingRes.data)
        ? packingRes.data
        : [];

      packingList.forEach((ch) => {
        const rows: any[] = Array.isArray(ch.rows) ? ch.rows : [];
        rows.forEach((r) => {
          const artNo = String(r.artNo || "").trim();
          if (!artNo) return;

          if (artNosFilter.size > 0 && !artNosFilter.has(artNo.toUpperCase()))
            return;

          const shadeName = String(r.shadeName || r.shade || "").trim();
          const artGroup = String(r.artGroupName || r.artGroup || "").trim();
          const artSerial = artByNo.get(artNo.toUpperCase())?.serialNumber;

          const details: any[] = Array.isArray(r.sizeDetails)
            ? r.sizeDetails
            : [];

          if (details.length > 0) {
            details.forEach((sd) => {
              const sizeName = String(sd.sizeName || sd.size || "").trim();
              if (!sizeName) return;
              const pcs =
                toNum(sd.pcs) ||
                toNum(sd.boxCount || 0) * toNum(sd.perBox || 0);
              const perBox = toNum(sd.perBox);
              const rate = toNum(sd.rate);

              addDelta({
                artNo,
                shadeName,
                sizeName,
                pcsDelta: pcs,
                perBox,
                rate,
                artSerial,
                artGroup,
              });
            });
          } else {
            const sizeName = String(r.sizeName || r.size || "").trim();
            if (!sizeName) return;
            const pcs =
              toNum(r.pcs) || toNum(r.box || 0) * toNum(r.perBox || 0);
            const perBox = toNum(r.perBox);
            const rate = toNum(r.rate);

            addDelta({
              artNo,
              shadeName,
              sizeName,
              pcsDelta: pcs,
              perBox,
              rate,
              artSerial,
              artGroup,
            });
          }
        });
      });

      /* ---------- 3) Outgoing from DISPATCH CHALLAN ---------- */
      const dispatchList: any[] = Array.isArray(dispatchRes.data)
        ? dispatchRes.data
        : [];

      dispatchList.forEach((dc) => {
        const rows: any[] = Array.isArray(dc.rows) ? dc.rows : [];
        rows.forEach((r) => {
          const artNo = String(r.artNo || "").trim();
          if (!artNo) return;
          if (artNosFilter.size > 0 && !artNosFilter.has(artNo.toUpperCase()))
            return;

          const shadeName = String(r.shade || r.shadeName || "").trim();
          const sizeName = String(r.size || r.sizeName || "").trim();
          if (!sizeName) return;

          const pcs =
            toNum(r.pcs) || toNum(r.box || 0) * toNum(r.pcsPerBox || 0);
          const perBox = toNum(r.pcsPerBox);

          addDelta({
            artNo,
            shadeName,
            sizeName,
            pcsDelta: -pcs, // subtract
            perBox, // update perBox; rate not changed
          });
        });
      });

      /* ---------- 4) Convert aggregation -> DetailRows ---------- */
      const out: DetailRow[] = [];

      for (const agg of Array.from(aggMap.values())) {
        if (Math.abs(agg.pcs) < 1e-6) continue;

        // Shade filter
        if (selectedShadeCodes.size > 0) {
          const shadeNameToCode = new Map<string, string>();
          shades.forEach((s) =>
            shadeNameToCode.set(s.shadeName.trim(), s.shadeCode)
          );
          const code = shadeNameToCode.get(agg.shadeName.trim());
          if (!code || !selectedShadeCodes.has(code)) continue;
        }

        // Size filter
        if (selectedSizeSerials.size > 0) {
          const serial = sizeNameToSerial.get(agg.sizeName.trim());
          if (!serial || !selectedSizeSerials.has(serial)) continue;
        }

        const perBox = agg.perBox || 0;
        const box = perBox ? agg.pcs / perBox : 0;
        const rate = agg.rate || 0;
        const amount = agg.pcs * rate;

        out.push({
          artSerial: agg.artSerial,
          artNo: agg.artNo,
          artName: agg.artName,
          shadeName: agg.shadeName,
          sizeName: agg.sizeName,
          openingBox: box,
          rate,
          pcs: agg.pcs,
          amount,
        });
      }

      setDetailRows(out);
      setShowingResults(true);
    } catch (err) {
      console.error("ArtReport handleShow error:", err);
      let msg = "Failed to build report.";
      if (axios.isAxiosError(err)) {
        const url = `${err.config?.baseURL || ""}${err.config?.url || ""}`;
        const status = err.response?.status ?? "NO_RESPONSE";
        msg += `\nURL: ${url}\nStatus: ${status}`;
      }
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowingResults(false);
  };

  /* ----------------------------- EXPORT CSV ------------------------------ */
  const handleExport = () => {
    if (groupRows.length === 0) return;

    const headers: string[] = ["S.No", "Art No", "Art Name", "Shade"];
    sizeNames.forEach((sz) => headers.push(sz));
    headers.push("Total Box", "Total Pcs", "Total Amount");
    const lines = [headers.join(",")];

    sortedGroupRows.forEach((g, idx) => {
      let totalBox = 0;
      let totalPcs = 0;
      let totalAmount = 0;

      const row: (string | number)[] = [
        idx + 1,
        `"${g.artNo || ""}"`,
        `"${g.artName || ""}"`,
        `"${g.shadeName || ""}"`,
      ];

      sizeNames.forEach((szName) => {
        const szData = g.sizes[szName];
        const box = szData ? toNum(szData.openingBox) : 0;
        const pcs = szData ? toNum(szData.pcs) : 0;
        const rate = szData ? toNum(szData.rate) : 0;
        const amt = szData ? toNum(szData.amount) : 0;

        totalBox += box;
        totalPcs += pcs;
        totalAmount += amt;

        const parts: string[] = [];
        if (box) parts.push(box.toFixed(2));
        if (pcs) parts.push(pcs.toFixed(2));
        if (rate) parts.push(rate.toFixed(2));
        if (amt) parts.push(amt.toFixed(2));

        row.push(parts.length ? `"${parts.join(" / ")}"` : "");
      });

      row.push(
        totalBox ? Number(totalBox.toFixed(2)) : "",
        totalPcs ? Number(totalPcs.toFixed(2)) : "",
        totalAmount ? Number(totalAmount.toFixed(2)) : ""
      );

      lines.push(row.join(","));
    });

    const totalRow: (string | number)[] = ["", "Total", "", ""];
    sizeNames.forEach((sz) => {
      const amt = sizeTotalAmount[sz] || 0;
      totalRow.push(amt ? Number(amt.toFixed(2)) : "");
    });
    totalRow.push(
      Number(grandTotalOpeningBox.toFixed(2)),
      Number(grandTotalPcs.toFixed(2)),
      Number(grandTotalAmount.toFixed(2))
    );
    lines.push(totalRow.join(","));

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `art-stock-${asOn}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------------ PRINT (WORD‑LIKE TABLE) ---------------- */
  const handlePrint = () => {
    if (sortedGroupRows.length === 0) return;

    const headerCells: string[] = [
      '<th style="border:1px solid #000;padding:4px;width:40px;text-align:center">S. No.</th>',
      '<th style="border:1px solid #000;padding:4px">Art No</th>',
      '<th style="border:1px solid #000;padding:4px">Art Name</th>',
      '<th style="border:1px solid #000;padding:4px">Shade</th>',
      '<th style="border:1px solid #000;padding:4px">Row</th>',
    ];
    sizeNames.forEach((sz) => {
      headerCells.push(
        `<th style="border:1px solid #000;padding:4px;text-align:center">${sz}</th>`
      );
    });
    headerCells.push(
      '<th style="border:1px solid #000;padding:4px;text-align:right">Total Box</th>',
      '<th style="border:1px solid #000;padding:4px;text-align:right">Total Pcs</th>',
      '<th style="border:1px solid #000;padding:4px;text-align:right">Total amount</th>'
    );

    const bodyRowsHtml = sortedGroupRows
      .map((g, idx) => {
        let totalBox = 0;
        let totalPcs = 0;
        let totalAmount = 0;
        sizeNames.forEach((szName) => {
          const szData = g.sizes[szName];
          if (!szData) return;
          totalBox += toNum(szData.openingBox);
          totalPcs += toNum(szData.pcs);
          totalAmount += toNum(szData.amount);
        });

        const subRows: string[] = [];
        const rowSpan = 4;

        for (let line = 0; line < 4; line++) {
          const sizeCells: string[] = [];
          sizeNames.forEach((szName) => {
            const szData = g.sizes[szName];
            const box = szData ? toNum(szData.openingBox) : 0;
            const pcs = szData ? toNum(szData.pcs) : 0;
            const rate = szData ? toNum(szData.rate) : 0;
            const amt = szData ? toNum(szData.amount) : 0;

            let val = "";
            if (line === 0 && box) val = box.toFixed(2);
            else if (line === 1 && pcs) val = pcs.toFixed(2);
            else if (line === 2 && rate) val = rate.toFixed(2);
            else if (line === 3 && amt) val = amt.toFixed(2);

            sizeCells.push(
              `<td style="border:1px solid #000;padding:4px;text-align:right">${val}</td>`
            );
          });

          const startCells =
            line === 0
              ? `
              <td rowspan="${rowSpan}" style="border:1px solid #000;padding:4px;text-align:center">${
                idx + 1
              }</td>
              <td rowspan="${rowSpan}" style="border:1px solid #000;padding:4px">${
                g.artNo || ""
              }</td>
              <td rowspan="${rowSpan}" style="border:1px solid #000;padding:4px">${
                g.artName || ""
              }</td>
              <td rowspan="${rowSpan}" style="border:1px solid #000;padding:4px">${
                g.shadeName || ""
              }</td>
            `
              : "";

          const labelText =
            line === 0 ? "Box" : line === 1 ? "Pcs" : line === 2 ? "Rate" : "Amount";

          const labelCell = `<td style="border:1px solid #000;padding:4px;text-align:left">${labelText}</td>`;

          const totalCells =
            line === 0
              ? `
              <td rowspan="${rowSpan}" style="border:1px solid #000;padding:4px;text-align:right">${
                totalBox ? totalBox.toFixed(2) : ""
              }</td>
              <td rowspan="${rowSpan}" style="border:1px solid #000;padding:4px;text-align:right">${
                totalPcs ? totalPcs.toFixed(2) : ""
              }</td>
              <td rowspan="${rowSpan}" style="border:1px solid #000;padding:4px;text-align:right">${
                totalAmount ? totalAmount.toFixed(2) : ""
              }</td>
            `
              : "";

          subRows.push(`
            <tr>
              ${startCells}
              ${labelCell}
              ${sizeCells.join("")}
              ${totalCells}
            </tr>
          `);
        }

        return subRows.join("");
      })
      .join("");

    const totalRowHtml = `
      <tr class="total-row">
        <td style="border:1px solid #000;padding:4px"></td>
        <td style="border:1px solid #000;padding:4px;font-weight:bold">Total</td>
        <td style="border:1px solid #000;padding:4px"></td>
        <td style="border:1px solid #000;padding:4px"></td>
        <td style="border:1px solid #000;padding:4px"></td>
        ${sizeNames
          .map((sz) => {
            const amt = sizeTotalAmount[sz] || 0;
            return `<td style="border:1px solid #000;padding:4px;text-align:right">${
              amt ? amt.toFixed(2) : ""
            }</td>`;
          })
          .join("")}
        <td style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold">${grandTotalOpeningBox.toFixed(
          2
        )}</td>
        <td style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold">${grandTotalPcs.toFixed(
          2
        )}</td>
        <td style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold">${grandTotalAmount.toFixed(
          2
        )}</td>
      </tr>
    `;

    const printable = `
      <html>
        <head>
          <title>Art Stock - ${asOn}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 8px; font-size: 11px; }
            table { border-collapse: collapse; width: 100%; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 4px; text-align: left; }
            th { background: #e0e0e0; font-weight: 700; }
            .total-row td { font-weight: bold; background: #e7f6ff; }
          </style>
        </head>
        <body>
          <h3>Art Stock Report <small style="font-size:11px">As On: ${asOn}</small></h3>
          <table>
            <thead>
              <tr>${headerCells.join("")}</tr>
            </thead>
            <tbody>
              ${bodyRowsHtml}
              ${totalRowHtml}
            </tbody>
          </table>
        </body>
      </html>
   `;

    const w = window.open("", "_blank", "width=1400,height=800");
    if (!w) return;
    w.document.open();
    w.document.write(printable);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  /* ----------------------------- RENDER HELPERS --------------------------- */
  const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({
    title,
    right,
  }) => (
    <div className="flex items-center justify-between px-2 pb-1">
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      {right}
    </div>
  );

  const ListSearch: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }> = ({ value, onChange, placeholder }) => (
    <div className="px-2 pb-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded px-2 py-1 text-sm"
      />
    </div>
  );

  /* -------------------------------- RENDER -------------------------------- */
  return (
    <Dashboard>
      <div className="p-4 bg-gray-100">
        {!showingResults ? (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800">Art Stock</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">As On:</label>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  value={asOn}
                  onChange={(e) => setAsOn(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Art Group */}
              <div className="border border-gray-400 rounded">
                <SectionHeader
                  title="Select Art Group"
                  right={
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          filteredArtGroups.length > 0 &&
                          filteredArtGroups.every((g) =>
                            selectedGroups.has(g.artGroupName)
                          )
                        }
                        onChange={(e) =>
                          setAllOrNone(
                            setSelectedGroups,
                            filteredArtGroups.map((g) => g.artGroupName),
                            e.target.checked
                          )
                        }
                      />
                      <span>Select/Unselect All</span>
                    </label>
                  }
                />
                <ListSearch
                  value={searchGroup}
                  onChange={setSearchGroup}
                  placeholder="Search art group..."
                />
                <div className="h-72 overflow-auto px-2 pb-2">
                  {filteredArtGroups.map((g) => (
                    <label
                      key={g.serialNo}
                      className="flex items-center gap-2 text-sm py-1 cursor-pointer select-none"
                      title={g.artGroupName}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(g.artGroupName)}
                        onChange={() =>
                          toggleSetItem(
                            setSelectedGroups,
                            selectedGroups,
                            g.artGroupName
                          )
                        }
                      />
                      <span className="truncate">{g.artGroupName}</span>
                    </label>
                  ))}
                  {filteredArtGroups.length === 0 && (
                    <div className="text-xs text-gray-500 px-1 py-2">
                      No groups found.
                    </div>
                  )}
                </div>
              </div>

              {/* Art No */}
              <div className="border border-gray-400 rounded">
                <SectionHeader
                  title="Select Art No"
                  right={
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          filteredArtsForArtNo.length > 0 &&
                          filteredArtsForArtNo
                            .map((a) => a.artNo)
                            .filter((x): x is string => !!x)
                            .every((no) => selectedArtNos.has(no))
                        }
                        onChange={(e) => {
                          const visible = filteredArtsForArtNo
                            .map((a) => a.artNo)
                            .filter((x): x is string => !!x);
                          setAllOrNone(
                            setSelectedArtNos,
                            visible,
                            e.target.checked
                          );
                        }}
                      />
                      <span>Select/Unselect All</span>
                    </label>
                  }
                />
                <ListSearch
                  value={searchArtNo}
                  onChange={setSearchArtNo}
                  placeholder="Search art no..."
                />
                <div className="h-72 overflow-auto px-2 pb-2">
                  {filteredArtsForArtNo.map((a) => (
                    <label
                      key={`artno-${a.serialNumber}`}
                      className="flex items-center gap-2 text-sm py-1 cursor-pointer select-none"
                      title={`${a.artNo} - ${a.artName}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!a.artNo && selectedArtNos.has(a.artNo)}
                        onChange={() => {
                          if (!a.artNo) return;
                          toggleSetItem(
                            setSelectedArtNos,
                            selectedArtNos,
                            a.artNo
                          );
                        }}
                      />
                      <span className="truncate">{a.artNo}</span>
                    </label>
                  ))}
                  {filteredArtsForArtNo.length === 0 && (
                    <div className="text-xs text-gray-500 px-1 py-2">
                      No arts found.
                    </div>
                  )}
                </div>
              </div>

              {/* Art Name */}
              <div className="border border-gray-400 rounded">
                <SectionHeader
                  title="Select Art Name"
                  right={
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          filteredArtsForArtName.length > 0 &&
                          filteredArtsForArtName.every((a) =>
                            selectedArtSerials.has(a.serialNumber)
                          )
                        }
                        onChange={(e) =>
                          setAllOrNone(
                            setSelectedArtSerials,
                            filteredArtsForArtName.map((a) => a.serialNumber),
                            e.target.checked
                          )
                        }
                      />
                      <span>Select/Unselect All</span>
                    </label>
                  }
                />
                <ListSearch
                  value={searchArtName}
                  onChange={setSearchArtName}
                  placeholder="Search art name..."
                />
                <div className="h-72 overflow-auto px-2 pb-2">
                  {filteredArtsForArtName.map((a) => (
                    <label
                      key={a.serialNumber}
                      className="flex items-center gap-2 text-sm py-1 cursor-pointer select-none"
                      title={`${a.artName} (${a.artGroup})`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedArtSerials.has(a.serialNumber)}
                        onChange={() =>
                          toggleSetItem(
                            setSelectedArtSerials,
                            selectedArtSerials,
                            a.serialNumber
                          )
                        }
                      />
                      <span className="truncate">{a.artName}</span>
                    </label>
                  ))}
                  {filteredArtsForArtName.length === 0 && (
                    <div className="text-xs text-gray-500 px-1 py-2">
                      No arts found.
                    </div>
                  )}
                </div>
              </div>

              {/* Shade */}
              <div className="border border-gray-400 rounded">
                <SectionHeader
                  title="Shade"
                  right={
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          filteredShades.length > 0 &&
                          filteredShades.every((s) =>
                            selectedShadeCodes.has(s.shadeCode)
                          )
                        }
                        onChange={(e) =>
                          setAllOrNone(
                            setSelectedShadeCodes,
                            filteredShades.map((s) => s.shadeCode),
                            e.target.checked
                          )
                        }
                      />
                      <span>Select/Unselect All</span>
                    </label>
                  }
                />
                <ListSearch
                  value={searchShade}
                  onChange={setSearchShade}
                  placeholder="Search shade (name/code/family)..."
                />
                <div className="h-72 overflow-auto px-2 pb-2">
                  {filteredShades.map((s) => (
                    <label
                      key={s.shadeCode}
                      className="flex items-center gap-2 text-sm py-1 cursor-pointer select-none"
                      title={`${s.shadeName} (${s.colorFamily})`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedShadeCodes.has(s.shadeCode)}
                        onChange={() =>
                          toggleSetItem(
                            setSelectedShadeCodes,
                            selectedShadeCodes,
                            s.shadeCode
                          )
                        }
                      />
                      <span className="truncate">{s.shadeName}</span>
                    </label>
                  ))}
                  {filteredShades.length === 0 && (
                    <div className="text-xs text-gray-500 px-1 py-2">
                      No shades found.
                    </div>
                  )}
                </div>
              </div>

              {/* Size */}
              <div className="border border-gray-400 rounded">
                <SectionHeader
                  title="Size"
                  right={
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          filteredSizes.length > 0 &&
                          filteredSizes.every((s) =>
                            selectedSizeSerials.has(s.serialNo)
                          )
                        }
                        onChange={(e) =>
                          setAllOrNone(
                            setSelectedSizeSerials,
                            filteredSizes.map((s) => s.serialNo),
                            e.target.checked
                          )
                        }
                      />
                      <span>Select/Unselect All</span>
                    </label>
                  }
                />
                <ListSearch
                  value={searchSize}
                  onChange={setSearchSize}
                  placeholder="Search size..."
                />
                <div className="h-72 overflow-auto px-2 pb-2">
                  {filteredSizes.map((s) => (
                    <label
                      key={s.serialNo}
                      className="flex items-center gap-2 text-sm py-1 cursor-pointer select-none"
                      title={s.sizeName}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSizeSerials.has(s.serialNo)}
                        onChange={() =>
                          toggleSetItem(
                            setSelectedSizeSerials,
                            selectedSizeSerials,
                            s.serialNo
                          )
                        }
                      />
                      <span className="truncate">{s.sizeName}</span>
                    </label>
                  ))}
                  {filteredSizes.length === 0 && (
                    <div className="text-xs text-gray-500 px-1 py-2">
                      No sizes found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-4">
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
                onClick={handleShow}
                disabled={loading}
              >
                {loading ? "Loading..." : "Show"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800">Art Stock</h2>
              <div className="text-sm text-gray-600">As On: {asOn}</div>
            </div>

            {/* RESULT TABLE */}
            <div className="border border-gray-500 rounded max-h-[500px] max-w-[1400px] overflow-y-auto overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-500 border-collapse">
                <thead className="bg-gray-100 select-none">
                  <tr>
                    <th className="px-2 py-2 border border-gray-500 w-16 text-center">
                      S. No.
                    </th>
                    <th
                      className="px-2 py-2 border border-gray-500 cursor-pointer"
                      onClick={() => handleHeaderClick("artNo")}
                      title="Click to sort"
                    >
                      Art No
                    </th>
                    <th
                      className="px-2 py-2 border border-gray-500 cursor-pointer"
                      onClick={() => handleHeaderClick("artName")}
                      title="Click to sort"
                    >
                      Art Name
                    </th>
                    <th
                      className="px-2 py-2 border border-gray-500 cursor-pointer"
                      onClick={() => handleHeaderClick("shadeName")}
                      title="Click to sort"
                    >
                      Shade
                    </th>
                    <th className="px-2 py-2 border border-gray-500 text-left">
                      Row
                    </th>

                    {sizeNames.map((sz) => (
                      <th
                        key={sz}
                        className="px-2 py-2 border border-gray-500 text-center"
                      >
                        {sz}
                      </th>
                    ))}

                    <th className="px-2 py-2 border border-gray-500 text-right">
                      Total Box
                    </th>
                    <th className="px-2 py-2 border border-gray-500 text-right">
                      Total Pcs
                    </th>
                    <th className="px-2 py-2 border border-gray-500 text-right">
                      Total amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroupRows.map((g, idx) => {
                    let totalBox = 0;
                    let totalPcs = 0;
                    let totalAmount = 0;
                    sizeNames.forEach((szName) => {
                      const szData = g.sizes[szName];
                      if (!szData) return;
                      totalBox += toNum(szData.openingBox);
                      totalPcs += toNum(szData.pcs);
                      totalAmount += toNum(szData.amount);
                    });

                    const rowSpan = 4;

                    const blockIndex = Math.floor(idx / 1);
                    const isYellowBlock = blockIndex % 2 === 1;
                    const bgClass = isYellowBlock ? "bg-sky-50" : "bg-white";

                    return (
                      <React.Fragment
                        key={`${g.artSerial}-${g.shadeName}-${idx}`}
                      >
                        {[0, 1, 2, 3].map((line) => {
                          const label =
                            line === 0
                              ? "Box"
                              : line === 1
                              ? "Pcs"
                              : line === 2
                              ? "Rate"
                              : "Amount";

                          return (
                            <tr
                              key={`${g.artSerial}-${g.shadeName}-${idx}-${line}`}
                              className={bgClass}
                            >
                              {line === 0 && (
                                <>
                                  <td
                                    className="px-2 py-1 border border-gray-400 text-center"
                                    rowSpan={rowSpan}
                                  >
                                    {idx + 1}
                                  </td>
                                  <td
                                    className="px-2 py-1 border border-gray-400 text-center"
                                    rowSpan={rowSpan}
                                  >
                                    {g.artNo}
                                  </td>
                                  <td
                                    className="px-2 py-1 border border-gray-400 text-center"
                                    rowSpan={rowSpan}
                                  >
                                    {g.artName}
                                  </td>
                                  <td
                                    className="px-2 py-1 border border-gray-400 text-center"
                                    rowSpan={rowSpan}
                                  >
                                    {g.shadeName}
                                  </td>
                                </>
                              )}

                              <td className="px-2 py-1 border border-gray-400 text-left">
                                {label}
                              </td>

                              {sizeNames.map((szName) => {
                                const szData = g.sizes[szName];
                                const box = szData ? toNum(szData.openingBox) : 0;
                                const pcs = szData ? toNum(szData.pcs) : 0;
                                const rate = szData ? toNum(szData.rate) : 0;
                                const amt = szData ? toNum(szData.amount) : 0;

                                let val = "";
                                if (line === 0 && box) val = box.toFixed(2);
                                else if (line === 1 && pcs) val = pcs.toFixed(2);
                                else if (line === 2 && rate) val = rate.toFixed(2);
                                else if (line === 3 && amt) val = amt.toFixed(2);

                                return (
                                  <td
                                    key={`${g.artSerial}-${szName}-${line}`}
                                    className="border border-gray-400 h-6 text-right"
                                  >
                                    {val}
                                  </td>
                                );
                              })}

                              {line === 0 && (
                                <>
                                  <td
                                    className="px-2 py-1 border border-gray-400 text-right text-center"
                                    rowSpan={rowSpan}
                                  >
                                    {totalBox ? totalBox.toFixed(2) : ""}
                                  </td>
                                  <td
                                    className="px-2 py-1 border border-gray-400 text-right text-center"
                                    rowSpan={rowSpan}
                                  >
                                    {totalPcs ? totalPcs.toFixed(2) : ""}
                                  </td>
                                  <td
                                    className="px-2 py-1 border border-gray-400 text-right text-center"
                                    rowSpan={rowSpan}
                                  >
                                    {totalAmount ? totalAmount.toFixed(2) : ""}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {sortedGroupRows.length === 0 && (
                    <tr>
                      <td
                        className="px-2 py-2 border border-gray-400 text-center"
                        colSpan={5 + sizeNames.length + 3}
                      >
                        No data
                      </td>
                    </tr>
                  )}

                  {sortedGroupRows.length > 0 && (
                    <tr className="bg-sky-100 font-semibold">
                      <td className="px-2 py-2 border border-gray-500"></td>
                      <td className="px-2 py-2 border border-gray-500">Total</td>
                      <td className="px-2 py-2 border border-gray-500"></td>
                      <td className="px-2 py-2 border border-gray-500"></td>
                      <td className="px-2 py-2 border border-gray-500"></td>
                      {sizeNames.map((sz) => {
                        const amt = sizeTotalAmount[sz] || 0;
                        return (
                          <td
                            key={`${sz}-total`}
                            className="px-2 py-2 border border-gray-500 text-right"
                          >
                            {amt ? amt.toFixed(2) : ""}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 border border-gray-500 text-right">
                        {grandTotalOpeningBox.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 border border-gray-500 text-right">
                        {grandTotalPcs.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 border border-gray-500 text-right">
                        {grandTotalAmount.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded bg-sky-600 text-white text-sm font-semibold disabled:opacity-60"
                  onClick={handleExport}
                  disabled={groupRows.length === 0}
                >
                  Export
                </button>
                <button
                  className="px-3 py-2 rounded bg-zinc-700 text-white text-sm font-semibold disabled:opacity-60"
                  onClick={handlePrint}
                  disabled={groupRows.length === 0}
                >
                  Print
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded bg-gray-500 text-white text-sm font-semibold"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button
                  className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold"
                  onClick={() => {
                    Swal.fire({
                      icon: "success",
                      title: "Saved!",
                      text: "Settings saved for this session.",
                      timer: 1200,
                      showConfirmButton: false,
                    });
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default ArtReport;