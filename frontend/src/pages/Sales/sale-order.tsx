"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Dashboard from "../Dashboard"
import Swal from "sweetalert2"
import api from "../../api/axiosInstance"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

if (typeof window !== "undefined") {
  ;(window as any).html2canvas = html2canvas
}

// ================= Types from APIs =================
interface PartyFromApi {
  id?: number
  serialNumber?: string
  partyName: string
  gstNo?: string
  stateName?: string
  station?: string
  address?: string
  agent?: { serialNo?: string; agentName?: string }
  transport?: { serialNumber?: string; transportName?: string }
}

interface Agent {
  serialNo: string
  agentName: string
}
interface Transporter {
  serialNumber: string
  transportName: string
}

interface ArtListItem {
  serialNumber: string
  artNo: string
  artName: string
  saleRate?: string
}

interface SizeMaster {
  serialNo: string
  sizeName: string
  orderNo?: string
  artGroup?: string | { artGroupName?: string; [key: string]: any }
}

interface SizeDetailFromArt {
  id?: number
  serialNo?: string
  sizeName: string
  orderNo?: string
  artGroup?: any
  rate?: string | number
}

interface SizeDetailWithBoxFromArt {
  id?: number
  serialNo?: string
  sizeName: string
  orderNo?: string
  artGroup?: any
  box?: string | number
  pcs?: string | number
  rate?: string | number
}

interface ArtDetail {
  serialNumber: string
  artGroup?: string
  artName: string
  artNo: string
  sizes?: SizeDetailFromArt[]
  sizeDetails?: SizeDetailWithBoxFromArt[]
}

interface SaleRow {
  id: number
  artSerial?: string
  artNo: string
  shade: string
  description: string
  peti: string
  remarks: string
  sizeQty: Record<string, string>
  sizeRate: Record<string, string>
}

interface SaleOrderRowPayload {
  artSerial?: string
  artNo: string
  shade: string
  description: string
  peti: string
  remarks: string
  sizes: Record<string, string>
  sizesQty?: Record<string, string>
  sizesRate?: Record<string, string>
}

interface SaleOrderSaveDto {
  orderNo: string
  dated: string
  deliveryDate?: string | null
  partyId?: number | null
  partyName: string
  remarks?: string
  rows: SaleOrderRowPayload[]
  transportSerialNumber?: string | null
  transportName?: string | null
}

type Shade = { shadeCode: string; shadeName: string }

type OrderTotals = {
  totalPeti: number
  totalBox: number
  totalPcs: number
  avgRate: number
}

// ============== Utils =================
const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

// dd/mm/yy display
const formatDateDDMMYY = (value?: string | Date) => {
  if (!value) return ""
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

const sanitizeNumber = (v: string) => {
  const cleaned = v.replace(/[^\d.]/g, "")
  const parts = cleaned.split(".")
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("")
  return cleaned
}
const toNum = (v: any) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const sizeSort = (a: string, b: string) => {
  const known = ["3XS", "XXXS", "2XS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"]
  const ai = known.indexOf(a.toUpperCase())
  const bi = known.indexOf(b.toUpperCase())
  if (ai !== -1 && bi !== -1) return ai - bi
  const an = Number(a)
  const bn = Number(b)
  if (!isNaN(an) && !isNaN(bn)) return an - bn
  if (!isNaN(an)) return -1
  if (!isNaN(bn)) return 1
  return a.localeCompare(b)
}

const normStr = (s: any) => String(s ?? "").trim().toLowerCase()
const cleanNumStr = (v: any) => String(v ?? "").replace(/^'+/, "").trim()

function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
  return (r as PromiseSettledResult<T>).status === "fulfilled"
}

// -------- Error helper ----------
const getErrorMessage = (error: any, fallback = "Failed to save Sale Order") => {
  if (!error) return fallback
  const resp = (error as any).response

  if (resp) {
    const data = resp.data
    if (typeof data === "string" && data.trim()) return data
    if (data?.message && String(data.message).trim()) return String(data.message)

    if (Array.isArray(data?.errors) && data.errors.length) {
      const first = data.errors[0]
      if (typeof first === "string" && first.trim()) return first
      if (first?.message && String(first.message).trim()) return String(first.message)
    }
  }

  if ((error as any).message && String(error.message).trim()) return String(error.message)
  return fallback
}

// size key helpers
const makeSizeKey = (sizeName: string, groupName?: string) => {
  const name = String(sizeName ?? "").trim()
  const grp = String(groupName ?? "").trim()
  return `${name}__${grp}`
}
const parseSizeKey = (key: string): { sizeName: string; groupName: string } => {
  const parts = String(key ?? "").split("__")
  const sizeName = parts[0] || ""
  const groupName = parts.slice(1).join("__") || ""
  return { sizeName, groupName }
}
const sizeKeySort = (aKey: string, bKey: string) => {
  const a = parseSizeKey(aKey)
  const b = parseSizeKey(bKey)
  const cmp = sizeSort(a.sizeName, b.sizeName)
  if (cmp !== 0) return cmp
  return a.groupName.localeCompare(b.groupName)
}

const getArtGroupLabel = (ag: any): string => {
  if (!ag) return ""
  if (typeof ag === "string") return ag
  if (typeof ag === "object") {
    if (ag.artGroupName) return String(ag.artGroupName)
    if (ag.name) return String(ag.name)
  }
  return ""
}
const getGroupNameFromSize = (s: any, sizeMaster: SizeMaster[]): string => {
  if (!s) return ""
  if (s.artGroup) return getArtGroupLabel(s.artGroup)
  if (s.artGroupName) return String(s.artGroupName)
  if (s.sizeGroupName) return String(s.sizeGroupName)
  if (s.groupName) return String(s.groupName)
  if (s.serialNo) {
    const m = sizeMaster.find((x) => String(x.serialNo) === String(s.serialNo))
    if (m?.artGroup) return getArtGroupLabel(m.artGroup)
  }
  return ""
}

// base size map from ArtDetail
const buildBaseSizeMapsFromArt = (
  art: ArtDetail | null | undefined,
  sizeMaster: SizeMaster[],
) => {
  const baseQty: Record<string, string> = {}
  const baseRate: Record<string, string> = {}
  let sizes: any[] = []
  if (Array.isArray(art?.sizes) && art!.sizes!.length) sizes = art!.sizes!
  else if (Array.isArray(art?.sizeDetails) && art!.sizeDetails!.length) sizes = art!.sizeDetails!

  sizes.forEach((s: any) => {
    if (!s.sizeName) return
    const groupName = getGroupNameFromSize(s, sizeMaster)
    const key = makeSizeKey(s.sizeName, groupName)

    baseQty[key] = ""

    if (s.rate !== undefined && s.rate !== null && s.rate !== "") baseRate[key] = String(s.rate)
    else baseRate[key] = ""
  })

  return { baseQty, baseRate }
}

// merge base qty/rate with overrides
const mergeSizeRates = (
  baseQty: Record<string, string>,
  baseRate: Record<string, string>,
  overrides: Record<string, string>,
) => {
  const keys = new Set<string>([
    ...Object.keys(baseQty || {}),
    ...Object.keys(baseRate || {}),
  ])
  const sizeQty: Record<string, string> = {}
  const sizeRate: Record<string, string> = {}

  keys.forEach((key) => {
    const { sizeName } = parseSizeKey(key)

    sizeQty[key] = baseQty && baseQty[key] !== undefined ? String(baseQty[key]) : ""

    if (overrides && overrides[sizeName] !== undefined && String(overrides[sizeName]) !== "") {
      sizeRate[key] = String(overrides[sizeName])
    } else if (baseRate && baseRate[key] !== undefined) {
      sizeRate[key] = String(baseRate[key])
    } else {
      sizeRate[key] = ""
    }
  })

  return { sizeQty, sizeRate }
}

// Shades
const listShades = async (): Promise<Shade[]> => {
  const res = await api.get<any[]>("/shade/list")
  const data = Array.isArray(res.data) ? res.data : []
  return data
    .map((x) => ({
      shadeCode: String(x.shadeCode || "").toUpperCase(),
      shadeName: String(x.shadeName || ""),
    }))
    .sort((a, b) => a.shadeName.localeCompare(b.shadeName))
}

/* ============ Packing index ============= */

type PackingRateRow = {
  partyId: number | null
  partyName: string
  shade: string
  sizeRates: Record<string, string>
  sizePerBox: Record<string, string>
  time: number
}

type PackingRateIndex = Record<string, PackingRateRow[]>

let packingRateIndexPromise: Promise<PackingRateIndex> | null = null

const getPackingRateIndex = async (): Promise<PackingRateIndex> => {
  if (!packingRateIndexPromise) {
    packingRateIndexPromise = (async () => {
      try {
        const { data } = await api.get<any[]>("/packing-challans")
        const challans = Array.isArray(data) ? data : []
        const index: PackingRateIndex = {}

        for (const ch of challans) {
          const partyId = ch.partyId != null ? Number(ch.partyId) : null
          const partyName = normStr(ch.partyName || "")
          const time = Date.parse(ch.date || ch.dated || ch.createdAt || "") || 0
          const rows = Array.isArray(ch.rows) ? ch.rows : []

          for (const r of rows) {
            const artKey = normStr(r.artNo || r.artNoRef || "")
            if (!artKey) continue

            const shade = normStr(r.shadeName || r.shade || r.shadeCode || "")
            const details = Array.isArray(r.sizeDetails) ? r.sizeDetails : []
            if (!details.length) continue

            const sizeRates: Record<string, string> = {}
            const sizePerBox: Record<string, string> = {}

            for (const sd of details) {
              const sizeName = String(sd.sizeName || sd.name || "").trim()
              if (!sizeName) continue

              const rate = sd.rate ?? sd.sizeRate ?? sd.ratePerPcs
              if (rate !== undefined && rate !== null && rate !== "") {
                sizeRates[sizeName] = String(rate)
              }

              const perBox = sd.perBox ?? sd.perPcs ?? sd.perBoxQty
              if (perBox !== undefined && perBox !== null && perBox !== "") {
                sizePerBox[sizeName] = String(perBox)
              }
            }

            if (!Object.keys(sizeRates).length && !Object.keys(sizePerBox).length) continue

            if (!index[artKey]) index[artKey] = []
            index[artKey].push({
              partyId,
              partyName,
              shade,
              sizeRates,
              sizePerBox,
              time,
            })
          }
        }
        return index
      } catch (e) {
        console.error("Failed to build packing rate index", e)
        return {}
      }
    })()
  }
  return packingRateIndexPromise
}

type PackingFilter = {
  partyId?: number | null
  partyName?: string
  artNo: string
  shadeName?: string
}

const findPackingFieldInIndex = (
  index: PackingRateIndex,
  filter: PackingFilter,
  field: "sizeRates" | "sizePerBox",
): Record<string, string> => {
  const artKey = normStr(filter.artNo)
  if (!artKey) return {}
  const list = index[artKey]
  if (!list || !list.length) return {}

  const partyId = filter.partyId != null ? Number(filter.partyId) : null
  const partyName = normStr(filter.partyName || "")
  const shade = normStr(filter.shadeName || "")

  const hasParty = partyId != null || !!partyName
  const hasShade = !!shade

  const bestBy = (pred: (row: PackingRateRow) => boolean): PackingRateRow | null => {
    let best: PackingRateRow | null = null
    for (const row of list) {
      if (!pred(row)) continue
      if (!best || row.time > best.time) best = row
    }
    return best
  }

  const getField = (row: PackingRateRow | null) => (row ? { ...(row[field] || {}) } : {})

  let candidate: PackingRateRow | null = null

  if (hasParty && hasShade) {
    candidate = bestBy((row) => {
      if (!row.shade || row.shade !== shade) return false
      if (partyId != null && row.partyId === partyId) return true
      if (partyName && row.partyName === partyName) return true
      return false
    })
    if (candidate) return getField(candidate)
  }

  if (hasParty) {
    candidate = bestBy((row) => {
      if (partyId != null && row.partyId === partyId) return true
      if (partyName && row.partyName === partyName) return true
      return false
    })
    if (candidate) return getField(candidate)
  }

  if (hasShade) {
    candidate = bestBy((row) => !!row.shade && row.shade === shade)
    if (candidate) return getField(candidate)
  }

  candidate = bestBy(() => true)
  return getField(candidate)
}

const findPackingRatesInIndex = (
  index: PackingRateIndex,
  filter: PackingFilter,
): Record<string, string> => findPackingFieldInIndex(index, filter, "sizeRates")

const findPackingPerBoxInIndex = (
  index: PackingRateIndex,
  filter: PackingFilter,
): Record<string, string> => findPackingFieldInIndex(index, filter, "sizePerBox")

const getPackingSizeRates = async (filter: PackingFilter): Promise<Record<string, string>> => {
  const index = await getPackingRateIndex()
  return findPackingRatesInIndex(index, filter)
}

// ================= Component =================
const SaleOrder: React.FC = () => {
  const [orderNo, setOrderNo] = useState("")
  const [dated, setDated] = useState(todayStr())
  const [deliveryDate, setDeliveryDate] = useState("")
  const [partyName, setPartyName] = useState("")
  const [remarks, setRemarks] = useState("")

  const [rows, setRows] = useState<SaleRow[]>([])

  const [partyList, setPartyList] = useState<PartyFromApi[]>([])
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [partySearch, setPartySearch] = useState("")
  const [selectedParty, setSelectedParty] = useState<PartyFromApi | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [transports, setTransports] = useState<Transporter[]>([])
  const [selectedTransportSerial, setSelectedTransportSerial] = useState<string>("")

  const [artList, setArtList] = useState<ArtListItem[]>([])
  const [showArtModal, setShowArtModal] = useState(false)
  const [artSearch, setArtSearch] = useState("")
  const [selectedArts, setSelectedArts] = useState<string[]>([])
  const [currentRowId, setCurrentRowId] = useState<number | null>(null)

  const [shades, setShades] = useState<Shade[]>([])
  const [showShadeModal, setShowShadeModal] = useState(false)
  const [shadeSearch, setShadeSearch] = useState("")
  const [shadeRowId, setShadeRowId] = useState<number | null>(null)

  const [showList, setShowList] = useState(false)
  const [saleOrderList, setSaleOrderList] = useState<any[]>([])
  const [listSearch, setListSearch] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)

  const [orderTotals, setOrderTotals] = useState<Record<number, OrderTotals>>({})

  const [sizeMaster, setSizeMaster] = useState<SizeMaster[]>([])

  // Save in progress (double-save prevention)
  const [isSaving, setIsSaving] = useState(false)

  // ---------- focus navigation support ----------
  // rowIndex, colIndex where colIndex is a logical column index in the grid
  const [pendingFocus, setPendingFocus] = useState<{ rowIndex: number; colIndex: number } | null>(null)

  // GLOBAL ENTER => NEXT CONTROL (except grid cells & SweetAlert)
  useEffect(() => {
    const handleGlobalEnter = (e: any) => {
      if (e.key !== "Enter") return

      const target = e.target as HTMLElement | null
      if (!target) return

      // SweetAlert dialogs me kuch nahi karna
      if (target.closest(".swal2-container")) return

      // Grid cell (data-row-index) ke liye custom navigation already hai
      if (target.hasAttribute("data-row-index")) return

      // Textarea me Enter allow (new line)
      if (target.tagName === "TEXTAREA") return

      // Global: Enter ko Tab ki tarah treat karo
      e.preventDefault()

      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          !el.getAttribute("aria-hidden") &&
          el.offsetParent !== null,
      )

      const active = document.activeElement as HTMLElement | null
      if (!active) return

      const index = focusables.indexOf(active)
      if (index === -1) return

      const next = focusables[index + 1]
      if (!next) return

      next.focus()
      if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
        next.select?.()
      }
    }

    window.addEventListener("keydown", handleGlobalEnter)
    return () => window.removeEventListener("keydown", handleGlobalEnter)
  }, [])

  // columns in grid:
  // 0: Art No
  // 1: Shade
  // 2: Description
  // 3: Peti
  // 4: Remarks
  // then for each sizeColumn j:
  //   5 + j*2 -> Qty
  //   5 + j*2 + 1 -> Rate

  const sizeColumns = useMemo(() => {
    const s = new Set<string>()
    rows.forEach((r) => {
      Object.keys(r.sizeQty || {}).forEach((k) => s.add(k))
      Object.keys(r.sizeRate || {}).forEach((k) => s.add(k))
    })
    return Array.from(s).sort(sizeKeySort)
  }, [rows])

  // focus effect for pendingFocus (after async actions like add/remove row or modal select)
  useEffect(() => {
    if (!pendingFocus) return
    const selector = `input[data-row-index="${pendingFocus.rowIndex}"][data-col-index="${pendingFocus.colIndex}"]`
    const el =
      typeof document !== "undefined"
        ? (document.querySelector<HTMLInputElement>(selector) as HTMLInputElement | null)
        : null
    if (el) {
      el.focus()
      if (typeof el.select === "function") {
        el.select()
      }
    }
    setPendingFocus(null)
  }, [pendingFocus])

  // Enter key handling for grid
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()

    const rowIndexAttr = e.currentTarget.getAttribute("data-row-index")
    const colIndexAttr = e.currentTarget.getAttribute("data-col-index")
    if (rowIndexAttr == null || colIndexAttr == null) return

    const rowIndex = Number(rowIndexAttr)
    const colIndex = Number(colIndexAttr)
    if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) return

    const totalCols = 5 + sizeColumns.length * 2
    let nextRow = rowIndex
    let nextCol = colIndex + 1

    if (nextCol >= totalCols) {
      nextCol = 0
      nextRow = rowIndex + 1
    }
    if (nextRow >= rows.length) return

    const selector = `input[data-row-index="${nextRow}"][data-col-index="${nextCol}"]`
    const nextEl =
      typeof document !== "undefined"
        ? (document.querySelector<HTMLInputElement>(selector) as HTMLInputElement | null)
        : null
    if (nextEl) {
      nextEl.focus()
      if (typeof nextEl.select === "function") {
        nextEl.select()
      }
    }
  }

  const totalPcs = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const sizesSum = Object.values(r.sizeQty || {}).reduce((s, v) => s + toNum(v), 0)
        const peti = toNum(r.peti || "1") || 1
        return sum + sizesSum * peti
      }, 0),
    [rows],
  )

  const totalPeti = useMemo(
    () =>
      rows
        .filter((r) => (r.artNo || "").trim() !== "")
        .reduce((sum, r) => sum + toNum(r.peti || "0"), 0),
    [rows],
  )

  const filteredParties = useMemo(() => {
    const s = partySearch.trim().toLowerCase()
    if (!s) return partyList

    return partyList.filter((p) => {
      const baseAgentName = p.agent?.agentName || ""
      const code = p.agent?.serialNo
      const masterAgentName = code
        ? agents.find((a) => String(a.serialNo) === String(code))?.agentName || ""
        : ""

      const agentName = (baseAgentName || masterAgentName || "").toLowerCase()

      return (
        (p.partyName || "").toLowerCase().includes(s) ||
        (p.serialNumber || "").toLowerCase().includes(s) ||
        (p.gstNo || "").toLowerCase().includes(s) ||
        (p.station || "").toLowerCase().includes(s) ||
        agentName.includes(s)
      )
    })
  }, [partyList, partySearch, agents])

  const filteredArts = useMemo(() => {
    const s = artSearch.toLowerCase()
    return artList.filter((a) => a.artNo.toLowerCase().includes(s) || (a.artName || "").toLowerCase().includes(s))
  }, [artList, artSearch])

  const filteredShades = useMemo(() => {
    const q = shadeSearch.trim().toLowerCase()
    if (!q) return shades
    return shades.filter(
      (sh) => sh.shadeName.toLowerCase().includes(q) || sh.shadeCode.toLowerCase().includes(q),
    )
  }, [shadeSearch, shades])

  const partyStation = selectedParty?.station || ""
  const partyAgentName = useMemo(() => {
    if (!selectedParty) return ""
    const code = selectedParty.agent?.serialNo
    const byMaster = code ? agents.find((a) => String(a.serialNo) === String(code))?.agentName : ""
    return byMaster || selectedParty.agent?.agentName || ""
  }, [selectedParty, agents])

  const partyTransportName = useMemo(() => {
    if (!selectedParty) return ""
    const code = selectedParty.transport?.serialNumber
    const byMaster = code ? transports.find((t) => String(t.serialNumber) === String(code))?.transportName : ""
    return byMaster || selectedParty.transport?.transportName || ""
  }, [selectedParty, transports])

  const selectedTransportName = useMemo(() => {
    if (selectedTransportSerial) {
      const t = transports.find(
        (tr) => String(tr.serialNumber) === String(selectedTransportSerial),
      )
      if (t) return t.transportName
    }
    return partyTransportName
  }, [selectedTransportSerial, transports, partyTransportName])

  // Load masters + next order no
  useEffect(() => {
    const init = async () => {
      try {
        const [
          nextRes,
          partiesRes,
          agentsRes,
          transportsRes,
          artsRes,
          shadesList,
          sizesRes,
        ] = await Promise.all([
          api.get<string>("/sale-orders/next-order-no").catch(() => ({ data: "" as string })),
          api.get<PartyFromApi[]>("/party/all"),
          api.get<Agent[]>("/agent/list").catch(() => ({ data: [] as Agent[] })),
          api.get<Transporter[]>("/transports").catch(() => ({ data: [] as Transporter[] })),
          api.get<ArtListItem[]>("/arts"),
          listShades().catch(() => [] as Shade[]),
          api.get<SizeMaster[]>("/sizes").catch(() => ({ data: [] as SizeMaster[] })),
        ])

        if (nextRes.data) setOrderNo(nextRes.data)
        setPartyList(Array.isArray(partiesRes.data) ? partiesRes.data : [])
        setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : [])
        setTransports(Array.isArray(transportsRes.data) ? transportsRes.data : [])
        setArtList(Array.isArray(artsRes.data) ? artsRes.data : [])
        setShades(shadesList)
        setSizeMaster(Array.isArray(sizesRes.data) ? sizesRes.data : [])
      } catch (e) {
        console.error(e)
        Swal.fire("Error", "Failed to load Parties/Arts/Shades/Sizes", "error")
      } finally {
        if (rows.length === 0) addRow()
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // party selection + default transport when new
  useEffect(() => {
    if (!partyName) {
      setSelectedParty(null)
      setSelectedTransportSerial("")
      return
    }
    const found = partyList.find(
      (p) => (p.partyName || "").trim().toLowerCase() === partyName.trim().toLowerCase(),
    )
    setSelectedParty(found || null)

    if (!editingId) {
      if (found?.transport?.serialNumber) {
        setSelectedTransportSerial(String(found.transport.serialNumber))
      } else {
        setSelectedTransportSerial("")
      }
    }
  }, [partyName, partyList, editingId])

  const addRow = () => {
    setRows((prev) => {
      const newRow: SaleRow = {
        id: Date.now() + Math.random(),
        artSerial: undefined,
        artNo: "",
        shade: "",
        description: "",
        peti: "",
        remarks: "",
        sizeQty: {},
        sizeRate: {},
      }
      const newRows = [...prev, newRow]
      // focus Art No of the new row
      setPendingFocus({ rowIndex: newRows.length - 1, colIndex: 0 })
      return newRows
    })
  }

  const removeRow = (id: number, rowIndex?: number) => {
    setRows((prev) => {
      const index = typeof rowIndex === "number" ? rowIndex : prev.findIndex((r) => r.id === id)
      const newRows = prev.filter((r) => r.id !== id)
      if (newRows.length > 0 && index !== -1) {
        const targetRow = Math.min(index, newRows.length - 1)
        setPendingFocus({ rowIndex: targetRow, colIndex: 0 }) // focus Art No of target row
      }
      return newRows
    })
  }

  const setArtToRow = async (rowId: number, art: ArtListItem) => {
    try {
      const { data } = await api.get<ArtDetail>(`/arts/${art.serialNumber}`)
      const { baseQty, baseRate } = buildBaseSizeMapsFromArt(data, sizeMaster)

      const currentShade = rows.find((r) => r.id === rowId)?.shade
      const pid = selectedParty?.id ?? null

      const packingRates = await getPackingSizeRates({
        partyId: pid,
        partyName,
        artNo: art.artNo,
        shadeName: currentShade,
      })
      const merged = mergeSizeRates(baseQty, baseRate, packingRates)

      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                artSerial: art.serialNumber,
                artNo: art.artNo,
                description: art.artName || "",
                sizeQty: merged.sizeQty,
                sizeRate: merged.sizeRate,
              }
            : r,
        ),
      )
    } catch (e) {
      console.error(e)
      Swal.fire("Error", "Failed to load Art details (sizes)", "error")
    }
  }

  const handleRowField = (id: number, field: keyof SaleRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        let v = value
        if (field === "peti") v = sanitizeNumber(value)
        return { ...r, [field]: v }
      }),
    )
  }

  const handleSizeQtyChange = (id: number, sizeKey: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, sizeQty: { ...r.sizeQty, [sizeKey]: sanitizeNumber(value) } }
      }),
    )
  }

  const handleSizeRateChange = (id: number, sizeKey: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, sizeRate: { ...r.sizeRate, [sizeKey]: sanitizeNumber(value) } }
      }),
    )
  }

  const openPartyModal = () => {
    setPartySearch("")
    setShowPartyModal(true)
  }
  const selectParty = (p: PartyFromApi) => {
    setPartyName(p.partyName)
    setSelectedParty(p)
    setShowPartyModal(false)
  }

  const openArtModal = (rowId?: number) => {
    setSelectedArts([])
    setArtSearch("")
    setCurrentRowId(rowId ?? null)
    setShowArtModal(true)
  }

  const toggleArtSelection = (serialNumber: string) => {
    setSelectedArts((prev) => {
      if (prev.includes(serialNumber)) {
        return prev.filter((s) => s !== serialNumber)
      }
      return [...prev, serialNumber]
    })
  }

  const removeFromSelected = (serialNumber: string) => {
    setSelectedArts((prev) => prev.filter((s) => s !== serialNumber))
  }

  const moveSelectedUp = (serialNumber: string) => {
    setSelectedArts((prev) => {
      const idx = prev.indexOf(serialNumber)
      if (idx <= 0) return prev
      const arr = [...prev]
      const [item] = arr.splice(idx, 1)
      arr.splice(idx - 1, 0, item)
      return arr
    })
  }

  const moveSelectedDown = (serialNumber: string) => {
    setSelectedArts((prev) => {
      const idx = prev.indexOf(serialNumber)
      if (idx === -1 || idx === prev.length - 1) return prev
      const arr = [...prev]
      const [item] = arr.splice(idx, 1)
      arr.splice(idx + 1, 0, item)
      return arr
    })
  }

  const selectArtForCurrentRow = async (art: ArtListItem) => {
    if (currentRowId == null) return
    const rowIndex = rows.findIndex((r) => r.id === currentRowId)
    await setArtToRow(currentRowId, art)
    setShowArtModal(false)
    setCurrentRowId(null)
    setSelectedArts([])
    // after art select, focus Shade column of that row
    if (rowIndex >= 0) {
      setPendingFocus({ rowIndex, colIndex: 1 })
    }
  }

  const addSelectedArts = async () => {
    if (selectedArts.length === 0) {
      Swal.fire("Warning", "Please select at least one Art", "warning")
      return
    }
    try {
      const artMap = new Map(artList.map((a) => [a.serialNumber, a] as const))
      const chosenArts: ArtListItem[] = selectedArts
        .map((sn) => artMap.get(sn))
        .filter((a): a is ArtListItem => Boolean(a))

      const artDet = await Promise.allSettled(
        chosenArts.map((a) => api.get<ArtDetail>(`/arts/${a.serialNumber}`)),
      )

      const index = await getPackingRateIndex()
      const pid = selectedParty?.id ?? null

      const preparedRows: SaleRow[] = chosenArts.map((art, idx) => {
        const res = artDet[idx]

        let baseQty: Record<string, string> = {}
        let baseRate: Record<string, string> = {}

        if (isFulfilled(res)) {
          const built = buildBaseSizeMapsFromArt(res.value.data, sizeMaster)
          baseQty = built.baseQty
          baseRate = built.baseRate
        }

        const over = findPackingRatesInIndex(index, {
          partyId: pid,
          partyName,
          artNo: art.artNo,
        })
        const merged = mergeSizeRates(baseQty, baseRate, over)

        return {
          id: Date.now() + Math.random(),
          artSerial: art.serialNumber,
          artNo: art.artNo,
          shade: "",
          description: art.artName || "",
          peti: "",
          remarks: "",
          sizeQty: merged.sizeQty,
          sizeRate: merged.sizeRate,
        }
      })

      if (currentRowId != null) {
        const [first, ...rest] = preparedRows
        if (!first) {
          Swal.fire("Info", "No art selected", "info")
          return
        }
        const rowIndex = rows.findIndex((r) => r.id === currentRowId)
        setRows((prev) => {
          const idx = prev.findIndex((r) => r.id === currentRowId)
          if (idx === -1) return prev
          const updatedCurrent: SaleRow = {
            ...prev[idx],
            artSerial: first.artSerial,
            artNo: first.artNo,
            description: first.description,
            sizeQty: first.sizeQty,
            sizeRate: first.sizeRate,
            shade: "",
            remarks: "",
          }
          const before = prev.slice(0, idx)
          const after = prev.slice(idx + 1)
          return [...before, updatedCurrent, ...rest, ...after]
        })
        Swal.fire("Success", `Applied ${chosenArts.length} art(s)`, "success")
        if (rowIndex >= 0) {
          // focus Shade of the updated current row
          setPendingFocus({ rowIndex, colIndex: 1 })
        }
      } else {
        setRows((prev) => {
          const nonEmpty = prev.filter((r) => r.artNo.trim() !== "")
          return [...preparedRows, ...nonEmpty]
        })
        Swal.fire("Success", `Added ${chosenArts.length} art(s)`, "success")
      }
      setShowArtModal(false)
      setCurrentRowId(null)
      setSelectedArts([])
    } catch (e) {
      console.error(e)
      Swal.fire("Error", "Failed to add selected arts", "error")
    }
  }

  const openShadeModal = (rowId: number) => {
    setShadeRowId(rowId)
    setShadeSearch("")
    setShowShadeModal(true)
  }

  const selectShadeForCurrentRow = async (shade: Shade) => {
    if (shadeRowId == null) return
    const row = rows.find((r) => r.id === shadeRowId)

    setRows((prev) =>
      prev.map((r) => (r.id === shadeRowId ? { ...r, shade: shade.shadeName } : r)),
    )
    setShowShadeModal(false)
    setShadeRowId(null)

    if (row?.artNo) {
      const index = await getPackingRateIndex()
      const pid = selectedParty?.id ?? null
      const over = findPackingRatesInIndex(index, {
        partyId: pid,
        partyName,
        artNo: row.artNo,
        shadeName: shade.shadeName,
      })

      if (Object.keys(over).length) {
        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== row.id) return r
            const newRate: Record<string, string> = { ...(r.sizeRate || {}) }
            Object.keys(newRate).forEach((key) => {
              const { sizeName } = parseSizeKey(key)
              if (over[sizeName] !== undefined && String(over[sizeName]) !== "") {
                newRate[key] = String(over[sizeName])
              }
            })
            return { ...r, sizeRate: newRate }
          }),
        )
      }
    }
  }

  // ========== Print / PDF content ==========
  const buildPrintContent = async (): Promise<{ style: string; bodyContent: string }> => {
    const index = await getPackingRateIndex()
    const printableRows = rows.filter((r) => (r.artNo || "").trim() !== "")

    const grouped = new Map<string, SaleRow[]>()
    printableRows.forEach((r) => {
      const key = (r.artNo || "").trim()
      if (!key) return
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    })

    let overallTotalPcsFromPB = 0

    const groupsHtml = Array.from(grouped.entries())
      .map(([artNo, grpRows]) => {
        const sizeSet = new Set<string>()
        grpRows.forEach((r) => {
          Object.keys(r.sizeQty || {}).forEach((k) => sizeSet.add(k))
          Object.keys(r.sizeRate || {}).forEach((k) => sizeSet.add(k))
        })
        const allSizes = Array.from(sizeSet)

        const sizeCols = allSizes
          .filter((key) =>
            grpRows.some((r) => toNum(r.sizeQty?.[key] || 0) > 0),
          )
          .sort(sizeKeySort)

        const sizeHeadRow = sizeCols
          .map((k) => {
            const { sizeName, groupName } = parseSizeKey(k)
            const label = groupName ? `${sizeName} (${groupName})` : sizeName
            return `<th class="size-head"><div class="grid-cell"><span>${label}</span></div></th>`
          })
          .join("")

        let groupTotalPcsFromPB = 0

        const bodyRows = grpRows
          .map((r, i) => {
            const perBoxMap = findPackingPerBoxInIndex(index, {
              partyId: selectedParty?.id ?? null,
              partyName,
              artNo: r.artNo,
              shadeName: r.shade || undefined,
            })

            const rowPetiNum = toNum(r.peti || "1") || 1

            const labelCol = `
              <td class="inner-wrapper">
                <table class="inner-grid inner-label">
                  <tr><td>Box</td></tr>
                  <tr><td>Rate</td></tr>
                  <tr><td>Per/Box</td></tr>
                </table>
              </td>
            `

            const sizeCells = sizeCols
              .map((key) => {
                const { sizeName } = parseSizeKey(key)

                const qtyRaw = cleanNumStr(r.sizeQty[key] ?? "")
                const qtyNum = toNum(qtyRaw)

                const pbRaw = cleanNumStr(perBoxMap[sizeName] ?? "")
                const pbNum = toNum(pbRaw)

                const rtRaw = cleanNumStr(r.sizeRate[key] ?? "")

                groupTotalPcsFromPB += rowPetiNum * pbNum * qtyNum

                return `
                  <td class="inner-wrapper">
                    <table class="inner-grid">
                      <tr><td>${qtyRaw}</td></tr>
                      <tr><td>${rtRaw}</td></tr>
                      <tr><td>${pbRaw}</td></tr>
                    </table>
                  </td>
                `
              })
              .join("")

            const totalBoxForRow =
              Object.values(r.sizeQty || {}).reduce((s, v) => s + toNum(v), 0) *
              rowPetiNum

            return `
              <tr>
                <td><div class="grid-cell"><span>${i + 1}</span></div></td>
                <td><div class="grid-cell"><span>${cleanNumStr(r.shade)}</span></div></td>
                <td><div class="grid-cell grid-cell-left"><span>${cleanNumStr(r.description)}</span></div></td>
                <td><div class="grid-cell"><span>${cleanNumStr(r.peti)}</span></div></td>
                <td><div class="grid-cell grid-cell-left"><span>${cleanNumStr(r.remarks)}</span></div></td>
                ${labelCol}
                ${sizeCells}
                <td><div class="grid-cell"><span>${totalBoxForRow}</span></div></td>
              </tr>
            `
          })
          .join("")

        const groupTotalPeti = grpRows.reduce(
          (sum, r) => sum + toNum(r.peti || "0"),
          0,
        )

        const groupTotalBox = grpRows.reduce((sum, r) => {
          const petiNum = toNum(r.peti || "1") || 1
          const perRow =
            Object.values(r.sizeQty || {}).reduce((s, v) => s + toNum(v), 0) *
            petiNum
          return sum + perRow
        }, 0)

        overallTotalPcsFromPB += groupTotalPcsFromPB

        const artName = grpRows.find((r) => r.description)?.description || ""

        return `
          <div class="group">
            <div class="group-header">
              <span class="group-title">ART: ${artNo}</span>
              ${artName ? `<span class="group-subtitle">${artName}</span>` : ""}
            </div>
            <table class="grid-table">
              <thead>
                <tr>
                  <th><div class="grid-cell"><span>#</span></div></th>
                  <th><div class="grid-cell"><span>Shade</span></div></th>
                  <th class="th-left"><div class="grid-cell grid-cell-left"><span>Description</span></div></th>
                  <th><div class="grid-cell"><span>Peti</span></div></th>
                  <th class="th-left"><div class="grid-cell grid-cell-left"><span>Remarks</span></div></th>
                  <th><div class="grid-cell"><span></span></div></th>
                  ${sizeHeadRow}
                  <th><div class="grid-cell"><span>Total Box</span></div></th>
                </tr>
              </thead>
              <tbody>${bodyRows}</tbody>
            </table>
            <div class="group-totals">
              <span><strong>Art Total Peti:</strong> ${groupTotalPeti}</span>
              <span><strong>Art Total Box:</strong> ${groupTotalBox}</span>
              <span><strong>Art Total Pcs:</strong> ${groupTotalPcsFromPB}</span>
            </div>
          </div>
        `
      })
      .join("")

    const style = `
      * { box-sizing: border-box; }
      @page { margin: 8mm; }
      @media print {
        .group,
        .grid-table,
        .grid-table tr,
        .grid-table thead,
        .grid-table tbody {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
      html, body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #ffffff;
        color: #000000;
        font-size: 11px;
      }

      .print-page {
        padding: 8px;
      }

      .print-wrapper {
        width: 100%;
        max-width: 780px;
        margin: 0 auto;
        padding: 12px 16px 14px;
        border-radius: 8px;
        border: 1.2px solid #000;
        background: #ffffff;
      }

      .brand-title {
        text-align: center;
        font-size: 18px;
        font-weight: 900;
        margin: 0 0 2px;
        letter-spacing: 1px;
      }

      .header-meta-row {
        text-align: center;
        font-size: 11px;
        margin-bottom: 4px;
        font-weight: 700;
      }
      .header-meta-row .label { font-weight: 800; }
      .header-meta-row .sep { margin: 0 8px; color: #000; }

      .header-bar {
        text-align: center;
        font-size: 10.5px;
        margin-bottom: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid #000;
        font-weight: 600;
        background: #ffffff;
      }
      .header-bar .label { font-weight: 800; }
      .header-bar .sep { margin: 0 10px; }

      .remarks-line {
        text-align: left;
        font-size: 10px;
        margin: 2px 0 6px;
        padding: 3px 8px 4px;
        border-radius: 4px;
        border: 0.8px dashed #000;
        font-weight: 600;
        background: #ffffff;
      }
      .remarks-line .label { font-weight: 800; }

      .group {
        margin: 8px 0 10px;
        padding: 5px 5px 7px;
        border-radius: 4px;
        border: 0.9px solid #000;
        page-break-inside: avoid;
        break-inside: avoid;
        background: #ffffff;
      }

      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 3px;
        padding: 2px 4px 3px;
        border-radius: 3px;
        border: 0.8px solid #000;
        background: #ffffff;
      }

      .group-title {
        font-size: 10.5px;
        font-weight: 800;
      }
      .group-subtitle {
        font-size: 10px;
        font-weight: 600;
        color: #000;
      }

      .grid-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 3px;
        font-size: 9px;
        background: #ffffff;
      }

      .grid-table th,
      .grid-table td {
        border: 0.7px solid #000;
        padding: 0;
        vertical-align: middle;
        background: #ffffff;
      }

      .grid-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3px 2px;
        min-height: 18px;
        line-height: 1.25;
        width: 100%;
        box-sizing: border-box;
        text-align: center;
      }

      .grid-cell-left {
        justify-content: flex-start;
        text-align: left;
      }

      .grid-table thead th {
        font-weight: 700;
        background: #ffffff;
      }

      .grid-table thead th.th-left .grid-cell {
        justify-content: flex-start;
      }

      .inner-wrapper {
        padding: 0;
      }

      .inner-grid {
        width: 100%;
        border-collapse: collapse;
        background: #ffffff;
      }

      .inner-grid td {
        border-bottom: 0.7px solid #000;
        text-align: center;
        font-size: 9px;
        padding: 3px 0;
        height: 16px;
        background: #ffffff;
      }

      .inner-grid tr:last-child td {
        border-bottom: none;
      }

      .inner-label td {
        font-weight: 700;
        background: #ffffff;
      }

      .group-totals {
        margin-top: 4px;
        padding: 3px 6px 1px;
        border-top: 0.8px solid #000;
        font-size: 10px;
        text-align: right;
        background: #ffffff;
      }
      .group-totals span + span {
        margin-left: 12px;
      }

      .overall-totals {
        margin-top: 8px;
        padding: 5px 8px;
        border-radius: 4px;
        border: 1px solid #000;
        font-size: 10px;
        text-align: right;
        font-weight: 700;
        background: #ffffff;
      }
      .overall-row {
        display: flex;
        justify-content: flex-end;
        gap: 18px;
      }

      .signature-row {
        margin-top: 10px;
        display: flex;
        gap: 24px;
        justify-content: space-between;
        font-size: 9px;
        background: #ffffff;
      }
      .signature-box {
        flex: 1;
        text-align: center;
        padding-top: 16px;
        border-top: 0.8px dashed #000;
        font-weight: 600;
      }
    `

    const groupsSection =
      groupsHtml ||
      `<div class="group" style="text-align:center;font-size:9px;">No items added</div>`

    const bodyContent = `
      <div class="print-page">
        <div class="print-wrapper">
          <div class="brand-title">SALE ORDER</div>

          <div class="header-meta-row">
            <span class="label">Order No:</span> ${orderNo || "-"}
            <span class="sep">|</span>
            <span class="label">Date:</span> ${dated || "-"}
          </div>

          <div class="header-bar">
            <span class="label">Party:</span> ${partyName || "-"}
            ${
              selectedParty?.station
                ? `<span class="sep">|</span><span class="label">Station:</span> ${selectedParty.station}`
                : ""
            }
            ${
              partyAgentName
                ? `<span class="sep">|</span><span class="label">Account By:</span> ${partyAgentName}`
                : ""
            }
            ${
              selectedTransportName
                ? `<span class="sep">|</span><span class="label">Transport:</span> ${selectedTransportName}`
                : ""
            }
            ${
              deliveryDate
                ? `<span class="sep">|</span><span class="label">Delivery:</span> ${deliveryDate}`
                : ""
            }
          </div>

          ${
            remarks
              ? `<div class="remarks-line"><span class="label">Remarks:</span> ${remarks}</div>`
              : ""
          }

          ${groupsSection}

          <div class="overall-totals">
            <div class="overall-row">
              <span><strong>Total Peti:</strong> ${totalPeti}</span>
              <span><strong>Total Box:</strong> ${totalPcs}</span>
              <span><strong>Total Pcs:</strong> ${overallTotalPcsFromPB}</span>
            </div>
          </div>

          <div class="signature-row">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Checked By</div>
            <div class="signature-box">For ${partyName || "Party"}</div>
          </div>
        </div>
      </div>
    `

    return { style, bodyContent }
  }

  const handlePrint = async () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const { style, bodyContent } = await buildPrintContent()

    const html = `
      <html>
        <head>
          <title>Sale Order - ${orderNo}</title>
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

  // ================== PDF EXPORT ==================
  const handleExportPdf = async () => {
    try {
      const { style, bodyContent } = await buildPrintContent()

      const container = document.createElement("div")
      container.style.position = "fixed"
      container.style.left = "-10000px"
      container.style.top = "0"
      container.style.background = "#ffffff"
      container.innerHTML = `<style>${style}</style>${bodyContent}`
      document.body.appendChild(container)

      await new Promise((res) => setTimeout(res, 200))

      const pdf: any = new jsPDF("p", "pt", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      const imgWidth = pageWidth - margin * 2
      const maxContentHeightPx = pageHeight - margin * 2 - 8

      const wrapper = container.querySelector(".print-wrapper") as HTMLElement | null
      if (!wrapper) throw new Error("print-wrapper not found")

      wrapper.style.width = `${imgWidth}px`

      const allChildren = Array.from(wrapper.children) as HTMLElement[]
      const headerNodes: HTMLElement[] = []
      const groupNodes: HTMLElement[] = []
      let totalsNode: HTMLElement | null = null
      let signatureNode: HTMLElement | null = null

      allChildren.forEach((child) => {
        if (child.classList.contains("group")) groupNodes.push(child)
        else if (child.classList.contains("overall-totals")) totalsNode = child
        else if (child.classList.contains("signature-row")) signatureNode = child
        else headerNodes.push(child)
      })

      let pageIndex = 0
      let groupIdx = 0

      while (groupIdx < groupNodes.length) {
        wrapper.innerHTML = ""

        if (pageIndex === 0) {
          headerNodes.forEach((n) => wrapper.appendChild(n.cloneNode(true) as HTMLElement))
        }

        let pageHasGroup = false

        while (groupIdx < groupNodes.length) {
          const grpClone = groupNodes[groupIdx].cloneNode(true) as HTMLElement
          wrapper.appendChild(grpClone)

          const h = wrapper.scrollHeight

          if (h > maxContentHeightPx && pageHasGroup) {
            wrapper.removeChild(grpClone)
            break
          }

          pageHasGroup = true
          groupIdx++

          if (h > maxContentHeightPx) {
            break
          }
        }

        const isLastPage = groupIdx >= groupNodes.length
        if (isLastPage) {
          if (totalsNode) wrapper.appendChild(totalsNode.cloneNode(true) as HTMLElement)
          if (signatureNode) wrapper.appendChild(signatureNode.cloneNode(true) as HTMLElement)
        }

        await new Promise((res) => setTimeout(res, 50))

        const canvas = await html2canvas(wrapper, {
          scale: 2,
          useCORS: true,
        })

        const imgData = canvas.toDataURL("image/png")
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        if (pageIndex === 0) {
          pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight)
        } else {
          pdf.addPage()
          pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight)
        }

        pageIndex++
      }

      pdf.save(`SaleOrder-${orderNo || "SO"}.pdf`)
      document.body.removeChild(container)
    } catch (err) {
      console.error("PDF export failed", err)
      Swal.fire("Error", "Failed to export PDF", "error")
    }
  }

  // LIST FILTER
  const filteredList = useMemo(() => {
    const base = Array.isArray(saleOrderList) ? saleOrderList : []
    const sorted = [...base].sort((a, b) =>
      String(a.orderNo || "").localeCompare(String(b.orderNo || "")),
    )

    const s = listSearch.trim().toLowerCase()
    if (!s) return sorted

    return sorted.filter((x) => {
      const orderNoStr = String(x.orderNo || "").toLowerCase()
      const partyNameStr = String(x.partyName || "").toLowerCase()

      const party = partyList.find(
        (p) =>
          normStr(p.partyName) === normStr(x.partyName),
      )

      const station = String(party?.station || "").toLowerCase()

      const baseAgentName = party?.agent?.agentName || ""
      const code = party?.agent?.serialNo
      const masterAgentName =
        code && agents.length
          ? agents.find((a) => String(a.serialNo) === String(code))?.agentName || ""
          : ""
      const agentName = String(baseAgentName || masterAgentName || "").toLowerCase()

      return (
        orderNoStr.includes(s) ||
        partyNameStr.includes(s) ||
        station.includes(s) ||
        agentName.includes(s)
      )
    })
  }, [saleOrderList, listSearch, partyList, agents])

  // packing sync on party change
  useEffect(() => {
    if (!partyName) return

    const sync = async () => {
      const index = await getPackingRateIndex()
      const pid = selectedParty?.id ?? null

      setRows((prevRows) => {
        let anyChanged = false

        const updatedRows = prevRows.map((r) => {
          if (!r.artNo) return r

          const over = findPackingRatesInIndex(index, {
            partyId: pid,
            partyName,
            artNo: r.artNo,
            shadeName: r.shade || undefined,
          })
          if (!Object.keys(over).length) return r

          const currentRate = r.sizeRate || {}
          const newRate: Record<string, string> = { ...currentRate }
          let changed = false

          Object.keys(newRate).forEach((key) => {
            const { sizeName } = parseSizeKey(key)
            if (over[sizeName] !== undefined && String(over[sizeName]) !== "") {
              const newVal = String(over[sizeName])
              if (newRate[key] !== newVal) {
                newRate[key] = newVal
                changed = true
              }
            }
          })

          if (changed) {
            anyChanged = true
            return { ...r, sizeRate: newRate }
          }
          return r
        })

        return anyChanged ? updatedRows : prevRows
      })
    }

    sync()
  }, [partyName, selectedParty])

  // compute totals for list
  useEffect(() => {
    const calcTotals = async () => {
      if (!showList || !saleOrderList.length) return

      try {
        const index = await getPackingRateIndex()
        const totals: Record<number, OrderTotals> = {}

        for (const so of saleOrderList) {
          try {
            const { data } = await api.get(`/sale-orders/${so.id}`)
            const rowsDetail: any[] = Array.isArray(data.rows) ? data.rows : []

            let totalPeti = 0
            let totalBox = 0
            let totalPcs = 0
            let rateSum = 0
            let rateCount = 0

            const partyIdForOrder = data.partyId ?? null
            const partyNameForOrder = data.partyName

            for (const r of rowsDetail) {
              const petiNum = toNum(r.peti || "1") || 1
              totalPeti += petiNum

              const sizeDetails: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : []
              let rowQtySum = 0

              for (const sd of sizeDetails) {
                const qtyNum = toNum(sd.qty || 0)
                rowQtySum += qtyNum
                const rateNum = toNum(sd.rate)
                if (rateNum) {
                  rateSum += rateNum
                  rateCount++
                }
              }

              totalBox += rowQtySum * petiNum

              const perBoxMap = findPackingPerBoxInIndex(index, {
                partyId: partyIdForOrder,
                partyName: partyNameForOrder,
                artNo: r.artNo || "",
                shadeName: r.shadeName || undefined,
              })

              let rowPcs = 0
              for (const sd of sizeDetails) {
                const sizeName = sd.sizeName
                const qtyNum = toNum(sd.qty || 0)
                const perBox = toNum(perBoxMap[sizeName] || 0)
                rowPcs += qtyNum * petiNum * perBox
              }
              totalPcs += rowPcs
            }

            const avgRate = rateCount ? rateSum / rateCount : 0
            totals[so.id] = { totalPeti, totalBox, totalPcs, avgRate }
          } catch (err) {
            console.error("Failed to compute totals for order", so.id, err)
          }
        }

        setOrderTotals(totals)
      } catch (e) {
        console.error("Failed to compute order totals list", e)
      }
    }

    calcTotals()
  }, [showList, saleOrderList])

  // Save/reset/list/edit/delete
  const handleSave = async () => {
    if (isSaving) return

    try {
      if (!partyName.trim()) {
        Swal.fire("Validation", "Please select a party", "warning")
        return
      }

      const nonEmptyRows = rows.filter((r) => (r.artNo || "").trim() !== "")
      if (!nonEmptyRows.length) {
        Swal.fire("Validation", "Please add at least one row with Art No", "warning")
        return
      }

      const payloadRows: SaleOrderRowPayload[] = nonEmptyRows.map((r) => {
        const sizes: Record<string, string> = {}
        const sizesQty: Record<string, string> = {}
        const sizesRate: Record<string, string> = {}

        Object.entries(r.sizeQty || {}).forEach(([key, qty]) => {
          const qStr = String(qty || "").trim()
          if (!qStr) return
          sizesQty[key] = qStr

          const { sizeName } = parseSizeKey(key)
          const prev = toNum(sizes[sizeName] || 0)
          const add = toNum(qStr)
          if (add) sizes[sizeName] = String(prev + add)
        })

        Object.entries(r.sizeRate || {}).forEach(([key, rate]) => {
          const rStr = String(rate ?? "").trim()
          if (!rStr) return
          sizesRate[key] = rStr
        })

        return {
          artSerial: r.artSerial,
          artNo: r.artNo,
          shade: r.shade,
          description: r.description,
          peti: r.peti || "0",
          remarks: r.remarks,
          sizes,
          sizesQty,
          sizesRate,
        }
      })

      const selectedTransport = transports.find(
        (t) => String(t.serialNumber) === String(selectedTransportSerial),
      )
      const transportSerialNumber =
        selectedTransport?.serialNumber ?? selectedParty?.transport?.serialNumber ?? null
      const transportNameToSave =
        selectedTransport?.transportName ?? partyTransportName ?? ""

      const dto: SaleOrderSaveDto = {
        orderNo,
        dated,
        deliveryDate: deliveryDate || null,
        partyId: selectedParty?.id ?? null,
        partyName,
        remarks,
        rows: payloadRows,
        transportSerialNumber,
        transportName: transportNameToSave,
      }

      setIsSaving(true)

      if (editingId) {
        await api.put(`/sale-orders/${editingId}`, dto)
        Swal.fire("Success", "Sale Order updated successfully", "success")
      } else {
        await api.post("/sale-orders", dto)
        Swal.fire("Success", "Sale Order saved successfully", "success")
      }

      // Save ke baad pura form reset, taki same entry dobara save na ho
      resetForm()
    } catch (err) {
      console.error("Failed to save sale order", err)
      const msg = getErrorMessage(err, "Failed to save Sale Order")
      Swal.fire("Error", msg, "error")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setDated(todayStr())
    setDeliveryDate("")
    setPartyName("")
    setSelectedParty(null)
    setSelectedTransportSerial("")
    setRemarks("")

    setRows([
      {
        id: Date.now() + Math.random(),
        artSerial: undefined,
        artNo: "",
        shade: "",
        description: "",
        peti: "",
        remarks: "",
        sizeQty: {},
        sizeRate: {},
      },
    ])
    // nayi entry ka pehla Art No focus
    setPendingFocus({ rowIndex: 0, colIndex: 0 })

    api
      .get<string>("/sale-orders/next-order-no")
      .then((res) => {
        if (res.data) setOrderNo(res.data)
      })
      .catch((e) => {
        console.error("Failed to fetch next order no", e)
      })
  }

  const openList = async () => {
    try {
      const { data } = await api.get<any[]>("/sale-orders")
      setSaleOrderList(Array.isArray(data) ? data : [])
      setShowList(true)
    } catch (err) {
      console.error("Failed to load sale orders list", err)
      Swal.fire("Error", "Failed to load Sale Orders list", "error")
    }
  }

  const handleEdit = async (id: number) => {
    try {
      const { data } = await api.get<any>(`/sale-orders/${id}`)

      setEditingId(id)
      setShowList(false)

      setOrderNo(String(data.orderNo || ""))
      setDated(String(data.dated || todayStr()))
      setDeliveryDate(String(data.deliveryDate || ""))
      setPartyName(String(data.partyName || ""))
      setRemarks(String(data.remarks || ""))

      const tSerialFromData =
        data.transportSerialNumber ??
        data.transportSerialNo ??
        data.transportSerial ??
        data.transportId ??
        null

      if (tSerialFromData) {
        setSelectedTransportSerial(String(tSerialFromData))
      } else if (data.transportName) {
        const match = transports.find(
          (t) => normStr(t.transportName) === normStr(data.transportName),
        )
        if (match) setSelectedTransportSerial(String(match.serialNumber))
        else setSelectedTransportSerial("")
      } else {
        setSelectedTransportSerial("")
      }

      const respRows: any[] = Array.isArray(data.rows) ? data.rows : []

      const newRows: SaleRow[] = respRows.map((r: any) => {
        const sizeQty: Record<string, string> = {}
        const sizeRate: Record<string, string> = {}

        const sizeDetails: any[] = Array.isArray(r.sizeDetails) ? r.sizeDetails : []

        sizeDetails.forEach((sd) => {
          const sizeName = String(sd.sizeName || sd.size || "").trim()
          if (!sizeName) return

          const groupName = getGroupNameFromSize(sd, sizeMaster)
          const key = makeSizeKey(sizeName, groupName)

          if (sd.qty !== undefined && sd.qty !== null && sd.qty !== "") {
            sizeQty[key] = String(sd.qty)
          }
          if (sd.rate !== undefined && sd.rate !== null && sd.rate !== "") {
            sizeRate[key] = String(sd.rate)
          }
        })

        return {
          id: Date.now() + Math.random(),
          artSerial: r.artSerial || r.artSerialNo || r.artSerialNumber,
          artNo: String(r.artNo || ""),
          shade: String(r.shade || r.shadeName || ""),
          description: String(r.description || r.artName || ""),
          peti: r.peti !== undefined && r.peti !== null ? String(r.peti) : "",
          remarks: String(r.remarks || ""),
          sizeQty,
          sizeRate,
        }
      })

      setRows(
        newRows.length
          ? newRows
          : [
              {
                id: Date.now() + Math.random(),
                artSerial: undefined,
                artNo: "",
                shade: "",
                description: "",
                peti: "",
                remarks: "",
                sizeQty: {},
                sizeRate: {},
              },
            ],
      )
    } catch (err) {
      console.error("Failed to load sale order for edit", err)
      Swal.fire("Error", "Failed to load Sale Order", "error")
    }
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to delete this Sale Order?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(`/sale-orders/${id}`)
      Swal.fire("Deleted", "Sale Order deleted successfully", "success")

      setSaleOrderList((prev) => prev.filter((so: any) => so.id !== id))
      setOrderTotals((prev) => {
        const { [id]: _, ...rest } = prev
        return rest
      })
    } catch (err) {
      console.error("Failed to delete sale order", err)
      Swal.fire("Error", "Failed to delete Sale Order", "error")
    }
  }

  const handleBack = () => {
    if (typeof window !== "undefined") {
      window.history.back()
    }
  }

  // ================= Render =================
  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Sale Order</h2>
            {editingId && (
              <span className="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200">
                Editing: #{editingId}
              </span>
            )}
          </div>

          {/* Top form */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block font-semibold">Order No.</label>
              <input type="text" value={orderNo} readOnly className="border p-2 rounded w-full bg-gray-100" />
            </div>
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
              <label className="block font-semibold">Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <input
                type="text"
                value={partyName}
                readOnly
                onClick={openPartyModal}
                placeholder="Click to select party"
                className="border p-2 rounded w-full bg-gray-50 cursor-pointer hover:bg-gray-100"
              />
            </div>

            <div>
              <label className="block font-semibold">Station</label>
              <input
                type="text"
                value={partyStation}
                readOnly
                placeholder="-"
                className="border p-2 rounded w-full bg-gray-50"
              />
            </div>
            <div>
              <label className="block font-semibold">Agent</label>
              <input
                type="text"
                value={partyAgentName}
                readOnly
                placeholder="-"
                className="border p-2 rounded w-full bg-gray-50"
              />
            </div>

            <div>
              <label className="block font-semibold">Transport</label>
              <select
                value={selectedTransportSerial}
                onChange={(e) => setSelectedTransportSerial(e.target.value)}
                className="border p-2 rounded w-full bg-white"
              >
                <option value="">
                  {partyTransportName ? `Party Default: ${partyTransportName}` : "-- Select Transport --"}
                </option>
                {transports.map((t) => (
                  <option key={t.serialNumber} value={t.serialNumber}>
                    {t.transportName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-4">
              <label className="block font-semibold">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Grid (screen) */}
          <div className="overflow-auto">
            <table className="min-w-[1200px] w-full border border-blue-500 text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S No</th>
                  <th className="border p-2 w-32">Art No</th>
                  <th className="border p-2 w-24">Shade</th>
                  <th className="border p-2">Description</th>
                  <th className="border p-2">Peti</th>
                  <th className="border p-2">Remarks</th>
                  {sizeColumns.map((key) => {
                    const { sizeName, groupName } = parseSizeKey(key)
                    return (
                      <th key={key} className="border p-2">
                        <div className="flex flex-col items-center">
                          <div>{sizeName}</div>
                          <div className="text-[10px] font-normal text-gray-600">
                            {groupName ? `${groupName} — Qty / Rate` : "Qty / Rate"}
                          </div>
                        </div>
                      </th>
                    )
                  })}
                  <th className="border p-2">Total Pcs</th>
                  <th className="border p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const pcs =
                    Object.values(row.sizeQty || {}).reduce((s, v) => s + toNum(v), 0) * (toNum(row.peti || "1") || 1)
                  return (
                    <tr key={row.id}>
                      <td className="border p-2 text-center">{idx + 1}</td>

                      {/* Art No - colIndex = 0 */}
                      <td className="border p-1 w-32">
                        <input
                          type="text"
                          value={row.artNo}
                          readOnly
                          onClick={() => openArtModal(row.id)}
                          placeholder="Click to select"
                          className="border p-1 rounded w-full bg-yellow-50 cursor-pointer text-center text-xs"
                          onKeyDown={handleCellKeyDown}
                          data-row-index={idx}
                          data-col-index={0}
                        />
                      </td>

                      {/* Shade - colIndex = 1 */}
                      <td className="border p-1 w-24">
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            value={row.shade}
                            readOnly
                            onClick={() => openShadeModal(row.id)}
                            placeholder="Click"
                            className="border p-1 rounded w-full bg-yellow-50 cursor-pointer text-center text-xs"
                            onKeyDown={handleCellKeyDown}
                            data-row-index={idx}
                            data-col-index={1}
                          />
                          {row.shade && (
                            <button
                              title="Clear"
                              onClick={() => handleRowField(row.id, "shade", "")}
                              className="px-2 py-[2px] bg-gray-200 rounded hover:bg-gray-300 text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Description - colIndex = 2 */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleRowField(row.id, "description", e.target.value)}
                          className="border p-1 rounded w-full text-center"
                          onKeyDown={handleCellKeyDown}
                          data-row-index={idx}
                          data-col-index={2}
                        />
                      </td>

                      {/* Peti - colIndex = 3 */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.peti}
                          onChange={(e) => handleRowField(row.id, "peti", e.target.value)}
                          className="border p-1 rounded w-full text-center"
                          onKeyDown={handleCellKeyDown}
                          data-row-index={idx}
                          data-col-index={3}
                        />
                      </td>

                      {/* Remarks - colIndex = 4 */}
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleRowField(row.id, "remarks", e.target.value)}
                          className="border p-1 rounded w-full text-center"
                          onKeyDown={handleCellKeyDown}
                          data-row-index={idx}
                          data-col-index={4}
                        />
                      </td>

                      {/* Size columns: each has Qty & Rate = 2 logical columns */}
                      {sizeColumns.map((key, sizeIdx) => {
                        const enabled = Object.prototype.hasOwnProperty.call(row.sizeQty || {}, key)
                        const qtyColIndex = 5 + sizeIdx * 2
                        const rateColIndex = 5 + sizeIdx * 2 + 1
                        return (
                          <td key={key} className="border p-1">
                            <div className={`${enabled ? "" : "opacity-60"}`}>
                              <input
                                type="text"
                                value={row.sizeQty[key] || ""}
                                onChange={(e) => handleSizeQtyChange(row.id, key, e.target.value)}
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-center mb-1 ${
                                  enabled ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                placeholder="Qty"
                                onKeyDown={handleCellKeyDown}
                                data-row-index={idx}
                                data-col-index={qtyColIndex}
                              />
                              <input
                                type="text"
                                value={row.sizeRate[key] || ""}
                                onChange={(e) => handleSizeRateChange(row.id, key, e.target.value)}
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-center ${
                                  enabled ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                placeholder="Rate"
                                title="Per-size rate (editable)"
                                onKeyDown={handleCellKeyDown}
                                data-row-index={idx}
                                data-col-index={rateColIndex}
                              />
                            </div>
                          </td>
                        )
                      })}

                      <td className="border p-1 text-center font-medium">{pcs}</td>
                      <td className="border p-1 text-center">
                        <button
                          onClick={() => removeRow(row.id, idx)}
                          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom buttons */}
          <div className="flex justify-between mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openArtModal()}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                Select Art
              </button>
              <button onClick={addRow} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Add Row
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ${
                  isSaving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {editingId ? "Update" : "Save"}
              </button>
              {editingId && (
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 bg-gray-400 text-white rounded"
                >
                  Cancel Edit
                </button>
              )}
              <button
                onClick={() => resetForm()}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                New Entry
              </button>
              <button onClick={openList} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                View List
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
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
                onClick={handleBack}
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Back
              </button>
            </div>
            <div className="text-right font-semibold space-y-1">
              <p>Total Peti: {totalPeti}</p>
              <p>Total Pcs: {totalPcs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[80vh] p-6 flex flex-col">
            <h3 className="text-2xl font-bold text-center mb-4">Select Party</h3>
            <input
              type="text"
              placeholder="Search party / serial / GST / station / agent..."
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto flex-1 border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Serial No</th>
                    <th className="border p-2">Party Name</th>
                    <th className="border p-2">GST No</th>
                    <th className="border p-2">Station</th>
                    <th className="border p-2">Agent</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((p, i) => {
                    const baseAgentName = p.agent?.agentName || ""
                    const code = p.agent?.serialNo
                    const masterAgentName = code
                      ? agents.find((a) => String(a.serialNo) === String(code))?.agentName || ""
                      : ""
                    const agentName = baseAgentName || masterAgentName || ""
                    return (
                      <tr key={`${p.serialNumber}-${i}`}>
                        <td className="border p-2 text-center">{p.serialNumber}</td>
                        <td className="border p-2 text-center">{p.partyName}</td>
                        <td className="border p-2 text-center">{p.gstNo}</td>
                        <td className="border p-2 text-center">{p.station}</td>
                        <td className="border p-2 text-center">{agentName}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => selectParty(p)}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredParties.length === 0 && (
                    <tr>
                      <td className="border p-4 text-center text-gray-500" colSpan={6}>
                        No parties found
                      </td>
                    </tr>
                  )}
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

      {/* Art Modal */}
      {showArtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-1">
              {currentRowId != null ? "Select Art(s) for Row" : "Select Art(s)"}
            </h3>

            <input
              type="text"
              placeholder="Search by Art No / Name"
              value={artSearch}
              onChange={(e) => setArtSearch(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />

            <div className="flex-1 overflow-auto border rounded">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2 w-12">
                      <input
                        type="checkbox"
                        checked={selectedArts.length === filteredArts.length && filteredArts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedArts(filteredArts.map((a) => a.serialNumber))
                          else setSelectedArts([])
                        }}
                      />
                    </th>
                    <th className="border p-2">Serial</th>
                    <th className="border p-2">Art No</th>
                    <th className="border p-2">Art Name</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArts.length === 0 ? (
                    <tr>
                      <td className="border p-4 text-center text-gray-500" colSpan={5}>
                        No arts found
                      </td>
                    </tr>
                  ) : (
                    filteredArts.map((a) => (
                      <tr key={a.serialNumber}>
                        <td className="border p-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedArts.includes(a.serialNumber)}
                            onChange={() => toggleArtSelection(a.serialNumber)}
                          />
                        </td>
                        <td className="border p-2 text-center">{a.serialNumber}</td>
                        <td className="border p-2 text-center">{a.artNo}</td>
                        <td className="border p-2 text-center">{a.artName}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() =>
                              currentRowId != null ? selectArtForCurrentRow(a) : toggleArtSelection(a.serialNumber)
                            }
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            {currentRowId != null
                              ? "Select"
                              : selectedArts.includes(a.serialNumber)
                              ? "Unselect"
                              : "Select"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected sequence view */}
            <div className="mt-3 border-t pt-3">
              <h4 className="font-semibold mb-2 text-sm text-center">Selected (Sequence)</h4>
              <div className="max-h-32 overflow-auto border rounded">
                {selectedArts.length === 0 ? (
                  <div className="p-2 text-xs text-gray-500 text-center">No art selected</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-1 w-10">#</th>
                        <th className="border p-1">Art No</th>
                        <th className="border p-1">Art Name</th>
                        <th className="border p-1 w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedArts.map((sn, i) => {
                        const art = artList.find((a) => a.serialNumber === sn)
                        if (!art) return null
                        return (
                          <tr key={sn}>
                            <td className="border p-1 text-center">{i + 1}</td>
                            <td className="border p-1 text-center">{art.artNo}</td>
                            <td className="border p-1 text-center">{art.artName}</td>
                            <td className="border p-1 text-center space-x-1">
                              <button
                                onClick={() => moveSelectedUp(sn)}
                                className="px-1 py-[1px] text-xs bg-gray-200 rounded"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveSelectedDown(sn)}
                                className="px-1 py-[1px] text-xs bg-gray-200 rounded"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => removeFromSelected(sn)}
                                className="px-1 py-[1px] text-xs bg-red-400 text-white rounded"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={addSelectedArts}
                className="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Selected ({selectedArts.length})
              </button>
              <button
                onClick={() => {
                  setShowArtModal(false)
                  setCurrentRowId(null)
                  setSelectedArts([])
                }}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shade Modal */}
      {showShadeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Select Shade</h3>
              <button onClick={() => setShowShadeModal(false)} className="px-3 py-1 bg-gray-200 rounded">
                Close
              </button>
            </div>
            <input
              value={shadeSearch}
              onChange={(e) => setShadeSearch(e.target.value)}
              placeholder="Search shade name / code"
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-[70vh] border">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Shade Code</th>
                    <th className="border p-2">Shade Name</th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShades.map((sh) => (
                    <tr key={`${sh.shadeCode}-${sh.shadeName}`} className="hover:bg-gray-50">
                      <td className="border p-2 text-center">{sh.shadeCode}</td>
                      <td className="border p-2 text-center">{sh.shadeName}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectShadeForCurrentRow(sh)}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredShades.length === 0 && (
                    <tr>
                      <td className="border p-3 text-center text-gray-500" colSpan={3}>
                        No shades found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-[95vw] max-w-[1200px] h-[90vh] p-5 flex flex-col">
            <h3 className="text-xl font-bold text-center mb-4">Sale Order List</h3>

            <input
              placeholder="Search by Order No / Party / Station / Agent"
              className="border p-2 rounded w-full mb-3"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />

            <div className="flex-1 overflow-auto mt-4">
              <table className="w-full min-w-[1100px] text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Order No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">Station</th>
                    <th className="border p-2">Agent</th>
                    <th className="border p-2">Total Peti</th>
                    <th className="border p-2">Total Box</th>
                    <th className="border p-2">Rate</th>
                    <th className="border p-2">Total Pcs</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((so: any, i: number) => {
                    const party = partyList.find(
                      (p) =>
                        normStr(p.partyName) === normStr(so.partyName),
                    )

                    const station = party?.station || ""

                    const baseAgentName = party?.agent?.agentName || ""
                    const code = party?.agent?.serialNo
                    const masterAgentName =
                      code && agents.length
                        ? agents.find((a) => String(a.serialNo) === String(code))?.agentName || ""
                        : ""
                    const agentName = baseAgentName || masterAgentName || ""

                    const totals = orderTotals[so.id]

                    return (
                      <tr key={so.id}>
                        <td className="border p-2 text-center">{i + 1}</td>
                        <td className="border p-2 text-center">{so.orderNo}</td>
                        <td className="border p-2 text-center">
                          {so.dated ? formatDateDDMMYY(so.dated) : ""}
                        </td>
                        <td className="border p-2 text-center">{so.partyName}</td>
                        <td className="border p-2 text-center">{station}</td>
                        <td className="border p-2 text-center">{agentName}</td>
                        <td className="border p-2 text-center">
                          {totals ? totals.totalPeti : ""}
                        </td>
                        <td className="border p-2 text-center">
                          {totals ? totals.totalBox : ""}
                        </td>
                        <td className="border p-2 text-center">
                          {totals ? totals.avgRate.toFixed(2) : ""}
                        </td>
                        <td className="border p-2 text-center">
                          {totals ? totals.totalPcs : ""}
                        </td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => handleEdit(so.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(so.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredList.length === 0 && (
                    <tr>
                      <td className="border p-4 text-center text-gray-500" colSpan={11}>
                        No records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => {
                  setShowList(false)
                  setOrderTotals({})
                }}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  )
}

export default SaleOrder