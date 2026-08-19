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

// ----------------- API Routes -----------------
const routes = {
  create: "/dispatch-return-challan/create",
  list: "/dispatch-return-challan",
  get: (id: number) => `/dispatch-return-challan/${id}`,
  update: (id: number) => `/dispatch-return-challan/${id}`,
  delete: (id: number) => `/dispatch-return-challan/${id}`,
  parties: "/party/all",

  // ✅ load dispatched arts from dispatch challan
  dispatchChallans: "/dispatch-challan",

  // ✅ packing items from group
  materialGroups: "/material-groups",
  materials: "/materials",

  // ✅ Art Master
  arts: "/arts",

  // ✅ NEW: backend next numbers (same concept as dispatch challan)
  nextNumbers: "/dispatch-return-challan/next",
};

// ----------------- Types -----------------
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

// ✅ items shown in Art lookup modal (based on Dispatch Challans)
interface DispatchedItem {
  id: string;

  artNo: string;
  description: string;
  size: string;
  shade: string;

  box: number;
  perBox: number;
  pcs: number;

  rate: number; // ✅ last dispatched rate
  amount: number; // total dispatched amount
}

// Art Master list view
interface ArtListView {
  serialNumber?: string;
  artNo?: string;
  artName?: string;
  artGroup?: string;
  saleRate?: string | number;
}

// Material Group / Materials (for packing)
type MaterialGroupView = {
  id: number;
  materialGroup: string;
};

type MaterialView = {
  id: number;
  materialName: string;
  materialGroupId: number;
  materialUnit?: string;
};

// ----------------- Helpers -----------------
const formatRowSerial = (n: number) => String(n).padStart(4, "0");

const toNum = (v: any): number => {
  const n =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

// Date for print: DD/MM/YYYY
const formatDateDDMMYYYY = (value?: string | Date) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Date for list/search: DD/MM/YY
const formatDateDDMMYY = (value?: string | Date) => {
  const full = formatDateDDMMYYYY(value);
  if (!full) return "";
  const [dd, mm, yyyy] = full.split("/");
  return `${dd}/${mm}/${yyyy.slice(-2)}`;
};

const toNumberOrNull = (value: string): number | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
};

const numToStr = (value: any): string =>
  value === null || value === undefined ? "" : String(value);

// challanNo parse (used for "last rate" ordering)
const parseChallanNo = (
  challanNo: any
): { year: number; seq: number } | null => {
  const s = String(challanNo ?? "").trim();
  const m = /^(\d{4})\s*\/\s*(\d+)$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const seq = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(seq)) return null;
  return { year, seq };
};

// ✅ date compare: challanDate <= selectedDate
const isISODate = (s: any) => /^\d{4}-\d{2}-\d{2}/.test(String(s ?? ""));
const isOnOrBefore = (a?: string, b?: string) => {
  if (!a || !b) return true;

  if (isISODate(a) && isISODate(b)) {
    return String(a).slice(0, 10) <= String(b).slice(0, 10);
  }

  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return true;
  return da.getTime() <= db.getTime();
};

const isLikelyDuplicateArtError = (err: any) => {
  const status = err?.response?.status;
  const msg = String(err?.response?.data?.message || err?.message || "")
    .toLowerCase()
    .trim();
  return (
    status === 409 ||
    msg.includes("already exists") ||
    msg.includes("duplicate") ||
    msg.includes("unique")
  );
};

// ----------------- Modals -----------------
type ProductSearchModalProps = {
  isOpen: boolean;
  searchTerm: string;
  products: DispatchedItem[];
  onSearchTermChange: (value: string) => void;
  onSelect: (item: DispatchedItem) => void;
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
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-6xl p-4">
        <h3 className="text-xl font-bold mb-4 text-blue-800">
          Select Item (Dispatched to Party upto Date)
        </h3>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search by art no / description / size / shade..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="border p-2 rounded w-full mb-4"
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
                <th className="border p-2 text-right">Pcs</th>
                <th className="border p-2 text-right">Rate (Last)</th>
                <th className="border p-2 text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, index) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-yellow-100"
                  onClick={() => onSelect(item)}
                >
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">{item.artNo}</td>
                  <td className="border p-2">{item.description}</td>
                  <td className="border p-2">{item.size}</td>
                  <td className="border p-2">{item.shade}</td>
                  <td className="border p-2 text-right">{item.box}</td>
                  <td className="border p-2 text-right">{item.pcs}</td>
                  <td className="border p-2 text-right">
                    {Number.isFinite(item.rate) ? item.rate.toFixed(2) : "0.00"}
                  </td>
                  <td className="border p-2 text-right">
                    {Number.isFinite(item.amount)
                      ? item.amount.toFixed(2)
                      : "0.00"}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="border p-2 text-center text-gray-500"
                  >
                    No dispatched items found for selected party (upto date).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-5xl p-4">
        <h3 className="text-xl font-bold mb-3 text-blue-800">SearchWindow</h3>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by Challan No / Date / Party / Station / Art No..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3"
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
                <th className="border p-2">ART_NO(S)</th>
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
                  const artNos = Array.isArray(c.rows)
                    ? Array.from(
                        new Set(
                          c.rows
                            .map((r: any) => (r.artNo || "").toString().trim())
                            .filter(Boolean)
                        )
                      ).join(", ")
                    : "";
                  return (
                    <tr key={c.id || index} className="hover:bg-yellow-100">
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{c.challanNo}</td>
                      <td className="border p-2">
                        {c.date || c.dated
                          ? formatDateDDMMYY(c.date || c.dated)
                          : ""}
                      </td>
                      <td className="border p-2">{c.partyName}</td>
                      <td className="border p-2">{station}</td>
                      <td className="border p-2">{artNos}</td>
                      <td className="border p-2 text-center space-x-1">
                        <button
                          onClick={() => onEdit(c.id)}
                          className="px-2 py-1 bg-blue-500 text-white rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded"
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
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[55]">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-6xl p-4 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-bold mb-3 text-blue-800">
          Dispatch Return Challan List View
        </h3>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by Date / Art No / Size / Shade / Rate / Amt / Net Amt..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />
        <div className="overflow-auto max-h-[430px] border border-gray-300">
          <table className="w-full text-sm">
            <thead className="bg-green-100 sticky top-0">
              <tr>
                <th className="border p-2">Sr.No</th>
                <th className="border p-2">Dated</th>
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
                    colSpan={12}
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
                      <td className="border p-2">
                        {c.date || c.dated
                          ? formatDateDDMMYY(c.date || c.dated)
                          : ""}
                      </td>
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
                          className="px-2 py-1 bg-blue-500 text-white rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded"
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
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

type PartySearchModalProps = {
  isOpen: boolean;
  searchText: string;
  parties: Party[];
  onSearchTextChange: (value: string) => void;
  onSelect: (party: Party) => void;
  onClose: () => void;
};

const PartySearchModal: React.FC<PartySearchModalProps> = ({
  isOpen,
  searchText,
  parties,
  onSearchTextChange,
  onSelect,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[52]">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-4xl p-4 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-bold mb-3 text-blue-800">Select Party</h3>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by Party / Broker / Transport..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />
        <div className="overflow-auto max-h-[430px] border border-gray-300">
          <table className="w-full text-sm">
            <thead className="bg-sky-100 sticky top-0">
              <tr>
                <th className="border p-2">S No</th>
                <th className="border p-2 text-left">Party Name</th>
                <th className="border p-2 text-left">Station</th>
                <th className="border p-2 text-left">Broker</th>
                <th className="border p-2 text-left">Transport</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 ? (
                <tr>
                  <td
                    className="border p-3 text-center text-gray-500"
                    colSpan={6}
                  >
                    No parties found
                  </td>
                </tr>
              ) : (
                parties.map((p, idx) => (
                  <tr key={p.id ?? p.partyName} className="hover:bg-sky-50">
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{p.partyName}</td>
                    <td className="border p-2">{p.station || ""}</td>
                    <td className="border p-2">{p.agent?.agentName || ""}</td>
                    <td className="border p-2">
                      {p.transport?.transportName || ""}
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => onSelect(p)}
                        className="px-3 py-1 bg-blue-500 text-white rounded"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Packing Items from Material Group (default "PETTI PACKING")
type PackingGroupItemsModalProps = {
  isOpen: boolean;
  groups: MaterialGroupView[];
  materials: MaterialView[];
  defaultGroupName?: string;
  onApply: (rows: { itemName: string; quantity: string }[]) => void;
  onClose: () => void;
};

const PackingGroupItemsModal: React.FC<PackingGroupItemsModalProps> = ({
  isOpen,
  groups,
  materials,
  defaultGroupName = "PETTI PACKING",
  onApply,
  onClose,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [qtyById, setQtyById] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    const target = defaultGroupName.trim().toLowerCase();
    const dg =
      groups.find(
        (g) => (g.materialGroup || "").trim().toLowerCase() === target
      ) ||
      groups.find((g) =>
        (g.materialGroup || "").trim().toLowerCase().includes("petti")
      ) ||
      groups.find((g) =>
        (g.materialGroup || "").trim().toLowerCase().includes("peti")
      );

    setSelectedGroupId(dg?.id ?? "");
    setSearch("");
    setSelectedIds(new Set());
    setQtyById({});
  }, [isOpen, groups, defaultGroupName]);

  const groupMaterials = useMemo(() => {
    const base =
      selectedGroupId === ""
        ? []
        : materials.filter((m) => m.materialGroupId === selectedGroupId);

    const term = search.trim().toLowerCase();
    if (!term) return base;

    return base.filter((m) =>
      (m.materialName || "").toLowerCase().includes(term)
    );
  }, [materials, selectedGroupId, search]);

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedIds(new Set(groupMaterials.map((m) => m.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleUseSelected = () => {
    if (selectedIds.size === 0) {
      Swal.fire("Info", "Please select at least 1 item.", "info");
      return;
    }

    const rows = groupMaterials
      .filter((m) => selectedIds.has(m.id))
      .map((m) => ({
        itemName: m.materialName,
        quantity: (qtyById[m.id] ?? "").toString(),
      }));

    onApply(rows);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-5xl p-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-blue-800">
            Select Packing Items (Default: {defaultGroupName})
          </h3>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold mb-1">
              Material Group
            </label>
            <select
              className="border p-2 rounded w-full"
              value={selectedGroupId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedGroupId(v ? Number(v) : "");
                setSelectedIds(new Set());
                setQtyById({});
              }}
            >
              <option value="">-- Select Group --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.materialGroup}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Search Items
            </label>
            <input
              className="border p-2 rounded w-full"
              placeholder="Search by item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={selectAll}
            className="px-3 py-1 bg-indigo-600 text-white rounded"
            disabled={groupMaterials.length === 0}
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 bg-gray-200 text-black rounded"
            disabled={selectedIds.size === 0}
          >
            Clear
          </button>

          <button
            onClick={handleUseSelected}
            className="ml-auto px-3 py-1 bg-green-600 text-white rounded"
          >
            Use Selected Items
          </button>
        </div>

        <div className="overflow-auto border border-gray-300 max-h-[450px]">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="border p-2 w-16 text-center">Select</th>
                <th className="border p-2 text-left">Item Name</th>
                <th className="border p-2 w-32 text-center">Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedGroupId === "" ? (
                <tr>
                  <td
                    colSpan={3}
                    className="border p-3 text-center text-gray-500"
                  >
                    Please select a material group.
                  </td>
                </tr>
              ) : groupMaterials.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="border p-3 text-center text-gray-500"
                  >
                    No items found in this group.
                  </td>
                </tr>
              ) : (
                groupMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-yellow-50">
                    <td className="border p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleOne(m.id)}
                      />
                    </td>
                    <td className="border p-2">{m.materialName}</td>
                    <td className="border p-2">
                      <input
                        type="text"
                        className="border p-1 rounded w-full text-right"
                        placeholder="Qty"
                        value={qtyById[m.id] ?? ""}
                        onChange={(e) =>
                          setQtyById((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                        onFocus={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            next.add(m.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          Tip: Qty type karte hi item auto-select ho jayega.
        </div>
      </div>
    </div>
  );
};

// ----------------- Main Component -----------------
const DispatchReturn: React.FC = () => {
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

  const [discountMode, setDiscountMode] = useState<"percent" | "amount" | null>(
    null
  );
  const [taxMode, setTaxMode] = useState<"percent" | "amount" | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [partyList, setPartyList] = useState<Party[]>([]);
  const [productList, setProductList] = useState<DispatchedItem[]>([]);

  // Art lookup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRowIdForLookup, setCurrentRowIdForLookup] =
    useState<number | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Challan search modal
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [challanList, setChallanList] = useState<any[]>([]);
  const [challanSearchText, setChallanSearchText] = useState("");

  // List View modal
  const [isListViewModalOpen, setIsListViewModalOpen] = useState(false);
  const [listViewChallanList, setListViewChallanList] = useState<any[]>([]);
  const [listViewSearchText, setListViewSearchText] = useState("");

  // Party search modal
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [partySearchText, setPartySearchText] = useState("");

  // Save in progress
  const [isSaving, setIsSaving] = useState(false);

  // --- Focus navigation state (row/col) ---
  const [pendingFocus, setPendingFocus] = useState<{
    rowIndex: number;
    colIndex: number;
  } | null>(null);

  // packing items from "PETTI PACKING" group
  const [materialGroups, setMaterialGroups] = useState<MaterialGroupView[]>([]);
  const [materials, setMaterials] = useState<MaterialView[]>([]);
  const [isPackingGroupModalOpen, setIsPackingGroupModalOpen] = useState(false);

  // ✅ avoid next-number generation when loading challan for edit
  const hydratingChallanRef = useRef(false);

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

  // ================= GLOBAL ENTER => NEXT CONTROL (TAB) =================
  useEffect(() => {
    const handleGlobalEnter = (e: any) => {
      if (e.key !== "Enter") return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest(".swal2-container")) return;
      if (target.hasAttribute("data-row-index")) return;
      if (target.tagName === "TEXTAREA") return;

      e.preventDefault();

      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          !el.getAttribute("aria-hidden") &&
          el.offsetParent !== null
      );

      const active = document.activeElement as HTMLElement | null;
      if (!active) return;

      const index = focusables.indexOf(active);
      if (index === -1) return;

      const next = focusables[index + 1];
      if (!next) return;

      next.focus();
      if (
        next instanceof HTMLInputElement ||
        next instanceof HTMLTextAreaElement
      ) {
        next.select?.();
      }
    };

    window.addEventListener("keydown", handleGlobalEnter);
    return () => window.removeEventListener("keydown", handleGlobalEnter);
  }, []);

  // ----------------- Row management -----------------
  const addMainRow = useCallback(() => {
    setRows((prev) => {
      const nextIndex = prev.length;
      const newRow: DispatchRow = {
        id: Date.now() + Math.random(),
        barCode: "",
        baleNo: formatRowSerial(nextIndex + 1),
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
      const newRows = [...prev, newRow];
      setPendingFocus({ rowIndex: newRows.length - 1, colIndex: 0 });
      return newRows;
    });
  }, []);

  const deleteMainRow = useCallback((indexToDelete?: number) => {
    setRows((prev) => {
      let newRows: DispatchRow[];
      let removedIndex: number;
      if (typeof indexToDelete === "number") {
        removedIndex = indexToDelete;
        newRows = prev.filter((_, index) => index !== indexToDelete);
      } else {
        removedIndex = prev.length - 1;
        newRows = prev.slice(0, Math.max(prev.length - 1, 0));
      }

      if (newRows.length > 0) {
        const targetRow = Math.min(removedIndex, newRows.length - 1);
        setPendingFocus({ rowIndex: targetRow, colIndex: 0 });
      } else {
        setPendingFocus(null);
      }
      return newRows;
    });
  }, []);

  const addPackingRow = useCallback(() => {
    setPackingRows((prev) => {
      const newRow: PackingRow = {
        id: Date.now() + Math.random(),
        itemName: "",
        quantity: "",
      };
      const newRows = [...prev, newRow];

      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>(
          `input[data-packing-id="${newRow.id}"][data-packing-field="itemName"]`
        );
        if (el) {
          el.focus();
          el.select?.();
        }
      }, 0);

      return newRows;
    });
  }, []);

  useEffect(() => {
    if (rows.length === 0) addMainRow();
    if (packingRows.length === 0) addPackingRow();
  }, [addMainRow, addPackingRow, rows.length, packingRows.length]);

  // --- Focus effect for pendingFocus ---
  useEffect(() => {
    if (!pendingFocus) return;
    const selector = `input[data-row-index="${pendingFocus.rowIndex}"][data-col-index="${pendingFocus.colIndex}"]`;
    const el =
      typeof document !== "undefined"
        ? (document.querySelector<HTMLInputElement>(selector) as
            | HTMLInputElement
            | null)
        : null;
    if (el) {
      el.focus();
      el.select?.();
    }
    setPendingFocus(null);
  }, [pendingFocus, rows.length]);

  // ----------------- Row change -----------------
  const handleChange = (id: number, field: keyof DispatchRow, value: string) => {
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

  // --- Keyboard navigation: Enter -> next col/row (grid only) ---
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const rowIndexStr = e.currentTarget.getAttribute("data-row-index");
      const colIndexStr = e.currentTarget.getAttribute("data-col-index");
      if (rowIndexStr == null || colIndexStr == null) return;

      const rowIndex = parseInt(rowIndexStr, 10);
      const colIndex = parseInt(colIndexStr, 10);
      if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) return;

      const totalCols = fieldOrder.length;

      let nextRow = rowIndex;
      let nextCol = colIndex + 1;

      if (nextCol >= totalCols) {
        nextCol = 0;
        nextRow = rowIndex + 1;
      }

      if (nextRow >= rows.length) return;

      const selector = `input[data-row-index="${nextRow}"][data-col-index="${nextCol}"]`;
      const nextEl =
        typeof document !== "undefined"
          ? (document.querySelector<HTMLInputElement>(selector) as
              | HTMLInputElement
              | null)
          : null;

      if (nextEl) {
        nextEl.focus();
        nextEl.select?.();
      }
    },
    [rows.length, fieldOrder.length]
  );

  // ----------------- Totals -----------------
  const { totalBoxes, totalPcsSum, uniqueArtNosCount } = useMemo(() => {
    let boxSum = 0;
    let pcsSum = 0;
    const artNos = new Set<string>();

    rows.forEach((row) => {
      const boxNum = parseFloat(row.box);
      const pcsNum = parseFloat(row.pcs);

      if (!Number.isNaN(boxNum)) boxSum += boxNum;
      if (!Number.isNaN(pcsNum)) pcsSum += pcsNum;
      if (row.artNo) artNos.add(row.artNo);
    });

    return {
      totalBoxes: boxSum,
      totalPcsSum: pcsSum,
      uniqueArtNosCount: artNos.size,
    };
  }, [rows]);

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
    setDiscountMode("percent");

    const t = parseFloat(totalAmt);
    const p = parseFloat(val);
    if (Number.isNaN(t) || Number.isNaN(p)) {
      setDiscount("");
      return;
    }
    const amt = (t * p) / 100;
    setDiscount(amt ? String(amt) : "");
  };

  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDiscount(val);
    setDiscountMode("amount");

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
    setTaxMode("percent");

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
    setTaxMode("amount");

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
    if (Number.isNaN(t) || t === 0) return;

    if (discountMode === "percent" && discountPercent) {
      const p = parseFloat(discountPercent);
      if (!Number.isNaN(p)) {
        const amt = (t * p) / 100;
        setDiscount(amt ? String(amt) : "");
      }
    }

    if (taxMode === "percent" && taxPercent) {
      const p = parseFloat(taxPercent);
      if (!Number.isNaN(p)) {
        const amt = (t * p) / 100;
        setTax(amt ? String(amt) : "");
      }
    }
  }, [totalAmt, discountPercent, taxPercent, discountMode, taxMode]);

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

  // ----------------- Load masters -----------------
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

  const loadMaterialGroups = useCallback(async () => {
    try {
      const res = await api.get<any[]>(routes.materialGroups);
      const arr = Array.isArray(res.data) ? res.data : [];
      setMaterialGroups(
        arr
          .map((g) => ({
            id: Number(g.id),
            materialGroup: String(g.materialGroup ?? ""),
          }))
          .filter((g) => Number.isFinite(g.id) && g.materialGroup)
      );
    } catch (err) {
      console.error("Error loading material groups:", err);
      setMaterialGroups([]);
      Swal.fire("Error", "Failed to load material groups", "error");
    }
  }, []);

  const loadMaterialsMaster = useCallback(async () => {
    try {
      const res = await api.get<any[]>(routes.materials);
      const arr = Array.isArray(res.data) ? res.data : [];
      setMaterials(
        arr
          .map((m) => ({
            id: Number(m.id),
            materialName: String(m.materialName ?? ""),
            materialGroupId: Number(
              m.materialGroupId ?? m.materialGroup?.id ?? m.groupId ?? 0
            ),
            materialUnit: m.materialUnit ? String(m.materialUnit) : undefined,
          }))
          .filter(
            (m) =>
              Number.isFinite(m.id) &&
              Number.isFinite(m.materialGroupId) &&
              m.materialGroupId > 0 &&
              m.materialName
          )
      );
    } catch (err) {
      console.error("Error loading materials:", err);
      setMaterials([]);
      Swal.fire("Error", "Failed to load materials", "error");
    }
  }, []);

  // ----------------- ✅ Dispatched items loader (Party + upto Date) -----------------
  const loadDispatchedArtsForParty = useCallback(
    async (party: string, uptoDate: string) => {
      const partyKey = String(party || "").trim().toLowerCase();

      if (!partyKey) {
        setProductList([]);
        return;
      }

      type Order = { ts: number; seq: number; rowIndex: number };
      const compareOrder = (a: Order, b: Order) => {
        if (a.ts !== b.ts) return a.ts - b.ts;
        if (a.seq !== b.seq) return a.seq - b.seq;
        return a.rowIndex - b.rowIndex;
      };

      const toTs = (d: any) => {
        if (!d) return 0;
        const dt = new Date(d);
        const ts = dt.getTime();
        return Number.isFinite(ts) ? ts : 0;
      };

      try {
        const res = await api.get<any[]>(routes.dispatchChallans);
        const challans = Array.isArray(res.data) ? res.data : [];

        const filtered = challans.filter((ch: any) => {
          const chParty = String(ch?.partyName || "").trim().toLowerCase();
          if (chParty !== partyKey) return false;

          const chDate = ch?.date || ch?.dated || "";
          return isOnOrBefore(chDate, uptoDate);
        });

        type Agg = {
          artNo: string;
          description: string;
          size: string;
          shade: string;
          box: number;
          pcs: number;
          amount: number;

          lastRate: number;
          lastOrder: Order | null;
        };

        const makeKey = (
          artNo: string,
          size: string,
          shade: string,
          description: string
        ) => `${artNo}||${size}||${shade}||${description}`;

        const map = new Map<string, Agg>();

        filtered.forEach((ch: any) => {
          const rows = Array.isArray(ch.rows) ? ch.rows : [];

          const chDate = ch?.date || ch?.dated || "";
          const ts = toTs(chDate);

          const parsedCN = parseChallanNo(ch?.challanNo);
          const seq = parsedCN?.seq ?? 0;

          rows.forEach((r: any, rowIndex: number) => {
            const artNo = String(r.artNo || "").trim();
            if (!artNo) return;

            const description = String(r.description || "").trim();
            const size = String(r.size || r.sizeName || "").trim();
            const shade = String(r.shade || r.shadeName || "").trim();

            const box = toNum(r.box);
            const perBox = toNum(r.pcsPerBox);

            const pcs =
              r.pcs != null
                ? toNum(r.pcs)
                : Number.isFinite(box * perBox)
                ? box * perBox
                : 0;

            const rate = toNum(r.rate);

            const amt =
              r.amt != null
                ? toNum(r.amt)
                : Number.isFinite(pcs * rate)
                ? pcs * rate
                : 0;

            const key = makeKey(artNo, size, shade, description);
            const currentOrder: Order = { ts, seq, rowIndex };

            const existing = map.get(key);
            if (existing) {
              existing.box += box;
              existing.pcs += pcs;
              existing.amount += amt;

              if (
                !existing.lastOrder ||
                compareOrder(currentOrder, existing.lastOrder) > 0
              ) {
                existing.lastOrder = currentOrder;
                existing.lastRate = rate;
              }
            } else {
              map.set(key, {
                artNo,
                description,
                size,
                shade,
                box,
                pcs,
                amount: amt,
                lastRate: rate,
                lastOrder: currentOrder,
              });
            }
          });
        });

        const items: DispatchedItem[] = [];
        map.forEach((agg, key) => {
          const perBox = agg.box > 0 ? agg.pcs / agg.box : 0;

          items.push({
            id: key,
            artNo: agg.artNo,
            description: agg.description,
            size: agg.size,
            shade: agg.shade,
            box: agg.box,
            perBox,
            pcs: agg.pcs,
            rate: agg.lastRate || 0,
            amount: agg.amount,
          });
        });

        items.sort((a, b) => a.artNo.localeCompare(b.artNo));
        setProductList(items);
      } catch (err) {
        console.error("Error loading dispatched items:", err);
        setProductList([]);
        Swal.fire("Error", "Failed to load dispatched arts for party", "error");
      }
    },
    []
  );

  useEffect(() => {
    if (!partyName) {
      setProductList([]);
      return;
    }
    loadDispatchedArtsForParty(partyName, date);
  }, [partyName, date, loadDispatchedArtsForParty]);

  // ----------------- ✅ Sync selected arts into Art Master -----------------
  const syncArtsToMasterFromRows = useCallback(
    async (rowsToSync: DispatchRow[]) => {
      const artMap = new Map<
        string,
        { artNo: string; artName: string; saleRate?: number | null }
      >();

      for (const r of rowsToSync) {
        const artNo = String(r.artNo || "").trim();
        if (!artNo) continue;

        const key = artNo.toLowerCase();
        if (!artMap.has(key)) {
          const artName = String(r.description || "").trim() || artNo;
          const saleRate = toNumberOrNull(String(r.rate ?? ""));
          artMap.set(key, { artNo, artName, saleRate });
        }
      }

      const newArts = Array.from(artMap.values());
      if (newArts.length === 0) return;

      let existingSet = new Set<string>();
      try {
        const artsRes = await api.get<ArtListView[]>(routes.arts);
        const artsArr = Array.isArray(artsRes.data) ? artsRes.data : [];
        existingSet = new Set(
          artsArr
            .map((a) => String(a.artNo || "").trim().toLowerCase())
            .filter(Boolean)
        );
      } catch (err) {
        console.warn("Could not load arts list. Will try to create anyway.", err);
      }

      const toCreate = newArts.filter(
        (a) => !existingSet.has(a.artNo.toLowerCase())
      );
      if (toCreate.length === 0) return;

      const results = await Promise.allSettled(
        toCreate.map((a) =>
          api.post(routes.arts, {
            artNo: a.artNo,
            artName: a.artName,
            saleRate: a.saleRate,
          })
        )
      );

      const failures = results.filter(
        (r) => r.status === "rejected"
      ) as PromiseRejectedResult[];
      const nonDupFailures = failures.filter(
        (f) => !isLikelyDuplicateArtError(f.reason)
      );

      if (nonDupFailures.length > 0) {
        console.error("Some arts failed to sync:", nonDupFailures);
        Swal.fire(
          "Warning",
          "Challan saved, but some Arts could not be added to Art Master.",
          "warning"
        );
      }
    },
    []
  );

  // ----------------- New / Reset -----------------
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
    setDiscountMode(null);
    setTaxMode(null);

    setRows([]);
    setPackingRows([]);
    setEditingId(null);
    setPendingFocus(null);

    if (showToast)
      Swal.fire("Cleared", "Ready for new dispatch return challan", "success");
  }, []);

  // initial load once
  useEffect(() => {
    loadParties();
    loadMaterialGroups();
    loadMaterialsMaster();
    handleAddNew(false);
  }, [loadParties, loadMaterialGroups, loadMaterialsMaster, handleAddNew]);

  // ----------------- ✅ BACKEND Next numbers (same pattern as DispatchChallan) -----------------
  const fetchNextNumbers = useCallback(
    async (currentDate: string, currentParty: string, currentBroker: string) => {
      if (!currentParty || !currentDate) return;
      try {
        const res = await api.get(routes.nextNumbers, {
          params: {
            date: currentDate,
            partyName: currentParty,
            brokerName: currentBroker || undefined,
          },
        });
        if (res?.data) {
          setSerialNo(res.data.serialNo || "");
          setChallanNo(res.data.challanNo || "");
        }
      } catch (err) {
        console.error("Error fetching next numbers:", err);
        Swal.fire("Error", "Failed to get next Serial/Challan No", "error");
      }
    },
    []
  );

  // Party select => derive broker/transport/station; fetch numbers ONLY in NEW mode
  useEffect(() => {
    if (hydratingChallanRef.current) return;

    const selectedParty = partyList.find((p) => p.partyName === partyName);

    if (!selectedParty) {
      setBrokerName("");
      setTransportName("");
      setStation("");
      return;
    }

    const derivedBroker = selectedParty.agent?.agentName || "";
    const derivedTransport = selectedParty.transport?.transportName || "";
    const derivedStation = selectedParty.station || "";

    setBrokerName(derivedBroker);
    setTransportName(derivedTransport);
    setStation(derivedStation);

    if (!editingId) {
      fetchNextNumbers(date, partyName, derivedBroker);
    }
  }, [partyName, partyList, date, editingId, fetchNextNumbers]);

  // ----------------- Art lookup (Dispatched Items) -----------------
  const filteredProducts = useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();
    if (!term) return productList;
    return productList.filter((p) =>
      [p.artNo, p.description, p.size, p.shade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [productSearchTerm, productList]);

  const handleArtNoFocus = (rowId: number) => {
    if (!partyName) {
      Swal.fire("Info", "Please select Party first.", "info");
      return;
    }
    setCurrentRowIdForLookup(rowId);
    setProductSearchTerm("");
    setIsModalOpen(true);
  };

  const handleProductSelect = (item: DispatchedItem) => {
    let targetRowIndex = -1;
    if (currentRowIdForLookup !== null) {
      targetRowIndex = rows.findIndex((r) => r.id === currentRowIdForLookup);
    }

    if (currentRowIdForLookup !== null) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== currentRowIdForLookup) return r;

          let updated: DispatchRow = {
            ...r,
            artNo: item.artNo,
            description: item.description || r.description,
            size: item.size || r.size,
            shade: item.shade || r.shade,
            box: item.box ? String(item.box) : "",
            pcsPerBox: item.perBox ? String(item.perBox) : "",
            rate: Number.isFinite(item.rate) ? String(item.rate) : r.rate,
          };

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

    if (targetRowIndex >= 0) {
      const artIndex = fieldOrder.indexOf("artNo");
      const nextColIndex =
        artIndex >= 0 && artIndex + 1 < fieldOrder.length ? artIndex + 1 : 0;
      setPendingFocus({ rowIndex: targetRowIndex, colIndex: nextColIndex });
    }

    setIsModalOpen(false);
    setCurrentRowIdForLookup(null);
  };

  // ----------------- Challan search / list view -----------------
  const filteredChallans = useMemo(() => {
    if (!challanSearchText) return challanList;
    const term = challanSearchText.toLowerCase();

    return challanList.filter((c: any) => {
      const challanNoVal = (c.challanNo || "").toLowerCase();
      const rawDate = c.date || c.dated || "";
      const datedRaw = String(rawDate).toLowerCase();
      const datedFormatted = formatDateDDMMYY(rawDate).toLowerCase();
      const party = (c.partyName || "").toLowerCase();
      const stationVal = (
        c.station ||
        c.destination ||
        c.remarks1 ||
        ""
      ).toLowerCase();
      const allArtNosText = Array.isArray(c.rows)
        ? c.rows
            .map((r: any) => (r.artNo || "").toString().toLowerCase())
            .join(" ")
        : "";

      return (
        challanNoVal.includes(term) ||
        datedRaw.includes(term) ||
        datedFormatted.includes(term) ||
        party.includes(term) ||
        stationVal.includes(term) ||
        allArtNosText.includes(term)
      );
    });
  }, [challanSearchText, challanList]);

  const openChallanSearch = async () => {
    try {
      const res = await api.get(routes.list);
      let data = Array.isArray(res.data) ? res.data : [];
      data = data
        .slice()
        .sort((a: any, b: any) =>
          String(a.challanNo || "").localeCompare(String(b.challanNo || ""))
        );

      setChallanList(data);
      setChallanSearchText("");
      setIsChallanModalOpen(true);
    } catch (err) {
      console.error("Error loading challans:", err);
      Swal.fire("Error", "Failed to load challan list", "error");
    }
  };

  const filteredListViewChallans = useMemo(() => {
    if (!listViewSearchText) return listViewChallanList;
    const term = listViewSearchText.toLowerCase();

    return listViewChallanList.filter((c: any) => {
      const firstRow =
        Array.isArray(c.rows) && c.rows.length > 0 ? c.rows[0] : {};
      const dateVal = formatDateDDMMYY(c.date || c.dated || "").toLowerCase();

      return [
        dateVal,
        String(firstRow.artNo ?? "").toLowerCase(),
        String(firstRow.size ?? "").toLowerCase(),
        String(firstRow.shade ?? "").toLowerCase(),
        String(firstRow.box ?? "").toLowerCase(),
        String(firstRow.pcsPerBox ?? "").toLowerCase(),
        String(firstRow.pcs ?? "").toLowerCase(),
        String(firstRow.rate ?? "").toLowerCase(),
        String(firstRow.amt ?? "").toLowerCase(),
        String(c.netAmt ?? "").toLowerCase(),
      ].some((field) => field.includes(term));
    });
  }, [listViewSearchText, listViewChallanList]);

  const openListViewModal = async () => {
    try {
      const res = await api.get(routes.list);
      let data = Array.isArray(res.data) ? res.data : [];

      data = data
        .slice()
        .sort((a: any, b: any) =>
          String(a.challanNo || "").localeCompare(String(b.challanNo || ""))
        );

      setListViewChallanList(data);
      setListViewSearchText("");
      setIsListViewModalOpen(true);
    } catch (err) {
      console.error("Error loading challans for list view:", err);
      Swal.fire("Error", "Failed to load challan list", "error");
    }
  };

  const handleSelectChallan = async (id: number) => {
    hydratingChallanRef.current = true;
    try {
      const res = await api.get(routes.get(id));
      const ch = res.data || {};

      // ✅ set editingId early so nextNumbers effect doesn't run
      setEditingId(ch.id || id);

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
      setDiscountMode(null);
      setTaxMode(null);

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
            box: r.box != null ? String(r.box) : "",
            pcsPerBox: r.pcsPerBox != null ? String(r.pcsPerBox) : "",
            pcs: r.pcs != null ? String(r.pcs) : "",
            rate: r.rate != null ? String(r.rate) : "",
            amt: r.amt != null ? String(r.amt) : "",
          }))
        : [];

      setRows(mappedRows);

      const mappedPacking: PackingRow[] = Array.isArray(ch.packingRows)
        ? ch.packingRows.map((p: any, idx: number) => ({
            id: Date.now() + idx,
            itemName: p.itemName || "",
            quantity: p.quantity != null ? String(p.quantity) : "",
          }))
        : [];

      setPackingRows(mappedPacking);

      setIsChallanModalOpen(false);
      setIsListViewModalOpen(false);
    } catch (err) {
      console.error("Error loading challan:", err);
      Swal.fire("Error", "Failed to load challan", "error");
    } finally {
      hydratingChallanRef.current = false;
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

      if (editingId === id) handleAddNew(false);
    } catch (err) {
      console.error("Delete Error:", err);
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  // ----------------- Party modal filtering -----------------
  const filteredParties = useMemo(() => {
    const term = partySearchText.trim().toLowerCase();
    if (!term) return partyList;
    return partyList.filter((p) => {
      const pn = (p.partyName || "").toLowerCase();
      const st = (p.station || "").toLowerCase();
      const br = (p.agent?.agentName || "").toLowerCase();
      const tr = (p.transport?.transportName || "").toLowerCase();
      return (
        pn.includes(term) ||
        st.includes(term) ||
        br.includes(term) ||
        tr.includes(term)
      );
    });
  }, [partySearchText, partyList]);

  const openPartyModal = () => {
    setPartySearchText("");
    setIsPartyModalOpen(true);
  };

  const handlePartySelect = (party: Party) => {
    setPartyName(party.partyName);
    setIsPartyModalOpen(false);
  };

  // ----------------- Save / Update / Delete -----------------
  const handleSave = async () => {
    if (isSaving) return;

    if (!date || !partyName) {
      Swal.fire("Error", "Please fill Date and Party Name", "error");
      return;
    }

    const hasRowData = rows.some(
      (r) => r.artNo || r.barCode || r.box || r.pcs || r.pcsPerBox
    );
    if (!hasRowData) {
      Swal.fire(
        "Error",
        "Please enter at least one dispatch return row",
        "error"
      );
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

    // ✅ keeping serialNo/challanNo in payload same as dispatch challan
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

    setIsSaving(true);
    try {
      if (editingId) {
        const res = await api.put(routes.update(editingId), payload);
        const updated = res?.data;
        if (updated) {
          setSerialNo(updated.serialNo || serialNo || "");
          setChallanNo(updated.challanNo || challanNo || "");
        }

        await syncArtsToMasterFromRows(rows);
        Swal.fire("Success", "Dispatch return challan updated!", "success");
      } else {
        const res = await api.post(routes.create, payload);
        const saved = res?.data;
        if (saved) {
          setSerialNo(saved.serialNo || serialNo || "");
          setChallanNo(saved.challanNo || challanNo || "");
          if (saved.id) setEditingId(saved.id);
        }

        await syncArtsToMasterFromRows(rows);
        Swal.fire(
          "Success",
          "Dispatch return challan saved successfully!",
          "success"
        );
      }

      handleAddNew(false);
    } catch (error: any) {
      console.error("Error saving challan:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Failed to save challan",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => openChallanSearch();

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

  // --- Print challan ---
  const handlePrint = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    try {
      const formattedDate = formatDateDDMMYYYY(date);

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
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:center;">${r.artNo || ""}</td>
          <td style="text-align:left;">${r.description || ""}</td>
          <td style="text-align:center;">${r.shade || ""}</td>
          <td style="text-align:center;">${r.size || ""}</td>
          <td style="text-align:center;">${r.box || ""}</td>
          <td style="text-align:center;">${r.pcsPerBox || ""}</td>
          <td style="text-align:center;">${r.pcs || ""}</td>
          <td style="text-align:right;">${r.rate || ""}</td>
          <td style="text-align:right;">${r.amt || ""}</td>
        </tr>`
        )
        .join("");

      const totalBox = totalBoxes;
      const totalPcs = totalPcsSum;

      const dNum = parseFloat(discount || "0");
      const tNum = parseFloat(tax || "0");
      const cNum = parseFloat(cartage || "0");

      const hasDiscountRow = !!discount && !Number.isNaN(dNum) && dNum !== 0;
      const hasTaxRow = !!tax && !Number.isNaN(tNum) && tNum !== 0;
      const hasCartageRow = !!cartage && !Number.isNaN(cNum) && cNum !== 0;

      const discountRowHtml = hasDiscountRow
        ? `<tr><td>Discount</td><td>${discount}</td></tr>`
        : "";

      const taxRowHtml = hasTaxRow ? `<tr><td>Tax</td><td>${tax}</td></tr>` : "";

      const cartageRowHtml = hasCartageRow
        ? `<tr><td>Cartage</td><td>${cartage}</td></tr>`
        : "";

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dispatch Return Challan</title>
  <style>
    @page { margin: 5mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; }
    .page { width: 148mm; height: 210mm; margin: 0 auto; border: 1px solid #000; box-sizing: border-box; padding: 6mm; }
    table.outer { border-collapse: collapse; width: 100%; height: 100%; font-size: 11px; }
    th, td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; text-align: center; }
    th { font-weight: bold; }
    .title-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 4px; }
    .title-center { font-size: 18px; font-weight: bold; text-align: center; flex: 1; }
    .title-right { text-align: right; white-space: nowrap; }
    .inner-totals td { border: none; padding: 2px 4px; font-size: 11px; text-align: left; }
    .inner-totals td:last-child { text-align: right; }
    .signature-row td { font-size: 11px; text-align: left; }
    .signature-row td:last-child { text-align: right; }
    .no-print { text-align: right; margin: 8px; }
    .filler-row td { border-top: 0; border-bottom: 0; padding: 0; height: 100%; }
    .totals-row td { font-weight: bold; }
    @media print { .no-print { display: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">Print</button>
  </div>

  <div class="page">
    <table class="outer">
      <tr>
        <td colspan="10" style="border:1px solid #000;">
          <div class="title-row">
            <div class="title-center">SUG- Dispatch Return Challan</div>
            <div class="title-right">Page 1 of 1</div>
          </div>
        </td>
      </tr>

      <tr>
        <td colspan="6" style="font-size:14px; text-align:left;">
          <div>Challan No. : ${challanNo || ""}</div>
          <div>Party Name : ${partyName || ""}</div>
          <div>Station : ${station || ""}</div>
        </td>
        <td colspan="4" style="font-size:14px; text-align:left;">
          <div>Challan Date : ${formattedDate || ""}</div>
          <div>Serial No. : ${serialNo || ""}</div>
          <div style="margin-top:4px;">BY A/C : ${brokerName || ""}</div>
        </td>
      </tr>

      <tr>
        <th style="width:5%;">S.n</th>
        <th style="width:10%;">Art No</th>
        <th style="width:27%;">Description</th>
        <th style="width:8%;">Shade</th>
        <th style="width:8%;">Size</th>
        <th style="width:7%;">Box</th>
        <th style="width:7%;">Pcs/Box</th>
        <th style="width:8%;">Pcs</th>
        <th style="width:10%;">Rate</th>
        <th style="width:10%;">Amount</th>
      </tr>

      ${
        rowHtml ||
        `<tr><td colspan="10" style="text-align:center;">No rows</td></tr>`
      }

      <tr class="filler-row">
        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      </tr>

      <tr class="totals-row">
        <td></td>
        <td></td>
        <td style="text-align:left;">Total</td>
        <td></td>
        <td></td>
        <td style="text-align:center;">${totalBox || ""}</td>
        <td></td>
        <td style="text-align:center;">${totalPcs || ""}</td>
        <td></td>
        <td style="text-align:right;">${totalAmt || ""}</td>
      </tr>

      <tr>
        <td colspan="8" style="font-size:11px; text-align:left; vertical-align:top;">
          <div>${dispatchedBy ? `LR No : ${dispatchedBy.replace(/\n/g, "<br/>")}` : ""}</div>
          <div style="margin-top:2px;">${remarks1 ? `LR Date : ${remarks1.replace(/\n/g, "<br/>")}` : ""}</div>
          <div style="margin-top:4px;">TRANSPORT : ${transportName || ""}</div>
          <div style="margin-top:2px;">${remarks2 ? `Remarks : ${remarks2.replace(/\n/g, "<br/>")}` : ""}</div>
        </td>
        <td colspan="2" style="vertical-align:top; padding:0;">
          <table class="inner-totals" style="width:100%;">
            ${discountRowHtml}
            ${taxRowHtml}
            ${cartageRowHtml}
            <tr>
              <td><strong>Grand Total</strong></td>
              <td><strong>${netAmt || ""}</strong></td>
            </tr>
          </table>
        </td>
      </tr>

      <tr class="signature-row">
        <td colspan="5">Receiver Signature</td>
        <td colspan="5">Auth. Signature</td>
      </tr>
    </table>
  </div>

  <script>
    window.onload = function () {
      try { window.focus(); window.print(); } catch (e) { console.error('Print error', e); }
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

  // ----------------- Render -----------------
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

      <PartySearchModal
        isOpen={isPartyModalOpen}
        searchText={partySearchText}
        parties={filteredParties}
        onSearchTextChange={setPartySearchText}
        onSelect={handlePartySelect}
        onClose={() => setIsPartyModalOpen(false)}
      />

      {/* PETTI PACKING modal */}
      <PackingGroupItemsModal
        isOpen={isPackingGroupModalOpen}
        groups={materialGroups}
        materials={materials}
        defaultGroupName="PETTI PACKING"
        onApply={(selected) => {
          if (!selected.length) return;

          const newPackingRows: PackingRow[] = selected.map((s, idx) => ({
            id: Date.now() + idx,
            itemName: s.itemName,
            quantity: s.quantity,
          }));

          setPackingRows(newPackingRows);
          setIsPackingGroupModalOpen(false);
        }}
        onClose={() => setIsPackingGroupModalOpen(false)}
      />

      {/* Main content */}
      <div className="p-3">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-blue-800">
            Dispatch Return Challan
          </h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div>
              <label className="block font-semibold">Serial Number</label>
              <input
                type="text"
                value={serialNo}
                readOnly
                placeholder="Auto"
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
                placeholder="Auto"
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>

            <div>
              <label className="block font-semibold">Party Name</label>
              <input
                type="text"
                value={partyName}
                readOnly
                onFocus={() => {
                  setPartySearchText("");
                  setIsPartyModalOpen(true);
                }}
                onClick={() => {
                  setPartySearchText("");
                  setIsPartyModalOpen(true);
                }}
                placeholder="Click to select Party"
                className="border p-2 rounded w-full bg-yellow-50 cursor-pointer"
              />
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
              <label className="block font-semibold">LR No</label>
              <input
                type="text"
                value={dispatchedBy}
                onChange={(e) => setDispatchedBy(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">LR Date</label>
              <input
                type="text"
                value={remarks1}
                onChange={(e) => setRemarks1(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">Remarks</label>
              <input
                type="text"
                value={remarks2}
                onChange={(e) => setRemarks2(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">A/c By</label>
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
                onChange={(e) => setTransportName(e.target.value)}
                className="border p-2 rounded w-full"
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
                    {fieldOrder.map((field, colIndex) => (
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
                          onKeyDown={handleCellKeyDown}
                          data-row-index={index}
                          data-col-index={colIndex}
                          className={`border p-1 rounded w-full ${
                            field === "artNo"
                              ? "bg-yellow-50 cursor-pointer"
                              : ""
                          }`}
                          placeholder={
                            field === "artNo"
                              ? "Click to select dispatched items"
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

          {/* Summary Totals */}
          <div className="flex justify-end gap-6 mt-2 text-md font-semibold">
            <div>
              Total Arts:{" "}
              <span className="text-blue-700">{uniqueArtNosCount}</span>
            </div>
            <div>
              Total Boxes:{" "}
              <span className="text-blue-700">{totalBoxes}</span>
            </div>
            <div>
              Total Pcs:{" "}
              <span className="text-blue-700">{totalPcsSum}</span>
            </div>
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
                  onClick={() => setIsPackingGroupModalOpen(true)}
                  className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                >
                  Load From PETTI PACKING
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
                          data-packing-id={row.id}
                          data-packing-field="itemName"
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
                          data-packing-id={row.id}
                          data-packing-field="quantity"
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
          <div className="flex justify-start mt-6 space-x-3 flex-wrap gap-2">
            <button
              onClick={addPackingRow}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Add Packing
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ${
                isSaving ? "opacity-50 cursor-not-allowed" : ""
              }`}
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

export default DispatchReturn;