"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

type IssuedFromKnittingRow = {
  fabricLotNo: string;
  fabricationName: string;
  fabricationSerialNo?: string;
  rolls: number;
  weight: number;
  knittingRate: number;
  yarnRate: number;
  shortage?: number;
  percentage?: number;
  knittingInwardId?: number | null;
  knittingRowId?: number | null;
};

type KnittingIssueToDyeingOutwardData = {
  partyId?: number | null;
  partyName?: string;
  dated?: string;
  rows: IssuedFromKnittingRow[];
};

interface DyeingRow {
  id: number;

  // Unique source identification (for duplicates)
  sourceKey?: string; // `${knittingInwardId}-${knittingRowId}` OR fallback unique

  lotNo: string;
  fabricName: string;

  shortage: string;
  percentage: string;

  roll: string;
  weight: string;
  knittingYarnRate: string;

  selected: boolean;
}

interface KnittingLot {
  key: string; // UNIQUE key per row
  fabricLotNo: string;

  fabrication: string;
  fabricationSerialNo: string;

  rolls: number;
  weight: number;
  knittingRate: number;
  yarnRate: number;

  shortage?: number;
  percentage?: number;

  partyId?: number;

  knittingInwardId?: number;
  knittingRowId?: number;
}

const DyeingOutward: React.FC = () => {
  const [rows, setRows] = useState<DyeingRow[]>([]);

  const [partyList, setPartyList] = useState<any[]>([]);
  const [partyName, setPartyName] = useState<string>("");
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partySearchText, setPartySearchText] = useState("");

  const [knittingLotList, setKnittingLotList] = useState<KnittingLot[]>([]);
  const [filteredKnittingLots, setFilteredKnittingLots] = useState<KnittingLot[]>([]);
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotSearchText, setLotSearchText] = useState("");

  // IMPORTANT: selection by unique key (not by lotNo)
  const [selectedLotKeys, setSelectedLotKeys] = useState<Set<string>>(new Set());

  const [challanNo, setChallanNo] = useState("");
  const [dated, setDated] = useState("");
  const [narration, setNarration] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [through, setThrough] = useState("");

  const [showList, setShowList] = useState(false);
  const [dyeingList, setDyeingList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // for yarn rate calculation
  const [yarnList, setYarnList] = useState<any[]>([]);
  const [fabricationList, setFabricationList] = useState<any[]>([]);

  useEffect(() => {
    loadParties();
    loadYarnList();
    loadFabricationList();
    generateChallanNo();
  }, []);

  // ---------- AUTO FETCH FROM KNITTING ISSUE TO ----------
  useEffect(() => {
    const raw = sessionStorage.getItem("knittingIssueToDyeingOutwardData");
    if (!raw) return;

    try {
      const data: KnittingIssueToDyeingOutwardData = JSON.parse(raw);

      if (data?.partyId) setSelectedPartyId(Number(data.partyId));
      if (data?.partyName) setPartyName(data.partyName);
      if (data?.dated && !dated) setDated(data.dated);

      const issuedRows = Array.isArray(data?.rows) ? data.rows : [];

      const newRows: DyeingRow[] = issuedRows.map((r, idx) => {
        // Make best-possible unique key
        const inwardId = r.knittingInwardId ?? "X";
        const rowId = r.knittingRowId ?? `TEMP${idx}${Date.now()}`;
        const sourceKey = `${inwardId}-${rowId}`;

        const knit = Number(r.knittingRate) || 0;
        const yarn = Number(r.yarnRate) || 0;

        return {
          id: Date.now() + Math.random(),
          sourceKey,

          lotNo: r.fabricLotNo || "",
          fabricName: r.fabricationName || "",

          shortage: String(r.shortage ?? ""),
          percentage: String(r.percentage ?? ""),

          roll: String(r.rolls ?? ""),
          weight: String(r.weight ?? ""),
          knittingYarnRate: String((knit + yarn).toFixed(2)),

          selected: true,
        };
      });

      setRows((prev) => {
        // keep non-empty existing rows (if any)
        const nonEmpty = prev.filter((x) => String(x.lotNo || "").trim() !== "");
        return [...newRows, ...nonEmpty];
      });
    } catch (e) {
      console.error("Failed to read knitting issue data:", e);
    } finally {
      sessionStorage.removeItem("knittingIssueToDyeingOutwardData");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load yarn list
  const loadYarnList = () => {
    api
      .get("/yarn/list")
      .then((r) => setYarnList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load yarn list", "error"));
  };

  // Load fabrication list
  const loadFabricationList = () => {
    api
      .get("/fabrication")
      .then((r) => setFabricationList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load fabrication list", "error"));
  };

  const loadParties = () => {
    api
      .get("/party/category/Dyeing")
      .then((r) => setPartyList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load parties", "error"));
  };

  // Calculate yarn rate from fabrication composition
  const calculateYarnRate = (fabricationSerialNo: string): number => {
    if (!fabricationSerialNo || !fabricationList.length || !yarnList.length) return 0;

    const fabrication = fabricationList.find((f: any) => String(f.serialNo) === String(fabricationSerialNo));
    if (!fabrication || !Array.isArray(fabrication.yarns)) return 0;

    let totalRate = 0;
    fabrication.yarns.forEach((yarnComp: any) => {
      const yarn = yarnList.find((y: any) => String(y.serialNo) === String(yarnComp.yarnSerialNo));
      if (yarn) {
        const yarnRate = Number(yarn.rate) || 0;
        const percentage = Number(yarnComp.percent) || 0;
        totalRate += (percentage / 100) * yarnRate;
      }
    });

    return Number(totalRate.toFixed(2));
  };

  const loadKnittingLots = () => {
    api
      .get("/knitting/list")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        const lots: KnittingLot[] = [];

        data.forEach((knitting: any) => {
          const knittingInwardId = knitting.id;

          if (Array.isArray(knitting.rows)) {
            knitting.rows.forEach((row: any) => {
              const knittingRowId = row.id; // IMPORTANT: unique per row if backend returns it
              const key = `${knittingInwardId}-${knittingRowId ?? (row.fabricLotNo + "-" + Math.random())}`;

              const fabricationSerialNo = row.fabrication?.serialNo || row.item || "";
              const calculatedYarnRate = calculateYarnRate(String(fabricationSerialNo));
              const fallbackYarnRate = Number(row.yarnRate) || 0;
              const yarnRateFinal = calculatedYarnRate || fallbackYarnRate;

              lots.push({
                key,
                fabricLotNo: row.fabricLotNo || "",
                fabrication: row.fabrication?.fabricName || row.fabricationName || "",
                fabricationSerialNo: String(fabricationSerialNo || ""),
                rolls: row.rolls || 0,
                weight: row.weight || 0,
                knittingRate: row.knittingRate || 0,
                yarnRate: yarnRateFinal,
                shortage: row.shortage ?? 0,
                percentage: row.percentage ?? 0,
                partyId: knitting.party?.id,
                knittingInwardId,
                knittingRowId,
              });
            });
          }
        });

        setKnittingLotList(lots);
      })
      .catch((error) => {
        console.error("Error loading knitting lots:", error);
        Swal.fire("Error", "Failed to load lot numbers", "error");
      });
  };

  // load knitting lots after yarn + fabrication loaded
  useEffect(() => {
    if (yarnList.length > 0 && fabricationList.length > 0) {
      loadKnittingLots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yarnList, fabricationList]);

  // filter by party id
  useEffect(() => {
    if (selectedPartyId) {
      setFilteredKnittingLots(knittingLotList.filter((lot) => lot.partyId === selectedPartyId));
    } else {
      setFilteredKnittingLots(knittingLotList);
    }
  }, [selectedPartyId, knittingLotList]);

  const generateChallanNo = async () => {
    try {
      const res = await api.get("/dyeing-outward");
      const list = Array.isArray(res.data) ? res.data : [];
      const last = list[list.length - 1];
      const year = new Date().getFullYear();
      let nextSerial = 1;

      if (last?.challanNo) {
        const parts = last.challanNo.split("/");
        if (parts.length > 1) {
          const lastNum = Number.parseInt(parts[1]);
          if (!isNaN(lastNum)) nextSerial = lastNum + 1;
        }
      }

      const serial = String(nextSerial).padStart(4, "0");
      setChallanNo(`D-${year}/${serial}`);
    } catch {
      const year = new Date().getFullYear();
      setChallanNo(`D-${year}/0001`);
    }
  };

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        lotNo: "",
        fabricName: "",
        shortage: "",
        percentage: "",
        roll: "",
        weight: "",
        knittingYarnRate: "",
        selected: true,
      },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, [addRow, rows.length]);

  const handleChange = (id: number, field: keyof DyeingRow, value: string | boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows(rows.map((r) => ({ ...r, selected: !allSelected })));
  };

  const openPartyModal = () => {
    setShowPartyModal(true);
    setPartySearchText("");
  };

  const selectParty = (party: any) => {
    setPartyName(party.partyName);
    setSelectedPartyId(party.id);
    setShowPartyModal(false);
    setSelectedLotKeys(new Set());
  };

  const openLotModal = () => {
    setShowLotModal(true);
    setLotSearchText("");
    setSelectedLotKeys(new Set());
  };

  // used keys: already added/issued rows should not appear again
  const usedKeys = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.sourceKey) s.add(r.sourceKey);
    });
    return s;
  }, [rows]);

  const filteredLots = useMemo(() => {
    const q = lotSearchText.toLowerCase();
    return filteredKnittingLots
      .filter((l) => !usedKeys.has(l.key)) // IMPORTANT: hide already used
      .filter((l) => !q || (l.fabricLotNo || "").toLowerCase().includes(q));
  }, [filteredKnittingLots, lotSearchText, usedKeys]);

  const toggleLotSelection = (lotKey: string) => {
    setSelectedLotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const addSelectedLots = () => {
    if (selectedLotKeys.size === 0) {
      Swal.fire("Warning", "Please select at least one lot", "warning");
      return;
    }

    const lotsToAdd = filteredLots.filter((lot) => selectedLotKeys.has(lot.key));

    const newRows: DyeingRow[] = lotsToAdd.map((lot) => {
      const knittingRate = Number(lot.knittingRate) || 0;
      const yarnRate = Number(lot.yarnRate) || 0;

      return {
        id: Date.now() + Math.random(),
        sourceKey: lot.key,

        lotNo: lot.fabricLotNo,
        fabricName: lot.fabrication,

        shortage: String(lot.shortage ?? ""),
        percentage: String(lot.percentage ?? ""),

        roll: String(lot.rolls),
        weight: String(lot.weight),
        knittingYarnRate: String((knittingRate + yarnRate).toFixed(2)),
        selected: true,
      };
    });

    setRows((prev) => {
      const nonEmptyRows = prev.filter((r) => String(r.lotNo || "").trim() !== "");
      // prepend new lots
      return [...newRows, ...nonEmptyRows];
    });

    setShowLotModal(false);
    setSelectedLotKeys(new Set());
  };

  const filteredParties = partyList.filter((p) =>
    (p.partyName || "").toLowerCase().includes(partySearchText.toLowerCase())
  );

  const handleSave = async () => {
    const selectedRows = rows.filter((r) => r.selected);

    if (!partyName || !dated || selectedRows.length === 0) {
      Swal.fire("Error", "Please fill all required fields and select at least one row!", "error");
      return;
    }

    const payload = {
      challanNo,
      dated,
      partyName,
      narration,
      vehicleNo,
      through,
      rows: selectedRows.map((r) => ({
        lotNo: r.lotNo,
        fabricName: r.fabricName,
        shortage: r.shortage,
        percentage: r.percentage,
        roll: r.roll,
        weight: r.weight,
        knittingYarnRate: r.knittingYarnRate,

        // store source key so duplicates remain unique in edit
        sourceKey: r.sourceKey || null,
      })),
    };

    try {
      if (editingId) {
        await api.put(`/dyeing-outward/${editingId}`, payload);
        Swal.fire("Success", "Dyeing outward updated!", "success");
      } else {
        await api.post("/dyeing-outward", payload);
        Swal.fire("Success", "Dyeing outward saved!", "success");
      }

      await generateChallanNo();
      setEditingId(null);
    } catch (err: any) {
      console.error("Save Error:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to save record", "error");
    }
  };

  const resetForm = () => {
    setRows([]);
    addRow();
    setPartyName("");
    setSelectedPartyId(null);
    setDated("");
    setNarration("");
    setVehicleNo("");
    setThrough("");
    setEditingId(null);
    setSelectedLotKeys(new Set());
    generateChallanNo();
  };

  const openList = async () => {
    try {
      const res = await api.get("/dyeing-outward");
      const data = Array.isArray(res.data) ? res.data : [];
      setDyeingList(data);
      setShowList(true);
    } catch (err) {
      console.error("Load List Error:", err);
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const res = await api.get(`/dyeing-outward/${id}`);
      const dyeing = res.data;

      setChallanNo(dyeing.challanNo || "");
      setDated(dyeing.dated || "");
      setPartyName(dyeing.partyName || "");
      setNarration(dyeing.narration || "");
      setVehicleNo(dyeing.vehicleNo || "");
      setThrough(dyeing.through || "");
      setEditingId(id);

      const mapped: DyeingRow[] = (dyeing.rows || []).map((r: any, i: number) => ({
        id: Date.now() + i,
        sourceKey: r.sourceKey || undefined,

        lotNo: r.lotNo || "",
        fabricName: r.fabricName || "",

        shortage: String(r.shortage ?? ""),
        percentage: String(r.percentage ?? ""),

        roll: r.roll || "",
        weight: r.weight || "",
        knittingYarnRate: r.knittingYarnRate || "",
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
        await api.delete(`/dyeing-outward/${id}`);
        setDyeingList((prev) => prev.filter((x) => x.id !== id));
        Swal.fire("Deleted!", "Record deleted successfully", "success");
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  const handlePrint = () => {
    const selectedRows = rows.filter((r) => r.selected);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalRolls = selectedRows.reduce((sum, r) => sum + (Number.parseFloat(r.roll) || 0), 0);
    const totalWeight = selectedRows.reduce((sum, r) => sum + (Number.parseFloat(r.weight) || 0), 0);

    const html = `
      <html>
        <head>
          <title>Dyeing Outward - ${challanNo}</title>
          <style>
            body { font-family: Arial; margin: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #555; padding: 6px; text-align: center; font-size: 12px; }
            th { background-color: #f0f0f0; }
            h2 { text-align: center; }
            .info { margin: 10px 0; }
            .totals { margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Dyeing Issue/Outward</h2>
          <div class="info">
            <p><b>Challan No:</b> ${challanNo}</p>
            <p><b>Date:</b> ${dated}</p>
            <p><b>Party:</b> ${partyName}</p>
            <p><b>Narration:</b> ${narration}</p>
            <p><b>Vehicle No:</b> ${vehicleNo}</p>
            <p><b>Through:</b> ${through}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Lot No</th>
                <th>Fabric Name</th>
                <th>Shortage</th>
                <th>Percentage</th>
                <th>Roll</th>
                <th>Weight</th>
                <th>Knitting+Yarn Rate</th>
              </tr>
            </thead>
            <tbody>
              ${selectedRows
                .map(
                  (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.lotNo}</td>
                  <td>${r.fabricName}</td>
                  <td>${r.shortage || "-"}</td>
                  <td>${r.percentage || "-"}</td>
                  <td>${r.roll}</td>
                  <td>${r.weight}</td>
                  <td>${r.knittingYarnRate}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Rolls: ${totalRolls}</p>
            <p>Total Weight: ${totalWeight.toFixed(3)}</p>
          </div>
          <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleIssueTo = async () => {
    const selectedRows = rows.filter((r) => r.selected);

    if (!editingId && !challanNo) {
      Swal.fire("Error", "Please save the record first before issuing", "error");
      return;
    }

    if (selectedRows.length === 0) {
      Swal.fire("Error", "Please select at least one row to issue", "error");
      return;
    }

    const result = await Swal.fire({
      title: "Issue To",
      text: "Proceed to issue selected fabric to Dyeing Inward?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Proceed",
    });

    if (result.isConfirmed) {
      try {
        const outwardData = {
          dyeingChallanNo: challanNo,
          dyeingPartyName: partyName,
          dyeingRows: selectedRows,
          dyeingDate: dated,
        };

        sessionStorage.setItem("dyeingOutwardData", JSON.stringify(outwardData));

        Swal.fire("Success", "Navigating to Dyeing Inward form...", "success");
        setTimeout(() => {
          window.location.href = "/knitting/dyeing/inward-challan";
        }, 800);
      } catch (error) {
        console.error("Error:", error);
        Swal.fire("Error", "Failed to proceed", "error");
      }
    }
  };

  const filteredList = Array.isArray(dyeingList)
    ? dyeingList.filter((x) => {
        const s = searchText.toLowerCase();
        return (
          !searchText ||
          (x.challanNo || "").toLowerCase().includes(s) ||
          (x.partyName || "").toLowerCase().includes(s)
        );
      })
    : [];

  const selectedRows = rows.filter((r) => r.selected);
  const totalRolls = selectedRows.reduce((sum, r) => sum + (Number.parseFloat(r.roll) || 0), 0);
  const totalWeight = selectedRows.reduce((sum, r) => sum + (Number.parseFloat(r.weight) || 0), 0);

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Dyeing Issue/Outward</h2>

          <div className="grid grid-cols-4 gap-4 mb-6">
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
              <label className="block font-semibold">Challan No.</label>
              <input type="text" value={challanNo} readOnly className="border p-2 rounded w-full bg-gray-100" />
            </div>

            <div>
              <label className="block font-semibold">Party Name</label>
              <input
                type="text"
                value={partyName}
                readOnly
                onClick={openPartyModal}
                className="border p-2 rounded w-full bg-gray-50 cursor-pointer hover:bg-gray-100"
                placeholder="Click to select party"
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
          </div>

          <div className="overflow-auto max-h-[300px]">
            <table className="min-w-[1100px] w-full border border-blue-500 text-sm">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => r.selected)}
                      onChange={toggleSelectAll}
                      title="Select/Deselect All"
                    />
                  </th>
                  <th className="border p-2">S No</th>
                  <th className="border p-2">Lot No</th>
                  <th className="border p-2">Fabric Name</th>
                  <th className="border p-2">Shortage</th>
                  <th className="border p-2">Percentage</th>
                  <th className="border p-2">Roll</th>
                  <th className="border p-2">Weight</th>
                  <th className="border p-2">Knitting+Yarn Rate</th>
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
                        value={row.lotNo}
                        readOnly
                        onClick={openLotModal}
                        className="border p-1 rounded w-full cursor-pointer hover:bg-gray-100 bg-gray-50"
                        placeholder="Click to select"
                      />
                    </td>

                    <td className="border p-1">
                      <input type="text" value={row.fabricName} readOnly className="border p-1 rounded w-full bg-gray-50" />
                    </td>

                    <td className="border p-1">
                      <input
                        type="number"
                        value={row.shortage}
                        onChange={(e) => handleChange(row.id, "shortage", e.target.value)}
                        className="border p-1 rounded w-full text-right"
                      />
                    </td>

                    <td className="border p-1">
                      <input
                        type="number"
                        value={row.percentage}
                        onChange={(e) => handleChange(row.id, "percentage", e.target.value)}
                        className="border p-1 rounded w-full text-right"
                      />
                    </td>

                    <td className="border p-1">
                      <input type="text" value={row.roll} readOnly className="border p-1 rounded w-full bg-gray-50 text-right" />
                    </td>

                    <td className="border p-1">
                      <input type="text" value={row.weight} readOnly className="border p-1 rounded w-full bg-gray-50 text-right" />
                    </td>

                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.knittingYarnRate}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50 font-semibold text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <div>
              <button onClick={addRow} className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600">
                Add
              </button>

              <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded mr-2 hover:bg-green-600">
                {editingId ? "Update" : "Save"}
              </button>

              <button onClick={resetForm} className="px-4 py-2 bg-orange-500 text-white rounded mr-2 hover:bg-orange-600">
                New Entry
              </button>

              <button onClick={openList} className="px-4 py-2 bg-yellow-500 text-white rounded mr-2 hover:bg-yellow-600">
                View List
              </button>

              <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded mr-2 hover:bg-gray-700">
                Print
              </button>

              <button onClick={handleIssueTo} className="px-4 py-2 bg-purple-500 text-white rounded mr-2 hover:bg-purple-600">
                Issue To
              </button>
            </div>

            <div className="text-right font-semibold">
              <p>Selected: {selectedRows.length} rows</p>
              <p>Total Rolls: {totalRolls}</p>
              <p>Total Weight: {totalWeight.toFixed(3)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Party Modal */}
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
              <button onClick={() => setShowPartyModal(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lot Modal */}
      {showLotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Lot Numbers (Multiple Selection)</h3>

            <input
              type="text"
              placeholder="Search lot number..."
              value={lotSearchText}
              onChange={(e) => setLotSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />

            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2 w-12">
                      <input
                        type="checkbox"
                        checked={filteredLots.length > 0 && selectedLotKeys.size === filteredLots.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLotKeys(new Set(filteredLots.map((l) => l.key)));
                          } else {
                            setSelectedLotKeys(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="border p-2">Lot No</th>
                    <th className="border p-2">Fabric Name</th>
                    <th className="border p-2">Shortage</th>
                    <th className="border p-2">Percentage</th>
                    <th className="border p-2">Rolls</th>
                    <th className="border p-2">Weight</th>
                    <th className="border p-2">Knitting Rate</th>
                    <th className="border p-2">Yarn Rate</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLots.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border p-4 text-center text-gray-500">
                        No lot numbers found (or all lots already added)
                      </td>
                    </tr>
                  ) : (
                    filteredLots.map((lot) => (
                      <tr key={lot.key}>
                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedLotKeys.has(lot.key)}
                            onChange={() => toggleLotSelection(lot.key)}
                          />
                        </td>
                        <td className="border p-2">{lot.fabricLotNo}</td>
                        <td className="border p-2">{lot.fabrication}</td>
                        <td className="border p-2 text-right">{String(lot.shortage ?? "")}</td>
                        <td className="border p-2 text-right">{String(lot.percentage ?? "")}</td>
                        <td className="border p-2 text-right">{lot.rolls}</td>
                        <td className="border p-2 text-right">{Number(lot.weight || 0).toFixed(3)}</td>
                        <td className="border p-2 text-right">{lot.knittingRate}</td>
                        <td className="border p-2 text-right">{lot.yarnRate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center gap-3 mt-4">
              <button onClick={addSelectedLots} className="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                Add Selected ({selectedLotKeys.size})
              </button>
              <button
                onClick={() => {
                  setShowLotModal(false);
                  setSelectedLotKeys(new Set());
                }}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">Dyeing Outward List</h3>

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
                    <th className="border p-2">Challan No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Party Name</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border p-4 text-center text-gray-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((dyeing, index) => (
                      <tr key={dyeing.id}>
                        <td className="border p-2 text-center">{index + 1}</td>
                        <td className="border p-2">{dyeing.challanNo}</td>
                        <td className="border p-2">{dyeing.dated}</td>
                        <td className="border p-2">{dyeing.partyName}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => handleEdit(dyeing.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(dyeing.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-4">
              <button onClick={() => setShowList(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default DyeingOutward;