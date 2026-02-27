"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Dashboard from "../Dashboard"
import Swal from "sweetalert2"
import api from "../../api/axiosInstance"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

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

interface SizeDetail {
  id: number
  serialNo: string
  sizeName: string
  orderNo: string
  artGroup?: string
  rate?: string | number
}

interface ArtDetail {
  serialNumber: string
  artGroup?: string
  artName: string
  artNo: string
  sizes?: SizeDetail[]
}

interface SaleRow {
  id: number
  artSerial?: string
  artNo: string
  shade: string
  description: string
  peti: string
  remarks: string
  sizeQty: Record<string, string> // sizeName -> qty (Sale Order Qty)
  sizeRate: Record<string, string> // sizeName -> rate
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
}

type Shade = { shadeCode: string; shadeName: string }

// ================= Utils =================
const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
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

// ================= Shades API =================
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

/* =========================
   Packing → Sale Rate + PerBox Sync
========================= */

type PackingRateRow = {
  partyId: number | null
  partyName: string
  shade: string
  sizeRates: Record<string, string>
  sizePerBox: Record<string, string>
  time: number
}

type PackingRateIndex = Record<string, PackingRateRow[]> // key = artNo (normalized)

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

  const getField = (row: PackingRateRow | null) =>
    row ? { ...(row[field] || {}) } : {}

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

const mergeSizeRates = (
  sizeQty: Record<string, string>,
  sizeRate: Record<string, string>,
  overrideRates: Record<string, string>,
) => {
  const nextQty = { ...(sizeQty || {}) }
  const nextRate = { ...(sizeRate || {}) }
  for (const [k, v] of Object.entries(overrideRates || {})) {
    nextRate[k] = String(v ?? "")
    if (!Object.prototype.hasOwnProperty.call(nextQty, k)) {
      nextQty[k] = "0"
    }
  }
  return { sizeQty: nextQty, sizeRate: nextRate }
}

const isFulfilled = <T,>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> =>
  r.status === "fulfilled"

// ================= Component =================
const SaleOrder: React.FC = () => {
  // Header
  const [orderNo, setOrderNo] = useState("")
  const [dated, setDated] = useState(todayStr())
  const [deliveryDate, setDeliveryDate] = useState("")
  const [partyName, setPartyName] = useState("")
  const [remarks, setRemarks] = useState("")

  // Rows
  const [rows, setRows] = useState<SaleRow[]>([])

  // Party + related masters
  const [partyList, setPartyList] = useState<PartyFromApi[]>([])
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [partySearch, setPartySearch] = useState("")
  const [selectedParty, setSelectedParty] = useState<PartyFromApi | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [transports, setTransports] = useState<Transporter[]>([])

  // Arts
  const [artList, setArtList] = useState<ArtListItem[]>([])
  const [showArtModal, setShowArtModal] = useState(false)
  const [artSearch, setArtSearch] = useState("")
  const [selectedArts, setSelectedArts] = useState<Set<string>>(new Set())
  const [currentRowId, setCurrentRowId] = useState<number | null>(null)

  // Shades
  const [shades, setShades] = useState<Shade[]>([])
  const [showShadeModal, setShowShadeModal] = useState(false)
  const [shadeSearch, setShadeSearch] = useState("")
  const [shadeRowId, setShadeRowId] = useState<number | null>(null)

  // List
  const [showList, setShowList] = useState(false)
  const [saleOrderList, setSaleOrderList] = useState<any[]>([])
  const [listSearch, setListSearch] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)

  const sizeColumns = useMemo(() => {
    const s = new Set<string>()
    rows.forEach((r) => {
      Object.keys(r.sizeQty || {}).forEach((k) => s.add(k))
      Object.keys(r.sizeRate || {}).forEach((k) => s.add(k))
    })
    return Array.from(s).sort(sizeSort)
  }, [rows])

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
    const s = partySearch.toLowerCase()
    return partyList.filter(
      (p) =>
        (p.partyName || "").toLowerCase().includes(s) ||
        (p.serialNumber || "").toLowerCase().includes(s) ||
        (p.gstNo || "").toLowerCase().includes(s),
    )
  }, [partyList, partySearch])

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
        ] = await Promise.all([
          api.get<string>("/sale-orders/next-order-no").catch(() => ({ data: "" as string })),
          api.get<PartyFromApi[]>("/party/all"),
          api.get<Agent[]>("/agent/list").catch(() => ({ data: [] as Agent[] })),
          api.get<Transporter[]>("/transports").catch(() => ({ data: [] as Transporter[] })),
          api.get<ArtListItem[]>("/arts"),
          listShades().catch(() => [] as Shade[]),
        ])

        if (nextRes.data) setOrderNo(nextRes.data)
        setPartyList(Array.isArray(partiesRes.data) ? partiesRes.data : [])
        setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : [])
        setTransports(Array.isArray(transportsRes.data) ? transportsRes.data : [])
        setArtList(Array.isArray(artsRes.data) ? artsRes.data : [])
        setShades(shadesList)
      } catch (e) {
        console.error(e)
        Swal.fire("Error", "Failed to load Parties/Arts/Shades", "error")
      } finally {
        if (rows.length === 0) addRow()
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync selectedParty when partyName changes
  useEffect(() => {
    if (!partyName) {
      setSelectedParty(null)
      return
    }
    const found = partyList.find(
      (p) => (p.partyName || "").trim().toLowerCase() === partyName.trim().toLowerCase(),
    )
    setSelectedParty(found || null)
  }, [partyName, partyList])

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        artSerial: undefined,
        artNo: "",
        shade: "",
        description: "",
        peti: "1",
        remarks: "",
        sizeQty: {},
        sizeRate: {},
      },
    ])
  }, [])

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const setArtToRow = async (rowId: number, art: ArtListItem) => {
    try {
      const { data } = await api.get<ArtDetail>(`/arts/${art.serialNumber}`)
      const baseQty: Record<string, string> = {}
      const baseRate: Record<string, string> = {}
      const sizes = data?.sizes || []
      if (sizes.length) {
        sizes.forEach((s) => {
          baseQty[s.sizeName] = "0"
          baseRate[s.sizeName] = s.rate !== undefined && s.rate !== null ? String(s.rate) : ""
        })
      }

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

  const handleSizeQtyChange = (id: number, size: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, sizeQty: { ...r.sizeQty, [size]: sanitizeNumber(value) } }
      }),
    )
  }

  const handleSizeRateChange = (id: number, size: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        return { ...r, sizeRate: { ...r.sizeRate, [size]: sanitizeNumber(value) } }
      }),
    )
  }

  // Party modal
  const openPartyModal = () => {
    setPartySearch("")
    setShowPartyModal(true)
  }
  const selectParty = (p: PartyFromApi) => {
    setPartyName(p.partyName)
    setSelectedParty(p)
    setShowPartyModal(false)
  }

  // Art modal
  const openArtModal = (rowId?: number) => {
    setSelectedArts(new Set())
    setArtSearch("")
    setCurrentRowId(rowId ?? null)
    setShowArtModal(true)
  }
  const toggleArtSelection = (serialNumber: string) => {
    setSelectedArts((prev) => {
      const n = new Set(prev)
      if (n.has(serialNumber)) n.delete(serialNumber)
      else n.add(serialNumber)
      return n
    })
  }
  const selectArtForCurrentRow = async (art: ArtListItem) => {
    if (!currentRowId) return
    await setArtToRow(currentRowId, art)
    setShowArtModal(false)
    setCurrentRowId(null)
    setSelectedArts(new Set())
  }

  const addSelectedArts = async () => {
    if (selectedArts.size === 0) {
      Swal.fire("Warning", "Please select at least one Art", "warning")
      return
    }
    try {
      const chosenArts = artList.filter((a) => selectedArts.has(a.serialNumber))

      const artDet = await Promise.allSettled(
        chosenArts.map((a) => api.get<ArtDetail>(`/arts/${a.serialNumber}`)),
      )

      const index = await getPackingRateIndex()
      const pid = selectedParty?.id ?? null

      const preparedRows: SaleRow[] = chosenArts.map((art, idx) => {
        const res = artDet[idx]
        const sizeQty: Record<string, string> = {}
        const sizeRate: Record<string, string> = {}

        if (isFulfilled(res)) {
          const sizes = res.value.data?.sizes || []
          sizes.forEach((s) => {
            sizeQty[s.sizeName] = "0"
            sizeRate[s.sizeName] = s.rate !== undefined && s.rate !== null ? String(s.rate) : ""
          })
        }

        const over = findPackingRatesInIndex(index, {
          partyId: pid,
          partyName,
          artNo: art.artNo,
        })
        const merged = mergeSizeRates(sizeQty, sizeRate, over)

        return {
          id: Date.now() + Math.random(),
          artSerial: art.serialNumber,
          artNo: art.artNo,
          shade: "",
          description: art.artName || "",
          peti: "1",
          remarks: "",
          sizeQty: merged.sizeQty,
          sizeRate: merged.sizeRate,
        }
      })

      if (currentRowId) {
        const [first, ...rest] = preparedRows
        if (!first) {
          Swal.fire("Info", "No art selected", "info")
          return
        }
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
            peti: "1",
            remarks: "",
          }
          const before = prev.slice(0, idx)
          const after = prev.slice(idx + 1)
          return [...before, updatedCurrent, ...rest, ...after]
        })
        Swal.fire("Success", `Applied ${chosenArts.length} art(s)`, "success")
      } else {
        setRows((prev) => {
          const nonEmpty = prev.filter((r) => r.artNo.trim() !== "")
          return [...preparedRows, ...nonEmpty]
        })
        Swal.fire("Success", `Added ${chosenArts.length} art(s)`, "success")
      }
      setShowArtModal(false)
      setCurrentRowId(null)
      setSelectedArts(new Set())
    } catch (e) {
      console.error(e)
      Swal.fire("Error", "Failed to add selected arts", "error")
    }
  }

  // Shade modal
  const openShadeModal = (rowId: number) => {
    setShadeRowId(rowId)
    setShadeSearch("")
    setShowShadeModal(true)
  }

  const selectShadeForCurrentRow = async (shade: Shade) => {
    if (!shadeRowId) return
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
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  ...mergeSizeRates(r.sizeQty || {}, r.sizeRate || {}, over),
                }
              : r,
          ),
        )
      }
    }
  }

  const buildPayload = (): SaleOrderSaveDto => ({
    orderNo,
    dated,
    deliveryDate: deliveryDate || null,
    partyId: selectedParty?.id ?? null,
    partyName,
    remarks,
    rows: rows
      .filter((r) => r.artNo.trim() !== "")
      .map((r) => ({
        artSerial: r.artSerial,
        artNo: r.artNo,
        shade: r.shade,
        description: r.description,
        peti: r.peti || "1",
        remarks: r.remarks,
        sizes: r.sizeQty,
        sizesQty: r.sizeQty,
        sizesRate: r.sizeRate,
      })),
  })

  const handleSave = async () => {
    if (!partyName) {
      Swal.fire("Error", "Please select Party", "error")
      return
    }
    const meaningfulRows = rows.filter((r) => r.artNo.trim() !== "")
    if (meaningfulRows.length === 0) {
      Swal.fire("Error", "Please add at least one Art", "error")
      return
    }

    const payload = buildPayload()

    try {
      if (editingId) {
        await api.put(`/sale-orders/${editingId}`, payload)
        Swal.fire("Success", "Sale Order updated!", "success")
        setEditingId(null)
      } else {
        await api.post("/sale-orders", payload)
        Swal.fire("Success", "Sale Order saved!", "success")
      }

      try {
        const { data } = await api.get<string>("/sale-orders/next-order-no")
        if (data) setOrderNo(data)
      } catch {}

      resetForm(false)
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.message || "Failed to save", "error")
    }
  }

  const openList = async () => {
    try {
      const { data } = await api.get<any[]>("/sale-orders")
      setSaleOrderList(Array.isArray(data) ? data : [])
      setShowList(true)
    } catch {
      setSaleOrderList([])
      setShowList(true)
    }
  }

  const handleEdit = async (id: number) => {
    try {
      const { data } = await api.get(`/sale-orders/${id}`)
      setOrderNo(data.orderNo || "")
      setDated(data.dated || todayStr())
      setDeliveryDate(data.deliveryDate || "")
      setPartyName(data.partyName || "")
      setRemarks(data.remarks || "")
      setEditingId(data.id || id)

      const mapped: SaleRow[] = (data.rows || []).map((r: any, i: number) => {
        const qtyMap: Record<string, string> = {}
        const rateMap: Record<string, string> = {}
        for (const sd of r.sizeDetails || []) {
          if (!sd.sizeName) continue
          qtyMap[sd.sizeName] = sd.qty != null ? String(sd.qty) : ""
          rateMap[sd.sizeName] = sd.rate != null ? String(sd.rate) : ""
        }
        return {
          id: Date.now() + i,
          artSerial: r.artSerial,
          artNo: r.artNo || "",
          shade: r.shadeName || "",
          description: r.description || "",
          peti: String(r.peti ?? "1"),
          remarks: r.remarks || "",
          sizeQty: qtyMap,
          sizeRate: rateMap,
        }
      })
      setRows(mapped.length ? mapped : [])
      setShowList(false)
    } catch {
      Swal.fire("Error", "Failed to load record", "error")
    }
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    })
    if (!result.isConfirmed) return
    try {
      await api.delete(`/sale-orders/${id}`)
      Swal.fire("Deleted!", "Record deleted successfully", "success")
      openList()
      try {
        const { data } = await api.get<string>("/sale-orders/next-order-no")
        if (data) setOrderNo(data)
      } catch {}
    } catch {
      Swal.fire("Error", "Failed to delete", "error")
    }
  }

  const resetForm = (regen = true) => {
    setRows([])
    addRow()
    setPartyName("")
    setSelectedParty(null)
    setDeliveryDate("")
    setRemarks("")
    setEditingId(null)
    setDated(todayStr())
    if (regen) {
      ;(async () => {
        try {
          const { data } = await api.get<string>("/sale-orders/next-order-no")
          if (data) setOrderNo(data)
        } catch {}
      })()
    }
  }

  // ----------- Print & PDF (common content) -----------
  const buildPrintContent = async (): Promise<{ style: string; bodyContent: string }> => {
    const index = await getPackingRateIndex()
    const printableRows = rows.filter((r) => (r.artNo || "").trim() !== "")

    const grouped: Record<string, SaleRow[]> = {}
    printableRows.forEach((r) => {
      const key = r.artNo
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(r)
    })

    // Overall Total Pcs = sum of (peti * perBox * qty) for all arts
    let overallTotalPcsFromPB = 0

    const groupsHtml = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([artNo, grpRows]) => {
        const sizeSet = new Set<string>()
        grpRows.forEach((r) => {
          Object.keys(r.sizeQty || {}).forEach((k) => sizeSet.add(k))
          Object.keys(r.sizeRate || {}).forEach((k) => sizeSet.add(k))
        })
        const allSizes = Array.from(sizeSet)

        // Only those sizes where any row has qty > 0
        const sizeCols = allSizes
          .filter((sizeName) =>
            grpRows.some((r) => toNum(r.sizeQty?.[sizeName] || 0) > 0),
          )
          .sort(sizeSort)

        // Header (two rows)
        const sizeHeadRow1 = sizeCols
          .map((s) => `<th colspan="3">${s}</th>`)
          .join("")

        const sizeHeadRow2 = sizeCols
          .map(
            () => `
              <th>Per/Box</th>
              <th>Qty</th>
              <th>Rate</th>
            `,
          )
          .join("")

        // Art Total Pcs (sum of peti * perBox * qty)
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

            const sizeCells = sizeCols
              .map((s) => {
                const qtyRaw = r.sizeQty[s] ?? ""
                const qtyNum = toNum(qtyRaw)

                const pbRaw = perBoxMap[s] ?? ""
                const pbNum = toNum(pbRaw)

                // Add to art total pcs: peti * perBox * qty
                groupTotalPcsFromPB += rowPetiNum * pbNum * qtyNum

                const displayQty =
                  qtyRaw.trim() === "" || qtyNum === 0 ? "" : qtyRaw
                const displayPB =
                  pbRaw.trim() === "" || pbNum === 0 ? "" : pbRaw

                const rtRaw = r.sizeRate[s] || ""
                const displayRate = rtRaw ? "₹" + rtRaw : ""

                return `
                  <td>${displayPB}</td>
                  <td>${displayQty}</td>
                  <td>${displayRate}</td>
                `
              })
              .join("")

            // Total Box for row (qty sum * peti)
            const totalBoxForRow =
              Object.values(r.sizeQty || {}).reduce((s, v) => s + toNum(v), 0) *
              rowPetiNum

            return `
              <tr>
                <td>${i + 1}</td>
                <td>${r.shade || ""}</td>
                <td>${r.description || ""}</td>
                <td>${r.peti || "1"}</td>
                <td>${r.remarks || ""}</td>
                ${sizeCells}
                <td>${totalBoxForRow}</td>
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

        // add art total pcs to overall
        overallTotalPcsFromPB += groupTotalPcsFromPB

        const artName = grpRows.find((r) => r.description)?.description || ""

        return `
          <div class="group">
            <div class="group-title">Art: ${artNo}${artName ? ` — ${artName}` : ""}</div>
            <table class="grid-table">
              <thead>
                <tr>
                  <th rowspan="2">#</th>
                  <th rowspan="2">Shade</th>
                  <th rowspan="2">Description</th>
                  <th rowspan="2">Peti</th>
                  <th rowspan="2">Remarks</th>
                  ${sizeHeadRow1}
                  <th rowspan="2">Total Box</th>
                </tr>
                <tr>
                  ${sizeHeadRow2}
                </tr>
              </thead>
              <tbody>${bodyRows}</tbody>
            </table>
            <div class="totals">
              <span>Art Total Peti: ${groupTotalPeti}</span>
              <span>Art Total Box: ${groupTotalBox}</span>
              <span>Art Total Pcs: ${groupTotalPcsFromPB}</span>
            </div>
          </div>
        `
      })
      .join("")

    const style = `
      * {
        box-sizing: border-box;
      }
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
      .print-wrapper {
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
      .header-meta {
        text-align: center;
        font-size: 11px;
        margin-bottom: 6px;
        color: #1f2937;
      }
      .header-meta .label {
        font-weight: 600;
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
      .header-grid div {
        white-space: nowrap;
      }
      .header-grid .label {
        font-weight: 600;
      }
      .remarks-line {
        font-size: 11px;
        margin: 4px 0 10px;
        text-align: center;
        color: #111827;
      }
      .remarks-line .label {
        font-weight: 600;
      }
      .group {
        margin: 8px 0 14px;
        page-break-inside: avoid;
      }
      .group-title {
        font-size: 13px;
        font-weight: 700;
        margin: 8px 0 4px;
        padding-bottom: 2px;
        border-bottom: 1px solid #e5e7eb;
        color: #111827;
      }
      .grid-table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 2px;
      }
      .grid-table th,
      .grid-table td {
        border: 1px solid #d1d5db;
        padding: 3px 4px;
        text-align: center;
        font-size: 9px;
        vertical-align: middle;
        color: #111827;
      }
      .grid-table th {
        background: #e5edff;
        font-weight: 600;
      }
      .grid-table tbody tr:nth-child(even) td {
        background: #f9fafb;
      }
      .totals {
        margin: 4px 0 6px;
        font-weight: 600;
        display: flex;
        justify-content: flex-end;
        gap: 18px;
        font-size: 11px;
        color: #111827;
      }
      .overall-totals {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 6px;
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        font-weight: 700;
        text-align: right;
        font-size: 11px;
        color: #111827;
        page-break-inside: avoid;
      }
    `

    const bodyContent = `
      <div class="print-wrapper">
        <h2>Sale Order</h2>

        <div class="header-meta">
          <span class="label">Order No:</span> ${orderNo || "-"}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <span class="label">Date:</span> ${dated || "-"}
        </div>

        <div class="header-grid">
          <div><span class="label">Party:</span> ${partyName || "-"}</div>
          ${selectedParty?.station ? `<div><span class="label">Station:</span> ${selectedParty.station}</div>` : ""}
          ${partyAgentName ? `<div><span class="label">Account By:</span> ${partyAgentName}</div>` : ""}
          ${partyTransportName ? `<div><span class="label">Transport:</span> ${partyTransportName}</div>` : ""}
          ${deliveryDate ? `<div><span class="label">Delivery:</span> ${deliveryDate}</div>` : ""}
        </div>

        ${
          remarks
            ? `<div class="remarks-line"><span class="label">Remarks:</span> ${remarks}</div>`
            : ""
        }

        ${groupsHtml}

        <div class="overall-totals">
          <div>Overall Total Peti: ${totalPeti}</div>
          <div>Overall Total Box: ${totalPcs}</div>
          <div>Overall Total Pcs: ${overallTotalPcsFromPB}</div>
        </div>
      </div>
    `

    return { style, bodyContent }
  }
 //Handle Print logic
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

  const handleExportPdf = async () => {
    const { style, bodyContent } = await buildPrintContent()

    const container = document.createElement("div")
    container.id = "so-pdf-root"

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
      const target = (contentEl.querySelector(".print-wrapper") as HTMLElement) || contentEl

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

      pdf.save(`SaleOrder-${orderNo || "SO"}.pdf`)
    } catch (e) {
      console.error("PDF export error", e)
    } finally {
      document.body.removeChild(container)
    }
  }

  const filteredList = Array.isArray(saleOrderList)
    ? saleOrderList.filter((x) => {
        const s = listSearch.toLowerCase()
        return (
          !listSearch ||
          (x.orderNo || "").toLowerCase().includes(s) ||
          (x.partyName || "").toLowerCase().includes(s)
        )
      })
    : []

  useEffect(() => {
    const sync = async () => {
      if (!partyName || rows.length === 0) return
      const index = await getPackingRateIndex()
      const pid = selectedParty?.id ?? null

      const updates: { id: number; sizeQty: Record<string, string>; sizeRate: Record<string, string> }[] = []

      for (const r of rows) {
        if (!r.artNo) continue
        const over = findPackingRatesInIndex(index, {
          partyId: pid,
          partyName,
          artNo: r.artNo,
          shadeName: r.shade || undefined,
        })
        if (Object.keys(over).length) {
          const merged = mergeSizeRates(r.sizeQty || {}, r.sizeRate || {}, over)
          updates.push({ id: r.id, ...merged })
        }
      }
      if (updates.length) {
        setRows((prev) =>
          prev.map((row) => {
            const u = updates.find((x) => x.id === row.id)
            return u ? { ...row, sizeQty: u.sizeQty, sizeRate: u.sizeRate } : row
          }),
        )
      }
    }
    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyName])

  // ================= Render =================
  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold mb-4">Sale Order</h2>
            {editingId && (
              <span className="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200">
                Editing: #{editingId}
              </span>
            )}
          </div>

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
              <label className="block font-semibold">Account By</label>  
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
              <input
                type="text"
                value={partyTransportName}
                readOnly
                placeholder="-"
                className="border p-2 rounded w-full bg-gray-50"
              />
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

          <div className="overflow-auto">
            <table className="min-w-[1200px] w-full border border-blue-500 text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S No</th>
                  <th className="border p-2">Art No</th>
                  <th className="border p-2">Shade</th>
                  <th className="border p-2">Description</th>
                  <th className="border p-2">Peti</th>
                  <th className="border p-2">Remarks</th>
                  {sizeColumns.map((s) => (
                    <th key={s} className="border p-2">
                      <div className="flex flex-col items-center">
                        <div>{s}</div>
                        <div className="text-[10px] font-normal text-gray-600">Qty / Rate</div>
                      </div>
                    </th>
                  ))}
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
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.artNo}
                          readOnly
                          onClick={() => openArtModal(row.id)}
                          placeholder="Click to select"
                          className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                        />
                      </td>
                      <td className="border p-1">
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            value={row.shade}
                            readOnly
                            onClick={() => openShadeModal(row.id)}
                            placeholder="Click to select"
                            className="border p-1 rounded w-full bg-yellow-50 cursor-pointer"
                          />
                          {row.shade && (
                            <button
                              title="Clear"
                              onClick={() => handleRowField(row.id, "shade", "")}
                              className="px-2 py-[2px] bg-gray-200 rounded hover:bg-gray-300"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleRowField(row.id, "description", e.target.value)}
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.peti}
                          onChange={(e) => handleRowField(row.id, "peti", e.target.value)}
                          className="border p-1 rounded w-full text-right"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleRowField(row.id, "remarks", e.target.value)}
                          className="border p-1 rounded w-full"
                        />
                      </td>

                      {sizeColumns.map((s) => {
                        const enabled = Object.prototype.hasOwnProperty.call(row.sizeQty || {}, s)
                        return (
                          <td key={s} className="border p-1">
                            <div className={`${enabled ? "" : "opacity-60"}`}>
                              <input
                                type="text"
                                value={row.sizeQty[s] || ""}
                                onChange={(e) => handleSizeQtyChange(row.id, s, e.target.value)}
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right mb-1 ${
                                  enabled ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                placeholder="Qty"
                              />
                              <input
                                type="text"
                                value={row.sizeRate[s] || ""}
                                onChange={(e) => handleSizeRateChange(row.id, s, e.target.value)}
                                disabled={!enabled}
                                className={`border p-1 rounded w-full text-right ${
                                  enabled ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                placeholder="Rate"
                                title="Per-size rate (editable)"
                              />
                            </div>
                          </td>
                        )
                      })}

                      <td className="border p-1 text-right pr-2 font-medium">{pcs}</td>
                      <td className="border p-1 text-center">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
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
              <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Party</h3>
            <input
              type="text"
              placeholder="Search party name / serial / GST..."
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
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
                  {filteredParties.map((p, i) => (
                    <tr key={`${p.serialNumber}-${i}`}>
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
                  {filteredParties.length === 0 && (
                    <tr>
                      <td className="border p-4 text-center text-gray-500" colSpan={4}>
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5">
            <h3 className="text-xl font-bold text-center mb-1">
              {currentRowId ? "Select Art(s) for Row" : "Select Art(s)"}
            </h3>

            <input
              type="text"
              placeholder="Search by Art No / Name"
              value={artSearch}
              onChange={(e) => setArtSearch(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2 w-12">
                      <input
                        type="checkbox"
                        checked={selectedArts.size === filteredArts.length && filteredArts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedArts(new Set(filteredArts.map((a) => a.serialNumber)))
                          else setSelectedArts(new Set())
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
                            checked={selectedArts.has(a.serialNumber)}
                            onChange={() => toggleArtSelection(a.serialNumber)}
                          />
                        </td>
                        <td className="border p-2">{a.serialNumber}</td>
                        <td className="border p-2">{a.artNo}</td>
                        <td className="border p-2">{a.artName}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() =>
                              currentRowId ? selectArtForCurrentRow(a) : toggleArtSelection(a.serialNumber)
                            }
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            {currentRowId ? "Select" : selectedArts.has(a.serialNumber) ? "Unselect" : "Select"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={addSelectedArts}
                className="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Selected ({selectedArts.size})
              </button>
              <button
                onClick={() => {
                  setShowArtModal(false)
                  setCurrentRowId(null)
                  setSelectedArts(new Set())
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
                      <td className="border p-2">{sh.shadeCode}</td>
                      <td className="border p-2">{sh.shadeName}</td>
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">Sale Order List</h3>

            <input
              placeholder="Search by Order No or Party"
              className="border p-2 rounded w-full mb-3"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />

            <div className="overflow-auto max-h-[70vh] mt-4">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Order No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((so: any, i: number) => (
                    <tr key={so.id}>
                      <td className="border p-2 text-center">{i + 1}</td>
                      <td className="border p-2">{so.orderNo}</td>
                      <td className="border p-2">{so.dated}</td>
                      <td className="border p-2">{so.partyName}</td>
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
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td className="border p-4 text-center text-gray-500" colSpan={5}>
                        No records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
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
    </Dashboard>
  )
}

export default SaleOrder

