import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

interface MaterialGroup {
  id: number;
  materialGroup: string;
  materialType: string;
  unitOfMeasure: string;
  costOfMaterial: number;
  supplierName: string;
}

interface MaterialItem {
  id: number;
  serialNumber: string;
  materialGroupId: number;
  materialGroupName: string;
  materialName: string;
  code: string;
  materialUnit: string;
  minimumStock: number;
  maximumStock: number;
  openingStock: number;
}

interface StockData {
  id: number;
  groupName: string;
  itemName: string;
  shadeName: string;
  openingStock: number;
  purchase: number;
  consumed: number;
  balance: number;
}

const MaterialStockReport: React.FC = () => {
  const [allGroups, setAllGroups] = useState<MaterialGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [allItems, setAllItems] = useState<MaterialItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MaterialItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [reportData, setReportData] = useState<StockData[]>([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [showReport, setShowReport] = useState(false);

  const loadAllGroups = async () => {
    try {
      const response = await api.get("/material-groups");
      const data: MaterialGroup[] = response.data;
      const uniqueGroups = Array.from(
        new Map(data.map((m) => [m.materialGroup, m])).values()
      );
      setAllGroups(uniqueGroups);
    } catch (err) {
      Swal.fire("Error", "Failed to load material groups", "error");
    }
  };

  const loadAllItems = async () => {
    try {
      const res = await api.get("/materials");
      setAllItems(res.data);
    } catch (err) {
      Swal.fire("Error", "Failed to load materials", "error");
    }
  };

  useEffect(() => {
    loadAllGroups();
    loadAllItems();
  }, []);

  useEffect(() => {
    if (selectedGroups.length === 0) {
      setFilteredItems([]);
      return;
    }
    const filtered = allItems.filter((item) =>
      selectedGroups.includes(item.materialGroupId)
    );
    setFilteredItems(filtered);
  }, [selectedGroups, allItems]);

  const toggleGroup = (id: number) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleShow = async () => {
    if (selectedGroups.length === 0) {
      return Swal.fire("Warning", "Please select at least one Material Group.", "warning");
    }
    if (selectedItems.length === 0) {
      return Swal.fire("Warning", "Please select at least one Material Item.", "warning");
    }

    // ✅ Validate DD-MM-YYYY format
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;

    if (fromDate && !dateRegex.test(fromDate)) {
      return Swal.fire("Invalid Date", "Enter From Date in DD-MM-YYYY format", "warning");
    }
    if (toDate && !dateRegex.test(toDate)) {
      return Swal.fire("Invalid Date", "Enter To Date in DD-MM-YYYY format", "warning");
    }

    // ✅ Convert to YYYY-MM-DD for API
    const apiFromDate = convertToApiDate(fromDate);
    const apiToDate = convertToApiDate(toDate);

    try {
      const res = await api.post("/stock-report", {
        groupIds: selectedGroups,
        itemIds: selectedItems,
        fromDate: apiFromDate,
        toDate: apiToDate,
      });

      if (!res.data || res.data.length === 0) {
        Swal.fire("Info", "No stock data found for selected items.", "info");
        setReportData([]);
      } else {
        setReportData(res.data);
        setShowReport(true);
      }
    } catch (err) {
      Swal.fire("Error", "Failed to fetch stock report", "error");
    }
  };

  const handleBack = () => {
    setShowReport(false);
    setReportData([]);
  };

  // ⬇️ UPDATED: Print like Party List
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    const today = new Date().toLocaleDateString("en-IN");

    const html = `
      <html><head><title>Material Stock Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 12px; }
          h2 { text-align:center; margin: 0 0 8px; }
          h4 { text-align:center; margin: 0 0 8px; font-weight: normal; }
          p { margin: 4px 0; text-align: center; }
          table { width:100%; border-collapse:collapse; margin-top:10px; }
          th,td { border:1px solid #333; padding:6px; font-size:12px; text-align:center; }
          thead th { background:#eee; }
        </style>
      </head>
      <body>
        <h2>Material Stock Report</h2>
        <h4>As On: ${today}</h4>
        <p>Period: ${fromDate || "-"} to ${toDate || "-"}</p>
        <table>
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>Material Group</th>
              <th>Material Name</th>
              <th>Shade Name</th>
              <th>Opening Stock</th>
              <th>Purchase (Credit)</th>
              <th>Consumed (Debit)</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${reportData
              .map(
                (row, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${row.groupName || ""}</td>
                  <td>${row.itemName || ""}</td>
                  <td>${row.shadeName || ""}</td>
                  <td style="text-align:right;">${row.openingStock ?? ""}</td>
                  <td style="text-align:right;">${row.purchase ?? ""}</td>
                  <td style="text-align:right;">${row.consumed ?? ""}</td>
                  <td style="text-align:right;">${row.balance ?? ""}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const convertToApiDate = (d: string) => {
    if (!d || d.trim() === "") return null; // ✅ send null, not empty string

    const parts = d.split("-");
    if (parts.length !== 3) return null; // ✅ if wrong format like '10/01/2025'

    const [day, month, year] = parts;
    return `${year}-${month}-${day}`; // ✅ convert DD-MM-YYYY → YYYY-MM-DD
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800">
            Material Stock Report
          </h2>

          {!showReport ? (
            <>
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="font-semibold text-gray-700">From Date</label>
                  <input
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border rounded-lg w-full px-3 py-2 mt-1 focus:ring focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">To Date</label>
                  <input
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border rounded-lg w-full px-3 py-2 mt-1 focus:ring focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* Selection Section */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2 border-b pb-1 text-gray-700">
                    Select Material Group
                  </h3>
                  <div className="max-h-64 overflow-y-auto border p-2 rounded">
                    {allGroups.map((g) => (
                      <div key={g.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(g.id)}
                          onChange={() => toggleGroup(g.id)}
                          className="mr-2 accent-blue-600"
                        />
                        {g.materialGroup}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 border-b pb-1 text-gray-700">
                    Select Material Item
                  </h3>
                  <div className="max-h-64 overflow-y-auto border p-2 rounded">
                    {filteredItems.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        Select Material Group to view items.
                      </p>
                    ) : (
                      filteredItems.map((m) => (
                        <div key={m.id} className="flex items-center mb-1">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(m.id)}
                            onChange={() => toggleItem(m.id)}
                            className="mr-2 accent-blue-600"
                          />
                          {m.materialName}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="text-center">
                <button
                  onClick={handleShow}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Show
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Report Section Styled like AmountReport */}
              <div id="printArea">
                <div className="print-only">
                  <p className="text-2xl font-semibold text-center mb-6">
                    Material Stock Report
                  </p>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Period: {fromDate || "-"} to {toDate || "-"}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm text-center">
                    <thead className="bg-gray-200 text-gray-700">
                      <tr>
                        <th className="border px-2 py-2">#</th>
                        <th className="border px-2 py-2">Material Group</th>
                        <th className="border px-2 py-2">Material Name</th>
                        <th className="border px-2 py-2">Shade Name</th>
                        <th className="border px-2 py-2">Opening Stock</th>
                        <th className="border px-2 py-2">Purchase (Credit)</th>
                        <th className="border px-2 py-2">Consumed (Debit)</th>
                        <th className="border px-2 py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, index) => (
                        <tr key={row.id} className="hover:bg-gray-100">
                          <td className="border px-2 py-2">{index + 1}</td>
                          <td className="border px-2 py-2">{row.groupName}</td>
                          <td className="border px-2 py-2">{row.itemName}</td>
                          <td className="border px-2 py-2">{row.shadeName}</td>
                          <td className="border px-2 py-2 text-right">
                            {row.openingStock}
                          </td>
                          <td className="border px-2 py-2 text-right">
                            {row.purchase}
                          </td>
                          <td className="border px-2 py-2 text-right">
                            {row.consumed}
                          </td>
                          <td className="border px-2 py-2 text-right font-semibold text-green-700">
                            {row.balance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleBack}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Print
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default MaterialStockReport;
