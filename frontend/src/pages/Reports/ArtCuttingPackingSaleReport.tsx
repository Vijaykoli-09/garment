import React, { useCallback, useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

type Art = { serialNumber: string; artGroup: string; artName: string; artNo: string };
type Shade = { shadeCode: string; shadeName: string; colorFamily?: string };
type Size = { serialNo: string; sizeName: string };

type ReportRow = {
  key: string;
  artGroup: string;
  artNo: string;
  artName: string;
  shade: string;
  size: string;
  opening: number;
  artCreationOpening: number;
  stockAdjustment: number;
  cutting: number;
  saleOrderPending: number;
  sale: number;
  balance: number;
  pcsPerBox: number;
  rate: number;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const n = (v: any): number => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const str = (v: any) => String(v ?? "").trim();
const up = (v: any) => str(v).toUpperCase();
const dateOf = (doc: any) => str(doc?.date ?? doc?.dated ?? doc?.createdDate ?? doc?.entryDate).slice(0, 10);
const sizeSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
  <div className="flex items-center justify-between gap-2 px-2 py-2">
    <span className="text-sm font-semibold text-gray-700">{title}</span>{right}
  </div>
);
const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <div className="px-2 pb-2"><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded border px-2 py-1 text-sm" /></div>
);

const ArtCuttingPackingSaleReport: React.FC = () => {
  const [asOn, setAsOn] = useState(today());
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);
  const [arts, setArts] = useState<Art[]>([]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [selectedArtNos, setSelectedArtNos] = useState<Set<string>>(new Set());
  const [selectedShades, setSelectedShades] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState({ artNo: "", shade: "", size: "" });
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [columns, setColumns] = useState<Set<string>>(new Set(["box", "pcs", "rate", "amount"]));

  const loadMasters = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get<any[]>("/arts"), api.get<any[]>("/shade/list"), api.get<any[]>("/sizes")
      ]);
      const dataAt = (i: number): any[] => {
        const result = results[i];
        if (result.status !== "fulfilled") return [];
        const data = result.value.data;
        return Array.isArray(data) ? data : [];
      };
      setArts(dataAt(0).map((x: any) => ({ serialNumber: str(x.serialNumber ?? x.serialNo ?? x.id), artGroup: str(x.artGroupName ?? x.artGroup), artName: str(x.artName), artNo: str(x.artNo) })).filter((x: Art) => x.artNo || x.artName));
      setShades(dataAt(1).map((x: any) => ({ shadeCode: str(x.shadeCode ?? x.code), shadeName: str(x.shadeName ?? x.name), colorFamily: str(x.colorFamily) })).filter((x: Shade) => x.shadeName || x.shadeCode));
      setSizes(dataAt(2).map((x: any) => ({ serialNo: str(x.serialNo ?? x.id), sizeName: str(x.sizeName ?? x.name) })).filter((x: Size) => x.sizeName));
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Could not load Art Stock master data.", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadMasters(); }, [loadMasters]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, current: Set<string>, key: string) => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };
  const toggleAll = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, list: string[], checked: boolean) => setter(checked ? new Set(list) : new Set());

  const artNoOptions = useMemo(() => arts.filter(a => `${a.artNo} ${a.artName}`.toLowerCase().includes(search.artNo.toLowerCase())), [arts, search.artNo]);
  const shadeOptions = useMemo(() => shades.filter(s => `${s.shadeName} ${s.shadeCode} ${s.colorFamily ?? ""}`.toLowerCase().includes(search.shade.toLowerCase())), [shades, search.shade]);
  const sizeOptions = useMemo(() => sizes.filter(s => s.sizeName.toLowerCase().includes(search.size.toLowerCase())).sort((a,b) => sizeSort(a.sizeName,b.sizeName)), [sizes, search.size]);

  const handleShow = async () => {
    setLoading(true);
    try {
      // Only Art No is an art-level filter. Group and Art Name filters are intentionally removed.
      const selectedArtNoKeys = new Set(Array.from(selectedArtNos).map(up));
      const artList = arts.filter(a => !selectedArtNoKeys.size || selectedArtNoKeys.has(up(a.artNo)));
      const artMap = new Map<string, Art>();
      artList.forEach(a => { if (a.artNo) artMap.set(up(a.artNo), a); });
      const artDetails = await Promise.all(artList.map(a => api.get<any>(`/arts/${encodeURIComponent(a.serialNumber)}`).then(r => r.data).catch(() => null)));
      const agg = new Map<string, ReportRow>();
      // Only display sizes explicitly configured for each Art No + Shade in Art Creation.
      const artDefinedSizeKeys = new Set<string>();
      const getRow = (artNo: string, shade: string, size: string, extra?: any) => {
        const a = artMap.get(up(artNo));
        const key = `${up(artNo)}|${up(shade)}|${up(size)}`;
        let row = agg.get(key);
        if (!row) {
          row = { key, artGroup: str(extra?.artGroup ?? extra?.artGroupName ?? a?.artGroup), artNo: str(artNo), artName: str(extra?.artName ?? extra?.itemName ?? a?.artName), shade: str(shade), size: str(size), opening: 0, artCreationOpening: 0, stockAdjustment: 0, cutting: 0, saleOrderPending: 0, sale: 0, balance: 0,
            pcsPerBox: n(extra?.pcsPerBox ?? extra?.perBox ?? extra?.pcs), rate: n(extra?.rate ?? extra?.saleRate ?? extra?.styleRate) };
          agg.set(key, row);
        }
        if (!row.artName && a?.artName) row.artName = a.artName;
        if (!row.artGroup && a?.artGroup) row.artGroup = a.artGroup;
        return row;
      };
      const inDate = (doc: any) => { const d = dateOf(doc); return !d || !asOn || d <= asOn; };

      // Opening quantities from Art Creation (same source as Art Stock Report).
      for (const detail of artDetails) {
        if (!detail?.artNo) continue;
        const artNo = str(detail.artNo);
        const shadeList = Array.isArray(detail.shades) && detail.shades.length ? detail.shades : [{ shadeName: "" }];
        const sizeList = Array.isArray(detail.sizeDetails) && detail.sizeDetails.length ? detail.sizeDetails : (Array.isArray(detail.sizes) ? detail.sizes : []);
        for (const sz of sizeList) {
          const size = str(sz.sizeName ?? sz.size);
          if (!size) continue;
          const box = n(sz.box);
          const pcsPerBox = n(sz.pcs);
          const pcs = box * pcsPerBox;
          const rate = n(sz.rate ?? sz.saleRate ?? sz.styleRate ?? detail.saleRate ?? detail.styleRate);
          for (const sh of shadeList) {
            const shadeName = str(sh.shadeName ?? sh.name);
            const row = getRow(artNo, shadeName, size, detail);
            artDefinedSizeKeys.add(`${up(artNo)}|${up(shadeName)}|${up(size)}`);
            row.opening += pcs;
            row.artCreationOpening += pcs;
            if (pcsPerBox > 0) row.pcsPerBox = pcsPerBox;
            if (rate > 0) row.rate = rate;
          }
        }
      }

      const [cutRes, orderRes, dispatchRes, returnRes, adjustmentRes] = await Promise.all([
        api.get<any[]>("/cutting-entries"),
        // Use the same authoritative pending calculation as Sale Order Pendency.
        // Fetch from an early date through the selected As On date.
        api.get<any[]>("/sale-orders/pendency", {
          params: { fromDate: "2000-01-01", toDate: asOn },
        }).catch((error) => {
          console.error("Sale order pendency API error:", error?.response?.data || error?.message);
          return { data: [] as any[] };
        }),
        api.get<any[]>("/dispatch-challan"),
        api.get<any[]>("/dispatch-return-challan").catch(() => ({ data: [] as any[] })),
        api.get<any[]>("/art-stock-adjustments", { params: { toDate: asOn, limit: 100000 } }).catch(() => ({ data: [] as any[] }))
      ]);
      const cutDocs = Array.isArray(cutRes.data) ? cutRes.data : [];
      for (const doc of cutDocs) {
        if (!inDate(doc)) continue;
        const lotRows = Array.isArray(doc.lotRows) ? doc.lotRows : [];
        for (const lot of lotRows) {
          const artNo = str(lot.artNo ?? lot.artNumber);
          if (!artNo) continue;
          const pcs = n(lot.pcs ?? lot.totalPcs ?? lot.quantity);
          // Cutting lot row is the reliable art-level quantity; distribute by size rows only when present.
          const lotSerial = Number(lot.sno ?? lot.serialNo ?? lot.lotSno ?? 0);
          const related = (Array.isArray(doc.sizeRows) ? doc.sizeRows : []).filter((sr: any) => Number(sr.lotSno ?? sr.lotSnoRef ?? sr.sno) === lotSerial);
          if (related.length) {
            for (const sr of related) {
              const size = str(sr.size ?? sr.sizeName);
              if (!size) continue;
              getRow(artNo, str(lot.shade ?? lot.shadeName), size, { itemName: lot.itemName ?? lot.artName, artGroup: lot.artGroupName ?? lot.artGroup }).cutting += n(sr.totalPcs ?? sr.pcs) || n(sr.box ?? sr.boxCount) * n(sr.pcsPerBox ?? sr.perBox);
            }
          } else {
            getRow(artNo, str(lot.shade ?? lot.shadeName), "All Sizes", { itemName: lot.itemName ?? lot.artName, artGroup: lot.artGroupName ?? lot.artGroup }).cutting += pcs;
          }
        }
      }

      // Take pending directly from /sale-orders/pendency, the same API used by
      // the Sale Order Pendency screen. Do not recalculate it from raw order rows:
      // receipt/dispatch/opening rules are already applied by that endpoint.
      const pendingRows: any[] = Array.isArray(orderRes.data) ? orderRes.data : [];
      for (const pendingRow of pendingRows) {
        const artNo = str(pendingRow.artNo ?? pendingRow.artNumber);
        const shade = str(pendingRow.shade ?? pendingRow.shadeName);
        const size = str(pendingRow.size ?? pendingRow.sizeName);
        if (!artNo || !size || size === "All Sizes") continue;
        const pendingPcs = n(pendingRow.pending);
        if (!pendingPcs) continue;
        const row = getRow(artNo, shade, size, {
          artName: pendingRow.artName ?? pendingRow.itemName,
          artGroup: pendingRow.artGroupName ?? pendingRow.artGroup,
          pcsPerBox: pendingRow.pcsPerBox ?? pendingRow.perBox,
          rate: pendingRow.rate ?? pendingRow.saleRate,
        });
        row.saleOrderPending += pendingPcs;
      }

      // Dispatch challan is sale/dispatch out; returns are added back to available balance.
      for (const doc of (Array.isArray(dispatchRes.data) ? dispatchRes.data : [])) {
        if (!inDate(doc)) continue;
        for (const r of (Array.isArray(doc.rows) ? doc.rows : [])) {
          const artNo = str(r.artNo); const size = str(r.size ?? r.sizeName) || "All Sizes";
          if (!artNo) continue;
          getRow(artNo, str(r.shade ?? r.shadeName), size).sale += n(r.pcs) || n(r.box) * n(r.pcsPerBox ?? r.perBox);
        }
      }
      for (const doc of (Array.isArray(returnRes.data) ? returnRes.data : [])) {
        if (!inDate(doc)) continue;
        for (const r of (Array.isArray(doc.rows) ? doc.rows : [])) {
          const artNo = str(r.artNo); const size = str(r.size ?? r.sizeName) || "All Sizes";
          if (!artNo) continue;
          getRow(artNo, str(r.shade ?? r.shadeName), size).sale -= n(r.pcs) || n(r.box) * n(r.pcsPerBox ?? r.perBox);
        }
      }

      // Apply stock adjustments to the Art quantity.
      const adjustmentList: any[] = Array.isArray(adjustmentRes.data) ? adjustmentRes.data : [];
      for (const adj of adjustmentList) {
        const artNo = str(adj.art_no ?? adj.artNo);
        const shade = str(adj.shade_name ?? adj.shadeName);
        const size = str(adj.size_name ?? adj.sizeName);
        if (!artNo || !size) continue;
        if (!inDate(adj)) continue;
        const delta = n(adj.pcs_delta ?? adj.pcsDelta);
        const row = getRow(artNo, shade, size, {
          artName: adj.art_name ?? adj.artName,
          artGroup: adj.art_group ?? adj.artGroup,
          pcsPerBox: adj.per_box ?? adj.perBox,
          rate: adj.rate
        });
        row.stockAdjustment += delta;
        const perBox = n(adj.per_box ?? adj.perBox);
        const rate = n(adj.rate);
        if (perBox > 0) row.pcsPerBox = perBox;
        if (rate > 0) row.rate = rate;
      }

      // Art quantity represents current Art stock, including dispatches, returns and adjustments.
      // Use an Array to avoid ES5/downlevel iteration issues with MapIterator in TS builds.
      const aggRows = Array.from(agg.values());
      for (const row of aggRows) {
        row.opening = row.artCreationOpening - row.sale + row.stockAdjustment;
      }

      const shadeNameToCode = new Map(shades.map(s => [up(s.shadeName), s.shadeCode]));
      const sizeNameToSerial = new Map(sizes.map(s => [up(s.sizeName), s.serialNo]));
      const result = Array.from(agg.values()).filter(r => {
        // Critical: movement APIs can contain every Art No, even when the user selected only one.
        // Apply the Art No filter to the FINAL aggregated result, not only the Art Creation master list.
        if (selectedArtNoKeys.size && !selectedArtNoKeys.has(up(r.artNo))) return false;
        if (selectedShades.size && !selectedShades.has(shadeNameToCode.get(up(r.shade)) ?? "")) return false;
        if (selectedSizes.size && !selectedSizes.has(sizeNameToSerial.get(up(r.size)) ?? "")) return false;
        r.balance = r.saleOrderPending - r.cutting - r.opening;
        return true;
      }).filter(r => r.size && r.size !== "All Sizes" && artDefinedSizeKeys.has(`${up(r.artNo)}|${up(r.shade)}|${up(r.size)}`))
        .sort((a,b) => a.artNo.localeCompare(b.artNo, undefined, {numeric:true}) || a.shade.localeCompare(b.shade) || sizeSort(a.size,b.size));
      setRows(result);
      setShown(true);
      if (!result.length) Swal.fire("No Records", "No matching Sale Order Pending + Cutting + Art data found for these filters.", "info");
    } catch (e: any) {
      console.error("Sale Order Pending + Cutting + Art report error", e);
      Swal.fire("Report Failed", e?.response?.data?.message || "Unable to generate report. Check API endpoints and try again.", "error");
    } finally { setLoading(false); }
  };

  const reload = async () => { setShown(false); setRows([]); await loadMasters(); };
  const pivotGroups = useMemo(() => {
    const map = new Map<string, { key: string; artGroup: string; artNo: string; artName: string; shade: string; bySize: Record<string, ReportRow> }>();
    rows.forEach((r) => {
      const key = `${up(r.artNo)}|${up(r.shade)}`;
      let g = map.get(key);
      if (!g) {
        g = { key, artGroup: r.artGroup, artNo: r.artNo, artName: r.artName, shade: r.shade, bySize: {} };
        map.set(key, g);
      }
      g.bySize[up(r.size)] = r;
    });
    const allowed = selectedSizes.size ? sizes.filter(s => selectedSizes.has(s.serialNo)).map(s => s.sizeName) : [];
    const available = Array.from(new Set(rows.map(r => r.size).filter(Boolean)));
    const sizeNames = (allowed.length ? allowed : available).sort(sizeSort);
    return { groups: Array.from(map.values()), sizeNames };
  }, [rows, selectedSizes, sizes]);

  const activityKinds = [
    { key: "saleOrderPending", label: "Sale Order Pending" },
    { key: "cutting", label: "Cutting (-)" },
    { key: "opening", label: "Art (-)" },
    { key: "balance", label: "Balance" },
  ];
  const metricKinds = [
    { key: "box", label: "Box" },
    { key: "pcs", label: "Pcs" },
    { key: "rate", label: "Rate" },
    { key: "amount", label: "Amount" },
  ].filter(metric => columns.has(metric.key));
  const rowKinds = activityKinds.flatMap(activity => metricKinds.map(metric => ({
    key: `${activity.key}:${metric.key}`,
    activity: activity.key,
    activityLabel: activity.label,
    metric: metric.key,
    label: metric.label,
  })));

  const valueFor = (g: typeof pivotGroups.groups[number], size: string, key: string) => {
    const row = g.bySize[up(size)];
    if (!row) return null;
    const [activity, metric] = key.split(":");
    const pcs = n(row[activity as "opening" | "cutting" | "saleOrderPending" | "balance"]);
    if (metric === "pcs") return pcs;
    if (metric === "box") return row.pcsPerBox > 0 ? pcs / row.pcsPerBox : 0;
    if (metric === "rate") return row.rate;
    if (metric === "amount") return pcs * row.rate;
    return pcs;
  };
  const formatValue = (value: number | null) => value === null ? "" : value.toFixed(2);

  const printReport = () => {
    if (!rows.length) { Swal.fire("No Data", "Pehle Show Report karein.", "info"); return; }
    const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
    const headers = ["S. No.", "Art No", "Art Name", "Shade", "Type", "Row", ...pivotGroups.sizeNames, "Total Box", "Total Pcs", "Total amount"];
    const summaryCells = (g: typeof pivotGroups.groups[number], kind: typeof rowKinds[number]) => {
      const [activity, metric] = kind.key.split(":");
      const pcsTotal = pivotGroups.sizeNames.reduce((sum, size) => sum + n(valueFor(g, size, `${activity}:pcs`)), 0);
      const boxTotal = pivotGroups.sizeNames.reduce((sum, size) => sum + n(valueFor(g, size, `${activity}:box`)), 0);
      const amountTotal = pivotGroups.sizeNames.reduce((sum, size) => sum + n(valueFor(g, size, `${activity}:amount`)), 0);
      return `<td>${metric === "box" ? boxTotal.toFixed(2) : ""}</td><td>${metric === "pcs" ? pcsTotal.toFixed(2) : ""}</td><td>${metric === "amount" ? amountTotal.toFixed(2) : ""}</td>`;
    };
    const body = pivotGroups.groups.map((g, idx) => rowKinds.map((kind, ri) => {
      const firstOfActivity = ri === 0 || rowKinds[ri - 1].activity !== kind.activity;
      const activityCount = rowKinds.filter(k => k.activity === kind.activity).length;
      return `<tr>${ri === 0 ? `<td rowspan="${rowKinds.length}">${idx + 1}</td><td rowspan="${rowKinds.length}">${esc(g.artNo)}</td><td rowspan="${rowKinds.length}">${esc(g.artName)}</td><td rowspan="${rowKinds.length}">${esc(g.shade)}</td>` : ""}${firstOfActivity ? `<td rowspan="${activityCount}">${esc(kind.activityLabel)}</td>` : ""}<td>${esc(kind.label)}</td>${pivotGroups.sizeNames.map(size => `<td>${formatValue(valueFor(g,size,kind.key))}</td>`).join("")}${summaryCells(g, kind)}</tr>`;
    }).join("")).join("");
    const totalsByKind = rowKinds.map(kind => {
      const [activity, metric] = kind.key.split(":");
      const sumFor = (size: string, m: string) => pivotGroups.groups.reduce((sum,g)=>sum+n(valueFor(g,size,`${activity}:${m}`)),0);
      const box = pivotGroups.sizeNames.reduce((sum,size)=>sum+sumFor(size,"box"),0);
      const pcs = pivotGroups.sizeNames.reduce((sum,size)=>sum+sumFor(size,"pcs"),0);
      const amount = pivotGroups.sizeNames.reduce((sum,size)=>sum+sumFor(size,"amount"),0);
      return `<tr class="total"><td colspan="6">${esc(kind.activityLabel)} — ${esc(kind.label)} Total</td>${pivotGroups.sizeNames.map(size=>`<td>${sumFor(size,metric).toFixed(2)}</td>`).join("")}<td>${metric === "box" ? box.toFixed(2) : ""}</td><td>${metric === "pcs" ? pcs.toFixed(2) : ""}</td><td>${metric === "amount" ? amount.toFixed(2) : ""}</td></tr>`;
    }).join("");
    const w = window.open("", "_blank", "width=1500,height=900");
    if (!w) return;
    const selectedArtsText = selectedArtNos.size ? artNoOptions.filter(a => selectedArtNos.has(a.artNo)).map(a => `${a.artNo}${a.artName ? ` - ${a.artName}` : ""}`).join(", ") : "All Arts";
    const selectedShadesText = selectedShades.size ? shadeOptions.filter(s => selectedShades.has(s.shadeCode || s.shadeName)).map(s => s.shadeName).join(", ") : "All Shades";
    const selectedSizesText = selectedSizes.size ? sizeOptions.filter(s => selectedSizes.has(s.serialNo)).map(s => s.sizeName).join(", ") : "All Sizes";
    w.document.write(`<html><head><title>SALE ORDER PENDING + CUTTING + ART Report</title><style>@page{size:landscape;margin:8mm}body{font:11px Arial}table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:5px;text-align:center}th{background:#eee}.total{font-weight:bold;background:#dff2fc}h2{margin-bottom:4px}.filters{padding:7px;border:1px solid #888;background:#f4f7fb;margin:8px 0}</style></head><body><h2>SALE ORDER PENDING + CUTTING + ART Report</h2><p>As On: ${esc(asOn)}</p><div class="filters"><b>Selected Filters:</b> Art No: ${esc(selectedArtsText)} &nbsp; | &nbsp; Shade: ${esc(selectedShadesText)} &nbsp; | &nbsp; Size: ${esc(selectedSizesText)}</div><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body}${totalsByKind}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const exportCsv = () => {
    const headers = ["S. No.","Art No","Art Name","Shade","Type","Row",...pivotGroups.sizeNames,"Total Box","Total Pcs","Total amount"];
    const selectedArtsText = selectedArtNos.size ? artNoOptions.filter(a => selectedArtNos.has(a.artNo)).map(a => `${a.artNo}${a.artName ? ` - ${a.artName}` : ""}`).join(", ") : "All Arts";
    const selectedShadesText = selectedShades.size ? shadeOptions.filter(s => selectedShades.has(s.shadeCode || s.shadeName)).map(s => s.shadeName).join(", ") : "All Shades";
    const selectedSizesText = selectedSizes.size ? sizeOptions.filter(s => selectedSizes.has(s.serialNo)).map(s => s.sizeName).join(", ") : "All Sizes";
    const matrix: any[][] = [
      ["SALE ORDER PENDING + CUTTING + ART Report", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["As On", asOn],
      ["Selected Art No", selectedArtsText],
      ["Selected Shade", selectedShadesText],
      ["Selected Size", selectedSizesText],
      [],
      headers
    ];
    pivotGroups.groups.forEach((g, idx) => rowKinds.forEach(kind => {
      const [activity, metric] = kind.key.split(":");
      const sumMetric = (m: string) => pivotGroups.sizeNames.reduce((sum,size)=>sum+n(valueFor(g,size,`${activity}:${m}`)),0);
      matrix.push([idx+1,g.artNo,g.artName,g.shade,kind.activityLabel,kind.label,
        ...pivotGroups.sizeNames.map(size=>formatValue(valueFor(g,size,kind.key))),
        metric === "box" ? sumMetric("box").toFixed(2) : "",
        metric === "pcs" ? sumMetric("pcs").toFixed(2) : "",
        metric === "amount" ? sumMetric("amount").toFixed(2) : ""
      ]);
    }));
    const csv = matrix.map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff",csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`sale-order-pending-cutting-art-${asOn}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const filterCard = (title: string, key: keyof typeof search, options: { label: string; value: string; hint?: string }[], selected: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (
    <div className="rounded border border-gray-300 bg-white min-w-0">
      <SectionHeader title={title} right={<label className="flex cursor-pointer items-center gap-1 text-xs"><input type="checkbox" checked={options.length > 0 && options.every(o => selected.has(o.value))} onChange={e => toggleAll(setter, options.map(o=>o.value), e.target.checked)} />All</label>} />
      <SearchBox value={search[key]} onChange={v => setSearch(s=>({...s,[key]:v}))} placeholder={`Search ${title.replace("Select ","").toLowerCase()}...`} />
      <div className="h-60 overflow-auto px-2 pb-2">
        {Array.from(new Map(options.map(o => [o.value, o])).values()).map((o, index) => <label key={`${title}-${o.value}-${index}`} title={o.hint ?? o.label} className="flex cursor-pointer items-center gap-2 py-1 text-sm"><input type="checkbox" checked={selected.has(o.value)} onChange={()=>toggle(setter,selected,o.value)} /><span className="truncate">{o.label}</span></label>)}
        {!options.length && <div className="py-2 text-xs text-gray-500">No records found.</div>}
      </div>
    </div>
  );

  return <Dashboard>
    <div className="min-h-full bg-gray-100 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow">
        <h2 className="text-xl font-bold text-gray-800">SALE ORDER PENDING + CUTTING + ART Report</h2>
        <div className="flex flex-wrap items-center gap-2"><label className="text-sm font-medium">As On:</label><input type="date" value={asOn} onChange={e=>setAsOn(e.target.value)} className="rounded border px-2 py-1 text-sm" /><button onClick={reload} disabled={loading} className="rounded border bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200">Reload</button></div>
      </div>
      {!shown ? <>
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {filterCard("Select Art No","artNo",artNoOptions.map(x=>({label:x.artNo,value:x.artNo,hint:`${x.artNo} - ${x.artName}`})),selectedArtNos,setSelectedArtNos)}
          {filterCard("Select Shade","shade",shadeOptions.map(x=>({label:`${x.shadeName}${x.shadeCode ? ` (${x.shadeCode})` : ""}`,value:x.shadeCode || x.shadeName,hint:x.colorFamily})),selectedShades,setSelectedShades)}
          {filterCard("Select Size","size",sizeOptions.map(x=>({label:x.sizeName,value:x.serialNo})),selectedSizes,setSelectedSizes)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Agar koi filter select nahi karte ya sab uncheck kar dete ho, report sabhi records show/print karega.</p>
          <button disabled={loading} onClick={handleShow} className="rounded bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "Loading..." : "Show Report"}</button>
        </div>
      </> : <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3 shadow">
          <div className="flex flex-wrap gap-3 text-sm">
            {(["box","pcs","rate","amount"] as const).map(c=><label key={c} className="flex cursor-pointer items-center gap-1"><input type="checkbox" checked={columns.has(c)} onChange={()=>setColumns(prev=>{const next=new Set(prev);next.has(c)?next.delete(c):next.add(c);return next;})}/>{{box:"Box",pcs:"Pcs",rate:"Rate",amount:"Amount"}[c]}</label>)}
          </div>
          <div className="flex gap-2"><button onClick={()=>setShown(false)} className="rounded border px-3 py-2 text-sm">Back to Filters</button><button onClick={exportCsv} className="rounded border px-3 py-2 text-sm">Export CSV</button><button onClick={printReport} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Print</button></div>
        </div>
        <div className="overflow-auto rounded-lg bg-white shadow" style={{ maxHeight: "calc(100vh - 230px)" }}>
          <div className="sticky top-0 z-30 border-b bg-white p-3">
            <h3 className="font-bold">SALE ORDER PENDING + CUTTING + ART Report (Size Wise)</h3>
            <p className="text-sm text-gray-600">As On: {asOn}</p>
            <div className="mt-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-gray-800">
              <span className="font-semibold">Selected:</span>{" "}
              <span>Art No: {selectedArtNos.size ? artNoOptions.filter(a=>selectedArtNos.has(a.artNo)).map(a=>`${a.artNo}${a.artName?` (${a.artName})`:""}`).join(", ") : "All Arts"}</span>
              {" | "}<span>Shade: {selectedShades.size ? shadeOptions.filter(s=>selectedShades.has(s.shadeCode || s.shadeName)).map(s=>s.shadeName).join(", ") : "All Shades"}</span>
              {" | "}<span>Size: {selectedSizes.size ? sizeOptions.filter(s=>selectedSizes.has(s.serialNo)).map(s=>s.sizeName).join(", ") : "All Sizes"}</span>
            </div>
          </div>
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-[64px] z-20 bg-gray-100"><tr>
              {["S. No.","Art No","Art Name","Shade","Type","Row",...pivotGroups.sizeNames,"Total Box","Total Pcs","Total amount"].map(h=><th key={h} className="whitespace-nowrap border border-slate-400 bg-gray-100 p-2 text-center">{h}</th>)}
            </tr></thead>
            <tbody>
              {pivotGroups.groups.map((g, idx)=><React.Fragment key={g.key}>
                {rowKinds.map((kind, ri)=>{
                  const [activity, metric] = kind.key.split(":");
                  const sumMetric = (m: string) => pivotGroups.sizeNames.reduce((sum,size)=>sum+n(valueFor(g,size,`${activity}:${m}`)),0);
                  const firstOfActivity = ri === 0 || rowKinds[ri - 1].activity !== kind.activity;
                  const activityCount = rowKinds.filter(k => k.activity === kind.activity).length;
                  return <tr key={`${g.key}-${kind.key}`} className={activity==="balance"?"bg-slate-50":"hover:bg-blue-50"}>
                    {ri===0&&<><td rowSpan={rowKinds.length} className="border border-slate-300 p-2 text-center">{idx+1}</td><td rowSpan={rowKinds.length} className="border border-slate-300 p-2 text-center">{g.artNo}</td><td rowSpan={rowKinds.length} className="border border-slate-300 p-2 text-center">{g.artName}</td><td rowSpan={rowKinds.length} className="border border-slate-300 p-2 text-center">{g.shade}</td></>}
                    {firstOfActivity&&<td rowSpan={activityCount} className="border border-slate-300 p-2 text-center font-semibold">{kind.activityLabel}</td>}
                    <td className="border border-slate-300 p-2 font-medium">{kind.label}</td>
                    {pivotGroups.sizeNames.map(size=><td key={size} className="border border-slate-300 p-2 text-right">{formatValue(valueFor(g,size,kind.key))}</td>)}
                    <td className="border border-slate-300 p-2 text-right">{metric==="box"?sumMetric("box").toFixed(2):""}</td>
                    <td className="border border-slate-300 p-2 text-right">{metric==="pcs"?sumMetric("pcs").toFixed(2):""}</td>
                    <td className="border border-slate-300 p-2 text-right font-semibold">{metric==="amount"?sumMetric("amount").toFixed(2):""}</td>
                  </tr>;
                })}
              </React.Fragment>)}
              {rows.length>0&&rowKinds.map(kind=>{const [activity,metric]=kind.key.split(":");const sumFor=(size:string,m:string)=>pivotGroups.groups.reduce((sum,g)=>sum+n(valueFor(g,size,`${activity}:${m}`)),0);return <tr key={`total-${kind.key}`} className="bg-sky-100 font-bold"><td colSpan={6} className="border border-slate-400 p-2">{kind.activityLabel} — {kind.label} Total</td>{pivotGroups.sizeNames.map(size=><td key={size} className="border border-slate-400 p-2 text-right">{sumFor(size,metric).toFixed(2)}</td>)}<td className="border border-slate-400 p-2 text-right">{metric==="box"?pivotGroups.sizeNames.reduce((sum,size)=>sum+sumFor(size,"box"),0).toFixed(2):""}</td><td className="border border-slate-400 p-2 text-right">{metric==="pcs"?pivotGroups.sizeNames.reduce((sum,size)=>sum+sumFor(size,"pcs"),0).toFixed(2):""}</td><td className="border border-slate-400 p-2 text-right">{metric==="amount"?pivotGroups.sizeNames.reduce((sum,size)=>sum+sumFor(size,"amount"),0).toFixed(2):""}</td></tr>})}
              {!rows.length&&<tr><td colSpan={pivotGroups.sizeNames.length+7} className="p-8 text-center text-gray-500">No report data. Go back and generate the report.</td></tr>}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  </Dashboard>;
};

export default ArtCuttingPackingSaleReport;
