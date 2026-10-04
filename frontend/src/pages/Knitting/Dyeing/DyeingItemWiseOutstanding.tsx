"use client"

import React, { useEffect, useMemo, useState } from "react"
import Dashboard from "../../Dashboard"
import api from "../../../api/axiosInstance"
import Swal from "sweetalert2"

interface Party {
  id: number
  partyName: string
}

interface LotBalance {
  lotNo: string
  itemName: string
  partyName: string
  outwardRolls: number
  inwardRolls: number
  outstandingRolls: number
  outwardWeight: number
  inwardWeight: number
  outstandingWeight: number
}

type ReportType = "lot" | "item" | ""

const DyeingItemWiseOutstanding: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([])
  const [lots, setLots] = useState<string[]>([])
  const [items, setItems] = useState<string[]>([])

  // Keep outward data in memory so Lot/Fabric filters can depend on the selected Party.
  const [outwardData, setOutwardData] = useState<any[]>([])

  const [selectedParties, setSelectedParties] = useState<number[]>([])
  const [selectedLots, setSelectedLots] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const [lotSearch, setLotSearch] = useState("")
  const [itemSearch, setItemSearch] = useState("")
  const [partySearch, setPartySearch] = useState("")

  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // Report type selected BEFORE Show
  const [reportType, setReportType] =
    useState<ReportType>("")

  const [showModal, setShowModal] =
    useState(false)

  const [balanceData, setBalanceData] =
    useState<LotBalance[]>([])

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    fetchParties()
    fetchLotsAndItems()
  }, [])

  // ============================================================
  // FETCH PARTIES
  // ============================================================
  const fetchParties = async () => {
    try {
      const response = await api.get(
        "/party/category/Dyeing"
      )

      setParties(
        Array.isArray(response.data)
          ? response.data
          : []
      )
    } catch (error) {
      console.error(
        "Error fetching parties:",
        error
      )

      Swal.fire(
        "Error",
        "Failed to load parties",
        "error"
      )
    }
  }

  // ============================================================
  // FETCH LOTS + ITEMS
  // ============================================================
  const fetchLotsAndItems = async () => {
    try {
      const response = await api.get(
        "/dyeing-outward"
      )

      const outwardData =
        Array.isArray(response.data)
          ? response.data
          : []

      // IMPORTANT: do not load all lots globally.
      // Lots must be populated only after Party selection.
      setOutwardData(outwardData)
      setLots([])
      setItems([])
      setSelectedLots([])
      setSelectedItems([])
    } catch (error) {
      console.error(
        "Error fetching lots/items:",
        error
      )

      Swal.fire(
        "Error",
        "Failed to load lots and items",
        "error"
      )
    }
  }

  // ============================================================
  // SELECTED PARTY NAMES
  // ============================================================
  const selectedPartyNames = useMemo(
    () =>
      parties
        .filter((party) =>
          selectedParties.includes(
            party.id
          )
        )
        .map(
          (party) => party.partyName
        ),
    [parties, selectedParties]
  )

  // ============================================================
  // PARTY -> LOT FILTER
  // ============================================================
  useEffect(() => {
    if (selectedParties.length === 0) {
      setLots([])
      setSelectedLots([])
      setItems([])
      setSelectedItems([])
      return
    }

    const partyNames = parties
      .filter((party) =>
        selectedParties.includes(party.id)
      )
      .map((party) => String(party.partyName || "").trim())
      .filter(Boolean)

    const lotSet = new Set<string>()

    outwardData.forEach((outward: any) => {
      const partyName = String(
        outward.partyName || ""
      ).trim()

      if (!partyNames.includes(partyName)) {
        return
      }

      if (!Array.isArray(outward.rows)) {
        return
      }

      outward.rows.forEach((row: any) => {
        const lotNo = String(
          row.lotNo || ""
        ).trim()

        if (lotNo) {
          lotSet.add(lotNo)
        }
      })
    })

    const nextLots = Array.from(lotSet).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )

    setLots(nextLots)

    // Party change means previous Lot/Fabric selections are no longer valid.
    setSelectedLots([])
    setItems([])
    setSelectedItems([])
    setLotSearch("")
    setItemSearch("")
  }, [selectedParties, parties, outwardData])

  // ============================================================
  // LOT -> ITEM/FABRIC FILTER
  // ============================================================
  useEffect(() => {
    if (selectedParties.length === 0 || selectedLots.length === 0) {
      setItems([])
      setSelectedItems([])
      return
    }

    const partyNames = parties
      .filter((party) =>
        selectedParties.includes(party.id)
      )
      .map((party) => String(party.partyName || "").trim())
      .filter(Boolean)

    const itemSet = new Set<string>()

    outwardData.forEach((outward: any) => {
      const partyName = String(
        outward.partyName || ""
      ).trim()

      if (!partyNames.includes(partyName)) {
        return
      }

      if (!Array.isArray(outward.rows)) {
        return
      }

      outward.rows.forEach((row: any) => {
        const lotNo = String(
          row.lotNo || ""
        ).trim()

        const itemName = String(
          row.fabricName || ""
        ).trim()

        if (selectedLots.includes(lotNo) && itemName) {
          itemSet.add(itemName)
        }
      })
    })

    const nextItems = Array.from(itemSet).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )

    setItems(nextItems)
    setSelectedItems((prev) =>
      prev.filter((item) => nextItems.includes(item))
    )
  }, [selectedLots, selectedParties, parties, outwardData])

  // ============================================================
  // PARTY SELECT
  // ============================================================
  const handlePartySelect = (
    partyId: number
  ) => {
    setSelectedParties((prev) =>
      prev.includes(partyId)
        ? prev.filter(
            (id) => id !== partyId
          )
        : [...prev, partyId]
    )
  }

  // ============================================================
  // LOT SELECT
  // ============================================================
  const handleLotSelect = (
    lotNo: string
  ) => {
    setSelectedLots((prev) =>
      prev.includes(lotNo)
        ? prev.filter(
            (lot) => lot !== lotNo
          )
        : [...prev, lotNo]
    )
  }

  // ============================================================
  // ITEM SELECT
  // ============================================================
  const handleItemSelect = (
    item: string
  ) => {
    setSelectedItems((prev) =>
      prev.includes(item)
        ? prev.filter(
            (i) => i !== item
          )
        : [...prev, item]
    )
  }

  // ============================================================
  // SELECT ALL PARTIES
  // ============================================================
  const handleSelectAllParties = () => {
    if (
      selectedParties.length ===
      parties.length
    ) {
      setSelectedParties([])
    } else {
      setSelectedParties(
        parties.map(
          (party) => party.id
        )
      )
    }
  }

  // ============================================================
  // SELECT ALL LOTS
  // ============================================================
  const handleSelectAllLots = () => {
    if (selectedParties.length === 0 || lots.length === 0) {
      return
    }

    if (
      selectedLots.length ===
      lots.length
    ) {
      setSelectedLots([])
    } else {
      setSelectedLots([...lots])
    }
  }

  // ============================================================
  // SELECT ALL ITEMS
  // ============================================================
  const handleSelectAllItems = () => {
    if (selectedLots.length === 0 || items.length === 0) {
      return
    }

    if (
      selectedItems.length ===
      items.length
    ) {
      setSelectedItems([])
    } else {
      setSelectedItems([...items])
    }
  }

  // ============================================================
  // DATE NORMALIZE
  // ============================================================
  const normalizeDate = (
    value: any
  ) => {
    if (!value) {
      return null
    }

    const date = new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null
    }

    date.setHours(
      0,
      0,
      0,
      0
    )

    return date
  }

  // ============================================================
  // DATE FILTER
  // ============================================================
  const isWithinDateRange = (
    value: any
  ) => {
    if (
      !fromDate &&
      !toDate
    ) {
      return true
    }

    const recordDate =
      normalizeDate(value)

    if (!recordDate) {
      return false
    }

    if (fromDate) {
      const from =
        normalizeDate(fromDate)

      if (
        from &&
        recordDate < from
      ) {
        return false
      }
    }

    if (toDate) {
      const to =
        normalizeDate(toDate)

      if (to) {
        to.setHours(
          23,
          59,
          59,
          999
        )

        if (
          recordDate > to
        ) {
          return false
        }
      }
    }

    return true
  }

  // ============================================================
  // SHOW REPORT
  // ============================================================
  const handleShow = async () => {
    // Party mandatory
    if (
      selectedParties.length === 0
    ) {
      Swal.fire(
        "Warning",
        "Please select at least one party",
        "warning"
      )

      return
    }

    // Report type mandatory
    if (!reportType) {
      Swal.fire(
        "Warning",
        "Please select Lot Wise or Item Wise report",
        "warning"
      )

      return
    }

    try {
      setLoading(true)

      const [
        outwardRes,
        inwardRes,
      ] = await Promise.all([
        api.get(
          "/dyeing-outward"
        ),
        api.get(
          "/dyeing-inward"
        ),
      ])

      const outwardData =
        Array.isArray(
          outwardRes.data
        )
          ? outwardRes.data
          : []

      const inwardData =
        Array.isArray(
          inwardRes.data
        )
          ? inwardRes.data
          : []

      const partyNames =
        selectedPartyNames

      // ========================================================
      // FILTER OUTWARD
      // ========================================================
      const filteredOutward =
        outwardData.filter(
          (outward: any) => {
            const partyName =
              String(
                outward.partyName ||
                  ""
              ).trim()

            return (
              partyNames.includes(
                partyName
              ) &&
              isWithinDateRange(
                outward.dated
              )
            )
          }
        )

      // ========================================================
      // FILTER INWARD
      // ========================================================
      const filteredInward =
        inwardData.filter(
          (inward: any) => {
            const partyName =
              String(
                inward.partyName ||
                  ""
              ).trim()

            return (
              partyNames.includes(
                partyName
              ) &&
              isWithinDateRange(
                inward.dated
              )
            )
          }
        )

      // ========================================================
      // MAP
      // Party + Lot + Item
      // ========================================================
      const map = new Map<
        string,
        {
          lotNo: string
          itemName: string
          partyName: string
          outwardRolls: number
          inwardRolls: number
          outwardWeight: number
          inwardWeight: number
        }
      >()

      const makeKey = (
        lotNo: string,
        itemName: string,
        partyName: string
      ) =>
        `${partyName}|||${lotNo}|||${itemName}`

      // ========================================================
      // OUTWARD
      // ========================================================
      filteredOutward.forEach(
        (outward: any) => {
          if (
            !Array.isArray(
              outward.rows
            )
          ) {
            return
          }

          outward.rows.forEach(
            (row: any) => {
              const lotNo =
                String(
                  row.lotNo || ""
                ).trim()

              const itemName =
                String(
                  row.fabricName ||
                    ""
                ).trim()

              const partyName =
                String(
                  outward.partyName ||
                    ""
                ).trim()

              if (
                !lotNo ||
                !itemName
              ) {
                return
              }

              // Lot optional
              if (
                selectedLots.length >
                  0 &&
                !selectedLots.includes(
                  lotNo
                )
              ) {
                return
              }

              // Item optional
              if (
                selectedItems.length >
                  0 &&
                !selectedItems.includes(
                  itemName
                )
              ) {
                return
              }

              const key =
                makeKey(
                  lotNo,
                  itemName,
                  partyName
                )

              if (!map.has(key)) {
                map.set(key, {
                  lotNo,
                  itemName,
                  partyName,
                  outwardRolls: 0,
                  inwardRolls: 0,
                  outwardWeight: 0,
                  inwardWeight: 0,
                })
              }

              const current =
                map.get(key)!

              current.outwardRolls +=
                Number.parseFloat(
                  row.roll
                ) || 0

              current.outwardWeight +=
                Number.parseFloat(
                  row.weight
                ) || 0
            }
          )
        }
      )

      // ========================================================
      // INWARD
      // ========================================================
      filteredInward.forEach(
        (inward: any) => {
          if (
            !Array.isArray(
              inward.rows
            )
          ) {
            return
          }

          inward.rows.forEach(
            (row: any) => {
              const lotNo =
                String(
                  row.fabricLotNo ||
                    ""
                ).trim()

              const itemName =
                String(
                  row.fabric || ""
                ).trim()

              const partyName =
                String(
                  inward.partyName ||
                    ""
                ).trim()

              if (
                !lotNo ||
                !itemName
              ) {
                return
              }

              // Lot optional
              if (
                selectedLots.length >
                  0 &&
                !selectedLots.includes(
                  lotNo
                )
              ) {
                return
              }

              // Item optional
              if (
                selectedItems.length >
                  0 &&
                !selectedItems.includes(
                  itemName
                )
              ) {
                return
              }

              const key =
                makeKey(
                  lotNo,
                  itemName,
                  partyName
                )

              if (!map.has(key)) {
                map.set(key, {
                  lotNo,
                  itemName,
                  partyName,
                  outwardRolls: 0,
                  inwardRolls: 0,
                  outwardWeight: 0,
                  inwardWeight: 0,
                })
              }

              const current =
                map.get(key)!

              current.inwardRolls +=
                Number.parseFloat(
                  row.rolls
                ) || 0

              current.inwardWeight +=
                Number.parseFloat(
                  row.weight
                ) || 0
            }
          )
        }
      )

      // ========================================================
      // BALANCE
      // ========================================================
      const balances: LotBalance[] =
        []

      map.forEach(
        (value) => {
          balances.push({
            lotNo:
              value.lotNo,

            itemName:
              value.itemName,

            partyName:
              value.partyName,

            outwardRolls:
              value.outwardRolls,

            inwardRolls:
              value.inwardRolls,

            outstandingRolls:
              value.outwardRolls -
              value.inwardRolls,

            outwardWeight:
              value.outwardWeight,

            inwardWeight:
              value.inwardWeight,

            outstandingWeight:
              value.outwardWeight -
              value.inwardWeight,
          })
        }
      )

      balances.sort(
        (a, b) => {
          const partyCompare =
            a.partyName.localeCompare(
              b.partyName
            )

          if (
            partyCompare !== 0
          ) {
            return partyCompare
          }

          const lotCompare =
            a.lotNo.localeCompare(
              b.lotNo
            )

          if (
            lotCompare !== 0
          ) {
            return lotCompare
          }

          return a.itemName.localeCompare(
            b.itemName
          )
        }
      )

      setBalanceData(
        balances
      )

      setShowModal(true)
    } catch (error) {
      console.error(
        "Error fetching outstanding:",
        error
      )

      Swal.fire(
        "Error",
        "Failed to fetch outstanding report",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // ITEM WISE SUMMARY
  // ============================================================
  const itemWiseData =
    useMemo<LotBalance[]>(
      () => {
        const map =
          new Map<
            string,
            LotBalance
          >()

        balanceData.forEach(
          (row) => {
            const key =
              `${row.partyName}|||${row.itemName}`

            if (!map.has(key)) {
              map.set(key, {
                lotNo:
                  "ALL",

                itemName:
                  row.itemName,

                partyName:
                  row.partyName,

                outwardRolls: 0,
                inwardRolls: 0,
                outstandingRolls: 0,

                outwardWeight: 0,
                inwardWeight: 0,
                outstandingWeight: 0,
              })
            }

            const current =
              map.get(key)!

            current.outwardRolls +=
              row.outwardRolls

            current.inwardRolls +=
              row.inwardRolls

            current.outstandingRolls +=
              row.outstandingRolls

            current.outwardWeight +=
              row.outwardWeight

            current.inwardWeight +=
              row.inwardWeight

            current.outstandingWeight +=
              row.outstandingWeight
          }
        )

        return Array.from(
          map.values()
        ).sort(
          (a, b) => {
            const partyCompare =
              a.partyName.localeCompare(
                b.partyName
              )

            if (
              partyCompare !== 0
            ) {
              return partyCompare
            }

            return a.itemName.localeCompare(
              b.itemName
            )
          }
        )
      },
      [balanceData]
    )

  // ============================================================
  // CURRENT DISPLAY DATA
  // ============================================================
  const displayData =
    reportType === "item"
      ? itemWiseData
      : balanceData

  // ============================================================
  // SEARCH FILTERS
  // ============================================================
  const filteredLots =
    useMemo(
      () =>
        lots.filter(
          (lot) =>
            lot
              .toLowerCase()
              .includes(
                lotSearch
                  .toLowerCase()
                  .trim()
              )
        ),
      [lots, lotSearch]
    )

  const filteredItems =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item
              .toLowerCase()
              .includes(
                itemSearch
                  .toLowerCase()
                  .trim()
              )
        ),
      [items, itemSearch]
    )

  const filteredParties =
    useMemo(
      () =>
        parties.filter(
          (party) =>
            party.partyName
              .toLowerCase()
              .includes(
                partySearch
                  .toLowerCase()
                  .trim()
              )
        ),
      [parties, partySearch]
    )

  // ============================================================
  // TOTALS
  // ============================================================
  const totalOutwardRolls =
    displayData.reduce(
      (sum, row) =>
        sum +
        row.outwardRolls,
      0
    )

  const totalInwardRolls =
    displayData.reduce(
      (sum, row) =>
        sum +
        row.inwardRolls,
      0
    )

  const totalOutstandingRolls =
    displayData.reduce(
      (sum, row) =>
        sum +
        row.outstandingRolls,
      0
    )

  const totalOutwardWeight =
    displayData.reduce(
      (sum, row) =>
        sum +
        row.outwardWeight,
      0
    )

  const totalInwardWeight =
    displayData.reduce(
      (sum, row) =>
        sum +
        row.inwardWeight,
      0
    )

  const totalOutstandingWeight =
    displayData.reduce(
      (sum, row) =>
        sum +
        row.outstandingWeight,
      0
    )

  // ============================================================
  // PRINT REPORT
  // ============================================================
  const handlePrint = () => {
    const reportTitle =
      reportType === "lot"
        ? "Dyeing Lot Wise Outstanding Report"
        : "Dyeing Item Wise Outstanding Report"

    const rowsHtml =
      displayData
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>

              ${
                reportType === "lot"
                  ? `<td>${row.lotNo}</td>`
                  : ""
              }

              <td>${row.itemName}</td>
              <td>${row.partyName}</td>

              <td class="right">
                ${row.outwardRolls}
              </td>

              <td class="right">
                ${row.inwardRolls}
              </td>

              <td class="right bold">
                ${row.outstandingRolls}
              </td>

              <td class="right">
                ${row.outwardWeight.toFixed(
                  3
                )}
              </td>

              <td class="right">
                ${row.inwardWeight.toFixed(
                  3
                )}
              </td>

              <td class="right bold">
                ${row.outstandingWeight.toFixed(
                  3
                )}
              </td>
            </tr>
          `
        )
        .join("")

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=800"
      )

    if (!printWindow) {
      Swal.fire(
        "Error",
        "Please allow popup window for printing",
        "error"
      )

      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #000;
            }

            h1 {
              text-align: center;
              font-size: 22px;
              margin-bottom: 5px;
            }

            .subtitle {
              text-align: center;
              font-size: 13px;
              margin-bottom: 15px;
            }

            .filters {
              font-size: 12px;
              margin-bottom: 15px;
              border: 1px solid #999;
              padding: 8px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }

            th {
              background: #e5e7eb;
              border: 1px solid #333;
              padding: 6px;
              text-align: center;
            }

            td {
              border: 1px solid #555;
              padding: 6px;
            }

            .right {
              text-align: right;
            }

            .bold {
              font-weight: bold;
            }

            tfoot td {
              background: #e5e7eb;
              font-weight: bold;
            }

            @media print {
              body {
                margin: 10mm;
              }

              @page {
                size: landscape;
                margin: 10mm;
              }
            }
          </style>
        </head>

        <body>

          <h1>${reportTitle}</h1>

          <div class="subtitle">
            Outstanding = Outward - Inward
          </div>

          <div class="filters">
            <b>Party:</b>
            ${
              selectedPartyNames.length
                ? selectedPartyNames.join(
                    ", "
                  )
                : "All"
            }

            &nbsp;&nbsp;&nbsp;

            <b>From:</b>
            ${
              fromDate || "-"
            }

            &nbsp;&nbsp;&nbsp;

            <b>To:</b>
            ${
              toDate || "-"
            }

            &nbsp;&nbsp;&nbsp;

            <b>Lots:</b>
            ${
              selectedLots.length
                ? selectedLots.join(
                    ", "
                  )
                : "All"
            }

            &nbsp;&nbsp;&nbsp;

            <b>Items:</b>
            ${
              selectedItems.length
                ? selectedItems.join(
                    ", "
                  )
                : "All"
            }
          </div>

          <table>
            <thead>
              <tr>
                <th>S No</th>

                ${
                  reportType === "lot"
                    ? "<th>LOT NO</th>"
                    : ""
                }

                <th>ITEM NAME</th>
                <th>PARTY NAME</th>

                <th>OUTWARD ROLLS</th>
                <th>INWARD ROLLS</th>
                <th>OUTSTANDING ROLLS</th>

                <th>OUTWARD WEIGHT</th>
                <th>INWARD WEIGHT</th>
                <th>OUTSTANDING WEIGHT</th>
              </tr>
            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>

            <tfoot>
              <tr>

                <td
                  colspan="${
                    reportType === "lot"
                      ? 4
                      : 3
                  }"
                  style="text-align:right"
                >
                  TOTAL:
                </td>

                <td class="right">
                  ${totalOutwardRolls}
                </td>

                <td class="right">
                  ${totalInwardRolls}
                </td>

                <td class="right">
                  ${totalOutstandingRolls}
                </td>

                <td class="right">
                  ${totalOutwardWeight.toFixed(
                    3
                  )}
                </td>

                <td class="right">
                  ${totalInwardWeight.toFixed(
                    3
                  )}
                </td>

                <td class="right">
                  ${totalOutstandingWeight.toFixed(
                    3
                  )}
                </td>

              </tr>
            </tfoot>
          </table>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>

        </body>
      </html>
    `)

    printWindow.document.close()
  }

  // ============================================================
  // EXIT
  // ============================================================
  const handleExit = () => {
    setSelectedParties([])
    setSelectedLots([])
    setSelectedItems([])

    setLotSearch("")
    setItemSearch("")
    setPartySearch("")

    setFromDate("")
    setToDate("")

    setReportType("")

    setBalanceData([])

    setShowModal(false)
  }

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">

        <div className="bg-white p-6 rounded-lg shadow-md max-w-7xl mx-auto">

          {/* ==================================================
              HEADER
          ================================================== */}
          <div className="bg-green-500 text-white text-center py-2 rounded mb-6">
            <h2 className="text-xl font-bold">
              Dyeing Outstanding Report
            </h2>
          </div>

          {/* ==================================================
              DATE FILTER
          ================================================== */}
          <div className="grid grid-cols-2 gap-4 mb-6">

            <div>
              <label className="block text-sm font-semibold mb-2">
                From
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                To
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
              />
            </div>

          </div>

          {/* ==================================================
              FILTERS
          ================================================== */}
          <div className="grid grid-cols-4 gap-4 mb-6">

            {/* =================================================
                PARTY
            ================================================= */}
            <div className="border rounded p-3">

              <div className="font-semibold text-center mb-2 bg-blue-100 py-1">
                Select Party Name *
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={partySearch}
                  onChange={(e) =>
                    setPartySearch(
                      e.target.value
                    )
                  }
                  placeholder="Search Party Name..."
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="border rounded h-48 overflow-auto bg-white">

                {parties.length ===
                0 ? (
                  <div className="text-center text-gray-500 p-4">
                    No parties available
                  </div>
                ) : filteredParties.length ===
                  0 ? (
                  <div className="text-center text-gray-500 p-4">
                    No matching party found
                  </div>
                ) : (
                  filteredParties.map(
                    (party) => (
                      <div
                        key={party.id}
                        className={`px-2 py-1 cursor-pointer hover:bg-gray-100 ${
                          selectedParties.includes(
                            party.id
                          )
                            ? "bg-blue-500 text-white"
                            : ""
                        }`}
                        onClick={() =>
                          handlePartySelect(
                            party.id
                          )
                        }
                      >
                        {selectedParties.includes(
                          party.id
                        )
                          ? "☑"
                          : "☐"}{" "}
                        {
                          party.partyName
                        }
                      </div>
                    )
                  )
                )}

              </div>

              <button
                onClick={
                  handleSelectAllParties
                }
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {selectedParties.length ===
                parties.length
                  ? "Unselect All"
                  : "Select/Unselect All"}
              </button>

            </div>

            {/* =================================================
                LOT
            ================================================= */}
            <div className="border rounded p-3">

              <div className="font-semibold text-center mb-2 bg-green-100 py-1">
                Select Lot No
                <span className="text-xs font-normal">
                  {" "}
                  (Optional)
                </span>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={lotSearch}
                  onChange={(e) =>
                    setLotSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search Lot No..."
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div className="border rounded h-48 overflow-auto bg-white">

                {selectedParties.length === 0 ? (
                  <div className="text-center text-gray-500 p-4">
                    First select Party Name
                  </div>
                ) : lots.length === 0 ? (
                  <div className="text-center text-gray-500 p-4">
                    No lots available for selected party
                  </div>
                ) : filteredLots.length ===
                  0 ? (
                  <div className="text-center text-gray-500 p-4">
                    No matching lot found
                  </div>
                ) : (
                  filteredLots.map(
                    (
                      lot,
                      index
                    ) => (
                      <div
                        key={index}
                        className={`px-2 py-1 cursor-pointer hover:bg-gray-100 ${
                          selectedLots.includes(
                            lot
                          )
                            ? "bg-green-500 text-white"
                            : ""
                        }`}
                        onClick={() =>
                          handleLotSelect(
                            lot
                          )
                        }
                      >
                        {selectedLots.includes(
                          lot
                        )
                          ? "☑"
                          : "☐"}{" "}
                        {lot}
                      </div>
                    )
                  )
                )}

              </div>

              <button
                onClick={
                  handleSelectAllLots
                }
                disabled={
                  selectedParties.length === 0 ||
                  lots.length === 0
                }
                className="text-xs text-blue-600 hover:underline mt-1 disabled:text-gray-400"
              >
                {selectedLots.length ===
                lots.length
                  ? "Unselect All"
                  : "Select/Unselect All"}
              </button>

            </div>

            {/* =================================================
                ITEM
            ================================================= */}
            <div className="border rounded p-3">

              <div className="font-semibold text-center mb-2 bg-purple-100 py-1">
                Select Fabric Name
                <span className="text-xs font-normal">
                  {" "}
                  (Optional)
                </span>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) =>
                    setItemSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search Fabric Name..."
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="border rounded h-48 overflow-auto bg-white">

                {selectedLots.length === 0 ? (
                  <div className="text-center text-gray-500 p-4">
                    First select Lot No
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center text-gray-500 p-4">
                    No items available for selected lot
                  </div>
                ) : filteredItems.length ===
                  0 ? (
                  <div className="text-center text-gray-500 p-4">
                    No matching item found
                  </div>
                ) : (
                  filteredItems.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={index}
                        className={`px-2 py-1 cursor-pointer hover:bg-gray-100 ${
                          selectedItems.includes(
                            item
                          )
                            ? "bg-purple-500 text-white"
                            : ""
                        }`}
                        onClick={() =>
                          handleItemSelect(
                            item
                          )
                        }
                      >
                        {selectedItems.includes(
                          item
                        )
                          ? "☑"
                          : "☐"}{" "}
                        {item}
                      </div>
                    )
                  )
                )}

              </div>

              <button
                onClick={
                  handleSelectAllItems
                }
                disabled={
                  items.length === 0
                }
                className="text-xs text-blue-600 hover:underline mt-1 disabled:text-gray-400"
              >
                {selectedItems.length ===
                  items.length &&
                items.length > 0
                  ? "Unselect All"
                  : "Select/Unselect All"}
              </button>

            </div>

            {/* =================================================
                REPORT TYPE
            ================================================= */}
            <div className="border rounded p-3 bg-gray-50">

              <div className="font-semibold text-center mb-3 bg-yellow-100 py-1">
                Select Report Type *
              </div>

              <div className="space-y-3">

                {/* LOT WISE */}
                <button
                  type="button"
                  onClick={() =>
                    setReportType(
                      "lot"
                    )
                  }
                  className={`w-full px-4 py-3 rounded border-2 font-semibold transition ${
                    reportType ===
                    "lot"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
                  }`}
                >
                  <div className="text-base">
                    {reportType ===
                    "lot"
                      ? "● "
                      : "○ "}
                    Lot Wise
                  </div>

                  <div className="text-xs font-normal mt-1">
                    Lot + Item Details
                  </div>
                </button>

                {/* ITEM WISE */}
                <button
                  type="button"
                  onClick={() =>
                    setReportType(
                      "item"
                    )
                  }
                  className={`w-full px-4 py-3 rounded border-2 font-semibold transition ${
                    reportType ===
                    "item"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-green-50"
                  }`}
                >
                  <div className="text-base">
                    {reportType ===
                    "item"
                      ? "● "
                      : "○ "}
                    Item Wise
                  </div>

                  <div className="text-xs font-normal mt-1">
                    Item Summary
                  </div>
                </button>

              </div>

              <div className="mt-3 text-xs text-gray-600">
                Report type select karke
                <b> Show</b> button dabaye.
              </div>

            </div>

          </div>

          {/* ==================================================
              SELECTION INFO
          ================================================== */}
          <div className="border rounded p-3 bg-gray-50 mb-5">

            <div className="font-semibold mb-2">
              Current Selection
            </div>

            <div className="grid grid-cols-4 gap-4 text-sm">

              <div>
                <b>Parties:</b>{" "}
                {selectedParties.length}
              </div>

              <div>
                <b>Lots:</b>{" "}
                {selectedLots.length ||
                  "All"}
              </div>

              <div>
                <b>Items:</b>{" "}
                {selectedItems.length ||
                  "All"}
              </div>

              <div>
                <b>Report:</b>{" "}
                {reportType ===
                "lot"
                  ? "Lot Wise"
                  : reportType ===
                    "item"
                  ? "Item Wise"
                  : "Not Selected"}
              </div>

            </div>

          </div>

          {/* ==================================================
              SHOW / EXIT
          ================================================== */}
          <div className="flex justify-center gap-4">

            <button
              onClick={handleShow}
              disabled={loading}
              className="px-10 py-2 bg-blue-600 text-white border-2 border-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {loading
                ? "Loading..."
                : "Show"}
            </button>

            <button
              onClick={handleExit}
              className="px-10 py-2 bg-white border-2 border-gray-400 rounded hover:bg-gray-100 font-semibold"
            >
              Exit
            </button>

          </div>

        </div>

        {/* ====================================================
            REPORT MODAL
        ==================================================== */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

            <div
              id="outstanding-report"
              className="bg-white rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-auto p-5"
            >

              {/* =================================================
                  REPORT HEADER
              ================================================= */}
              <div className="flex items-center justify-between mb-4">

                <div className="w-24">
                  {/* spacer */}
                </div>

                <h3 className="text-xl font-bold text-center">
                  {reportType ===
                  "lot"
                    ? "Lot Wise Outstanding Report"
                    : "Item Wise Outstanding Report"}
                </h3>

                <button
                  onClick={
                    handlePrint
                  }
                  disabled={
                    displayData.length ===
                    0
                  }
                  className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  🖨 Print
                </button>

              </div>

              <div className="text-sm text-gray-600 mb-4 text-center">
                <span className="font-semibold">
                  Outstanding =
                  Outward - Inward
                </span>
              </div>

              {/* =================================================
                  REPORT TYPE INFO
              ================================================= */}
              <div className="flex justify-center mb-4">

                <div
                  className={`px-5 py-2 rounded font-semibold ${
                    reportType ===
                    "lot"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  Report Type:{" "}
                  {reportType ===
                  "lot"
                    ? "Lot Wise"
                    : "Item Wise"}
                </div>

              </div>

              {/* =================================================
                  FILTER INFO
              ================================================= */}
              <div className="bg-gray-50 border rounded p-3 mb-4 text-sm">

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  <div>
                    <b>Party:</b>{" "}
                    {selectedPartyNames.join(
                      ", "
                    ) || "All"}
                  </div>

                  <div>
                    <b>From:</b>{" "}
                    {fromDate ||
                      "All"}
                  </div>

                  <div>
                    <b>To:</b>{" "}
                    {toDate ||
                      "All"}
                  </div>

                  <div>
                    <b>Lots:</b>{" "}
                    {selectedLots.length
                      ? selectedLots.length
                      : "All"}
                  </div>

                </div>

              </div>

              {/* =================================================
                  DATA
              ================================================= */}
              {displayData.length ===
              0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data available
                  for selected
                  filters
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full border-collapse text-sm">

                    <thead className="bg-blue-500 text-white">

                      <tr>

                        <th className="border border-blue-600 p-2">
                          S No
                        </th>

                        {reportType ===
                          "lot" && (
                          <th className="border border-blue-600 p-2">
                            LOT NO
                          </th>
                        )}

                        <th className="border border-blue-600 p-2">
                          ITEM NAME
                        </th>

                        <th className="border border-blue-600 p-2">
                          PARTY NAME
                        </th>

                        <th className="border border-blue-600 p-2 text-right">
                          OUTWARD ROLLS
                        </th>

                        <th className="border border-blue-600 p-2 text-right">
                          INWARD ROLLS
                        </th>

                        <th className="border border-blue-600 p-2 text-right">
                          OUTSTANDING ROLLS
                        </th>

                        <th className="border border-blue-600 p-2 text-right">
                          OUTWARD WEIGHT
                        </th>

                        <th className="border border-blue-600 p-2 text-right">
                          INWARD WEIGHT
                        </th>

                        <th className="border border-blue-600 p-2 text-right">
                          OUTSTANDING WEIGHT
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {displayData.map(
                        (
                          row,
                          index
                        ) => (
                          <tr
                            key={`${row.partyName}-${row.lotNo}-${row.itemName}-${index}`}
                            className="odd:bg-white even:bg-gray-50"
                          >

                            <td className="border border-gray-300 p-2 text-center">
                              {index +
                                1}
                            </td>

                            {reportType ===
                              "lot" && (
                              <td className="border border-gray-300 p-2 font-semibold">
                                {
                                  row.lotNo
                                }
                              </td>
                            )}

                            <td className="border border-gray-300 p-2">
                              {
                                row.itemName
                              }
                            </td>

                            <td className="border border-gray-300 p-2">
                              {
                                row.partyName
                              }
                            </td>

                            <td className="border border-gray-300 p-2 text-right">
                              {
                                row.outwardRolls
                              }
                            </td>

                            <td className="border border-gray-300 p-2 text-right">
                              {
                                row.inwardRolls
                              }
                            </td>

                            <td
                              className={`border border-gray-300 p-2 text-right font-bold ${
                                row.outstandingRolls <
                                0
                                  ? "text-red-600"
                                  : "text-green-700"
                              }`}
                            >
                              {
                                row.outstandingRolls
                              }
                            </td>

                            <td className="border border-gray-300 p-2 text-right">
                              {row.outwardWeight.toFixed(
                                3
                              )}
                            </td>

                            <td className="border border-gray-300 p-2 text-right">
                              {row.inwardWeight.toFixed(
                                3
                              )}
                            </td>

                            <td
                              className={`border border-gray-300 p-2 text-right font-bold ${
                                row.outstandingWeight <
                                0
                                  ? "text-red-600"
                                  : "text-green-700"
                              }`}
                            >
                              {row.outstandingWeight.toFixed(
                                3
                              )}
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                    <tfoot className="bg-gray-200 font-bold">

                      <tr>

                        <td
                          colSpan={
                            reportType ===
                            "lot"
                              ? 4
                              : 3
                          }
                          className="border border-gray-300 p-2 text-right"
                        >
                          TOTAL:
                        </td>

                        <td className="border border-gray-300 p-2 text-right">
                          {
                            totalOutwardRolls
                          }
                        </td>

                        <td className="border border-gray-300 p-2 text-right">
                          {
                            totalInwardRolls
                          }
                        </td>

                        <td className="border border-gray-300 p-2 text-right">
                          {
                            totalOutstandingRolls
                          }
                        </td>

                        <td className="border border-gray-300 p-2 text-right">
                          {totalOutwardWeight.toFixed(
                            3
                          )}
                        </td>

                        <td className="border border-gray-300 p-2 text-right">
                          {totalInwardWeight.toFixed(
                            3
                          )}
                        </td>

                        <td className="border border-gray-300 p-2 text-right">
                          {totalOutstandingWeight.toFixed(
                            3
                          )}
                        </td>

                      </tr>

                    </tfoot>

                  </table>

                </div>
              )}

              {/* =================================================
                  MODAL BUTTONS
              ================================================= */}
              <div className="flex justify-center gap-4 mt-6">

                <button
                  onClick={
                    handlePrint
                  }
                  disabled={
                    displayData.length ===
                    0
                  }
                  className="px-7 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  🖨 Print
                </button>

                <button
                  onClick={() =>
                    setShowModal(
                      false
                    )
                  }
                  className="px-7 py-2 bg-gray-300 hover:bg-gray-400 rounded font-semibold"
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

export default DyeingItemWiseOutstanding

