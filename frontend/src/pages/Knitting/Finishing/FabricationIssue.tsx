import React, { useState, useCallback, useEffect } from "react";
import Dashboard from "../../Dashboard";

interface RowData {
  id: number;
  lotInternal: string;
  lotNo: string;
  item: string;
  shade: string;
  mcSize: string;
  greyGsm: string;
  regdGsm: string;
  req: string;
}

const FinishingOutward: React.FC = () => {
  const [rows, setRows] = useState<RowData[]>([]);

  // Add Row
  const addRow = useCallback(() => {
    setRows((prevRows) => [
      ...prevRows,
      {
        id: prevRows.length + 1,
        lotInternal: "",
        lotNo: "",
        item: "",
        shade: "",
        mcSize: "",
        greyGsm: "",
        regdGsm: "",
        req: "",
      },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      addRow();
    }
  }, [addRow, rows.length]);

  // Handle Input Change
  const handleChange = (id: number, field: keyof RowData, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <Dashboard>
      <div className="p-6  min-h-screen">
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Finishing Outward</h2>

          {/* Header Section */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Doc Type</label>
              <select className="border p-2 rounded w-full">
                <option>Issue</option>
                <option>Receipt</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input type="text" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold">Dated</label>
              <input type="date" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block font-semibold">Purchase Ref.</label>
              <div className="flex">
                <input type="text" className="border p-2 rounded w-full" />
                <button className="px-2 bg-gray-300 ml-1">...</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
  {/* <div>
    <label className="block font-semibold text-red-500">Serial Number</label>
    <input type="text" className="border p-2 rounded w-full" />
  </div> */}
  <div className="flex items-center">
    <input type="checkbox" className="mr-2" id="opening" />
    <label htmlFor="opening" className="font-semibold">Opening</label>
  </div>
  <div className="flex items-center">
    <input type="checkbox" className="mr-2" id="dyeing" />
    <label htmlFor="dyeing" className="font-semibold">Dyeing</label>
  </div>
</div>

          {/* Middle Section */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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

          <div className="mb-6">
            <label className="block font-semibold">Narration</label>
            <textarea className="border p-2 rounded w-full"></textarea>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">Sr No</th>
                  <th className="border p-2">Lot No. Internal</th>
                  <th className="border p-2">Lot No</th>
                  <th className="border p-2">Item</th>
                  <th className="border p-2">Shade</th>
                  <th className="border p-2">M/C Size</th>
                  <th className="border p-2">Grey GSM</th>
                  <th className="border p-2">Regd GSM</th>
                  <th className="border p-2">Req</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.lotInternal}
                        onChange={(e) => handleChange(row.id, "lotInternal", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
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
                        value={row.mcSize}
                        onChange={(e) => handleChange(row.id, "mcSize", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.greyGsm}
                        onChange={(e) => handleChange(row.id, "greyGsm", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.regdGsm}
                        onChange={(e) => handleChange(row.id, "regdGsm", e.target.value)}
                        className="w-full border p-1 rounded"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={row.req}
                        onChange={(e) => handleChange(row.id, "req", e.target.value)}
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
              <button className="px-4 py-2 bg-yellow-500 text-white rounded mr-2">
                Update
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded mr-2">
                Delete
              </button>
              <button className="px-4 py-2 bg-gray-800 text-white rounded mr-2">
                Print
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded mr-2">
                Issue 2
              </button>
            </div>

            <div className="text-right">
              <p>Tot. Rolls: 0</p>
              <p>Tot. Wt: 0.000</p>
            </div>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default FinishingOutward;
