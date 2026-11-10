"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import Dashboard from "../Dashboard"
import Swal from "sweetalert2"
import api from "../../api/axiosInstance"

interface ProductionRow {
  id: number
  cardNo: string
  artNo: string
  shade: string
  pcs: string
  originalPcs: string
  weightage: string
  rate: string
  amount: string
  remarks: string
  isSelected: boolean
}

interface ProcessFromArt {
  processName: string
  rate: string
}

interface ArtDetail {
  serialNumber: string
  artNo: string
  artName: string
  processes: ProcessFromArt[]
}

interface AvailableCuttingLot {
  key: string
  cardNo: string
  artNo: string
  originalPcs: string
  remainingPcs: number
  rate: string
  selected: boolean
  selectionOrder: number | null
}

interface CuttingEntry {
  serialNo: string
  lotRows: {
    cutLotNo: string
    artNo: string
    pcs: string
  }[]
}

// --- DATE FORMATTER: always DD/MM/YYYY (safe for "YYYY-MM-DD") ---
const formatDateDDMMYYYY = (value: any) => {
  if (!value) return "-"
  const s = String(value)

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-")
    return `${d}/${m}/${y}`
  }

  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return "-"
  const dd = String(dt.getDate()).padStart(2, "0")
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const yyyy = dt.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const ProductionReceipt: React.FC = () => {
  const LIST_PAGE_SIZE = 20
  const navigate = useNavigate()

  const [rows, setRows] = useState<ProductionRow[]>([])
  const [randomEntry, setRandomEntry] = useState(false)

  const [employeeList, setEmployeeList] = useState<any[]>([])
  const [employeeName, setEmployeeName] = useState<string>("")
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [employeeSearchText, setEmployeeSearchText] = useState("")

  const [processList, setProcessList] = useState<any[]>([])
  const [processName, setProcessName] = useState<string>("")
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processSearchText, setProcessSearchText] = useState("")

  const [voucherNo, setVoucherNo] = useState("")
  const [dated, setDated] = useState("")

  const [showList, setShowList] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [listPage, setListPage] = useState(0)
  const [listTotalPages, setListTotalPages] = useState(0)
  const [listTotalElements, setListTotalElements] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const skipListSearchRef = useRef(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [savedRecords, setSavedRecords] = useState<any[]>([])

  const [artList, setArtList] = useState<ArtDetail[]>([])
  const [cuttingEntries, setCuttingEntries] = useState<CuttingEntry[]>([])

  const [cuttingLotSearchText, setCuttingLotSearchText] = useState("")
  const [availableLots, setAvailableLots] = useState<AvailableCuttingLot[]>([])
  const [showCuttingLotModal, setShowCuttingLotModal] = useState(false)
  const [lotLoading, setLotLoading] = useState(false)

  const [isSaving, setIsSaving] = useState(false)

  const [isInitLoading, setIsInitLoading] = useState(false)

  // Lazy-load caches: prevent duplicate requests and avoid loading master data on page open.
  const employeesRequestRef = useRef<Promise<any[]> | null>(null)
  const processesRequestRef = useRef<Promise<any[]> | null>(null)
  const artsRequestRef = useRef<Promise<ArtDetail[]> | null>(null)
  const cuttingRequestRef = useRef<Promise<CuttingEntry[]> | null>(null)
  const employeesLoadedRef = useRef(false)
  const processesLoadedRef = useRef(false)
  const artsLoadedRef = useRef(false)
  const cuttingLoadedRef = useRef(false)

  const createEmptyRow = useCallback(
    (id: number): ProductionRow => ({
      id,
      cardNo: "",
      artNo: "",
      shade: "",
      pcs: "",
      originalPcs: "",
      weightage: "",
      rate: "",
      amount: "0.00",
      remarks: "",
      isSelected: false,
    }),
    [],
  )

  // --------- LOADERS (return data too, so we can use immediately) ---------
  const loadEmployees = async () => {
    if (employeesLoadedRef.current) return employeeList
    if (employeesRequestRef.current) return employeesRequestRef.current
    employeesRequestRef.current = api.get("/employees").then(({ data }) => {
      const records = Array.isArray(data) ? data : []
      setEmployeeList(records)
      employeesLoadedRef.current = true
      return records
    }).finally(() => { employeesRequestRef.current = null })
    return employeesRequestRef.current
  }

  const loadProcesses = async () => {
    if (processesLoadedRef.current) return processList
    if (processesRequestRef.current) return processesRequestRef.current
    processesRequestRef.current = api.get("/process/list").then(({ data }) => {
      const records = Array.isArray(data) ? data : []
      setProcessList(records)
      processesLoadedRef.current = true
      return records
    }).finally(() => { processesRequestRef.current = null })
    return processesRequestRef.current
  }

  const loadArts = async () => {
    if (artsLoadedRef.current) return artList
    if (artsRequestRef.current) return artsRequestRef.current

    artsRequestRef.current = api.get("/production-receipt/art-details")
      .then(({ data }) => {
        const records = Array.isArray(data) ? data : []
        setArtList(records)
        artsLoadedRef.current = true
        return records as ArtDetail[]
      })
      .finally(() => { artsRequestRef.current = null })

    return artsRequestRef.current
  }

    const loadCuttingEntries = async () => {
    if (cuttingLoadedRef.current) return cuttingEntries
    if (cuttingRequestRef.current) return cuttingRequestRef.current
    cuttingRequestRef.current = api.get("/cutting-entries").then(({ data }) => {
      const records = Array.isArray(data) ? data : []
      setCuttingEntries(records)
      cuttingLoadedRef.current = true
      return records as CuttingEntry[]
    }).finally(() => { cuttingRequestRef.current = null })
    return cuttingRequestRef.current
  }

  const loadReceiptPage = async (page: number, search: string) => {
    try {
      setListLoading(true)
      const { data } = await api.get<any>("/production-receipt/paged", {
        params: { page, size: LIST_PAGE_SIZE, search: search.trim() || undefined },
      })
      const records = Array.isArray(data?.content) ? data.content : []
      setSavedRecords(records)
      setListPage(data?.page ?? page)
      setListTotalPages(data?.totalPages ?? 0)
      setListTotalElements(data?.totalElements ?? 0)
    } catch (err) {
      console.error("Failed to load production receipt list:", err)
      setSavedRecords([])
      setListPage(0)
      setListTotalPages(0)
      setListTotalElements(0)
      Swal.fire("Error", "Failed to load production receipt list", "error")
    } finally {
      setListLoading(false)
    }
  }

  const loadConsumptionSummary = async (process: string, excludeReceiptId?: number | null) => {
    const { data } = await api.get<any[]>("/production-receipt/consumption", {
      params: { processName: process, excludeReceiptId: excludeReceiptId ?? undefined },
    })
    return Array.isArray(data) ? data : []
  }

  // No master-data API calls on initial page render.
  const ensureArtsLoaded = async () => {
    try { return await loadArts() }
    catch (err) { console.error("ensureArtsLoaded failed:", err); throw err }
  }

  const ensureCuttingLoaded = async () => {
    try { return await loadCuttingEntries() }
    catch (err) { console.error("ensureCuttingLoaded failed:", err); throw err }
  }

  // helper: match aggregated process consumption to a cutting lot
  const computeConsumed = useCallback(
    (records: any[], cardNo: string, artNo: string) => {
      const cardTrim = (cardNo || "").toString().trim().toLowerCase()
      const artTrim = (artNo || "").toString().trim().toLowerCase()

      return records.reduce((total, row) => {
        const matches =
          (row.cardNo || "").toString().trim().toLowerCase() === cardTrim &&
          (row.artNo || "").toString().trim().toLowerCase() === artTrim
        return matches ? total + (Number.parseFloat(row.consumedPcs) || 0) : total
      }, 0)
    },
    [],
  )

  const handleProcessSelect = (selectedProcess: any) => {
    setProcessName(selectedProcess.processName || "")
    setShowProcessModal(false)
    setCuttingLotSearchText("")
    setAvailableLots([])
  }

  const openCuttingLotModal = async () => {
    if (!processName) {
      Swal.fire("Info", "Please select a process first", "info")
      return
    }

    setLotLoading(true)
    setCuttingLotSearchText("")

    try {
      const currentProcess = processName.trim()
      const [artsToUse, cuttingToUse, consumptionToUse] = await Promise.all([
        ensureArtsLoaded(),
        ensureCuttingLoaded(),
        loadConsumptionSummary(currentProcess, editingId),
      ])

      const artByArtNo = new Map<string, ArtDetail>()
      artsToUse.forEach((art) => {
        const artNoKey = (art.artNo || "").toString().trim().toLowerCase()
        if (artNoKey) artByArtNo.set(artNoKey, art)
      })

      const alreadyInForm = new Set(
        rows
          .filter((row) => row.cardNo && row.artNo)
          .map((row) => `${row.cardNo.trim().toLowerCase()}__${row.artNo.trim().toLowerCase()}`),
      )

      const lots: AvailableCuttingLot[] = []
      const seenLotKeys = new Set<string>()

      for (const entry of cuttingToUse) {
        for (const lotRow of entry.lotRows || []) {
          const lotArtNo = (lotRow.artNo || "").toString().trim()
          const lotNo = (lotRow.cutLotNo || "").toString().trim()
          if (!lotArtNo || !lotNo) continue

          // A cutting lot number + Art number identifies one logical lot.
          // Ignore duplicate source rows so one checkbox represents one lot.
          const key = `${lotNo.toLowerCase()}__${lotArtNo.toLowerCase()}`
          if (seenLotKeys.has(key) || alreadyInForm.has(key)) continue
          seenLotKeys.add(key)

          const art = artByArtNo.get(lotArtNo.toLowerCase())
          if (!art) continue

          const processDetail = (art.processes || []).find(
            (item) => (item.processName || "").toString().trim().toLowerCase() === currentProcess.toLowerCase(),
          )
          if (!processDetail) continue

          const originalPcs = Number.parseFloat(lotRow.pcs) || 0
          const consumedPcs = computeConsumed(consumptionToUse, lotNo, lotArtNo)
          const remainingPcs = Math.max(0, originalPcs - consumedPcs)
          if (remainingPcs <= 0) continue

          lots.push({
            key,
            cardNo: lotNo,
            artNo: lotArtNo,
            originalPcs: String(lotRow.pcs || ""),
            remainingPcs,
            rate: processDetail.rate || "",
            selected: false,
            selectionOrder: null,
          })
        }
      }

      setAvailableLots(lots)
      setShowCuttingLotModal(true)
    } catch (err) {
      console.error("Failed to load cutting lots:", err)
      Swal.fire("Error", "Failed to load available cutting lots", "error")
    } finally {
      setLotLoading(false)
    }
  }

  const toggleAvailableLot = (key: string, selected: boolean) => {
    setAvailableLots((previous) => {
      const nextOrder = previous.reduce(
        (max, lot) => Math.max(max, lot.selectionOrder || 0),
        0,
      ) + 1

      const updated = previous.map((lot) => {
        if (lot.key !== key) return lot
        return selected
          ? { ...lot, selected: true, selectionOrder: nextOrder }
          : { ...lot, selected: false, selectionOrder: null }
      })

      const selectedInOrder = updated
        .filter((lot) => lot.selected)
        .sort((a, b) => (a.selectionOrder || 0) - (b.selectionOrder || 0))
      const normalizedOrder = new Map(
        selectedInOrder.map((lot, index) => [lot.key, index + 1]),
      )

      return updated.map((lot) =>
        lot.selected
          ? { ...lot, selectionOrder: normalizedOrder.get(lot.key) || null }
          : lot,
      )
    })
  }

  const moveAvailableLot = (key: string, direction: -1 | 1) => {
    setAvailableLots((previous) => {
      const selectedLots = previous
        .filter((lot) => lot.selected)
        .sort((a, b) => (a.selectionOrder || 0) - (b.selectionOrder || 0))
      const currentIndex = selectedLots.findIndex((lot) => lot.key === key)
      const targetIndex = currentIndex + direction

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= selectedLots.length) {
        return previous
      }

      const reordered = [...selectedLots]
      ;[reordered[currentIndex], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[currentIndex],
      ]

      const orderByKey = new Map(
        reordered.map((lot, index) => [lot.key, index + 1]),
      )

      return previous.map((lot) =>
        lot.selected
          ? { ...lot, selectionOrder: orderByKey.get(lot.key) || null }
          : lot,
      )
    })
  }

  const addSelectedLotsToReceipt = () => {
    const selectedLots = availableLots
      .filter((lot) => lot.selected)
      .sort((a, b) => (a.selectionOrder || 0) - (b.selectionOrder || 0))
    if (selectedLots.length === 0) {
      Swal.fire("Info", "Please select at least one cutting lot", "info")
      return
    }

    const newRows: ProductionRow[] = selectedLots.map((lot, index) => {
      const rateValue = Number.parseFloat(lot.rate) || 0
      return {
        id: Date.now() + index,
        cardNo: lot.cardNo,
        artNo: lot.artNo,
        shade: "",
        pcs: String(lot.remainingPcs),
        originalPcs: lot.originalPcs,
        weightage: "",
        rate: lot.rate,
        amount: (lot.remainingPcs * rateValue).toFixed(2),
        remarks: "",
        isSelected: false,
      }
    })

    setRows((previous) => [...newRows, ...previous])
    setAvailableLots((previous) => previous.filter((lot) => !lot.selected))
    setShowCuttingLotModal(false)
  }

    const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow(Date.now() + prev.length)])
  }, [createEmptyRow])

  useEffect(() => {
    if (rows.length === 0) addRow()
  }, [addRow, rows.length])

  const handleChange = (id: number, field: keyof ProductionRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updatedRow: ProductionRow = { ...r, [field]: value } as ProductionRow

        if (field === "pcs") updatedRow.isSelected = true

        if (field === "pcs" || field === "rate") {
          const pcs = Number.parseFloat(field === "pcs" ? value : updatedRow.pcs) || 0
          const rate = Number.parseFloat(field === "rate" ? value : updatedRow.rate) || 0
          updatedRow.amount = (pcs * rate).toFixed(2)
        }

        return updatedRow
      }),
    )
  }

  const handleRowSelection = (id: number, selected: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isSelected: selected } : r)))
  }

  const openEmployeeModal = async () => {
    if (!processName) {
      Swal.fire("Info", "Please select a process first", "info")
      return
    }
    setIsInitLoading(true)
    try {
      await loadEmployees()
      setEmployeeSearchText("")
      setShowEmployeeModal(true)
    } catch (err) {
      console.error("Failed to load employees:", err)
      Swal.fire("Error", "Failed to load employees", "error")
    } finally {
      setIsInitLoading(false)
    }
  }

  const selectEmployee = (employee: any) => {
    setEmployeeName(employee.name || employee.employeeName)
    setShowEmployeeModal(false)
  }

  const openProcessModal = async () => {
    setIsInitLoading(true)
    try {
      await loadProcesses()
      setProcessSearchText("")
      setShowProcessModal(true)
    } catch (err) {
      console.error("Failed to load processes:", err)
      Swal.fire("Error", "Failed to load processes", "error")
    } finally {
      setIsInitLoading(false)
    }
  }

  const filteredEmployeesForModal = employeeList.filter((e) => {
    const assignedProcesses = [
      ...(Array.isArray(e.processes) ? e.processes : []),
      ...(e.process ? [e.process] : []),
      ...(e.processName ? [{ processName: e.processName }] : []),
    ]
    const matchesProcess = assignedProcesses.some((assigned: any) =>
      (assigned?.processName || "").toString().trim().toLowerCase() === processName.trim().toLowerCase(),
    )
    const matchesSearch = (e.name || e.employeeName || "")
      .toString()
      .toLowerCase()
      .includes(employeeSearchText.toLowerCase())
    return matchesProcess && matchesSearch
  })

  const filteredProcesses = processList.filter((p) =>
    (p.processName || "").toLowerCase().includes(processSearchText.toLowerCase()),
  )

  const handleSave = async () => {
    if (isSaving) return

    const selectedRows = rows.filter((r) => r.isSelected)

    if (selectedRows.length === 0) {
      Swal.fire("Error", "Please select at least one row to save!", "error")
      return
    }

    if (!dated || !employeeName || !processName) {
      Swal.fire("Error", "Please fill all required fields (Date, Employee, Process)!", "error")
      return
    }

    let latestRecords: any[]
    try {
      latestRecords = await loadConsumptionSummary(processName, editingId)
    } catch (err) {
      console.error("Failed to load production receipt consumption:", err)
      Swal.fire("Error", "Failed to validate consumed production quantities", "error")
      return
    }

    for (const r of selectedRows) {
      if (r.originalPcs !== "") {
        const original = Number.parseFloat(r.originalPcs) || 0
        const alreadyConsumed = computeConsumed(latestRecords, r.cardNo, r.artNo)
        const remaining = Math.max(0, original - alreadyConsumed)
        const pcs = Number.parseFloat(r.pcs) || 0

        if (pcs > remaining) {
          Swal.fire(
            "Error",
            `Pcs cannot be greater than Remaining Pcs.\nCutting Lot: ${r.cardNo} | Art: ${r.artNo}\nOriginal: ${original}\nAlready Consumed: ${alreadyConsumed}\nRemaining: ${remaining}\nEntered: ${pcs}`,
            "error",
          )
          return
        }
      }
    }

    const autoVoucherNo = voucherNo || `PR-${Date.now()}`

    const payload = {
      voucherNo: autoVoucherNo,
      dated,
      employeeName,
      processName,
      randomEntry,
      rows: selectedRows.map((r) => ({
        cardNo: r.cardNo,
        artNo: r.artNo,
        shade: r.shade,
        pcs: r.pcs,
        originalPcs: r.originalPcs,
        weightage: r.weightage,
        rate: r.rate,
        amount: r.amount,
        remarks: r.remarks,
      })),
    }

    setIsSaving(true)
    try {
      if (editingId) {
        await api.put(`/production-receipt/${editingId}`, payload)
        Swal.fire("Success", `Production receipt updated for ${employeeName}!`, "success")
        setEditingId(null)
      } else {
        await api.post("/production-receipt", payload)
        Swal.fire("Success", `Production receipt saved for ${employeeName}!`, "success")
      }

      setVoucherNo(autoVoucherNo)
      setRows((previous) => previous.filter((row) => !selectedRows.some((saved) => saved.id === row.id)))
      setAvailableLots([])
    } catch (err: any) {
      console.error("Save Error:", err)
      Swal.fire("Error", err.response?.data?.message || "Failed to save record", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    if (isSaving) return
    setRows([])
    setVoucherNo("")
    setDated("")
    setEmployeeName("")
    setProcessName("")
    setRandomEntry(false)
    setEditingId(null)
    setCuttingLotSearchText("")
    setAvailableLots([])
    setShowCuttingLotModal(false)
  }

  const openList = async () => {
    skipListSearchRef.current = searchText.trim() !== ""
    setSearchText("")
    setShowList(true)
    await loadReceiptPage(0, "")
  }

  useEffect(() => {
    if (!showList) return
    if (skipListSearchRef.current) {
      skipListSearchRef.current = false
      return
    }
    const timer = setTimeout(() => {
      void loadReceiptPage(0, searchText)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  const handleEdit = async (id: number) => {
    try {
      const res = await api.get(`/production-receipt/${id}`)
      const receipt = res.data

      setVoucherNo(receipt.voucherNo || "")
      setDated(receipt.dated || "")
      setEmployeeName(receipt.employeeName || "")
      setProcessName(receipt.processName || "")
      setRandomEntry(receipt.randomEntry || false)
      setEditingId(id)

      const mapped = (receipt.rows || []).map((r: any, i: number) => ({
        id: Date.now() + i,
        cardNo: r.cardNo || "",
        artNo: r.artNo || "",
        shade: r.shade || r.Size || "",
        pcs: r.pcs || "",
        originalPcs: r.originalPcs || r.pcs || "",
        weightage: r.weightage || "",
        rate: r.rate || "",
        amount: r.amount || "",
        remarks: r.remarks || "",
        isSelected: true,
      }))
      setRows(mapped)
      setShowList(false)
      setCuttingLotSearchText("")
    } catch (err) {
      console.error("Edit Error:", err)
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
      await api.delete(`/production-receipt/${id}`)
      const targetPage = savedRecords.length === 1 && listPage > 0 ? listPage - 1 : listPage
      await loadReceiptPage(targetPage, searchText)
      Swal.fire("Deleted!", "Record deleted successfully", "success")

      setAvailableLots([])
    } catch (err) {
      console.error("Delete Error:", err)
      Swal.fire("Error", "Delete failed", "error")
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const totalPcsLocal = rows.reduce((sum, r) => sum + (Number.parseFloat(r.pcs) || 0), 0)

    const html = `
      <html>
        <head>
          <title>Production Receipt</title>
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
          <h2>Production Receipt</h2>
          <div class="info">
            <p><b>Voucher:</b> ${voucherNo}</p>
            <p><b>Date:</b> ${formatDateDDMMYYYY(dated)}</p>
            <p><b>Employee:</b> ${employeeName}</p>
            <p><b>Process:</b> ${processName}</p>
          </div>
          <table>
            <thead>
                <tr>
                  <th>Card No</th>
                  <th>Art No</th>
                  <th>Shade</th>
                  <th>Pcs</th>
                  <th>Weightage</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Remarks</th>
                </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>${r.cardNo}</td>
                  <td>${r.artNo}</td>
                  <td>${r.shade}</td>
                  <td>${r.pcs}</td>
                  <td>${r.weightage}</td>
                  <td>${r.rate}</td>
                  <td>${r.amount}</td>
                  <td>${r.remarks}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Pieces: ${totalPcsLocal}</p>
          </div>
          <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // ------- LIST HELPERS (Lot -> Art mapping) -------
  const buildUniqueLotArtPairs = (receiptRows: any[]) => {
    const seen = new Set<string>()
    const pairs: { cardNo: string; artNo: string }[] = []

    ;(receiptRows || []).forEach((r: any) => {
      const cardNo = (r.cardNo || "").toString().trim()
      const artNo = (r.artNo || "").toString().trim()
      if (!cardNo && !artNo) return
      const key = `${cardNo}__${artNo}`
      if (seen.has(key)) return
      seen.add(key)
      pairs.push({ cardNo: cardNo || "-", artNo: artNo || "-" })
    })

    return pairs
  }

  const filteredList = savedRecords

  const totalPcs = rows.reduce((sum, r) => sum + (Number.parseFloat(r.pcs) || 0), 0)
  const selectedPcs = rows
    .filter((r) => r.isSelected)
    .reduce((sum, r) => sum + (Number.parseFloat(r.pcs) || 0), 0)
  const selectedCount = rows.filter((r) => r.isSelected).length

  const displayedRows = useMemo(() => {
    const s = cuttingLotSearchText.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => (r.cardNo || "").toLowerCase().includes(s))
  }, [rows, cuttingLotSearchText])

  return (
    <Dashboard>
      <div className="bg-gray-100 p-6 min-h-screen">
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-bold text-2xl text-center">Production Receipt</h2>

          <div className="gap-4 grid grid-cols-4 mb-4">
            <div>
              <label className="block font-semibold">Dated</label>
              <input
                type="date"
                value={dated}
                onChange={(e) => setDated(e.target.value)}
                className="p-2 border rounded w-full"
              />
            </div>

            <div>
              <label className="block font-semibold">Process</label>
              <input
                type="text"
                value={processName}
                onClick={openProcessModal}
                readOnly
                className="bg-gray-50 hover:bg-gray-100 p-2 border rounded w-full cursor-pointer"
                placeholder={isInitLoading ? "Loading..." : "Click to select process"}
              />
            </div>

            <div>
              <label className="block font-semibold">Employee</label>
              <input
                type="text"
                value={employeeName}
                onClick={openEmployeeModal}
                readOnly
                className="bg-gray-50 hover:bg-gray-100 p-2 border rounded w-full cursor-pointer"
                placeholder="Click to select employee"
              />
            </div>

            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={randomEntry}
                onChange={(e) => setRandomEntry(e.target.checked)}
                className="mr-2"
              />
              <label className="font-semibold">Random Entry</label>
            </div>
          </div>

          <div className="gap-4 grid grid-cols-4 mb-3">
            <div>
              <label className="block font-semibold">Search Cutting Lot No</label>
              <input
                type="text"
                value={cuttingLotSearchText}
                onChange={(e) => setCuttingLotSearchText(e.target.value)}
                className="p-2 border rounded w-full"
                placeholder="Type Cutting Lot No..."
              />
            </div>
            <div className="col-span-3 flex items-end text-sm text-gray-600">
              <span>
                Showing <b>{displayedRows.length}</b> of <b>{rows.length}</b> rows
              </span>
            </div>
          </div>

          <div className="max-h-[350px] overflow-auto">
            <table className="border border-blue-500 w-full min-w-full text-sm">
              <thead className="top-0 sticky bg-gray-200">
                <tr>
                  <th className="p-2 border min-w-[70px]">S No.</th>
                  <th className="p-2 border min-w-[150px]">Cutting Lot No</th>
                  <th className="p-2 border min-w-[100px]">Art No</th>
                  <th className="p-2 border min-w-[80px]">Shade</th>
                  <th className="p-2 border min-w-[80px]">Pcs</th>
                  <th className="p-2 border min-w-[100px]">Weightage</th>
                  <th className="p-2 border min-w-[80px]">Rate</th>
                  <th className="p-2 border min-w-[90px]">Amount</th>
                  <th className="p-2 border min-w-[150px]">Remarks</th>
                  <th className="p-2 border min-w-[60px]">Select</th>
                </tr>
              </thead>

              <tbody>
                {displayedRows.map((row) => {
                  const sequenceIndex = rows.findIndex((item) => item.id === row.id)
                  return (
                  <tr key={row.id}>
                    <td className="p-1 border text-center font-semibold">
                      {sequenceIndex + 1}
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.cardNo}
                        readOnly
                        onClick={openCuttingLotModal}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openCuttingLotModal()
                          }
                        }}
                        disabled={lotLoading}
                        className="p-1 border border-indigo-400 rounded w-full cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:cursor-wait"
                        placeholder={lotLoading ? "Loading cutting lots..." : "Click to select"}
                        title="Click to select a cutting lot"
                      />
                    </td>

                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.artNo}
                        onChange={(e) => handleChange(row.id, "artNo", e.target.value)}
                        className="p-1 border rounded w-full"
                        disabled={row.originalPcs !== ""}
                      />
                    </td>

                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.shade}
                        onChange={(e) => handleChange(row.id, "shade", e.target.value)}
                        className="p-1 border rounded w-full text-center"
                        placeholder="Enter shade"
                      />
                    </td>

                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.pcs}
                        onChange={(e) => handleChange(row.id, "pcs", e.target.value)}
                        className="p-1 border rounded w-full text-center"
                      />
                    </td>

                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.weightage}
                        onChange={(e) => handleChange(row.id, "weightage", e.target.value)}
                        className="p-1 border rounded w-full text-center"
                        placeholder="Weightage"
                      />
                    </td>

                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.rate}
                        onChange={(e) => handleChange(row.id, "rate", e.target.value)}
                        className="p-1 border rounded w-full text-center"
                        placeholder="Rate"
                      />
                    </td>

                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.amount}
                        readOnly
                        className="bg-gray-50 p-1 border rounded w-full text-center"
                      />
                    </td>

                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleChange(row.id, "remarks", e.target.value)}
                        className="p-1 border rounded w-full"
                      />
                    </td>

                    <td className="p-1 border text-center">
                      <input
                        type="checkbox"
                        checked={row.isSelected}
                        onChange={(e) => handleRowSelection(row.id, e.target.checked)}
                        className="mx-auto"
                      />
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 mt-2 p-2 rounded text-gray-600 text-sm">
            <div className="flex justify-between">
              <span>
                Total Pcs: <b className="text-blue-600">{totalPcs}</b>
              </span>
              <span>
                Selected Pcs: <b className="text-green-600">{selectedPcs}</b> ({selectedCount} rows)
              </span>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <div>
              <button
                onClick={addRow}
                disabled={isSaving}
                className={`bg-blue-500 hover:bg-blue-600 mr-2 px-4 py-2 rounded text-white ${
                  isSaving ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                Add
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`bg-green-500 hover:bg-green-600 mr-2 px-4 py-2 rounded text-white ${
                  isSaving ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isSaving ? "Saving..." : editingId ? "Update" : "Save"}
              </button>

              <button
                onClick={resetForm}
                disabled={isSaving}
                className={`bg-orange-500 hover:bg-orange-600 mr-2 px-4 py-2 rounded text-white ${
                  isSaving ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                Cancel
              </button>

              <button
                onClick={openList}
                className="bg-yellow-500 hover:bg-yellow-600 mr-2 px-4 py-2 rounded text-white"
              >
                List
              </button>

              <button
                onClick={() => {
                  if (editingId) handleDelete(editingId)
                  else Swal.fire("Info", "No record selected to delete", "info")
                }}
                className="bg-red-500 hover:bg-red-600 mr-2 px-4 py-2 rounded text-white"
              >
                Delete
              </button>

              <button
                onClick={handlePrint}
                className="bg-gray-600 hover:bg-gray-700 mr-2 px-4 py-2 rounded text-white"
              >
                Print
              </button>

              <button
                onClick={() => navigate(-1)}
                className="bg-gray-400 hover:bg-gray-500 mr-2 px-4 py-2 rounded text-white"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cutting Lot Selection Modal */}
      {showCuttingLotModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-lg p-5 rounded-lg w-full max-w-5xl max-h-[90vh]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-xl">Select Cutting Lots - {processName}</h3>
              <span className="text-sm text-gray-600">
                {availableLots.filter((lot) => lot.selected).length} selected / {availableLots.length} available
              </span>
            </div>

            <input
              type="text"
              value={cuttingLotSearchText}
              onChange={(event) => setCuttingLotSearchText(event.target.value)}
              placeholder="Search Cutting Lot No or Art No"
              className="mb-3 p-2 border rounded w-full"
              autoFocus
            />

            <div className="flex-1 overflow-auto border rounded">
              <table className="w-full text-sm border-collapse">
                <thead className="top-0 sticky bg-gray-200">
                  <tr>
                    <th className="p-2 border">Sequence</th>
                    <th className="p-2 border">Select</th>
                    <th className="p-2 border">Cutting Lot No</th>
                    <th className="p-2 border">Art No</th>
                    <th className="p-2 border">Original Pcs</th>
                    <th className="p-2 border">Remaining Pcs</th>
                    <th className="p-2 border">Process Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[...availableLots]
                    .sort((a, b) => {
                      if (a.selected && b.selected) return (a.selectionOrder || 0) - (b.selectionOrder || 0)
                      if (a.selected) return -1
                      if (b.selected) return 1
                      return 0
                    })
                    .filter((lot) => {
                      const search = cuttingLotSearchText.trim().toLowerCase()
                      return !search || lot.cardNo.toLowerCase().includes(search) || lot.artNo.toLowerCase().includes(search)
                    })
                    .map((lot) => (
                      <tr key={lot.key} className={lot.selected ? "bg-blue-50" : "hover:bg-gray-50"}>
                        <td className="p-2 border text-center">
                          {lot.selected ? (
                            <div className="flex items-center justify-center gap-1">
                              <b>{lot.selectionOrder}</b>
                              <button
                                type="button"
                                onClick={() => moveAvailableLot(lot.key, -1)}
                                disabled={lot.selectionOrder === 1}
                                className="bg-gray-200 hover:bg-gray-300 disabled:opacity-30 px-2 rounded"
                                title="Move selected lot up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveAvailableLot(lot.key, 1)}
                                disabled={lot.selectionOrder === availableLots.filter((item) => item.selected).length}
                                className="bg-gray-200 hover:bg-gray-300 disabled:opacity-30 px-2 rounded"
                                title="Move selected lot down"
                              >
                                ↓
                              </button>
                            </div>
                          ) : "-"}
                        </td>
                        <td className="p-2 border text-center">
                          <input
                            type="checkbox"
                            checked={lot.selected}
                            onChange={(event) => toggleAvailableLot(lot.key, event.target.checked)}
                          />
                        </td>
                        <td className="p-2 border">{lot.cardNo}</td>
                        <td className="p-2 border">{lot.artNo}</td>
                        <td className="p-2 border text-right">{lot.originalPcs}</td>
                        <td className="p-2 border text-right font-semibold">{lot.remainingPcs}</td>
                        <td className="p-2 border text-right">{lot.rate || "-"}</td>
                      </tr>
                    ))}
                  {availableLots.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-5 text-center text-gray-500">
                        No available cutting lots for this process.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected cutting lots with editable sequence, matching the Sale Order selection list. */}
            <div className="mt-3 border-t pt-3">
              <h4 className="font-semibold mb-2 text-sm text-center">
                Selected Cutting Lots (Sequence)
              </h4>
              <div className="max-h-36 overflow-auto border rounded">
                {availableLots
                  .filter((lot) => lot.selected)
                  .sort((a, b) => (a.selectionOrder || 0) - (b.selectionOrder || 0))
                  .length === 0 ? (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      No cutting lots selected
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border p-1 w-10">#</th>
                          <th className="border p-1">Cutting Lot No</th>
                          <th className="border p-1">Art No</th>
                          <th className="border p-1">Remaining Pcs</th>
                          <th className="border p-1 w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableLots
                          .filter((lot) => lot.selected)
                          .sort((a, b) => (a.selectionOrder || 0) - (b.selectionOrder || 0))
                          .map((lot, index, selectedLots) => (
                            <tr key={lot.key}>
                              <td className="border p-1 text-center">{index + 1}</td>
                              <td className="border p-1 text-center">{lot.cardNo}</td>
                              <td className="border p-1 text-center">{lot.artNo}</td>
                              <td className="border p-1 text-center">{lot.remainingPcs}</td>
                              <td className="border p-1 text-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => moveAvailableLot(lot.key, -1)}
                                  disabled={index === 0}
                                  className="px-1 py-[1px] text-xs bg-gray-200 rounded disabled:opacity-30"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveAvailableLot(lot.key, 1)}
                                  disabled={index === selectedLots.length - 1}
                                  className="px-1 py-[1px] text-xs bg-gray-200 rounded disabled:opacity-30"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleAvailableLot(lot.key, false)}
                                  className="px-1 py-[1px] text-xs bg-red-400 text-white rounded"
                                  title="Remove from selection"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 mt-4">
              <span className="text-sm text-gray-600">
                Only selected cutting lots will be added to the Production Receipt in the displayed sequence.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCuttingLotModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={addSelectedLotsToReceipt}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
                >
                  Add Selected Lots
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Selection Modal */}
      {showEmployeeModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white shadow-lg p-5 rounded-lg w-full max-w-2xl">
            <h3 className="mb-4 font-bold text-xl text-center">Select Employee for {processName}</h3>

            <input
              type="text"
              placeholder="Search employee name..."
              value={employeeSearchText}
              onChange={(e) => setEmployeeSearchText(e.target.value)}
              className="mb-3 p-2 border rounded w-full"
            />

            <div className="max-h-96 overflow-auto">
              <table className="border w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-2 border">Employee Name</th>
                    <th className="p-2 border">Code</th>
                    <th className="p-2 border">Process</th>
                    <th className="p-2 border">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployeesForModal.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 border text-gray-500 text-center">
                        No employees found for {processName} process
                      </td>
                    </tr>
                  ) : (
                    filteredEmployeesForModal.map((e) => (
                      <tr key={e.id}>
                        <td className="p-2 border">{e.name || e.employeeName}</td>
                        <td className="p-2 border">{e.code || e.employeeCode}</td>
                        <td className="p-2 border">
                          {[
                            ...(Array.isArray(e.processes) ? e.processes : []),
                            ...(e.process ? [e.process] : []),
                          ]
                            .map((assigned: any) => assigned?.processName)
                            .filter(Boolean)
                            .filter((name: string, index: number, names: string[]) => names.indexOf(name) === index)
                            .join(", ") || e.processName || "-"}
                        </td>
                        <td className="p-2 border text-center">
                          <button
                            onClick={() => selectEmployee(e)}
                            className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white"
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

            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="bg-gray-300 hover:bg-gray-400 px-5 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Selection Modal */}
      {showProcessModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white shadow-lg p-5 rounded-lg w-full max-w-2xl">
            <h3 className="mb-4 font-bold text-xl text-center">Select Process</h3>

            <input
              type="text"
              placeholder="Search process name..."
              value={processSearchText}
              onChange={(e) => setProcessSearchText(e.target.value)}
              className="mb-3 p-2 border rounded w-full"
            />

            <div className="max-h-96 overflow-auto">
              <table className="border w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-2 border">Process Name</th>
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 border text-gray-500 text-center">
                        {isInitLoading ? "Loading processes..." : "No processes found"}
                      </td>
                    </tr>
                  ) : (
                    filteredProcesses.map((p) => (
                      <tr key={p.serialNo}>
                        <td className="p-2 border">{p.processName}</td>
                        <td className="p-2 border">{p.category}</td>
                        <td className="p-2 border text-center">
                          <button
                            onClick={() => handleProcessSelect(p)}
                            className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white"
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

            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowProcessModal(false)}
                className="bg-gray-300 hover:bg-gray-400 px-5 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View Modal (UPDATED) */}
      {showList && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="flex flex-col bg-white shadow-lg p-5 rounded-lg w-full max-w-6xl max-h-[90vh]">
            <h3 className="mb-4 font-bold text-xl text-center">Production Receipt List</h3>

            <input
              placeholder="Search by Employee / Art No / Cutting Lot No"
              className="mb-3 p-2 border rounded w-full"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="flex-1 overflow-auto">
              <table className="border w-full text-sm">
                <thead className="top-0 sticky bg-gray-200">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Date</th>

                    {/* NEW */}
                    <th className="p-2 border">Cutting Lot No</th>

                    {/* UPDATED (Art will align with cutting lot) */}
                    <th className="p-2 border">Art No</th>

                    <th className="p-2 border">Employee</th>
                    <th className="p-2 border">Process</th>
                    <th className="p-2 border">Total Pcs</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {listLoading ? (
                    <tr>
                      <td colSpan={8} className="p-4 border text-gray-500 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 border text-gray-500 text-center">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d, i) => {
                      const pairRows = String(d.lotArtPairs || "")
                        .split("\n")
                        .filter(Boolean)
                        .map((pair: string) => {
                          const [cardNo, artNo] = pair.split("\t")
                          return { cardNo, artNo }
                        })
                      const pairs = buildUniqueLotArtPairs(pairRows)

                      const cuttingLotLines = pairs.map((p) => p.cardNo).join("\n")
                      const artNoLines = pairs.map((p) => p.artNo).join("\n")

                      return (
                        <tr key={d.id}>
                          <td className="p-2 border text-center">{listPage * LIST_PAGE_SIZE + i + 1}</td>
                          <td className="p-2 border">{formatDateDDMMYYYY(d.dated)}</td>

                          {/* NEW */}
                          <td className="p-2 border align-top whitespace-pre-line">{cuttingLotLines || "-"}</td>

                          {/* UPDATED */}
                          <td className="p-2 border align-top whitespace-pre-line">{artNoLines || "-"}</td>

                          <td className="p-2 border">{d.employeeName}</td>
                          <td className="p-2 border">{d.processName}</td>
                          <td className="p-2 border text-right">{d.totalPcs ?? 0}</td>
                          <td className="p-2 border text-center">
                            <button
                              onClick={() => handleEdit(d.id)}
                              className="bg-blue-500 hover:bg-blue-600 mr-1 px-2 py-1 rounded text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-white"
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

            <div className="flex items-center justify-between gap-3 mt-5 text-sm">
              <span>
                Showing {listTotalElements === 0 ? 0 : listPage * LIST_PAGE_SIZE + 1}–
                {Math.min((listPage + 1) * LIST_PAGE_SIZE, listTotalElements)} of {listTotalElements}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadReceiptPage(0, searchText)}
                  disabled={listLoading || listPage === 0}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  First
                </button>
                <button
                  onClick={() => loadReceiptPage(listPage - 1, searchText)}
                  disabled={listLoading || listPage === 0}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span>Page {listTotalPages === 0 ? 0 : listPage + 1} / {listTotalPages}</span>
                <button
                  onClick={() => loadReceiptPage(listPage + 1, searchText)}
                  disabled={listLoading || listPage >= listTotalPages - 1}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  onClick={() => loadReceiptPage(listTotalPages - 1, searchText)}
                  disabled={listLoading || listPage >= listTotalPages - 1}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Last
                </button>
              </div>
              <button
                onClick={() => setShowList(false)}
                className="bg-gray-300 hover:bg-gray-400 px-5 py-2 rounded"
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

export default ProductionReceipt