// DispatchChallan.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

// --- API Routes ---
const routes = {
  create: "/dispatch-challan/create",
  list: "/dispatch-challan",
  get: (id: number) => `/dispatch-challan/${id}`,
  update: (id: number) => `/dispatch-challan/${id}`,
  delete: (id: number) => `/dispatch-challan/${id}`,
  parties: "/party/all",
  packingChallans: "/packing-challans",
  purchaseOrders: "/purchase-orders",
  arts: "/arts",
  artDetail: (serial: string | number) => `/arts/${serial}`,
};

// --- Types ---

interface DispatchRow {
  id: number;
  barCode: string;
  baleNo: string;
  artNo: string;
  description: string;
  lotNumber: string;
  size: string;
  shade: string;
  box: string;
  pcsPerBox: string;
  pcs: string;
  rate: string;
  amt: string;
}

interface PackingRow {
  id: number;
  itemName: string;
  quantity: string;
}

interface Party {
  id?: number;
  partyName: string;
  station?: string;
  agent?: { agentName?: string };
  transport?: { transportName?: string };
}

/**
 * Unified item used for Art-No lookup modal.
 * Now **aggregated like Art Stock Report**:
 *   - Art Creation (opening) + Packing Challans
 *   - Box and Pcs are summed
 *   - Rate is weighted-average (value / pcs) like stock report
 */
interface PackingSourceItem {
  id: string;
  packingSerial: string; // not used in aggregated view (kept for compatibility)
  challanDate?: string;
  partyName?: string;

  cuttingLotNo: string;
  artNo: string;
  description: string;
  size: string;
  shade: string;
  box: number;
  perBox: number;
  pcs: number;
  rate: number;
  amount: number;
}

interface SeqInfo {
  year: string;
  seq: number;
  brokerKey: string;
}

interface ArtListView {
  serialNumber: string;
  artNo: string;
  artName: string;
  artGroup?: string;
  saleRate?: string;
}

interface ArtDetailView {
  serialNumber: string;
  artNo: string;
  artName: string;
  artGroup?: string;
  saleRate?: string;
  shades?: { shadeCode?: string; shadeName?: string; colorFamily?: string }[];
  sizeDetails?: any[];
  sizes?: any[];
}

// --- Helper functions ---

const formatRowSerial = (n: number) => String(n).padStart(4, "0");

// broker key: brokerName > partyName > NO_BROKER
const makeBrokerKey = (party?: Party) => {
  const brokerName = party?.agent?.agentName?.trim();
  const partyName = party?.partyName?.trim();
  return (brokerName || partyName || "NO_BROKER").toUpperCase();
};

const toNum = (v: any): number => {
  const n =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

// ----------------- Modal Components (top-level) -----------------

type ProductSearchModalProps = {
  isOpen: boolean;
  searchTerm: string;
  products: PackingSourceItem[];
  onSearchTermChange: (value: string) => void;
  onSelect: (item: PackingSourceItem) => void;
  onClose: () => void;
};

type ChallanSearchModalProps = {
  isOpen: boolean;
  searchText: string;
  challans: any[];
  onSearchTextChange: (value: string) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
};

type ListViewModalProps = {
  isOpen: boolean;
  searchText: string;
  challans: any[];
  onSearchTextChange: (value: string) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
};

type PurchaseOrderModalProps = {
  isOpen: boolean;
  searchText: string;
  pos: any[];
  onSearchTextChange: (value: string) => void;
  onSelectPO: (po: any) => void;
  onClose: () => void;
};

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  isOpen,
  searchTerm,
  products,
  onSearchTermChange,
  onSelect,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-5xl p-4">
        <h3 className="text-xl font-bold mb-4 text-blue-800">
          Select Item (Art Stock: Art Creation + Packing)
        </h3>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by description / size / shade / art no..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="border p-2 rounded w-full mb-4 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="overflow-auto max-h-96 border border-gray-300">
          <table className="w-full text-sm">
            <thead className="bg-blue-100 sticky top-0">
              <tr>
                <th className="border p-2 text-center">S.No</th>
                <th className="border p-2 text-left">Art No</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-left">Size</th>
                <th className="border p-2 text-left">Shade</th>
                <th className="border p-2 text-right">Box</th>
                {/* per/box removed as requested */}
                <th className="border p-2 text-right">Pcs</th>
                <th className="border p-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, index) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => onSelect(item)}
                >
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">{item.artNo}</td>
                  <td className="border p-2">{item.description}</td>
                  <td className="border p-2">{item.size}</td>
                  <td className="border p-2">{item.shade}</td>
                  <td className="border p-2 text-right">{item.box}</td>
                  {/* per/box hidden but still used internally in selection */}
                  <td className="border p-2 text-right">{item.pcs}</td>
                  <td className="border p-2 text-right">
                    {item.rate.toFixed(2)}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="border p-2 text-center text-gray-500"
                  >
                    No items found from Art Creation / Packing Challans
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ChallanSearchModal: React.FC<ChallanSearchModalProps> = ({
  isOpen,
  searchText,
  challans,
  onSearchTextChange,
  onEdit,
  onDelete,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-5xl p-4">
        <h3 className="text-xl font-bold mb-3 text-blue-800">SearchWindow</h3>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by Challan No / Date / Party / Station..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="overflow-auto max-h-[450px] border border-gray-300">
          <table className="w-full text-sm">
            <thead className="bg-yellow-200 sticky top-0">
              <tr>
                <th className="border p-2">S No</th>
                <th className="border p-2">CHALLAN_NO</th>
                <th className="border p-2">Dated</th>
                <th className="border p-2">Party_Name</th>
                <th className="border p-2">Station</th>
                <th className="border p-2">ART_NO</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody className="bg-yellow-50">
              {challans.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border p-3 text-center text-gray-500"
                  >
                    No challans found
                  </td>
                </tr>
              ) : (
                challans.map((c: any, index: number) => {
                  const station =
                    c.station || c.destination || c.remarks1 || "";
                  let artNo = "";
                  if (Array.isArray(c.rows) && c.rows.length > 0) {
                    artNo = c.rows[0]?.artNo || "";
                  }
                  return (
                    <tr key={c.id || index} className="hover:bg-yellow-100">
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{c.challanNo}</td>
                      <td className="border p-2">
                        {c.date || c.dated
                          ? new Date(c.date || c.dated).toLocaleDateString()
                          : ""}
                      </td>
                      <td className="border p-2">{c.partyName}</td>
                      <td className="border p-2">{station}</td>
                      <td className="border p-2">{artNo}</td>
                      <td className="border p-2 text-center space-x-1">
                        <button
                          onClick={() => onEdit(c.id)}
                          className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
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
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ListViewModal: React.FC<ListViewModalProps> = ({
  isOpen,
  searchText,
  challans,
  onSearchTextChange,
  onEdit,
  onDelete,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[55]">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-6xl p-4 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-bold mb-3 text-blue-800">
          Dispatch Challan List View
        </h3>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by Art No / Size / Shade / Box / Pcs / Rate / Amt / Net Amt..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="overflow-auto max-h-[430px] border border-gray-300">
          <table className="w-full text-sm">
            <thead className="bg-green-100 sticky top-0">
              <tr>
                <th className="border p-2">Sr.No</th>
                <th className="border p-2">Art No</th>
                <th className="border p-2">Size</th>
                <th className="border p-2">Shade</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Pcs/Box</th>
                <th className="border p-2">Pcs</th>
                <th className="border p-2">Rate</th>
                <th className="border p-2">Amt</th>
                <th className="border p-2">Net Amt</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr>
                  <td
                    className="border p-3 text-center text-gray-500"
                    colSpan={11}
                  >
                    No challans found
                  </td>
                </tr>
              ) : (
                challans.map((c: any, idx: number) => {
                  const firstRow =
                    Array.isArray(c.rows) && c.rows.length > 0 ? c.rows[0] : {};
                  return (
                    <tr key={c.id || idx} className="hover:bg-green-50">
                      <td className="border p-2 text-center">{idx + 1}</td>
                      <td className="border p-2">{firstRow.artNo || ""}</td>
                      <td className="border p-2">{firstRow.size || ""}</td>
                      <td className="border p-2">{firstRow.shade || ""}</td>
                      <td className="border p-2 text-right">
                        {firstRow.box ?? ""}
                      </td>
                      <td className="border p-2 text-right">
                        {firstRow.pcsPerBox ?? ""}
                      </td>
                      <td className="border p-2 text-right">
                        {firstRow.pcs ?? ""}
                      </td>
                      <td className="border p-2 text-right">
                        {firstRow.rate ?? ""}
                      </td>
                      <td className="border p-2 text-right">
                        {firstRow.amt ?? ""}
                      </td>
                      <td className="border p-2 text-right">
                        {c.netAmt ?? ""}
                      </td>
                      <td className="border p-2 text-center space-x-1">
                        <button
                          onClick={() => onEdit(c.id)}
                          className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
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
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  searchText,
  pos,
  onSearchTextChange,
  onSelectPO,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-5xl p-4 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-bold mb-3 text-blue-800">
          Select Purchase Order (for Packing Items)
        </h3>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by Order No / Date / Party..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="overflow-auto max-h-[430px] border border-gray-300">
          <table className="w-full text-sm">
            <thead className="bg-indigo-100 sticky top-0">
              <tr>
                <th className="border p-2">S No</th>
                <th className="border p-2">Order No</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Party</th>
                <th className="border p-2">Items</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr>
                  <td
                    className="border p-3 text-center text-gray-500"
                    colSpan={6}
                  >
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                pos.map((po: any, idx: number) => {
                  const items = Array.isArray(po.items) ? po.items : [];
                  const itemNames = items
                    .map(
                      (it: any) =>
                        it.material?.materialName ||
                        it.materialName ||
                        `Material ${it.materialId || ""}`
                    )
                    .join(", ");
                  return (
                    <tr key={po.id || idx} className="hover:bg-indigo-50">
                      <td className="border p-2 text-center">{idx + 1}</td>
                      <td className="border p-2">{po.orderNo}</td>
                      <td className="border p-2">{po.date}</td>
                      <td className="border p-2">
                        {po.partyName || po.party?.partyName}
                      </td>
                      <td className="border p-2">{itemNames}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => onSelectPO(po)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Use Items
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------- Main Component -----------------

const DispatchChallan: React.FC = () => {
  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [packingRows, setPackingRows] = useState<PackingRow[]>([]);

  // Header
  const [serialNo, setSerialNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyName, setPartyName] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [transportName, setTransportName] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [remarks1, setRemarks1] = useState("");
  const [remarks2, setRemarks2] = useState("");
  const [dispatchedBy, setDispatchedBy] = useState("");
  const [station, setStation] = useState("");

  // Right side
  const [totalAmt, setTotalAmt] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [tax, setTax] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [cartage, setCartage] = useState("");
  const [netAmt, setNetAmt] = useState("");

  // editing vs new
  const [editingId, setEditingId] = useState<number | null>(null);

  // masters
  const [partyList, setPartyList] = useState<Party[]>([]);
  const [productList, setProductList] = useState<PackingSourceItem[]>([]);

  // current NEW challan ke liye seq info (broker-wise)
  const [seqInfo, setSeqInfo] = useState<SeqInfo | null>(null);

  // Art lookup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRowIdForLookup, setCurrentRowIdForLookup] = useState<
    number | null
  >(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Challan search modal
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [challanList, setChallanList] = useState<any[]>([]);
  const [challanSearchText, setChallanSearchText] = useState("");

  // List View modal
  const [isListViewModalOpen, setIsListViewModalOpen] = useState(false);
  const [listViewChallanList, setListViewChallanList] = useState<any[]>([]);
  const [listViewSearchText, setListViewSearchText] = useState("");

  // Purchase Order modal
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poList, setPoList] = useState<any[]>([]);
  const [poSearchTerm, setPoSearchTerm] = useState("");

  // --- Broker-wise next number (without committing to localStorage) ---
  const getNextNumbers = useCallback((brokerKey: string) => {
    const year = String(new Date().getFullYear());
    const yearKey = `dispatchYear_${brokerKey}`;
    const seqKey = `dispatchSeq_${brokerKey}`;

    const storedYear = localStorage.getItem(yearKey);
    let lastSeq = 0;
    if (storedYear === year) {
      const ls = parseInt(localStorage.getItem(seqKey) || "0", 10);
      if (Number.isFinite(ls) && ls > 0) lastSeq = ls;
    }

    const nextSeq = lastSeq + 1;
    const seqStr = String(nextSeq).padStart(5, "0");

    return {
      challanNo: `${year}/${seqStr}`,
      serialNo: `DC-${year}/${seqStr}`,
      year,
      seq: nextSeq,
    };
  }, []);

  // --- Row management ---

  const addMainRow = useCallback(() => {
    setRows((prev) => {
      const nextIndex = prev.length + 1;
      const newRow: DispatchRow = {
        id: Date.now() + Math.random(),
        barCode: "",
        baleNo: formatRowSerial(nextIndex),
        artNo: "",
        description: "",
        lotNumber: "",
        size: "",
        shade: "",
        box: "",
        pcsPerBox: "",
        pcs: "",
        rate: "",
        amt: "",
      };
      return [...prev, newRow];
    });
  }, []);

  const deleteMainRow = useCallback((indexToDelete?: number) => {
    setRows((prev) =>
      typeof indexToDelete === "number"
        ? prev.filter((_, index) => index !== indexToDelete)
        : prev.slice(0, Math.max(prev.length - 1, 0))
    );
  }, []);

  const addPackingRow = useCallback(() => {
    setPackingRows((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), itemName: "", quantity: "" },
    ]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) addMainRow();
    if (packingRows.length === 0) addPackingRow();
  }, [addMainRow, addPackingRow, rows.length, packingRows.length]);

  // --- Row change ---

  const handleChange = (
    id: number,
    field: keyof DispatchRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        let updated: DispatchRow = { ...r, [field]: value };

        if (field === "box" || field === "pcsPerBox") {
          const boxNum = Number(updated.box);
          const perBoxNum = Number(updated.pcsPerBox);

          if (
            !Number.isNaN(boxNum) &&
            !Number.isNaN(perBoxNum) &&
            updated.box !== "" &&
            updated.pcsPerBox !== ""
          ) {
            updated.pcs = String(boxNum * perBoxNum);
          } else {
            updated.pcs = "";
          }
        }

        const pcsNum = Number(updated.pcs);
        const rateNum = Number(updated.rate);

        if (
          !Number.isNaN(pcsNum) &&
          !Number.isNaN(rateNum) &&
          updated.pcs !== "" &&
          updated.rate !== ""
        ) {
          updated.amt = String(pcsNum * rateNum);
        } else {
          updated.amt = "";
        }

        return updated;
      })
    );
  };

  const handlePackingChange = (
    id: number,
    field: keyof PackingRow,
    value: string
  ) => {
    setPackingRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // --- Totals ---

  useEffect(() => {
    const total = rows.reduce((sum, row) => {
      const amtNum = parseFloat(row.amt);
      return sum + (Number.isNaN(amtNum) ? 0 : amtNum);
    }, 0);
    setTotalAmt(total ? String(total) : "");
  }, [rows]);

  const handleDiscountPercentChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value;
    setDiscountPercent(val);

    const t = parseFloat(totalAmt);
    const p = parseFloat(val);
    if (Number.isNaN(t) || Number.isNaN(p)) {
      setDiscount("");
      return;
    }
    const amt = (t * p) / 100;
    setDiscount(amt ? String(amt) : "");
  };

  const handleDiscountAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value;
    setDiscount(val);

    const t = parseFloat(totalAmt);
    const a = parseFloat(val);
    if (Number.isNaN(t) || t === 0 || Number.isNaN(a)) {
      setDiscountPercent("");
      return;
    }
    const pct = (a / t) * 100;
    setDiscountPercent(pct ? String(pct) : "");
  };

  const handleTaxPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTaxPercent(val);

    const t = parseFloat(totalAmt);
    const p = parseFloat(val);
    if (Number.isNaN(t) || Number.isNaN(p)) {
      setTax("");
      return;
    }
    const amt = (t * p) / 100;
    setTax(amt ? String(amt) : "");
  };

  const handleTaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTax(val);

    const t = parseFloat(totalAmt);
    const a = parseFloat(val);
    if (Number.isNaN(t) || t === 0 || Number.isNaN(a)) {
      setTaxPercent("");
      return;
    }
    const pct = (a / t) * 100;
    setTaxPercent(pct ? String(pct) : "");
  };

  useEffect(() => {
    const t = parseFloat(totalAmt);
    if (!Number.isNaN(t)) {
      if (discountPercent) {
        const p = parseFloat(discountPercent);
        if (!Number.isNaN(p)) {
          const amt = (t * p) / 100;
          setDiscount(amt ? String(amt) : "");
        }
      }
      if (taxPercent) {
        const p = parseFloat(taxPercent);
        if (!Number.isNaN(p)) {
          const amt = (t * p) / 100;
          setTax(amt ? String(amt) : "");
        }
      }
    }
  }, [totalAmt, discountPercent, taxPercent]);

  useEffect(() => {
    const t = parseFloat(totalAmt);
    const d = parseFloat(discount);
    const tx = parseFloat(tax);
    const c = parseFloat(cartage);

    const totalNum = Number.isNaN(t) ? 0 : t;
    const discNum = Number.isNaN(d) ? 0 : d;
    const taxNum = Number.isNaN(tx) ? 0 : tx;
    const cartNum = Number.isNaN(c) ? 0 : c;

    const net = totalNum - discNum + taxNum + cartNum;
    setNetAmt(net ? String(net) : "");
  }, [totalAmt, discount, tax, cartage]);

  // --- Load masters ---

  const loadParties = useCallback(async () => {
    try {
      const res = await api.get<Party[]>(routes.parties);
      setPartyList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading parties:", err);
      setPartyList([]);
      Swal.fire("Error", "Failed to load parties", "error");
    }
  }, []);

  /**
   * Load products for Art-No selection:
   *   Aggregated like Art Stock Report:
   *     - Opening stock from Art Creation (/arts + /arts/{id})
   *     - Items from Packing Challans (/packing-challans)
   *   For same ArtNo + Size + Shade:
   *     - Box and Pcs are **summed** (e.g. Art=10 box, Packing=5 box => 15 box)
   *     - Rate = weighted-average by Pcs (like stock value / pcs)
   */
  const loadProducts = useCallback(async () => {
    try {
      // 1) Load Art list and Packing challans in parallel
      const [artsRes, packingRes] = await Promise.all([
        api.get<ArtListView[]>(routes.arts),
        api.get<any[]>(routes.packingChallans),
      ]);

      const arts: ArtListView[] = Array.isArray(artsRes.data)
        ? artsRes.data
        : [];
      const challans: any[] = Array.isArray(packingRes.data)
        ? packingRes.data
        : [];

      interface AggregatedItem {
        artNo: string;
        description: string;
        size: string;
        shade: string;
        box: number;
        pcs: number;
        totalValue: number; // sum(pcs * rate)
      }

      const aggregateMap = new Map<string, AggregatedItem>();

      const makeKey = (
        artNo: string,
        size: string,
        shade: string,
        description: string
      ) => `${artNo}||${size}||${shade}||${description}`;

      const addToAggregate = (params: {
        artNo: string;
        description: string;
        size: string;
        shade: string;
        box: number;
        pcs: number;
        rate: number;
      }) => {
        const { artNo, description, size, shade, box, pcs, rate } = params;
        if (!artNo || !size) return;

        const key = makeKey(artNo, size, shade, description);
        const existing = aggregateMap.get(key);

        const cleanBox = Number.isFinite(box) ? box : 0;
        const cleanPcs = Number.isFinite(pcs) ? pcs : 0;
        const cleanRate = Number.isFinite(rate) ? rate : 0;

        if (existing) {
          existing.box += cleanBox;
          existing.pcs += cleanPcs;
          if (cleanPcs > 0 && cleanRate > 0) {
            existing.totalValue += cleanPcs * cleanRate;
          }
        } else {
          aggregateMap.set(key, {
            artNo,
            description,
            size,
            shade,
            box: cleanBox,
            pcs: cleanPcs,
            totalValue:
              cleanPcs > 0 && cleanRate > 0 ? cleanPcs * cleanRate : 0,
          });
        }
      };

      // 1.a) Load details for every art to build opening stock rows.
      const artDetails: (ArtDetailView | null)[] = await Promise.all(
        arts.map((a) =>
          api
            .get<ArtDetailView>(routes.artDetail(a.serialNumber))
            .then((res) => res.data)
            .catch((err) => {
              console.error(
                "Error loading art detail for serial:",
                a.serialNumber,
                err
              );
              return null;
            })
        )
      );

      artDetails.forEach((det, idx) => {
        if (!det) return;
        const listArt = arts[idx];

        const artNo = String(det.artNo || listArt?.artNo || "").trim();
        if (!artNo) return;

        const desc = String(det.artName || listArt?.artName || "").trim();

        const artShades =
          Array.isArray(det.shades) && det.shades.length > 0
            ? det.shades
            : [{ shadeName: "", shadeCode: "", colorFamily: "" }];

        const sizeList: any[] =
          Array.isArray(det.sizeDetails) && det.sizeDetails.length > 0
            ? (det.sizeDetails as any[])
            : Array.isArray(det.sizes)
            ? (det.sizes as any[])
            : [];

        sizeList.forEach((sz: any) => {
          const sizeName = String(sz.sizeName || sz.size || "").trim();
          if (!sizeName) return;

          const perBox = toNum(sz.pcs);
          const box = toNum(sz.box);
          const pcs = box * perBox;
          const rate = toNum(
            sz.rate ?? det.saleRate ?? (listArt as any)?.saleRate ?? 0
          );

          artShades.forEach((sh: any) => {
            const shade = String(sh.shadeName || sh.shade || "").trim();

            addToAggregate({
              artNo,
              description: desc,
              size: sizeName,
              shade,
              box,
              pcs,
              rate,
            });
          });
        });
      });

      // 2) Add items from Packing Challans
      challans.forEach((ch: any) => {
        const rows = Array.isArray(ch.rows) ? ch.rows : [];
        rows.forEach((r: any) => {
          const artNo = String(r.artNo || "").trim();
          if (!artNo) return;

          const description = String(r.workOnArt || r.description || "").trim();
          const shade = String(r.shadeName || r.shade || "").trim();

          const sizeDetails = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];

          if (sizeDetails.length) {
            sizeDetails.forEach((sd: any) => {
              const sizeName = String(sd.sizeName || sd.size || "").trim();
              if (!sizeName) return;

              const box = Number(sd.boxCount ?? sd.box ?? 0);
              const perBox = Number(sd.perBox ?? sd.perPcs ?? 0);
              const pcs =
                sd.pcs != null
                  ? Number(sd.pcs)
                  : Number.isFinite(box * perBox)
                  ? box * perBox
                  : 0;
              const rate = Number(sd.rate ?? 0);

              if (!sizeName && !description && !artNo) return;

              addToAggregate({
                artNo,
                description,
                size: sizeName,
                shade,
                box,
                pcs,
                rate,
              });
            });
          } else {
            const sizeName = String(r.sizeName || r.size || "").trim();
            if (!sizeName) return;

            const box = Number(r.boxCount ?? r.box ?? 0);
            const perBox = Number(r.perBox ?? 0);
            const pcs =
              r.pcs != null
                ? Number(r.pcs)
                : Number.isFinite(box * perBox)
                ? box * perBox
                : 0;
            const rate = Number(r.rate ?? 0);

            if (!sizeName && !description && !artNo) return;

            addToAggregate({
              artNo,
              description,
              size: sizeName,
              shade,
              box,
              pcs,
              rate,
            });
          }
        });
      });

      // 3) Convert aggregated map to list of PackingSourceItem
      const items: PackingSourceItem[] = [];
      aggregateMap.forEach((agg, key) => {
        if (!agg.box && !agg.pcs) return;

        const perBox = agg.box > 0 && agg.pcs > 0 ? agg.pcs / agg.box : 0;

        const rate =
          agg.pcs > 0 && agg.totalValue > 0 ? agg.totalValue / agg.pcs : 0;

        const amount = agg.pcs * rate;

        items.push({
          id: key,
          packingSerial: "",
          challanDate: "",
          partyName: "",
          cuttingLotNo: "",
          artNo: agg.artNo,
          description: agg.description,
          size: agg.size,
          shade: agg.shade,
          box: agg.box,
          perBox,
          pcs: agg.pcs,
          rate,
          amount,
        });
      });

      setProductList(items);
    } catch (err) {
      console.error(
        "Error loading Art Stock (Art Creation + Packing) for dispatch:",
        err
      );
      setProductList([]);
      Swal.fire(
        "Error",
        "Failed to load Art Stock (Art Creation + Packing) for dispatch",
        "error"
      );
    }
  }, []);

  // --- New / Reset ---

  const handleAddNew = useCallback((showToast = false) => {
    setSerialNo("");
    setChallanNo("");
    setDate(new Date().toISOString().split("T")[0]);
    setPartyName("");
    setBrokerName("");
    setTransportName("");
    setRemarks1("");
    setRemarks2("");
    setDispatchedBy("");
    setStation("");
    setTotalAmt("");
    setDiscount("");
    setDiscountPercent("");
    setTax("");
    setTaxPercent("");
    setCartage("");
    setNetAmt("");
    setRows([]);
    setPackingRows([]);
    setEditingId(null);
    setSeqInfo(null);

    if (showToast) {
      Swal.fire("Cleared", "Ready for new dispatch challan", "success");
    }
  }, []);

  // initial load once
  useEffect(() => {
    loadParties();
    loadProducts();
    handleAddNew(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Party select → broker + auto number (broker-wise) + station ---

  useEffect(() => {
    const selectedParty = partyList.find((p) => p.partyName === partyName);

    if (selectedParty) {
      const broker = selectedParty.agent?.agentName || "";
      setBrokerName(broker);
      setTransportName(selectedParty.transport?.transportName || "");

      // Auto-fill station for NEW challans when empty
      if (!editingId && !station) {
        setStation(selectedParty.station || "");
      }
    } else {
      setBrokerName("");
      setTransportName("");
      if (!editingId) {
        setStation("");
      }
    }

    if (!partyName || editingId) return;

    const brokerKey = makeBrokerKey(selectedParty);

    if (seqInfo && seqInfo.brokerKey === brokerKey && serialNo && challanNo)
      return;

    const {
      challanNo: cn,
      serialNo: sn,
      year,
      seq,
    } = getNextNumbers(brokerKey);
    setChallanNo(cn);
    setSerialNo(sn);
    setSeqInfo({ year, seq, brokerKey });
  }, [
    partyName,
    partyList,
    editingId,
    station,
    getNextNumbers,
    seqInfo,
    serialNo,
    challanNo,
  ]);

  // --- Art lookup (Art Stock: Art Creation + Packing) with simple substring search ---

  const filteredProducts = useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();
    if (!term) return productList;

    return productList.filter((p) => {
      const searchStr = [p.artNo, p.description, p.size, p.shade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchStr.includes(term);
    });
  }, [productSearchTerm, productList]);

  const handleArtNoFocus = (rowId: number) => {
    setCurrentRowIdForLookup(rowId);
    setProductSearchTerm("");
    setIsModalOpen(true);
  };

  const handleProductSelect = (item: PackingSourceItem) => {
    if (currentRowIdForLookup !== null) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== currentRowIdForLookup) return r;

          // Fill row from aggregated Art Stock
          let updated: DispatchRow = {
            ...r,
            artNo: item.artNo,
            description: item.description || r.description,
            size: item.size || r.size,
            shade: item.shade || r.shade,
            box: item.box ? String(item.box) : "",
            pcsPerBox: item.perBox ? String(item.perBox) : "",
            lotNumber: item.cuttingLotNo || r.lotNumber,
            rate: item.rate ? String(item.rate) : r.rate,
          };

          // Recalculate pcs and amount
          const boxNum = Number(updated.box);
          const perBoxNum = Number(updated.pcsPerBox);
          if (
            !Number.isNaN(boxNum) &&
            !Number.isNaN(perBoxNum) &&
            updated.box !== "" &&
            updated.pcsPerBox !== ""
          ) {
            updated.pcs = String(boxNum * perBoxNum);
          } else {
            updated.pcs = item.pcs ? String(item.pcs) : "";
          }

          const pcsNum = Number(updated.pcs);
          const rateNum = Number(updated.rate);
          if (
            !Number.isNaN(pcsNum) &&
            !Number.isNaN(rateNum) &&
            updated.pcs !== "" &&
            updated.rate !== ""
          ) {
            updated.amt = String(pcsNum * rateNum);
          } else {
            updated.amt = "";
          }

          return updated;
        })
      );
    }

    setIsModalOpen(false);
    setCurrentRowIdForLookup(null);
  };

  // --- Challan search ---

  const filteredChallans = useMemo(() => {
    if (!challanSearchText) return challanList;
    const term = challanSearchText.toLowerCase();
    return challanList.filter((c: any) => {
      const challanNo = (c.challanNo || "").toLowerCase();
      const dated = (c.date || c.dated || "").toLowerCase();
      const party = (c.partyName || "").toLowerCase();
      const stationVal = (
        c.station ||
        c.destination ||
        c.remarks1 ||
        ""
      ).toLowerCase();
      return (
        challanNo.includes(term) ||
        dated.includes(term) ||
        party.includes(term) ||
        stationVal.includes(term)
      );
    });
  }, [challanSearchText, challanList]);

  const openChallanSearch = async () => {
    try {
      const res = await api.get(routes.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setChallanList(data);
      setChallanSearchText("");
      setIsChallanModalOpen(true);
    } catch (err) {
      console.error("Error loading challans:", err);
      Swal.fire("Error", "Failed to load challan list", "error");
    }
  };

  // --- List View (table of challans with art/size/etc.) ---

  const filteredListViewChallans = useMemo(() => {
    if (!listViewSearchText) return listViewChallanList;
    const term = listViewSearchText.toLowerCase();

    return listViewChallanList.filter((c: any) => {
      const firstRow =
        Array.isArray(c.rows) && c.rows.length > 0 ? c.rows[0] : {};
      const artNo = (firstRow.artNo || "").toLowerCase();
      const size = (firstRow.size || "").toLowerCase();
      const shade = (firstRow.shade || "").toLowerCase();
      const box = String(firstRow.box ?? "").toLowerCase();
      const pcsPerBox = String(firstRow.pcsPerBox ?? "").toLowerCase();
      const pcs = String(firstRow.pcs ?? "").toLowerCase();
      const rate = String(firstRow.rate ?? "").toLowerCase();
      const amt = String(firstRow.amt ?? "").toLowerCase();
      const netAmt = String(c.netAmt ?? "").toLowerCase();

      return [artNo, size, shade, box, pcsPerBox, pcs, rate, amt, netAmt].some(
        (field) => field.includes(term)
      );
    });
  }, [listViewSearchText, listViewChallanList]);

  const openListViewModal = async () => {
    try {
      const res = await api.get(routes.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setListViewChallanList(data);
      setListViewSearchText("");
      setIsListViewModalOpen(true);
    } catch (err) {
      console.error("Error loading challans for list view:", err);
      Swal.fire("Error", "Failed to load challan list", "error");
    }
  };

  // --- helpers for numeric conversion for backend integration ---

  const toNumberOrNull = (value: string): number | null => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isNaN(num) ? null : num;
  };

  const numToStr = (value: any): string =>
    value === null || value === undefined ? "" : String(value);

  const handleSelectChallan = async (id: number) => {
    try {
      const res = await api.get(routes.get(id));
      const ch = res.data || {};

      setSerialNo(ch.serialNo || "");
      setDate(ch.date || new Date().toISOString().split("T")[0]);
      setChallanNo(ch.challanNo || "");
      setPartyName(ch.partyName || "");
      setBrokerName(ch.brokerName || "");
      setTransportName(ch.transportName || "");
      setRemarks1(ch.remarks1 || "");
      setRemarks2(ch.remarks2 || "");
      setDispatchedBy(ch.dispatchedBy || "");

      setStation(ch.station || ch.destination || ch.remarks1 || "");

      setTotalAmt(numToStr(ch.totalAmt));
      setDiscount(numToStr(ch.discount));
      setDiscountPercent(numToStr(ch.discountPercent));
      setTax(numToStr(ch.tax));
      setTaxPercent(numToStr(ch.taxPercent));
      setCartage(numToStr(ch.cartage));
      setNetAmt(numToStr(ch.netAmt));

      const mappedRows: DispatchRow[] = Array.isArray(ch.rows)
        ? ch.rows.map((r: any, idx: number) => ({
            id: Date.now() + idx,
            barCode: r.barCode || "",
            baleNo: r.baleNo || "",
            artNo: r.artNo || "",
            description: r.description || "",
            lotNumber: r.lotNumber || "",
            size: r.size || "",
            shade: r.shade || "",
            box: r.box !== null && r.box !== undefined ? String(r.box) : "",
            pcsPerBox:
              r.pcsPerBox !== null && r.pcsPerBox !== undefined
                ? String(r.pcsPerBox)
                : "",
            pcs: r.pcs !== null && r.pcs !== undefined ? String(r.pcs) : "",
            rate: r.rate !== null && r.rate !== undefined ? String(r.rate) : "",
            amt: r.amt !== null && r.amt !== undefined ? String(r.amt) : "",
          }))
        : [];

      setRows(mappedRows);

      const mappedPacking: PackingRow[] = Array.isArray(ch.packingRows)
        ? ch.packingRows.map((p: any, idx: number) => ({
            id: Date.now() + idx,
            itemName: p.itemName || "",
            quantity:
              p.quantity !== null && p.quantity !== undefined
                ? String(p.quantity)
                : "",
          }))
        : [];

      setPackingRows(mappedPacking);

      setEditingId(ch.id || id);
      setSeqInfo(null);

      setIsChallanModalOpen(false);
      setIsListViewModalOpen(false);
    } catch (err) {
      console.error("Error loading challan:", err);
      Swal.fire("Error", "Failed to load challan", "error");
    }
  };

  const handleDeleteChallanFromList = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the challan permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(routes.delete(id));
      setChallanList((prev) => prev.filter((c: any) => c.id !== id));
      setListViewChallanList((prev) => prev.filter((c: any) => c.id !== id));
      Swal.fire("Deleted!", "Challan deleted successfully", "success");

      if (editingId === id) {
        handleAddNew(false);
      }
    } catch (err) {
      console.error("Delete Error:", err);
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  // --- Save / Update / Delete ---

  const handleSave = async () => {
    if (!date || !challanNo || !partyName) {
      Swal.fire(
        "Error",
        "Please fill Date, Challan No and Party Name",
        "error"
      );
      return;
    }

    const hasRowData = rows.some(
      (r) => r.artNo || r.barCode || r.baleNo || r.box || r.pcs || r.pcsPerBox
    );

    if (!hasRowData) {
      Swal.fire("Error", "Please enter at least one dispatch row", "error");
      return;
    }

    const rowsPayload = rows.map((r) => ({
      barCode: r.barCode,
      baleNo: r.baleNo,
      artNo: r.artNo,
      description: r.description,
      lotNumber: r.lotNumber,
      size: r.size,
      shade: r.shade,
      box: toNumberOrNull(r.box),
      pcsPerBox: toNumberOrNull(r.pcsPerBox),
      pcs: toNumberOrNull(r.pcs),
      rate: toNumberOrNull(r.rate),
      amt: toNumberOrNull(r.amt),
    }));

    const packingRowsPayload = packingRows.map((p) => ({
      itemName: p.itemName,
      quantity: toNumberOrNull(p.quantity),
    }));

    const payload = {
      serialNo,
      date,
      challanNo,
      partyName,
      brokerName,
      transportName,
      dispatchedBy,
      remarks1,
      remarks2,
      station,
      totalAmt: toNumberOrNull(totalAmt),
      discount: toNumberOrNull(discount),
      discountPercent: toNumberOrNull(discountPercent),
      tax: toNumberOrNull(tax),
      taxPercent: toNumberOrNull(taxPercent),
      cartage: toNumberOrNull(cartage),
      netAmt: toNumberOrNull(netAmt),
      rows: rowsPayload,
      packingRows: packingRowsPayload,
    };

    try {
      if (editingId) {
        await api.put(routes.update(editingId), payload);
        Swal.fire("Success", "Dispatch challan updated!", "success");
      } else {
        const res = await api.post(routes.create, payload);

        if (seqInfo) {
          const yearKey = `dispatchYear_${seqInfo.brokerKey}`;
          const seqKey = `dispatchSeq_${seqInfo.brokerKey}`;
          localStorage.setItem(yearKey, seqInfo.year);
          localStorage.setItem(seqKey, String(seqInfo.seq));
        }

        Swal.fire("Success", "Dispatch challan saved successfully!", "success");
        if (res?.data?.id) {
          setEditingId(res.data.id);
        }
      }
    } catch (error: any) {
      console.error("Error saving challan:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Failed to save challan",
        "error"
      );
    }
  };

  const handleUpdate = async () => {
    await openChallanSearch();
  };

  const handleDelete = async () => {
    if (!editingId) {
      Swal.fire("Info", "No challan loaded for deletion", "info");
      return;
    }

    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the challan permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(routes.delete(editingId));
      Swal.fire("Deleted!", "Challan deleted successfully", "success");
      handleAddNew(false);
    } catch (err) {
      console.error("Delete Error:", err);
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  // --- Purchase Order → Packing ---

  const filteredPOs = useMemo(() => {
    if (!poSearchTerm) return poList;
    const term = poSearchTerm.toLowerCase();
    return poList.filter((po: any) => {
      const orderNo = (po.orderNo || "").toLowerCase();
      const dateStr = (po.date || "").toLowerCase();
      const pName = (po.partyName || po.party?.partyName || "").toLowerCase();
      return (
        orderNo.includes(term) || dateStr.includes(term) || pName.includes(term)
      );
    });
  }, [poSearchTerm, poList]);

  const openPurchaseOrderModal = async () => {
    try {
      const res = await api.get<any[]>(routes.purchaseOrders);
      let data = Array.isArray(res.data) ? res.data : [];

      if (partyName) {
        data = data.filter(
          (po: any) => (po.partyName || po.party?.partyName) === partyName
        );
      }

      setPoList(data);
      setPoSearchTerm("");
      setIsPOModalOpen(true);
    } catch (err) {
      console.error("Error loading purchase orders:", err);
      Swal.fire("Error", "Failed to load purchase orders", "error");
    }
  };

  const handleSelectPOForPacking = (po: any) => {
    const items = Array.isArray(po.items) ? po.items : [];
    if (!items.length) {
      Swal.fire("Info", "Selected purchase order has no items.", "info");
      return;
    }

    const newPackingRows: PackingRow[] = items.map((it: any, idx: number) => ({
      id: Date.now() + idx,
      itemName:
        it.material?.materialName ||
        it.materialName ||
        `Material ${it.materialId || ""}`,
      quantity: it.quantity != null ? String(it.quantity) : "",
    }));

    setPackingRows(newPackingRows);
    setIsPOModalOpen(false);
  };

  // --- Print challan (hidden iframe) ---

  const handlePrint = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    try {
      const formattedDate = date ? new Date(date).toLocaleDateString() : "";

      const rowHtml = rows
        .filter(
          (r) =>
            r.artNo ||
            r.description ||
            r.size ||
            r.shade ||
            r.pcs ||
            r.rate ||
            r.amt
        )
        .map(
          (r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.artNo || ""}</td>
          <td>${r.description || ""}</td>
          <td>${r.size || ""}</td>
          <td>${r.shade || ""}</td>
          <td style="text-align:right;">${r.box || ""}</td>
          <td style="text-align:right;">${r.pcsPerBox || ""}</td>
          <td style="text-align:right;">${r.pcs || ""}</td>
          <td style="text-align:right;">${r.rate || ""}</td>
          <td style="text-align:right;">${r.amt || ""}</td>
        </tr>`
        )
        .join("");

      const packingHtml = packingRows
        .filter((p) => p.itemName || p.quantity)
        .map(
          (p, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${p.itemName || ""}</td>
          <td style="text-align:right;">${p.quantity || ""}</td>
        </tr>`
        )
        .join("");

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dispatch Challan</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
    h1, h2, h3 { margin: 0; padding: 0; }
    .header { display: flex;
  flex-wrap: nowrap;          
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #ddd;
  font-size: 13px; }
    .header-left { font-size: 14px; }
    .header-right { font-size: 14px; text-align: right; }
    .section { margin-top: 8px; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 8px; }
    th, td { border: 1px solid #444; padding: 4px 6px; }
    th { background: #eee; }
    .totals { margin-top: 10px; width: 100%; font-size: 12px; }
    .totals-right {  width: 40%; float: right; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    @media print {
      body { margin: 8mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right; margin-bottom:8px;">
    <button onclick="window.print()">Print</button>
  </div>

  <div style="text-align:center; margin-bottom:8px;">
    <h2>Dispatch Challan</h2>
  </div>

  <div class="header">
    <div class="header-left">
      <div><strong>Challan No:</strong> ${challanNo || ""}</div>
      <div><strong>Party:</strong> ${partyName || ""}</div>
      <div><strong>Station:</strong> ${station || ""}</div>
      <div><strong>Broker:</strong> ${brokerName || ""}</div>
      <div><strong>Transport:</strong> ${transportName || ""}</div>
    </div>
    <div class="header-right">
      <div><strong>Date:</strong> ${formattedDate}</div>
      <div><strong>Dispatched By:</strong> ${dispatchedBy || ""}</div>
      <div><strong>Remarks 1:</strong> ${remarks1 || ""}</div>
      <div><strong>Remarks 2:</strong> ${remarks2 || ""}</div>
    </div>
  </div>

  <h3>Item Details</h3>
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Art No</th>
        <th>Description</th>
        <th>Size</th>
        <th>Shade</th>
        <th style="text-align:right;">Box</th>
        <th style="text-align:right;">Pcs/Box</th>
        <th style="text-align:right;">Pcs</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${
        rowHtml ||
        `<tr><td colspan="10" style="text-align:center;">No rows</td></tr>`
      }
    </tbody>
  </table>

  ${
    packingHtml
      ? `
  <h3 style="margin-top:14px;">Packing Details</h3>
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Item Name</th>
        <th style="text-align:right;">Quantity</th>
      </tr>
    </thead>
    <tbody>
      ${packingHtml}
    </tbody>
  </table>
  `
      : ""
  }

  <div class="section" style="margin-top:14px;">
    <div class="totals-right">
      <div class="totals-row">
        <span><strong>Total Amount:</strong></span>
        <span>${totalAmt || "0"}</span>
      </div>
      <div class="totals-row">
        <span><strong>Discount (${discountPercent || "0"}%):</strong></span>
        <span>${discount || "0"}</span>
      </div>
      <div class="totals-row">
        <span><strong>Tax (${taxPercent || "0"}%):</strong></span>
        <span>${tax || "0"}</span>
      </div>
      <div class="totals-row">
        <span><strong>Cartage:</strong></span>
        <span>${cartage || "0"}</span>
      </div>
      <div class="totals-row" style="margin-top:4px;">
        <span><strong>Net Amount:</strong></span>
        <span><strong>${netAmt || "0"}</strong></span>
      </div>
    </div>
    <div style="clear:both;"></div>
  </div>

  <script>
    window.onload = function () {
      try {
        window.focus();
        window.print();
      } catch (e) {
        console.error('Print error', e);
      }
      setTimeout(function () {
        try {
          if (window.frameElement && window.frameElement.parentNode) {
            window.frameElement.parentNode.removeChild(window.frameElement);
          }
        } catch (e) {}
      }, 500);
    };
  </script>
</body>
</html>`;

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";

      document.body.appendChild(iframe);

      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        document.body.removeChild(iframe);
        alert("Unable to open print preview.");
        return;
      }

      const printDoc = printWindow.document;
      printDoc.open();
      printDoc.write(html);
      printDoc.close();
    } catch (err) {
      console.error("Print generation failed:", err);
      alert("Failed to generate print preview. See console for details.");
    }
  };

  // --- Main Render ---

  const fieldOrder: (keyof DispatchRow)[] = [
    "barCode",
    "artNo",
    "description",
    "size",
    "shade",
    "box",
    "pcsPerBox",
    "pcs",
    "rate",
    "amt",
  ];

  return (
    <Dashboard>
      {/* Modals */}
      <ProductSearchModal
        isOpen={isModalOpen}
        searchTerm={productSearchTerm}
        products={filteredProducts}
        onSearchTermChange={setProductSearchTerm}
        onSelect={handleProductSelect}
        onClose={() => setIsModalOpen(false)}
      />
      <ChallanSearchModal
        isOpen={isChallanModalOpen}
        searchText={challanSearchText}
        challans={filteredChallans}
        onSearchTextChange={setChallanSearchText}
        onEdit={handleSelectChallan}
        onDelete={handleDeleteChallanFromList}
        onClose={() => setIsChallanModalOpen(false)}
      />
      <ListViewModal
        isOpen={isListViewModalOpen}
        searchText={listViewSearchText}
        challans={filteredListViewChallans}
        onSearchTextChange={setListViewSearchText}
        onEdit={handleSelectChallan}
        onDelete={handleDeleteChallanFromList}
        onClose={() => setIsListViewModalOpen(false)}
      />
      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        searchText={poSearchTerm}
        pos={filteredPOs}
        onSearchTextChange={setPoSearchTerm}
        onSelectPO={handleSelectPOForPacking}
        onClose={() => setIsPOModalOpen(false)}
      />

      {/* Main content */}
      <div className="p-3">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-blue-800">
            Dispatch Challan
          </h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div>
              <label className="block font-semibold">Serial No.</label>
              <input
                type="text"
                value={serialNo}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
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
              <label className="block font-semibold">
                Challan No. (YYYY/00001)
              </label>
              <input
                type="text"
                value={challanNo}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <select
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Party</option>
                {partyList.map((party) => (
                  <option
                    key={party.id ?? party.partyName}
                    value={party.partyName}
                  >
                    {party.partyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Station</label>
              <input
                type="text"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">Dispatched By</label>
              <input
                type="text"
                value={dispatchedBy}
                onChange={(e) => setDispatchedBy(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Remarks 1</label>
              <input
                type="text"
                value={remarks1}
                onChange={(e) => setRemarks1(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Remarks 2</label>
              <input
                type="text"
                value={remarks2}
                onChange={(e) => setRemarks2(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Broker Name</label>
              <input
                type="text"
                value={brokerName}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div className="col-span-1">
              <label className="block font-semibold">Transport Name</label>
              <input
                type="text"
                value={transportName}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div className="col-span-3"></div>
          </div>

          {/* Main Table */}
          <div className="h-[200px] w-full overflow-auto border">
            <table className="w-[1100px] text-s">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-4">S.N</th>
                  <th className="border p-4">Bar Code</th>
                  <th className="border p-4">Art No</th>
                  <th className="border p-4">Description</th>
                  <th className="border p-4">Size</th>
                  <th className="border p-4">Shade</th>
                  <th className="border p-4">Box</th>
                  <th className="border p-4">Pcs/Box</th>
                  <th className="border p-4">Pcs</th>
                  <th className="border p-4">Rate</th>
                  <th className="border p-4">Amt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border p-1 text-center">{index + 1}</td>
                    {fieldOrder.map((field) => (
                      <td key={field} className="border p-1">
                        <input
                          type="text"
                          value={row[field] as string}
                          onChange={(e) =>
                            handleChange(row.id, field, e.target.value)
                          }
                          onFocus={
                            field === "artNo"
                              ? () => handleArtNoFocus(row.id)
                              : undefined
                          }
                          className={`border p-1 rounded w-full ${
                            field === "artNo"
                              ? "bg-yellow-50 cursor-pointer"
                              : ""
                          }`}
                          placeholder={
                            field === "artNo"
                              ? "Click to select from Packing"
                              : ""
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Row buttons */}
          <div className="flex justify-start mt-6 space-x-3">
            <button
              onClick={addMainRow}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2"
            >
              Add Row
            </button>
            <button
              onClick={() => deleteMainRow()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mt-2"
            >
              Delete Row
            </button>
          </div>

          {/* Packing + Totals */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {/* Packing */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Packing</h3>
                <button
                  onClick={openPurchaseOrderModal}
                  className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                >
                  Load From Purchase Order
                </button>
              </div>
              <table className="w-full border text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Sr.No</th>
                    <th className="border p-2">Item Name</th>
                    <th className="border p-2">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {packingRows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="border p-1 text-center">{index + 1}</td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.itemName}
                          onChange={(e) =>
                            handlePackingChange(
                              row.id,
                              "itemName",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.quantity}
                          onChange={(e) =>
                            handlePackingChange(
                              row.id,
                              "quantity",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="col-span-1 text-right space-y-2">
              <div>
                <label className="font-semibold mr-2">Total Amt:</label>
                <input
                  type="text"
                  value={totalAmt}
                  onChange={(e) => setTotalAmt(e.target.value)}
                  className="border p-1 rounded w-32 text-right"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <label className="font-semibold">Disc(%):</label>
                <input
                  type="text"
                  value={discountPercent}
                  onChange={handleDiscountPercentChange}
                  className="border p-1 rounded w-16 text-right"
                  placeholder="%"
                />
                <input
                  type="text"
                  value={discount}
                  onChange={handleDiscountAmountChange}
                  className="border p-1 rounded w-24 text-right"
                  placeholder="Amt"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <label className="font-semibold">Tax(%):</label>
                <input
                  type="text"
                  value={taxPercent}
                  onChange={handleTaxPercentChange}
                  className="border p-1 rounded w-16 text-right"
                  placeholder="%"
                />
                <input
                  type="text"
                  value={tax}
                  onChange={handleTaxAmountChange}
                  className="border p-1 rounded w-24 text-right"
                  placeholder="Amt"
                />
              </div>

              <div>
                <label className="font-semibold mr-2">Cartage:</label>
                <input
                  type="text"
                  value={cartage}
                  onChange={(e) => setCartage(e.target.value)}
                  className="border p-1 rounded w-32 text-right"
                />
              </div>

              <div>
                <label className="font-semibold mr-2">Net Amt:</label>
                <input
                  type="text"
                  value={netAmt}
                  onChange={(e) => setNetAmt(e.target.value)}
                  className="border p-1 rounded w-32 text-right"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-start mt-6 space-x-3">
            <button
              onClick={addPackingRow}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Add Packing
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Save
            </button>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Update
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={openListViewModal}
              className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
            >
              List View
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Print
            </button>
            <button
              onClick={() => handleAddNew(true)}
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
            >
              New
            </button>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default DispatchChallan;
