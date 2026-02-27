import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

interface RowData {
  materialId: number | null;
  materialName: string;
  shadeCode: string;
  shadeName: string;
  rolls: string;
  wtBox: string;
  weight: string;
  rate: string;
  amount: string;
  unit: string;
}

const KnittingMaterialReturn: React.FC = () => {
  const [partyList, setPartyList] = useState<any[]>([]);
  const [outwardList, setOutwardList] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [selectedChallan, setSelectedChallan] = useState<string>("");
  const [rows, setRows] = useState<RowData[]>([]);
  const [challanNo, setChallanNo] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showList, setShowList] = useState<boolean>(false);
  const [returns, setReturns] = useState<any[]>([]);
  const [, setLoadingList] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    api.get("/party/category/Knitting")
      .then(res => setPartyList(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedParty) {
      setOutwardList([]);
      setSelectedChallan("");
      return;
    }
    api.get(`/knitting-material-return/outwards/by-party/${selectedParty}`)
      .then(res => setOutwardList(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOutwardList([]));
  }, [selectedParty]);

  useEffect(() => {
    if (!selectedChallan || editingId) return;
    api.get(`/knitting-material-return/outwards/items/${selectedChallan}`)
      .then(res => {
        const mapped = (Array.isArray(res.data) ? res.data : []).map((i: any) => ({
          materialId: i.material?.id ?? null,
          materialName: i.material?.materialName ?? "",
          shadeCode: i.shade?.shadeCode ?? "",
          shadeName: i.shade?.shadeName ?? "",
          rolls: String(i.roll || ""),
          wtBox: String(i.wtPerBox || ""),
          weight: String(i.weight || ""),
          rate: String(i.rate || ""),
          amount: (Number(i.weight || 0) * Number(i.rate || 0)).toFixed(2),
          unit: i.unit ?? "",
        }));
        setRows(mapped);
      })
      .catch(() => setRows([]));
  }, [selectedChallan, editingId]);

  const handleInputChange = (index: number, field: keyof RowData, value: string) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    if (field === "weight" || field === "rate") {
      const wt = parseFloat(updated[index].weight) || 0;
      const rt = parseFloat(updated[index].rate) || 0;
      updated[index].amount = (wt * rt).toFixed(2);
    }
    setRows(updated);
  };

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        materialId: null,
        materialName: "",
        shadeCode: "",
        shadeName: "",
        rolls: "",
        wtBox: "",
        weight: "",
        rate: "",
        amount: "",
        unit: "",
      },
    ]);
  };

  const clearForm = () => {
    setSelectedParty("");
    setSelectedChallan("");
    setChallanNo("");
    setDate("");
    setRows([]);
    setEditingId(null);
  };

  const handlePrint = () => {
  const partyName =
    partyList.find((p) => String(p.id) === String(selectedParty))?.partyName ||
    "-";

  const outwardChallanNo =
    outwardList.find((o) => String(o.id) === String(selectedChallan))
      ?.challanNo || "-";

  const challanNoDisplay = challanNo || "-";
  const dateDisplay = date || "-";

  const totalWeight = rows.reduce(
    (sum, r) => sum + (parseFloat(r.weight) || 0),
    0
  );

  const totalAmount = rows.reduce((sum, r) => {
    const wt = parseFloat(r.weight || "0") || 0;
    const rt = parseFloat(r.rate || "0") || 0;
    const amt = !isNaN(parseFloat(r.amount)) ? parseFloat(r.amount) : wt * rt;
    return sum + (amt || 0);
  }, 0);

  const rowsHtml =
    rows.length > 0
      ? rows
          .map((r, i) => {
            const wt = parseFloat(r.weight || "0") || 0;
            const rt = parseFloat(r.rate || "0") || 0;
            const amt = !isNaN(parseFloat(r.amount))
              ? parseFloat(r.amount)
              : wt * rt;

            return `
              <tr>
                <td>${i + 1}</td>
                <td>${r.materialName || "-"}</td>
                <td>${r.shadeName || r.shadeCode || "-"}</td>
                <td>${r.rolls || "-"}</td>
                <td>${r.wtBox || "-"}</td>
                <td>${r.weight || "-"}</td>
                <td>${r.rate || "-"}</td>
                <td>${isNaN(amt) ? "-" : amt.toFixed(2)}</td>
                <td>${r.unit || "-"}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="9" style="text-align:center;padding:10px;">No items</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Knitting Material Return - ${challanNoDisplay}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h2 { text-align: center; margin: 0 0 10px; }
          .header-info { margin-top: 8px; font-size: 14px; }
          .header-info .row { margin: 4px 0; }
          .header-info .label { font-weight: bold; display: inline-block; width: 170px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #999; padding: 6px 8px; text-align: center; font-size: 12px; }
          th { background-color: #f2f2f2; }
          tfoot td { font-weight: bold; background: #fafafa; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
          @media print {
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <h2>Knitting Material Return</h2>

        <div class="header-info">
          <div class="row"><span class="label">Return Challan No:</span> ${challanNoDisplay}</div>
          <div class="row"><span class="label">Date:</span> ${dateDisplay}</div>
          <div class="row"><span class="label">Party:</span> ${partyName}</div>
          <div class="row"><span class="label">Outward Challan:</span> ${outwardChallanNo}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Material</th>
              <th>Shade</th>
              <th>Rolls</th>
              <th>Wt/Box</th>
              <th>Weight</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right">Totals:</td>
              <td>${totalWeight.toFixed(2)}</td>
              <td></td>
              <td>${totalAmount.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>Receiver Signature</div>
          <div>Authorized Signatory</div>
        </div>

        <script>
          // Ensure content painted before printing
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 50);
          });
          window.onafterprint = () => {
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  // Try opening a new window/tab
  const printWindow = window.open("", "_blank");
  if (printWindow && printWindow.document) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Fallback in case onload doesn't fire
    printWindow.onload = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {}
    };
  } else {
    // Popup blocked? Fallback to hidden iframe printing
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      Swal.fire("Unable to open print preview. Please allow pop-ups.");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }
    }, 100);
  }
};

  const fetchReturns = async () => {
    setLoadingList(true);
    try {
      const { data } = await api.get("/knitting-material-return");
      setReturns(Array.isArray(data) ? data : data?.content || []);
    } finally {
      setLoadingList(false);
    }
  };

  const openList = () => {
    setShowList(true);
    fetchReturns();
  };

  const handleDelete = async (id: string | number) => {
    const result = await Swal.fire({
      title: "Delete this entry?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
    });
    if (!result.isConfirmed) return;
    await api.delete(`/knitting-material-return/${id}`);
    setReturns(prev => prev.filter(x => String(x.id) !== String(id)));
    Swal.fire("Deleted", "", "success");
  };

  const handleEdit = async (id: string | number) => {
    const { data } = await api.get(`/knitting-material-return/${id}`);
    setEditingId(String(id));
    setSelectedParty(String(data.partyId ?? data.party?.id ?? ""));
    setSelectedChallan(String(data.outwardId ?? data.outward?.id ?? ""));
    setChallanNo(data.challanNo ?? "");
    setDate((data.date ?? "").slice(0, 10));

    const mapped: RowData[] = (data.items || []).map((i: any) => ({
      materialId: i.material?.id ?? null,
      materialName: i.material?.materialName ?? "",
      shadeCode: i.shade?.shadeCode ?? "",
      shadeName: i.shade?.shadeName ?? "",
      rolls: String(i.rolls ?? i.roll ?? ""),
      wtBox: String(i.wtPerBox ?? ""),
      weight: String(i.weight ?? ""),
      rate: String(i.rate ?? ""),
      amount: ((+i.weight || 0) * (+i.rate || 0)).toFixed(2),
      unit: i.unit ?? "",
    }));

    setRows(mapped);
    setShowList(false);
  };

  const save = async () => {
  if (!selectedParty) return Swal.fire("Select Party");
  if (!challanNo) return Swal.fire("Enter Challan No");

  const dto = {
    date,
    partyId: selectedParty,
    outwardId: selectedChallan || undefined,
    challanNo,
    items: rows.map(r => ({
      materialId: r.materialId,
      shadeCode: r.shadeCode,
      rolls: r.rolls,
      wtPerBox: +r.wtBox || 0,
      weight: +r.weight || 0,
      rate: +r.rate || 0,
      amount: +(r.amount || 0),
      unit: r.unit || undefined,
    })),
  };

  if (editingId) {
    await api.put(`/knitting-material-return/${editingId}`, dto);
    Swal.fire("Updated ✅", "", "success");
  } else {
    await api.post("/knitting-material-return", dto);
    Swal.fire("Saved ✅", "", "success");
  }

  setEditingId(null);
};

  const filtered = useMemo(() => {
    const s = searchText.toLowerCase();
    return returns.filter((r: any) =>
      (r.challanNo || "").toLowerCase().includes(s) ||
      (r.party?.partyName || "").toLowerCase().includes(s)
    );
  }, [returns, searchText]);

  const getTotalAmount = (r: any) =>
    (r.items || []).reduce((sum: number, it: any) => sum + Number(it.amount || it.weight * it.rate || 0), 0);

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white shadow-md rounded-2xl p-6 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-3 text-center">Knitting Material Return</h2>

          {/* Form */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-bold mb-1">Party</label>
              <select value={selectedParty} onChange={e => setSelectedParty(e.target.value)} className="border p-2 rounded w-full">
                <option value="">Select Party</option>
                {partyList.map(p => <option key={p.id} value={p.id}>{p.partyName}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1">Outward Challan</label>
              <select value={selectedChallan} onChange={e => setSelectedChallan(e.target.value)} className="border p-2 rounded w-full">
                <option value="">Select Challan</option>
                {outwardList.map(c => <option key={c.id} value={c.id}>{c.challanNo}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1">Return Challan No</label>
              <input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="Enter Challan No" className="border p-2 rounded w-full" />
            </div>

            <div>
              <label className="block font-bold mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded w-full" />
            </div>
          </div>

          {/* Table */}
          <table className="w-full border mb-6 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2">Material</th>
                <th className="border p-2">Shade</th>
                <th className="border p-2">Rolls</th>
                <th className="border p-2">Wt/Box</th>
                <th className="border p-2">Weight</th>
                <th className="border p-2">Rate</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row, i) => (
                <tr key={i}>
                  <td className="border text-center p-1">{i + 1}</td>
                  <td className="border p-1">{row.materialName}</td>
                  <td className="border p-1">{row.shadeName}</td>
                  <td className="border p-1"><input value={row.rolls} onChange={e => handleInputChange(i, "rolls", e.target.value)} className="w-full border p-1 rounded" /></td>
                  <td className="border p-1"><input value={row.wtBox} onChange={e => handleInputChange(i, "wtBox", e.target.value)} className="w-full border p-1 rounded" /></td>
                  <td className="border p-1"><input value={row.weight} onChange={e => handleInputChange(i, "weight", e.target.value)} className="w-full border p-1 rounded" /></td>
                  <td className="border p-1"><input value={row.rate} onChange={e => handleInputChange(i, "rate", e.target.value)} className="w-full border p-1 rounded" /></td>
                  <td className="border text-right p-2 bg-gray-100">{row.amount}</td>
                  <td className="border text-center p-1">{row.unit}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="text-center p-4 text-gray-500">No rows available. Select a party & Outward Challan or add a new row.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Buttons */}
          <div className="flex gap-3 justify-center mb-6">
            <button onClick={addRow} className="bg-blue-500 text-white px-6 py-2 rounded">Add Row</button>
            <button onClick={save} className="bg-green-500 text-white px-6 py-2 rounded">{editingId ? "Update" : "Save"}</button>
            <button onClick={handlePrint} className="bg-yellow-500 text-white px-6 py-2 rounded">Print</button>
            <button onClick={openList} className="bg-gray-700 text-white px-6 py-2 rounded">View List</button>
            <button onClick={clearForm} className="bg-red-500 text-white px-6 py-2 rounded">Reset</button>
          </div>

          {/* List Modal */}
          {showList && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col">
                <input value={searchText} onChange={e => setSearchText(e.target.value)}
                  placeholder="Search..." className="border p-2 rounded mb-3" />
                <div className="overflow-auto max-h-[60vh]">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border p-2">#</th>
                        <th className="border p-2">Return Challan</th>
                        <th className="border p-2">Date</th>
                        <th className="border p-2">Party</th>
                        <th className="border p-2">Items</th>
                        <th className="border p-2">Amount</th>
                        <th className="border p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r: any, i) => (
                        <tr key={r.id}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">{r.challanNo}</td>
                          <td className="border p-2">{(r.date || "").slice(0, 10)}</td>
                          <td className="border p-2">{r.party?.partyName}</td>
                          <td className="border p-2 text-center">{(r.items || []).length}</td>
                          <td className="border p-2 text-right">{getTotalAmount(r).toFixed(2)}</td>
                          <td className="border p-2 text-center">
                            <button onClick={() => handleEdit(r.id)} className="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                            <button onClick={() => handleDelete(r.id)} className="bg-red-500 text-white px-2 py-1 ml-2 rounded">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setShowList(false)} className="mt-4 bg-gray-400 px-4 py-2 rounded self-center">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default KnittingMaterialReturn;
