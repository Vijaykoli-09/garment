
"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
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
  sizes: { sizeName: string }[]
}

interface CuttingEntry {
  serialNo: string
  lotRows: {
    cutLotNo: string
    artNo: string
    pcs: string
  }[]
}

const ProductionReceipt: React.FC = () => {
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

  const [, setVoucherNo] = useState("")
  const [dated, setDated] = useState("")

  const [showList, setShowList] = useState(false)
  const [, setProductionReceiptList] = useState<any[]>([])
  const [searchText, setSearchText] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)

  const [savedRecords, setSavedRecords] = useState<any[]>([])

  const [artList, setArtList] = useState<ArtDetail[]>([])
  const [cuttingEntries, setCuttingEntries] = useState<CuttingEntry[]>([])

  useEffect(() => {
    loadEmployees()
    loadProcesses()
    loadArts()
    loadCuttingEntries()
    loadSavedRecords()
  }, [])

  const loadEmployees = async () => {
    try {
      const res = await api.get("/employees")
      setEmployeeList(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Failed to load employees:", err)
      Swal.fire("Error", "Failed to load employees", "error")
    }
  }

  const loadProcesses = async () => {
    try {
      const res = await api.get("/process/list")
      setProcessList(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Failed to load processes:", err)
      Swal.fire("Error", "Failed to load processes", "error")
    }
  }

  const loadArts = async () => {
    try {
      const res = await api.get("/arts")
      const arts = Array.isArray(res.data) ? res.data : []

      const detailedArts = await Promise.all(
        arts.map(async (art: any) => {
          try {
            const detailRes = await api.get(`/arts/${art.serialNumber}`)
            return detailRes.data
          } catch (err) {
            console.error(`Failed to load details for art ${art.serialNumber}:`, err)
            return art
          }
        }),
      )

      setArtList(detailedArts)
    } catch (err) {
      console.error("Failed to load arts:", err)
      Swal.fire("Error", "Failed to load arts", "error")
    }
  }

  const loadCuttingEntries = async () => {
    try {
      const res = await api.get("/cutting-entries")
      setCuttingEntries(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Failed to load cutting entries:", err)
      Swal.fire("Error", "Failed to load cutting entries", "error")
    }
  }

  const loadSavedRecords = async () => {
    try {
      const res = await api.get("/production-receipt")
      const data = Array.isArray(res.data) ? res.data : []
      console.log("[v0] Loaded saved records:", data)
      setSavedRecords(data)
      return data
    } catch (err: any) {
      console.error("Error loading saved records:", err)
      return []
    }
  }

  const handleProcessSelect = async (selectedProcess: any) => {
    setProcessName(selectedProcess.processName)
    setShowProcessModal(false)

    const latestRecords = await loadSavedRecords()
    console.log("[v0] Latest records for process selection:", latestRecords)

    const artsWithProcess = artList.filter((art) =>
      art.processes?.some((p) => p.processName === selectedProcess.processName),
    )

    if (artsWithProcess.length === 0) {
      Swal.fire("Info", "No arts found for this process", "info")
      return
    }

    const newRows: ProductionRow[] = []
    let rowId = Date.now()

    artsWithProcess.forEach((art) => {
      const processDetail = art.processes.find((p) => p.processName === selectedProcess.processName)
      const processRate = processDetail?.rate || ""

      const cuttingForArt: any[] = []
      cuttingEntries.forEach((entry) => {
        entry.lotRows?.forEach((lotRow) => {
          if (lotRow.artNo === art.artNo) {
            cuttingForArt.push({
              cutLotNo: lotRow.cutLotNo,
              pcs: lotRow.pcs,
            })
          }
        })
      })

      if (cuttingForArt.length > 0) {
        cuttingForArt.forEach((cutting) => {
          const originalPcs = Number.parseFloat(cutting.pcs) || 0
          let consumedPcs = 0
          
          // Calculate consumed pieces from all saved records for THIS PROCESS ONLY
          latestRecords.forEach((record) => {
            // Only count consumption from the same process
            const recordProcess = (record.processName || "").toString().trim()
            const currentProcess = selectedProcess.processName.toString().trim()
            
            if (recordProcess === currentProcess) {
              ;(record.rows || []).forEach((row: any) => {
                const rowCardNo = (row.cardNo || "").toString().trim()
                const rowArtNo = (row.artNo || "").toString().trim()
                const cutLotNo = cutting.cutLotNo.toString().trim()
                const artNoTrimmed = art.artNo.toString().trim()
                
                // Only count consumed pieces for this cutting lot, art, and process
                if (rowCardNo === cutLotNo && rowArtNo === artNoTrimmed) {
                  const rowPcs = Number.parseFloat(row.pcs) || 0
                  consumedPcs += rowPcs
                  console.log(
                    `[v0] Found match for process ${currentProcess}: Card=${rowCardNo}, Art=${rowArtNo}, Pcs=${rowPcs} (total consumed: ${consumedPcs})`,
                  )
                }
              })
            }
          })
          const remainingPcs = Math.max(0, originalPcs - consumedPcs)
          console.log(`[v0] Process: ${selectedProcess.processName}, Card: ${cutting.cutLotNo}, Art: ${art.artNo} - Original: ${originalPcs}, Consumed: ${consumedPcs}, Remaining: ${remainingPcs}`)

          if (remainingPcs > 0) {
            newRows.push({
              id: rowId++,
              cardNo: cutting.cutLotNo,
              artNo: art.artNo,
              shade: "", // Manual entry - leave blank
              pcs: remainingPcs.toString(),
              originalPcs: cutting.pcs,
              weightage: "",
              rate: processRate,
              amount: (remainingPcs * (Number.parseFloat(processRate) || 0)).toFixed(2),
              remarks: "",
              isSelected: false,
            })
          }
        })
      }
    })

    console.log("[v0] Final rows to display:", newRows)
    setRows(newRows)

    if (newRows.length > 0) {
      Swal.fire({
        icon: "success",
        title: "Rows Generated",
        text: `${newRows.length} rows created with remaining pieces for process: ${selectedProcess.processName}`,
        timer: 2000,
        showConfirmButton: false,
      })
    } else {
      Swal.fire({
        icon: "info",
        title: "No Remaining Pieces",
        text: "All cutting entries for this process have been fully consumed.",
        timer: 2000,
        showConfirmButton: false,
      })
    }
  }

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
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
      },
    ])
  }, [])

  useEffect(() => {
    if (rows.length === 0) {
      addRow()
    }
  }, [addRow, rows.length])

  const handleChange = (id: number, field: keyof ProductionRow, value: string) => {
    const updatedRows = rows.map((r) => {
      if (r.id === id) {
        const updatedRow = { ...r, [field]: value }

        if (field === "pcs") {
          updatedRow.isSelected = true
        }

        if (field === "pcs" || field === "rate") {
          const pcs = Number.parseFloat(field === "pcs" ? value : updatedRow.pcs) || 0
          const rate = Number.parseFloat(field === "rate" ? value : updatedRow.rate) || 0
          updatedRow.amount = (pcs * rate).toFixed(2)
        }

        return updatedRow
      }
      return r
    })
    setRows(updatedRows)
  }

  const handleRowSelection = (id: number, selected: boolean) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, isSelected: selected } : r)))
  }

  const openEmployeeModal = () => {
    if (!processName) {
      Swal.fire("Info", "Please select a process first", "info")
      return
    }
    setShowEmployeeModal(true)
    setEmployeeSearchText("")
  }

  const selectEmployee = (employee: any) => {
    setEmployeeName(employee.name || employee.employeeName)
    setShowEmployeeModal(false)
  }

  const openProcessModal = () => {
    setShowProcessModal(true)
    setProcessSearchText("")
  }

  const filteredEmployeesForModal = employeeList.filter((e) => {
    const employeeProcess = e.process?.processName || e.processName || ""
    const matchesProcess = employeeProcess.toLowerCase() === processName.toLowerCase()
    const matchesSearch = (e.name || e.employeeName || "").toLowerCase().includes(employeeSearchText.toLowerCase())
    return matchesProcess && matchesSearch
  })

  const filteredProcesses = processList.filter((p) =>
    p.processName.toLowerCase().includes(processSearchText.toLowerCase()),
  )

  const handleSave = async () => {
    const selectedRows = rows.filter((r) => r.isSelected)

    if (selectedRows.length === 0) {
      Swal.fire("Error", "Please select at least one row to save!", "error")
      return
    }

    if (!dated || !employeeName || !processName) {
      Swal.fire("Error", "Please fill all required fields (Date, Employee, Process)!", "error")
      return
    }

    const autoVoucherNo = `PR-${Date.now()}`

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

    console.log("[v0] Saving production receipt for employee:", employeeName, "Process:", processName)
    console.log("[v0] Payload:", payload)

    try {
      if (editingId) {
        await api.put(`/production-receipt/${editingId}`, payload)
        Swal.fire("Success", `Production receipt updated for ${employeeName}!`, "success")
        setEditingId(null)
      } else {
        await api.post("/production-receipt", payload)
        Swal.fire("Success", `Production receipt saved for ${employeeName}!`, "success")
      }

      await loadSavedRecords()
      setRows(rows.filter((r) => !r.isSelected))

      if (processName) {
        const selectedProcess = processList.find((p) => p.processName === processName)
        if (selectedProcess) {
          await handleProcessSelect(selectedProcess)
        }
      }
    } catch (err: any) {
      console.error("Save Error:", err)
      Swal.fire("Error", err.response?.data?.message || "Failed to save record", "error")
    }
  }

  const resetForm = () => {
    setRows([])
    addRow()
    setVoucherNo("")
    setDated("")
    setEmployeeName("")
    setProcessName("")
    setRandomEntry(false)
    setEditingId(null)
  }

  const openList = async () => {
    try {
      const data = await loadSavedRecords()
      console.log("[v0] Opening list with data:", data)
      setShowList(true)
    } catch (err) {
      console.error("Load List Error:", err)
      Swal.fire("Error", "Failed to load list", "error")
    }
  }

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

    if (result.isConfirmed) {
      try {
        await api.delete(`/production-receipt/${id}`)
        setProductionReceiptList((prev) => prev.filter((x) => x.id !== id))
        await loadSavedRecords()
        Swal.fire("Deleted!", "Record deleted successfully", "success")

        if (processName) {
          const selectedProcess = processList.find((p) => p.processName === processName)
          if (selectedProcess) {
            await handleProcessSelect(selectedProcess)
          }
        }
      } catch (err) {
        console.error("Delete Error:", err)
        Swal.fire("Error", "Delete failed", "error")
      }
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const totalPcs = rows.reduce((sum, r) => sum + (Number.parseFloat(r.pcs) || 0), 0)

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
            <p><b>Date:</b> ${dated}</p>
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
            <p>Total Pieces: ${totalPcs}</p>
          </div>
          <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const filteredList = Array.isArray(savedRecords)
    ? savedRecords.filter((x) => {
        const s = searchText.toLowerCase()
        if (!searchText) return true
        if ((x.employeeName || "").toLowerCase().includes(s)) return true
        const artNos = (x.rows || []).map((r: any) => r.artNo || "").join(" ").toLowerCase()
        if (artNos.includes(s)) return true
        return false
      })
    : []

  const totalPcs = rows.reduce((sum, r) => sum + (Number.parseFloat(r.pcs) || 0), 0)
  const selectedPcs = rows.filter((r) => r.isSelected).reduce((sum, r) => sum + (Number.parseFloat(r.pcs) || 0), 0)
  const selectedCount = rows.filter((r) => r.isSelected).length

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center mb-4">Production Receipt</h2>

          <div className="grid grid-cols-4 gap-4 mb-4">
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
              <label className="block font-semibold">Process</label>
              <input
                type="text"
                value={processName}
                onClick={openProcessModal}
                readOnly
                className="border p-2 rounded w-full cursor-pointer bg-gray-50 hover:bg-gray-100"
                placeholder="Click to select process"
              />
            </div>
            <div>
              <label className="block font-semibold">Employee</label>
              <input
                type="text"
                value={employeeName}
                onClick={openEmployeeModal}
                readOnly
                className="border p-2 rounded w-full cursor-pointer bg-gray-50 hover:bg-gray-100"
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

          <div className="overflow-auto max-h-[350px]">
            <table className="min-w-full w-full border border-blue-500 text-sm">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2 min-w-[120px]">Cutting Lot No</th>
                  <th className="border p-2 min-w-[100px]">Art No</th>
                  <th className="border p-2 min-w-[80px]">Shade</th>
                  <th className="border p-2 min-w-[80px]">Pcs</th>
                  <th className="border p-2 min-w-[100px]">Weightage</th>
                  <th className="border p-2 min-w-[80px]">Rate</th>
                  <th className="border p-2 min-w-[90px]">Amount</th>
                  <th className="border p-2 min-w-[150px]">Remarks</th>
                  <th className="border p-2 min-w-[60px]">Select</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.cardNo}
                        onChange={(e) => handleChange(row.id, "cardNo", e.target.value)}
                        className="border p-1 rounded w-full"
                        placeholder="Cutting Lot No"
                        disabled={row.originalPcs !== ""}
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.artNo}
                        onChange={(e) => handleChange(row.id, "artNo", e.target.value)}
                        className="border p-1 rounded w-full"
                        disabled={row.originalPcs !== ""}
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.shade}
                        onChange={(e) => handleChange(row.id, "shade", e.target.value)}
                        className="border p-1 rounded w-full text-center"
                        placeholder="Enter shade"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.pcs}
                        onChange={(e) => handleChange(row.id, "pcs", e.target.value)}
                        className="border p-1 rounded w-full text-center"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.weightage}
                        onChange={(e) => handleChange(row.id, "weightage", e.target.value)}
                        className="border p-1 rounded w-full text-center"
                        placeholder="Weightage"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.rate}
                        onChange={(e) => handleChange(row.id, "rate", e.target.value)}
                        className="border p-1 rounded w-full text-center"
                        placeholder="Rate"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.amount}
                        readOnly
                        className="border p-1 rounded w-full bg-gray-50 text-center"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleChange(row.id, "remarks", e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="border p-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.isSelected}
                        onChange={(e) => handleRowSelection(row.id, e.target.checked)}
                        className="mx-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
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
              <button onClick={addRow} className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600">
                Add
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded mr-2 hover:bg-green-600"
              >
                {editingId ? "Update" : "Save"}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-orange-500 text-white rounded mr-2 hover:bg-orange-600"
              >
                Cancel
              </button>
              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded mr-2 hover:bg-yellow-600"
              >
                List
              </button>
              <button
                onClick={() => {
                  if (editingId) {
                    handleDelete(editingId)
                  } else {
                    Swal.fire("Info", "No record selected to delete", "info")
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded mr-2 hover:bg-red-600"
              >
                Delete
              </button>
              <button onClick={handlePrint} className="px-4 py-2 bg-gray-600 text-white rounded mr-2 hover:bg-gray-700">
                Print
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-400 text-white rounded mr-2 hover:bg-gray-500"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Selection Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">
              Select Employee for {processName}
            </h3>
            <input
              type="text"
              placeholder="Search employee name..."
              value={employeeSearchText}
              onChange={(e) => setEmployeeSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Employee Name</th>
                    <th className="border p-2">Code</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeesForModal.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border p-4 text-center text-gray-500">
                        No employees found for {processName} process
                      </td>
                    </tr>
                  ) : (
                    filteredEmployeesForModal.map((e) => (
                      <tr key={e.id}>
                        <td className="border p-2">{e.name || e.employeeName}</td>
                        <td className="border p-2">{e.code || e.employeeCode}</td>
                        <td className="border p-2">{e.process?.processName || "-"}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => selectEmployee(e)}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
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
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Selection Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Process</h3>
            <input
              type="text"
              placeholder="Search process name..."
              value={processSearchText}
              onChange={(e) => setProcessSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Process Name</th>
                    <th className="border p-2">Category</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.map((p) => (
                    <tr key={p.serialNo}>
                      <td className="border p-2">{p.processName}</td>
                      <td className="border p-2">{p.category}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => handleProcessSelect(p)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">Production Receipt List</h3>

            <input
              placeholder="Search by Employee or Art No"
              className="border p-2 rounded w-full mb-3"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Art No</th>
                    <th className="border p-2">Employee</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Total Pcs</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border p-4 text-center text-gray-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d, i) => {
                      const totalPcs = (d.rows || []).reduce(
                        (sum: number, r: any) => sum + (Number.parseFloat(r.pcs) || 0),
                        0,
                      )
                      
                      // Get unique art numbers from rows
                      const artNoSet: string[] = []
;(d.rows || []).forEach((r: any) => {
  if (r.artNo && !artNoSet.includes(r.artNo)) {
    artNoSet.push(r.artNo)
  }
})
const artNos = artNoSet.join(", ")

                      return (
                        <tr key={d.id}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">{d.dated ? new Date(d.dated).toLocaleDateString() : "-"}</td>
                          <td className="border p-2">{artNos || "-"}</td>
                          <td className="border p-2">{d.employeeName}</td>
                          <td className="border p-2">{d.processName}</td>
                          <td className="border p-2 text-right">{totalPcs}</td>
                          <td className="border p-2 text-center">
                            <button
                              onClick={() => handleEdit(d.id)}
                              className="px-2 py-1 bg-blue-500 text-white rounded mr-1 hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
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

            <div className="flex justify-center mt-5">
              <button onClick={() => setShowList(false)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  )
}

export default ProductionReceipt;