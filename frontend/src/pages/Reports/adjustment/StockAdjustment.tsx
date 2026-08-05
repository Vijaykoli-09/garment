"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";
import axios from "axios";

/* ---------------- helpers ---------------- */
const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toNum = (v: any) => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

/* ---------------- types (art) ---------------- */
interface ArtListView {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  saleRate: string;
  styleName: string;
  season: string;
  brandName: string;
}
interface ShadeFromCreation {
  shadeCode: string;
  shadeName: string;
  colorFamily: string;
}
interface SizeFromCreation {
  serialNo: string;
  sizeName: string;
  orderNo: string;
}
interface SizeDetail {
  id: number;
  serialNo: string;
  sizeName: string;
  orderNo: string;
  box?: string;
  pcs?: string;
  rate?: string;
}
interface ArtDetailView {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  saleRate: string;
  sizes: SizeDetail[];
  sizeDetails?: SizeDetail[];
}
interface ArtAdjRow {
  id: number;
  adjDate?: string;
  adj_date?: string;
  artNo?: string;
  art_no?: string;
  shadeName?: string;
  shade_name?: string;
  sizeName?: string;
  size_name?: string;
  pcsDelta?: number;
  pcs_delta?: number;
  perBox?: number | null;
  per_box?: number | null;
  rate?: number | null;
}
type ArtStockInfo = { pcs: number; perBox: number; rate: number };

/* ---------------- types (material) ---------------- */
interface MaterialGroup {
  id: number;
  materialGroup: string;
}

// backend entity /materials may return materialGroup object
type MaterialApiRow = {
  id: number;
  materialName: string;
  materialUnit?: string | null;
  materialGroupId?: number | null;
  materialGroup?: { id: number; materialGroup?: string } | null;
};

interface MaterialItem {
  id: number;
  materialGroupId: number;
  materialName: string;
  materialUnit: string; // <-- your field
}

interface StockReportRow {
  id: number;
  groupName: string;
  itemName: string;
  shadeName: string;
  openingStock: number;
  purchase: number;
  consumed: number;
  balance: number;
}
interface MatAdjRow {
  id: number;
  adjDate?: string;
  adj_date?: string;
  materialGroupId?: number;
  material_group_id?: number;
  materialId?: number;
  material_id?: number;
  shadeName?: string | null;
  shade_name?: string | null;
  qtyDelta?: number;
  qty_delta?: number;
}

type Tab = "ART" | "MATERIAL";

/* ---------- pure helper ---------- */
const getMaterialUnit = (materials: MaterialItem[], itemIdStr: string) => {
  const id = Number(itemIdStr);
  if (!Number.isFinite(id) || id <= 0) return "";
  const it = materials.find((x) => x.id === id);
  return (it?.materialUnit || "").trim();
};

/* ---------------- component ---------------- */
const StockAdjustment: React.FC = () => {
  const [tab, setTab] = useState<Tab>("ART");
  const [loading, setLoading] = useState(false);

  const [arts, setArts] = useState<ArtListView[]>([]);
  const [shades, setShades] = useState<ShadeFromCreation[]>([]);
  const [sizes, setSizes] = useState<SizeFromCreation[]>([]);
  const [matGroups, setMatGroups] = useState<MaterialGroup[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.get("/arts"),
          api.get("/shade/list"),
          api.get("/sizes"),
          api.get("/material-groups"),
          api.get("/materials"),
        ]);

        const [a, sh, sz, mg, m] = results;

        setArts(a.status === "fulfilled" && Array.isArray(a.value.data) ? a.value.data : []);
        setShades(sh.status === "fulfilled" && Array.isArray(sh.value.data) ? sh.value.data : []);
        setSizes(sz.status === "fulfilled" && Array.isArray(sz.value.data) ? sz.value.data : []);
        setMatGroups(mg.status === "fulfilled" && Array.isArray(mg.value.data) ? mg.value.data : []);

        // ✅ normalize /materials -> MaterialItem (materialGroupId + materialUnit)
        if (m.status === "fulfilled" && Array.isArray(m.value.data)) {
          const raw: MaterialApiRow[] = m.value.data;
          const norm: MaterialItem[] = raw
            .map((r) => {
              const groupId =
                toNum(r.materialGroupId) ||
                toNum((r.materialGroup as any)?.id) ||
                0;

              return {
                id: toNum(r.id),
                materialGroupId: groupId,
                materialName: String(r.materialName || "").trim(),
                materialUnit: String(r.materialUnit || "").trim(),
              };
            })
            .filter((x) => x.id > 0 && x.materialGroupId > 0 && x.materialName);

          setMaterials(norm);
        } else {
          setMaterials([]);
        }

        const failed = results
          .map((r, i) => ({ r, i }))
          .filter((x) => x.r.status === "rejected");

        if (failed.length > 0) {
          const msgLines = failed.map((x) => {
            const err = (x.r as PromiseRejectedResult).reason;
            if (axios.isAxiosError(err)) {
              const url = `${err.config?.baseURL || ""}${err.config?.url || ""}`;
              return `API failed: ${url} (status: ${err.response?.status ?? "NO_RESPONSE"})`;
            }
            return `API failed: index ${x.i}`;
          });

          Swal.fire({
            icon: "warning",
            title: "Some data could not load",
            html: `<div style="text-align:left;font-size:13px;white-space:pre-line">${msgLines.join("\n")}</div>`,
          });
        }
      } catch (e) {
        console.error(e);
        Swal.fire("Error", "Failed to load master data.", "error");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  const artByNo = useMemo(() => {
    const map = new Map<string, ArtListView>();
    arts.forEach((x) => map.set((x.artNo || "").trim().toUpperCase(), x));
    return map;
  }, [arts]);

  const matsByGroup = useMemo(() => {
    const m: Record<number, MaterialItem[]> = {};
    materials.forEach((x) => {
      m[x.materialGroupId] = m[x.materialGroupId] || [];
      m[x.materialGroupId].push(x);
    });
    return m;
  }, [materials]);

  /* ======================= COMMON: ART STOCK CALC ======================= */
  const calcArtStockForParams = async (params: {
    artNoRaw: string;
    shadeNameX: string;
    sizeNameX: string;
    asOn: string;
  }): Promise<ArtStockInfo> => {
    const art = artByNo.get(params.artNoRaw.trim().toUpperCase());
    if (!art) return { pcs: 0, perBox: 0, rate: 0 };
    if (!params.shadeNameX || !params.sizeNameX) return { pcs: 0, perBox: 0, rate: 0 };

    let pcs = 0;
    let perBox = 0;
    let rate = 0;

    // 1) Opening from Art detail
    const det = await api.get<ArtDetailView>(`/arts/${art.serialNumber}`).then((r) => r.data);

    const sizeList: SizeDetail[] =
      Array.isArray(det.sizeDetails) && det.sizeDetails.length > 0
        ? (det.sizeDetails as any)
        : Array.isArray(det.sizes)
          ? det.sizes
          : [];

    const sz = sizeList.find((x) => (x.sizeName || "").trim() === params.sizeNameX.trim());
    if (sz) {
      const pb = toNum(sz.pcs);
      const box = toNum(sz.box);
      pcs += box * pb;
      if (pb > 0) perBox = pb;

      const rt = toNum(sz.rate || det.saleRate || 0);
      if (rt > 0) rate = rt;
    }

    // 2) Packing incoming
    const packingRes = await api.get<any[]>("/packing-challans");
    const packingList: any[] = Array.isArray(packingRes.data) ? packingRes.data : [];
    packingList.forEach((ch) => {
      const rows: any[] = Array.isArray(ch.rows) ? ch.rows : [];
      rows.forEach((r) => {
        const rArtNo = String(r.artNo || "").trim().toUpperCase();
        if (rArtNo !== art.artNo.trim().toUpperCase()) return;

        const sh = String(r.shadeName || r.shade || "").trim();
        if (sh !== params.shadeNameX) return;

        const details: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
        if (details.length > 0) {
          details.forEach((sd) => {
            const sName = String(sd.sizeName || sd.size || "").trim();
            if (sName !== params.sizeNameX.trim()) return;

            const p = toNum(sd.pcs) || toNum(sd.boxCount || 0) * toNum(sd.perBox || 0);
            pcs += p;

            const pb = toNum(sd.perBox);
            if (pb > 0) perBox = pb;

            const rt = toNum(sd.rate);
            if (rt > 0) rate = rt;
          });
        } else {
          const sName = String(r.sizeName || r.size || "").trim();
          if (sName !== params.sizeNameX.trim()) return;

          const p = toNum(r.pcs) || toNum(r.box || 0) * toNum(r.perBox || 0);
          pcs += p;

          const pb = toNum(r.perBox);
          if (pb > 0) perBox = pb;

          const rt = toNum(r.rate);
          if (rt > 0) rate = rt;
        }
      });
    });

    // 3) Dispatch outgoing
    const dispatchRes = await api.get<any[]>("/dispatch-challan");
    const dispatchList: any[] = Array.isArray(dispatchRes.data) ? dispatchRes.data : [];
    dispatchList.forEach((dc) => {
      const rows: any[] = Array.isArray(dc.rows) ? dc.rows : [];
      rows.forEach((r) => {
        const rArtNo = String(r.artNo || "").trim().toUpperCase();
        if (rArtNo !== art.artNo.trim().toUpperCase()) return;

        const sh = String(r.shade || r.shadeName || "").trim();
        if (sh !== params.shadeNameX) return;

        const sName = String(r.size || r.sizeName || "").trim();
        if (sName !== params.sizeNameX.trim()) return;

        const p = toNum(r.pcs) || toNum(r.box || 0) * toNum(r.pcsPerBox || 0);
        pcs -= p;

        const pb = toNum(r.pcsPerBox);
        if (pb > 0) perBox = pb;
      });
    });

    // 4) Adjustments
    const adjRes = await api.get<ArtAdjRow[]>("/art-stock-adjustments", {
      params: { toDate: params.asOn, limit: 10000 },
    });
    const adjs = Array.isArray(adjRes.data) ? adjRes.data : [];
    adjs.forEach((a) => {
      const aArtNo = String(a.art_no || a.artNo || "").trim().toUpperCase();
      if (aArtNo !== art.artNo.trim().toUpperCase()) return;

      const sh = String(a.shade_name || a.shadeName || "").trim();
      const sn = String(a.size_name || a.sizeName || "").trim();
      if (sh !== params.shadeNameX) return;
      if (sn !== params.sizeNameX.trim()) return;

      pcs += toNum(a.pcs_delta ?? a.pcsDelta);

      const pb = toNum(a.per_box ?? a.perBox);
      if (pb > 0) perBox = pb;

      const rt = toNum(a.rate);
      if (rt > 0) rate = rt;
    });

    return { pcs, perBox, rate };
  };

  const artStockText = (s: ArtStockInfo | null) => {
    if (!s) return "-";
    const box = s.perBox ? s.pcs / s.perBox : 0;
    return `Pcs: ${s.pcs.toFixed(2)}${s.perBox ? ` | Box: ${box.toFixed(2)} | PerBox: ${s.perBox}` : ""}${
      s.rate ? ` | Rate: ${s.rate}` : ""
    }`;
  };

  /* ======================= ART TAB (FROM -> TO) ======================= */
  const [asOnArt, setAsOnArt] = useState(todayStr());
  const [shadeCodeArt, setShadeCodeArt] = useState("");

  const shadeNameArt = useMemo(
    () => shades.find((s) => s.shadeCode === shadeCodeArt)?.shadeName || "",
    [shadeCodeArt, shades]
  );

  const [fromArt, setFromArt] = useState("");
  const [fromSizeSerialArt, setFromSizeSerialArt] = useState("");
  const fromSizeNameArt = useMemo(
    () => sizes.find((s) => s.serialNo === fromSizeSerialArt)?.sizeName || "",
    [fromSizeSerialArt, sizes]
  );

  const [toArt, setToArt] = useState("");
  const [toSizeSerialArt, setToSizeSerialArt] = useState("");
  const toSizeNameArt = useMemo(
    () => sizes.find((s) => s.serialNo === toSizeSerialArt)?.sizeName || "",
    [toSizeSerialArt, sizes]
  );

  const [qtyArt, setQtyArt] = useState("");
  const [remarksArt, setRemarksArt] = useState("");

  const [stkFromArt, setStkFromArt] = useState<ArtStockInfo | null>(null);
  const [stkToArt, setStkToArt] = useState<ArtStockInfo | null>(null);

  const checkArtStocks = async (): Promise<{ sFrom: ArtStockInfo; sTo: ArtStockInfo } | null> => {
    const aFrom = artByNo.get(fromArt.trim().toUpperCase());
    const aTo = artByNo.get(toArt.trim().toUpperCase());

    if (!shadeNameArt) {
      Swal.fire("Warning", "Select Shade first.", "warning");
      return null;
    }
    if (!aFrom) {
      Swal.fire("Warning", "Select FROM Art.", "warning");
      return null;
    }
    if (!aTo) {
      Swal.fire("Warning", "Select TO Art.", "warning");
      return null;
    }
    if (!fromSizeSerialArt) {
      Swal.fire("Warning", "Select FROM Size.", "warning");
      return null;
    }
    if (!toSizeSerialArt) {
      Swal.fire("Warning", "Select TO Size.", "warning");
      return null;
    }

    try {
      setLoading(true);
      const [sFrom, sTo] = await Promise.all([
        calcArtStockForParams({
          artNoRaw: aFrom.artNo,
          shadeNameX: shadeNameArt,
          sizeNameX: fromSizeNameArt,
          asOn: asOnArt,
        }),
        calcArtStockForParams({
          artNoRaw: aTo.artNo,
          shadeNameX: shadeNameArt,
          sizeNameX: toSizeNameArt,
          asOn: asOnArt,
        }),
      ]);

      setStkFromArt(sFrom);
      setStkToArt(sTo);
      return { sFrom, sTo };
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load art stock.", "error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== "ART") return;
      if (!shadeCodeArt) return;
      if (!fromArt || !toArt || !fromSizeSerialArt || !toSizeSerialArt) return;
      checkArtStocks();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, asOnArt, shadeCodeArt, fromArt, toArt, fromSizeSerialArt, toSizeSerialArt]);

  const saveArtTransfer = async () => {
    const aFrom = artByNo.get(fromArt.trim().toUpperCase());
    const aTo = artByNo.get(toArt.trim().toUpperCase());

    if (!shadeNameArt) return Swal.fire("Warning", "Select Shade.", "warning");
    if (!aFrom) return Swal.fire("Warning", "Select FROM Art.", "warning");
    if (!aTo) return Swal.fire("Warning", "Select TO Art.", "warning");
    if (!fromSizeSerialArt) return Swal.fire("Warning", "Select FROM Size.", "warning");
    if (!toSizeSerialArt) return Swal.fire("Warning", "Select TO Size.", "warning");

    // Size adjustment removed => Art transfer requires same size
    if (fromSizeSerialArt !== toSizeSerialArt) {
      return Swal.fire("Warning", "FROM Size and TO Size must be same.", "warning");
    }

    const qty = toNum(qtyArt);
    if (qty <= 0) return Swal.fire("Warning", "Enter Qty (>0).", "warning");

    const stocks = await checkArtStocks();
    if (!stocks) return;

    const available = stocks.sFrom.pcs ?? 0;
    if (qty > available) {
      return Swal.fire("Warning", `FROM stock is ${available}. You entered ${qty}`, "warning");
    }

    const ref = `ARTRF-${Date.now()}`;
    const rem = (remarksArt || "").trim();

    const ok = await Swal.fire({
      icon: "question",
      title: "Confirm Art Transfer?",
      html: `<div style="text-align:left;font-size:13px">
        <div><b>FROM:</b> ${aFrom.artNo} | Size: ${fromSizeNameArt} | OUT: ${qty}</div>
        <div><b>TO:</b> ${aTo.artNo} | Size: ${toSizeNameArt} | IN: ${qty}</div>
        <div><b>Shade:</b> ${shadeNameArt}</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!ok.isConfirmed) return;

    try {
      setLoading(true);

      await Promise.all([
        api.post("/art-stock-adjustments", {
          adjDate: asOnArt,
          artSerial: aFrom.serialNumber,
          artGroup: aFrom.artGroup,
          artNo: aFrom.artNo,
          artName: aFrom.artName,
          shadeCode: shadeCodeArt,
          shadeName: shadeNameArt,
          sizeSerial: fromSizeSerialArt,
          sizeName: fromSizeNameArt,
          pcsDelta: -qty,
          remarks: `[${ref}] OUT -> ${aTo.artNo}. ${rem}`.trim(),
        }),
        api.post("/art-stock-adjustments", {
          adjDate: asOnArt,
          artSerial: aTo.serialNumber,
          artGroup: aTo.artGroup,
          artNo: aTo.artNo,
          artName: aTo.artName,
          shadeCode: shadeCodeArt,
          shadeName: shadeNameArt,
          sizeSerial: toSizeSerialArt,
          sizeName: toSizeNameArt,
          pcsDelta: qty,
          remarks: `[${ref}] IN. ${rem}`.trim(),
        }),
      ]);

      Swal.fire("Saved", "Art transfer saved successfully.", "success");
      setQtyArt("");
      setRemarksArt("");
      await checkArtStocks();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Save failed. Check backend APIs.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ======================= MATERIAL TAB (FROM -> TO) + UNIT SHOW ======================= */
  const [asOnMat, setAsOnMat] = useState(todayStr());
  const [mShade, setMShade] = useState("");
  const [mRem, setMRem] = useState("");

  const [fromGroup, setFromGroup] = useState("");
  const [fromItem, setFromItem] = useState("");
  const [matQty, setMatQty] = useState("");

  const [toGroup, setToGroup] = useState("");
  const [toItem, setToItem] = useState("");

  const fromUnit = useMemo(() => getMaterialUnit(materials, fromItem), [materials, fromItem]);
  const toUnit = useMemo(() => getMaterialUnit(materials, toItem), [materials, toItem]);

  const [mbFrom, setMbFrom] = useState<number | null>(null);
  const [mbTo, setMbTo] = useState<number | null>(null);

  const calcOneMaterialBalance = async (groupId: number, itemId: number) => {
    const res = await api.post<StockReportRow[]>("/stock-report", {
      groupIds: [groupId],
      itemIds: [itemId],
      fromDate: null,
      toDate: null,
    });

    const rows = Array.isArray(res.data) ? res.data : [];
    let bal = 0;

    if (!mShade.trim()) {
      bal = rows.reduce((acc, r) => acc + toNum(r.balance), 0);
    } else {
      const sn = mShade.trim().toLowerCase();
      bal = rows
        .filter((r) => String(r.shadeName || "").trim().toLowerCase() === sn)
        .reduce((acc, r) => acc + toNum(r.balance), 0);
    }

    const adjRes = await api.get<MatAdjRow[]>("/material-stock-adjustments", {
      params: { toDate: asOnMat, limit: 10000 },
    });
    const adjs = Array.isArray(adjRes.data) ? adjRes.data : [];
    const sn = mShade.trim().toLowerCase();

    adjs.forEach((a) => {
      const ag = toNum(a.material_group_id ?? a.materialGroupId);
      const ai = toNum(a.material_id ?? a.materialId);
      if (ag !== groupId || ai !== itemId) return;

      if (mShade.trim()) {
        const ash = String(a.shade_name ?? a.shadeName ?? "").trim().toLowerCase();
        if (ash !== sn) return;
      }
      bal += toNum(a.qty_delta ?? a.qtyDelta);
    });

    return bal;
  };

  const checkMaterialStocks = async (): Promise<{ bFrom: number; bTo: number } | null> => {
    const Gf = toNum(fromGroup),
      If = toNum(fromItem);
    const Gt = toNum(toGroup),
      It = toNum(toItem);

    if (!Gf || !If) {
      Swal.fire("Warning", "Select FROM Group & Item.", "warning");
      return null;
    }
    if (!Gt || !It) {
      Swal.fire("Warning", "Select TO Group & Item.", "warning");
      return null;
    }

    try {
      setLoading(true);
      const [bFrom, bTo] = await Promise.all([calcOneMaterialBalance(Gf, If), calcOneMaterialBalance(Gt, It)]);
      setMbFrom(bFrom);
      setMbTo(bTo);
      return { bFrom, bTo };
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load material stock.", "error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== "MATERIAL") return;
      if (!fromGroup || !fromItem || !toGroup || !toItem) return;
      checkMaterialStocks();
    }, 450);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, asOnMat, mShade, fromGroup, fromItem, toGroup, toItem]);

  const saveMaterialTransfer = async () => {
    const Gf = toNum(fromGroup),
      If = toNum(fromItem);
    const Gt = toNum(toGroup),
      It = toNum(toItem);

    if (!Gf || !If) return Swal.fire("Warning", "Select FROM Group & Item.", "warning");
    if (!Gt || !It) return Swal.fire("Warning", "Select TO Group & Item.", "warning");

    const qty = toNum(matQty);
    if (qty <= 0) return Swal.fire("Warning", "Enter Qty (>0).", "warning");

    const stocks = await checkMaterialStocks();
    if (!stocks) return;

    if (qty > stocks.bFrom) {
      return Swal.fire("Warning", `FROM balance is ${stocks.bFrom}. You entered ${qty}`, "warning");
    }

    const ref = `MATTRF-${Date.now()}`;
    const rem = (mRem || "").trim();

    const ok = await Swal.fire({
      icon: "question",
      title: "Confirm Material Transfer?",
      html: `<div style="text-align:left;font-size:13px">
        <div><b>OUT:</b> ${qty}${fromUnit ? ` ${fromUnit}` : ""}</div>
        <div><b>IN:</b> ${qty}${toUnit ? ` ${toUnit}` : ""}</div>
        <div><b>Shade:</b> ${mShade || "-"}</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!ok.isConfirmed) return;

    try {
      setLoading(true);

      await Promise.all([
        api.post("/material-stock-adjustments", {
          adjDate: asOnMat,
          materialGroupId: Gf,
          materialId: If,
          shadeName: mShade.trim() || null,
          qtyDelta: -qty,
          remarks: `[${ref}] OUT -> ${It}. ${rem}`.trim(),
        }),
        api.post("/material-stock-adjustments", {
          adjDate: asOnMat,
          materialGroupId: Gt,
          materialId: It,
          shadeName: mShade.trim() || null,
          qtyDelta: qty,
          remarks: `[${ref}] IN. ${rem}`.trim(),
        }),
      ]);

      Swal.fire("Saved", "Material transfer saved.", "success");
      setMatQty("");
      setMRem("");
      await checkMaterialStocks();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Save failed. Check backend APIs.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------- UI ------------------------------- */
  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-md p-5 w-full max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Stock Transfer (From → To)</h2>

            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded border text-sm ${
                  tab === "ART" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
                }`}
                onClick={() => setTab("ART")}
              >
                Art
              </button>

              <button
                className={`px-4 py-2 rounded border text-sm ${
                  tab === "MATERIAL" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
                }`}
                onClick={() => setTab("MATERIAL")}
              >
                Material
              </button>
            </div>
          </div>

          {/* shared datalist */}
          <datalist id="artList">
            {arts.map((a) => (
              <option key={a.serialNumber} value={a.artNo}>
                {a.artNo} - {a.artName}
              </option>
            ))}
          </datalist>

          {/* ======================= ART TAB ======================= */}
          {tab === "ART" ? (
            <div className="border rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-semibold mb-1">As On Date</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    type="date"
                    value={asOnArt}
                    onChange={(e) => setAsOnArt(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold mb-1">Shade</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={shadeCodeArt}
                    onChange={(e) => {
                      setShadeCodeArt(e.target.value);
                      setStkFromArt(null);
                      setStkToArt(null);
                    }}
                  >
                    <option value="">--Select--</option>
                    {shades.map((s) => (
                      <option key={s.shadeCode} value={s.shadeCode}>
                        {s.shadeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {/* FROM */}
                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-2">FROM</div>

                  <div className="text-sm font-semibold mb-1">Art</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    list="artList"
                    value={fromArt}
                    onChange={(e) => {
                      setFromArt(e.target.value);
                      setFromSizeSerialArt("");
                      setStkFromArt(null);
                    }}
                    placeholder="Select Art No"
                  />

                  <div className="text-sm font-semibold mt-3 mb-1">Size</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={fromSizeSerialArt}
                    onChange={(e) => {
                      setFromSizeSerialArt(e.target.value);
                      setStkFromArt(null);
                      if (!toSizeSerialArt) setToSizeSerialArt(e.target.value);
                    }}
                    disabled={!fromArt}
                  >
                    <option value="">--Select--</option>
                    {sizes.map((s) => (
                      <option key={s.serialNo} value={s.serialNo}>
                        {s.sizeName}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{artStockText(stkFromArt)}</b>
                  </div>

                  <div className="text-sm font-semibold mt-3 mb-1">Qty OUT</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={qtyArt}
                    onChange={(e) => setQtyArt(e.target.value)}
                    placeholder="0"
                  />
                </div>

                {/* TO */}
                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-2">TO</div>

                  <div className="text-sm font-semibold mb-1">Art</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    list="artList"
                    value={toArt}
                    onChange={(e) => {
                      setToArt(e.target.value);
                      setStkToArt(null);
                    }}
                    placeholder="Select Art No"
                  />

                  <div className="text-sm font-semibold mt-3 mb-1">Size</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={toSizeSerialArt}
                    onChange={(e) => {
                      setToSizeSerialArt(e.target.value);
                      setStkToArt(null);
                    }}
                    disabled={!toArt}
                  >
                    <option value="">--Select--</option>
                    {sizes.map((s) => (
                      <option key={s.serialNo} value={s.serialNo}>
                        {s.sizeName}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{artStockText(stkToArt)}</b>
                  </div>

                  <div className="mt-3 text-sm">
                    Total IN = <b>{toNum(qtyArt) > 0 ? toNum(qtyArt) : 0}</b>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold mb-1">Remarks</div>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={remarksArt}
                  onChange={(e) => setRemarksArt(e.target.value)}
                  placeholder="optional"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  disabled={loading}
                  onClick={checkArtStocks}
                  className="px-4 py-2 rounded bg-gray-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "..." : "Check Stock"}
                </button>
                <button
                  disabled={loading}
                  onClick={saveArtTransfer}
                  className="px-5 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Transfer"}
                </button>
              </div>
            </div>
          ) : null}

          {/* ======================= MATERIAL TAB ======================= */}
          {tab === "MATERIAL" ? (
            <div className="border rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-sm font-semibold mb-1">As On Date</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    type="date"
                    value={asOnMat}
                    onChange={(e) => setAsOnMat(e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">Shade (optional)</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={mShade}
                    onChange={(e) => setMShade(e.target.value)}
                    placeholder="e.g. Black"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">Remarks</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={mRem}
                    onChange={(e) => setMRem(e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {/* FROM */}
                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-2">FROM</div>

                  <div className="text-sm font-semibold mb-1">Group</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={fromGroup}
                    onChange={(e) => {
                      setFromGroup(e.target.value);
                      setFromItem("");
                      setMbFrom(null);
                    }}
                  >
                    <option value="">--Group--</option>
                    {matGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.materialGroup}
                      </option>
                    ))}
                  </select>

                  <div className="text-sm font-semibold mt-3 mb-1">Item</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={fromItem}
                    onChange={(e) => {
                      setFromItem(e.target.value);
                      setMbFrom(null);
                    }}
                    disabled={!fromGroup}
                  >
                    <option value="">--Item--</option>
                    {(matsByGroup[toNum(fromGroup)] || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.materialName}
                        {m.materialUnit ? ` (${m.materialUnit})` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-600 mt-2">
                    Unit: <b>{fromUnit || "-"}</b>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Stock:{" "}
                    <b>{mbFrom === null ? "-" : `${mbFrom.toFixed(2)}${fromUnit ? ` ${fromUnit}` : ""}`}</b>
                  </div>

                  <div className="text-sm font-semibold mt-3 mb-1">
                    Qty OUT{fromUnit ? ` (${fromUnit})` : ""}
                  </div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={matQty}
                    onChange={(e) => setMatQty(e.target.value)}
                    placeholder="0"
                  />
                </div>

                {/* TO */}
                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-2">TO</div>

                  <div className="text-sm font-semibold mb-1">Group</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={toGroup}
                    onChange={(e) => {
                      setToGroup(e.target.value);
                      setToItem("");
                      setMbTo(null);
                    }}
                  >
                    <option value="">--Group--</option>
                    {matGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.materialGroup}
                      </option>
                    ))}
                  </select>

                  <div className="text-sm font-semibold mt-3 mb-1">Item</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={toItem}
                    onChange={(e) => {
                      setToItem(e.target.value);
                      setMbTo(null);
                    }}
                    disabled={!toGroup}
                  >
                    <option value="">--Item--</option>
                    {(matsByGroup[toNum(toGroup)] || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.materialName}
                        {m.materialUnit ? ` (${m.materialUnit})` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-600 mt-2">
                    Unit: <b>{toUnit || "-"}</b>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Stock:{" "}
                    <b>{mbTo === null ? "-" : `${mbTo.toFixed(2)}${toUnit ? ` ${toUnit}` : ""}`}</b>
                  </div>

                  <div className="mt-3 text-sm">
                    Total IN ={" "}
                    <b>{toNum(matQty) > 0 ? `${toNum(matQty)}${toUnit ? ` ${toUnit}` : ""}` : 0}</b>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  disabled={loading}
                  onClick={checkMaterialStocks}
                  className="px-4 py-2 rounded bg-gray-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "..." : "Check Stock"}
                </button>
                <button
                  disabled={loading}
                  onClick={saveMaterialTransfer}
                  className="px-5 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Transfer"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Dashboard>
  );
};

export default StockAdjustment;