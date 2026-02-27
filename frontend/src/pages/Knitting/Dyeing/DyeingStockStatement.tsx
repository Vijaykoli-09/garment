"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import Dashboard from "../../Dashboard"
import Swal from "sweetalert2"
import api from "../../../api/axiosInstance"

interface StockRow {
  id?: number
  date: string
  narration: string
  issuePcs?: number
  issueKgs?: number
  receiptPcs?: number
  receiptKgs?: number
  wastage?: number
  rate?: number
  receiptAmount?: number
  balancePcs?: number
  balanceKgs?: number
}

interface Party {
  id: number
  name?: string
  partyName?: string
}

type DyeingOutward = {
  id: number
  challanNo: string
  dated: string
  partyName: string
  rows?: any[]
}

type DyeingInward = {
  id: number
  challanNo: string
  dated: string
  partyName: string
  rows?: any[]
}

const toNum = (v: any) =>
  v === null || v === undefined || v === "" || isNaN(Number(v)) ? 0 : Number(v)

const includesAllTokens = (hay: string, needle: string) => {
  const s = (hay || "").toLowerCase()
  const tokens = (needle || "")
    .toLowerCase()
    .split(/[-,]/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((t) => s.includes(t))
}

const parseDate = (s?: string) => (s ? new Date(s) : null)
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const isBefore = (d: Date, from: Date) =>
  d.getTime() < new Date(from.setHours(0, 0, 0, 0)).getTime()
const inRange = (d: Date, from: Date, to: Date) =>
  d.getTime() >= new Date(from.setHours(0, 0, 0, 0)).getTime() &&
  d.getTime() <= new Date(to.setHours(23, 59, 59, 999)).getTime()

const DyeingStockStatement: React.FC = () => {
  const [rows, setRows] = useState<StockRow[]>([])
  const [partyList, setPartyList] = useState<Party[]>([])
  const [partyName, setPartyName] = useState("")
  const [itemName, setItemName] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [partySearchText, setPartySearchText] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  const [itemOptions, setItemOptions] = useState<string[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [includeInwardItems, setIncludeInwardItems] = useState(false)

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await api.get("/party/category/Dyeing")
        setPartyList(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        Swal.fire("Error", "Failed to load party list", "error")
      }
    }
    fetchParties()
  }, [])

  const collectOutwardTokens = (outs: DyeingOutward[], tokens: Set<string>) => {
    outs.forEach((e) =>
      (e.rows || []).forEach((row: any) => {
        const fabric = row.fabricName || ""
        const shade = row.shade || ""
        const lotNo = row.lotNo || ""
        const processing = row.processing || ""
        
        if (fabric) tokens.add(fabric)
        if (shade) tokens.add(shade)
        if (lotNo) tokens.add(lotNo)
        if (processing) tokens.add(processing)
        if (fabric && shade) tokens.add(`${fabric} - ${shade}`)
      })
    )
  }

  const collectInwardTokens = (ins: DyeingInward[], tokens: Set<string>) => {
    ins.forEach((e) =>
      (e.rows || []).forEach((row: any) => {
        const fabric = row.fabric || ""
        const shade = row.shade || ""
        const lotNo = row.fabricLotNo || ""
        const mcSize = row.mcSize || ""
        
        if (fabric) tokens.add(fabric)
        if (shade) tokens.add(shade)
        if (lotNo) tokens.add(lotNo)
        if (mcSize) tokens.add(mcSize)
        if (fabric && shade) tokens.add(`${fabric} - ${shade}`)
      })
    )
  }

  useEffect(() => {
    const fetchItemOptions = async () => {
      if (!partyName) {
        setItemOptions([])
        return
      }
      setLoadingItems(true)
      try {
        const [outsRes, insRes] = await Promise.all([
          api.get("/dyeing-outward"),
          api.get("/dyeing-inward"),
        ])

        let outs: DyeingOutward[] = Array.isArray(outsRes.data) ? outsRes.data : []
        let ins: DyeingInward[] = Array.isArray(insRes.data) ? insRes.data : []

        outs = outs.filter((e) => e.partyName === partyName)
        ins = ins.filter((e) => e.partyName === partyName)

        if (fromDate && toDate) {
          outs = outs.filter((e) => {
            const dt = parseDate(e.dated)
            return dt ? inRange(dt, new Date(fromDate), new Date(toDate)) : false
          })
          ins = ins.filter((e) => {
            const dt = parseDate(e.dated)
            return dt ? inRange(dt, new Date(fromDate), new Date(toDate)) : false
          })
        }

        const tokens = new Set<string>()
        collectOutwardTokens(outs, tokens)

        if (includeInwardItems) {
          collectInwardTokens(ins, tokens)
        }

        const list = Array.from(tokens).sort((a, b) => a.localeCompare(b))
        setItemOptions(list)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingItems(false)
      }
    }

    fetchItemOptions()
  }, [partyName, fromDate, toDate, includeInwardItems])

  const outwardRowMatches = (row: any, needle: string) => {
    if (!needle) return true
    const fabric = row.fabricName || ""
    const shade = row.shade || ""
    const lotNo = row.lotNo || ""
    const processing = row.processing || ""
    const subject = `${fabric} ${shade} ${lotNo} ${processing}`
    return includesAllTokens(subject, needle)
  }

  const inwardRowMatches = (row: any, needle: string) => {
    if (!needle) return true
    const fabric = row.fabric || ""
    const shade = row.shade || ""
    const lotNo = row.fabricLotNo || ""
    const mcSize = row.mcSize || ""
    const subject = `${fabric} ${shade} ${lotNo} ${mcSize}`
    return includesAllTokens(subject, needle)
  }

  const handleShowReport = async () => {
    if (!partyName || !fromDate || !toDate) {
      Swal.fire("Missing Fields", "Please select party and date range", "warning")
      return
    }

    try {
      setLoading(true)

      const [outwardRes, inwardRes] = await Promise.all([
        api.get("/dyeing-outward"),
        api.get("/dyeing-inward"),
      ])

      const outwards: DyeingOutward[] = Array.isArray(outwardRes.data) ? outwardRes.data : []
      const inwards: DyeingInward[] = Array.isArray(inwardRes.data) ? inwardRes.data : []

      const outsByParty = outwards.filter((e) => e.partyName === partyName)
      const insByParty = inwards.filter((e) => e.partyName === partyName)

      const outsBefore: DyeingOutward[] = []
      const outsInRange: DyeingOutward[] = []
      for (const e of outsByParty) {
        const dt = parseDate(e.dated)
        if (!dt) continue
        if (isBefore(dt, new Date(fromDate))) outsBefore.push(e)
        else if (inRange(dt, new Date(fromDate), new Date(toDate))) outsInRange.push(e)
      }

      const insBefore: DyeingInward[] = []
      const insInRange: DyeingInward[] = []
      for (const e of insByParty) {
        const dt = parseDate(e.dated)
        if (!dt) continue
        if (isBefore(dt, new Date(fromDate))) insBefore.push(e)
        else if (inRange(dt, new Date(fromDate), new Date(toDate))) insInRange.push(e)
      }

      const sumOutward = (entry: DyeingOutward, needle: string) => {
        const rows = Array.isArray(entry.rows) ? entry.rows : []
        const filtered = needle?.trim() ? rows.filter((r) => outwardRowMatches(r, needle)) : rows

        const pcs = filtered.reduce((s, r) => s + toNum(r.roll), 0)
        const kgs = filtered.reduce((s, r) => s + toNum(r.weight), 0)

        return { pcs, kgs }
      }

      const sumInward = (entry: DyeingInward, needle: string) => {
        const rows = Array.isArray(entry.rows) ? entry.rows : []
        const filtered = needle?.trim() ? rows.filter((r) => inwardRowMatches(r, needle)) : rows

        const pcs = filtered.reduce((s, r) => s + toNum(r.rolls), 0)
        const kgs = filtered.reduce((s, r) => s + toNum(r.weight), 0)
        const wastage = filtered.reduce((s, r) => s + toNum(r.wastage), 0)
        
        // Calculate rate: knittingYarnRate + dyeingRate
        const totalWeight = filtered.reduce((s, r) => s + toNum(r.weight), 0)
        const totalAmount = filtered.reduce((s, r) => {
          const knittingYarnRate = toNum(r.knittingYarnRate)
          const dyeingRate = toNum(r.dyeingRate)
          const weight = toNum(r.weight)
          return s + (weight * (knittingYarnRate + dyeingRate))
        }, 0)
        
        const avgRate = totalWeight > 0 ? totalAmount / totalWeight : 0
        const amt = totalAmount

        return { pcs, kgs, wastage, rate: avgRate, amt }
      }

      let openingIssuePcs = 0,
        openingIssueKgs = 0,
        openingReceiptPcs = 0,
        openingReceiptKgs = 0

      for (const e of outsBefore) {
        const s = sumOutward(e, itemName)
        openingIssuePcs += s.pcs
        openingIssueKgs += s.kgs
      }

      for (const e of insBefore) {
        const s = sumInward(e, itemName)
        openingReceiptPcs += s.pcs
        openingReceiptKgs += s.kgs
      }

      const openingBalPcs = openingIssuePcs - openingReceiptPcs
      const openingBalKgs = openingIssueKgs - openingReceiptKgs

      const ledgerRows: StockRow[] = [
        {
          date: "",
          narration: "Opening Balance",
          balancePcs: openingBalPcs,
          balanceKgs: openingBalKgs,
        },
      ]

      for (const e of outsInRange) {
        const s = sumOutward(e, itemName)
        if (s.pcs === 0 && s.kgs === 0) continue
        ledgerRows.push({
          date: e.dated,
          narration: `Challan No. ${e.challanNo || ""}`,
          issuePcs: s.pcs || undefined,
          issueKgs: s.kgs || undefined,
        })
      }

      for (const e of insInRange) {
        const s = sumInward(e, itemName)
        if (s.pcs === 0 && s.kgs === 0) continue
        ledgerRows.push({
          date: e.dated,
          narration: `Challan No. ${e.challanNo || ""}`,
          receiptPcs: s.pcs || undefined,
          receiptKgs: s.kgs || undefined,
          wastage: s.wastage || undefined,
          rate: s.rate ? Number(s.rate.toFixed(2)) : undefined,
          receiptAmount: s.amt ? Number(s.amt.toFixed(2)) : undefined,
        })
      }

      const sorted = ledgerRows.sort((a, b) => {
        if (a.narration === "Opening Balance") return -1
        if (b.narration === "Opening Balance") return 1
        return (a.date || "").localeCompare(b.date || "")
      })

      let balPcs = openingBalPcs
      let balKgs = openingBalKgs

      const withBalances = sorted.map((r) => {
        if (r.narration !== "Opening Balance") {
          balPcs += toNum(r.issuePcs) - toNum(r.receiptPcs)
          balKgs += toNum(r.issueKgs) - toNum(r.receiptKgs)
          return {
            ...r,
            balancePcs: balPcs || undefined,
            balanceKgs: balKgs || undefined,
          }
        }
        return r
      })

      const finalRows = withBalances.map((r, idx) => ({ 
        id: idx + 1, 
        ...r,
        date: r.date ? formatDate(r.date) : ""
      }))

      if (finalRows.length <= 1) {
        Swal.fire("No Data", "No records found for selected filters", "info")
        return
      }

      setRows(finalRows)
      setShowModal(true)
    } catch (err) {
      console.error(err)
      Swal.fire("Error", "Failed to build stock statement", "error")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open("", "", "width=900,height=650")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Dyeing Stock Statement</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h2 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #999; padding: 6px; text-align: right; }
              th { background-color: #f1f1f1; font-weight: bold; }
              td:nth-child(1), td:nth-child(2) { text-align: center; }
              td:nth-child(3) { text-align: left; }
              .opening-row { font-weight: bold; background-color: #e8e8e8; }
            </style>
          </head>
          <body>${content.innerHTML}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const totals = useMemo(() => {
    const movRows = rows.filter((r) => r.narration !== "Opening Balance")
    const t = {
      issuePcs: 0,
      issueKgs: 0,
      receiptPcs: 0,
      receiptKgs: 0,
      wastage: 0,
      receiptAmt: 0,
      closingPcs: 0,
      closingKgs: 0,
    }
    movRows.forEach((r) => {
      t.issuePcs += toNum(r.issuePcs)
      t.issueKgs += toNum(r.issueKgs)
      t.receiptPcs += toNum(r.receiptPcs)
      t.receiptKgs += toNum(r.receiptKgs)
      t.wastage += toNum(r.wastage)
      t.receiptAmt += toNum(r.receiptAmount)
    })
    const last = rows[rows.length - 1]
    t.closingPcs = toNum(last?.balancePcs)
    t.closingKgs = toNum(last?.balanceKgs)
    return t
  }, [rows])

  const filteredParties = partyList.filter((p) =>
    (p.partyName || p.name || "").toLowerCase().includes(partySearchText.toLowerCase())
  )

  const selectParty = (party: any) => {
    setPartyName(party.partyName || party.name)
    setShowPartyModal(false)
    setPartySearchText("")
  }

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Dyeing Stock Statement</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Party</label>
              <input
                type="text"
                value={partyName}
                onClick={() => setShowPartyModal(true)}
                readOnly
                className="border p-2 rounded w-full cursor-pointer bg-gray-50 hover:bg-gray-100"
                placeholder="Click to select party"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Item (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="itemOptionList"
                  placeholder="Fabric/Shade/Lot... (type or pick)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="border p-2 rounded w-full"
                  disabled={!partyName}
                />
                {itemName && (
                  <button
                    onClick={() => setItemName("")}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    title="Clear item"
                  >
                    Clear
                  </button>
                )}
              </div>
              <datalist id="itemOptionList">
                {itemOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                <span>
                  {loadingItems ? "Loading items..." : `${itemOptions.length} item(s) found`}
                </span>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={includeInwardItems}
                    onChange={() => setIncludeInwardItems((s) => !s)}
                  />
                  <span>Include inward suggestions</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="text-center">
            <button
              disabled={loading}
              onClick={handleShowReport}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
            >
              {loading ? "Loading..." : "Show Report"}
            </button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto p-5">
              <div ref={printRef}>
                <div className="text-center mb-4 border-b pb-3">
                  <h2 className="text-lg font-bold mb-2">Dyeing Stock Report</h2>
                  <div className="text-sm font-semibold flex justify-between">
                    <span>Party: {partyName || "-"}</span>
                    <span>Item: {itemName || "All Items"}</span>
                    <span>
                      Period: {fromDate ? formatDate(fromDate) : "-"} to {toDate ? formatDate(toDate) : "-"}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th rowSpan={2} className="border p-2 text-center w-12">
                          S.No
                        </th>
                        <th rowSpan={2} className="border p-2 text-center w-24">
                          Date
                        </th>
                        <th rowSpan={2} className="border p-2 text-left min-w-[200px]">
                          Narration
                        </th>
                        <th colSpan={2} className="border p-2 text-center bg-blue-50">
                          Issue
                        </th>
                        <th colSpan={4} className="border p-2 text-center bg-green-50">
                          Receipt
                        </th>
                        <th colSpan={2} className="border p-2 text-center bg-yellow-50">
                          Balance
                        </th>
                      </tr>
                      <tr>
                        <th className="border p-2 text-center w-16 bg-blue-50">Pcs</th>
                        <th className="border p-2 text-center w-20 bg-blue-50">Kgs</th>
                        <th className="border p-2 text-center w-16 bg-green-50">Pcs</th>
                        <th className="border p-2 text-center w-20 bg-green-50">Kgs</th>
                        <th className="border p-2 text-center w-20 bg-green-50">Wastage</th>
                        <th className="border p-2 text-center w-20 bg-green-50">Rate</th>
                        <th className="border p-2 text-center w-24 bg-green-50">Amount</th>
                        <th className="border p-2 text-center w-16 bg-yellow-50">Pcs</th>
                        <th className="border p-2 text-center w-20 bg-yellow-50">Kgs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr 
                          key={r.id} 
                          className={r.narration === "Opening Balance" ? "font-bold bg-gray-100" : "odd:bg-white even:bg-gray-50"}
                        >
                          <td className="border p-2 text-center">{r.id}</td>
                          <td className="border p-2 text-center">{r.date}</td>
                          <td className="border p-2 text-left">{r.narration}</td>
                          <td className="border p-2 text-center">{r.issuePcs ?? ""}</td>
                          <td className="border p-2 text-right">{r.issueKgs ? r.issueKgs.toFixed(3) : ""}</td>
                          <td className="border p-2 text-center">{r.receiptPcs ?? ""}</td>
                          <td className="border p-2 text-right">{r.receiptKgs ? r.receiptKgs.toFixed(3) : ""}</td>
                          <td className="border p-2 text-right">{r.wastage ? r.wastage.toFixed(3) : ""}</td>
                          <td className="border p-2 text-right">{r.rate ? r.rate.toFixed(2) : ""}</td>
                          <td className="border p-2 text-right">{r.receiptAmount ? r.receiptAmount.toFixed(2) : ""}</td>
                          <td className="border p-2 text-center font-semibold">{r.balancePcs ?? ""}</td>
                          <td className="border p-2 text-right font-semibold">
                            {r.balanceKgs !== undefined ? r.balanceKgs.toFixed(3) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {rows.length > 1 && (
                      <tfoot>
                        <tr className="bg-gray-200 font-bold">
                          <td className="border p-2 text-center" colSpan={3}>
                            TOTAL
                          </td>
                          <td className="border p-2 text-center">{totals.issuePcs}</td>
                          <td className="border p-2 text-right">{totals.issueKgs.toFixed(3)}</td>
                          <td className="border p-2 text-center">{totals.receiptPcs}</td>
                          <td className="border p-2 text-right">{totals.receiptKgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">{totals.wastage.toFixed(3)}</td>
                          <td className="border p-2 text-right">-</td>
                          <td className="border p-2 text-right">₹{totals.receiptAmt.toFixed(2)}</td>
                          <td className="border p-2 text-center">{totals.closingPcs}</td>
                          <td className="border p-2 text-right">{totals.closingKgs.toFixed(3)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        )}

        {showPartyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
              <h3 className="text-xl font-bold text-center mb-4">Select Party</h3>
              <input
                type="text"
                placeholder="Search party name..."
                value={partySearchText}
                onChange={(e) => setPartySearchText(e.target.value)}
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
                    {filteredParties.map((p) => (
                      <tr key={p.id}>
                        <td className="border p-2">{(p as any).serialNumber}</td>
                        <td className="border p-2">{p.partyName || p.name}</td>
                        <td className="border p-2">{(p as any).gstNo}</td>
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
      </div>
    </Dashboard>
  )
}

export default DyeingStockStatement