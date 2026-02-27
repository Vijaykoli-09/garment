import React, { useState, useCallback, useEffect } from "react";
import Dashboard from "../../Dashboard";

interface RowData {
  id: number;
  lotNo: string;
  fabricLotNo: string;
  item: string;
  shade: string;
  processing: string;
  rolls: string;
  weight: string;
  wastage: string;
}

const FinishingInward: React.FC = () => {
  const [rows, setRows] = useState<RowData[]>([]);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        lotNo: "",
        fabricLotNo: "",
        item: "",
        shade: "",
        processing: "",
        rolls: "",
        weight: "",
        wastage: "",
      },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      addRow();
    }
  }, [addRow, rows.length]);

  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <Dashboard>
      <div className="p-6  min-h-screen">
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">
            Finishing Inward
          </h2>

          {/* Header Section */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input type="text" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold">Dated</label>
              <input type="date" className="border p-2 rounded w-full" />
            </div>
            <div className="flex items-center mt-6">
              <input type="checkbox" className="mr-2" id="skipDyeing" />
              <label htmlFor="skipDyeing" className="font-semibold">Skip Dyeing</label>
            </div>
            {/* <div>
              <label className="block font-semibold text-red-500">Serial Number</label>
              <input type="text" className="border p-2 rounded w-full" />
            </div> */}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block font-semibold">Party Name</label>
              <input type="text" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold">Vehicle No.</label>
              <input type="text" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold">Through</label>
              <input type="text" className="border p-2 rounded w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold">Narration</label>
              <textarea className="border p-2 rounded w-full"></textarea>
            </div>
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center">
                <input type="checkbox" className="mr-2" id="reissue" />
                <label htmlFor="reissue" className="font-semibold">ReIssue</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" className="mr-2" id="opening" />
                <label htmlFor="opening" className="font-semibold">Opening</label>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">Sr No</th>
                  <th className="border p-2">Lot No</th>
                  <th className="border p-2">Fabric Lot No</th>
                  <th className="border p-2">Item</th>
                  <th className="border p-2">Shade</th>
                  <th className="border p-2">Processing</th>
                  <th className="border p-2">Rolls</th>
                  <th className="border p-2">Weight</th>
                  <th className="border p-2">Wastage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.lotNo}
                        onChange={(e) => handleChange(row.id, "lotNo", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.fabricLotNo}
                        onChange={(e) => handleChange(row.id, "fabricLotNo", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => handleChange(row.id, "item", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.shade}
                        onChange={(e) => handleChange(row.id, "shade", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.processing}
                        onChange={(e) => handleChange(row.id, "processing", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.rolls}
                        onChange={(e) => handleChange(row.id, "rolls", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.weight}
                        onChange={(e) => handleChange(row.id, "weight", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.wastage}
                        onChange={(e) => handleChange(row.id, "wastage", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Section */}
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={addRow}
                className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
              >
                Add New
              </button>
              <button className="px-4 py-2 bg-green-500 text-white rounded mr-2">
                Save
              </button>
              <button className="px-4 py-2 bg-red-500 text-white rounded mr-2">
                Delete
              </button>
              <button className="px-4 py-2 bg-indigo-500 text-white rounded mr-2">
                Update
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded mr-2">
                Close
              </button>
              <button className="px-4 py-2 bg-gray-800 text-white rounded mr-2">
                Print
              </button>
            </div>

            <div className="text-right space-y-1">
              <p><strong>Tot. Rolls:</strong> 0</p>
              <p><strong>Tot. Wt:</strong> 0.000</p>
              <p><strong>Amount Tot. Wastage:</strong> 0.000</p>
            </div>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default FinishingInward;
