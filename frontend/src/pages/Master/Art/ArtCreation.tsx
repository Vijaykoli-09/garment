import type React from "react"
import { useState, useEffect, useMemo } from "react"
import Dashboard from "../../Dashboard"
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2"

interface FormData {
  serialNumber: string
  artGroup: string
  artName: string
  artNo: string
  copyFromArtName: string
  styleRate: string
  saleRate: string
  styleName: string
  openingBalance: string
  brandName: string
  workOnArt: string
}

interface ArtListView {
  serialNumber: string
  artGroup: string
  artName: string
  artNo: string
  styleName: string
  season: string
  brandName: string
  saleRate: string
}

interface ArtDetailView {
  serialNumber: string
  artGroup: string
  artName: string
  artNo: string
  styleRate: string
  saleRate: string
  styleName: string
  season: string
  copyFromArtName: string
  openingBalance: string
  wtPcs: string
  reference: string
  brandName: string
  workOnArt: string
  processes: ProcessDetail[]
  shades: ShadeDetail[]
  sizes: SizeDetail[]
  sizeDetails?: SizeDetailWithBoxPcsRate[]
  accessories: AccessoryDetail[]
}

interface ProcessDetail {
  id: number
  sno: number
  processName: string
  rate: string
  rate1: string
  sizeWid: string
  sizeWidAct: string
  itemRef: string
  process: string
}

interface ShadeDetail {
  id: number
  shadeCode: string
  shadeName: string
  colorFamily: string
}

interface SizeDetail {
  id: number
  serialNo: string
  sizeName: string
  orderNo: string
  artGroup: string
}

interface AccessoryDetail {
  id: number
  materialId: number
  serialNumber: string
  materialGroupId: number
  materialGroupName: string
  materialName: string
  code: string
  materialUnit: string
  minimumStock: string
  maximumStock: string
}

interface ProcessRow {
  sno: number
  processName: string
  rate: string
  rate1: string
  sizeWid: string
  sizeWidAct: string
  itemRef: string
  process: string
}

interface ProcessFromCreation {
  serialNo: string
  processName: string
  category: string
}

interface ShadeFromCreation {
  shadeCode: string
  shadeName: string
  colorFamily: string
}

interface SizeFromCreation {
  id?: number
  serialNo: string
  sizeName: string
  orderNo: string
  artGroup?: string | { artGroupName?: string; [key: string]: any }
  box?: string
  pcs?: string
  rate?: string
}

interface MaterialFromCreation {
  id: number
  serialNumber: string
  materialGroupId: number
  materialGroupName: string
  materialName: string
  code: string
  materialUnit: string
  minimumStock: string
  maximumStock: string
}

interface ArtGroupFromCreation {
  serialNo: number
  artGroupName: string
  yearsToleranceFrom: string
  yearsToleranceTo: string
  seriesRangeStart: string
  seriesRangeEnd: string
}

interface AccessoryFromCreation {
  serialNumber: string
  processName: string
  materialName: string
}

interface AccessoryRowInModal {
  sno: number
  accessoryName: string
  qty: string
  rate: string
  amount: string
}
interface SizeDetailWithBoxPcsRate {
  id: number
  serialNo: string
  sizeName: string
  orderNo: string
  box: string
  pcs: string
  rate: string
}

const ArtCreationForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    serialNumber: "",
    artGroup: "",
    artName: "",
    artNo: "",
    copyFromArtName: "",
    styleRate: "",
    saleRate: "",
    styleName: "",
    openingBalance: "",
    brandName: "",
    workOnArt: "",
  })

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingArt, setEditingArt] = useState<ArtDetailView | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [artList, setArtList] = useState<ArtListView[]>([])
  const [artListForCopy, setArtListForCopy] = useState<ArtListView[]>([])
  const [processRows, setProcessRows] = useState<ProcessRow[]>([])
  const [availableProcesses, setAvailableProcesses] = useState<ProcessFromCreation[]>([])
  const [availableShades, setAvailableShades] = useState<ShadeFromCreation[]>([])
  const [selectedShades, setSelectedShades] = useState<ShadeFromCreation[]>([])
  const [availableSizes, setAvailableSizes] = useState<SizeFromCreation[]>([])
  const [selectedSizes, setSelectedSizes] = useState<SizeFromCreation[]>([])
  const [availableMaterials, setAvailableMaterials] = useState<MaterialFromCreation[]>([])
  const [selectedAccessories, setSelectedAccessories] = useState<MaterialFromCreation[]>([])
  const [availableArtGroups, setAvailableArtGroups] = useState<ArtGroupFromCreation[]>([])
  const [isAccessoriesModalOpen, setIsAccessoriesModalOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedProcessForAccessories, setSelectedProcessForAccessories] = useState<string>("")
  const [, setAccessoriesByProcess] = useState<AccessoryFromCreation[]>([])
  const [filteredMaterialsForProcess, setFilteredMaterialsForProcess] = useState<string[]>([])
  const [accessoryRowsInModal, setAccessoryRowsInModal] = useState<AccessoryRowInModal[]>([])
  const [isSizeModalOpen, setIsSizeModalOpen] = useState<boolean>(false)
const [currentSizeSelection, setCurrentSizeSelection] = useState<string>("")
const [sizeDetails, setSizeDetails] = useState({
  box: "",
  pcs: "",
  rate: ""
})
const [manualAccessoryInput, setManualAccessoryInput] = useState({
  name: "",
  qty: "",
  rate: ""
})

  useEffect(() => {
    loadArts()
    loadAvailableProcesses()
    loadAvailableShades()
    loadAvailableSizes()
    loadAvailableArtGroups()
    loadAvailableMaterials()
  }, [])

  useEffect(() => {
    if (!editingArt) {
      generateSerialNumber()
    }
  }, [editingArt])

  const totals = useMemo(() => {
    const totalRate = processRows.reduce((sum, row) => sum + (parseFloat(row.rate) || 0), 0)
    return { totalRate }
  }, [processRows])

  const filteredArtList = useMemo(() => {
  if (!searchQuery.trim()) {
    return artList
  }
  
  const query = searchQuery.toLowerCase().trim()
  return artList.filter(art => 
    art.artNo?.toLowerCase().includes(query) ||
    art.artName?.toLowerCase().includes(query) ||
    art.serialNumber?.toLowerCase().includes(query) ||
    art.artGroup?.toLowerCase().includes(query)
  )
}, [artList, searchQuery])

  const loadArts = async () => {
    try {
      setLoading(true)
      const response = await api.get<ArtListView[]>("/arts")
      setArtList(response.data)
      setArtListForCopy(response.data)
      console.log("Loaded arts (ListView):", response.data)
    } catch (error) {
      console.error("Failed to load arts:", error)
      setArtList([])
      setArtListForCopy([])
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load arts list",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadArtDetail = async (serialNumber: string): Promise<ArtDetailView | null> => {
    try {
      setLoading(true)
      const response = await api.get<ArtDetailView>(`/arts/${serialNumber}`)
      console.log("Loaded art detail:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed to load art detail:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load art details",
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleCopyFromArtChange = async (selectedArtName: string) => {
    if (!selectedArtName) {
      setFormData((prev) => ({ ...prev, copyFromArtName: "" }))
      return
    }
    console.log("========== COPY FROM ART SELECTED ==========")
    console.log("Selected Art Name:", selectedArtName)
    const selectedArt = artListForCopy.find((art) => art.artName === selectedArtName)
    if (selectedArt) {
      console.log("Found Art:", selectedArt)
      setFormData((prev) => ({ ...prev, copyFromArtName: selectedArtName }))
      const artDetail = await loadArtDetail(selectedArt.serialNumber)
      if (artDetail && artDetail.processes && artDetail.processes.length > 0) {
        console.log("Copying processes from art:", artDetail.processes.length)
        const copiedProcesses = artDetail.processes.map((p, index) => ({
          sno: index + 1,
          processName: p.processName || "",
          rate: p.rate || "",
          rate1: p.rate1 || "",
          sizeWid: p.sizeWid || "",
          sizeWidAct: p.sizeWidAct || "",
          itemRef: p.itemRef || "",
          process: p.process || "",
        }))
        setProcessRows(copiedProcesses)
        console.log("Copied processes:", copiedProcesses)
        Swal.fire({
          icon: "success",
          title: "Success",
          text: `Copied ${copiedProcesses.length} processes from ${selectedArtName}`,
          timer: 2000,
          showConfirmButton: false,
        })
      } else {
        console.log("No processes found in selected art")
        Swal.fire({
          icon: "info",
          title: "No Processes",
          text: "No processes found in the selected art",
        })
      }
    } else {
      console.log("Art not found in list")
    }
  }

  const loadAvailableProcesses = async () => {
    try {
      const response = await api.get("/process/list")
      setAvailableProcesses(response.data)
    } catch (error) {
      console.error("Failed to load available processes:", error)
      setAvailableProcesses([])
    }
  }

  const loadAvailableShades = async () => {
    try {
      const response = await api.get("/shade/list")
      setAvailableShades(response.data)
    } catch (error) {
      console.error("Failed to load available shades:", error)
      setAvailableShades([])
    }
  }

  const loadAvailableSizes = async () => {
    try {
      const response = await api.get("/sizes")
      setAvailableSizes(response.data)
    } catch (error) {
      console.error("Failed to load available sizes:", error)
      setAvailableSizes([])
    }
  }

  const loadAvailableMaterials = async () => {
    try {
      const response = await api.get("/materials")
      setAvailableMaterials(response.data)
    } catch (error) {
      console.error("Failed to load available materials:", error)
      setAvailableMaterials([])
    }
  }

  const loadAvailableArtGroups = async () => {
    try {
      const response = await api.get("/artgroup/list")
      setAvailableArtGroups(response.data)
    } catch (error) {
      console.error("Failed to load available art groups:", error)
      setAvailableArtGroups([])
    }
  }

  const loadAccessoriesByProcess = async (processName: string) => {
    try {
      const response = await api.get<AccessoryFromCreation[]>("/accessories/list")
      const filtered = response.data.filter((acc) => acc.processName === processName)
      setAccessoriesByProcess(filtered)
      const materialNames = filtered.map((acc) => acc.materialName)
      setFilteredMaterialsForProcess(materialNames)
    } catch (error) {
      console.error("Failed to load accessories by process:", error)
      setAccessoriesByProcess([])
      setFilteredMaterialsForProcess([])
    }
  }

  const saveArt = async (artData: any) => {
    try {
      setLoading(true)
      const response = await api.post<ArtDetailView>("/arts", artData)
      console.log("Art saved:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed to save art:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateArt = async (serialNumber: string, artData: any) => {
    try {
      setLoading(true)
      const response = await api.put<ArtDetailView>(`/arts/${serialNumber}`, artData)
      console.log("Art updated:", response.data)
      return response.data
    } catch (error) {
      console.error("Failed to update art:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteArtFromBackend = async (serialNumber: string) => {
    try {
      setLoading(true)
      await api.delete(`/arts/${serialNumber}`)
      console.log("Art deleted:", serialNumber)
    } catch (error) {
      console.error("Failed to delete art:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked as any) : value,
    }))
  }

  const handleSubmit = async () => {
    try {
      console.log("========== FRONTEND SUBMIT START ==========")
      if (!formData.serialNumber || !formData.artName) {
        Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: "Please fill in required fields: Serial Number and Art Name",
        })
        return
      }
      console.log("Form Data:", formData)
      console.log("Process Rows Count:", processRows.length)
      const requestPayload = {
        ...formData,
        processes: processRows.map((row) => ({
          sno: row.sno,
          processName: row.processName,
          rate: row.rate || "",
          rate1: row.rate1 || "",
          sizeWid: row.sizeWid || "",
          sizeWidAct: row.sizeWidAct || "",
          itemRef: row.itemRef || "",
          process: row.process || "",
        })),
        shades: selectedShades.map((shade) => ({
          shadeCode: shade.shadeCode,
          shadeName: shade.shadeName,
          colorFamily: shade.colorFamily,
        })),
  sizes: selectedSizes.map((size) => ({
  serialNo: size.serialNo,
  sizeName: size.sizeName,
  orderNo: size.orderNo,
})),
sizeDetails: selectedSizes.map((size) => ({
  serialNo: size.serialNo,
  sizeName: size.sizeName,
  orderNo: size.orderNo,
  box: size.box || "",
  pcs: size.pcs || "",
  rate: size.rate || "",
})),
        accessories: selectedAccessories.map((accessory) => ({
          materialId: accessory.id,
          serialNumber: accessory.serialNumber,
          materialGroupId: accessory.materialGroupId,
          materialGroupName: accessory.materialGroupName,
          materialName: accessory.materialName,
          code: accessory.code,
          materialUnit: accessory.materialUnit,
          minimumStock: accessory.minimumStock,
          maximumStock: accessory.maximumStock,
        })),
      }
      console.log("Request Payload:", JSON.stringify(requestPayload, null, 2))
      if (editingArt) {
        await updateArt(editingArt.serialNumber, requestPayload)
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Art updated successfully!",
          timer: 2000,
          showConfirmButton: false,
        })
      } else {
        await saveArt(requestPayload)
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Art created successfully!",
          timer: 2000,
          showConfirmButton: false,
        })
      }
      await loadArts()
      setFormData({
        serialNumber: "",
        artGroup: "",
        artName: "",
        artNo: "",
        copyFromArtName: "",
        styleRate: "",
        saleRate: "",
        styleName: "",
        openingBalance: "",
        brandName: "",
        workOnArt: "",
      })
      setProcessRows([])
      setSelectedShades([])
      setSelectedSizes([])
      setSelectedAccessories([])
      setEditingArt(null)
      console.log("========== FRONTEND SUBMIT END ==========")
    } catch (error) {
      console.error("Error saving art:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save art. Please try again.",
      })
    }
  }

  const handleArtListClick = async () => {
    await loadArts()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleEditArt = async (art: ArtListView) => {
    const artDetail = await loadArtDetail(art.serialNumber)
    if (artDetail) {
      setEditingArt(artDetail)
      setFormData({
        serialNumber: artDetail.serialNumber,
        artGroup: artDetail.artGroup,
        artName: artDetail.artName,
        artNo: artDetail.artNo,
        copyFromArtName: artDetail.copyFromArtName,
        styleRate: artDetail.styleRate,
        saleRate: artDetail.saleRate,
        styleName: artDetail.styleName,
        openingBalance: artDetail.openingBalance,
        brandName: artDetail.brandName,
        workOnArt: artDetail.workOnArt,
      })
      if (artDetail.processes && artDetail.processes.length > 0) {
        const loadedProcesses = artDetail.processes.map((p) => ({
          sno: p.sno,
          processName: p.processName || "",
          rate: p.rate || "",
          rate1: p.rate1 || "",
          sizeWid: p.sizeWid || "",
          sizeWidAct: p.sizeWidAct || "",
          itemRef: p.itemRef || "",
          process: p.process || "",
        }))
        setProcessRows(loadedProcesses)
      } else {
        setProcessRows([])
      }
      if (artDetail.shades && artDetail.shades.length > 0) {
        const loadedShades = artDetail.shades.map((s) => ({
          shadeCode: s.shadeCode,
          shadeName: s.shadeName,
          colorFamily: s.colorFamily,
        }))
        setSelectedShades(loadedShades)
      } else {
        setSelectedShades([])
      }
      // Load size details (box, pcs, rate) instead of just sizes
if (artDetail.sizeDetails && artDetail.sizeDetails.length > 0) {
  const loadedSizeDetails = artDetail.sizeDetails.map((s) => ({
    id: s.id,
    serialNo: s.serialNo,
    sizeName: s.sizeName,
    orderNo: s.orderNo,
    box: s.box || "",
    pcs: s.pcs || "",
    rate: s.rate || "",
  }))
  setSelectedSizes(loadedSizeDetails)
} else if (artDetail.sizes && artDetail.sizes.length > 0) {
  // Fallback to old sizes format if sizeDetails doesn't exist
  const loadedSizes = artDetail.sizes.map((s) => ({
    id: s.id,
    serialNo: s.serialNo,
    sizeName: s.sizeName,
    orderNo: s.orderNo,
    artGroup: s.artGroup,
    box: (s as any).box || "",
    pcs: (s as any).pcs || "",
    rate: (s as any).rate || "",
  }))
  setSelectedSizes(loadedSizes)
} else {
  setSelectedSizes([])
}
      if (artDetail.accessories && artDetail.accessories.length > 0) {
        const loadedAccessories = artDetail.accessories.map((a) => ({
          id: a.materialId,
          serialNumber: a.serialNumber,
          materialGroupId: a.materialGroupId,
          materialGroupName: a.materialGroupName,
          materialName: a.materialName,
          code: a.code,
          materialUnit: a.materialUnit,
          minimumStock: a.minimumStock,
          maximumStock: a.maximumStock,
        }))
        setSelectedAccessories(loadedAccessories)
      } else {
        setSelectedAccessories([])
      }
      setIsModalOpen(false)
    }
  }

  const handleDeleteArt = async (artToDelete: ArtListView) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this art?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    })
    if (result.isConfirmed) {
      try {
        await deleteArtFromBackend(artToDelete.serialNumber)
        await loadArts()
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Art deleted successfully!",
          timer: 2000,
          showConfirmButton: false,
        })
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to delete art. Please try again.",
        })
      }
    }
  }

  const handleEdit = () => {
    if (!editingArt) {
      Swal.fire({
        icon: "info",
        title: "No Art Selected",
        text: "No art selected for editing",
      })
      return
    }
    console.log("Editing mode for:", editingArt.artName)
  }

  const handleDelete = async () => {
    if (!editingArt) {
      Swal.fire({
        icon: "info",
        title: "No Art Selected",
        text: "No art selected for deletion",
      })
      return
    }
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete ${editingArt.artName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    })
    if (result.isConfirmed) {
      try {
        await deleteArtFromBackend(editingArt.serialNumber)
        await loadArts()
        setFormData({
          serialNumber: "",
          artGroup: "",
          artName: "",
          artNo: "",
          copyFromArtName: "",
          styleRate: "",
          saleRate: "",
          styleName: "",
          openingBalance: "",
          brandName: "",
          workOnArt: "",
        })
        setProcessRows([])
        setSelectedShades([])
        setSelectedSizes([])
        setSelectedAccessories([])
        setEditingArt(null)
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Art deleted successfully!",
          timer: 2000,
          showConfirmButton: false,
        })
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to delete art. Please try again.",
        })
      }
    }
  }

  const handleRemoveShade = (shadeCodeToRemove: string) => {
    setSelectedShades(selectedShades.filter((shade) => shade.shadeCode !== shadeCodeToRemove))
  }

  const handleRemoveSize = (serialNoToRemove: string) => {
    setSelectedSizes(selectedSizes.filter((size) => size.serialNo !== serialNoToRemove))
  }

  const handleRemoveAccessory = (idToRemove: number) => {
    setSelectedAccessories(selectedAccessories.filter((accessory) => accessory.id !== idToRemove))
  }

  const handleRemoveProcessRow = (index: number) => {
    const updatedRows = processRows.filter((_, i) => i !== index)
    const reindexedRows = updatedRows.map((row, i) => ({
      ...row,
      sno: i + 1,
    }))
    setProcessRows(reindexedRows)
  }

  const handleProcessRowChange = (index: number, field: keyof ProcessRow, value: string) => {
    const updatedRows = processRows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    setProcessRows(updatedRows)
  }

  const generateSerialNumber = () => {
    const prefix = "ART"
    const year = new Date().getFullYear()
    const unique = Math.floor(10000 + Math.random() * 90000).toString()
    const serial = `${prefix}${year}${unique}`
    setFormData((prev) => ({ ...prev, serialNumber: serial }))
    console.log("Generated Serial Number:", serial)
  }

  const handleOpenAccessoriesModal = () => {
  setIsAccessoriesModalOpen(true)
  setSelectedProcessForAccessories("")
  setAccessoriesByProcess([])
  setFilteredMaterialsForProcess([])
  setAccessoryRowsInModal([])
  setManualAccessoryInput({ name: "", qty: "", rate: "" }) // ADD THIS LINE
}

  const handleCloseAccessoriesModal = () => {
  setIsAccessoriesModalOpen(false)
  setSelectedProcessForAccessories("")
  setAccessoriesByProcess([])
  setFilteredMaterialsForProcess([])
  setAccessoryRowsInModal([])
  setManualAccessoryInput({ name: "", qty: "", rate: "" }) // ADD THIS LINE
}

  const handleProcessSelectionForAccessories = async (processName: string) => {
  setSelectedProcessForAccessories(processName)
  if (processName) {
    await loadAccessoriesByProcess(processName)
    setAccessoryRowsInModal([])
    setManualAccessoryInput({ name: "", qty: "", rate: "" }) // ADD THIS LINE
  } else {
    setAccessoriesByProcess([])
    setFilteredMaterialsForProcess([])
    setAccessoryRowsInModal([])
    setManualAccessoryInput({ name: "", qty: "", rate: "" }) // ADD THIS LINE
  }
}
  const handleAccessoryRowChange = (index: number, field: "qty" | "rate" | "amount", value: string) => {
    const updatedRows = accessoryRowsInModal.map((row, i) => {
      if (i === index) {
        const newRow = { ...row, [field]: value }
        if (field === "qty" || field === "rate") {
          const qty = Number.parseFloat(field === "qty" ? value : row.qty) || 0
          const rate = Number.parseFloat(field === "rate" ? value : row.rate) || 0
          newRow.amount = (qty * rate).toFixed(2)
        }
        return newRow
      }
      return row
    })
    setAccessoryRowsInModal(updatedRows)
  }

  const handleRemoveAccessoryRow = (index: number) => {
    const updatedRows = accessoryRowsInModal.filter((_, i) => i !== index)
    const reindexedRows = updatedRows.map((row, i) => ({
      ...row,
      sno: i + 1,
    }))
    setAccessoryRowsInModal(reindexedRows)
  }

  const handleSaveAccessoryFromModal = () => {
    let added = 0
    accessoryRowsInModal.forEach((row) => {
      const material = availableMaterials.find((m) => m.materialName === row.accessoryName)
      if (material && !selectedAccessories.find((acc) => acc.id === material.id)) {
        added += 1
        setSelectedAccessories((prev) => [...prev, material])
      } else if (!material) {
        // Handle manual entry (not in availableMaterials)
        const manualMaterial: MaterialFromCreation = {
          id: Date.now() + Math.random(), // Generate unique ID
          serialNumber: `MANUAL-${Date.now()}`,
          materialGroupId: 0,
          materialGroupName: "Manual Entry",
          materialName: row.accessoryName,
          code: "MANUAL",
          materialUnit: "PCS",
          minimumStock: "0",
          maximumStock: "0",
        }
        if (!selectedAccessories.find((acc) => acc.materialName === row.accessoryName)) {
          added += 1
          setSelectedAccessories((prev) => [...prev, manualMaterial])
        }
      }
    })
    if (added > 0) {
      Swal.fire({
        icon: "success",
        title: "Saved!",
        text: `Saved ${added} accessories.`,
        timer: 1500,
        showConfirmButton: false,
      })
    } else {
      Swal.fire({
        icon: "info",
        title: "No Changes",
        text: "No new accessories to save.",
        timer: 1200,
        showConfirmButton: false,
      })
    }
  }

  const handleAddAccessoryFromModal = () => {
    accessoryRowsInModal.forEach((row) => {
      const material = availableMaterials.find((m) => m.materialName === row.accessoryName)
      if (material && !selectedAccessories.find((acc) => acc.id === material.id)) {
        setSelectedAccessories((prev) => [...prev, material])
      } else if (!material) {
        // Handle manual entry (not in availableMaterials)
        const manualMaterial: MaterialFromCreation = {
          id: Date.now() + Math.random(), // Generate unique ID
          serialNumber: `MANUAL-${Date.now()}`,
          materialGroupId: 0,
          materialGroupName: "Manual Entry",
          materialName: row.accessoryName,
          code: "MANUAL",
          materialUnit: "PCS",
          minimumStock: "0",
          maximumStock: "0",
        }
        if (!selectedAccessories.find((acc) => acc.materialName === row.accessoryName)) {
          setSelectedAccessories((prev) => [...prev, manualMaterial])
        }
      }
    })
    Swal.fire({
      icon: "success",
      title: "Added!",
      text: `Added ${accessoryRowsInModal.length} accessories successfully!`,
      timer: 2000,
      showConfirmButton: false,
    })
    handleCloseAccessoriesModal()
  }

  const calculateTotal = () => {
    return accessoryRowsInModal.reduce((sum, row) => sum + (Number.parseFloat(row.amount) || 0), 0).toFixed(2)
  }
 const handleAddManualAccessory = () => {
  if (!manualAccessoryInput.name.trim()) {
    Swal.fire({
      icon: "warning",
      title: "Missing Name",
      text: "Please enter accessory name",
      timer: 2000,
      showConfirmButton: false,
    })
    return
  }

  const qty = parseFloat(manualAccessoryInput.qty) || 0
  const rate = parseFloat(manualAccessoryInput.rate) || 0
  const amount = (qty * rate).toFixed(2)

  const newRow: AccessoryRowInModal = {
    sno: accessoryRowsInModal.length + 1,
    accessoryName: manualAccessoryInput.name,
    qty: manualAccessoryInput.qty || "0",
    rate: manualAccessoryInput.rate || "0",
    amount: amount,
  }

  setAccessoryRowsInModal([...accessoryRowsInModal, newRow])
  setManualAccessoryInput({ name: "", qty: "", rate: "" })
  
  Swal.fire({
    icon: "success",
    title: "Added!",
    text: "Manual accessory added successfully!",
    timer: 1500,
    showConfirmButton: false,
  })
}

  // ... (rest of your component JSX remains the same)
  
  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "30px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  }

  const layoutStyle: React.CSSProperties = { display: "flex", gap: "20px" }
  const leftStyle: React.CSSProperties = { flex: 1 }
  const rightStyle: React.CSSProperties = { width: "260px" }

  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "17px",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap" as const,
  }

  const labelStyle: React.CSSProperties = { width: "180px", fontWeight: "bold" }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
    minWidth: "200px",
  }

  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: loading ? "not-allowed" : "pointer",
    backgroundColor: loading ? "#ccc" : "#007bff",
    color: "white",
    opacity: loading ? 0.6 : 1,
  }

  const smallButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    background: "#f7f7f7",
    cursor: "pointer",
  }

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  }

  const thtd: React.CSSProperties = {
    border: "1px solid #ccc",
    padding: "6px",
    textAlign: "left" as const,
  }

  const tableInputStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    background: "transparent",
    fontSize: "12px",
    padding: "2px",
  }

  const removeButtonStyle: React.CSSProperties = {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "10px",
    padding: "2px 6px",
  }

  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  }

  const modalStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    width: "90%",
    maxWidth: "900px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  }

  const modalHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
  }

  const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
  }

  const actionButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    margin: "0 2px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  }

  const editButtonStyle: React.CSSProperties = {
    ...actionButtonStyle,
    backgroundColor: "#28a745",
    color: "white",
  }

  const deleteButtonStyle: React.CSSProperties = {
    ...actionButtonStyle,
    backgroundColor: "#dc3545",
    color: "white",
  }
  const handleSizeSelect = (serialNo: string) => {
  if (!serialNo) return
  
  const selectedSize = availableSizes.find((size) => size.serialNo === serialNo)
  if (!selectedSize) return

  if (selectedSizes.find((size) => size.serialNo === selectedSize.serialNo)) {
    Swal.fire({
      icon: "info",
      title: "Already Selected",
      text: "This size is already selected!",
      timer: 2000,
      showConfirmButton: false,
    })
    return
  }

  setCurrentSizeSelection(serialNo)
  setIsSizeModalOpen(true)
  setSizeDetails({ box: "", pcs: "", rate: "" })
}

const handleSaveSize = () => {
  const selectedSize = availableSizes.find((size) => size.serialNo === currentSizeSelection)
  if (!selectedSize) return

  if (!sizeDetails.box || !sizeDetails.pcs || !sizeDetails.rate) {
    Swal.fire({
      icon: "warning",
      title: "Incomplete Data",
      text: "Please fill all fields: Box, Pcs, and Rate",
    })
    return
  }

  const newSize: SizeFromCreation = {
    ...selectedSize,
    box: sizeDetails.box,
    pcs: sizeDetails.pcs,
    rate: sizeDetails.rate
  }

  setSelectedSizes([...selectedSizes, newSize])
  setIsSizeModalOpen(false)
  setCurrentSizeSelection("")
  setSizeDetails({ box: "", pcs: "", rate: "" })
  
  Swal.fire({
    icon: "success",
    title: "Added!",
    text: `Size ${selectedSize.sizeName} added successfully!`,
    timer: 1500,
    showConfirmButton: false,
  })
}

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "15px" }}>
          ART CREATION{" "}
          {editingArt && <span style={{ fontSize: "14px", color: "#666" }}>(Editing: {editingArt.artName})</span>}
          {loading && <span style={{ fontSize: "12px", color: "#007bff", marginLeft: "10px" }}>Loading...</span>}
        </h2>

        <div style={layoutStyle}>
          <div style={leftStyle}>
            <div>
              <div style={formRowStyle}>
                <label style={labelStyle}>Serial Number</label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  style={{ ...inputStyle, maxWidth: "400px" }}
                  disabled={loading || !!editingArt}
                  title={editingArt ? "Serial Number cannot be changed during edit." : undefined}
                />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Art Group</label>
                <select
                  name="artGroup"
                  value={formData.artGroup}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      artGroup: e.target.value,
                    }))
                  }}
                  style={inputStyle}
                  disabled={loading}
                >
                  <option value="">Select Art Group...</option>
                  {Array.isArray(availableArtGroups) &&
                    availableArtGroups.map((artGroup) => {
                      if (!artGroup || typeof artGroup !== "object" || !artGroup.artGroupName) {
                        return null
                      }
                      return (
                        <option
                          key={artGroup.serialNo || Math.random().toString(36).substr(2, 9)}
                          value={artGroup.artGroupName}
                        >
                          {artGroup.artGroupName}
                        </option>
                      )
                    })}
                </select>
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Art No</label>
                <input
                  type="text"
                  name="artNo"
                  value={formData.artNo}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  name="artName"
                  value={formData.artName}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Copy From Art Name</label>
                <select
                  name="copyFromArtName"
                  value={formData.copyFromArtName}
                  onChange={(e) => handleCopyFromArtChange(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: "#e8f5e9" }}
                  disabled={loading}
                >
                  <option value="">Select Art </option>
                  {artListForCopy.map((art) => (
                    <option key={art.serialNumber} value={art.artName}>
                      {art.artName} ({art.artGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Opening Stock</label>
                <input
                  type="text"
                  name="styleRate"
                  value={formData.styleRate}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Sale Rate</label>
                <input
                  type="text"
                  name="saleRate"
                  value={formData.saleRate}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Style Name</label>
                <input
                  type="text"
                  name="styleName"
                  value={formData.styleName}
                  onChange={handleInputChange}
                  style={{ ...inputStyle, flex: 3 }}
                  disabled={loading}
                />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Opening Balance</label>
                <input
                  type="text"
                  name="openingBalance"
                  value={formData.openingBalance}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Brand Name</label>
                <input
                  type="text"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={formRowStyle}>
                {/* <label style={labelStyle}>Description.</label> */}
                {/* <input
                  type="text"
                  name="workOnArt"
                  value={formData.workOnArt}
                  onChange={handleInputChange}
                  style={inputStyle}
                  disabled={loading}
                /> */}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              <div style={{ fontWeight: "bold" }}>Supplier</div>
              {formData.copyFromArtName && (
                <div style={{ fontSize: "12px", color: "#4caf50", fontWeight: "bold" }}>
                  Processes copied from: {formData.copyFromArtName}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #ccc", borderRadius: 6, overflow: "hidden" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thtd}>Sno</th>
                    <th style={thtd}>Process Name</th>
                    <th style={thtd}>Rate</th>
                    <th style={thtd}>Rate1</th>
                    <th style={thtd}>Size Wis</th>
                    <th style={thtd}>Size Wis Act</th>
                    <th style={thtd}>Item Ref</th>
                    <th style={thtd}>Process</th>
                    <th style={thtd}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processRows.map((row, index) => (
                    <tr key={index}>
                      <td style={thtd}>{row.sno}</td>
                      <td style={{ ...thtd, background: "#ffe5e5" }}>
                        <select
                          value={row.processName}
                          onChange={(e) => handleProcessRowChange(index, "processName", e.target.value)}
                          style={{
                            ...tableInputStyle,
                            fontWeight: 600,
                            width: "100%",
                            padding: "4px",
                            border: "1px solid #ddd",
                            borderRadius: "3px",
                          }}
                        >
                          <option value="">Select Process...</option>
                          {availableProcesses.map((process) => (
                            <option key={process.serialNo} value={process.processName}>
                              {process.processName} ({process.category})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={thtd}>
                        <input
                          type="text"
                          value={row.rate}
                          onChange={(e) => handleProcessRowChange(index, "rate", e.target.value)}
                          style={tableInputStyle}
                          placeholder="Rate"
                        />
                      </td>
                      <td style={thtd}>
                        <input
                          type="text"
                          value={row.rate1}
                          onChange={(e) => handleProcessRowChange(index, "rate1", e.target.value)}
                          style={tableInputStyle}
                          placeholder="Rate1"
                        />
                      </td>
                      <td style={thtd}>
                        <input
                          type="text"
                          value={row.sizeWid}
                          onChange={(e) => handleProcessRowChange(index, "sizeWid", e.target.value)}
                          style={tableInputStyle}
                          placeholder="Size Wis"
                        />
                      </td>
                      <td style={thtd}>
                        <input
                          type="text"
                          value={row.sizeWidAct}
                          onChange={(e) => handleProcessRowChange(index, "sizeWidAct", e.target.value)}
                          style={tableInputStyle}
                          placeholder="Size Wis Act"
                        />
                      </td>
                      <td style={thtd}>
                        <input
                          type="text"
                          value={row.itemRef}
                          onChange={(e) => handleProcessRowChange(index, "itemRef", e.target.value)}
                          style={tableInputStyle}
                          placeholder="Item Ref"
                        />
                      </td>
                      <td style={thtd}>
                        <input
                          type="text"
                          value={row.process}
                          onChange={(e) => handleProcessRowChange(index, "process", e.target.value)}
                          style={tableInputStyle}
                          placeholder="Process"
                        />
                      </td>
                      <td style={thtd}>
                        <button
                          type="button"
                          onClick={() => handleRemoveProcessRow(index)}
                          style={removeButtonStyle}
                          title="Remove Row"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: "#f0f8ff" }}>
                    <td style={thtd}>+</td>
                    <td style={{ ...thtd, background: "#e3f2fd" }}>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            const selectedProcess = availableProcesses.find(
                              (process) => process.serialNo === e.target.value,
                            )
                            if (selectedProcess) {
                              const newRow: ProcessRow = {
                                sno: processRows.length + 1,
                                processName: selectedProcess.processName,
                                rate: "",
                                rate1: "",
                                sizeWid: "",
                                sizeWidAct: "",
                                itemRef: "",
                                process: "",
                              }
                              setProcessRows([...processRows, newRow])
                            }
                            e.target.value = ""
                          }
                        }}
                        style={{
                          ...tableInputStyle,
                          fontWeight: 600,
                          width: "100%",
                          padding: "4px",
                          border: "1px solid #2196f3",
                          borderRadius: "3px",
                          backgroundColor: "#fff",
                        }}
                        disabled={loading}
                      >
                        <option value="">Add Process</option>
                        {availableProcesses.map((process) => (
                          <option key={process.serialNo} value={process.serialNo}>
                            {process.processName} ({process.category})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={thtd} colSpan={7}>
                      <span style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                        Select a process to add a new row
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ borderTop: "1px solid #ccc", padding: "10px 8px", background: "#f9fbff" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" as const }}>
                  <div style={{ fontWeight: "bold", color: "#0d47a1" }}>Process Total</div>
                  <div style={{ fontSize: "13px" }}>
                    Rate Total: <span style={{ fontWeight: 600 }}>{totals.totalRate.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={rightStyle}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>Rate Change?</div>

            <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Consumption Detail</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", display: "block" }}>
                    Select Accessories:
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAccessoriesModal}
                    style={{ ...smallButtonStyle, backgroundColor: "#fff3e0", fontSize: "12px", cursor: "pointer" }}
                  >
                    Open Accessories Modal
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", display: "block" }}>
                    Select Shade:
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedShade = availableShades.find((shade) => shade.shadeCode === e.target.value)
                        if (selectedShade) {
                          if (selectedShades.find((shade) => shade.shadeCode === selectedShade.shadeCode)) {
                            Swal.fire({
                              icon: "info",
                              title: "Already Selected",
                              text: "This shade is already selected!",
                              timer: 2000,
                              showConfirmButton: false,
                            })
                          } else {
                            setSelectedShades([...selectedShades, selectedShade])
                          }
                        }
                        e.target.value = ""
                      }
                    }}
                    style={{ ...smallButtonStyle, backgroundColor: "#e3f2fd", fontSize: "12px" }}
                  >
                    <option value="">Select Shade...</option>
                    {availableShades.map((shade) => (
                      <option key={shade.shadeCode} value={shade.shadeCode}>
                        {shade.shadeName} ({shade.colorFamily})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
  <label style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", display: "block" }}>
    Select Size:
  </label>
  <select
    onChange={(e) => {
      handleSizeSelect(e.target.value)
      e.target.value = ""
    }}
    style={{ ...smallButtonStyle, backgroundColor: "#f3e5f5", fontSize: "12px" }}
    value=""
  >
    <option value="">Select Size...</option>
    {availableSizes.map((size) => (
      <option key={size.serialNo} value={size.serialNo}>
  {size.sizeName} {
    (() => {
      if (!size.artGroup) return "";
      if (typeof size.artGroup === 'string') return `(${size.artGroup})`;
      if (typeof size.artGroup === 'object' && 'artGroupName' in size.artGroup) {
        return `(${size.artGroup.artGroupName})`;
      }
      return "";
    })()
  }
</option>
    ))}
  </select>
</div>
              </div>
            </div>

            {selectedAccessories.length > 0 && (
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: "#ff9800" }}>
                  Selected Accessories ({selectedAccessories.length})
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {selectedAccessories.map((accessory, index) => (
                    <div
                      key={accessory.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 8px",
                        marginBottom: "4px",
                        backgroundColor: index % 2 === 0 ? "#f8f9fa" : "#ffffff",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "bold", color: "#333" }}>{accessory.materialName}</div>
                        <div style={{ color: "#666" }}>
                          {accessory.code} | {accessory.materialGroupName}
                        </div>
                        <div style={{ color: "#888", fontSize: "10px" }}>Unit: {accessory.materialUnit}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessory(accessory.id)}
                        style={removeButtonStyle}
                        title="Remove Accessory"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedShades.length > 0 && (
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: "#007bff" }}>
                  Selected Shades ({selectedShades.length})
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {selectedShades.map((shade, index) => (
                    <div
                      key={shade.shadeCode}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 8px",
                        marginBottom: "4px",
                        backgroundColor: index % 2 === 0 ? "#f8f9fa" : "#ffffff",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "bold", color: "#333" }}>{shade.shadeName}</div>
                        <div style={{ color: "#666" }}>
                          {shade.shadeCode} | {shade.colorFamily}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveShade(shade.shadeCode)}
                        style={removeButtonStyle}
                        title="Remove Shade"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

      {selectedSizes.length > 0 && (
  <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
    <div style={{ fontWeight: 600, marginBottom: 8, color: "#9c27b0" }}>
      Selected Sizes ({selectedSizes.length})
    </div>
    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
<thead>
  <tr style={{ backgroundColor: "#f3e5f5" }}>
    <th style={{ ...thtd, padding: "6px", fontSize: "10px" }}>Size</th>
    <th style={{ ...thtd, padding: "6px", fontSize: "10px" }}>Group</th>
    <th style={{ ...thtd, padding: "6px", fontSize: "10px", textAlign: "center" }}>Box</th>
    <th style={{ ...thtd, padding: "6px", fontSize: "10px", textAlign: "center" }}>Pcs</th>
    <th style={{ ...thtd, padding: "6px", fontSize: "10px", textAlign: "right" }}>Rate</th>
    <th style={{ ...thtd, padding: "6px", fontSize: "10px", textAlign: "center" }}>Action</th>
  </tr>
</thead>
        <tbody>
          {selectedSizes.map((size, index) => (
  <tr key={size.serialNo} style={{ backgroundColor: index % 2 === 0 ? "#f8f9fa" : "#ffffff" }}>
    <td style={{ ...thtd, padding: "6px", fontWeight: "bold" }}>{size.sizeName}</td>
    <td style={{ ...thtd, padding: "6px", fontSize: "10px", color: "#666" }}>
      {(() => {
        if (!size.artGroup) return "-";
        if (typeof size.artGroup === 'string') return size.artGroup;
        if (typeof size.artGroup === 'object' && 'artGroupName' in size.artGroup) {
          return size.artGroup.artGroupName;
        }
        return "-";
      })()}
    </td>
    <td style={{ ...thtd, padding: "4px", textAlign: "center" }}>
                <input
                  type="text"
                  value={size.box || ""}
                  onChange={(e) => {
                    const updatedSizes = selectedSizes.map((s, i) => 
                      i === index ? { ...s, box: e.target.value } : s
                    )
                    setSelectedSizes(updatedSizes)
                  }}
                  style={{
                    width: "100%",
                    padding: "4px",
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                    fontSize: "11px",
                    textAlign: "center"
                  }}
                  placeholder="Box"
                />
              </td>
              <td style={{ ...thtd, padding: "4px", textAlign: "center" }}>
                <input
                  type="text"
                  value={size.pcs || ""}
                  onChange={(e) => {
                    const updatedSizes = selectedSizes.map((s, i) => 
                      i === index ? { ...s, pcs: e.target.value } : s
                    )
                    setSelectedSizes(updatedSizes)
                  }}
                  style={{
                    width: "100%",
                    padding: "4px",
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                    fontSize: "11px",
                    textAlign: "center"
                  }}
                  placeholder="Pcs"
                />
              </td>
              <td style={{ ...thtd, padding: "4px", textAlign: "right" }}>
                <input
                  type="text"
                  value={size.rate || ""}
                  onChange={(e) => {
                    const updatedSizes = selectedSizes.map((s, i) => 
                      i === index ? { ...s, rate: e.target.value } : s
                    )
                    setSelectedSizes(updatedSizes)
                  }}
                  style={{
                    width: "100%",
                    padding: "4px",
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                    fontSize: "11px",
                    textAlign: "right"
                  }}
                  placeholder="Rate"
                />
              </td>
              <td style={{ ...thtd, padding: "6px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => handleRemoveSize(size.serialNo)}
                  style={{ ...removeButtonStyle, fontSize: "10px", padding: "2px 6px" }}
                  title="Remove Size"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginTop: "20px",
            flexWrap: "wrap" as const,
          }}
        >
          <button type="button" onClick={handleSubmit} style={buttonStyle} disabled={loading}>
            {loading ? "Saving..." : editingArt ? "Update" : "Save"}
          </button>
          <button type="button" onClick={handleEdit} style={buttonStyle} disabled={loading}>
            Edit
          </button>
          <button type="button" onClick={handleDelete} style={buttonStyle} disabled={loading}>
            Delete
          </button>
          <button type="button" onClick={handleArtListClick} style={buttonStyle} disabled={loading}>
            Art List
          </button>
        </div>
      </div>

      {isAccessoriesModalOpen && (
        <div style={modalOverlayStyle} onClick={handleCloseAccessoriesModal}>
          <div
            style={{ ...modalStyle, maxWidth: "700px", backgroundColor: "#e6e6fa" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ ...modalHeaderStyle, backgroundColor: "#e6e6fa", borderBottom: "2px solid #9370db" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#4b0082" }}>Enter Accessory Detail</h3>
              <button style={closeButtonStyle} onClick={handleCloseAccessoriesModal}>
                &times;
              </button>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px", display: "block" }}>
                Process Name:
              </label>
              <select
                value={selectedProcessForAccessories}
                onChange={(e) => handleProcessSelectionForAccessories(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px",
                  fontSize: "13px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">-- Select Process --</option>
                {availableProcesses.map((process) => (
                  <option key={process.serialNo} value={process.processName}>
                    {process.processName}
                  </option>
                ))}
              </select>
            </div>

            {selectedProcessForAccessories && (
              <>
                <div
                  style={{
                    border: "1px solid #9370db",
                    borderRadius: "4px",
                    overflow: "hidden",
                    backgroundColor: "white",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#d8bfd8" }}>
                        <th style={{ ...thtd, padding: "8px", fontWeight: "bold", borderColor: "#9370db" }}>S No</th>
                        <th style={{ ...thtd, padding: "8px", fontWeight: "bold", borderColor: "#9370db" }}>
                          Accessory Name
                        </th>
                        <th style={{ ...thtd, padding: "8px", fontWeight: "bold", borderColor: "#9370db" }}>Qty</th>
                        <th style={{ ...thtd, padding: "8px", fontWeight: "bold", borderColor: "#9370db" }}>Rate</th>
                        <th style={{ ...thtd, padding: "8px", fontWeight: "bold", borderColor: "#9370db" }}>Amount</th>
                        <th style={{ ...thtd, padding: "8px", fontWeight: "bold", borderColor: "#9370db" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessoryRowsInModal.map((row, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8f8ff" }}>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#d8bfd8", textAlign: "center" }}>
                            {row.sno}
                          </td>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#d8bfd8" }}>{row.accessoryName}</td>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#d8bfd8" }}>
                            <input
                              type="number"
                              value={row.qty}
                              onChange={(e) => handleAccessoryRowChange(index, "qty", e.target.value)}
                              style={{
                                width: "100%",
                                padding: "4px",
                                border: "1px solid #ccc",
                                borderRadius: "3px",
                                fontSize: "12px",
                              }}
                              placeholder="0.00"
                              step="0.01"
                            />
                          </td>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#d8bfd8" }}>
                            <input
                              type="number"
                              value={row.rate}
                              onChange={(e) => handleAccessoryRowChange(index, "rate", e.target.value)}
                              style={{
                                width: "100%",
                                padding: "4px",
                                border: "1px solid #ccc",
                                borderRadius: "3px",
                                fontSize: "12px",
                              }}
                              placeholder="0.00"
                              step="0.01"
                            />
                          </td>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#d8bfd8", textAlign: "right" }}>
                            {row.amount}
                          </td>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#d8bfd8", textAlign: "center" }}>
                            <button
                              onClick={() => handleRemoveAccessoryRow(index)}
                              style={{ ...removeButtonStyle, padding: "4px 8px", fontSize: "11px" }}
                            >
                              Delete Row
                            </button>
                          </td>
                        </tr>
                      ))}

                      <tr style={{ backgroundColor: "#fff8dc" }}>
                        <td style={{ ...thtd, padding: "6px", borderColor: "#9370db", textAlign: "center" }}>+</td>
                        <td style={{ ...thtd, padding: "6px", borderColor: "#9370db" }}>
                          <input
                            type="text"
                            value={manualAccessoryInput.name}
                            onChange={(e) => setManualAccessoryInput({ ...manualAccessoryInput, name: e.target.value })}
                            placeholder="Enter accessory name manually"
                            style={{
                              width: "100%",
                              padding: "4px",
                              border: "1px solid #9370db",
                              borderRadius: "3px",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td style={{ ...thtd, padding: "6px", borderColor: "#9370db" }}>
                          <input
                            type="number"
                            value={manualAccessoryInput.qty}
                            onChange={(e) => setManualAccessoryInput({ ...manualAccessoryInput, qty: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                            style={{
                              width: "100%",
                              padding: "4px",
                              border: "1px solid #ccc",
                              borderRadius: "3px",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td style={{ ...thtd, padding: "6px", borderColor: "#9370db" }}>
                          <input
                            type="number"
                            value={manualAccessoryInput.rate}
                            onChange={(e) => setManualAccessoryInput({ ...manualAccessoryInput, rate: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                            style={{
                              width: "100%",
                              padding: "4px",
                              border: "1px solid #ccc",
                              borderRadius: "3px",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td style={{ ...thtd, padding: "6px", borderColor: "#9370db", textAlign: "right" }}>
                          {((parseFloat(manualAccessoryInput.qty) || 0) * (parseFloat(manualAccessoryInput.rate) || 0)).toFixed(2)}
                        </td>
                        <td style={{ ...thtd, padding: "6px", borderColor: "#9370db", textAlign: "center" }}>
                          <button
                            onClick={handleAddManualAccessory}
                            style={{ ...buttonStyle, padding: "4px 8px", fontSize: "11px", backgroundColor: "#4caf50" }}
                          >
                            Add
                          </button>
                        </td>
                      </tr>

                      {filteredMaterialsForProcess.length > 0 && (
                        <tr style={{ backgroundColor: "#f0e6ff" }}>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#9370db", textAlign: "center" }}>+</td>
                          <td style={{ ...thtd, padding: "6px", borderColor: "#9370db" }} colSpan={5}>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  const newRow: AccessoryRowInModal = {
                                    sno: accessoryRowsInModal.length + 1,
                                    accessoryName: e.target.value,
                                    qty: "",
                                    rate: "",
                                    amount: "0.00",
                                  }
                                  setAccessoryRowsInModal([...accessoryRowsInModal, newRow])
                                  e.target.value = ""
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "4px",
                                border: "1px solid #9370db",
                                borderRadius: "3px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              <option value="">-- Or Select from List --</option>
                              {filteredMaterialsForProcess.map((materialName, idx) => (
                                <option key={idx} value={materialName}>
                                  {materialName}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "15px",
                    padding: "10px",
                    backgroundColor: "white",
                    borderRadius: "4px",
                    border: "1px solid #9370db",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={handleSaveAccessoryFromModal}
                      style={{ ...buttonStyle, backgroundColor: "#007bff", padding: "6px 16px", fontSize: "13px" }}
                      disabled={accessoryRowsInModal.length === 0}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleAddAccessoryFromModal}
                      style={{ ...buttonStyle, backgroundColor: "#4caf50", padding: "6px 16px", fontSize: "13px" }}
                      disabled={accessoryRowsInModal.length === 0}
                    >
                      Close
                    </button>
                  </div>
                  <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                    Total: <span style={{ color: "#4b0082" }}>{calculateTotal()}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {isModalOpen && (
  <div style={modalOverlayStyle} onClick={handleCloseModal}>
    <div style={{ ...modalStyle, maxWidth: "1100px" }} onClick={(e) => e.stopPropagation()}>
      <div style={modalHeaderStyle}>
        <h3 style={{ margin: 0 }}>
          Art List {loading && <span style={{ fontSize: "12px", color: "#007bff" }}>(Loading...)</span>}
        </h3>
        <button style={closeButtonStyle} onClick={handleCloseModal}>
          &times;
        </button>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Search by Art No, Art Name, Serial Number, or Art Group..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 15px",
            border: "2px solid #007bff",
            borderRadius: "6px",
            fontSize: "14px",
            boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={(e) => e.target.style.borderColor = "#0056b3"}
          onBlur={(e) => e.target.style.borderColor = "#007bff"}
        />
        {searchQuery && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
            Found {filteredArtList.length} result{filteredArtList.length !== 1 ? 's' : ''}
            <button
              onClick={() => setSearchQuery("")}
              style={{
                marginLeft: "10px",
                padding: "2px 8px",
                fontSize: "11px",
                border: "1px solid #dc3545",
                borderRadius: "3px",
                backgroundColor: "white",
                color: "#dc3545",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div style={{ overflow: "auto", maxHeight: "60vh" }}>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          fontSize: "13px",
          minWidth: "1000px" 
        }}>
          <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8f9fa", zIndex: 1 }}>
            <tr>
              <th style={{ 
                ...thtd, 
                textAlign: "center", 
                width: "50px",
                padding: "10px 6px",
                fontWeight: "600"
              }}>S.No</th>
              <th style={{ 
                ...thtd, 
                textAlign: "left", 
                width: "130px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Serial Number</th>
              <th style={{ 
                ...thtd, 
                textAlign: "left", 
                width: "110px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Art Group</th>
              <th style={{ 
                ...thtd, 
                textAlign: "left", 
                minWidth: "150px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Art Name</th>
              <th style={{ 
                ...thtd, 
                textAlign: "left", 
                width: "100px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Art No</th>
              <th style={{ 
                ...thtd, 
                textAlign: "left", 
                width: "120px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Style Name</th>
              <th style={{ 
                ...thtd, 
                textAlign: "right", 
                width: "90px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Sale Rate</th>
              <th style={{ 
                ...thtd, 
                textAlign: "left", 
                width: "80px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Season</th>
              <th style={{ 
                ...thtd, 
                textAlign: "left", 
                width: "110px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Brand Name</th>
              <th style={{ 
                ...thtd, 
                textAlign: "center", 
                width: "130px",
                padding: "10px 8px",
                fontWeight: "600"
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredArtList.length === 0 ? (
              <tr>
                <td 
                  colSpan={10} 
                  style={{ 
                    ...thtd, 
                    textAlign: "center", 
                    padding: "40px",
                    color: "#999",
                    fontSize: "14px"
                  }}
                >
                  {searchQuery ? "No arts found matching your search" : "No arts available"}
                </td>
              </tr>
            ) : (
              filteredArtList.map((art, index) => (
                <tr 
                  key={art.serialNumber} 
                  style={{ 
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9f9f9",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e3f2fd"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9"}
                >
                  <td style={{ ...thtd, textAlign: "center", padding: "8px 6px" }}>
                    {index + 1}
                  </td>
                  <td style={{ ...thtd, textAlign: "left", padding: "8px", fontSize: "12px", fontFamily: "monospace" }}>
                    {art.serialNumber}
                  </td>
                  <td style={{ ...thtd, textAlign: "left", padding: "8px" }}>
                    {art.artGroup || "-"}
                  </td>
                  <td style={{ ...thtd, textAlign: "left", padding: "8px", fontWeight: "500" }}>
                    {art.artName}
                  </td>
                  <td style={{ ...thtd, textAlign: "left", padding: "8px", fontWeight: "bold", color: "#0066cc" }}>
                    {art.artNo || "-"}
                  </td>
                  <td style={{ ...thtd, textAlign: "left", padding: "8px" }}>
                    {art.styleName || "-"}
                  </td>
                  <td style={{ 
                    ...thtd, 
                    textAlign: "right", 
                    padding: "8px",
                    fontWeight: "bold", 
                    color: art.saleRate ? "#28a745" : "#999"
                  }}>
                    {art.saleRate ? `₹${art.saleRate}` : "-"}
                  </td>
                  <td style={{ ...thtd, textAlign: "left", padding: "8px" }}>
                    {art.season || "-"}
                  </td>
                  <td style={{ ...thtd, textAlign: "left", padding: "8px" }}>
                    {art.brandName || "-"}
                  </td>
                  <td style={{ ...thtd, textAlign: "center", padding: "8px" }}>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                      <button
                        style={{
                          ...editButtonStyle,
                          padding: "6px 12px",
                          fontSize: "12px"
                        }}
                        onClick={() => handleEditArt(art)}
                        title="Edit Art"
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        style={{
                          ...deleteButtonStyle,
                          padding: "6px 12px",
                          fontSize: "12px"
                        }}
                        onClick={() => handleDeleteArt(art)}
                        title="Delete Art"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginTop: "20px", 
        paddingTop: "15px",
        borderTop: "1px solid #eee"
      }}>
        <div style={{ fontSize: "13px", color: "#666" }}>
          Total Arts: <strong>{filteredArtList.length}</strong>
          {searchQuery && artList.length !== filteredArtList.length && (
            <span> (filtered from {artList.length})</span>
          )}
        </div>
        <button style={buttonStyle} onClick={handleCloseModal} disabled={loading}>
          Close
        </button>
      </div>
    </div>
  </div>
)}
      {isSizeModalOpen && (
  <div style={modalOverlayStyle} onClick={() => setIsSizeModalOpen(false)}>
    <div
      style={{ ...modalStyle, maxWidth: "450px", backgroundColor: "#f3e5f5" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ ...modalHeaderStyle, backgroundColor: "#f3e5f5", borderBottom: "2px solid #9c27b0" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#9c27b0" }}>
          Enter Details for Size: {availableSizes.find(s => s.serialNo === currentSizeSelection)?.sizeName || ""}
        </h3>
        <button style={closeButtonStyle} onClick={() => setIsSizeModalOpen(false)}>
          &times;
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "13px" }}>
          Box:
        </label>
        <input
          type="text"
          value={sizeDetails.box}
          onChange={(e) => setSizeDetails({ ...sizeDetails, box: e.target.value })}
          placeholder="Enter box quantity"
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #9c27b0",
            borderRadius: "4px",
            fontSize: "13px",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "13px" }}>
          Pcs:
        </label>
        <input
          type="text"
          value={sizeDetails.pcs}
          onChange={(e) => setSizeDetails({ ...sizeDetails, pcs: e.target.value })}
          placeholder="Enter pieces"
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #9c27b0",
            borderRadius: "4px",
            fontSize: "13px",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "13px" }}>
          Rate:
        </label>
        <input
          type="text"
          value={sizeDetails.rate}
          onChange={(e) => setSizeDetails({ ...sizeDetails, rate: e.target.value })}
          placeholder="Enter rate"
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #9c27b0",
            borderRadius: "4px",
            fontSize: "13px",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button
          onClick={() => setIsSizeModalOpen(false)}
          style={{
            padding: "8px 16px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: "#f0f0f0",
            fontWeight: "bold",
            fontSize: "13px"
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSaveSize}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: "#9c27b0",
            color: "white",
            fontWeight: "bold",
            fontSize: "13px"
          }}
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
    </Dashboard>
  )
}

export default ArtCreationForm