import React, { useCallback, useEffect, useRef, useState } from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";

interface RowData {
  id: number;
  orderNo: string;
  materialId: string;
  materialName: string;
  unit: string;
  shadeCode: string;
  shadeName: string;
  receivedRolls: string;
  receivedWtBox: string;
  receivedWeight: string;
  rate: string;
  amount: string;
}

interface Party {
  id: number;
  partyName: string;
}

interface Material {
  id: number;
  materialName: string;
  materialUnit: string;
}

interface Shade {
  shadeCode: string;
  shadeName: string;
}

// Local “consumed items” helpers
const CONSUMED_KEY = "consumedPurchaseItemsByParty_v1";

// Create a stable key for an item to identify it across lists
const keyForItem = (it: any) => {
  const matId = it.materialId || it?.material?.id || "";
  const shade = it.shadeCode || it?.shade?.shadeCode || "";
  const orderNo = it.orderNo || "";
  const wtPerBox = Number(it.wtPerBox ?? it.receivedWtBox ?? 0);
  const roll = Number(it.roll ?? it.receivedRolls ?? 0);
  const rate = Number(it.rate ?? 0);
  return [orderNo, matId, shade, wtPerBox, roll, rate].join("|");
};

const readConsumed = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(CONSUMED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const addConsumed = (partyId: string, items: any[]) => {
  const db = readConsumed();
  const now = new Set(db[partyId] || []);
  items.forEach((it) => now.add(keyForItem(it)));
  db[partyId] = Array.from(now);
  localStorage.setItem(CONSUMED_KEY, JSON.stringify(db));
};

const filterConsumed = (partyId: string, items: any[]) => {
  const db = readConsumed();
  const consumedSet = new Set(db[partyId] || []);
  return items.filter((it) => !consumedSet.has(keyForItem(it)));
};

const KnittingOutwardChallan: React.FC = () => {
  const location: any = useLocation();

  const generateChallanNo = useCallback(async () => {
    const year = new Date().getFullYear();
    try {
      const res = await api.get("/knitting-outward-challan");
      const data = Array.isArray(res.data) ? res.data : [];
      const re = new RegExp(`^P-${year}/(\\d{4})$`);
      let maxNum = 0;

      data.forEach((doc: any) => {
        const cn = doc.challanNo || "";
        const m = cn.match(re);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n)) maxNum = Math.max(maxNum, n);
        }
      });

      const next = (maxNum + 1).toString().padStart(4, "0");
      setChallanNo(`P-${year}/${next}`);
    } catch {
      setChallanNo(`P-${year}/0001`);
    }
  }, []);

  const [rows, setRows] = useState<RowData[]>([]);
  const [date, setDate] = useState("");
  const [partyId, setPartyId] = useState(""); // Knitting party
  const [challanNo, setChallanNo] = useState("");
  const [entryId, setEntryId] = useState<number | null>(null);

  const [referenceParties, setReferenceParties] = useState<Party[]>([]); // Purchase parties
  const [allParties, setAllParties] = useState<Party[]>([]); // Knitting parties
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [allShades, setAllShades] = useState<Shade[]>([]);

  const [refPartyId, setRefPartyId] = useState<string>("");
  const [fromPurchaseEntryId, setFromPurchaseEntryId] = useState<number | null>(null);

  const [showEntryList, setShowEntryList] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  // IMPORTANT: skip draft fetch once if we came via Issue To (state.items)
  const skipDraftFetchOnce = useRef(false);

  const handleOrderSelect = (orderId: number) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  useEffect(() => {
    generateChallanNo();
  }, [generateChallanNo]);

  // Add new row
  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        orderNo: "",
        materialId: "",
        materialName: "",
        unit: "",
        shadeCode: "",
        shadeName: "",
        receivedRolls: "",
        receivedWtBox: "",
        receivedWeight: "",
        rate: "",
        amount: "",
      },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, [addRow, rows.length]);

  // Load reference purchase parties + knitting parties + materials + shades
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [refPartyRes, knitPartyRes, matRes, shadeRes] = await Promise.all([
          api.get("/party/category/Purchase"),  // Reference parties
          api.get("/party/category/Knitting"),  // Knitting parties
          api.get(`/materials`),
          api.get("/shade/list"),
        ]);
        setReferenceParties(refPartyRes.data);
        setAllParties(knitPartyRes.data);
        setAllMaterials(matRes.data);
        setAllShades(shadeRes.data);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load data", "error");
      }
    };
    loadInitialData();
  }, []);

  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleMaterialSelect = (id: number, materialId: string) => {
    const selectedMaterial = allMaterials.find(
      (m) => m.id.toString() === materialId
    );
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              materialId,
              materialName: selectedMaterial?.materialName || "",
              unit: selectedMaterial?.materialUnit || "",
              shadeCode: "",
              shadeName: "",
            }
          : r
      )
    );
  };

  const handleShadeSelect = (id: number, shadeCode: string) => {
    const shade = allShades.find((s) => s.shadeCode === shadeCode);
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, shadeCode, shadeName: shade?.shadeName || "" } : r
      )
    );
  };

  const mapToRequestDTO = (selectedRows = rows) => ({
    date,
    partyId: Number(partyId), // Knitting party id
    challanNo,
    items: selectedRows.map((r) => ({
      materialId: Number(r.materialId),
      materialName: r.materialName,
      shadeCode: r.shadeCode || "",
      shadeName: r.shadeName || "",
      roll: parseFloat(r.receivedRolls) || 0,
      wtPerBox: parseFloat(r.receivedWtBox) || 0,
      weight: parseFloat(r.receivedWeight) || 0,
      rate: parseFloat(r.rate) || 0,
      amount: parseFloat(r.amount) || 0,
      orderNo: r.orderNo || "",
      // unit: r.unit, // send only if backend expects
    })),
  });

  const prefillFromPurchase = useCallback(
    (items: any[] = []) => {
      if (!items || items.length === 0) {
        setRows([]);
        setSelectedOrders([]);
        return;
      }

      const mapped: RowData[] = items.map((item, idx) => {
        const mat =
          allMaterials.find((m) => m.id === Number(item.materialId)) || null;
        const shade =
          allShades.find((s) => s.shadeCode === (item.shadeCode || item?.shade?.shadeCode)) || null;

        const wt = Number(item.wtPerBox) || 0;
        const rate = Number(item.rate) || 0;

        return {
          id: idx + 1,
          orderNo: item.orderNo || "",
          materialId: String(item.materialId || item.material?.id || ""),
          materialName: item.materialName || mat?.materialName || "",
          unit: item.unit || mat?.materialUnit || "",
          shadeCode: item.shadeCode || shade?.shadeCode || "",
          shadeName: item.shadeName || shade?.shadeName || "",
          receivedRolls: String(item.roll ?? ""),
          receivedWtBox: String(item.wtPerBox ?? ""),
          receivedWeight: String(item.weight ?? ""),
          rate: String(item.rate ?? ""),
          amount: (wt * rate).toFixed(2),
        };
      });

      setRows(mapped);
      setSelectedOrders(mapped.map((r) => r.id)); // select all by default
    },
    [allMaterials, allShades]
  );

  const fetchDraftByParty = useCallback(
    async (pid: string) => {
      try {
        const res = await api.get(`/purchase-entry/draft-by-party/${pid}`);
        const draftItems = Array.isArray(res.data) ? res.data : [];

        // Filter out locally-consumed items for this reference party
        const cleaned = filterConsumed(pid, draftItems);
        prefillFromPurchase(cleaned);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to fetch purchase draft", "error");
      }
    },
    [prefillFromPurchase]
  );

  // If navigated from PurchaseEntry with state, prefill and skip next draft fetch once
  useEffect(() => {
    const s = location?.state || {};
    if (!s) return;

    if (s.refPartyId) setRefPartyId(String(s.refPartyId));
    if (s.date) setDate(s.date);
    if (s.fromPurchaseEntryId) setFromPurchaseEntryId(Number(s.fromPurchaseEntryId));

    if (Array.isArray(s.items) && s.items.length > 0) {
      prefillFromPurchase(s.items);
      skipDraftFetchOnce.current = true; // avoid overwrite on first refPartyId set
    }
  }, [location?.state, prefillFromPurchase]);

  // When reference party changes, fetch purchase draft (unless we just prefilled via Issue To)
  useEffect(() => {
    if (!refPartyId) return;
    if (skipDraftFetchOnce.current) {
      skipDraftFetchOnce.current = false; // only skip once
      return;
    }
    fetchDraftByParty(refPartyId);
  }, [refPartyId, fetchDraftByParty]);

  const handleInputChange = (id: number, field: string, value: string) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value } as RowData;
          const wtBox = parseFloat(updatedRow.receivedWtBox || "0");
          const rate = parseFloat(updatedRow.rate || "0");
          updatedRow.amount = (wtBox * rate).toFixed(2);
          return updatedRow;
        }
        return row;
      })
    );
  };

  const handleSave = async () => {
    if (!partyId)
      return Swal.fire("Validation Error", "Please select a Knitting Party.", "warning");

    const selectedRows = rows.filter((row) => selectedOrders.includes(row.id));
    if (selectedRows.length === 0)
      return Swal.fire("No Selection", "Please select at least one row to save.", "warning");

    if (rows.length === 0) {
      return Swal.fire("No Data", "Please add at least one row.", "warning");
    }

    try {
      setLoading(true);
      const payload = mapToRequestDTO(selectedRows);
      await (entryId
        ? api.put(`/knitting-outward-challan/${entryId}`, payload)
        : api.post("/knitting-outward-challan", payload));

      // Try to mark purchase items as consumed on backend (optional)
      try {
        if (fromPurchaseEntryId) {
          await api.post(`/purchase-entry/${fromPurchaseEntryId}/consume`, {
            items: selectedRows.map((r) => ({
              orderNo: r.orderNo || "",
              materialId: Number(r.materialId) || 0,
              shadeCode: r.shadeCode || "",
              wtPerBox: Number(r.receivedWtBox) || 0,
              roll: Number(r.receivedRolls) || 0,
              rate: Number(r.rate) || 0,
            })),
          });
        }
      } catch (e) {
        // If backend doesn't support consume endpoint, ignore silently.
        console.warn("Consume endpoint not available or failed; using local filter only.");
      }

      // Always mark consumed locally to hide on next selection
      if (refPartyId) {
        addConsumed(refPartyId, selectedRows);
      }

      Swal.fire({
        icon: "success",
        title: entryId ? "Updated!" : "Saved!",
        text: `Knitting outward challan ${entryId ? "updated" : "saved"} successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });

      // Reset form and generate fresh challan
      setEntryId(null);
      setPartyId("");
      setDate("");
      setRows([]);
      setSelectedOrders([]);
      await generateChallanNo();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Operation failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!rows || rows.length === 0) {
      Swal.fire("Error", "No data available to print!", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Knitting Outward Challan - ${challanNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            .header-info { margin-top: 10px; font-size: 14px; }
            .header-info span { display: inline-block; min-width: 200px; }
          </style>
        </head>
        <body>
          <h2>Knitting Outward Challan</h2>
          <div class="header-info">
            <span><strong>Challan No:</strong> ${challanNo}</span>
            <span><strong>Date:</strong> ${date || "-"}</span><br/>
            <span><strong>Knitting Party:</strong> ${
              allParties.find((p) => p.id.toString() === partyId)?.partyName || "-"
            }</span>
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
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.materialName || "-"}</td>
                  <td>${r.shadeName || "-"}</td>
                  <td>${r.receivedRolls || "-"}</td>
                  <td>${r.receivedWtBox || "-"}</td>
                  <td>${r.receivedWeight || "-"}</td>
                  <td>${r.rate || "-"}</td>
                  <td>${r.amount || "-"}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.print();
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fetchEntries = async () => {
    try {
      const res = await api.get("/knitting-outward-challan");
      const list = res.data || [];

      if (list.length === 0) {
        const year = new Date().getFullYear();
        const resetChallan = `P-${year}/0001`;
        setChallanNo(resetChallan);
        localStorage.setItem("lastChallanNo", resetChallan);
      } else {
        const data = list.map((entry: any) => ({
          ...entry,
          partyName: entry.party?.partyName || "(Unknown Party)",
        }));
        setEntries(data);
        setFilteredEntries(data);
      }

      setShowEntryList(true);
    } catch (err) {
      console.error("Fetch entries error:", err);
      Swal.fire("Error", "Failed to load entries", "error");
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredEntries(entries);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredEntries(
        entries.filter((e) => {
          const challan = e?.challanNo?.toLowerCase() || "";
          const entryDate = e?.date?.toLowerCase() || "";
          const partyName =
            e?.partyName?.toLowerCase() ||
            e?.party?.partyName?.toLowerCase() ||
            "";
          return (
            challan.includes(term) ||
            partyName.includes(term) ||
            entryDate.includes(term)
          );
        })
      );
    }
  }, [searchTerm, entries]);

  const handleEditEntry = (entry: any) => {
    setShowEntryList(false);
    setEntryId(entry.id || null);
    setDate(entry.date || "");
    setChallanNo(entry.challanNo || "");
    setPartyId(entry.party?.id?.toString() || "");

    setRows(
      (entry.items || []).map((i: any, idx: number) => {
        const mat = i.material || {};
        const shade = i.shade || {};
        return {
          id: i.id || idx + 1,
          orderNo: i.orderNo || "",
          materialId: mat.id?.toString() || "",
          materialName: mat.materialName || "",
          unit: mat.materialUnit || "",
          shadeCode: i.shadeCode || shade.shadeCode || "",
          shadeName: i.shadeName || shade.shadeName || "",
          receivedRolls: i.roll?.toString() || "",
          receivedWtBox: i.wtPerBox?.toString() || "",
          receivedWeight: i.weight?.toString() || "",
          rate: i.rate?.toString() || "",
          amount: i.amount?.toString() || "",
        };
      })
    );
  };

  const handleDeleteEntry = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Delete this entry?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });
    if (confirm.isConfirmed) {
      try {
        await api.delete(`/knitting-outward-challan/${id}`);
        Swal.fire("Deleted!", "Entry removed successfully.", "success");
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setFilteredEntries((prev) => prev.filter((e) => e.id !== id));
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete entry", "error");
      }
    }
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">
            Knitting Issue / Outward Challan
          </h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Reference Party Name</label>
              <select
                value={refPartyId}
                onChange={(e) => setRefPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Purchase Party</option>
                {referenceParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Knitting Party Name</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Knitting Party</option>
                {allParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Challan No.</label>
              <input
                type="text"
                value={challanNo}
                readOnly
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-center">#</th>
                  <th className="border p-2 text-center">Select</th>
                  <th className="border p-2 text-center">Material</th>
                  <th className="border p-2 text-center">Unit</th>
                  <th className="border p-2 text-center">Shade</th>
                  <th className="border p-2 text-center">Rolls</th>
                  <th className="border p-2 text-center">Qty (Wt/Box)</th>
                  {/* <th className="border p-2 text-center">Weight</th> */}
                  <th className="border p-2 text-center">Rate</th>
                  <th className="border p-2 text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, index) => {
                    const isChecked = selectedOrders.includes(row.id);
                    return (
                      <tr key={row.id}>
                        <td className="border p-2 text-center">{index + 1}</td>

                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleOrderSelect(row.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>

                        <td className="border p-1">
                          <select
                            value={row.materialId}
                            onChange={(e) =>
                              handleMaterialSelect(row.id, e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          >
                            <option value="">Select Material</option>
                            {allMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.materialName}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border p-1 text-center">
                          {row.unit || "-"}
                        </td>

                        <td className="border p-1">
                          <select
                            value={row.shadeCode}
                            onChange={(e) =>
                              handleShadeSelect(row.id, e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          >
                            <option value="">Select Shade</option>
                            {allShades.map((s) => (
                              <option key={s.shadeCode} value={s.shadeCode}>
                                {s.shadeName}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border p-1">
                          <input
                            type="text"
                            value={row.receivedRolls}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "receivedRolls",
                                e.target.value
                              )
                            }
                            className="border p-1 rounded w-full"
                          />
                        </td>

                        <td className="border p-1">
                          <input
                            type="text"
                            value={row.receivedWtBox}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "receivedWtBox",
                                e.target.value
                              )
                            }
                            className="border p-1 rounded w-full"
                          />
                        </td>

                        {/* <td className="border p-1">
                          <input
                            type="text"
                            value={row.receivedWeight}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "receivedWeight",
                                e.target.value
                              )
                            }
                            className="border p-1 rounded w-full"
                          />
                        </td> */}

                        <td className="border p-1">
                          <input
                            type="text"
                            value={row.rate}
                            onChange={(e) =>
                              handleInputChange(row.id, "rate", e.target.value)
                            }
                            className="border p-1 rounded w-full"
                          />
                        </td>

                        <td className="border p-1 bg-gray-100 text-right pr-2">
                          {row.amount}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="text-center p-4 text-gray-500">
                      No rows added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Buttons */}
          <div className="flex justify-start space-x-3 mt-5">
            <button
              onClick={addRow}
              className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {entryId ? "Update" : "Save"}
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Print
            </button>

            <button
              onClick={fetchEntries}
              className="px-5 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Entry List
            </button>
          </div>

          {/* Entry List Modal */}
          {showEntryList && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center text-blue-600">
                  Knitting Issue List
                </h2>

                <div className="flex justify-center mb-4">
                  <input
                    type="text"
                    placeholder="Search by Challan No, Party, or Date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border p-2 rounded w-full mb-4"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="border p-2 text-center">#</th>
                        <th className="border p-2 text-center">Challan No</th>
                        <th className="border p-2 text-center">Party Name</th>
                        <th className="border p-2 text-center">Date</th>
                        <th className="border p-2 text-center">Material Name</th>
                        <th className="border p-2 text-center">Receive Wt/Box</th>
                        <th className="border p-2 text-center">Amount</th>
                        <th className="border p-2 text-center">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center py-3 text-gray-500"
                          >
                            No Entries Found
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry, index) => {
                          const totalWtBox = entry.items?.reduce(
                            (sum: number, i: { wtPerBox: string }) =>
                              sum + (parseFloat(i.wtPerBox) || 0),
                            0
                          );
                          const totalAmount = entry.items?.reduce(
                            (sum: number, i: { amount: string }) =>
                              sum + (parseFloat(i.amount) || 0),
                            0
                          );

                          return (
                            <tr key={entry.id}>
                              <td className="border p-2 text-center">
                                {index + 1}
                              </td>
                              <td className="border p-2 text-center">
                                {entry.challanNo || "-"}
                              </td>
                              <td className="border p-2 text-center">
                                {entry.partyName || "(Unknown)"}
                              </td>
                              <td className="border p-2 text-center">
                                {entry.date}
                              </td>
                              <td className="border p-2 text-center">
                                {(entry.items || [])
                                  .map(
                                    (i: any) =>
                                      i.material?.materialName ||
                                      i.materialName ||
                                      "-"
                                  )
                                  .join(", ")}
                              </td>

                              <td className="border p-2 text-center">
                                {totalWtBox}
                              </td>
                              <td className="border p-2 text-center">
                                ₹{totalAmount?.toFixed(2)}
                              </td>
                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => handleEditEntry(entry)}
                                  className="px-3 py-1 bg-green-500 text-white rounded mr-2 hover:bg-green-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-center mt-6">
                  <button
                    onClick={() => setShowEntryList(false)}
                    className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default KnittingOutwardChallan;