"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

interface ReceiptRow {
  id: number;
  fabricLotNo: string;
  fabric: string;
  shade: string;
  mcSize: string;
  greyGSM: string;
  regdSize: string;
  rolls: string;
  weight: string;
  wastage: string;
  knittingYarnRate: string;
  dyeingRate: string;
  amount: string;
  selected: boolean;
}

const DyeingInward: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [transferToStock, setTransferToStock] = useState(false);

  const [partyList, setPartyList] = useState<any[]>([]);
  const [partyName, setPartyName] = useState<string>("");
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partySearchText, setPartySearchText] = useState("");

  const [dyeingOutwardList, setDyeingOutwardList] = useState<any[]>([]);
  const [filteredDyeingOutwardList, setFilteredDyeingOutwardList] = useState<
    any[]
  >([]);
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotSearchText, setLotSearchText] = useState("");
  const [, setCurrentRowId] = useState<number | null>(null);
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());

  const [dated, setDated] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [through, setThrough] = useState("");
  const [narration, setNarration] = useState("");

  const [showList, setShowList] = useState(false);
  const [dyeingInwardList, setDyeingInwardList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [savedRecords, setSavedRecords] = useState<any[]>([])

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = () => {
    api
      .get("/party/category/Dyeing")
      .then((r) => setPartyList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load parties", "error"));
  };

  useEffect(() => {
    loadDyeingOutwardLots();
  }, []);

  const loadDyeingOutwardLots = () => {
    api
      .get("/dyeing-outward")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        const lots: any[] = [];

        data.forEach((dyeing: any) => {
          if (Array.isArray(dyeing.rows)) {
            dyeing.rows.forEach((row: any) => {
              lots.push({
                fabricLotNo: row.lotNo || "",
                fabricName: row.fabricName || "",
                rolls: row.roll || 0,
                weight: row.weight || 0,
                knittingYarnRate: row.knittingYarnRate || 0,
                partyName: dyeing.partyName || "",
              });
            });
          }
        });

        setDyeingOutwardList(lots);
      })
      .catch((err) => {
        console.error("Error loading dyeing outward:", err);
        Swal.fire("Error", "Failed to load lot numbers", "error");
      });
  };

  useEffect(() => {
    if (partyName) {
      const filtered = dyeingOutwardList.filter(
        (lot) => lot.partyName === partyName
      );
      setFilteredDyeingOutwardList(filtered);
    } else {
      setFilteredDyeingOutwardList(dyeingOutwardList);
    }
  }, [partyName, dyeingOutwardList]);

  useEffect(() => {
    const storedData = sessionStorage.getItem("dyeingOutwardData")
    if (storedData) {
      try {
        const outwardData = JSON.parse(storedData)
        setPartyName(outwardData.dyeingPartyName || "")
        setDated(outwardData.dyeingDate || "")
        setChallanNo(outwardData.dyeingChallanNo || "")

        const inwardRows = (outwardData.dyeingRows || []).map((row: any, idx: number) => ({
          id: Date.now() + idx,
          fabricLotNo: row.lotNo || "",
          fabric: row.fabricName || "",
          shade: row.shade || "",
          mcSize: row.mcSize || "",
          greyGSM: row.greyGSM || "",
          regdSize: row.regdSize || "",
          rolls: row.roll || "",
          weight: row.weight || "",
          wastage: "",
          knittingYarnRate: row.knittingYarnRate || "",
          dyeingRate: "",
          amount: "",
          selected: true,
        }))

        setRows(inwardRows)
        sessionStorage.removeItem("dyeingOutwardData")
      } catch (error) {
        console.error("Error retrieving outward data:", error)
      }
    }
  }, [])

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        fabricLotNo: "",
        fabric: "",
        shade: "",
        mcSize: "",
        greyGSM: "",
        regdSize: "",
        rolls: "",
        weight: "",
        wastage: "",
        knittingYarnRate: "",
        dyeingRate: "",
        amount: "",
        selected: true,
      },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      addRow();
    }
  }, [addRow, rows.length]);

  const handleChange = (id: number, field: keyof ReceiptRow, value: string | boolean) => {
    const updatedRows = rows.map((r) => {
      if (r.id === id) {
        const updatedRow = { ...r, [field]: value };

        if (field === "dyeingRate" || field === "weight") {
          const weight =
            Number.parseFloat(field === "weight" ? value as string : updatedRow.weight) ||
            0;
          const rate =
            Number.parseFloat(
              field === "dyeingRate" ? value as string : updatedRow.dyeingRate
            ) || 0;
          updatedRow.amount = (weight * rate).toFixed(2);
        }

        return updatedRow;
      }
      return r;
    });
    setRows(updatedRows);
  };

  const toggleSelectAll = () => {
    const allSelected = rows.every(r => r.selected);
    setRows(rows.map(r => ({ ...r, selected: !allSelected })));
  };

  const openPartyModal = () => {
    setShowPartyModal(true);
    setPartySearchText("");
  };

  const selectParty = (party: any) => {
    setPartyName(party.partyName);
    setShowPartyModal(false);
    setSelectedLots(new Set());
  };

  const openLotModal = (rowId: number) => {
    setCurrentRowId(rowId);
    setShowLotModal(true);
    setLotSearchText("");
  };

  const toggleLotSelection = (lotNo: string) => {
    const newSelected = new Set(selectedLots);
    if (newSelected.has(lotNo)) {
      newSelected.delete(lotNo);
    } else {
      newSelected.add(lotNo);
    }
    setSelectedLots(newSelected);
  };

  const addSelectedLots = () => {
    if (selectedLots.size === 0) {
      Swal.fire("Warning", "Please select at least one lot", "warning");
      return;
    }

    const lotsToAdd = filteredDyeingOutwardList.filter((lot) =>
      selectedLots.has(lot.fabricLotNo)
    );

    const newRows = lotsToAdd.map((lot) => ({
      id: Date.now() + Math.random(),
      fabricLotNo: lot.fabricLotNo,
      fabric: lot.fabricName,
      shade: "",
      mcSize: "",
      greyGSM: "",
      regdSize: "",
      rolls: String(lot.rolls),
      weight: String(lot.weight),
      wastage: "",
      knittingYarnRate: String(lot.knittingYarnRate),
      dyeingRate: "",
      amount: "",
      selected: true,
    }));

    setRows((prev) => {
      const nonEmptyRows = prev.filter((r) => r.fabricLotNo.trim() !== "");
      return [...newRows, ...nonEmptyRows];
    });
    setShowLotModal(false);
    setSelectedLots(new Set());
    setCurrentRowId(null);
  };

  const filteredParties = partyList.filter((p) =>
    p.partyName.toLowerCase().includes(partySearchText.toLowerCase())
  );

  const filteredLots = filteredDyeingOutwardList.filter((l) =>
    (l.fabricLotNo || "").toLowerCase().includes(lotSearchText.toLowerCase())
  );

  const handleSave = async () => {
    const selectedRows = rows.filter(r => r.selected);
    
    if (!partyName || !dated || selectedRows.length === 0) {
      Swal.fire("Error", "Please fill all required fields and select at least one row!", "error");
      return;
    }

    const payload = {
      dated,
      partyName,
      challanNo,
      transferToStock,
      vehicleNo,
      through,
      narration,
      rows: selectedRows.map((r) => ({
        fabricLotNo: r.fabricLotNo,
        fabric: r.fabric,
        shade: r.shade,
        mcSize: r.mcSize,
        greyGSM: r.greyGSM,
        regdSize: r.regdSize,
        rolls: r.rolls,
        weight: r.weight,
        wastage: r.wastage,
        knittingYarnRate: r.knittingYarnRate,
        dyeingRate: r.dyeingRate,
        amount: r.amount,
      })),
    };

    try {
      if (editingId) {
        await api.put(`/dyeing-inward/${editingId}`, payload);
        Swal.fire("Success", "Dyeing inward updated!", "success");
        setEditingId(null);
      } else {
        await api.post("/dyeing-inward", payload);
        Swal.fire("Success", "Dyeing inward saved!", "success");
      }

      setEditingId(null);
      loadSavedRecords();
    } catch (err: any) {
      console.error("Save Error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to save record",
        "error"
      );
    }
  };

  const loadSavedRecords = async () => {
    try {
      const res = await api.get("/dyeing-inward")
      const data = Array.isArray(res.data) ? res.data : []
      setSavedRecords(data)
    } catch (err) {
      console.error("Error loading saved records:", err)
    }
  }

  const resetForm = () => {
    setRows([]);
    addRow();
    setPartyName("");
    setDated("");
    setChallanNo("");
    setVehicleNo("");
    setThrough("");
    setNarration("");
    setTransferToStock(false);
    setEditingId(null);
    setSelectedLots(new Set());
  };

  const openList = async () => {
    try {
      const res = await api.get("/dyeing-inward");
      const data = Array.isArray(res.data) ? res.data : [];
      setDyeingInwardList(data);
      setShowList(true);
    } catch (err) {
      console.error("Load List Error:", err);
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const res = await api.get(`/dyeing-inward/${id}`);
      const inward = res.data;

      setDated(inward.dated || "");
      setPartyName(inward.partyName || "");
      setChallanNo(inward.challanNo || "");
      setTransferToStock(inward.transferToStock || false);
      setVehicleNo(inward.vehicleNo || "");
      setThrough(inward.through || "");
      setNarration(inward.narration || "");
      setEditingId(id);

      const mapped = (inward.rows || []).map((r: any, i: number) => ({
        id: Date.now() + i,
        fabricLotNo: r.fabricLotNo || "",
        fabric: r.fabric || "",
        shade: r.shade || "",
        mcSize: r.mcSize || "",
        greyGSM: r.greyGSM || "",
        regdSize: r.regdSize || "",
        rolls: r.rolls || "",
        weight: r.weight || "",
        wastage: r.wastage || "",
        knittingYarnRate: r.knittingYarnRate || "",
        dyeingRate: r.dyeingRate || "",
        amount: r.amount || "",
        selected: true,
      }));
      setRows(mapped);
      setShowList(false);
    } catch (err) {
      console.error("Edit Error:", err);
      Swal.fire("Error", "Failed to load record", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/dyeing-inward/${id}`);
        setDyeingInwardList((prev) => prev.filter((x) => x.id !== id));
        Swal.fire("Deleted!", "Record deleted successfully", "success");
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  const handlePrint = () => {
    const selectedRows = rows.filter(r => r.selected);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalRolls = selectedRows.reduce(
      (sum, r) => sum + (Number.parseFloat(r.rolls) || 0),
      0
    );
    const totalWeight = selectedRows.reduce(
      (sum, r) => sum + (Number.parseFloat(r.weight) || 0),
      0
    );
    const totalAmount = selectedRows.reduce(
      (sum, r) => sum + (Number.parseFloat(r.amount) || 0),
      0
    );

    const html = `
      <html>
        <head>
          <title>Dyeing Inward - ${challanNo}</title>
          <style>
            body { font-family: Arial; margin: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #555; padding: 6px; text-align: center; font-size: 11px; }
            th { background-color: #f0f0f0; }
            h2 { text-align: center; }
            .info { margin: 10px 0; }
            .totals { margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Dyeing Receipt/Inward</h2>
          <div class="info">
            <p><b>Date:</b> ${dated}</p>
            <p><b>Party:</b> ${partyName}</p>
            <p><b>Challan No:</b> ${challanNo}</p>
            <p><b>Vehicle No:</b> ${vehicleNo}</p>
            <p><b>Through:</b> ${through}</p>
            <p><b>Narration:</b> ${narration}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Fabric Lot No</th><th>Fabric</th>
                <th>Shade</th><th>M/C Size</th><th>Grey GSM</th><th>Regd Size</th><th>Rolls</th>
                <th>Weight</th><th>Wastage</th><th>Knitting+Yarn Rate</th><th>Dyeing Rate</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${selectedRows
                .map(
                  (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.fabricLotNo}</td>
                  <td>${r.fabric}</td>
                  <td>${r.shade}</td>
                  <td>${r.mcSize}</td>
                  <td>${r.greyGSM}</td>
                  <td>${r.regdSize}</td>
                  <td>${r.rolls}</td>
                  <td>${r.weight}</td>
                  <td>${r.wastage}</td>
                  <td>${r.knittingYarnRate}</td>
                  <td>${r.dyeingRate}</td>
                  <td>${r.amount}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Rolls: ${totalRolls}</p>
            <p>Total Weight: ${totalWeight.toFixed(3)}</p>
            <p>Total Amount: ₹${totalAmount.toFixed(2)}</p>
          </div>
          <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleIssueTo = async () => {
    const result = await Swal.fire({
      title: "Issue To",
      text: "Select the next process:",
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Finishing",
      denyButtonText: "Other Process",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      Swal.fire("Redirecting", "Going to Finishing Outward...", "info");
      setTimeout(() => {
        navigate("/knitting/finishing/outward-challan");
      }, 1000);
    } else if (result.isDenied) {
      Swal.fire("Info", "Other process selected. Feature coming soon!", "info");
    }
  };

  const filteredList = Array.isArray(dyeingInwardList)
    ? dyeingInwardList.filter((x) => {
        const s = searchText.toLowerCase();
        return (
          !searchText ||
          (x.challanNo || "").toLowerCase().includes(s) ||
          (x.partyName || "").toLowerCase().includes(s)
        );
      })
    : [];

  const selectedRows = rows.filter(r => r.selected);
  const totalRolls = selectedRows.reduce(
    (sum, r) => sum + (Number.parseFloat(r.rolls) || 0),
    0
  );
  const totalWeight = selectedRows.reduce(
    (sum, r) => sum + (Number.parseFloat(r.weight) || 0),
    0
  );
  const totalAmount = selectedRows.reduce(
    (sum, r) => sum + (Number.parseFloat(r.amount) || 0),
    0
  );

  useEffect(() => {
    loadSavedRecords()
  }, [])

  return (
    <Dashboard>
      <div className="p-2 bg-gray-100">
        <div className="bg-white p-3 rounded-lg max-w-7xl mx-auto shadow-md">
          <h2 className="text-2xl font-bold text-center mb-2">
            Dyeing Receipt/Inward
          </h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-4 mb-2">
            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={dated}
                onChange={(e) => setDated(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <input
                type="text"
                value={partyName}
                onClick={openPartyModal}
                readOnly
                className="border p-2 rounded w-full cursor-pointer bg-gray-50 hover:bg-gray-100"
                placeholder="Click to select party"
              />
            </div>
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={transferToStock}
                onChange={(e) => setTransferToStock(e.target.checked)}
                className="mr-2"
              />
              <label className="font-semibold">Transfer to Stock</label>
            </div>
            <div>
              <label className="block font-semibold">Vehicle No.</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Through</label>
              <input
                type="text"
                value={through}
                onChange={(e) => setThrough(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Narration</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto max-h-[300px]">
            <table className="min-w-[1400px] w-full border border-blue-500 text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every(r => r.selected)}
                      onChange={toggleSelectAll}
                      title="Select/Deselect All"
                    />
                  </th>
                  <th className="border p-2">S No</th>
                  <th className="border p-2">Fabric Lot No</th>
                  <th className="border p-2">Fabric</th>
                  <th className="border p-2">Shade</th>
                  <th className="border p-2">M/C Size</th>
                  <th className="border p-2">Grey GSM</th>
                  <th className="border p-2">Regd Size</th>
                  <th className="border p-2">Rolls</th>
                  <th className="border p-2">Weight</th>
                  <th className="border p-2">Wastage</th>
                  <th className="border p-2">Knitting+Yarn Rate</th>
                  <th className="border p-2">Dyeing Rate</th>
                  <th className="border p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className={!row.selected ? "bg-gray-100" : ""}>
                    <td className="border p-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => handleChange(row.id, "selected", e.target.checked)}
                      />
                    </td>
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.fabricLotNo}
                        onClick={() => openLotModal(row.id)}
                        readOnly
                        className="border p-1 rounded w-full cursor-pointer bg-gray-50 hover:bg-gray-100"
                        placeholder="Click to select"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.fabric}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.shade}
                        onChange={(e) =>
                          handleChange(row.id, "shade", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.mcSize}
                        onChange={(e) =>
                          handleChange(row.id, "mcSize", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.greyGSM}
                        onChange={(e) =>
                          handleChange(row.id, "greyGSM", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.regdSize}
                        onChange={(e) =>
                          handleChange(row.id, "regdSize", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.rolls}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.weight}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.wastage}
                        onChange={(e) =>
                          handleChange(row.id, "wastage", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.knittingYarnRate}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50 font-semibold"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.dyeingRate}
                        onChange={(e) =>
                          handleChange(row.id, "dyeingRate", e.target.value)
                        }
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.amount}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-4">
            <div>
              <button
                onClick={addRow}
                className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600"
              >
                Add
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded mr-2 hover:bg-green-600"
              >
                {editingId ? "Update" : "Save"}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-orange-500 text-white rounded mr-2 hover:bg-orange-600"
              >
                New Entry
              </button>
              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded mr-2 hover:bg-yellow-600"
              >
                View List
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-600 text-white rounded mr-2 hover:bg-gray-700"
              >
                Print
              </button>
              <button
                onClick={handleIssueTo}
                className="px-4 py-2 bg-purple-500 text-white rounded mr-2 hover:bg-purple-600"
              >
                Issue To
              </button>
            </div>
            <div className="text-right font-semibold">
              <p>Selected: {selectedRows.length} rows</p>
              <p>Total Rolls: {totalRolls}</p>
              <p>Total Weight: {totalWeight.toFixed(3)}</p>
              <p className="text-green-700">
                Total Amt: ₹{totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Party Selection Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Party</h3>
            <input
              type="text"
              placeholder="Search party name..."
              value={partySearchText}
              onChange={(e) => setPartySearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Serial No</th>
                    <th className="border p-2">Party Name</th>
                    <th className="border p-2">GST No</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((p) => (
                    <tr key={p.id}>
                      <td className="border p-2">{p.serialNumber}</td>
                      <td className="border p-2">{p.partyName}</td>
                      <td className="border p-2">{p.gstNo}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectParty(p)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowPartyModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lot Number Selection Modal with Multiple Selection */}
      {showLotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">
              Select Fabric Lot Numbers (Multiple Selection)
            </h3>
            <input
              type="text"
              placeholder="Search lot number..."
              value={lotSearchText}
              onChange={(e) => setLotSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />

            <div className="mb-2 text-xs text-gray-600">
              Total lots available: {filteredLots.length}
            </div>

            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2 w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedLots.size === filteredLots.length &&
                          filteredLots.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLots(
                              new Set(filteredLots.map((l) => l.fabricLotNo))
                            );
                          } else {
                            setSelectedLots(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="border p-2">Fabric Lot No</th>
                    <th className="border p-2">Fabric Name</th>
                    <th className="border p-2">Rolls</th>
                    <th className="border p-2">Weight</th>
                    <th className="border p-2">Knitting+Yarn Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLots.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="border p-4 text-center text-gray-500"
                      >
                        {dyeingOutwardList.length === 0
                          ? "No lot numbers found. Please save Dyeing Outward records first."
                          : "No matching lot numbers found for selected party."}
                      </td>
                    </tr>
                  ) : (
                    filteredLots.map((lot, idx) => (
                      <tr key={idx}>
                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedLots.has(lot.fabricLotNo)}
                            onChange={() => toggleLotSelection(lot.fabricLotNo)}
                          />
                        </td>
                        <td className="border p-2">{lot.fabricLotNo}</td>
                        <td className="border p-2">{lot.fabricName}</td>
                        <td className="border p-2 text-right">{lot.rolls}</td>
                        <td className="border p-2 text-right">
                          {Number.parseFloat(lot.weight || 0).toFixed(3)}
                        </td>
                        <td className="border p-2 text-right font-semibold">
                          {lot.knittingYarnRate}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={addSelectedLots}
                className="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Selected ({selectedLots.size})
              </button>
              <button
                onClick={() => {
                  setShowLotModal(false);
                  setCurrentRowId(null);
                  setSelectedLots(new Set());
                }}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">
              Dyeing Inward List
            </h3>

            <input
              placeholder="Search by Challan or Party"
              className="border p-2 rounded w-full mb-3"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">Challan No</th>
                    <th className="border p-2">Rolls</th>
                    <th className="border p-2">Weight</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="border p-4 text-center text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d, i) => {
                      const totalRolls = (d.rows || []).reduce(
                        (sum: number, r: any) =>
                          sum + (Number.parseFloat(r.rolls) || 0),
                        0
                      );
                      const totalWeight = (d.rows || []).reduce(
                        (sum: number, r: any) =>
                          sum + (Number.parseFloat(r.weight) || 0),
                        0
                      );
                      const totalAmount = (d.rows || []).reduce(
                        (sum: number, r: any) =>
                          sum + (Number.parseFloat(r.amount) || 0),
                        0
                      );

                      return (
                        <tr key={d.id}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">
                            {d.dated
                              ? new Date(d.dated).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="border p-2">{d.partyName}</td>
                          <td className="border p-2">{d.challanNo}</td>
                          <td className="border p-2 text-right">
                            {totalRolls}
                          </td>
                          <td className="border p-2 text-right">
                            {totalWeight.toFixed(3)}
                          </td>
                          <td className="border p-2 text-right">
                            ₹{totalAmount.toFixed(2)}
                          </td>
                          <td className="border p-2 text-center">
                            <button
                              onClick={() => handleEdit(d.id)}
                              className="px-2 py-1 bg-blue-500 text-white rounded mr-1 hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
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

            <div className="flex justify-center mt-5">
              <button
                onClick={() => setShowList(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {savedRecords.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-bold text-lg mb-3">Recently Saved Records</h3>
          <div className="overflow-auto max-h-[200px]">
            <table className="w-full text-sm border">
              <thead className="bg-green-100">
                <tr>
                  <th className="border p-2">#</th>
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Party</th>
                  <th className="border p-2">Challan No</th>
                  <th className="border p-2">Rolls</th>
                  <th className="border p-2">Weight</th>
                  <th className="border p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {savedRecords.slice(-5).map((record, idx) => {
                  const totalRolls = (record.rows || []).reduce(
                    (sum: number, r: any) =>
                      sum + (Number.parseFloat(r.rolls) || 0),
                    0
                  );
                  const totalWeight = (record.rows || []).reduce(
                    (sum: number, r: any) =>
                      sum + (Number.parseFloat(r.weight) || 0),
                    0
                  );
                  const totalAmount = (record.rows || []).reduce(
                    (sum: number, r: any) =>
                      sum + (Number.parseFloat(r.amount) || 0),
                    0
                  );
                  return (
                    <tr key={record.id}>
                      <td className="border p-2 text-center">{idx + 1}</td>
                      <td className="border p-2">
                        {record.dated
                          ? new Date(record.dated).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="border p-2">{record.partyName}</td>
                      <td className="border p-2">{record.challanNo}</td>
                      <td className="border p-2 text-right">{totalRolls}</td>
                      <td className="border p-2 text-right">
                        {totalWeight.toFixed(3)}
                      </td>
                      <td className="border p-2 text-right">
                        ₹{totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default DyeingInward;