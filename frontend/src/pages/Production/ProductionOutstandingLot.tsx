"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Dashboard from "../Dashboard"
import api from "../../api/axiosInstance"
import Swal from "sweetalert2"

interface CuttingLot {
  cardNo: string
  artNo: string
  originalPcs: number
}

interface ProductionDetail {
  id: string
  dated: string
  voucherNo: string
  cardNo: string
  processName: string
  artNo: string
  employeeName: string
  pcs: number
  rate: number
  amount: number
}

interface PendingRow {
  cardNo: string
  processName: string
  artNo: string
  originalPcs: number
  producedPcs: number
  pendingPcs: number
}

interface SummaryRow {
  cardNo: string
  processName: string
  artNo: string
  employeeName: string
  producedPcs: number
  rate: number
  amount: number
  entries: number
  lastDate: string
}

type ReportMode = "pending" | "summary"

const clean = (value: unknown): string => String(value ?? "").trim()
const keyOf = (...values: string[]) => values.map((value) => value.toLocaleLowerCase()).join("|||")
const numberOf = (value: unknown): number => {
  const parsed = Number.parseFloat(String(value ?? "0"))
  return Number.isFinite(parsed) ? parsed : 0
}
const sortText = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })

const formatDate = (value: string) => {
  if (!value) return "-"
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN")
}

const ProductionOutstandingLot: React.FC = () => {
  const [cuttingLots, setCuttingLots] = useState<CuttingLot[]>([])
  const [productionDetails, setProductionDetails] = useState<ProductionDetail[]>([])
  const [masterProcessesByArt, setMasterProcessesByArt] = useState<Record<string, string[]>>({})
  const [masterProcessNames, setMasterProcessNames] = useState<string[]>([])
  const [masterEmployeeNames, setMasterEmployeeNames] = useState<string[]>([])
  const [masterArts, setMasterArts] = useState<string[]>([])
  const [masterLoading, setMasterLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const [selectedLots, setSelectedLots] = useState<string[]>([])
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([])
  const [selectedArts, setSelectedArts] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [lotSearch, setLotSearch] = useState("")
  const [processSearch, setProcessSearch] = useState("")
  const [artSearch, setArtSearch] = useState("")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [mode, setMode] = useState<ReportMode>("pending")
  const [searchText, setSearchText] = useState("")

  // Load master data from the exact endpoints already used by Production Receipt.
  // Each request is handled independently so one failed endpoint cannot blank all filters.
  useEffect(() => {
    let active = true

    const loadMasterData = async () => {
      setMasterLoading(true)
      const failedSources: string[] = []
      const loadArray = async (url: string): Promise<any[]> => {
        try {
          const response = await api.get(url)
          return Array.isArray(response.data) ? response.data : []
        } catch (error) {
          failedSources.push(url)
          console.error(`Failed to load ${url}:`, error)
          return []
        }
      }

      const [cuttingRecords, processRecords, artRecords, employeeRecords] = await Promise.all([
        loadArray("/cutting-entries"),
        loadArray("/process/list"),
        loadArray("/production-receipt/art-details"),
        loadArray("/employees"),
      ])

      if (!active) return

      const lotMap = new Map<string, CuttingLot>()
      cuttingRecords.forEach((entry: any) => {
        const lotRows = Array.isArray(entry?.lotRows) ? entry.lotRows : []
        lotRows.forEach((row: any) => {
          const cardNo = clean(row?.cutLotNo)
          const artNo = clean(row?.artNo)
          if (!cardNo || !artNo) return
          const key = keyOf(cardNo, artNo)
          const existing = lotMap.get(key)
          if (existing) existing.originalPcs += numberOf(row?.pcs)
          else lotMap.set(key, { cardNo, artNo, originalPcs: numberOf(row?.pcs) })
        })
      })

      const processByArt: Record<string, string[]> = {}
      const artNames: string[] = []
      artRecords.forEach((art: any) => {
        const artNo = clean(art?.artNo)
        if (!artNo) return
        artNames.push(artNo)
        processByArt[artNo.toLocaleLowerCase()] = Array.from(new Set(
          (Array.isArray(art?.processes) ? art.processes : [])
            .map((item: any) => clean(item?.processName))
            .filter(Boolean),
        ))
      })

      const processNames = processRecords
        .map((item: any) => clean(item?.processName || item?.name))
        .filter(Boolean)
      // Art details are the authoritative source for process-per-art associations.
      // Include them in the global list as a fallback if /process/list has another shape.
      Object.values(processByArt).forEach((names) => processNames.push(...names))

      const employeeNames = employeeRecords
        .map((item: any) => clean(item?.employeeName || item?.name || item?.employee?.name))
        .filter(Boolean)

      setCuttingLots(Array.from(lotMap.values()).sort((a, b) => sortText(a.cardNo, b.cardNo) || sortText(a.artNo, b.artNo)))
      setMasterProcessesByArt(processByArt)
      setMasterProcessNames(Array.from(new Set(processNames)).sort(sortText))
      setMasterEmployeeNames(Array.from(new Set(employeeNames)).sort(sortText))
      setMasterArts(Array.from(new Set([...artNames, ...Array.from(lotMap.values()).map((row) => row.artNo)])).sort(sortText))
      setMasterLoading(false)

      if (failedSources.length > 0) {
        console.error("Some Production Outstanding filter APIs failed:", failedSources)
        Swal.fire("Warning", "Some filter data could not be loaded. Please refresh the page or check the failed API in the browser console.", "warning")
      }
    }

    loadMasterData().catch((error) => {
      console.error("Failed to load Production Outstanding filter data:", error)
      if (active) {
        setMasterLoading(false)
        Swal.fire("Error", "Failed to load Production filter data. Please refresh and try again.", "error")
      }
    })

    return () => { active = false }
  }, [])

  const loadReportData = useCallback(async (): Promise<boolean> => {
    if (loaded) return true
    setLoading(true)
    try {
      // Both endpoints already exist in the current Production module.
      // Fetch only when the user asks to generate the report.
      const receiptResponse = await api.get("/production-receipt")
      const receiptRecords = Array.isArray(receiptResponse.data) ? receiptResponse.data : []

      const details: ProductionDetail[] = []
      receiptRecords.forEach((receipt: any, receiptIndex: number) => {
        const employeeName = clean(receipt?.employeeName) || "Unknown Employee"
        const processName = clean(receipt?.processName) || "Unknown Process"
        const dated = clean(receipt?.dated)
        const voucherNo = clean(receipt?.voucherNo)
        ;(Array.isArray(receipt?.rows) ? receipt.rows : []).forEach((row: any, rowIndex: number) => {
          const cardNo = clean(row?.cardNo)
          const artNo = clean(row?.artNo)
          if (!cardNo || !artNo) return
          details.push({
            id: `${receipt?.id ?? receiptIndex}-${row?.id ?? rowIndex}`,
            dated,
            voucherNo,
            cardNo,
            processName,
            artNo,
            employeeName,
            pcs: numberOf(row?.pcs),
            rate: numberOf(row?.rate),
            amount: row?.amount !== null && row?.amount !== undefined && clean(row?.amount) !== ""
              ? numberOf(row.amount)
              : numberOf(row?.pcs) * numberOf(row?.rate),
          })
        })
      })

      // Keep the API's art/process master as the authoritative process list.
      // It lets the pending report show processes even when no receipt exists yet.
      const processByArt = new Map<string, string[]>(Object.entries(masterProcessesByArt))

      // Include processes present in saved receipts as a fallback for older arts
      // whose process master is not returned by art-details.
      details.forEach((detail) => {
        const artKey = detail.artNo.toLocaleLowerCase()
        const current = processByArt.get(artKey) || []
        if (!current.some((item) => item.toLocaleLowerCase() === detail.processName.toLocaleLowerCase())) {
          processByArt.set(artKey, [...current, detail.processName])
        }
      })

      // Preserve the normalized cutting-lot baseline and process list for report calculation.
      setProductionDetails(details)
      setMasterProcessesByArt(Object.fromEntries(processByArt))
      setLoaded(true)
      return true
    } catch (error) {
      console.error("Failed to load Production Outstanding data:", error)
      Swal.fire("Error", "Failed to load Production Outstanding data", "error")
      return false
    } finally {
      setLoading(false)
    }
  }, [loaded, masterProcessesByArt])

  const processMap = useMemo(() => {
    const map = new Map<string, string[]>()
    // Processes in the receipt data are always valid production processes.
    productionDetails.forEach((row) => {
      const key = row.artNo.toLocaleLowerCase()
      const values = map.get(key) || []
      if (!values.some((value) => value.toLocaleLowerCase() === row.processName.toLocaleLowerCase())) {
        map.set(key, [...values, row.processName])
      }
    })
    if (masterProcessesByArt) {
      Object.entries(masterProcessesByArt).forEach(([artNo, processes]) => {
        const existing = map.get(artNo) || []
        const merged = [...existing]
        processes.forEach((process) => {
          if (!merged.some((item) => item.toLocaleLowerCase() === process.toLocaleLowerCase())) merged.push(process)
        })
        map.set(artNo, merged)
      })
    }
    return map
  }, [productionDetails, masterProcessesByArt])

  const lotOptions = useMemo(
    () => Array.from(new Set(cuttingLots.map((row) => row.cardNo))).sort(sortText),
    [cuttingLots],
  )

  const artOptions = useMemo(() => {
    const source = selectedLots.length
      ? cuttingLots.filter((row) => selectedLots.includes(row.cardNo))
      : cuttingLots
    return Array.from(new Set([...source.map((row) => row.artNo), ...(!selectedLots.length ? masterArts : [])])).sort(sortText)
  }, [cuttingLots, selectedLots, masterArts])

  const processOptions = useMemo(() => {
    const arts = selectedArts.length ? selectedArts : artOptions
    const values = new Set<string>()
    arts.forEach((artNo) => (processMap.get(artNo.toLocaleLowerCase()) || []).forEach((process) => values.add(process)))
    masterProcessNames.forEach((process) => values.add(process))
    return Array.from(values).sort(sortText)
  }, [artOptions, processMap, selectedArts, masterProcessNames])

  const employeeOptions = useMemo(() => {
    const source = productionDetails.filter((row) =>
      (!selectedLots.length || selectedLots.includes(row.cardNo)) &&
      (!selectedArts.length || selectedArts.includes(row.artNo)) &&
      (!selectedProcesses.length || selectedProcesses.includes(row.processName)),
    )
    const names = source.map((row) => row.employeeName)
    if (!productionDetails.length) names.push(...masterEmployeeNames)
    return Array.from(new Set(names)).sort(sortText)
  }, [productionDetails, selectedLots, selectedArts, selectedProcesses, masterEmployeeNames])

  const pendingRows = useMemo<PendingRow[]>(() => {
    const producedMap = new Map<string, number>()
    productionDetails.forEach((row) => {
      const key = keyOf(row.cardNo, row.processName, row.artNo)
      producedMap.set(key, (producedMap.get(key) || 0) + row.pcs)
    })

    const rows: PendingRow[] = []
    cuttingLots.forEach((lot) => {
      const processes = processMap.get(lot.artNo.toLocaleLowerCase()) || []
      processes.forEach((processName) => {
        const producedPcs = producedMap.get(keyOf(lot.cardNo, processName, lot.artNo)) || 0
        rows.push({
          cardNo: lot.cardNo,
          processName,
          artNo: lot.artNo,
          originalPcs: lot.originalPcs,
          producedPcs,
          pendingPcs: Math.max(0, lot.originalPcs - producedPcs),
        })
      })
    })

    const employeeKeys = selectedEmployees.length
      ? new Set(
          productionDetails
            .filter((detail) => selectedEmployees.includes(detail.employeeName))
            .map((detail) => keyOf(detail.cardNo, detail.processName, detail.artNo)),
        )
      : null

    return rows
      .filter((row) =>
        (!selectedLots.length || selectedLots.includes(row.cardNo)) &&
        (!selectedProcesses.length || selectedProcesses.includes(row.processName)) &&
        (!selectedArts.length || selectedArts.includes(row.artNo)) &&
        (!employeeKeys || employeeKeys.has(keyOf(row.cardNo, row.processName, row.artNo))),
      )
      .filter((row) => row.pendingPcs > 0.000001)
      .sort((a, b) => sortText(a.cardNo, b.cardNo) || sortText(a.processName, b.processName) || sortText(a.artNo, b.artNo))
  }, [cuttingLots, productionDetails, processMap, selectedLots, selectedProcesses, selectedArts, selectedEmployees])

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const map = new Map<string, SummaryRow>()
    productionDetails.forEach((row) => {
      if (
        (selectedLots.length && !selectedLots.includes(row.cardNo)) ||
        (selectedProcesses.length && !selectedProcesses.includes(row.processName)) ||
        (selectedArts.length && !selectedArts.includes(row.artNo)) ||
        (selectedEmployees.length && !selectedEmployees.includes(row.employeeName))
      ) return

      const key = keyOf(row.cardNo, row.processName, row.artNo, row.employeeName)
      const current = map.get(key)
      if (current) {
        current.producedPcs += row.pcs
        current.amount += row.amount
        current.rate = current.producedPcs > 0 ? current.amount / current.producedPcs : 0
        current.entries += 1
        if (row.dated > current.lastDate) current.lastDate = row.dated
      } else {
        map.set(key, {
          cardNo: row.cardNo,
          processName: row.processName,
          artNo: row.artNo,
          employeeName: row.employeeName,
          producedPcs: row.pcs,
          rate: row.pcs > 0 ? row.amount / row.pcs : row.rate,
          amount: row.amount,
          entries: 1,
          lastDate: row.dated,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) =>
      sortText(a.cardNo, b.cardNo) ||
      sortText(a.processName, b.processName) ||
      sortText(a.artNo, b.artNo) ||
      sortText(a.employeeName, b.employeeName),
    )
  }, [productionDetails, selectedLots, selectedProcesses, selectedArts, selectedEmployees])

  const visiblePendingRows = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase()
    if (!search) return pendingRows
    return pendingRows.filter((row) =>
      [row.cardNo, row.processName, row.artNo].some((value) => value.toLocaleLowerCase().includes(search)),
    )
  }, [pendingRows, searchText])

  const visibleSummaryRows = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase()
    if (!search) return summaryRows
    return summaryRows.filter((row) =>
      [row.cardNo, row.processName, row.artNo, row.employeeName].some((value) => value.toLocaleLowerCase().includes(search)),
    )
  }, [summaryRows, searchText])

  const totalPending = visiblePendingRows.reduce((sum, row) => sum + row.pendingPcs, 0)
  const totalProduced = visibleSummaryRows.reduce((sum, row) => sum + row.producedPcs, 0)
  const totalSummaryAmount = visibleSummaryRows.reduce((sum, row) => sum + row.amount, 0)
  const averageSummaryRate = totalProduced > 0 ? totalSummaryAmount / totalProduced : 0
  const formatMoney = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleShow = async () => {
    // Filters are optional: no selection means show the complete report.
    // Any selected filters narrow the report to only the selected values.
    if (!loaded) {
      const success = await loadReportData()
      // Do not open an empty report if the production data request failed.
      if (!success) return
    }
    setSearchText("")
    setShowReport(true)
  }

  const handleReset = () => {
    setSelectedLots([])
    setSelectedProcesses([])
    setSelectedArts([])
    setSelectedEmployees([])
    setLotSearch("")
    setProcessSearch("")
    setArtSearch("")
    setEmployeeSearch("")
    setMode("pending")
    setSearchText("")
    setShowReport(false)
  }

  const handlePrint = () => {
    const title = mode === "pending" ? "Production Outstanding Lot - Only Pending" : "Production Outstanding Lot - Summary"
    const rowsHtml = mode === "pending"
      ? visiblePendingRows.map((row, index) => `<tr><td>${index + 1}</td><td>${row.cardNo}</td><td>${row.processName}</td><td>${row.artNo}</td><td class="num">${row.originalPcs}</td><td class="num">${row.producedPcs}</td><td class="num">${row.pendingPcs}</td></tr>`).join("")
      : visibleSummaryRows.map((row, index) => `<tr><td>${index + 1}</td><td>${row.cardNo}</td><td>${row.processName}</td><td>${row.artNo}</td><td>${row.employeeName}</td><td class="num">${row.producedPcs}</td><td class="num">${row.rate.toFixed(2)}</td><td class="num">${row.amount.toFixed(2)}</td><td class="num">${row.entries}</td><td>${formatDate(row.lastDate)}</td></tr>`).join("")

    const headers = mode === "pending"
      ? "<th>Cutting Lot No</th><th>Process</th><th>Art No</th><th>Cutting Pcs</th><th>Produced Pcs</th><th>Pending Pcs</th>"
      : "<th>Cutting Lot No</th><th>Process</th><th>Art No</th><th>Employee</th><th>Produced Pcs</th><th>Rate</th><th>Amount</th><th>Entries</th><th>Last Date</th>"

    const printWindow = window.open("", "_blank", "width=1200,height=800")
    if (!printWindow) {
      Swal.fire("Error", "Please allow popups to print the report", "error")
      return
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;margin:20px;color:#111}h2{text-align:center}
      table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #555;padding:7px}
      th{background:#e5e7eb}.num{text-align:right}.filters{margin:12px 0;padding:8px;border:1px solid #aaa}
      @page{size:landscape;margin:10mm}
    </style></head><body><h2>${title}</h2>
    <div class="filters">Cutting Lot: ${selectedLots.join(", ") || "All"} | Process: ${selectedProcesses.join(", ") || "All"} | Art: ${selectedArts.join(", ") || "All"} | Employee: ${selectedEmployees.join(", ") || "All"}</div>
    <table><thead><tr><th>S No</th>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table>
    <script>window.onload=function(){window.print()}</script></body></html>`)
    printWindow.document.close()
  }

  return (
    <Dashboard>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl rounded-lg bg-white p-4 shadow-md md:p-6">
          <div className="mb-6 rounded bg-green-600 py-3 text-center text-white">
            <h2 className="text-xl font-bold">Production Outstanding Lot Report</h2>
          </div>

          {masterLoading && <div className="mb-3 text-center text-sm text-gray-500">Loading cutting lots, processes, arts and employees...</div>}

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {/* CUTTING LOT */}
            <div className="rounded border p-3">
              <div className="mb-2 bg-blue-100 py-1 text-center font-semibold">Select Cutting Lot No (Optional)</div>
              <input value={lotSearch} onChange={(e) => setLotSearch(e.target.value)} placeholder="Search Cutting Lot No..." className="mb-2 w-full rounded border px-3 py-2 text-sm" />
              <div className="h-48 overflow-auto rounded border bg-white">
                {lotOptions.filter((v) => v.toLowerCase().includes(lotSearch.toLowerCase())).map((lot) => (
                  <div key={lot} onClick={() => setSelectedLots((prev) => prev.includes(lot) ? prev.filter((v) => v !== lot) : [...prev, lot])} className={`cursor-pointer px-2 py-1 hover:bg-gray-100 ${selectedLots.includes(lot) ? "bg-blue-500 text-white" : ""}`}>
                    {selectedLots.includes(lot) ? "☑" : "☐"} {lot}
                  </div>
                ))}
                {lotOptions.length === 0 && <div className="p-4 text-center text-gray-500">No cutting lots available</div>}
              </div>
              <button type="button" onClick={() => setSelectedLots(selectedLots.length === lotOptions.length ? [] : lotOptions)} className="mt-1 text-xs text-blue-600 hover:underline">{selectedLots.length === lotOptions.length && lotOptions.length ? "Unselect All" : "Select/Unselect All"}</button>
            </div>

            {/* PROCESS */}
            <div className="rounded border p-3">
              <div className="mb-2 bg-green-100 py-1 text-center font-semibold">Select Process (Optional)</div>
              <input value={processSearch} onChange={(e) => setProcessSearch(e.target.value)} placeholder="Search Process..." className="mb-2 w-full rounded border px-3 py-2 text-sm" />
              <div className="h-48 overflow-auto rounded border bg-white">
                {processOptions.filter((v) => v.toLowerCase().includes(processSearch.toLowerCase())).map((process) => (
                  <div key={process} onClick={() => setSelectedProcesses((prev) => prev.includes(process) ? prev.filter((v) => v !== process) : [...prev, process])} className={`cursor-pointer px-2 py-1 hover:bg-gray-100 ${selectedProcesses.includes(process) ? "bg-green-500 text-white" : ""}`}>
                    {selectedProcesses.includes(process) ? "☑" : "☐"} {process}
                  </div>
                ))}
                {processOptions.length === 0 && <div className="p-4 text-center text-gray-500">No processes available</div>}
              </div>
              <button type="button" onClick={() => setSelectedProcesses(selectedProcesses.length === processOptions.length ? [] : processOptions)} disabled={!processOptions.length} className="mt-1 text-xs text-blue-600 hover:underline disabled:text-gray-400">{selectedProcesses.length === processOptions.length && processOptions.length ? "Unselect All" : "Select/Unselect All"}</button>
            </div>

            {/* ART */}
            <div className="rounded border p-3">
              <div className="mb-2 bg-purple-100 py-1 text-center font-semibold">Select Art Number (Optional)</div>
              <input value={artSearch} onChange={(e) => setArtSearch(e.target.value)} placeholder="Search Art Number..." className="mb-2 w-full rounded border px-3 py-2 text-sm" />
              <div className="h-48 overflow-auto rounded border bg-white">
                {artOptions.filter((v) => v.toLowerCase().includes(artSearch.toLowerCase())).map((art) => (
                  <div key={art} onClick={() => setSelectedArts((prev) => prev.includes(art) ? prev.filter((v) => v !== art) : [...prev, art])} className={`cursor-pointer px-2 py-1 hover:bg-gray-100 ${selectedArts.includes(art) ? "bg-purple-500 text-white" : ""}`}>
                    {selectedArts.includes(art) ? "☑" : "☐"} {art}
                  </div>
                ))}
                {artOptions.length === 0 && <div className="p-4 text-center text-gray-500">No arts available</div>}
              </div>
              <button type="button" onClick={() => setSelectedArts(selectedArts.length === artOptions.length ? [] : artOptions)} disabled={!artOptions.length} className="mt-1 text-xs text-blue-600 hover:underline disabled:text-gray-400">{selectedArts.length === artOptions.length && artOptions.length ? "Unselect All" : "Select/Unselect All"}</button>
            </div>

            {/* EMPLOYEE */}
            <div className="rounded border bg-gray-50 p-3">
              <div className="mb-2 bg-yellow-100 py-1 text-center font-semibold">Select Employee (Optional)</div>
              <input value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Search Employee..." className="mb-2 w-full rounded border px-3 py-2 text-sm" />
              <div className="h-48 overflow-auto rounded border bg-white">
                {employeeOptions.filter((v) => v.toLowerCase().includes(employeeSearch.toLowerCase())).map((employee) => (
                  <div key={employee} onClick={() => setSelectedEmployees((prev) => prev.includes(employee) ? prev.filter((v) => v !== employee) : [...prev, employee])} className={`cursor-pointer px-2 py-1 hover:bg-gray-100 ${selectedEmployees.includes(employee) ? "bg-yellow-500 text-white" : ""}`}>
                    {selectedEmployees.includes(employee) ? "☑" : "☐"} {employee}
                  </div>
                ))}
                {employeeOptions.length === 0 && <div className="p-4 text-center text-gray-500">No employees available</div>}
              </div>
              <button type="button" onClick={() => setSelectedEmployees(selectedEmployees.length === employeeOptions.length ? [] : employeeOptions)} disabled={!employeeOptions.length} className="mt-1 text-xs text-blue-600 hover:underline disabled:text-gray-400">{selectedEmployees.length === employeeOptions.length && employeeOptions.length ? "Unselect All" : "Select/Unselect All"}</button>
            </div>

            {/* REPORT TYPE - styled like the Dyeing Outstanding Report selector */}
            <div className="rounded border bg-gray-50 p-3">
              <div className="mb-2 bg-yellow-100 py-2 text-center font-semibold">Select Report Type *</div>
              <div className="flex flex-col gap-2">
                <label
                  className={`flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded border-2 px-3 py-3 text-center transition-colors ${mode === "pending" ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                >
                  <span className="flex items-center gap-2 font-semibold text-gray-800">
                    <input
                      type="radio"
                      name="productionReportMode"
                      value="pending"
                      checked={mode === "pending"}
                      onChange={() => setMode("pending")}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Only Pending
                  </span>
                  <span className="mt-1 text-xs text-gray-600">Cutting Lot + Process Pending</span>
                </label>
                <label
                  className={`flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded border-2 px-3 py-3 text-center transition-colors ${mode === "summary" ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                >
                  <span className="flex items-center gap-2 font-semibold text-gray-800">
                    <input
                      type="radio"
                      name="productionReportMode"
                      value="summary"
                      checked={mode === "summary"}
                      onChange={() => setMode("summary")}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Summary
                  </span>
                  <span className="mt-1 text-xs text-gray-600">Employee-wise Production Details</span>
                </label>
              </div>
              {/* <p className="mt-3 text-xs text-gray-600">Report type select karke Show button dabaye.</p> */}
            </div>
          </div>

          <div className="mb-5 rounded border bg-gray-50 p-3">
            <div className="mb-2 font-semibold">Current Selection</div>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              <div><b>Cutting Lots:</b> {selectedLots.length || "All"}</div>
              <div><b>Processes:</b> {selectedProcesses.length || "All"}</div>
              <div><b>Arts:</b> {selectedArts.length || "All"}</div>
              <div><b>Employees:</b> {selectedEmployees.length || "All"}</div>
              <div><b>Report:</b> {mode === "pending" ? "Only Pending" : "Summary"}</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={handleShow} disabled={loading || masterLoading} className="rounded bg-blue-600 px-10 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Loading..." : "Show"}
            </button>
            <button type="button" onClick={handleReset} className="rounded border-2 border-gray-400 bg-white px-10 py-2 font-semibold hover:bg-gray-100">
              Reset
            </button>
          </div>

          {showReport && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 md:p-5" role="dialog" aria-modal="true" aria-label="Production Outstanding Lot Report">
              <div className="flex max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Fixed report toolbar: remains visible while report rows scroll */}
                <div className="sticky top-0 z-20 border-b bg-white p-3 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">{mode === "pending" ? "Only Pending Report" : "Production Summary Report"}</h3>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={handlePrint} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Print</button>
                      <button type="button" onClick={() => setShowReport(false)} className="rounded bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-800">Back</button>
                    </div>
                  </div>
                  <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search lot, process, art or employee..." className="w-full rounded border p-2" />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-4 grid grid-cols-2 gap-2 rounded bg-gray-50 p-3 text-sm md:grid-cols-4">
                <div><b>Cutting Lot:</b> {selectedLots.join(", ") || "All"}</div>
                <div><b>Process:</b> {selectedProcesses.join(", ") || "All"}</div>
                <div><b>Art:</b> {selectedArts.join(", ") || "All"}</div>
                <div><b>Employee:</b> {selectedEmployees.join(", ") || "All"}</div>
              </div>

              {mode === "pending" ? (
                <>
                  <div className="mb-3 text-sm font-semibold">Pending Rows: {visiblePendingRows.length} | Total Pending Pcs: {totalPending.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] border-collapse text-sm">
                      <thead className="sticky top-0 bg-blue-600 text-white">
                        <tr>{["S No", "Cutting Lot No", "Process", "Art No", "Cutting Pcs", "Produced Pcs", "Pending Pcs"].map((heading) => <th key={heading} className="border p-2">{heading}</th>)}</tr>
                      </thead>
                      <tbody>
                        {visiblePendingRows.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-gray-500">No pending production found for selected filters.</td></tr> : visiblePendingRows.map((row, index) => (
                          <tr key={`${row.cardNo}-${row.processName}-${row.artNo}`} className="odd:bg-white even:bg-gray-50">
                            <td className="border p-2 text-center">{index + 1}</td>
                            <td className="border p-2 font-semibold">{row.cardNo}</td>
                            <td className="border p-2">{row.processName}</td>
                            <td className="border p-2">{row.artNo}</td>
                            <td className="border p-2 text-right">{row.originalPcs}</td>
                            <td className="border p-2 text-right">{row.producedPcs}</td>
                            <td className="border p-2 text-right font-bold text-red-700">{row.pendingPcs}</td>
                          </tr>
                        ))}
                      </tbody>
                      {visiblePendingRows.length > 0 && <tfoot className="bg-gray-200 font-bold"><tr><td colSpan={6} className="border p-2 text-right">TOTAL PENDING PCS</td><td className="border p-2 text-right">{totalPending}</td></tr></tfoot>}
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 text-sm font-semibold">Employee Summary Rows: {visibleSummaryRows.length} | Total Produced Pcs: {totalProduced.toLocaleString("en-IN", { maximumFractionDigits: 2 })} | Total Amount: ₹{formatMoney(totalSummaryAmount)}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1150px] border-collapse text-sm">
                      <thead className="sticky top-0 bg-green-600 text-white">
                        <tr>{["S No", "Cutting Lot No", "Process", "Art No", "Employee", "Produced Pcs", "Rate", "Amount", "Entries", "Last Date"].map((heading) => <th key={heading} className="border p-2">{heading}</th>)}</tr>
                      </thead>
                      <tbody>
                        {visibleSummaryRows.length === 0 ? <tr><td colSpan={10} className="p-6 text-center text-gray-500">No production entries found for selected filters.</td></tr> : visibleSummaryRows.map((row, index) => (
                          <tr key={`${row.cardNo}-${row.processName}-${row.artNo}-${row.employeeName}`} className="odd:bg-white even:bg-gray-50">
                            <td className="border p-2 text-center">{index + 1}</td>
                            <td className="border p-2 font-semibold">{row.cardNo}</td>
                            <td className="border p-2">{row.processName}</td>
                            <td className="border p-2">{row.artNo}</td>
                            <td className="border p-2">{row.employeeName}</td>
                            <td className="border p-2 text-right font-semibold">{row.producedPcs}</td>
                            <td className="border p-2 text-right">{formatMoney(row.rate)}</td>
                            <td className="border p-2 text-right">₹{formatMoney(row.amount)}</td>
                            <td className="border p-2 text-right">{row.entries}</td>
                            <td className="border p-2 text-center">{formatDate(row.lastDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {visibleSummaryRows.length > 0 && <tfoot className="bg-gray-200 font-bold"><tr><td colSpan={5} className="border p-2 text-right">TOTAL</td><td className="border p-2 text-right">{totalProduced}</td><td className="border p-2 text-right">{formatMoney(averageSummaryRate)}</td><td className="border p-2 text-right">₹{formatMoney(totalSummaryAmount)}</td><td colSpan={2} className="border p-2" /></tr></tfoot>}
                    </table>
                  </div>
                </>
              )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  )
}

export default ProductionOutstandingLot
