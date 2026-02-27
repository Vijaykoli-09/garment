"use client"

import React, { useState, useEffect } from "react"
import Dashboard from "../../Dashboard"
import api from "../../../api/axiosInstance"
import Swal from "sweetalert2"

interface Party {
  id: number
  partyName: string
}

interface ItemBalance {
  itemName: string
  rolls: number
  weight: number
}

const DyeingItemWiseOutstanding: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([])
  const [items, setItems] = useState<string[]>([])
  const [shades, setShades] = useState<string[]>([])
  
  const [selectedParties, setSelectedParties] = useState<number[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedShades, setSelectedShades] = useState<string[]>([])
  
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  
  const [showModal, setShowModal] = useState(false)
  const [balanceData, setBalanceData] = useState<ItemBalance[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchParties()
    fetchItemsAndShades()
  }, [])

  const fetchParties = async () => {
    try {
      const response = await api.get("/party/category/Dyeing")
      setParties(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Error fetching parties:", error)
      Swal.fire("Error", "Failed to load parties", "error")
    }
  }

  const fetchItemsAndShades = async () => {
    try {
      const response = await api.get("/dyeing-outward")
      const outwardData = Array.isArray(response.data) ? response.data : []
      
      const itemSet = new Set<string>()
      const shadeSet = new Set<string>()
      
      outwardData.forEach((outward: any) => {
        if (Array.isArray(outward.rows)) {
          outward.rows.forEach((row: any) => {
            if (row.fabricName) itemSet.add(row.fabricName)
            if (row.shade) shadeSet.add(row.shade)
          })
        }
      })
      
      setItems(Array.from(itemSet).sort())
      setShades(Array.from(shadeSet).sort())
    } catch (error) {
      console.error("Error fetching items and shades:", error)
    }
  }

  const handlePartySelect = (partyId: number) => {
    setSelectedParties(prev => 
      prev.includes(partyId) 
        ? prev.filter(id => id !== partyId)
        : [...prev, partyId]
    )
  }

  const handleItemSelect = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    )
  }

  const handleShadeSelect = (shade: string) => {
    setSelectedShades(prev => 
      prev.includes(shade) 
        ? prev.filter(s => s !== shade)
        : [...prev, shade]
    )
  }

  const handleSelectAllParties = () => {
    if (selectedParties.length === parties.length) {
      setSelectedParties([])
    } else {
      setSelectedParties(parties.map(p => p.id))
    }
  }

  const handleSelectAllItems = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems([...items])
    }
  }

  const handleSelectAllShades = () => {
    if (selectedShades.length === shades.length) {
      setSelectedShades([])
    } else {
      setSelectedShades([...shades])
    }
  }

  const handleShow = async () => {
    if (selectedParties.length === 0) {
      Swal.fire("Warning", "Please select at least one party", "warning")
      return
    }

    try {
      setLoading(true)
      
      const [outwardRes, inwardRes] = await Promise.all([
        api.get("/dyeing-outward"),
        api.get("/dyeing-inward")
      ])

      const outwardData = Array.isArray(outwardRes.data) ? outwardRes.data : []
      const inwardData = Array.isArray(inwardRes.data) ? inwardRes.data : []

      const selectedPartyNames = parties
        .filter(p => selectedParties.includes(p.id))
        .map(p => p.partyName)

      // Filter outward by party and date range
      const filteredOutward = outwardData.filter((outward: any) => {
        const matchParty = selectedPartyNames.includes(outward.partyName)
        
        if (fromDate && toDate) {
          const outwardDate = new Date(outward.dated)
          const from = new Date(fromDate)
          const to = new Date(toDate)
          return matchParty && outwardDate >= from && outwardDate <= to
        }
        
        return matchParty
      })

      // Filter inward by party and date range
      const filteredInward = inwardData.filter((inward: any) => {
        const matchParty = selectedPartyNames.includes(inward.partyName)
        
        if (fromDate && toDate) {
          const inwardDate = new Date(inward.dated)
          const from = new Date(fromDate)
          const to = new Date(toDate)
          return matchParty && inwardDate >= from && inwardDate <= to
        }
        
        return matchParty
      })

      // Calculate item balances
      const itemMap = new Map<string, { rolls: number; weight: number }>()

      // Add outward (positive)
      filteredOutward.forEach((outward: any) => {
        if (Array.isArray(outward.rows)) {
          outward.rows.forEach((row: any) => {
            const itemName = row.fabricName || ""
            const shade = row.shade || ""
            
            // Apply item and shade filters
            if (selectedItems.length > 0 && !selectedItems.includes(itemName)) return
            if (selectedShades.length > 0 && !selectedShades.includes(shade)) return
            
            const key = itemName
            const rolls = parseFloat(row.roll) || 0
            const weight = parseFloat(row.weight) || 0
            
            if (!itemMap.has(key)) {
              itemMap.set(key, { rolls: 0, weight: 0 })
            }
            
            const current = itemMap.get(key)!
            current.rolls += rolls
            current.weight += weight
          })
        }
      })

      // Subtract inward (negative)
      filteredInward.forEach((inward: any) => {
        if (Array.isArray(inward.rows)) {
          inward.rows.forEach((row: any) => {
            const itemName = row.fabric || ""
            const shade = row.shade || ""
            
            // Apply item and shade filters
            if (selectedItems.length > 0 && !selectedItems.includes(itemName)) return
            if (selectedShades.length > 0 && !selectedShades.includes(shade)) return
            
            const key = itemName
            const rolls = parseFloat(row.rolls) || 0
            const weight = parseFloat(row.weight) || 0
            
            if (!itemMap.has(key)) {
              itemMap.set(key, { rolls: 0, weight: 0 })
            }
            
            const current = itemMap.get(key)!
            current.rolls -= rolls
            current.weight -= weight
          })
        }
      })

      // Convert to array
      const balances: ItemBalance[] = []
      itemMap.forEach((value, key) => {
        if (key) { // Only include items with names
          balances.push({
            itemName: key,
            rolls: value.rolls,
            weight: value.weight
          })
        }
      })

      // Sort by item name
      balances.sort((a, b) => a.itemName.localeCompare(b.itemName))

      setBalanceData(balances)
      setShowModal(true)
    } catch (error) {
      console.error("Error fetching balance data:", error)
      Swal.fire("Error", "Failed to fetch balance data", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleExit = () => {
    setSelectedParties([])
    setSelectedItems([])
    setSelectedShades([])
    setFromDate("")
    setToDate("")
    setBalanceData([])
  }

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto">
          <div className="bg-green-500 text-white text-center py-2 rounded mb-6">
            <h2 className="text-xl font-bold">Item Wise Balance</h2>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Selection Lists */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Item Selection */}
            <div className="border rounded p-3">
              <div className="font-semibold text-center mb-2 bg-gray-200 py-1">
                Select Item Name
              </div>
              <div className="border rounded h-48 overflow-auto bg-white">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 cursor-pointer hover:bg-gray-100 ${
                      selectedItems.includes(item) ? 'bg-blue-500 text-white' : ''
                    }`}
                    onClick={() => handleItemSelect(item)}
                  >
                    ☐ {item}
                  </div>
                ))}
              </div>
              <button
                onClick={handleSelectAllItems}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {selectedItems.length === items.length ? 'Unselect All' : 'Select/Unselect All'}
              </button>
            </div>

            {/* Shade Selection */}
            <div className="border rounded p-3">
              <div className="font-semibold text-center mb-2 bg-gray-200 py-1">
                Select Shade
              </div>
              <div className="border rounded h-48 overflow-auto bg-white">
                {shades.map((shade, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 cursor-pointer hover:bg-gray-100 ${
                      selectedShades.includes(shade) ? 'bg-blue-500 text-white' : ''
                    }`}
                    onClick={() => handleShadeSelect(shade)}
                  >
                    ☐ {shade}
                  </div>
                ))}
              </div>
              <button
                onClick={handleSelectAllShades}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {selectedShades.length === shades.length ? 'Unselect All' : 'Select/Unselect All'}
              </button>
            </div>

            {/* Party Selection */}
            <div className="border rounded p-3">
              <div className="font-semibold text-center mb-2 bg-gray-200 py-1">
                Select Party Name
              </div>
              <div className="border rounded h-48 overflow-auto bg-white">
                {parties.map((party) => (
                  <div
                    key={party.id}
                    className={`px-2 py-1 cursor-pointer hover:bg-gray-100 ${
                      selectedParties.includes(party.id) ? 'bg-blue-500 text-white' : ''
                    }`}
                    onClick={() => handlePartySelect(party.id)}
                  >
                    ☐ {party.partyName}
                  </div>
                ))}
              </div>
              <button
                onClick={handleSelectAllParties}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {selectedParties.length === parties.length ? 'Unselect All' : 'Select/Unselect All'}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleShow}
              disabled={loading}
              className="px-8 py-2 bg-white border-2 border-gray-400 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Show"}
            </button>
            <button
              onClick={handleExit}
              className="px-8 py-2 bg-white border-2 border-gray-400 rounded hover:bg-gray-100"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto p-5">
              <h3 className="text-xl font-bold text-center mb-4">Item Wise Balance Report</h3>
              
              <div className="text-sm text-gray-600 mb-4 text-center">
                <span className="font-semibold">Double Click to Sort Records</span>
              </div>

              {balanceData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data available for selected filters
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-blue-500 text-white">
                      <tr>
                        <th className="border border-blue-600 p-2 text-left">S No</th>
                        <th className="border border-blue-600 p-2 text-left">ITEM_NAME</th>
                        <th className="border border-blue-600 p-2 text-right">Rolls</th>
                        <th className="border border-blue-600 p-2 text-right">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceData.map((item, index) => (
                        <tr 
                          key={index}
                          className={index === 0 ? 'bg-blue-500 text-white' : 'odd:bg-white even:bg-gray-50'}
                        >
                          <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                          <td className="border border-gray-300 p-2">{item.itemName}</td>
                          <td className="border border-gray-300 p-2 text-right">{item.rolls}</td>
                          <td className="border border-gray-300 p-2 text-right">{item.weight.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-200 font-bold">
                      <tr>
                        <td colSpan={2} className="border border-gray-300 p-2 text-right">
                          TOTAL:
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {balanceData.reduce((sum, item) => sum + item.rolls, 0)}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {balanceData.reduce((sum, item) => sum + item.weight, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded"
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