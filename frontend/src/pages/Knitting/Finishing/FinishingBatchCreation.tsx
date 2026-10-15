import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

type IdLike = number | string;
interface Party { id?: IdLike; partyName?: string; name?: string; category?: { categoryName?: string }; }
interface InwardRow {
  id?: number; lotNo?: string; itemName?: string; shade?: string; processing?: string;
  rolls?: string | number; weight?: string | number; receivedWeight?: string | number;
  wastage?: string | number; extraWt?: string | number; percentage?: string | number;
  rateFND?: string | number; rate?: string | number; amount?: string | number;
}
interface InwardDoc { id: number; dated?: string; date?: string; partyName?: string; challanNo?: string; rows?: InwardRow[]; }
interface BatchLot {
  id?: number; inwardId: number; inwardRowId?: number; uniqueKey: string; lotNo: string;
  itemName: string; shade: string; processing: string; rolls: string; weight: string;
  receivedWeight: string; wastage: string; extraWt: string; percentage: string;
  rateFND: string; rate: string; amount: string; date: string; challanNo: string; partyName: string;
}
interface BatchRecord { id: number; batchName: string; partyName: string; batchDate?: string; createdAt?: string; lots: BatchLot[]; }
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const amountFor = (weight: any, rate: any) => (num(weight) * num(rate)).toFixed(2);
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const dateInput = (v?: any) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s); if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10);
};
const fmtDate = (v?: any) => {
  const s = dateInput(v); if (!s) return "-";
  const [y,m,d] = s.split("-"); return `${d}/${m}/${y.slice(-2)}`;
};
const escapeHtml = (v: any) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const errMsg = (e: any) => e?.response?.data?.message || e?.response?.data?.error || e?.message || "Something went wrong";

const FinishingBatchCreation: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [partyName, setPartyName] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchDate, setBatchDate] = useState(today());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inwardLots, setInwardLots] = useState<BatchLot[]>([]);
  const [selectedLots, setSelectedLots] = useState<BatchLot[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [lotSearch, setLotSearch] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const loadParties = async () => {
    try {
      const r = await api.get("/party/category/Finishing");
      setParties(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      // Fallback for installations that expose only /party/all.
      try {
        const r = await api.get("/party/all");
        const data = Array.isArray(r.data) ? r.data : [];
        setParties(data.filter((p: Party) => (p.category?.categoryName || "").toLowerCase() === "finishing"));
      } catch { Swal.fire("Error", "Failed to load Finishing parties.", "error"); }
    }
  };
  const loadBatches = async () => {
    try { setLoadingBatches(true); const r = await api.get("/finishing-batch"); setBatches(Array.isArray(r.data) ? r.data : []); }
    catch (e) { Swal.fire("Error", errMsg(e), "error"); }
    finally { setLoadingBatches(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadParties(); loadBatches(); }, []);

  const usedKeys = () => {
    const set = new Set<string>();
    batches.forEach(b => (b.lots || []).forEach(l => set.add(l.uniqueKey || `${l.inwardId}-${l.inwardRowId ?? 0}-${l.lotNo}`)));
    return set;
  };
  const loadAvailableLots = async (party: string, editingBatchId: number | null = null) => {
    if (!party.trim()) { setInwardLots([]); return; }
    try {
      setLoadingLots(true);
      const r = await api.get("/finishing-inwards");
      const docs: InwardDoc[] = Array.isArray(r.data) ? r.data : [];
      const used = usedKeys();
      if (editingBatchId) {
        const current = batches.find(b => b.id === editingBatchId);
        (current?.lots || []).forEach(l => used.delete(l.uniqueKey || `${l.inwardId}-${l.inwardRowId ?? 0}-${l.lotNo}`));
      }
      const result: BatchLot[] = [];
      docs.forEach(doc => {
        if ((doc.partyName || "").trim().toLowerCase() !== party.trim().toLowerCase()) return;
        (Array.isArray(doc.rows) ? doc.rows : []).forEach((row, idx) => {
          const lotNo = String(row.lotNo || "").trim();
          if (!lotNo) return;
          const key = `${doc.id}-${row.id ?? idx}-${lotNo}`;
          if (used.has(key)) return;
          result.push({
            inwardId: Number(doc.id), inwardRowId: row.id, uniqueKey: key, lotNo,
            itemName: String(row.itemName || ""), shade: String(row.shade || ""),
            processing: String(row.processing || ""), rolls: String(row.rolls ?? ""),
            weight: String(row.weight ?? ""), receivedWeight: String(row.receivedWeight ?? ""),
            wastage: String(row.wastage ?? ""), extraWt: String(row.extraWt ?? ""),
            percentage: String(row.percentage ?? ""), rateFND: String(row.rateFND ?? ""),
            rate: String(row.rate ?? ""), amount: amountFor(row.weight, row.rate),
            date: String(doc.dated || doc.date || ""), challanNo: String(doc.challanNo || ""),
            partyName: String(doc.partyName || party),
          });
        });
      });
      setInwardLots(result);
    } catch (e) { Swal.fire("Error", errMsg(e), "error"); }
    finally { setLoadingLots(false); }
  };

  const filteredParties = useMemo(() => parties.filter(p => String(p.partyName || p.name || "").toLowerCase().includes(partySearch.toLowerCase())), [parties, partySearch]);
  const filteredLots = useMemo(() => {
    const q = lotSearch.trim().toLowerCase();
    return inwardLots.filter(l => !q || [l.lotNo,l.itemName,l.shade,l.processing,l.challanNo,l.date].join(" ").toLowerCase().includes(q));
  }, [inwardLots, lotSearch]);
  const filteredBatches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase();
    return batches.filter(b => {
      const d = dateInput(b.batchDate || b.createdAt);
      if (dateFrom && (!d || d < dateFrom)) return false;
      if (dateTo && (!d || d > dateTo)) return false;
      const searchable = [b.batchName,b.partyName,...(b.lots || []).flatMap(l => [l.lotNo,l.itemName,l.shade,l.challanNo])].join(" ").toLowerCase();
      return !q || searchable.includes(q);
    }).sort((a,b) => String(b.batchDate || b.createdAt || "").localeCompare(String(a.batchDate || a.createdAt || "")));
  }, [batches,batchSearch,dateFrom,dateTo]);

  const toggleLot = (lot: BatchLot) => setSelectedLots(prev => prev.some(x => x.uniqueKey === lot.uniqueKey) ? prev.filter(x => x.uniqueKey !== lot.uniqueKey) : [...prev, {...lot}]);
  const selectAllLots = () => setSelectedLots(prev => {
    const map = new Map(prev.map(l => [l.uniqueKey,l]));
    filteredLots.forEach(l => map.set(l.uniqueKey,l));
    return Array.from(map.values());
  });
  const updateRate = (key: string, rate: string) => setSelectedLots(prev => prev.map(l => l.uniqueKey === key ? {...l,rate,amount:amountFor(l.weight,rate)} : l));

  const reset = () => { setPartyName(""); setBatchName(""); setBatchDate(today()); setSelectedLots([]); setInwardLots([]); setEditingId(null); setLotSearch(""); };
  const saveBatch = async () => {
    if (!partyName.trim()) return void Swal.fire("Party Required","Please select a Finishing party.","warning");
    if (!batchName.trim()) return void Swal.fire("Batch Name Required","Please enter batch name.","warning");
    if (!batchDate) return void Swal.fire("Date Required","Please select batch date.","warning");
    if (!selectedLots.length) return void Swal.fire("Lot Required","Please select at least one Finishing Inward lot.","warning");
    const payload = {
      id: editingId || undefined, batchName: batchName.trim(), partyName: partyName.trim(), batchDate,
      lots: selectedLots.map(l => ({...l, amount: amountFor(l.weight,l.rate)})),
    };
    try {
      setLoading(true);
      const response = editingId ? await api.put(`/finishing-batch/${editingId}`,payload) : await api.post("/finishing-batch",payload);
      const saved = response.data as BatchRecord;
      setBatches(prev => editingId ? prev.map(b => b.id === editingId ? saved : b) : [saved,...prev]);
      await Swal.fire("Success",editingId ? "Finishing batch updated." : "Finishing batch created.","success");
      reset();
    } catch (e) { Swal.fire("Error",errMsg(e),"error"); }
    finally { setLoading(false); }
  };
  const editBatch = async (b: BatchRecord) => {
    try {
      const r = await api.get(`/finishing-batch/${b.id}`);
      const data: BatchRecord = r.data;
      setEditingId(data.id); setBatchName(data.batchName); setPartyName(data.partyName); setBatchDate(dateInput(data.batchDate || data.createdAt) || today());
      setSelectedLots((data.lots || []).map(l => ({...l,uniqueKey:l.uniqueKey || `${l.inwardId}-${l.inwardRowId ?? 0}-${l.lotNo}`})));
      await loadAvailableLots(data.partyName,data.id);
      window.scrollTo({top:0,behavior:"smooth"});
    } catch (e) { Swal.fire("Error",errMsg(e),"error"); }
  };
  const deleteBatch = async (b: BatchRecord) => {
    const result = await Swal.fire({title:"Delete batch?",text:`${b.batchName} — ${b.partyName}`,icon:"warning",showCancelButton:true,confirmButtonText:"Delete",confirmButtonColor:"#dc2626"});
    if (!result.isConfirmed) return;
    try { await api.delete(`/finishing-batch/${b.id}`); setBatches(prev => prev.filter(x => x.id !== b.id)); if (editingId === b.id) reset(); Swal.fire("Deleted","Batch deleted. Its lots are available again.","success"); }
    catch (e) { Swal.fire("Error",errMsg(e),"error"); }
  };
  const printBatches = (items: BatchRecord[]) => {
    if (!items.length) return void Swal.fire("No Data","No batches match the current filters.","info");
    const win = window.open("","_blank");
    if (!win) return void Swal.fire("Popup Blocked","Please allow popups to print.","warning");
    const html = `<!doctype html><html><head><title>Finishing Batch List</title><style>
      body{font-family:Arial,sans-serif;margin:18px;color:#111}h2{text-align:center;margin:0 0 4px}
      .meta{margin:12px 0;font-size:12px}table{border-collapse:collapse;width:100%;font-size:10px;margin-bottom:20px}
      th,td{border:1px solid #555;padding:5px;text-align:left}th{background:#eee}.batch{page-break-inside:avoid;margin-bottom:22px}
      @media print{.batch{page-break-inside:avoid}}
      </style></head><body><h2>Finishing Batch List</h2><div class="meta">Date filter: ${escapeHtml(dateFrom ? fmtDate(dateFrom) : "Start")} to ${escapeHtml(dateTo ? fmtDate(dateTo) : "End")} | Total batches: ${items.length}</div>
      ${items.map(b=>`<section class="batch"><h3>${escapeHtml(b.batchName)} — ${escapeHtml(b.partyName)}</h3><div class="meta">Batch Date: ${escapeHtml(fmtDate(b.batchDate || b.createdAt))}</div>
      <table><thead><tr><th>#</th><th>Lot No</th><th>Item</th><th>Shade</th><th>Processing</th><th>Inward Challan</th><th>Rolls</th><th>Weight</th><th>Received Wt</th><th>Wastage</th><th>Extra Wt</th><th>%</th><th>Rate FND</th><th>Finishing Rate</th><th>Amount</th></tr></thead><tbody>
      ${(b.lots||[]).map((l,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(l.lotNo)}</td><td>${escapeHtml(l.itemName)}</td><td>${escapeHtml(l.shade)}</td><td>${escapeHtml(l.processing)}</td><td>${escapeHtml(l.challanNo)}</td><td>${escapeHtml(l.rolls)}</td><td>${escapeHtml(l.weight)}</td><td>${escapeHtml(l.receivedWeight)}</td><td>${escapeHtml(l.wastage)}</td><td>${escapeHtml(l.extraWt)}</td><td>${escapeHtml(l.percentage)}</td><td>${escapeHtml(l.rateFND)}</td><td>${escapeHtml(l.rate)}</td><td>${escapeHtml(amountFor(l.weight,l.rate))}</td></tr>`).join("")}
      </tbody></table></section>`).join("")}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();};</script></body></html>`;
    win.document.open(); win.document.write(html); win.document.close();
  };
  const totals = useMemo(() => selectedLots.reduce((a,l)=>({rolls:a.rolls+num(l.rolls),weight:a.weight+num(l.weight),amount:a.amount+num(amountFor(l.weight,l.rate))}),{rolls:0,weight:0,amount:0}),[selectedLots]);

  return <Dashboard>
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-xl bg-white p-5 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-800">Finishing Batch Creation</h1><p className="text-sm text-gray-500">Create batches from Finishing Inward lots, party-wise.</p></div><button onClick={reset} className="rounded-lg border px-4 py-2 hover:bg-gray-50">New Batch</button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-semibold">Finishing Party *</label><div className="flex gap-2"><input value={partyName} readOnly placeholder="Select party" className="min-w-0 flex-1 rounded-lg border bg-gray-50 px-3 py-2"/><button onClick={()=>{setPartySearch("");setShowPartyModal(true);}} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Select</button></div></div>
            <div><label className="mb-1 block text-sm font-semibold">Batch Name *</label><input value={batchName} onChange={e=>setBatchName(e.target.value)} placeholder="Enter batch name" className="w-full rounded-lg border px-3 py-2"/></div>
            <div><label className="mb-1 block text-sm font-semibold">Batch Date * <span className="font-normal text-gray-500">(DD/MM/YY: {fmtDate(batchDate)})</span></label><input type="date" value={batchDate} onChange={e=>setBatchDate(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={()=>loadAvailableLots(partyName,editingId).then(()=>setShowLotModal(true))} disabled={!partyName || loadingLots} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{loadingLots?"Loading lots...":"Select Finishing Inward Lots"}</button>
            <button onClick={()=>setSelectedLots([])} disabled={!selectedLots.length} className="rounded-lg border px-4 py-2 disabled:opacity-50">Clear Selected</button>
            <div className="ml-auto self-center text-sm text-gray-600">Selected: <b>{selectedLots.length}</b> | Rolls: <b>{totals.rolls}</b> | Weight: <b>{totals.weight.toFixed(3)}</b> | Amount: <b>₹{totals.amount.toFixed(2)}</b></div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1300px] text-sm"><thead className="bg-gray-100"><tr>{["#","Lot No","Item Name","Shade","Processing","Inward Challan","Rolls","Weight","Received Wt","Wastage","Extra Wt","%","Rate FND","Finishing Rate","Amount","Remove"].map(h=><th key={h} className="border-b p-2 text-left">{h}</th>)}</tr></thead><tbody>
              {selectedLots.map((l,i)=><tr key={l.uniqueKey} className="hover:bg-gray-50"><td className="border-b p-2">{i+1}</td><td className="border-b p-2">{l.lotNo}</td><td className="border-b p-2">{l.itemName}</td><td className="border-b p-2">{l.shade}</td><td className="border-b p-2">{l.processing}</td><td className="border-b p-2">{l.challanNo}</td><td className="border-b p-2">{l.rolls}</td><td className="border-b p-2">{l.weight}</td><td className="border-b p-2">{l.receivedWeight}</td><td className="border-b p-2">{l.wastage}</td><td className="border-b p-2">{l.extraWt}</td><td className="border-b p-2">{l.percentage}</td><td className="border-b p-2">{l.rateFND}</td><td className="border-b p-2"><input type="number" step="any" value={l.rate} onChange={e=>updateRate(l.uniqueKey,e.target.value)} className="w-24 rounded border px-2 py-1"/></td><td className="border-b p-2">{amountFor(l.weight,l.rate)}</td><td className="border-b p-2"><button onClick={()=>setSelectedLots(prev=>prev.filter(x=>x.uniqueKey!==l.uniqueKey))} className="text-red-600">Remove</button></td></tr>)}
              {!selectedLots.length && <tr><td colSpan={16} className="p-8 text-center text-gray-500">No lots selected. Select lots from Finishing Inward.</td></tr>}
            </tbody></table>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3"><button onClick={reset} className="rounded-lg border px-5 py-2">Cancel</button><button onClick={saveBatch} disabled={loading} className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white disabled:opacity-50">{loading?"Saving...":editingId?"Update Batch":"Save Batch"}</button></div>
        </section>
        <section className="rounded-xl bg-white p-5 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Saved Finishing Batch List</h2><p className="text-sm text-gray-500">Filter by batch date; Print All prints only the filtered results.</p></div><button onClick={loadBatches} className="rounded-lg border px-4 py-2">{loadingBatches?"Refreshing...":"Refresh List"}</button></div>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div><label className="mb-1 block text-xs font-semibold">From Date</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></div>
            <div><label className="mb-1 block text-xs font-semibold">To Date</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></div>
            <div className="md:col-span-2"><label className="mb-1 block text-xs font-semibold">Search batch / party / lot / item</label><input value={batchSearch} onChange={e=>setBatchSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border px-3 py-2"/></div>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-gray-600">Showing <b>{filteredBatches.length}</b> of {batches.length} batches</span><div className="flex gap-2"><button onClick={()=>{setDateFrom("");setDateTo("");setBatchSearch("");}} className="rounded-lg border px-4 py-2">Clear Filters</button><button onClick={()=>printBatches(filteredBatches)} className="rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white">Print All ({filteredBatches.length})</button></div></div>
          <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-100"><tr>{["#","Batch Date","Batch Name","Party","Lots","Total Weight","Total Amount","Actions"].map(h=><th key={h} className="border-b p-3 text-left">{h}</th>)}</tr></thead><tbody>
            {filteredBatches.map((b,i)=>{const weight=(b.lots||[]).reduce((s,l)=>s+num(l.weight),0);const amount=(b.lots||[]).reduce((s,l)=>s+num(amountFor(l.weight,l.rate)),0);return <tr key={b.id} className="hover:bg-gray-50"><td className="border-b p-3">{i+1}</td><td className="border-b p-3">{fmtDate(b.batchDate||b.createdAt)}</td><td className="border-b p-3 font-semibold">{b.batchName}</td><td className="border-b p-3">{b.partyName}</td><td className="border-b p-3">{b.lots?.length||0}</td><td className="border-b p-3">{weight.toFixed(3)}</td><td className="border-b p-3">₹{amount.toFixed(2)}</td><td className="border-b p-3"><div className="flex gap-2"><button onClick={()=>printBatches([b])} className="rounded border px-3 py-1">Print</button><button onClick={()=>editBatch(b)} className="rounded bg-blue-600 px-3 py-1 text-white">Edit</button><button onClick={()=>deleteBatch(b)} className="rounded bg-red-600 px-3 py-1 text-white">Delete</button></div></td></tr>})}
            {!filteredBatches.length&&<tr><td colSpan={8} className="p-8 text-center text-gray-500">{loadingBatches?"Loading batches...":"No batches found for selected filters."}</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </div>
    {showPartyModal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">Select Finishing Party</h3><button onClick={()=>setShowPartyModal(false)} className="text-2xl">×</button></div><input autoFocus value={partySearch} onChange={e=>setPartySearch(e.target.value)} placeholder="Search party..." className="mb-3 w-full rounded-lg border px-3 py-2"/><div className="max-h-[55vh] overflow-auto">{filteredParties.map((p,i)=>{const name=String(p.partyName||p.name||"");return <button key={String(p.id??i)} onClick={()=>{setPartyName(name);setSelectedLots([]);setShowPartyModal(false);setInwardLots([]);}} className="block w-full border-b px-3 py-3 text-left hover:bg-blue-50">{name}</button>})}{!filteredParties.length&&<p className="p-5 text-center text-gray-500">No Finishing parties found.</p>}</div></div></div>}
    {showLotModal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"><div className="flex max-h-[94vh] w-full max-w-[1500px] flex-col rounded-xl bg-white shadow-xl"><div className="border-b p-4"><div className="flex items-center justify-between"><div><h3 className="text-xl font-bold">Select Finishing Inward Lots</h3><p className="text-sm text-gray-500">Only lots for party: <b>{partyName}</b></p></div><button onClick={()=>setShowLotModal(false)} className="text-3xl">×</button></div><div className="mt-3 flex flex-wrap gap-2"><input value={lotSearch} onChange={e=>setLotSearch(e.target.value)} placeholder="Search lot / item / shade / challan..." className="min-w-[250px] flex-1 rounded-lg border px-3 py-2"/><button onClick={selectAllLots} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Select All Filtered</button><button onClick={()=>setSelectedLots([])} className="rounded-lg border px-4 py-2">Clear Selection</button></div><p className="mt-2 text-sm text-gray-600">Available: {filteredLots.length} | Selected: {selectedLots.length}</p></div><div className="flex-1 overflow-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="sticky top-0 bg-gray-100"><tr>{["Select","Lot","Item","Shade","Processing","Date","Challan","Rolls","Weight","Received Wt","Wastage","%"].map(h=><th key={h} className="border-b p-2 text-left">{h}</th>)}</tr></thead><tbody>{filteredLots.map(l=><tr key={l.uniqueKey} className="hover:bg-gray-50"><td className="border-b p-2"><input type="checkbox" checked={selectedLots.some(x=>x.uniqueKey===l.uniqueKey)} onChange={()=>toggleLot(l)}/></td><td className="border-b p-2">{l.lotNo}</td><td className="border-b p-2">{l.itemName}</td><td className="border-b p-2">{l.shade}</td><td className="border-b p-2">{l.processing}</td><td className="border-b p-2">{fmtDate(l.date)}</td><td className="border-b p-2">{l.challanNo}</td><td className="border-b p-2">{l.rolls}</td><td className="border-b p-2">{l.weight}</td><td className="border-b p-2">{l.receivedWeight}</td><td className="border-b p-2">{l.wastage}</td><td className="border-b p-2">{l.percentage}</td></tr>)}{!filteredLots.length&&<tr><td colSpan={12} className="p-8 text-center text-gray-500">{loadingLots?"Loading...":"No unused lots for this party."}</td></tr>}</tbody></table></div><div className="flex justify-end gap-2 border-t p-4"><button onClick={()=>setShowLotModal(false)} className="rounded-lg border px-5 py-2">Done</button></div></div></div>}
  </Dashboard>;
};
export default FinishingBatchCreation;
