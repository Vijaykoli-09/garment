import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react"
import Swal from "sweetalert2"
import Dashboard from "../Dashboard"
import api from "../../api/axiosInstance"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

// --- API Routes ---
const routes = {
  create: "/other-dispatch-challan/create",
  list: "/other-dispatch-challan",
  get: (id: number) => `/other-dispatch-challan/${id}`,
  update: (id: number) => `/other-dispatch-challan/${id}`,
  delete: (id: number) => `/other-dispatch-challan/${id}`,
  parties: "/party/all",
  materialGroups: "/material-groups",
  materials: "/materials",
}

// --- Types ---

interface Party {
  id?: number
  partyName: string
  station?: string
  agent?: { agentName?: string }
  transport?: { transportName?: string }
}

interface MaterialGroup {
  id: number
  materialGroup: string
  materialType?: string
  unitOfMeasure?: string
  costOfMaterial?: number
  supplierName?: string
}

interface Material {
  id: number
  serialNumber: string
  materialGroupId: number
  materialGroupName: string
  materialName: string
  code: string
  materialUnit: string
  minimumStock?: number
  maximumStock?: number
  openingStock?: number
}

interface ItemRow {
  id: number
  materialGroupId: number | null
  materialGroupName: string
  materialId: number | null
  materialName: string
  unit: string
  qty: string
  rate: string
  amt: string
}

// --- Modal prop types ---

type ChallanSearchModalProps = {
  isOpen: boolean
  searchText: string
  challans: any[]
  onSearchTextChange: (value: string) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onClose: () => void
}

type ListViewModalProps = {
  isOpen: boolean
  searchText: string
  challans: any[]
  onSearchTextChange: (value: string) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onClose: () => void
}

type PartySelectModalProps = {
  isOpen: boolean
  searchText: string
  parties: Party[]
  onSearchTextChange: (value: string) => void
  onSelect: (p: Party) => void
  onClose: () => void
}

type GroupSelectModalProps = {
  isOpen: boolean
  searchText: string
  groups: MaterialGroup[]
  onSearchTextChange: (value: string) => void
  onSelect: (g: MaterialGroup) => void
  onClose: () => void
}

type ItemSelectModalProps = {
  isOpen: boolean
  searchText: string
  groupId: number | null
  materials: Material[]
  onSearchTextChange: (value: string) => void
  onSelect: (m: Material) => void
  onClose: () => void
}

// --- Utils ---

const toNumberOrNull = (value: string): number | null => {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  return Number.isNaN(num) ? null : num
}

const numToStr = (value: any): string =>
  value === null || value === undefined ? "" : String(value)

const norm = (s: any) => String(s ?? "").trim().toLowerCase()

// ----------------- Modal Components -----------------

const ChallanSearchModal: React.FC<ChallanSearchModalProps> = ({
  isOpen,
  searchText,
  challans,
  onSearchTextChange,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-5xl p-4">
        <h3 className="text-xl font-bold mb-3 text-blue-800">
          Search Other Dispatch Challan
        </h3>
        <input
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
                <th className="border p-2">Challan No</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Party</th>
                <th className="border p-2">Station</th>
                <th className="border p-2">Item</th>
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
                    c.station || c.destination || c.remarks1 || ""
                  let itemName = ""
                  if (Array.isArray(c.rows) && c.rows.length > 0) {
                    itemName = c.rows[0]?.materialName || ""
                  }
                  return (
                    <tr key={c.id || index} className="hover:bg-yellow-100">
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">{c.challanNo}</td>
                      <td className="border p-2">
                        {c.date
                          ? new Date(c.date).toLocaleDateString()
                          : ""}
                      </td>
                      <td className="border p-2">{c.partyName}</td>
                      <td className="border p-2">{station}</td>
                      <td className="border p-2">{itemName}</td>
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
                  )
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
  )
}

const ListViewModal: React.FC<ListViewModalProps> = ({
  isOpen,
  searchText,
  challans,
  onSearchTextChange,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[55]">
      <div className="bg-white rounded-lg shadow-xl w-5/6 max-w-6xl p-4 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-bold mb-3 text-blue-800">
          Other Dispatch Challan List
        </h3>
        <input
          type="text"
          placeholder="Search by Item / Qty / Rate / Amt / Net Amt..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="overflow-auto max-h-[430px] border border-gray-300">
          <table className="w-full text-sm">
            <thead className="bg-green-100 sticky top-0">
              <tr>
                <th className="border p-2">Sr.No</th>
                <th className="border p-2">Material</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Qty</th>
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
                    colSpan={8}
                  >
                    No challans found
                  </td>
                </tr>
              ) : (
                challans.map((c: any, idx: number) => {
                  const firstRow =
                    Array.isArray(c.rows) && c.rows.length > 0
                      ? c.rows[0]
                      : {}
                  return (
                    <tr key={c.id || idx} className="hover:bg-green-50">
                      <td className="border p-2 text-center">{idx + 1}</td>
                      <td className="border p-2">
                        {firstRow.materialName || ""}
                      </td>
                      <td className="border p-2">
                        {firstRow.unit || ""}
                      </td>
                      <td className="border p-2 text-right">
                        {firstRow.qty ?? ""}
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
                  )
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
  )
}

const PartySelectModal: React.FC<PartySelectModalProps> = ({
  isOpen,
  searchText,
  parties,
  onSearchTextChange,
  onSelect,
  onClose,
}) => {
  const filtered = useMemo(() => {
    const s = norm(searchText)
    if (!s) return parties
    return parties.filter((p) =>
      `${p.partyName} ${p.station ?? ""} ${p.agent?.agentName ?? ""}`
        .toLowerCase()
        .includes(s),
    )
  }, [searchText, parties])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-3xl p-4 max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-bold mb-3 text-blue-800">
          Select Party
        </h3>
        <input
          type="text"
          placeholder="Search by name / station / broker..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Station</th>
              <th className="border p-2">Broker</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="border p-2 text-center text-gray-500">
                  No parties found
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id ?? p.partyName} className="hover:bg-gray-50">
                  <td className="border p-2">{p.partyName}</td>
                  <td className="border p-2">{p.station ?? ""}</td>
                  <td className="border p-2">
                    {p.agent?.agentName ?? ""}
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      onClick={() => onSelect(p)}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const GroupSelectModal: React.FC<GroupSelectModalProps> = ({
  isOpen,
  searchText,
  groups,
  onSearchTextChange,
  onSelect,
  onClose,
}) => {
  const filtered = useMemo(() => {
    const s = norm(searchText)
    if (!s) return groups
    return groups.filter((g) =>
      `${g.materialGroup} ${g.materialType ?? ""} ${g.supplierName ?? ""}`
        .toLowerCase()
        .includes(s),
    )
  }, [searchText, groups])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-3xl p-4 max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-bold mb-3 text-blue-800">
          Select Material Group
        </h3>
        <input
          type="text"
          placeholder="Search by group / type / supplier..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Group</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Unit</th>
              <th className="border p-2">Supplier</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="border p-2 text-center text-gray-500">
                  No groups found
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="border p-2">{g.materialGroup}</td>
                  <td className="border p-2">{g.materialType ?? ""}</td>
                  <td className="border p-2">
                    {g.unitOfMeasure ?? ""}
                  </td>
                  <td className="border p-2">
                    {g.supplierName ?? ""}
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      onClick={() => onSelect(g)}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const ItemSelectModal: React.FC<ItemSelectModalProps> = ({
  isOpen,
  searchText,
  groupId,
  materials,
  onSearchTextChange,
  onSelect,
  onClose,
}) => {
  const filtered = useMemo(() => {
    const s = norm(searchText)
    let list = materials
    if (groupId != null) {
      list = list.filter((m) => m.materialGroupId === groupId)
    }
    if (!s) return list
    return list.filter((m) =>
      `${m.materialName} ${m.code} ${m.materialGroupName}`
        .toLowerCase()
        .includes(s),
    )
  }, [searchText, materials, groupId])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-3xl p-4 max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-bold mb-3 text-blue-800">
          Select Material (Item)
        </h3>
        <input
          type="text"
          placeholder="Search by name / code / group..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Group</th>
              <th className="border p-2">Code</th>
              <th className="border p-2">Unit</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="border p-2 text-center text-gray-500">
                  No materials found
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="border p-2">{m.materialName}</td>
                  <td className="border p-2">{m.materialGroupName}</td>
                  <td className="border p-2">{m.code}</td>
                  <td className="border p-2">{m.materialUnit}</td>
                  <td className="border p-2 text-center">
                    <button
                      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      onClick={() => onSelect(m)}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ----------------- Main Component -----------------

const OtherDispatchChallan: React.FC = () => {
  // Header
  const [serialNo, setSerialNo] = useState("") // internal only
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0],
  )
  const [partyName, setPartyName] = useState("")
  const [brokerName, setBrokerName] = useState("")
  const [transportName, setTransportName] = useState("")
  const [challanNo, setChallanNo] = useState("")
  const [remarks1, setRemarks1] = useState("")
  const [remarks2, setRemarks2] = useState("")
  const [dispatchedBy, setDispatchedBy] = useState("")
  const [station, setStation] = useState("")

  // Totals (auto; not shown as input)
  const [totalAmt, setTotalAmt] = useState("")
  const [netAmt, setNetAmt] = useState("")

  // editing vs new
  const [editingId, setEditingId] = useState<number | null>(null)

  // masters
  const [partyList, setPartyList] = useState<Party[]>([])
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([])
  const [materials, setMaterials] = useState<Material[]>([])

  // Item rows
  const [itemRows, setItemRows] = useState<ItemRow[]>([])

  // Challan search modal
  const [isChallanModalOpen, setIsChallanModalOpen] =
    useState(false)
  const [challanList, setChallanList] = useState<any[]>([])
  const [challanSearchText, setChallanSearchText] = useState("")

  // List View modal
  const [isListViewModalOpen, setIsListViewModalOpen] =
    useState(false)
  const [listViewChallanList, setListViewChallanList] = useState<
    any[]
  >([])
  const [listViewSearchText, setListViewSearchText] =
    useState("")

  // Party / Group / Item modals
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false)
  const [partySearchText, setPartySearchText] = useState("")

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [groupSearchText, setGroupSearchText] = useState("")
  const [currentRowIdForGroup, setCurrentRowIdForGroup] =
    useState<number | null>(null)

  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [itemSearchText, setItemSearchText] = useState("")
  const [currentRowIdForItem, setCurrentRowIdForItem] =
    useState<number | null>(null)
  const [currentGroupIdForItem, setCurrentGroupIdForItem] =
    useState<number | null>(null)

  // --- Load masters ---

  const loadParties = useCallback(async () => {
    try {
      const res = await api.get<Party[]>(routes.parties)
      setPartyList(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Error loading parties:", err)
      setPartyList([])
      Swal.fire("Error", "Failed to load parties", "error")
    }
  }, [])

  const loadMaterialGroups = useCallback(async () => {
    try {
      const res = await api.get<MaterialGroup[]>(
        routes.materialGroups,
      )
      setMaterialGroups(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Error loading material groups:", err)
      Swal.fire("Error", "Failed to load material groups", "error")
    }
  }, [])

  const loadMaterials = useCallback(async () => {
    try {
      const res = await api.get<Material[]>(routes.materials)
      setMaterials(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Error loading materials:", err)
      Swal.fire("Error", "Failed to load materials", "error")
    }
  }, [])

  // --- New / Reset ---

  const handleAddNew = useCallback((showToast = false) => {
    setSerialNo("")
    setChallanNo("")
    setDate(new Date().toISOString().split("T")[0])
    setPartyName("")
    setBrokerName("")
    setTransportName("")
    setRemarks1("")
    setRemarks2("")
    setDispatchedBy("")
    setStation("")
    setTotalAmt("")
    setNetAmt("")
    setItemRows([
      {
        id: Date.now(),
        materialGroupId: null,
        materialGroupName: "",
        materialId: null,
        materialName: "",
        unit: "",
        qty: "",
        rate: "",
        amt: "",
      },
    ])
    setEditingId(null)

    if (showToast) {
      Swal.fire(
        "Cleared",
        "Ready for new dispatch challan",
        "success",
      )
    }
  }, [])

  // initial load once
  useEffect(() => {
    loadParties()
    loadMaterialGroups()
    loadMaterials()
    handleAddNew(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Party select → broker + station ---

  useEffect(() => {
    const selectedParty = partyList.find(
      (p) => p.partyName === partyName,
    )

    if (selectedParty) {
      const broker = selectedParty.agent?.agentName || ""
      setBrokerName(broker)
      setTransportName(
        selectedParty.transport?.transportName || "",
      )
      if (!editingId && !station) {
        setStation(selectedParty.station || "")
      }
    } else {
      setBrokerName("")
      setTransportName("")
      if (!editingId) setStation("")
    }
  }, [partyName, partyList, editingId, station])

  // --- Item row management ---

  const addItemRow = () => {
    setItemRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        materialGroupId: null,
        materialGroupName: "",
        materialId: null,
        materialName: "",
        unit: "",
        qty: "",
        rate: "",
        amt: "",
      },
    ])
  }

  const deleteItemRow = (indexToDelete?: number) => {
    setItemRows((prev) =>
      typeof indexToDelete === "number"
        ? prev.filter((_, index) => index !== indexToDelete)
        : prev.slice(0, Math.max(prev.length - 1, 0)),
    )
  }

  const handleItemChange = (
    id: number,
    field: keyof ItemRow,
    value: string,
  ) => {
    setItemRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r

        let updated: ItemRow = { ...r, [field]: value }

        if (field === "qty" || field === "rate") {
          const qtyNum = Number(
            field === "qty" ? value : updated.qty || 0,
          )
          const rateNum = Number(
            field === "rate" ? value : updated.rate || 0,
          )
          if (!Number.isNaN(qtyNum) && !Number.isNaN(rateNum)) {
            updated.amt = String(qtyNum * rateNum)
          } else {
            updated.amt = ""
          }
        }

        return updated
      }),
    )
  }

  // --- Totals (auto; hidden in UI) ---

  useEffect(() => {
    const total = itemRows.reduce((sum, row) => {
      const amtNum = parseFloat(row.amt)
      return sum + (Number.isNaN(amtNum) ? 0 : amtNum)
    }, 0)
    const totalStr = total ? String(total) : ""
    setTotalAmt(totalStr)
    setNetAmt(totalStr)
  }, [itemRows])

  // --- Challan search ---

  const filteredChallans = useMemo(() => {
    if (!challanSearchText) return challanList
    const term = challanSearchText.toLowerCase()
    return challanList.filter((c: any) => {
      const challanNo = (c.challanNo || "").toLowerCase()
      const dated = (c.date || "").toLowerCase()
      const party = (c.partyName || "").toLowerCase()
      const stationVal = (c.station || "").toLowerCase()
      return (
        challanNo.includes(term) ||
        dated.includes(term) ||
        party.includes(term) ||
        stationVal.includes(term)
      )
    })
  }, [challanSearchText, challanList])

  const openChallanSearch = async () => {
    try {
      const res = await api.get(routes.list)
      const data = Array.isArray(res.data) ? res.data : []
      setChallanList(data)
      setChallanSearchText("")
      setIsChallanModalOpen(true)
    } catch (err) {
      console.error("Error loading challans:", err)
      Swal.fire("Error", "Failed to load challan list", "error")
    }
  }

  // --- List View ---

  const filteredListViewChallans = useMemo(() => {
    if (!listViewSearchText) return listViewChallanList
    const term = listViewSearchText.toLowerCase()

    return listViewChallanList.filter((c: any) => {
      const firstRow =
        Array.isArray(c.rows) && c.rows.length > 0
          ? c.rows[0]
          : {}
      const matName = (firstRow.materialName || "").toLowerCase()
      const unit = (firstRow.unit || "").toLowerCase()
      const qty = String(firstRow.qty ?? "").toLowerCase()
      const rate = String(firstRow.rate ?? "").toLowerCase()
      const amt = String(firstRow.amt ?? "").toLowerCase()
      const netAmtStr = String(c.netAmt ?? "").toLowerCase()

      return [matName, unit, qty, rate, amt, netAmtStr].some(
        (field) => field.includes(term),
      )
    })
  }, [listViewSearchText, listViewChallanList])

  const openListViewModal = async () => {
    try {
      const res = await api.get(routes.list)
      const data = Array.isArray(res.data) ? res.data : []
      setListViewChallanList(data)
      setListViewSearchText("")
      setIsListViewModalOpen(true)
    } catch (err) {
      console.error("Error loading challans for list view:", err)
      Swal.fire("Error", "Failed to load challan list", "error")
    }
  }

  // --- Load specific challan into form ---

  const handleSelectChallan = async (id: number) => {
    try {
      const res = await api.get(routes.get(id))
      const ch = res.data || {}

      setSerialNo(ch.serialNo || "")
      setDate(ch.date || new Date().toISOString().split("T")[0])
      setChallanNo(ch.challanNo || "")
      setPartyName(ch.partyName || "")
      setBrokerName(ch.brokerName || "")
      setTransportName(ch.transportName || "")
      setRemarks1(ch.remarks1 || "")
      setRemarks2(ch.remarks2 || "")
      setDispatchedBy(ch.dispatchedBy || "")

      setStation(ch.station || ch.destination || ch.remarks1 || "")

      setTotalAmt(numToStr(ch.totalAmt))
      setNetAmt(numToStr(ch.netAmt))

      const mappedItemRows: ItemRow[] = Array.isArray(ch.rows)
        ? ch.rows.map((r: any, idx: number) => ({
            id: Date.now() + idx,
            materialGroupId: null,
            materialGroupName: r.materialGroupName || "",
            materialId: null,
            materialName: r.materialName || "",
            unit: r.unit || "",
            qty:
              r.qty !== null && r.qty !== undefined
                ? String(r.qty)
                : "",
            rate:
              r.rate !== null && r.rate !== undefined
                ? String(r.rate)
                : "",
            amt:
              r.amt !== null && r.amt !== undefined
                ? String(r.amt)
                : "",
          }))
        : [
            {
              id: Date.now(),
              materialGroupId: null,
              materialGroupName: "",
              materialId: null,
              materialName: "",
              unit: "",
              qty: "",
              rate: "",
              amt: "",
            },
          ]

      setItemRows(mappedItemRows)

      setEditingId(ch.id || id)

      setIsChallanModalOpen(false)
      setIsListViewModalOpen(false)
    } catch (err) {
      console.error("Error loading challan:", err)
      Swal.fire("Error", "Failed to load challan", "error")
    }
  }

  const handleDeleteChallanFromList = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the challan permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(routes.delete(id))
      setChallanList((prev) => prev.filter((c: any) => c.id !== id))
      setListViewChallanList((prev) =>
        prev.filter((c: any) => c.id !== id),
      )
      Swal.fire(
        "Deleted!",
        "Challan deleted successfully",
        "success",
      )

      if (editingId === id) {
        handleAddNew(false)
      }
    } catch (err) {
      console.error("Delete Error:", err)
      Swal.fire("Error", "Delete failed", "error")
    }
  }

  // --- Party / Group / Item selection handlers ---

  const handleSelectParty = (p: Party) => {
    setPartyName(p.partyName)
    setStation(p.station || "")
    setBrokerName(p.agent?.agentName || "")
    setTransportName(p.transport?.transportName || "")
    setIsPartyModalOpen(false)
  }

  const openGroupModalForRow = (rowId: number) => {
    setCurrentRowIdForGroup(rowId)
    setGroupSearchText("")
    setIsGroupModalOpen(true)
  }

  const handleSelectGroup = (g: MaterialGroup) => {
    if (currentRowIdForGroup == null) return
    setItemRows((prev) =>
      prev.map((r) =>
        r.id === currentRowIdForGroup
          ? {
              ...r,
              materialGroupId: g.id,
              materialGroupName: g.materialGroup,
              materialId: null,
              materialName: "",
              unit: "",
            }
          : r,
      ),
    )
    setIsGroupModalOpen(false)
    setCurrentRowIdForGroup(null)
  }

  const openItemModalForRow = (
    rowId: number,
    groupId: number | null,
  ) => {
    if (!groupId) {
      Swal.fire("Info", "Please select Material Group first", "info")
      return
    }
    setCurrentRowIdForItem(rowId)
    setCurrentGroupIdForItem(groupId)
    setItemSearchText("")
    setIsItemModalOpen(true)
  }

  const handleSelectItem = (m: Material) => {
    if (currentRowIdForItem == null) return
    setItemRows((prev) =>
      prev.map((r) =>
        r.id === currentRowIdForItem
          ? {
              ...r,
              materialId: m.id,
              materialName: m.materialName,
              unit: m.materialUnit,
            }
          : r,
      ),
    )
    setIsItemModalOpen(false)
    setCurrentRowIdForItem(null)
    setCurrentGroupIdForItem(null)
  }

  // --- Save / Update / Delete ---

  const handleSave = async () => {
    if (!date || !partyName) {
      Swal.fire("Error", "Please fill Date and Party Name", "error")
      return
    }

    const hasRowData = itemRows.some(
      (r) => r.materialName || r.qty || r.rate,
    )
    if (!hasRowData) {
      Swal.fire("Error", "Please enter at least one item row", "error")
      return
    }

    const rowsPayload = itemRows.map((r) => ({
      materialGroupName: r.materialGroupName,
      materialName: r.materialName,
      unit: r.unit,
      qty: toNumberOrNull(r.qty),
      rate: toNumberOrNull(r.rate),
      amt: toNumberOrNull(r.amt),
    }))

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
      discount: null,
      discountPercent: null,
      tax: null,
      taxPercent: null,
      cartage: null,
      netAmt: toNumberOrNull(netAmt),
      rows: rowsPayload,
    }

    try {
      if (editingId) {
        await api.put(routes.update(editingId), payload)
        Swal.fire("Success", "Dispatch challan updated!", "success")
      } else {
        const res = await api.post(routes.create, payload)
        Swal.fire(
          "Success",
          "Dispatch challan saved successfully!",
          "success",
        )
        if (res?.data?.id) {
          setEditingId(res.data.id)
          if (res.data.challanNo) setChallanNo(res.data.challanNo)
          if (res.data.serialNo) setSerialNo(res.data.serialNo)
        }
      }
    } catch (error: any) {
      console.error("Error saving challan:", error)
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Failed to save challan",
        "error",
      )
    }
  }

  const handleUpdate = async () => {
    await openChallanSearch()
  }

  const handleDelete = async () => {
    if (!editingId) {
      Swal.fire(
        "Info",
        "No challan loaded for deletion",
        "info",
      )
      return
    }

    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the challan permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(routes.delete(editingId))
      Swal.fire(
        "Deleted!",
        "Challan deleted successfully",
        "success",
      )
      handleAddNew(false)
    } catch (err) {
      console.error("Delete Error:", err)
      Swal.fire("Error", "Delete failed", "error")
    }
  }

  // --- Print / PDF helpers ---

  const buildPrintContent = useCallback((): {
    style: string
    bodyContent: string
  } => {
    const formattedDate = date
      ? new Date(date).toLocaleDateString()
      : ""

    const rowHtml = itemRows
      .filter(
        (r) =>
          r.materialName ||
          r.unit ||
          r.qty ||
          r.rate ||
          r.amt,
      )
      .map(
        (r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.materialGroupName || ""}</td>
          <td>${r.materialName || ""}</td>
          <td>${r.unit || ""}</td>
          <td style="text-align:right;">${r.qty || ""}</td>
          <td style="text-align:right;">${r.rate || ""}</td>
          <td style="text-align:right;">${r.amt || ""}</td>
        </tr>`,
      )
      .join("")

    const style = `
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #f9fafb;
        color: #111827;
        font-size: 11px;
      }
      @media print {
        @page { margin: 8mm 6mm; }
      }
      .odc-print-wrapper {
        max-width: 900px;
        margin: 12px auto 20px;
        background: #ffffff;
        border-radius: 8px;
        padding: 16px 20px 24px;
        box-shadow: 0 10px 25px rgba(15,23,42,0.12);
        border: 1px solid #e5e7eb;
      }
      h2 {
        text-align: center;
        margin: 0 0 6px;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 0.6px;
        color: #111827;
      }
      .header-grid {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px 18px;
        font-size: 11px;
        margin-bottom: 6px;
        color: #111827;
      }
      .header-grid div { white-space: nowrap; }
      .label { font-weight: 600; }
      table {
        border-collapse: collapse;
        width: 100%;
        font-size: 11px;
        margin-top: 8px;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 4px 6px;
        text-align: left;
      }
      th {
        background: #e5edff;
        font-weight: 600;
        text-align: center;
      }
      .totals-right {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 6px;
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        font-weight: 700;
        text-align: right;
        font-size: 11px;
        color: #111827;
      }
    `

    const bodyContent = `
      <div class="odc-print-wrapper">
        <h2>Other Dispatch Challan</h2>

        <div class="header-grid">
          <div><span class="label">Challan No:</span> ${challanNo || "-"}</div>
          <div><span class="label">Date:</span> ${formattedDate || "-"}</div>
          <div><span class="label">Party:</span> ${partyName || "-"}</div>
          <div><span class="label">Station:</span> ${station || "-"}</div>
          <div><span class="label">Broker:</span> ${brokerName || "-"}</div>
          <div><span class="label">Transport:</span> ${transportName || "-"}</div>
          ${dispatchedBy ? `<div><span class="label">Dispatched By:</span> ${dispatchedBy}</div>` : ""}
          ${remarks1 ? `<div><span class="label">Remarks1:</span> ${remarks1}</div>` : ""}
          ${remarks2 ? `<div><span class="label">Remarks2:</span> ${remarks2}</div>` : ""}
        </div>

        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Material Group</th>
              <th>Material</th>
              <th>Unit</th>
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:right;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${
              rowHtml ||
              `<tr><td colspan="7" style="text-align:center;">No rows</td></tr>`
            }
          </tbody>
        </table>

        <div class="totals-right">
          <div><span class="label">Total Amount:</span> ${totalAmt || "0"}</div>
          <div><span class="label">Net Amount:</span> ${netAmt || "0"}</div>
        </div>
      </div>
    `

    return { style, bodyContent }
  }, [
    challanNo,
    date,
    partyName,
    station,
    brokerName,
    transportName,
    dispatchedBy,
    remarks1,
    remarks2,
    itemRows,
    totalAmt,
    netAmt,
  ])

  const handlePrint = async () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const { style, bodyContent } = buildPrintContent()

    const html = `
      <html>
        <head>
          <title>Other Dispatch Challan - ${challanNo || ""}</title>
          <style>${style}</style>
        </head>
        <body>
          ${bodyContent}
          <script>
            window.print();
            window.onafterprint = function(){ window.close(); }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleExportPdf = async () => {
    const { style, bodyContent } = buildPrintContent()

    const container = document.createElement("div")
    container.id = "odc-pdf-root"

    const styleEl = document.createElement("style")
    styleEl.innerHTML = style
    container.appendChild(styleEl)

    const contentEl = document.createElement("div")
    contentEl.innerHTML = bodyContent
    container.appendChild(contentEl)

    container.style.position = "fixed"
    container.style.inset = "0"
    container.style.overflow = "auto"
    container.style.background = "#f9fafb"
    container.style.zIndex = "9999"

    document.body.appendChild(container)

    try {
      const target =
        (contentEl.querySelector(
          ".odc-print-wrapper",
        ) as HTMLElement) || contentEl

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
      })

      const imgData = canvas.toDataURL("image/jpeg", 0.98)
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`OtherDispatch-${challanNo || "ODC"}.pdf`)
    } catch (e) {
      console.error("PDF export error", e)
      Swal.fire("Error", "Failed to export PDF", "error")
    } finally {
      document.body.removeChild(container)
    }
  }

  // --- Main Render ---

  return (
    <Dashboard>
      {/* Modals */}
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
      <PartySelectModal
        isOpen={isPartyModalOpen}
        searchText={partySearchText}
        parties={partyList}
        onSearchTextChange={setPartySearchText}
        onSelect={handleSelectParty}
        onClose={() => setIsPartyModalOpen(false)}
      />
      <GroupSelectModal
        isOpen={isGroupModalOpen}
        searchText={groupSearchText}
        groups={materialGroups}
        onSearchTextChange={setGroupSearchText}
        onSelect={handleSelectGroup}
        onClose={() => setIsGroupModalOpen(false)}
      />
      <ItemSelectModal
        isOpen={isItemModalOpen}
        searchText={itemSearchText}
        groupId={currentGroupIdForItem}
        materials={materials}
        onSearchTextChange={setItemSearchText}
        onSelect={handleSelectItem}
        onClose={() => setIsItemModalOpen(false)}
      />

      {/* Main content */}
      <div className="p-3">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-blue-800">
            Other Dispatch Challan
          </h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-3 mb-6">
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
                Challan No. (YYYY/0001)
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
              <input
                type="text"
                value={partyName}
                readOnly
                onClick={() => setIsPartyModalOpen(true)}
                placeholder="Click to select party"
                className="border p-2 rounded w-full bg-gray-50 cursor-pointer hover:bg-gray-100"
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
              <label className="block font-semibold">Dispatched By</label>
              <input
                type="text"
                value={dispatchedBy}
                onChange={(e) =>
                  setDispatchedBy(e.target.value)
                }
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Remarks 1</label>
              <input
                type="text"
                value={remarks1}
                onChange={(e) =>
                  setRemarks1(e.target.value)
                }
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Remarks 2</label>
              <input
                type="text"
                value={remarks2}
                onChange={(e) =>
                  setRemarks2(e.target.value)
                }
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
            <div>
              <label className="block font-semibold">
                Transport Name
              </label>
              <input
                type="text"
                value={transportName}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
          </div>

          {/* Item Table */}
          <div className="h-[220px] w-full overflow-auto border">
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S.N</th>
                  <th className="border p-2">Material Group</th>
                  <th className="border p-2">Material (Item)</th>
                  <th className="border p-2">Unit</th>
                  <th className="border p-2">Qty</th>
                  <th className="border p-2">Rate</th>
                  <th className="border p-2">Amt</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border p-1 text-center">
                      {index + 1}
                    </td>

                    {/* Material Group */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.materialGroupName}
                        readOnly
                        onClick={() =>
                          openGroupModalForRow(row.id)
                        }
                        placeholder="Click to select group"
                        className="border p-1 rounded w-full bg-yellow-50 cursor-pointer text-xs hover:bg-yellow-100"
                      />
                    </td>

                    {/* Material Item */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.materialName}
                        readOnly
                        onClick={() =>
                          openItemModalForRow(
                            row.id,
                            row.materialGroupId,
                          )
                        }
                        placeholder="Click to select item"
                        className="border p-1 rounded w-full bg-yellow-50 cursor-pointer text-xs hover:bg-yellow-100"
                      />
                    </td>

                    {/* Unit */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.unit}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-100 text-xs"
                      />
                    </td>

                    {/* Qty */}
                    <td className="border p-1">
                      <input
                        type="number"
                        value={row.qty}
                        onChange={(e) =>
                          handleItemChange(
                            row.id,
                            "qty",
                            e.target.value,
                          )
                        }
                        className="border p-1 rounded w-full text-right text-xs"
                      />
                    </td>

                    {/* Rate */}
                    <td className="border p-1">
                      <input
                        type="number"
                        value={row.rate}
                        onChange={(e) =>
                          handleItemChange(
                            row.id,
                            "rate",
                            e.target.value,
                          )
                        }
                        className="border p-1 rounded w-full text-right text-xs"
                      />
                    </td>

                    {/* Amount */}
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.amt}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-100 text-right text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Row buttons */}
          <div className="flex justify-start mt-4 space-x-3">
            <button
              onClick={addItemRow}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2"
            >
              Add Row
            </button>
            <button
              onClick={() => deleteItemRow()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mt-2"
            >
              Delete Row
            </button>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-start mt-6 space-x-3 flex-wrap">
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
              onClick={handleExportPdf}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Export PDF
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
  )
}

export default OtherDispatchChallan