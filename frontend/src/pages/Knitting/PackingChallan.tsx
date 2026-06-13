// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import Dashboard from "../Dashboard";
// import Swal from "sweetalert2";
// import api from "../../api/axiosInstance";

// /* =========================
//    Types
// ========================= */
// type ShadeOpt = { code: string; name: string };

// type LotRecord = {
//   lotNo: string;
//   artNo: string;
//   itemName: string;
//   artGroup?: string;
// };

// interface RowData {
//   id: number; // local key
//   cuttinglotNo: string;
//   artNo: string;
//   artGroup: string; // saved as artGroupName
//   workOnArt: string;

//   sizeRate: Record<string, string>;
//   sizeBox: Record<string, string>;
//   sizePerBox: Record<string, string>;
//   sizeIdByName: Record<string, number>;

//   shade: string; // shadeName
//   shadeCode?: string | null;

//   pcs: string; // auto
//   amount: string; // auto
// }

// /* =========================
//    Utils
// ========================= */
// const sanitizeNumber = (v: string) => {
//   const cleaned = v.replace(/[^\d.]/g, "");
//   const parts = cleaned.split(".");
//   if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
//   return cleaned;
// };
// const toNum = (v: any) => {
//   const n = parseFloat(v);
//   return Number.isFinite(n) ? n : 0;
// };
// const sizeSort = (a: string, b: string) => {
//   const known = [
//     "3XS",
//     "XXXS",
//     "2XS",
//     "XXS",
//     "XS",
//     "S",
//     "M",
//     "L",
//     "XL",
//     "XXL",
//     "2XL",
//     "3XL",
//     "4XL",
//     "5XL",
//   ];
//   const ai = known.indexOf(a.toUpperCase());
//   const bi = known.indexOf(b.toUpperCase());
//   if (ai !== -1 && bi !== -1) return ai - bi;
//   const an = Number(a);
//   const bn = Number(b);
//   if (!isNaN(an) && !isNaN(bn)) return an - bn;
//   if (!isNaN(an)) return -1;
//   if (!isNaN(bn)) return 1;
//   return a.localeCompare(b);
// };

// /* ========== Cutting Lot Modal ========== */
// const CuttingLotModal: React.FC<{
//   open: boolean;
//   lots: LotRecord[];
//   onClose: () => void;
//   onSelect: (lot: LotRecord) => void;
// }> = ({ open, lots, onClose, onSelect }) => {
//   const [q, setQ] = useState("");
//   useEffect(() => {
//     if (open) setQ("");
//   }, [open]);

//   const filtered = useMemo(() => {
//     const s = q.trim().toLowerCase();
//     if (!s) return lots;
//     return lots.filter(
//       (x) =>
//         x.lotNo.toLowerCase().includes(s) ||
//         (x.artNo || "").toLowerCase().includes(s) ||
//         (x.itemName || "").toLowerCase().includes(s)
//     );
//   }, [q, lots]);

//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center">
//       <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5 flex flex-col max-h-[85vh]">
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-lg font-bold">Select Cutting Lot</h3>
//           <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">
//             Close
//           </button>
//         </div>

//         <input
//           value={q}
//           onChange={(e) => setQ(e.target.value)}
//           placeholder="Search lot no / art no / item…"
//           className="border p-2 rounded w-full mb-3"
//         />

//         <div className="overflow-auto border rounded">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Lot No</th>
//                 <th className="border p-2">Art No</th>
//                 <th className="border p-2">Item</th>
//                 <th className="border p-2 text-center">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 ? (
//                 <tr>
//                   <td
//                     className="border p-3 text-center text-gray-500"
//                     colSpan={4}
//                   >
//                     No records
//                   </td>
//                 </tr>
//               ) : (
//                 filtered.map((x) => (
//                   <tr key={x.lotNo} className="hover:bg-gray-50">
//                     <td className="border p-2">{x.lotNo}</td>
//                     <td className="border p-2">{x.artNo}</td>
//                     <td className="border p-2">{x.itemName}</td>
//                     <td className="border p-2 text-center">
//                       <button
//                         onClick={() => onSelect(x)}
//                         className="px-3 py-1 bg-blue-600 text-white rounded"
//                       >
//                         Select
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// };

// /* ========== Shade Modal ========== */
// const ShadeModal: React.FC<{
//   open: boolean;
//   shades: ShadeOpt[];
//   onClose: () => void;
//   onSelect: (shade: ShadeOpt) => void;
// }> = ({ open, shades, onClose, onSelect }) => {
//   const [q, setQ] = useState("");
//   useEffect(() => {
//     if (open) setQ("");
//   }, [open]);

//   const filtered = useMemo(() => {
//     const s = q.trim().toLowerCase();
//     if (!s) return shades;
//     return shades.filter(
//       (sh) =>
//         (sh.name || "").toLowerCase().includes(s) ||
//         (sh.code || "").toLowerCase().includes(s)
//     );
//   }, [q, shades]);

//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center">
//       <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-5">
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-lg font-bold">Select Shade</h3>
//           <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">
//             Close
//           </button>
//         </div>

//         <input
//           value={q}
//           onChange={(e) => setQ(e.target.value)}
//           placeholder="Search shade name / code"
//           className="border p-2 rounded w-full mb-3"
//         />

//         <div className="overflow-auto max-h-[70vh] border">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Shade Code</th>
//                 <th className="border p-2">Shade Name</th>
//                 <th className="border p-2 text-center">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 ? (
//                 <tr>
//                   <td
//                     className="border p-3 text-center text-gray-500"
//                     colSpan={3}
//                   >
//                     No shades found
//                   </td>
//                 </tr>
//               ) : (
//                 filtered.map((sh) => (
//                   <tr
//                     key={`${sh.code}-${sh.name}`}
//                     className="hover:bg-gray-50"
//                   >
//                     <td className="border p-2">{sh.code}</td>
//                     <td className="border p-2">{sh.name}</td>
//                     <td className="border p-2 text-center">
//                       <button
//                         onClick={() => onSelect(sh)}
//                         className="px-3 py-1 bg-blue-600 text-white rounded"
//                       >
//                         Select
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// };

// /* =========================
//    Main Component
// ========================= */
// const PackingChallan: React.FC = () => {
//   const [date, setDate] = useState("");
//   const [partyId, setPartyId] = useState("");
//   const [parties, setParties] = useState<any[]>([]);
//   const [rows, setRows] = useState<RowData[]>([]);

//   // ✅ disable Save/Update while saving
//   const [isSaving, setIsSaving] = useState(false);

//   // defaults from previous packing challans (ArtNo+Size -> rate/perBox)
//   const [artDefaults, setArtDefaults] = useState<{
//     [artNo: string]: {
//       sizeRate: Record<string, string>;
//       sizePerBox: Record<string, string>;
//     };
//   }>({});

//   // View List modal
//   const [listOpen, setListOpen] = useState(false);
//   const [listData, setListData] = useState<any[]>([]);
//   const [listSearch, setListSearch] = useState("");

//   // Cutting Lot modal
//   const [lotModalOpen, setLotModalOpen] = useState(false);
//   const [lotModalForRowId, setLotModalForRowId] = useState<number | null>(null);
//   const [lots, setLots] = useState<LotRecord[]>([]);

//   // Shade modal
//   const [shadeModalOpen, setShadeModalOpen] = useState(false);
//   const [shadeModalForRowId, setShadeModalForRowId] = useState<number | null>(
//     null
//   );
//   const [shades, setShades] = useState<ShadeOpt[]>([]);

//   // editing marker (serialNo) — determines Save vs Update
//   const [editingSerial, setEditingSerial] = useState<string | null>(null);

//   const blankRow = (): RowData => ({
//     id: Date.now() + Math.floor(Math.random() * 1000),
//     cuttinglotNo: "",
//     artNo: "",
//     artGroup: "",
//     workOnArt: "",
//     sizeRate: {},
//     sizeBox: {},
//     sizePerBox: {},
//     sizeIdByName: {},
//     shade: "",
//     shadeCode: null,
//     pcs: "",
//     amount: "",
//   });

//   const addBlankRow = () => setRows((prev) => [...prev, blankRow()]);

//   // ⭐ Available cutting lots = all cutting lots - already used in any packing-challan
//   const fetchAvailableLots = useCallback(async () => {
//     try {
//       let usedLots = new Set<string>();

//       try {
//         const { data: challansData } = await api.get<any[]>("/packing-challans");
//         const challans = Array.isArray(challansData) ? challansData : [];
//         challans.forEach((ch) => {
//           const challanRows: any[] = Array.isArray(ch.rows) ? ch.rows : [];
//           challanRows.forEach((r: any) => {
//             const lotNo = String(
//               r.cuttingLotNo ||
//                 r.cutLotNo ||
//                 r.cutlotNo ||
//                 r.cuttinglotNo ||
//                 ""
//             ).trim();
//             if (lotNo) usedLots.add(lotNo);
//           });
//         });
//       } catch {
//         usedLots = new Set();
//       }

//       // try cutting-entries first (with art/item)
//       try {
//         const { data } = await api.get<any[]>("/cutting-entries");
//         const docs = Array.isArray(data) ? data : [];
//         const map = new Map<string, LotRecord>();

//         for (const d of docs) {
//           for (const r of d?.lotRows || []) {
//             const lotNo = String(
//               r.cutLotNo || r.cutlotNo || r.cuttingLotNo || ""
//             ).trim();
//             if (!lotNo) continue;
//             if (usedLots.has(lotNo)) continue;

//             if (!map.has(lotNo)) {
//               map.set(lotNo, {
//                 lotNo,
//                 artNo: String(r.artNo || ""),
//                 itemName: String(r.itemName || ""),
//                 artGroup: String(r.artGroupName || r.artGroup || r.group || ""),
//               });
//             }
//           }
//         }

//         if (map.size > 0) {
//           setLots(Array.from(map.values()));
//           return;
//         }
//       } catch {
//         // ignore
//       }

//       // fallback endpoint
//       try {
//         const { data } = await api.get<string[]>(
//           "/packing-challans/cutting-lots"
//         );
//         const list: string[] = Array.isArray(data)
//           ? data.filter(Boolean).map(String)
//           : [];
//         const filtered = list.filter((x) => !usedLots.has(String(x).trim()));
//         setLots(filtered.map((x) => ({ lotNo: x, artNo: "", itemName: "" })));
//       } catch {
//         setLots([]);
//       }
//     } catch {
//       setLots([]);
//     }
//   }, []);

//   // ✅ Reset page/form function (used by Save/Update success + Reset button + Exit)
//   const resetPage = useCallback(async () => {
//     setDate("");
//     setPartyId("");
//     setEditingSerial(null);
//     setRows([blankRow()]);
//     setListOpen(false);
//     setListSearch("");
//     await fetchAvailableLots();
//   }, [fetchAvailableLots]);

//   useEffect(() => {
//     if (rows.length === 0) setRows([blankRow()]);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get("/party/category/Packing");
//         setParties(res.data || []);
//       } catch {
//         setParties([]);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     fetchAvailableLots();
//   }, [fetchAvailableLots]);

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get<any[]>("/shade/list");
//         const list: ShadeOpt[] = (Array.isArray(res.data) ? res.data : []).map(
//           (x) => ({
//             code: String(x.shadeCode || "").trim().toUpperCase(),
//             name: String(x.shadeName || "").trim(),
//           })
//         );
//         setShades(list);
//       } catch {
//         setShades([]);
//       }
//     })();
//   }, []);

//   // ⭐ Load defaults from existing packing challans
//   useEffect(() => {
//     (async () => {
//       try {
//         const { data } = await api.get<any[]>("/packing-challans");
//         const challans = Array.isArray(data) ? data : [];

//         const map: {
//           [artNo: string]: {
//             sizeRate: Record<string, string>;
//             sizePerBox: Record<string, string>;
//           };
//         } = {};

//         for (const ch of challans) {
//           const challanRows: any[] = Array.isArray(ch.rows) ? ch.rows : [];
//           for (const r of challanRows) {
//             const artNo = String(r.artNo || "").trim();
//             if (!artNo) continue;

//             const details: any[] = Array.isArray(r.sizeDetails)
//               ? r.sizeDetails
//               : [];

//             if (!map[artNo]) map[artNo] = { sizeRate: {}, sizePerBox: {} };
//             const entry = map[artNo];

//             details.forEach((sd) => {
//               const sizeName = String(sd.sizeName || sd.size || "").trim();
//               if (!sizeName) return;

//               if (sd.rate !== null && sd.rate !== undefined && sd.rate !== "") {
//                 entry.sizeRate[sizeName] = String(sd.rate);
//               }
//               if (
//                 sd.perBox !== null &&
//                 sd.perBox !== undefined &&
//                 sd.perBox !== ""
//               ) {
//                 entry.sizePerBox[sizeName] = String(sd.perBox);
//               }
//             });
//           }
//         }

//         setArtDefaults(map);
//       } catch (err) {
//         console.error("Failed to load art defaults from packing challans", err);
//       }
//     })();
//   }, []);

//   // Recalc row totals
//   const recalcRow = (r: RowData): RowData => {
//     const next: RowData = { ...r };
//     const keys = new Set<string>([
//       ...Object.keys(next.sizeRate || {}),
//       ...Object.keys(next.sizeBox || {}),
//       ...Object.keys(next.sizePerBox || {}),
//     ]);

//     let totalPcs = 0;
//     let totalAmount = 0;

//     keys.forEach((k) => {
//       const box = toNum(next.sizeBox?.[k] || 0);
//       const perBox = toNum(next.sizePerBox?.[k] || 0);
//       const rate = toNum(next.sizeRate?.[k] || 0);

//       const pcs = box * perBox;
//       const amt = pcs * rate;

//       totalPcs += pcs;
//       totalAmount += amt;
//     });

//     next.pcs = totalPcs ? String(totalPcs) : "";
//     next.amount = Number(totalAmount).toFixed(2);
//     return next;
//   };

//   const patchRow = (rowId: number, patch: Partial<RowData>) =>
//     setRows((prev) =>
//       prev.map((r) => (r.id === rowId ? recalcRow({ ...r, ...patch }) : r))
//     );

//   const handleSizeBoxChange = (id: number, sizeName: string, value: string) => {
//     setRows((prev) =>
//       prev.map((r) => {
//         if (r.id !== id) return r;
//         const sizeBox = { ...(r.sizeBox || {}) };
//         sizeBox[sizeName] = sanitizeNumber(value);
//         return recalcRow({ ...r, sizeBox });
//       })
//     );
//   };
//   const handleSizePerBoxChange = (
//     id: number,
//     sizeName: string,
//     value: string
//   ) => {
//     setRows((prev) =>
//       prev.map((r) => {
//         if (r.id !== id) return r;
//         const sizePerBox = { ...(r.sizePerBox || {}) };
//         sizePerBox[sizeName] = sanitizeNumber(value);
//         return recalcRow({ ...r, sizePerBox });
//       })
//     );
//   };
//   const handleSizeRateChange = (
//     id: number,
//     sizeName: string,
//     value: string
//   ) => {
//     setRows((prev) =>
//       prev.map((r) => {
//         if (r.id !== id) return r;
//         const sizeRate = { ...(r.sizeRate || {}) };
//         sizeRate[sizeName] = sanitizeNumber(value);
//         return recalcRow({ ...r, sizeRate });
//       })
//     );
//   };

//   const sizeColumns = useMemo(() => {
//     const s = new Set<string>();
//     rows.forEach((r) => {
//       Object.keys(r.sizeRate || {}).forEach((k) => s.add(k));
//       Object.keys(r.sizeBox || {}).forEach((k) => s.add(k));
//       Object.keys(r.sizePerBox || {}).forEach((k) => s.add(k));
//     });
//     return Array.from(s).sort(sizeSort);
//   }, [rows]);

//   const totalBox = useMemo(
//     () =>
//       rows.reduce(
//         (sum, r) =>
//           sum +
//           Object.values(r.sizeBox || {}).reduce(
//             (a, v) => a + (toNum(v) || 0),
//             0
//           ),
//         0
//       ),
//     [rows]
//   );
//   const totalPerBox = useMemo(
//     () =>
//       rows.reduce(
//         (sum, r) =>
//           sum +
//           Object.values(r.sizePerBox || {}).reduce(
//             (a, v) => a + (toNum(v) || 0),
//             0
//           ),
//         0
//       ),
//     [rows]
//   );
//   const totalPcs = useMemo(
//     () => rows.reduce((s, r) => s + (toNum(r.pcs) || 0), 0),
//     [rows]
//   );
//   const totalAmount = useMemo(
//     () => rows.reduce((s, r) => s + (toNum(r.amount) || 0), 0),
//     [rows]
//   );

//   // Lot
//   const openLotModalForRow = (rowId: number) => {
//     setLotModalForRowId(rowId);
//     setLotModalOpen(true);
//   };

//   const loadSizesByArtNo = async (artNo: string) => {
//     if (!artNo)
//       return {
//         sizeRate: {},
//         sizeBox: {},
//         sizePerBox: {},
//         sizeIdByName: {},
//         artGroup: "",
//       };

//     try {
//       const listRes = await api.get<any[]>("/arts");
//       const list = Array.isArray(listRes.data) ? listRes.data : [];
//       const found = list.find(
//         (a) =>
//           String(a.artNo || "").trim().toLowerCase() ===
//           artNo.trim().toLowerCase()
//       );

//       let artGroup = String(
//         found?.artGroupName ||
//           found?.artGroup ||
//           found?.group ||
//           found?.groupName ||
//           found?.name ||
//           ""
//       ).trim();

//       if (!found?.serialNumber) {
//         const defaults = artDefaults[artNo] || { sizeRate: {}, sizePerBox: {} };
//         return {
//           sizeRate: { ...defaults.sizeRate },
//           sizeBox: {},
//           sizePerBox: { ...defaults.sizePerBox },
//           sizeIdByName: {},
//           artGroup,
//         };
//       }

//       const det = await api
//         .get<any>(`/arts/${found.serialNumber}`)
//         .catch(() => null);
//       const detData = det?.data ?? null;
//       const sizes = Array.isArray(detData?.sizes) ? detData.sizes : [];

//       if (!artGroup && detData) {
//         artGroup = String(
//           detData.artGroupName ||
//             detData.artGroup ||
//             detData.group ||
//             detData.groupName ||
//             detData.name ||
//             ""
//         ).trim();
//       }

//       const sizeRate: Record<string, string> = {};
//       const sizeBox: Record<string, string> = {};
//       const sizePerBox: Record<string, string> = {};
//       const sizeIdByName: Record<string, number> = {};

//       sizes.forEach((s: any) => {
//         const name = String(s.sizeName || s.name || "").trim();
//         const id = Number(s.id || s.sizeId || 0);
//         if (name) {
//           sizeRate[name] =
//             s?.rate !== undefined && s?.rate !== null ? String(s.rate) : "";
//           sizeBox[name] = "";
//           sizePerBox[name] = "";
//           if (id) sizeIdByName[name] = id;
//         }
//       });

//       const defaults = artDefaults[artNo];
//       if (defaults) {
//         Object.keys(defaults.sizeRate).forEach((sizeName) => {
//           const v = defaults.sizeRate[sizeName];
//           if (v !== undefined && v !== null && v !== "") sizeRate[sizeName] = v;
//         });

//         Object.keys(defaults.sizePerBox).forEach((sizeName) => {
//           const v = defaults.sizePerBox[sizeName];
//           if (v !== undefined && v !== null && v !== "")
//             sizePerBox[sizeName] = v;
//         });

//         Object.keys(defaults.sizeRate).forEach((sizeName) => {
//           if (!(sizeName in sizeRate)) {
//             sizeRate[sizeName] = defaults.sizeRate[sizeName];
//             sizeBox[sizeName] = "";
//             sizePerBox[sizeName] = defaults.sizePerBox[sizeName] || "";
//           }
//         });
//       }

//       return { sizeRate, sizeBox, sizePerBox, sizeIdByName, artGroup };
//     } catch {
//       return {
//         sizeRate: {},
//         sizeBox: {},
//         sizePerBox: {},
//         sizeIdByName: {},
//         artGroup: "",
//       };
//     }
//   };

//   const handleLotPicked = async (lot: LotRecord) => {
//     const rowId = lotModalForRowId;
//     setLotModalOpen(false);
//     setLotModalForRowId(null);
//     if (rowId == null) return;

//     setLots((prev) => prev.filter((l) => l.lotNo !== lot.lotNo));

//     const artNo = (lot.artNo || "").trim();
//     const lotArtGroup = String((lot as any).artGroup || "").trim();

//     const sizesRes = await loadSizesByArtNo(artNo);
//     const {
//       sizeRate,
//       sizeBox,
//       sizePerBox,
//       sizeIdByName,
//       artGroup: artGroupFromSizes,
//     } = sizesRes || {
//       sizeRate: {},
//       sizeBox: {},
//       sizePerBox: {},
//       sizeIdByName: {},
//       artGroup: "",
//     };

//     const finalArtGroup = lotArtGroup || artGroupFromSizes || "";

//     patchRow(rowId, {
//       cuttinglotNo: lot.lotNo,
//       artNo,
//       workOnArt: lot.itemName || "",
//       artGroup: finalArtGroup,
//       sizeRate,
//       sizeBox,
//       sizePerBox,
//       sizeIdByName,
//       pcs: "",
//       amount: "0.00",
//     });
//   };

//   // Shade
//   const openShadeModalForRow = (rowId: number) => {
//     setShadeModalForRowId(rowId);
//     setShadeModalOpen(true);
//   };

//   const handleShadePicked = (shade: ShadeOpt) => {
//     const rowId = shadeModalForRowId;
//     setShadeModalOpen(false);
//     setShadeModalForRowId(null);
//     if (rowId == null) return;
//     patchRow(rowId, { shade: shade.name, shadeCode: shade.code });
//   };

//   // -------- Save / Update --------
//   const buildPayload = () => ({
//     date,
//     partyId: partyId ? parseInt(partyId) : null,
//     rows: rows
//       .filter((r) => r.cuttinglotNo || r.artNo || r.workOnArt)
//       .map((r, idx) => {
//         const keys = new Set<string>([
//           ...Object.keys(r.sizeRate || {}),
//           ...Object.keys(r.sizeBox || {}),
//           ...Object.keys(r.sizePerBox || {}),
//         ]);

//         const sizeDetails = Array.from(keys).map((k) => {
//           const box = toNum(r.sizeBox?.[k] || 0);
//           const perBox = toNum(r.sizePerBox?.[k] || 0);
//           const pcs = box * perBox;
//           const rate = toNum(r.sizeRate?.[k] || 0);
//           const amount = Number((pcs * rate).toFixed(2));
//           return {
//             sizeId: r.sizeIdByName?.[k] || null,
//             sizeName: k,
//             boxCount: box,
//             perBox,
//             pcs,
//             rate,
//             amount,
//           };
//         });

//         const rowPcs = sizeDetails.reduce((sum, d) => sum + d.pcs, 0);
//         const rowAmount = sizeDetails.reduce((sum, d) => sum + d.amount, 0);

//         return {
//           sno: idx + 1,
//           cuttingLotNo: (r.cuttinglotNo || "").trim(),
//           artNo: (r.artNo || "").trim(),
//           workOnArt: (r.workOnArt || "").trim(),
//           artGroupName: (r.artGroup || "").trim(),
//           shadeCode: r.shadeCode ?? null,
//           pcs: rowPcs,
//           amount: Number(rowAmount.toFixed(2)),
//           sizeDetails,
//         };
//       }),
//   });

//   const handleSave = async () => {
//     if (isSaving) return;

//     const payload = buildPayload();

//     if (!payload.partyId || !date) {
//       return Swal.fire("Validation", "Date and Party are required.", "warning");
//     }
//     if (payload.rows.length === 0) {
//       return Swal.fire("Validation", "Add at least one row.", "warning");
//     }
//     const anyPcs = payload.rows.some(
//       (r: any) =>
//         Array.isArray(r.sizeDetails) &&
//         r.sizeDetails.some((sd: any) => Number(sd.pcs) > 0)
//     );
//     if (!anyPcs) {
//       return Swal.fire(
//         "Validation",
//         "Please enter Box & Per/Box for at least one size.",
//         "warning"
//       );
//     }

//     try {
//       setIsSaving(true);

//       if (editingSerial) {
//         await api.put(
//           `/packing-challans/${encodeURIComponent(editingSerial)}`,
//           payload
//         );

//         // ✅ after Update reset page
//         await resetPage();

//         Swal.fire({
//           icon: "success",
//           title: "Updated!",
//           timer: 2000,
//           showConfirmButton: false,
//         });
//       } else {
//         await api.post("/packing-challans", payload);

//         // ✅ after Save reset page
//         await resetPage();

//         Swal.fire({
//           icon: "success",
//           title: "Saved!",
//           timer: 2500,
//           showConfirmButton: false,
//         });
//       }
//     } catch (e: any) {
//       Swal.fire(
//         "Error",
//         e?.response?.data?.message || "Failed to save challan.",
//         "error"
//       );
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   // ✅ Reset button
//   const handleReset = async () => {
//     const ask = await Swal.fire({
//       title: "Reset?",
//       text: "This will clear the form. Continue?",
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Yes, Reset",
//       cancelButtonText: "Cancel",
//     });
//     if (!ask.isConfirmed) return;

//     await resetPage();
//     Swal.fire({
//       icon: "success",
//       title: "Reset Done",
//       timer: 1000,
//       showConfirmButton: false,
//     });
//   };

//   // ✅ Exit button (same as reset; you can change to navigation if you want)
//   const handleExit = async () => {
//     const ask = await Swal.fire({
//       title: "Exit?",
//       text: "Are you sure you want to exit/reset this form?",
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Yes",
//       cancelButtonText: "No",
//     });
//     if (!ask.isConfirmed) return;

//     await resetPage();
//   };

//   // Print
//   const handlePrint = () => {
//     const w = window.open("", "_blank")!;
//     const party = parties.find((p) => String(p.id) === String(partyId));
//     const partyName = party ? party.partyName : "";

//     const printableRows = rows.filter(
//       (r) => r.cuttinglotNo || r.artNo || r.workOnArt
//     );

//     const html = `
//       <html>
//       <head>
//         <title>Packing Challan</title>
//         <style>
//           * { box-sizing: border-box; }
//           body { font-family: Arial, sans-serif; padding: 8px; }
//           h2 { text-align:center; margin: 0 0 4px; }
//           .subtitle { text-align:center; margin: 0 0 10px; font-size: 12px; }
//           table { width: 100%; border-collapse: collapse; table-layout: fixed; }
//           th, td { border: 1px solid #333; padding: 4px 3px; font-size: 10px; text-align: center; word-wrap: break-word; }
//           thead th { background: #eee; }
//           tfoot td { background: #fff59d; font-weight: 600; }
//           th.col-sr, td.col-sr { width: 9%; }
//           th.col-cl, td.col-cl { width: 15%; }
//           th.col-art, td.col-art { width: 15%; }
//           th.col-ag, td.col-ag { width: 15%; }
//           th.col-woa, td.col-woa { width: 15%; }
//           th.col-size, td.col-size { width: 50%; text-align: left; }
//           th.col-sh, td.col-sh { width: 13%; }
//           th.col-pcs, td.col-pcs { width: 9%; }
//           th.col-amt, td.col-amt { width: 20%; }
//           @media print { @page { margin: 10mm; } }
//         </style>
//       </head>
//       <body>
//         <h2>Packing Challan</h2>
//         <p class="subtitle">
//           ${date ? `Date: ${date}` : ""}${date && partyName ? " | " : ""}${
//       partyName ? `Party: ${partyName}` : ""
//     }
//         </p>

//         <table>
//           <thead>
//             <tr>
//               <th class="col-sr">Sr.No</th>
//               <th class="col-cl">Cutting Lot No</th>
//               <th class="col-art">Art No</th>
//               <th class="col-ag">Art Group</th>
//               <th class="col-woa">Work on Art</th>
//               <th class="col-size">Size</th>
//               <th class="col-sh">Shade</th>
//               <th class="col-pcs">Pcs</th>
//               <th class="col-amt">Amount</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${printableRows
//               .map((r, idx) => {
//                 const sizeParts = sizeColumns
//                   .map((s) => {
//                     const box = Number(r.sizeBox?.[s] || 0);
//                     const perBox = Number(r.sizePerBox?.[s] || 0);
//                     const rate = Number(r.sizeRate?.[s] || 0);
//                     if (!box && !perBox && !rate) return null;
//                     return `${s}: Box ${box || ""}, PB ${
//                       perBox || ""
//                     }, ₹${rate ? rate.toFixed(2) : ""}`;
//                   })
//                   .filter(Boolean) as string[];

//                 const sizeHtml = sizeParts.length ? sizeParts.join("<br/>") : "";

//                 return `
//                   <tr>
//                     <td class="col-sr">${idx + 1}</td>
//                     <td class="col-cl">${r.cuttinglotNo || ""}</td>
//                     <td class="col-art">${r.artNo || ""}</td>
//                     <td class="col-ag">${r.artGroup || ""}</td>
//                     <td class="col-woa">${r.workOnArt || ""}</td>
//                     <td class="col-size">${sizeHtml}</td>
//                     <td class="col-sh">${r.shade || ""}</td>
//                     <td class="col-pcs">${r.pcs || ""}</td>
//                     <td class="col-amt">${r.amount || ""}</td>
//                   </tr>`;
//               })
//               .join("")}
//           </tbody>
//           <tfoot>
//             <tr>
//               <td colspan="5" style="text-align:right">Totals</td>
//               <td class="col-size">
//                 Box: ${totalBox} <br/> Per/Box: ${totalPerBox}
//               </td>
//               <td></td>
//               <td class="col-pcs">${totalPcs}</td>
//               <td class="col-amt">₹${totalAmount.toFixed(2)}</td>
//             </tr>
//           </tfoot>
//         </table>
//       </body>
//       </html>
//     `;

//     w.document.write(html);
//     w.document.close();
//     w.print();
//   };

//   // View List
//   const openList = async () => {
//     try {
//       const { data } = await api.get<any[]>("/packing-challans");
//       setListData(Array.isArray(data) ? data : []);
//       setListOpen(true);
//     } catch {
//       setListData([]);
//       setListOpen(true);
//     }
//   };

//   const flatRows = useMemo(() => {
//     const out: any[] = [];
//     for (const ch of listData) {
//       const date = ch.date || ch.dated || "";
//       const partyName = ch.partyName || "";
//       const rows = Array.isArray(ch.rows) ? ch.rows : [];

//       rows.forEach((r: any, i: number) => {
//         const details: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
//         const sortedDetails = [...details].sort((a, b) =>
//           sizeSort(
//             String(a.sizeName || a.size || ""),
//             String(b.sizeName || b.size || "")
//           )
//         );

//         const nonEmptyDetails = sortedDetails.filter((sd: any) => {
//           const box = Number(sd.boxCount ?? sd.box ?? 0);
//           const perBox = Number(sd.perBox ?? 0);
//           const rate = Number(sd.rate ?? 0);
//           return box !== 0 || perBox !== 0 || rate !== 0;
//         });

//         const sizeLabel = nonEmptyDetails.length
//           ? nonEmptyDetails
//               .map(
//                 (sd: any) =>
//                   `${sd.sizeName ?? sd.size ?? ""}: Box ${
//                     sd.boxCount ?? 0
//                   }, PB ${sd.perBox ?? 0}, ₹${Number(sd.rate ?? 0).toFixed(2)}`
//               )
//               .join("\n")
//           : "";

//         out.push({
//           serialNo: ch.serialNo ?? ch.serialNo,
//           date,
//           partyName,
//           cuttingLotNo: r.cuttingLotNo || r.cutLotNo || "",
//           artGroup: r.artGroupName || "",
//           artNo: r.artNo || "",
//           size: sizeLabel,
//           shade: r.shadeName || "",
//           box: details.length
//             ? details.reduce(
//                 (s: number, sd: any) => s + Number(sd.boxCount || 0),
//                 0
//               )
//             : r.box || r.boxCount || 0,
//           pcs: r.pcs || 0,
//           amount: r.amount || 0,
//         });
//       });
//     }

//     const q = listSearch.trim().toLowerCase();
//     if (!q) return out;
//     return out.filter((x) =>
//       Object.values(x).some((v) => String(v).toLowerCase().includes(q))
//     );
//   }, [listData, listSearch]);

//   const handleEditFromList = async (serialNo: string) => {
//     try {
//       const res = await api.get(
//         `/packing-challans/${encodeURIComponent(serialNo)}`
//       );
//       const dto = res.data;

//       setDate(dto.date || "");
//       setPartyId(dto.partyId != null ? String(dto.partyId) : "");

//       const mappedRows: RowData[] = (Array.isArray(dto.rows) ? dto.rows : []).map(
//         (r: any, idx: number) => {
//           const sizeRate: Record<string, string> = {};
//           const sizeBox: Record<string, string> = {};
//           const sizePerBox: Record<string, string> = {};
//           const sizeIdByName: Record<string, number> = {};

//           if (Array.isArray(r.sizeDetails)) {
//             r.sizeDetails.forEach((sd: any) => {
//               const name = (sd.sizeName || sd.size || "") as string;
//               if (!name) return;
//               sizeRate[name] = sd.rate != null ? String(sd.rate) : "";
//               sizeBox[name] = sd.boxCount != null ? String(sd.boxCount) : "";
//               sizePerBox[name] = sd.perBox != null ? String(sd.perBox) : "";
//               if (sd.sizeId) sizeIdByName[name] = sd.sizeId;
//             });
//           }

//           return recalcRow({
//             id: Date.now() + idx,
//             cuttinglotNo: r.cuttingLotNo || r.cutLotNo || "",
//             artNo: r.artNo || "",
//             artGroup: r.artGroupName || r.artGroup || "",
//             workOnArt: r.workOnArt || "",
//             sizeRate,
//             sizeBox,
//             sizePerBox,
//             sizeIdByName,
//             shade: r.shadeName || "",
//             shadeCode: r.shadeCode || null,
//             pcs: r.pcs != null ? String(r.pcs) : "",
//             amount: r.amount != null ? String(r.amount) : "0.00",
//           });
//         }
//       );

//       setRows(mappedRows.length ? mappedRows : [blankRow()]);
//       setEditingSerial(serialNo);
//       setListOpen(false);

//       Swal.fire("Loaded", "Challan loaded for editing.", "success");
//     } catch (e) {
//       console.error(e);
//       Swal.fire("Error", "Failed to load challan for edit.", "error");
//     }
//   };

//   const handleDeleteFromList = async (serialNo: string) => {
//     const ask = await Swal.fire({
//       title: "Delete?",
//       text: `Delete challan ${serialNo}? This cannot be undone.`,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, delete",
//     });
//     if (!ask.isConfirmed) return;

//     try {
//       await api.delete(`/packing-challans/${encodeURIComponent(serialNo)}`);
//       const { data } = await api.get<any[]>("/packing-challans");
//       setListData(Array.isArray(data) ? data : []);
//       await fetchAvailableLots();
//       Swal.fire("Deleted", "Challan deleted.", "success");
//     } catch (e) {
//       console.error(e);
//       Swal.fire("Error", "Failed to delete challan.", "error");
//     }
//   };

//   return (
//     <Dashboard>
//       {/* Modals */}
//       <CuttingLotModal
//         open={lotModalOpen}
//         lots={lots}
//         onClose={() => setLotModalOpen(false)}
//         onSelect={handleLotPicked}
//       />
//       <ShadeModal
//         open={shadeModalOpen}
//         shades={shades}
//         onClose={() => setShadeModalOpen(false)}
//         onSelect={handleShadePicked}
//       />

//       {/* ======= View List Modal ======= */}
//       {listOpen && (
//         <div className="fixed inset-0 bg-black/50 z-[1500] flex items-center justify-center">
//           <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 p-6 max-h-[90vh] overflow-y-auto">
//             <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">
//               Packing Challans
//             </h2>

//             <div className="flex justify-center mb-4">
//               <input
//                 value={listSearch}
//                 onChange={(e) => setListSearch(e.target.value)}
//                 placeholder="Search anything…"
//                 className="border p-2 rounded w-full"
//               />
//             </div>

//             <div className="overflow-x-auto">
//               <table className="min-w-full border border-gray-300 text-sm">
//                 <thead className="bg-blue-100">
//                   <tr>
//                     <th className="border p-2 text-center">S.No</th>
//                     <th className="border p-2 text-center">Date</th>
//                     <th className="border p-2 text-center">Party Name</th>
//                     <th className="border p-2 text-center">Cutting Lot No</th>
//                     <th className="border p-2 text-center">Art Group</th>
//                     <th className="border p-2 text-center">Art No</th>
//                     <th className="border p-2 text-center">Size</th>
//                     <th className="border p-2 text-center">Shade</th>
//                     <th className="border p-2 text-center">Box</th>
//                     <th className="border p-2 text-center">Pcs</th>
//                     <th className="border p-2 text-center">Amount</th>
//                     <th className="border p-2 text-center">Action</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {flatRows.map((r, i) => (
//                     <tr key={i}>
//                       <td className="border p-2 text-center">{i + 1}</td>
//                       <td className="border p-2 text-center">{r.date}</td>
//                       <td className="border p-2 text-center">{r.partyName}</td>
//                       <td className="border p-2 text-center">
//                         {r.cuttingLotNo}
//                       </td>
//                       <td className="border p-2 text-center">{r.artGroup}</td>
//                       <td className="border p-2 text-center">{r.artNo}</td>
//                       <td className="border p-2 text-center whitespace-pre-line min-w-[260px]">
//                         {r.size}
//                       </td>
//                       <td className="border p-2 text-center">{r.shade}</td>
//                       <td className="border p-2 text-center">{r.box}</td>
//                       <td className="border p-2 text-center">{r.pcs}</td>
//                       <td className="border p-2 text-center">
//                         {Number(r.amount).toFixed(2)}
//                       </td>
//                       <td className="border p-2">
//                         <div className="flex items-center justify-center gap-2">
//                           <button
//                             onClick={() => handleEditFromList(r.serialNo)}
//                             className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => handleDeleteFromList(r.serialNo)}
//                             className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}

//                   {flatRows.length === 0 && (
//                     <tr>
//                       <td
//                         className="border p-3 text-center text-gray-500"
//                         colSpan={12}
//                       >
//                         No records
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             <div className="text-center mt-6">
//               <button
//                 onClick={() => setListOpen(false)}
//                 className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ======= Page ======= */}
//       <div className="p-6 bg-gray-100 min-h-screen">
//         <div className="bg-white p-6 rounded-lg shadow-md">
//           <h2 className="text-2xl font-bold text-center mb-4">
//             Packing Challan
//           </h2>

//           {/* Header */}
//           <div className="grid grid-cols-3 gap-4 mb-6">
//             <div>
//               <label className="block font-semibold">Date</label>
//               <input
//                 type="date"
//                 value={date}
//                 onChange={(e) => setDate(e.target.value)}
//                 className="border p-2 rounded w-full"
//               />
//             </div>

//             <div>
//               <label className="block font-semibold">Party Name</label>
//               <select
//                 value={partyId}
//                 onChange={(e) => setPartyId(e.target.value)}
//                 className="border p-2 rounded w-full"
//               >
//                 <option value="">Select Party</option>
//                 {parties.map((p) => (
//                   <option key={p.id} value={p.id}>
//                     {p.partyName}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>

//           {/* Table */}
//           <div className="overflow-x-auto">
//             <table className="min-w-full border text-sm">
//               <thead className="bg-gray-200">
//                 <tr>
//                   <th className="border p-2 text-center">Sr No.</th>
//                   <th className="border p-2 text-center">Cutting Lot No.</th>
//                   <th className="border p-2 text-center">Art No</th>
//                   <th className="border p-2 text-center">Art Group</th>
//                   <th className="border p-2 text-center">Work on Art</th>

//                   {sizeColumns.map((s) => (
//                     <th key={s} className="border p-2 text-center">
//                       <div className="flex flex-col items-center">
//                         <div>{s}</div>
//                         <div className="text-[10px] font-normal text-gray-600">
//                           Box / Rate / PerBox
//                         </div>
//                       </div>
//                     </th>
//                   ))}

//                   <th className="border p-2 text-center">Shade</th>
//                   <th className="border p-2 text-center">Pcs</th>
//                   <th className="border p-2 text-center">Amount</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {rows.map((r, idx) => (
//                   <tr key={r.id}>
//                     <td className="border p-1 text-center">{idx + 1}</td>

//                     <td className="border p-1">
//                       <input
//                         className="border p-1 rounded w-full bg-yellow-50 cursor-pointer hover:bg-yellow-100"
//                         value={r.cuttinglotNo}
//                         readOnly
//                         onClick={() => openLotModalForRow(r.id)}
//                         placeholder="Click to select"
//                         title="Click to select cutting lot"
//                       />
//                     </td>

//                     <td className="border p-1">
//                       <input
//                         className="border p-1 rounded w-full"
//                         value={r.artNo}
//                         onChange={(e) => patchRow(r.id, { artNo: e.target.value })}
//                       />
//                     </td>

//                     <td className="border p-1">
//                       <input
//                         className="border p-1 rounded w-full"
//                         value={r.artGroup}
//                         onChange={(e) =>
//                           patchRow(r.id, { artGroup: e.target.value })
//                         }
//                       />
//                     </td>

//                     <td className="border p-1">
//                       <input
//                         className="border p-1 rounded w-full"
//                         value={r.workOnArt}
//                         onChange={(e) =>
//                           patchRow(r.id, { workOnArt: e.target.value })
//                         }
//                       />
//                     </td>

//                     {sizeColumns.map((s) => {
//                       const enabled =
//                         Object.prototype.hasOwnProperty.call(r.sizeRate || {}, s) ||
//                         Object.prototype.hasOwnProperty.call(r.sizeBox || {}, s) ||
//                         Object.prototype.hasOwnProperty.call(
//                           r.sizePerBox || {},
//                           s
//                         );

//                       return (
//                         <td key={s} className="border p-1">
//                           <div className={`${enabled ? "" : "opacity-60"}`}>
//                             <div className="flex flex-col gap-1">
//                               <input
//                                 type="text"
//                                 value={r.sizeBox[s] || ""}
//                                 onChange={(e) =>
//                                   handleSizeBoxChange(r.id, s, e.target.value)
//                                 }
//                                 disabled={!enabled}
//                                 className={`border p-1 rounded w-full text-right ${
//                                   enabled
//                                     ? ""
//                                     : "bg-gray-100 text-gray-400 cursor-not-allowed"
//                                 }`}
//                                 placeholder="Box"
//                               />
//                               <input
//                                 type="text"
//                                 value={r.sizeRate[s] || ""}
//                                 onChange={(e) =>
//                                   handleSizeRateChange(r.id, s, e.target.value)
//                                 }
//                                 disabled={!enabled}
//                                 className={`border p-1 rounded w-full text-right ${
//                                   enabled
//                                     ? ""
//                                     : "bg-gray-100 text-gray-400 cursor-not-allowed"
//                                 }`}
//                                 placeholder="Rate"
//                               />
//                               <input
//                                 type="text"
//                                 value={r.sizePerBox[s] || ""}
//                                 onChange={(e) =>
//                                   handleSizePerBoxChange(r.id, s, e.target.value)
//                                 }
//                                 disabled={!enabled}
//                                 className={`border p-1 rounded w-full text-right ${
//                                   enabled
//                                     ? ""
//                                     : "bg-gray-100 text-gray-400 cursor-not-allowed"
//                                 }`}
//                                 placeholder="Per/Box"
//                               />
//                             </div>
//                           </div>
//                         </td>
//                       );
//                     })}

//                     <td className="border p-1">
//                       <input
//                         className="border p-1 rounded w-full bg-yellow-50 cursor-pointer hover:bg-yellow-100"
//                         value={r.shade}
//                         readOnly
//                         onClick={() => openShadeModalForRow(r.id)}
//                         placeholder="Click to select"
//                         title="Click to select shade"
//                       />
//                     </td>

//                     <td className="border p-1">
//                       <input
//                         readOnly
//                         className="border p-1 rounded w-full bg-gray-100 text-right"
//                         value={r.pcs}
//                       />
//                     </td>

//                     <td className="border p-1">
//                       <input
//                         readOnly
//                         className="border p-1 rounded w-full bg-gray-100 text-right"
//                         value={r.amount}
//                       />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Totals */}
//           <div className="flex flex-wrap items-center justify-end gap-6 mt-4 font-semibold">
//             <p>Total Box: {totalBox}</p>
//             <p>Total Per/Box: {totalPerBox}</p>
//             <p>Total Pcs: {totalPcs}</p>
//             <p>Total Amount: ₹{totalAmount.toFixed(2)}</p>
//           </div>

//           {/* Buttons */}
//           <div className="mt-4 flex flex-wrap gap-2">
//             <button
//               onClick={addBlankRow}
//               className="px-4 py-2 bg-blue-500 text-white rounded"
//             >
//               Add Row
//             </button>

//             {/* ✅ Save/Update disabled while saving */}
//             <button
//               onClick={handleSave}
//               disabled={isSaving}
//               className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
//             >
//               {isSaving
//                 ? editingSerial
//                   ? "Updating..."
//                   : "Saving..."
//                 : editingSerial
//                 ? "Update"
//                 : "Save"}
//             </button>

//             {/* ✅ Reset button */}
//             <button
//               onClick={handleReset}
//               className="px-4 py-2 bg-gray-500 text-white rounded"
//             >
//               Reset
//             </button>

//             <button
//               onClick={handlePrint}
//               className="px-4 py-2 bg-yellow-500 text-white rounded"
//             >
//               Print
//             </button>

//             <button
//               onClick={openList}
//               className="px-4 py-2 bg-slate-700 text-white rounded"
//             >
//               View List
//             </button>

//             {/* ✅ Exit button */}
//             <button
//               onClick={handleExit}
//               className="px-4 py-2 bg-red-600 text-white rounded"
//             >
//               Exit
//             </button>
//           </div>
//         </div>
//       </div>
//     </Dashboard>
//   );
// };

// export default PackingChallan;
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  artGroup?: string;

  cutSizeBox?: Record<string, string>;
  cutSizePerBox?: Record<string, string>;
  prevPackedBox?: Record<string, string>;
  pendingBoxTotal?: number;
};

interface RowData {
  id: number;
  cuttinglotNo: string;
  artNo: string;
  artGroup: string;
  workOnArt: string;

  sizeRate: Record<string, string>;
  sizeBox: Record<string, string>;
  sizePerBox: Record<string, string>;
  sizeIdByName: Record<string, number>;

  cutSizeBox: Record<string, string>;
  cutSizePerBox: Record<string, string>;
  prevPackedBox: Record<string, string>;

  shade: string;
  shadeCode?: string | null;

  pcs: string;
  amount: string;
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
  const known = ["3XS", "XXXS", "2XS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"];
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

const normLot = (s: any) => String(s || "").trim();

/* ========== Cutting Lot Modal ========== */
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
        (x.itemName || "").toLowerCase().includes(s) ||
        String(x.pendingBoxTotal ?? "").toLowerCase().includes(s),
    );
  }, [q, lots]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Select Cutting Lot</h3>
          <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">
            Close
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lot no / art no / item / pending..."
          className="border p-2 rounded w-full mb-3"
        />

        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Lot No</th>
                <th className="border p-2">Art No</th>
                <th className="border p-2">Item</th>
                <th className="border p-2 text-right">Pending Box</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="border p-3 text-center text-gray-500" colSpan={5}>
                    No records
                  </td>
                </tr>
              ) : (
                filtered.map((x) => (
                  <tr key={x.lotNo} className="hover:bg-gray-50">
                    <td className="border p-2">{x.lotNo}</td>
                    <td className="border p-2">{x.artNo}</td>
                    <td className="border p-2">{x.itemName}</td>
                    <td className="border p-2 text-right">{(x.pendingBoxTotal ?? 0).toFixed(0)}</td>
                    <td className="border p-2 text-center">
                      <button onClick={() => onSelect(x)} className="px-3 py-1 bg-blue-600 text-white rounded">
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          Pending Box = Cutting Box - Previously Packed Box (across other packing challans)
        </div>
      </div>
    </div>
  );
};

/* ========== Shade Modal ========== */
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
    return shades.filter((sh) => (sh.name || "").toLowerCase().includes(s) || (sh.code || "").toLowerCase().includes(s));
  }, [q, shades]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Select Shade</h3>
          <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">
            Close
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shade name / code"
          className="border p-2 rounded w-full mb-3"
        />

        <div className="overflow-auto max-h-[70vh] border">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Shade Code</th>
                <th className="border p-2">Shade Name</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="border p-3 text-center text-gray-500" colSpan={3}>
                    No shades found
                  </td>
                </tr>
              ) : (
                filtered.map((sh) => (
                  <tr key={`${sh.code}-${sh.name}`} className="hover:bg-gray-50">
                    <td className="border p-2">{sh.code}</td>
                    <td className="border p-2">{sh.name}</td>
                    <td className="border p-2 text-center">
                      <button onClick={() => onSelect(sh)} className="px-3 py-1 bg-blue-600 text-white rounded">
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
  const [isSaving, setIsSaving] = useState(false);

  // defaults from previous packing challans (ArtNo+Size -> rate/perBox)
  const [artDefaults, setArtDefaults] = useState<{
    [artNo: string]: { sizeRate: Record<string, string>; sizePerBox: Record<string, string> };
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

  // editing marker
  const [editingSerial, setEditingSerial] = useState<string | null>(null);

  // caches for cutting + prev packed maps
  const cuttingInfoRef = useRef<
    Map<string, { cutSizeBox: Record<string, string>; cutSizePerBox: Record<string, string> }>
  >(new Map());
  const prevPackedRef = useRef<Map<string, Record<string, string>>>(new Map());

  const makeBlankRow = useCallback((): RowData => {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      cuttinglotNo: "",
      artNo: "",
      artGroup: "",
      workOnArt: "",
      sizeRate: {},
      sizeBox: {},
      sizePerBox: {},
      sizeIdByName: {},
      cutSizeBox: {},
      cutSizePerBox: {},
      prevPackedBox: {},
      shade: "",
      shadeCode: null,
      pcs: "",
      amount: "0.00",
    };
  }, []);

  const addBlankRow = () => setRows((prev) => [...prev, makeBlankRow()]);

  // ---------- Build prev packed map ----------
  const buildPrevPackedBoxMap = useCallback((challans: any[], excludeSerial?: string | null) => {
    const map = new Map<string, Record<string, number>>();

    for (const ch of Array.isArray(challans) ? challans : []) {
      const sn = String(ch.serialNo ?? ch.serial ?? ch.challanNo ?? "");
      if (excludeSerial && sn && sn === excludeSerial) continue;

      const chRows: any[] = Array.isArray(ch.rows) ? ch.rows : [];
      for (const r of chRows) {
        const lotNo = normLot(r.cuttingLotNo || r.cutLotNo || r.cutlotNo || r.cuttinglotNo || "");
        if (!lotNo) continue;

        const details: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
        for (const sd of details) {
          const sizeName = String(sd.sizeName || sd.size || "").trim();
          if (!sizeName) continue;
          const box = toNum(sd.boxCount ?? sd.box ?? 0);

          if (!map.has(lotNo)) map.set(lotNo, {});
          map.get(lotNo)![sizeName] = (map.get(lotNo)![sizeName] || 0) + box;
        }
      }
    }

    const out = new Map<string, Record<string, string>>();
    map.forEach((v, lot) => {
      const obj: Record<string, string> = {};
      Object.keys(v).forEach((k) => (obj[k] = String(v[k] || 0)));
      out.set(lot, obj);
    });

    return out;
  }, []);

  // ⭐ Available cutting lots
  const fetchAvailableLots = useCallback(async () => {
    try {
      // prev packed from packing challans
      let packingDocs: any[] = [];
      try {
        const { data } = await api.get<any[]>("/packing-challans");
        packingDocs = Array.isArray(data) ? data : [];
      } catch {
        packingDocs = [];
      }

      const prevPacked = buildPrevPackedBoxMap(packingDocs, editingSerial);
      prevPackedRef.current = prevPacked;

      // cutting entries
      const { data: cuttingData } = await api.get<any[]>("/cutting-entries");
      const cuttingDocs = Array.isArray(cuttingData) ? cuttingData : [];

      const lotsMap = new Map<string, LotRecord>();
      const cuttingInfo = new Map<string, { cutSizeBox: Record<string, string>; cutSizePerBox: Record<string, string> }>();

      for (const doc of cuttingDocs) {
        const lotRows: any[] = Array.isArray(doc.lotRows) ? doc.lotRows : [];
        const sizeRows: any[] = Array.isArray(doc.sizeRows) ? doc.sizeRows : [];

        for (let idx = 0; idx < lotRows.length; idx++) {
          const lr = lotRows[idx];
          const lotNo = normLot(lr.cutLotNo || lr.cuttingLotNo || lr.cutlotNo || "");
          if (!lotNo) continue;
          if (lotsMap.has(lotNo)) continue;

          const lotSno = Number(lr.sno ?? idx + 1);

          const cutSizeBox: Record<string, string> = {};
          const cutSizePerBox: Record<string, string> = {};

          const relevant = sizeRows.filter((sr) => Number(sr.lotSno) === lotSno);
          for (const sr of relevant) {
            const sizeName = String(sr.size || sr.sizeName || "-").trim();
            if (!sizeName) continue;

            const box = toNum(sr.box);
            const pb = sr.pcsPerBox != null ? String(sr.pcsPerBox) : "";

            cutSizeBox[sizeName] = String((toNum(cutSizeBox[sizeName]) || 0) + box);
            if (pb && !cutSizePerBox[sizeName]) cutSizePerBox[sizeName] = pb;
          }

          cuttingInfo.set(lotNo, { cutSizeBox, cutSizePerBox });

          const prevPackedForLot = prevPacked.get(lotNo) || {};

          const sizeKeys = new Set<string>([...Object.keys(cutSizeBox), ...Object.keys(prevPackedForLot)]);
          let pendingTotal = 0;
          sizeKeys.forEach((k) => {
            const cut = toNum(cutSizeBox[k] || 0);
            const prev = toNum(prevPackedForLot[k] || 0);
            pendingTotal += Math.max(0, cut - prev);
          });

          const hasCutSizes = Object.keys(cutSizeBox).length > 0;
          if (hasCutSizes && pendingTotal <= 0) continue;

          lotsMap.set(lotNo, {
            lotNo,
            artNo: String(lr.artNo || ""),
            itemName: String(lr.itemName || ""),
            artGroup: String(lr.artGroupName || lr.artGroup || lr.group || ""),
            cutSizeBox,
            cutSizePerBox,
            prevPackedBox: prevPackedForLot,
            pendingBoxTotal: pendingTotal,
          });
        }
      }

      cuttingInfoRef.current = cuttingInfo;
      setLots(Array.from(lotsMap.values()).sort((a, b) => a.lotNo.localeCompare(b.lotNo, undefined, { numeric: true })));
    } catch {
      setLots([]);
    }
  }, [buildPrevPackedBoxMap, editingSerial]);

  // ✅ Reset form
  const resetPage = useCallback(async () => {
    setDate("");
    setPartyId("");
    setEditingSerial(null);
    setRows([makeBlankRow()]);
    setListOpen(false);
    setListSearch("");
    await fetchAvailableLots();
  }, [fetchAvailableLots, makeBlankRow]);

  useEffect(() => {
    if (rows.length === 0) setRows([makeBlankRow()]);
  }, [rows.length, makeBlankRow]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/party/category/Packing");
        setParties(res.data || []);
      } catch {
        setParties([]);
      }
    })();
  }, []);

  useEffect(() => {
    fetchAvailableLots();
  }, [fetchAvailableLots]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any[]>("/shade/list");
        const list: ShadeOpt[] = (Array.isArray(res.data) ? res.data : []).map((x) => ({
          code: String(x.shadeCode || "").trim().toUpperCase(),
          name: String(x.shadeName || "").trim(),
        }));
        setShades(list);
      } catch {
        setShades([]);
      }
    })();
  }, []);

  // defaults from existing packing challans (rate/perBox)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<any[]>("/packing-challans");
        const challans = Array.isArray(data) ? data : [];

        const map: {
          [artNo: string]: { sizeRate: Record<string, string>; sizePerBox: Record<string, string> };
        } = {};

        for (const ch of challans) {
          const challanRows: any[] = Array.isArray(ch.rows) ? ch.rows : [];
          for (const r of challanRows) {
            const artNo = String(r.artNo || "").trim();
            if (!artNo) continue;

            const details: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
            if (!map[artNo]) map[artNo] = { sizeRate: {}, sizePerBox: {} };

            details.forEach((sd) => {
              const sizeName = String(sd.sizeName || sd.size || "").trim();
              if (!sizeName) return;

              if (sd.rate !== null && sd.rate !== undefined && sd.rate !== "") {
                map[artNo].sizeRate[sizeName] = String(sd.rate);
              }
              if (sd.perBox !== null && sd.perBox !== undefined && sd.perBox !== "") {
                map[artNo].sizePerBox[sizeName] = String(sd.perBox);
              }
            });
          }
        }

        setArtDefaults(map);
      } catch (err) {
        console.error("Failed to load art defaults from packing challans", err);
      }
    })();
  }, []);

  // Recalc row totals
  const recalcRow = (r: RowData): RowData => {
    const next: RowData = { ...r };

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
      const pcs = box * perBox;
      const amt = pcs * rate;
      totalPcs += pcs;
      totalAmount += amt;
    });

    next.pcs = totalPcs ? String(totalPcs) : "";
    next.amount = Number(totalAmount).toFixed(2);
    return next;
  };

  const patchRow = (rowId: number, patch: Partial<RowData>) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? recalcRow({ ...r, ...patch }) : r)));
  };

  const handleSizeBoxChange = (id: number, sizeName: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const sizeBox = { ...(r.sizeBox || {}) };
        sizeBox[sizeName] = sanitizeNumber(value);
        return recalcRow({ ...r, sizeBox });
      }),
    );
  };

  const handleSizePerBoxChange = (id: number, sizeName: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const sizePerBox = { ...(r.sizePerBox || {}) };
        sizePerBox[sizeName] = sanitizeNumber(value);
        return recalcRow({ ...r, sizePerBox });
      }),
    );
  };

  const handleSizeRateChange = (id: number, sizeName: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const sizeRate = { ...(r.sizeRate || {}) };
        sizeRate[sizeName] = sanitizeNumber(value);
        return recalcRow({ ...r, sizeRate });
      }),
    );
  };

  // ✅ Include cutSizeBox keys also in columns
  const sizeColumns = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      Object.keys(r.sizeRate || {}).forEach((k) => s.add(k));
      Object.keys(r.sizeBox || {}).forEach((k) => s.add(k));
      Object.keys(r.sizePerBox || {}).forEach((k) => s.add(k));
      Object.keys(r.cutSizeBox || {}).forEach((k) => s.add(k));
      Object.keys(r.cutSizePerBox || {}).forEach((k) => s.add(k));
      Object.keys(r.prevPackedBox || {}).forEach((k) => s.add(k));
    });
    return Array.from(s).sort(sizeSort);
  }, [rows]);

  const totalBox = useMemo(() => {
    return rows.reduce((sum, r) => sum + Object.values(r.sizeBox || {}).reduce((a, v) => a + toNum(v || 0), 0), 0);
  }, [rows]);

  const totalPerBox = useMemo(() => {
    return rows.reduce((sum, r) => sum + Object.values(r.sizePerBox || {}).reduce((a, v) => a + toNum(v || 0), 0), 0);
  }, [rows]);

  const totalPcs = useMemo(() => rows.reduce((s, r) => s + toNum(r.pcs || 0), 0), [rows]);
  const totalAmount = useMemo(() => rows.reduce((s, r) => s + toNum(r.amount || 0), 0), [rows]);

  // Pending (kept for per-size display, but Pending Box column removed)
  const pendingForSize = useCallback((r: RowData, sizeName: string) => {
    const cut = toNum(r.cutSizeBox?.[sizeName] || 0);
    const prev = toNum(r.prevPackedBox?.[sizeName] || 0);
    const curEntered = toNum(r.sizeBox?.[sizeName] || 0);
    return Math.max(0, cut - prev - curEntered);
  }, []);

  // Lot modal open
  const openLotModalForRow = (rowId: number) => {
    setLotModalForRowId(rowId);
    setLotModalOpen(true);
  };

  const loadSizesByArtNo = async (artNo: string) => {
    if (!artNo) {
      return { sizeRate: {}, sizeBox: {}, sizePerBox: {}, sizeIdByName: {}, artGroup: "" };
    }

    try {
      const listRes = await api.get<any[]>("/arts");
      const list = Array.isArray(listRes.data) ? listRes.data : [];
      const found = list.find((a) => String(a.artNo || "").trim().toLowerCase() === artNo.trim().toLowerCase());

      let artGroup = String(
        found?.artGroupName || found?.artGroup || found?.group || found?.groupName || found?.name || "",
      ).trim();

      if (!found?.serialNumber) {
        const defaults = artDefaults[artNo] || { sizeRate: {}, sizePerBox: {} };
        return {
          sizeRate: { ...defaults.sizeRate },
          sizeBox: {},
          sizePerBox: { ...defaults.sizePerBox },
          sizeIdByName: {},
          artGroup,
        };
      }

      const det = await api.get<any>(`/arts/${found.serialNumber}`).catch(() => null);
      const detData = det?.data ?? null;
      const sizes = Array.isArray(detData?.sizes) ? detData.sizes : [];

      if (!artGroup && detData) {
        artGroup = String(detData.artGroupName || detData.artGroup || detData.group || detData.groupName || detData.name || "").trim();
      }

      const sizeRate: Record<string, string> = {};
      const sizeBox: Record<string, string> = {};
      const sizePerBox: Record<string, string> = {};
      const sizeIdByName: Record<string, number> = {};

      sizes.forEach((s: any) => {
        const name = String(s.sizeName || s.name || "").trim();
        const id = Number(s.id || s.sizeId || 0);
        if (name) {
          sizeRate[name] = s?.rate !== undefined && s?.rate !== null ? String(s.rate) : "";
          sizeBox[name] = "";
          sizePerBox[name] = "";
          if (id) sizeIdByName[name] = id;
        }
      });

      const defaults = artDefaults[artNo];
      if (defaults) {
        Object.keys(defaults.sizeRate).forEach((sizeName) => {
          const v = defaults.sizeRate[sizeName];
          if (v !== undefined && v !== null && v !== "") sizeRate[sizeName] = v;
        });

        Object.keys(defaults.sizePerBox).forEach((sizeName) => {
          const v = defaults.sizePerBox[sizeName];
          if (v !== undefined && v !== null && v !== "") sizePerBox[sizeName] = v;
        });

        Object.keys(defaults.sizeRate).forEach((sizeName) => {
          if (!(sizeName in sizeRate)) {
            sizeRate[sizeName] = defaults.sizeRate[sizeName];
            sizeBox[sizeName] = "";
            sizePerBox[sizeName] = defaults.sizePerBox[sizeName] || "";
          }
        });
      }

      return { sizeRate, sizeBox, sizePerBox, sizeIdByName, artGroup };
    } catch {
      return { sizeRate: {}, sizeBox: {}, sizePerBox: {}, sizeIdByName: {}, artGroup: "" };
    }
  };

  const handleLotPicked = async (lot: LotRecord) => {
    const rowId = lotModalForRowId;
    setLotModalOpen(false);
    setLotModalForRowId(null);
    if (rowId == null) return;

    // prevent duplicate within current challan
    setLots((prev) => prev.filter((l) => l.lotNo !== lot.lotNo));

    const artNo = (lot.artNo || "").trim();
    const lotArtGroup = String(lot.artGroup || "").trim();

    const sizesRes = await loadSizesByArtNo(artNo);
    let { sizeRate, sizeBox, sizePerBox, sizeIdByName, artGroup: artGroupFromSizes } = sizesRes;

    const cutSizeBox = lot.cutSizeBox || {};
    const cutSizePerBox = lot.cutSizePerBox || {};
    const prevPackedBox = lot.prevPackedBox || {};

    // ensure size keys include cutting sizes too (so columns appear)
    const unionKeys = new Set<string>([
      ...Object.keys(sizeRate || {}),
      ...Object.keys(sizeBox || {}),
      ...Object.keys(sizePerBox || {}),
      ...Object.keys(cutSizeBox || {}),
      ...Object.keys(cutSizePerBox || {}),
      ...Object.keys(prevPackedBox || {}),
    ]);

    unionKeys.forEach((k) => {
      if (!(k in sizeRate)) sizeRate[k] = "";
      if (!(k in sizeBox)) sizeBox[k] = "";
      if (!(k in sizePerBox)) sizePerBox[k] = "";
      if (!sizePerBox[k] && cutSizePerBox[k]) sizePerBox[k] = String(cutSizePerBox[k] || "");
    });

    const finalArtGroup = lotArtGroup || artGroupFromSizes || "";

    patchRow(rowId, {
      cuttinglotNo: lot.lotNo,
      artNo,
      workOnArt: lot.itemName || "",
      artGroup: finalArtGroup,

      sizeRate,
      sizeBox,
      sizePerBox,
      sizeIdByName,

      cutSizeBox: { ...cutSizeBox },
      cutSizePerBox: { ...cutSizePerBox },
      prevPackedBox: { ...prevPackedBox },

      pcs: "",
      amount: "0.00",
    });
  };

  // Shade
  const openShadeModalForRow = (rowId: number) => {
    setShadeModalForRowId(rowId);
    setShadeModalOpen(true);
  };

  const handleShadePicked = (shade: ShadeOpt) => {
    const rowId = shadeModalForRowId;
    setShadeModalOpen(false);
    setShadeModalForRowId(null);
    if (rowId == null) return;
    patchRow(rowId, { shade: shade.name, shadeCode: shade.code });
  };

  // -------- Save / Update --------
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
          const pcs = box * perBox;
          const rate = toNum(r.sizeRate?.[k] || 0);
          const amount = Number((pcs * rate).toFixed(2));
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

        const rowPcs = sizeDetails.reduce((sum, d) => sum + d.pcs, 0);
        const rowAmount = sizeDetails.reduce((sum, d) => sum + d.amount, 0);

        return {
          sno: idx + 1,
          cuttingLotNo: (r.cuttinglotNo || "").trim(),
          artNo: (r.artNo || "").trim(),
          workOnArt: (r.workOnArt || "").trim(),
          artGroupName: (r.artGroup || "").trim(),
          shadeCode: r.shadeCode ?? null,
          pcs: rowPcs,
          amount: Number(rowAmount.toFixed(2)),
          sizeDetails,
        };
      }),
  });

  const handleSave = async () => {
    if (isSaving) return;

    const payload = buildPayload();

    if (!payload.partyId || !date) {
      return Swal.fire("Validation", "Date and Party are required.", "warning");
    }
    if (payload.rows.length === 0) {
      return Swal.fire("Validation", "Add at least one row.", "warning");
    }
    const anyPcs = payload.rows.some(
      (r: any) => Array.isArray(r.sizeDetails) && r.sizeDetails.some((sd: any) => Number(sd.pcs) > 0),
    );
    if (!anyPcs) {
      return Swal.fire("Validation", "Please enter Box & Per/Box for at least one size.", "warning");
    }

    try {
      setIsSaving(true);

      if (editingSerial) {
        await api.put(`/packing-challans/${encodeURIComponent(editingSerial)}`, payload);
        await resetPage();
        Swal.fire({ icon: "success", title: "Updated!", timer: 1400, showConfirmButton: false });
      } else {
        await api.post("/packing-challans", payload);
        await resetPage();
        Swal.fire({ icon: "success", title: "Saved!", timer: 1400, showConfirmButton: false });
      }
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.message || "Failed to save challan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const ask = await Swal.fire({
      title: "Reset?",
      text: "This will clear the form. Continue?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset",
      cancelButtonText: "Cancel",
    });
    if (!ask.isConfirmed) return;

    await resetPage();
    Swal.fire({ icon: "success", title: "Reset Done", timer: 900, showConfirmButton: false });
  };

  const handleExit = async () => {
    const ask = await Swal.fire({
      title: "Exit?",
      text: "Are you sure you want to exit/reset this form?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
    });
    if (!ask.isConfirmed) return;

    await resetPage();
  };

  // Print (safe ASCII)
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    const party = parties.find((p) => String(p.id) === String(partyId));
    const partyName = party ? party.partyName : "";

    const printableRows = rows.filter((r) => r.cuttinglotNo || r.artNo || r.workOnArt);

    const bodyRowsHtml = printableRows
      .map((r, idx) => {
        const sizeParts = sizeColumns
          .map((s) => {
            const box = Number(r.sizeBox?.[s] || 0);
            const perBox = Number(r.sizePerBox?.[s] || 0);
            const rate = Number(r.sizeRate?.[s] || 0);
            if (!box && !perBox && !rate) return null;
            return `${s}: Box ${box || ""}, PB ${perBox || ""}, INR ${rate ? rate.toFixed(2) : ""}`;
          })
          .filter(Boolean) as string[];

        const sizeHtml = sizeParts.length ? sizeParts.join("<br/>") : "";

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${r.cuttinglotNo || ""}</td>
            <td>${r.artNo || ""}</td>
            <td>${r.artGroup || ""}</td>
            <td>${r.workOnArt || ""}</td>
            <td style="text-align:left">${sizeHtml}</td>
            <td>${r.shade || ""}</td>
            <td>${r.pcs || ""}</td>
            <td>${r.amount || ""}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
      <head>
        <title>Packing Challan</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 8px; }
          h2 { text-align:center; margin: 0 0 4px; }
          .subtitle { text-align:center; margin: 0 0 10px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #333; padding: 4px 3px; font-size: 10px; text-align: center; word-wrap: break-word; }
          thead th { background: #eee; }
          tfoot td { background: #fff59d; font-weight: 600; }
          @media print { @page { margin: 10mm; } }
        </style>
      </head>
      <body>
        <h2>Packing Challan</h2>
        <p class="subtitle">
          ${date ? `Date: ${date}` : ""}${date && partyName ? " | " : ""}${partyName ? `Party: ${partyName}` : ""}
        </p>

        <table>
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Cutting Lot No</th>
              <th>Art No</th>
              <th>Art Group</th>
              <th>Work on Art</th>
              <th>Size</th>
              <th>Shade</th>
              <th>Pcs</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right">Totals</td>
              <td style="text-align:left">Box: ${totalBox} <br/> Per/Box: ${totalPerBox}</td>
              <td></td>
              <td>${totalPcs}</td>
              <td>INR ${totalAmount.toFixed(2)}</td>
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

  // View List
  const openList = async () => {
    try {
      const { data } = await api.get<any[]>("/packing-challans");
      setListData(Array.isArray(data) ? data : []);
      setListOpen(true);
    } catch {
      setListData([]);
      setListOpen(true);
    }
  };

  const flatRows = useMemo(() => {
    const out: any[] = [];
    for (const ch of listData) {
      const chDate = ch.date || ch.dated || "";
      const partyName = ch.partyName || "";
      const chRows = Array.isArray(ch.rows) ? ch.rows : [];

      chRows.forEach((r: any) => {
        const details: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
        const sortedDetails = [...details].sort((a, b) =>
          sizeSort(String(a.sizeName || a.size || ""), String(b.sizeName || b.size || "")),
        );

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
                  `${sd.sizeName ?? sd.size ?? ""}: Box ${sd.boxCount ?? 0}, PB ${sd.perBox ?? 0}, INR ${Number(sd.rate ?? 0).toFixed(2)}`,
              )
              .join("\n")
          : "";

        out.push({
          serialNo: ch.serialNo ?? ch.serial ?? ch.challanNo ?? "",
          date: chDate,
          partyName,
          cuttingLotNo: r.cuttingLotNo || r.cutLotNo || "",
          artGroup: r.artGroupName || "",
          artNo: r.artNo || "",
          size: sizeLabel,
          shade: r.shadeName || "",
          box: details.length ? details.reduce((s: number, sd: any) => s + Number(sd.boxCount || 0), 0) : r.box || r.boxCount || 0,
          pcs: r.pcs || 0,
          amount: r.amount || 0,
        });
      });
    }

    const q = listSearch.trim().toLowerCase();
    if (!q) return out;
    return out.filter((x) => Object.values(x).some((v) => String(v).toLowerCase().includes(q)));
  }, [listData, listSearch]);

  const handleEditFromList = async (serialNo: string) => {
    try {
      const res = await api.get(`/packing-challans/${encodeURIComponent(serialNo)}`);
      const dto = res.data;

      setDate(dto.date || "");
      setPartyId(dto.partyId != null ? String(dto.partyId) : "");
      setEditingSerial(serialNo);

      const mappedRows: RowData[] = (Array.isArray(dto.rows) ? dto.rows : []).map((r: any, idx: number) => {
        const sizeRate: Record<string, string> = {};
        const sizeBox: Record<string, string> = {};
        const sizePerBox: Record<string, string> = {};
        const sizeIdByName: Record<string, number> = {};

        if (Array.isArray(r.sizeDetails)) {
          r.sizeDetails.forEach((sd: any) => {
            const name = String(sd.sizeName || sd.size || "").trim();
            if (!name) return;
            sizeRate[name] = sd.rate != null ? String(sd.rate) : "";
            sizeBox[name] = sd.boxCount != null ? String(sd.boxCount) : "";
            sizePerBox[name] = sd.perBox != null ? String(sd.perBox) : "";
            if (sd.sizeId) sizeIdByName[name] = sd.sizeId;
          });
        }

        const lotNo = normLot(r.cuttingLotNo || r.cutLotNo || "");
        const cutInfo = cuttingInfoRef.current.get(lotNo);
        const prevPacked = prevPackedRef.current.get(lotNo) || {};

        const cutSizeBox = cutInfo?.cutSizeBox || {};
        const cutSizePerBox = cutInfo?.cutSizePerBox || {};

        const keys = new Set<string>([
          ...Object.keys(sizeRate),
          ...Object.keys(sizeBox),
          ...Object.keys(sizePerBox),
          ...Object.keys(cutSizeBox),
          ...Object.keys(cutSizePerBox),
          ...Object.keys(prevPacked),
        ]);

        keys.forEach((k) => {
          if (!(k in sizeRate)) sizeRate[k] = "";
          if (!(k in sizeBox)) sizeBox[k] = "";
          if (!(k in sizePerBox)) sizePerBox[k] = "";
          if (!sizePerBox[k] && cutSizePerBox[k]) sizePerBox[k] = String(cutSizePerBox[k] || "");
        });

        return recalcRow({
          id: Date.now() + idx,
          cuttinglotNo: lotNo,
          artNo: r.artNo || "",
          artGroup: r.artGroupName || r.artGroup || "",
          workOnArt: r.workOnArt || "",
          sizeRate,
          sizeBox,
          sizePerBox,
          sizeIdByName,
          cutSizeBox,
          cutSizePerBox,
          prevPackedBox: prevPacked,
          shade: r.shadeName || "",
          shadeCode: r.shadeCode || null,
          pcs: r.pcs != null ? String(r.pcs) : "",
          amount: r.amount != null ? String(r.amount) : "0.00",
        });
      });

      setRows(mappedRows.length ? mappedRows : [makeBlankRow()]);
      setListOpen(false);

      await fetchAvailableLots();
      Swal.fire("Loaded", "Challan loaded for editing.", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load challan for edit.", "error");
    }
  };

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
      const { data } = await api.get<any[]>("/packing-challans");
      setListData(Array.isArray(data) ? data : []);
      await fetchAvailableLots();
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
        <div className="fixed inset-0 bg-black/50 z-[1500] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">Packing Challans</h2>

            <div className="flex justify-center mb-4">
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search anything..."
                className="border p-2 rounded w-full"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="border p-2 text-center">S.No</th>
                    <th className="border p-2 text-center">Date</th>
                    <th className="border p-2 text-center">Party Name</th>
                    <th className="border p-2 text-center">Cutting Lot No</th>
                    <th className="border p-2 text-center">Art Group</th>
                    <th className="border p-2 text-center">Art No</th>
                    <th className="border p-2 text-center">Size</th>
                    <th className="border p-2 text-center">Shade</th>
                    <th className="border p-2 text-center">Box</th>
                    <th className="border p-2 text-center">Pcs</th>
                    <th className="border p-2 text-center">Amount</th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map((r, i) => (
                    <tr key={i}>
                      <td className="border p-2 text-center">{i + 1}</td>
                      <td className="border p-2 text-center">{r.date}</td>
                      <td className="border p-2 text-center">{r.partyName}</td>
                      <td className="border p-2 text-center">{r.cuttingLotNo}</td>
                      <td className="border p-2 text-center">{r.artGroup}</td>
                      <td className="border p-2 text-center">{r.artNo}</td>
                      <td className="border p-2 text-center whitespace-pre-line min-w-[260px]">{r.size}</td>
                      <td className="border p-2 text-center">{r.shade}</td>
                      <td className="border p-2 text-center">{r.box}</td>
                      <td className="border p-2 text-center">{r.pcs}</td>
                      <td className="border p-2 text-center">{Number(r.amount).toFixed(2)}</td>
                      <td className="border p-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditFromList(r.serialNo)}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFromList(r.serialNo)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {flatRows.length === 0 && (
                    <tr>
                      <td className="border p-3 text-center text-gray-500" colSpan={12}>
                        No records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => setListOpen(false)}
                className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= Page ======= */}
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Packing Challan</h2>

          {/* Header */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
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
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-center">Sr No.</th>
                  <th className="border p-2 text-center">Cutting Lot No.</th>
                  <th className="border p-2 text-center">Art No</th>
                  <th className="border p-2 text-center">Art Group</th>
                  <th className="border p-2 text-center">Work on Art</th>

                  {sizeColumns.map((s) => (
                    <th key={s} className="border p-2 text-center min-w-[150px]">
                      <div className="flex flex-col items-center">
                        <div className="font-semibold">{s}</div>
                        <div className="text-[10px] font-normal text-gray-600">Cut / Prev / Pend</div>
                        <div className="text-[10px] font-normal text-gray-600">Box / Rate / PerBox</div>
                      </div>
                    </th>
                  ))}

                  <th className="border p-2 text-center">Shade</th>

                  {/* ✅ Pending Box column REMOVED */}

                  <th className="border p-2 text-center">Pcs</th>
                  <th className="border p-2 text-center">Amount</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="border p-1 text-center">{idx + 1}</td>

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full bg-yellow-50 cursor-pointer hover:bg-yellow-100"
                        value={r.cuttinglotNo}
                        readOnly
                        onClick={() => openLotModalForRow(r.id)}
                        placeholder="Click to select"
                        title="Click to select cutting lot"
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full"
                        value={r.artNo}
                        onChange={(e) => patchRow(r.id, { artNo: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full"
                        value={r.artGroup}
                        onChange={(e) => patchRow(r.id, { artGroup: e.target.value })}
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full"
                        value={r.workOnArt}
                        onChange={(e) => patchRow(r.id, { workOnArt: e.target.value })}
                      />
                    </td>

                    {sizeColumns.map((s) => {
                      const enabled =
                        Object.prototype.hasOwnProperty.call(r.sizeRate || {}, s) ||
                        Object.prototype.hasOwnProperty.call(r.sizeBox || {}, s) ||
                        Object.prototype.hasOwnProperty.call(r.sizePerBox || {}, s) ||
                        Object.prototype.hasOwnProperty.call(r.cutSizeBox || {}, s);

                      const cut = toNum(r.cutSizeBox?.[s] || 0);
                      const prev = toNum(r.prevPackedBox?.[s] || 0);
                      const pend = pendingForSize(r, s);

                      return (
                        <td key={s} className="border p-1 align-top">
                          <div className={enabled ? "" : "opacity-60"}>
                            <div className="text-[10px] text-gray-700 mb-1">
                              <span className="font-semibold">Cut:</span> {cut || 0} <span className="mx-1">|</span>
                              <span className="font-semibold">Prev:</span> {prev || 0} <span className="mx-1">|</span>
                              <span className={`font-semibold ${pend > 0 ? "text-red-700" : "text-gray-700"}`}>Pend:</span>{" "}
                              <span className={pend > 0 ? "text-red-700 font-bold" : ""}>{pend || 0}</span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={r.sizeBox[s] || ""}
                                onChange={(e) => handleSizeBoxChange(r.id, s, e.target.value)}
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right ${enabled ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                placeholder="Box"
                              />

                              <input
                                type="text"
                                value={r.sizeRate[s] || ""}
                                onChange={(e) => handleSizeRateChange(r.id, s, e.target.value)}
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right ${enabled ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                placeholder="Rate"
                              />

                              <input
                                type="text"
                                value={r.sizePerBox[s] || ""}
                                onChange={(e) => handleSizePerBoxChange(r.id, s, e.target.value)}
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right ${enabled ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                placeholder="Per/Box"
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="border p-1">
                      <input
                        className="border p-1 rounded w-full bg-yellow-50 cursor-pointer hover:bg-yellow-100"
                        value={r.shade}
                        readOnly
                        onClick={() => openShadeModalForRow(r.id)}
                        placeholder="Click to select"
                        title="Click to select shade"
                      />
                    </td>

                    {/* ✅ Pending Box cell REMOVED */}

                    <td className="border p-1">
                      <input readOnly className="border p-1 rounded w-full bg-gray-100 text-right" value={r.pcs} />
                    </td>

                    <td className="border p-1">
                      <input readOnly className="border p-1 rounded w-full bg-gray-100 text-right" value={r.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals (Pending total removed) */}
          <div className="flex flex-wrap items-center justify-end gap-6 mt-4 font-semibold">
            <p>Total Box: {totalBox}</p>
            <p>Total Per/Box: {totalPerBox}</p>
            <p>Total Pcs: {totalPcs}</p>
            <p>Total Amount: INR {totalAmount.toFixed(2)}</p>
          </div>

          {/* Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addBlankRow} className="px-4 py-2 bg-blue-500 text-white rounded">
              Add Row
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (editingSerial ? "Updating..." : "Saving...") : editingSerial ? "Update" : "Save"}
            </button>

            <button onClick={handleReset} className="px-4 py-2 bg-gray-500 text-white rounded">
              Reset
            </button>

            <button onClick={handlePrint} className="px-4 py-2 bg-yellow-500 text-white rounded">
              Print
            </button>

            <button onClick={openList} className="px-4 py-2 bg-slate-700 text-white rounded">
              View List
            </button>

            <button onClick={handleExit} className="px-4 py-2 bg-red-600 text-white rounded">
              Exit
            </button>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default PackingChallan;