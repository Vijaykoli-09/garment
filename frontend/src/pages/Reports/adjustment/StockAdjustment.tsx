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
interface MaterialItem {
  id: number;
  materialGroupId: number;
  materialName: string;
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

type Tab = "ART" | "MATERIAL" | "SIZE";

/* ---------------- component ---------------- */
const StockTransferAdjust: React.FC = () => {
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
        // ✅ Safe boot: network error se app crash nahi hoga
        const results = await Promise.allSettled([
          api.get("/arts"),
          api.get("/shade/list"),
          api.get("/sizes"),
          api.get("/material-groups"),
          api.get("/materials"),
        ]);

        const [a, sh, sz, mg, m] = results;

        if (a.status === "fulfilled") setArts(Array.isArray(a.value.data) ? a.value.data : []);
        else setArts([]);

        if (sh.status === "fulfilled") setShades(Array.isArray(sh.value.data) ? sh.value.data : []);
        else setShades([]);

        if (sz.status === "fulfilled") setSizes(Array.isArray(sz.value.data) ? sz.value.data : []);
        else setSizes([]);

        if (mg.status === "fulfilled") setMatGroups(Array.isArray(mg.value.data) ? mg.value.data : []);
        else setMatGroups([]);

        if (m.status === "fulfilled") setMaterials(Array.isArray(m.value.data) ? m.value.data : []);
        else setMaterials([]);

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
            html: `<div style="text-align:left;font-size:13px;white-space:pre-line">${msgLines.join(
              "\n"
            )}</div>`,
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

  /* ======================= ART TAB (same working logic) ======================= */
  const [asOnArt, setAsOnArt] = useState(todayStr());
  const [shadeCode, setShadeCode] = useState("");
  const [sizeSerial, setSizeSerial] = useState("");

  const shadeName = useMemo(
    () => shades.find((s) => s.shadeCode === shadeCode)?.shadeName || "",
    [shadeCode, shades]
  );
  const sizeName = useMemo(
    () => sizes.find((s) => s.serialNo === sizeSerial)?.sizeName || "",
    [sizeSerial, sizes]
  );

  const [fromArt1, setFromArt1] = useState("");
  const [fromArt2, setFromArt2] = useState("");
  const [toArt, setToArt] = useState("");
  const [qty1, setQty1] = useState("");
  const [qty2, setQty2] = useState("");
  const [remarksArt, setRemarksArt] = useState("");

  const totalOut = (toNum(qty1) > 0 ? toNum(qty1) : 0) + (toNum(qty2) > 0 ? toNum(qty2) : 0);

  const [stk1, setStk1] = useState<ArtStockInfo | null>(null);
  const [stk2, setStk2] = useState<ArtStockInfo | null>(null);
  const [stk3, setStk3] = useState<ArtStockInfo | null>(null);

  const clearArtStocks = () => {
    setStk1(null);
    setStk2(null);
    setStk3(null);
  };

  useEffect(() => {
    clearArtStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shadeCode, sizeSerial, asOnArt]);

  const calcOneArtStock = async (artNoRaw: string): Promise<ArtStockInfo> => {
    const art = artByNo.get(artNoRaw.trim().toUpperCase());
    if (!art) return { pcs: 0, perBox: 0, rate: 0 };
    if (!shadeName || !sizeName) return { pcs: 0, perBox: 0, rate: 0 };

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

    const sz = sizeList.find((x) => (x.sizeName || "").trim() === sizeName);
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
        if (sh !== shadeName) return;

        const details: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
        if (details.length > 0) {
          details.forEach((sd) => {
            const sName = String(sd.sizeName || sd.size || "").trim();
            if (sName !== sizeName) return;

            const p = toNum(sd.pcs) || toNum(sd.boxCount || 0) * toNum(sd.perBox || 0);
            pcs += p;

            const pb = toNum(sd.perBox);
            if (pb > 0) perBox = pb;

            const rt = toNum(sd.rate);
            if (rt > 0) rate = rt;
          });
        } else {
          const sName = String(r.sizeName || r.size || "").trim();
          if (sName !== sizeName) return;

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
        if (sh !== shadeName) return;

        const sName = String(r.size || r.sizeName || "").trim();
        if (sName !== sizeName) return;

        const p = toNum(r.pcs) || toNum(r.box || 0) * toNum(r.pcsPerBox || 0);
        pcs -= p;

        const pb = toNum(r.pcsPerBox);
        if (pb > 0) perBox = pb;
      });
    });

    // 4) Adjustments (GET)
    const adjRes = await api.get<ArtAdjRow[]>("/art-stock-adjustments", {
      params: { toDate: asOnArt, limit: 10000 },
    });
    const adjs = Array.isArray(adjRes.data) ? adjRes.data : [];
    adjs.forEach((a) => {
      const aArtNo = String(a.art_no || a.artNo || "").trim().toUpperCase();
      if (aArtNo !== art.artNo.trim().toUpperCase()) return;

      const sh = String(a.shade_name || a.shadeName || "").trim();
      const sn = String(a.size_name || a.sizeName || "").trim();
      if (sh !== shadeName) return;
      if (sn !== sizeName) return;

      pcs += toNum(a.pcs_delta ?? a.pcsDelta);

      const pb = toNum(a.per_box ?? a.perBox);
      if (pb > 0) perBox = pb;

      const rt = toNum(a.rate);
      if (rt > 0) rate = rt;
    });

    return { pcs, perBox, rate };
  };

  const checkArtStocks = async () => {
    if (!shadeName || !sizeName) {
      return Swal.fire("Warning", "Select Shade and Size first.", "warning");
    }
    try {
      setLoading(true);

      const [s1, s2, s3] = await Promise.all([
        fromArt1 ? calcOneArtStock(fromArt1) : Promise.resolve({ pcs: 0, perBox: 0, rate: 0 }),
        fromArt2 ? calcOneArtStock(fromArt2) : Promise.resolve({ pcs: 0, perBox: 0, rate: 0 }),
        toArt ? calcOneArtStock(toArt) : Promise.resolve({ pcs: 0, perBox: 0, rate: 0 }),
      ]);

      setStk1(fromArt1 ? s1 : null);
      setStk2(fromArt2 ? s2 : null);
      setStk3(toArt ? s3 : null);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load art stock.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== "ART") return;
      if (!shadeCode || !sizeSerial) return;
      if (!fromArt1 && !fromArt2 && !toArt) return;
      checkArtStocks();
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fromArt1, fromArt2, toArt, shadeCode, sizeSerial, asOnArt]);

  const saveArtTransfer = async () => {
    const a1 = artByNo.get(fromArt1.trim().toUpperCase());
    const a2 = artByNo.get(fromArt2.trim().toUpperCase());
    const a3 = artByNo.get(toArt.trim().toUpperCase());

    if (!a1 || !a2 || !a3)
      return Swal.fire("Warning", "Select From Art1, From Art2 and To Art.", "warning");
    if (!shadeName || !sizeName) return Swal.fire("Warning", "Select Shade & Size.", "warning");
    if (totalOut <= 0) return Swal.fire("Warning", "Enter Qty1 and/or Qty2 (>0).", "warning");

    await checkArtStocks();
    const s1 = stk1?.pcs ?? 0;
    const s2 = stk2?.pcs ?? 0;

    if (toNum(qty1) > 0 && toNum(qty1) > s1)
      return Swal.fire("Warning", `Art-1 stock is ${s1}, you entered ${qty1}`, "warning");
    if (toNum(qty2) > 0 && toNum(qty2) > s2)
      return Swal.fire("Warning", `Art-2 stock is ${s2}, you entered ${qty2}`, "warning");

    const ref = `RNTRF-${Date.now()}`;
    const rem = (remarksArt || "").trim();

    const ok = await Swal.fire({
      icon: "question",
      title: "Confirm Transfer?",
      html: `<div style="text-align:left;font-size:13px">
        <div><b>${a1.artNo}</b> OUT: ${toNum(qty1) || 0}</div>
        <div><b>${a2.artNo}</b> OUT: ${toNum(qty2) || 0}</div>
        <div><b>${a3.artNo}</b> IN: ${totalOut}</div>
        <div>Shade: ${shadeName}</div>
        <div>Size: ${sizeName}</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!ok.isConfirmed) return;

    try {
      setLoading(true);

      const reqs: Promise<any>[] = [];

      if (toNum(qty1) > 0) {
        reqs.push(
          api.post("/art-stock-adjustments", {
            adjDate: asOnArt,
            artSerial: a1.serialNumber,
            artGroup: a1.artGroup,
            artNo: a1.artNo,
            artName: a1.artName,
            shadeCode,
            shadeName,
            sizeSerial,
            sizeName,
            pcsDelta: -toNum(qty1),
            remarks: `[${ref}] OUT -> ${a3.artNo}. ${rem}`.trim(),
          })
        );
      }

      if (toNum(qty2) > 0) {
        reqs.push(
          api.post("/art-stock-adjustments", {
            adjDate: asOnArt,
            artSerial: a2.serialNumber,
            artGroup: a2.artGroup,
            artNo: a2.artNo,
            artName: a2.artName,
            shadeCode,
            shadeName,
            sizeSerial,
            sizeName,
            pcsDelta: -toNum(qty2),
            remarks: `[${ref}] OUT -> ${a3.artNo}. ${rem}`.trim(),
          })
        );
      }

      reqs.push(
        api.post("/art-stock-adjustments", {
          adjDate: asOnArt,
          artSerial: a3.serialNumber,
          artGroup: a3.artGroup,
          artNo: a3.artNo,
          artName: a3.artName,
          shadeCode,
          shadeName,
          sizeSerial,
          sizeName,
          pcsDelta: totalOut,
          remarks: `[${ref}] IN. ${rem}`.trim(),
        })
      );

      await Promise.all(reqs);

      Swal.fire("Saved", "Transfer saved successfully.", "success");

      setQty1("");
      setQty2("");
      setRemarksArt("");

      await checkArtStocks();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Save failed. Check backend APIs.", "error");
    } finally {
      setLoading(false);
    }
  };

  const artStockText = (s: ArtStockInfo | null) => {
    if (!s) return "-";
    const box = s.perBox ? s.pcs / s.perBox : 0;
    return `Pcs: ${s.pcs.toFixed(2)}${s.perBox ? ` | Box: ${box.toFixed(2)} | PerBox: ${s.perBox}` : ""}${
      s.rate ? ` | Rate: ${s.rate}` : ""
    }`;
  };

  /* ======================= SIZE TAB (INTEGRATED with /size-stock-transfers) ======================= */
  const [asOnSize, setAsOnSize] = useState(todayStr());
  const [sizeArtNo, setSizeArtNo] = useState("");
  const [sizeShadeCode, setSizeShadeCode] = useState("");
  const [fromSizeSerial, setFromSizeSerial] = useState("");
  const [toSizeSerial, setToSizeSerial] = useState("");
  const [sizeQty, setSizeQty] = useState("");
  const [remarksSize, setRemarksSize] = useState("");

  const sizeShadeName = useMemo(
    () => shades.find((s) => s.shadeCode === sizeShadeCode)?.shadeName || "",
    [sizeShadeCode, shades]
  );

  const fromSizeName = useMemo(
    () => sizes.find((s) => s.serialNo === fromSizeSerial)?.sizeName || "",
    [fromSizeSerial, sizes]
  );

  const toSizeName = useMemo(
    () => sizes.find((s) => s.serialNo === toSizeSerial)?.sizeName || "",
    [toSizeSerial, sizes]
  );

  const [stkFromSize, setStkFromSize] = useState<ArtStockInfo | null>(null);
  const [stkToSize, setStkToSize] = useState<ArtStockInfo | null>(null);

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

    // 4) Adjustments (GET)
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

  const checkSizeStocks = async () => {
    const art = artByNo.get(sizeArtNo.trim().toUpperCase());
    if (!art) return Swal.fire("Warning", "Select Art first.", "warning");
    if (!sizeShadeName) return Swal.fire("Warning", "Select Shade first.", "warning");
    if (!fromSizeSerial || !toSizeSerial) return Swal.fire("Warning", "Select From Size & To Size.", "warning");
    if (fromSizeSerial === toSizeSerial)
      return Swal.fire("Warning", "From Size and To Size cannot be same.", "warning");

    try {
      setLoading(true);
      const [sFrom, sTo] = await Promise.all([
        calcArtStockForParams({
          artNoRaw: art.artNo,
          shadeNameX: sizeShadeName,
          sizeNameX: fromSizeName,
          asOn: asOnSize,
        }),
        calcArtStockForParams({
          artNoRaw: art.artNo,
          shadeNameX: sizeShadeName,
          sizeNameX: toSizeName,
          asOn: asOnSize,
        }),
      ]);

      setStkFromSize(sFrom);
      setStkToSize(sTo);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load size stock.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== "SIZE") return;
      if (!sizeArtNo || !sizeShadeCode || !fromSizeSerial || !toSizeSerial) return;
      if (fromSizeSerial === toSizeSerial) return;
      checkSizeStocks();
    }, 450);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sizeArtNo, sizeShadeCode, fromSizeSerial, toSizeSerial, asOnSize]);

  const saveSizeTransfer = async () => {
    const art = artByNo.get(sizeArtNo.trim().toUpperCase());
    if (!art) return Swal.fire("Warning", "Select Art.", "warning");
    if (!sizeShadeName) return Swal.fire("Warning", "Select Shade.", "warning");
    if (!fromSizeSerial || !toSizeSerial)
      return Swal.fire("Warning", "Select From Size and To Size.", "warning");
    if (fromSizeSerial === toSizeSerial)
      return Swal.fire("Warning", "From Size and To Size cannot be same.", "warning");

    const qty = toNum(sizeQty);
    if (qty <= 0) return Swal.fire("Warning", "Enter Qty (>0).", "warning");

    // validate with current from-size stock
    await checkSizeStocks();
    const available = stkFromSize?.pcs ?? 0;
    if (qty > available) {
      return Swal.fire("Warning", `From Size stock is ${available}. You entered ${qty}`, "warning");
    }

    const ref = `SIZTRF-${Date.now()}`;
    const rem = (remarksSize || "").trim();

    const ok = await Swal.fire({
      icon: "question",
      title: "Confirm Size Transfer?",
      html: `<div style="text-align:left;font-size:13px">
        <div><b>Art:</b> ${art.artNo} - ${art.artName}</div>
        <div><b>Shade:</b> ${sizeShadeName}</div>
        <div><b>From Size:</b> ${fromSizeName} (OUT: ${qty})</div>
        <div><b>To Size:</b> ${toSizeName} (IN: ${qty})</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!ok.isConfirmed) return;

    try {
      setLoading(true);

      // ✅ Single backend call (your new backend)
      await api.post("/size-stock-transfers", {
        adjDate: asOnSize,
        artSerial: art.serialNumber,
        artGroup: art.artGroup,
        artNo: art.artNo,
        artName: art.artName,

        shadeCode: sizeShadeCode,
        shadeName: sizeShadeName,

        fromSizeSerial,
        fromSizeName,
        toSizeSerial,
        toSizeName,

        qty: qty,
        ref,
        remarks: rem,
      });

      Swal.fire("Saved", "Size transfer saved successfully.", "success");

      setSizeQty("");
      setRemarksSize("");

      await checkSizeStocks(); // refresh
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Save failed. Check backend API /size-stock-transfers.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ======================= MATERIAL TAB (same working logic) ======================= */
  const [asOnMat, setAsOnMat] = useState(todayStr());
  const [mShade, setMShade] = useState("");

  const [g1, setG1] = useState("");
  const [i1, setI1] = useState("");
  const [mq1, setMq1] = useState("");

  const [g2, setG2] = useState("");
  const [i2, setI2] = useState("");
  const [mq2, setMq2] = useState("");

  const [g3, setG3] = useState("");
  const [i3, setI3] = useState("");
  const [mRem, setMRem] = useState("");

  const mTotal = (toNum(mq1) > 0 ? toNum(mq1) : 0) + (toNum(mq2) > 0 ? toNum(mq2) : 0);

  const [mb1, setMb1] = useState<number | null>(null);
  const [mb2, setMb2] = useState<number | null>(null);
  const [mb3, setMb3] = useState<number | null>(null);

  const clearMatStocks = () => {
    setMb1(null);
    setMb2(null);
    setMb3(null);
  };

  useEffect(() => {
    clearMatStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOnMat, mShade]);

  const calcOneMaterialBalance = async (groupId: number, itemId: number) => {
    // base from /stock-report
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

    // add adjustments
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

  const checkMaterialStocks = async () => {
    try {
      setLoading(true);
      const G1 = toNum(g1),
        I1 = toNum(i1);
      const G2 = toNum(g2),
        I2 = toNum(i2);
      const G3 = toNum(g3),
        I3 = toNum(i3);

      setMb1(G1 && I1 ? await calcOneMaterialBalance(G1, I1) : null);
      setMb2(G2 && I2 ? await calcOneMaterialBalance(G2, I2) : null);
      setMb3(G3 && I3 ? await calcOneMaterialBalance(G3, I3) : null);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load material stock.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab !== "MATERIAL") return;
      if ((!g1 || !i1) && (!g2 || !i2) && (!g3 || !i3)) return;
      checkMaterialStocks();
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, g1, i1, g2, i2, g3, i3, mShade, asOnMat]);

  const saveMaterialTransfer = async () => {
    const G1 = toNum(g1),
      I1 = toNum(i1);
    const G2 = toNum(g2),
      I2 = toNum(i2);
    const G3 = toNum(g3),
      I3 = toNum(i3);

    if (!G1 || !I1 || !G2 || !I2 || !G3 || !I3)
      return Swal.fire("Warning", "Select all groups & items.", "warning");
    if (mTotal <= 0) return Swal.fire("Warning", "Enter Qty (>0).", "warning");

    await checkMaterialStocks();
    if (mb1 !== null && toNum(mq1) > mb1) return Swal.fire("Warning", `Item-1 balance is ${mb1}`, "warning");
    if (mb2 !== null && toNum(mq2) > mb2) return Swal.fire("Warning", `Item-2 balance is ${mb2}`, "warning");

    const ref = `MATTRF-${Date.now()}`;
    const rem = (mRem || "").trim();

    const ok = await Swal.fire({
      icon: "question",
      title: "Confirm?",
      html: `<div style="text-align:left;font-size:13px">
        <div>OUT1: ${toNum(mq1) || 0}</div>
        <div>OUT2: ${toNum(mq2) || 0}</div>
        <div>IN: ${mTotal}</div>
        <div>Shade: ${mShade || "-"}</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!ok.isConfirmed) return;

    try {
      setLoading(true);

      const reqs: Promise<any>[] = [];

      if (toNum(mq1) > 0) {
        reqs.push(
          api.post("/material-stock-adjustments", {
            adjDate: asOnMat,
            materialGroupId: G1,
            materialId: I1,
            shadeName: mShade.trim() || null,
            qtyDelta: -toNum(mq1),
            remarks: `[${ref}] OUT -> ${I3}. ${rem}`.trim(),
          })
        );
      }

      if (toNum(mq2) > 0) {
        reqs.push(
          api.post("/material-stock-adjustments", {
            adjDate: asOnMat,
            materialGroupId: G2,
            materialId: I2,
            shadeName: mShade.trim() || null,
            qtyDelta: -toNum(mq2),
            remarks: `[${ref}] OUT -> ${I3}. ${rem}`.trim(),
          })
        );
      }

      reqs.push(
        api.post("/material-stock-adjustments", {
          adjDate: asOnMat,
          materialGroupId: G3,
          materialId: I3,
          shadeName: mShade.trim() || null,
          qtyDelta: mTotal,
          remarks: `[${ref}] IN. ${rem}`.trim(),
        })
      );

      await Promise.all(reqs);

      Swal.fire("Saved", "Material transfer saved.", "success");

      setMq1("");
      setMq2("");
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
            <h2 className="text-xl font-semibold">2 Source → 1 Target (Stock show + adjust)</h2>

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
                  tab === "SIZE" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
                }`}
                onClick={() => setTab("SIZE")}
              >
                Size
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    value={shadeCode}
                    onChange={(e) => setShadeCode(e.target.value)}
                  >
                    <option value="">--Select--</option>
                    {shades.map((s) => (
                      <option key={s.shadeCode} value={s.shadeCode}>
                        {s.shadeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">Size</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={sizeSerial}
                    onChange={(e) => setSizeSerial(e.target.value)}
                  >
                    <option value="">--Select--</option>
                    {sizes.map((s) => (
                      <option key={s.serialNo} value={s.serialNo}>
                        {s.sizeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">FROM Art 1</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    list="artList"
                    value={fromArt1}
                    onChange={(e) => setFromArt1(e.target.value)}
                    placeholder="Select Art No"
                  />
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{artStockText(stk1)}</b>
                  </div>
                  <div className="text-sm font-semibold mt-3 mb-1">Qty OUT</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={qty1}
                    onChange={(e) => setQty1(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">FROM Art 2</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    list="artList"
                    value={fromArt2}
                    onChange={(e) => setFromArt2(e.target.value)}
                    placeholder="Select Art No"
                  />
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{artStockText(stk2)}</b>
                  </div>
                  <div className="text-sm font-semibold mt-3 mb-1">Qty OUT</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={qty2}
                    onChange={(e) => setQty2(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">TO Art</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    list="artList"
                    value={toArt}
                    onChange={(e) => setToArt(e.target.value)}
                    placeholder="Select Art No"
                  />
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{artStockText(stk3)}</b>
                  </div>
                  <div className="mt-3 text-sm">
                    Total IN = <b>{totalOut}</b>
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

          {/* ======================= SIZE TAB ======================= */}
          {tab === "SIZE" ? (
            <div className="border rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-sm font-semibold mb-1">As On Date</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    type="date"
                    value={asOnSize}
                    onChange={(e) => setAsOnSize(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold mb-1">Art</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    list="artList"
                    value={sizeArtNo}
                    onChange={(e) => setSizeArtNo(e.target.value)}
                    placeholder="Select Art No"
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold mb-1">Shade</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={sizeShadeCode}
                    onChange={(e) => setSizeShadeCode(e.target.value)}
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
                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">FROM Size</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={fromSizeSerial}
                    onChange={(e) => setFromSizeSerial(e.target.value)}
                  >
                    <option value="">--Select--</option>
                    {sizes.map((s) => (
                      <option key={s.serialNo} value={s.serialNo}>
                        {s.sizeName}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{artStockText(stkFromSize)}</b>
                  </div>
                </div>

                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">TO Size</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={toSizeSerial}
                    onChange={(e) => setToSizeSerial(e.target.value)}
                  >
                    <option value="">--Select--</option>
                    {sizes.map((s) => (
                      <option key={s.serialNo} value={s.serialNo}>
                        {s.sizeName}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{artStockText(stkToSize)}</b>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div>
                  <div className="text-sm font-semibold mb-1">Qty (Pcs)</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={sizeQty}
                    onChange={(e) => setSizeQty(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <div className="text-sm font-semibold mb-1">Remarks</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={remarksSize}
                    onChange={(e) => setRemarksSize(e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  disabled={loading}
                  onClick={checkSizeStocks}
                  className="px-4 py-2 rounded bg-gray-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "..." : "Check Stock"}
                </button>
                <button
                  disabled={loading}
                  onClick={saveSizeTransfer}
                  className="px-5 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save Size Transfer"}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">FROM Item 1</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={g1}
                    onChange={(e) => {
                      setG1(e.target.value);
                      setI1("");
                      setMb1(null);
                    }}
                  >
                    <option value="">--Group--</option>
                    {matGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.materialGroup}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-3 py-2 w-full mt-2"
                    value={i1}
                    onChange={(e) => {
                      setI1(e.target.value);
                      setMb1(null);
                    }}
                    disabled={!g1}
                  >
                    <option value="">--Item--</option>
                    {(matsByGroup[toNum(g1)] || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.materialName}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{mb1 === null ? "-" : mb1.toFixed(2)}</b>
                  </div>
                  <div className="text-sm font-semibold mt-3 mb-1">Qty OUT</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={mq1}
                    onChange={(e) => setMq1(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">FROM Item 2</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={g2}
                    onChange={(e) => {
                      setG2(e.target.value);
                      setI2("");
                      setMb2(null);
                    }}
                  >
                    <option value="">--Group--</option>
                    {matGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.materialGroup}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-3 py-2 w-full mt-2"
                    value={i2}
                    onChange={(e) => {
                      setI2(e.target.value);
                      setMb2(null);
                    }}
                    disabled={!g2}
                  >
                    <option value="">--Item--</option>
                    {(matsByGroup[toNum(g2)] || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.materialName}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{mb2 === null ? "-" : mb2.toFixed(2)}</b>
                  </div>
                  <div className="text-sm font-semibold mt-3 mb-1">Qty OUT</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={mq2}
                    onChange={(e) => setMq2(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="border rounded p-3">
                  <div className="text-sm font-semibold mb-1">TO Item</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={g3}
                    onChange={(e) => {
                      setG3(e.target.value);
                      setI3("");
                      setMb3(null);
                    }}
                  >
                    <option value="">--Group--</option>
                    {matGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.materialGroup}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border rounded px-3 py-2 w-full mt-2"
                    value={i3}
                    onChange={(e) => {
                      setI3(e.target.value);
                      setMb3(null);
                    }}
                    disabled={!g3}
                  >
                    <option value="">--Item--</option>
                    {(matsByGroup[toNum(g3)] || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.materialName}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-600 mt-2">
                    Stock: <b>{mb3 === null ? "-" : mb3.toFixed(2)}</b>
                  </div>
                  <div className="mt-3 text-sm">
                    Total IN = <b>{mTotal}</b>
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

export default StockTransferAdjust;