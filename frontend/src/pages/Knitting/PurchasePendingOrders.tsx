// src/components/Knitting/PurchasePendingOrders.tsx
import React, { useEffect, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";

type Party = { id: number; partyName: string };
type Item  = { id: number; itemName: string };

type PendingRow = {
  id: number;
  orderNo: string;
  orderDate: string;
  partyName: string;
  itemName: string;
  orderReceived: number;
  orderDelivered: number;
  orderPending: number;
};

const PurchasePendingOrders: React.FC = () => {
  const [asOnDate, setAsOnDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<number[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectAllParties, setSelectAllParties] = useState(false);
  const [selectAllItems, setSelectAllItems] = useState(false);
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(false);

  // NEW: show the report view like Material Stock Report
  const [showReportView, setShowReportView] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [pRes, iRes] = await Promise.all([
          api.get<Party[]>("/party/category/Purchase"),
          api.get<Item[]>("/purchase-orders/items"),
        ]);
        setParties(pRes.data || []);
        setItems(iRes.data || []);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load parties/items", "error");
      }
    };
    loadMeta();
  }, []);

  const toggleParty = (id: number) =>
    setSelectedPartyIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleItem = (id: number) =>
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectAllParties = (checked: boolean) => {
    setSelectAllParties(checked);
    setSelectedPartyIds(checked ? parties.map(p => p.id) : []);
  };
  const handleSelectAllItems = (checked: boolean) => {
    setSelectAllItems(checked);
    setSelectedItemIds(checked ? items.map(i => i.id) : []);
  };

  const showReport = async () => {
    if (selectedPartyIds.length === 0) return Swal.fire("Select at least one party", "", "warning");
    if (selectedItemIds.length === 0) return Swal.fire("Select at least one item", "", "warning");

    try {
      setLoading(true);
      const payload = { date: asOnDate, partyIds: selectedPartyIds, itemIds: selectedItemIds };
      const res = await api.post<PendingRow[]>("/purchase-orders/pending-report", payload);
      setRows(res.data || []);
      setShowReportView(true); // switch to report view
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err?.response?.data?.message || "Failed to fetch report", "error");
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (selectedPartyIds.length && selectedItemIds.length) showReport();
    else Swal.fire("Info", "Please select party and item then click Show Report", "info");
  };

  const handlePrint = () => {
    const w = window.open("", "_blank")!;
    const html = `
      <html><head><title>Pending Purchase Orders</title>
      <style>
        body { font-family: Arial; padding: 12px; }
        h2 { text-align:center; margin: 0 0 8px; }
        table { width:100%; border-collapse:collapse; }
        th,td { border:1px solid #333; padding:6px; font-size:12px; text-align:center; }
        thead th { background:#eee; }
        tfoot td { background:#fff59d; font-weight:600; }
      </style></head>
      <body>
        <h2>Purchase Pending Orders (As On: ${asOnDate})</h2>
        <table>
          <thead>
            <tr>
              <th>Sr.No</th><th>Order No</th><th>Date</th><th>Party Name</th>
              <th>Item Name</th><th>Order Recei</th><th>Order Deliv</th><th>Order Pendi</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.orderNo}</td>
                <td>${r.orderDate}</td>
                <td>${r.partyName}</td>
                <td>${r.itemName}</td>
                <td>${Number(r.orderReceived||0).toFixed(3)}</td>
                <td>${Number(r.orderDelivered||0).toFixed(3)}</td>
                <td>${Number(r.orderPending||0).toFixed(3)}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right">Total</td>
              <td>${rows.reduce((s,r)=>s+Number(r.orderReceived||0),0).toFixed(3)}</td>
              <td>${rows.reduce((s,r)=>s+Number(r.orderDelivered||0),0).toFixed(3)}</td>
              <td>${rows.reduce((s,r)=>s+Number(r.orderPending||0),0).toFixed(3)}</td>
            </tr>
          </tfoot>
        </table>
      </body></html>`;
    w.document.write(html); w.document.close(); w.print();
  };

  // const _totals = useMemo(() => ({
  //   received: rows.reduce((s,r)=>s+Number(r.orderReceived||0),0),
  //   delivered: rows.reduce((s,r)=>s+Number(r.orderDelivered||0),0),
  //   pending: rows.reduce((s,r)=>s+Number(r.orderPending||0),0),
  // }), [rows]);

  // NEW: Back from report view
  const handleBack = () => {
    setShowReportView(false);
    // keep selections so user can tweak and show again
  };

  return (
    <Dashboard>
      <div className="mx-auto p-6 max-w-6xl">

        {/* ===================== Filter + Buttons (UNCHANGED), hidden in report view ===================== */}
        {!showReportView && (
          <div className="bg-white shadow-lg p-6 rounded-2xl">
            <h2 className="mb-4 font-bold text-2xl text-center">Purchase Pending Orders</h2>

            <div className="flex items-center gap-4 mb-4">
              <label className="font-medium">Orders Pending As On</label>
              <input
                type="date"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="gap-6 grid grid-cols-2">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">Party</div>
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectAllParties}
                      onChange={(e)=>handleSelectAllParties(e.target.checked)}
                    /> Select All/Unselect All
                  </label>
                </div>
                <div className="p-2 border rounded h-48 overflow-auto">
                  {parties.length===0 ? (
                    <div className="text-gray-500 text-sm">No parties found</div>
                  ) : (
                    parties.map(p=>(
                      <div key={p.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={selectedPartyIds.includes(p.id)}
                          onChange={()=>toggleParty(p.id)}
                          className="mr-2"
                        />
                        <div className="text-sm">{p.partyName}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">Item</div>
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectAllItems}
                      onChange={(e)=>handleSelectAllItems(e.target.checked)}
                    /> Select All/Unselect All
                  </label>
                </div>
                <div className="p-2 border rounded h-48 overflow-auto">
                  {items.length===0 ? (
                    <div className="text-gray-500 text-sm">No items found</div>
                  ) : (
                    items.map(it=>(
                      <div key={it.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(it.id)}
                          onChange={()=>toggleItem(it.id)}
                          className="mr-2"
                        />
                        <div className="text-sm">{it.itemName}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* BUTTONS — left untouched */}
            <div className="flex gap-3 mt-4">
              <button onClick={showReport} className="bg-indigo-600 shadow px-4 py-2 rounded text-white">Show Report</button>
              <button onClick={refresh} className="bg-green-600 shadow px-4 py-2 rounded text-white">Refresh</button>
              <button onClick={handlePrint} className="bg-gray-700 shadow px-4 py-2 rounded text-white">Print</button>
            </div>
          </div>
        )}

        {/* ===================== Report View (Styled like Material Stock Report) ===================== */}
        {showReportView && (
          <>
            <div id="printArea" className="bg-white shadow-md mx-auto mt-2 p-6 rounded-2xl w-full">
              <h2 className="mb-6 font-semibold text-gray-800 text-2xl text-center">
                Purchase Pending Orders
              </h2>

              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600 text-sm">
                  As on: {asOnDate || "-"}
                </p>
              </div>

              {loading ? (
                <div className="p-6 text-center">Loading...</div>
              ) : rows.length === 0 ? (
                <div className="py-8 text-gray-600 text-center">No pending orders found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="border min-w-full text-sm text-center">
                    <thead className="bg-gray-200 text-gray-700">
                      <tr>
                        <th className="px-2 py-2 border">#</th>
                        <th className="px-2 py-2 border">Order No</th>
                        <th className="px-2 py-2 border">Date</th>
                        <th className="px-2 py-2 border">Party Name</th>
                        <th className="px-2 py-2 border">Item Name</th>
                        <th className="px-2 py-2 border">Order Received</th>
                        <th className="px-2 py-2 border">Order Delivered</th>
                        <th className="px-2 py-2 border">Order Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, index) => (
                        <tr key={r.id} className="hover:bg-gray-100">
                          <td className="px-2 py-2 border">{index + 1}</td>
                          <td className="px-2 py-2 border">{r.orderNo}</td>
                          <td className="px-2 py-2 border">{r.orderDate}</td>
                          <td className="px-2 py-2 border">{r.partyName}</td>
                          <td className="px-2 py-2 border">{r.itemName}</td>
                          <td className="px-2 py-2 border text-right">{Number(r.orderReceived || 0).toFixed(3)}</td>
                          <td className="px-2 py-2 border text-right">{Number(r.orderDelivered || 0).toFixed(3)}</td>
                          <td className="bg-yellow-100 px-2 py-2 border font-semibold text-green-700 text-right">
                            {Number(r.orderPending || 0).toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="px-2 py-2 border font-semibold" colSpan={5}>Total</td>
                        <td className="px-2 py-2 border font-semibold text-right">
                          {rows.reduce((s, r) => s + Number(r.orderReceived || 0), 0).toFixed(3)}
                        </td>
                        <td className="px-2 py-2 border font-semibold text-right">
                          {rows.reduce((s, r) => s + Number(r.orderDelivered || 0), 0).toFixed(3)}
                        </td>
                        <td className="px-2 py-2 border font-semibold text-green-700 text-right">
                          {rows.reduce((s, r) => s + Number(r.orderPending || 0), 0).toFixed(3)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {/* Report view buttons (like Material Stock Report) */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleBack}
                className="bg-gray-500 hover:bg-gray-600 px-6 py-2 rounded-lg text-white"
              >
                Back
              </button>
              <button
                onClick={handlePrint}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-white"
              >
                Print
              </button>
            </div>
            </div>
          </>
        )}
      </div>
    </Dashboard>
  );
};

export default PurchasePendingOrders;
