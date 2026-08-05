// src/pages/Master/Art/ArtCreation.tsx
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

interface FormData {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  copyFromArtName: string;
  styleRate: string;
  saleRate: string;
  styleName: string;
  openingBalance: string;
  brandName: string;
  workOnArt: string;
}

interface ArtListView {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  styleName: string;
  season: string;
  brandName: string;
  saleRate: string;
}

interface ArtDetailView {
  serialNumber: string;
  artGroup: string;
  artName: string;
  artNo: string;
  styleRate: string;
  saleRate: string;
  styleName: string;
  season: string;
  copyFromArtName: string;
  openingBalance: string;
  wtPcs: string;
  reference: string;
  brandName: string;
  workOnArt: string;
  processes: ProcessDetail[];
  shades: ShadeDetail[];
  sizes: SizeDetail[];
  sizeDetails?: SizeDetailWithBoxPcsRate[];
  accessories: AccessoryDetail[];
  accessoryDetails?: AccessoryDetailModalResponseDTO[];
}

interface ProcessDetail {
  id: number;
  sno: number;
  processName: string;
  rate: string;
  rate1: string;

  // kept for backend safety, UI removed
  sizeWid: string;
  sizeWidAct: string;
  itemRef: string;
  process: string;
}

interface ShadeDetail {
  id: number;
  shadeCode: string;
  shadeName: string;
  colorFamily: string;
}

interface SizeDetail {
  id: number;
  serialNo: string;
  sizeName: string;
  orderNo: string;
  artGroup: string;
}

interface AccessoryDetail {
  id: number;
  materialId: number;
  serialNumber: string;
  materialGroupId: number;
  materialGroupName: string;
  materialName: string;
  code: string;
  materialUnit: string;
  minimumStock: string;
  maximumStock: string;
}

interface ProcessRow {
  sno: number;
  processName: string;
  rate: string;
  rate1: string;

  // kept for backend safety, UI removed
  sizeWid: string;
  sizeWidAct: string;
  itemRef: string;
  process: string;
}

interface ProcessFromCreation {
  serialNo: string;
  processName: string;
  category: string;
}

interface ShadeFromCreation {
  shadeCode: string;
  shadeName: string;
  colorFamily: string;
}

interface SizeFromCreation {
  id?: number;
  serialNo: string;
  sizeName: string;
  orderNo: string;
  artGroup?: string | { artGroupName?: string; [key: string]: any };
  box?: string;
  pcs?: string;
  rate?: string;
}

interface MaterialFromCreation {
  id: number;
  serialNumber: string;
  materialGroupId: number;
  materialGroupName: string;
  materialName: string;
  code: string;
  materialUnit: string;
  minimumStock: string;
  maximumStock: string;
}

interface ArtGroupFromCreation {
  serialNo: number;
  artGroupName: string;
  yearsToleranceFrom: string;
  yearsToleranceTo: string;
  seriesRangeStart: string;
  seriesRangeEnd: string;
}

interface AccessoryFromCreation {
  serialNumber: string;
  processName: string;
  materialName: string;
}

// keep backend id in row so update/delete works reliably
interface AccessoryRowInModal {
  id?: number;
  sno: number;
  accessoryName: string;
  qty: string;
  rate: string;
  amount: string;
}

interface SizeDetailWithBoxPcsRate {
  id: number;
  serialNo: string;
  sizeName: string;
  orderNo: string;
  box: string;
  pcs: string;
  rate: string;
}

interface AccessoryDetailModalResponseDTO {
  id?: number;
  processName: string;
  sno: number;
  accessoryName: string;
  qty: string;
  rate: string;
  amount: string;
}

const ArtCreation: React.FC = () => {
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
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingArt, setEditingArt] = useState<ArtDetailView | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [artList, setArtList] = useState<ArtListView[]>([]);
  const [artListForCopy, setArtListForCopy] = useState<ArtListView[]>([]);
  const [processRows, setProcessRows] = useState<ProcessRow[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<ProcessFromCreation[]>([]);
  const [availableShades, setAvailableShades] = useState<ShadeFromCreation[]>([]);
  const [selectedShades, setSelectedShades] = useState<ShadeFromCreation[]>([]);
  const [availableSizes, setAvailableSizes] = useState<SizeFromCreation[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<SizeFromCreation[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<MaterialFromCreation[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<MaterialFromCreation[]>([]);
  const [availableArtGroups, setAvailableArtGroups] = useState<ArtGroupFromCreation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ✅ process-wise accessory details (final payload)
  const [accessoryDetails, setAccessoryDetails] = useState<AccessoryDetailModalResponseDTO[]>([]);

  // ✅ NEW: All-process accessory modal states
  const [isAccessoriesModalOpen, setIsAccessoriesModalOpen] = useState<boolean>(false);
  const [accessoryRowsByProcess, setAccessoryRowsByProcess] = useState<Record<string, AccessoryRowInModal[]>>({});
  const [manualInputByProcess, setManualInputByProcess] = useState<Record<string, { name: string; qty: string; rate: string }>>({});
  const [materialsByProcess, setMaterialsByProcess] = useState<Record<string, string[]>>({}); // from /accessories/list

  const [isSizeModalOpen, setIsSizeModalOpen] = useState<boolean>(false);
  const [currentSizeSelection, setCurrentSizeSelection] = useState<string>("");
  const [sizeDetails, setSizeDetails] = useState({ box: "", pcs: "", rate: "" });

  useEffect(() => {
    loadArts();
    loadAvailableProcesses();
    loadAvailableShades();
    loadAvailableSizes();
    loadAvailableArtGroups();
    loadAvailableMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editingArt) generateSerialNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingArt]);

  const totals = useMemo(() => {
    const totalRate = processRows.reduce((sum, row) => sum + (parseFloat(row.rate) || 0), 0);
    return { totalRate };
  }, [processRows]);

  const filteredArtList = useMemo(() => {
    if (!searchQuery.trim()) return artList;
    const query = searchQuery.toLowerCase().trim();
    return artList.filter(
      (art) =>
        art.artNo?.toLowerCase().includes(query) ||
        art.artName?.toLowerCase().includes(query) ||
        art.serialNumber?.toLowerCase().includes(query) ||
        art.artGroup?.toLowerCase().includes(query),
    );
  }, [artList, searchQuery]);

  // ✅ process list for accessory modal (from current processRows)
  const processOptionsForAccessories = useMemo(() => {
    const list = processRows.map((r) => (r.processName || "").trim()).filter(Boolean);
    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const p of list) {
      if (!seen.has(p)) {
        seen.add(p);
        uniq.push(p);
      }
    }
    return uniq;
  }, [processRows]);

  // ✅ show process names under selected accessories
  const processesByAccessoryName = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of accessoryDetails) {
      const aName = (d.accessoryName || "").trim();
      const pName = (d.processName || "").trim();
      if (!aName || !pName) continue;

      const arr = map.get(aName) || [];
      if (!arr.includes(pName)) arr.push(pName);
      map.set(aName, arr);
    }
    return map;
  }, [accessoryDetails]);

  // ---------- API loaders ----------
  const loadArts = async () => {
    try {
      setLoading(true);
      const response = await api.get<ArtListView[]>("/arts");
      setArtList(response.data);
      setArtListForCopy(response.data);
    } catch (error) {
      console.error("Failed to load arts:", error);
      setArtList([]);
      setArtListForCopy([]);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to load arts list" });
    } finally {
      setLoading(false);
    }
  };

  const loadArtDetail = async (serialNumber: string): Promise<ArtDetailView | null> => {
    try {
      setLoading(true);
      const response = await api.get<ArtDetailView>(`/arts/${serialNumber}`);
      return response.data;
    } catch (error) {
      console.error("Failed to load art detail:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to load art details" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProcesses = async () => {
    try {
      const response = await api.get("/process/list");
      setAvailableProcesses(response.data);
    } catch (error) {
      console.error("Failed to load available processes:", error);
      setAvailableProcesses([]);
    }
  };

  const loadAvailableShades = async () => {
    try {
      const response = await api.get("/shade/list");
      setAvailableShades(response.data);
    } catch (error) {
      console.error("Failed to load available shades:", error);
      setAvailableShades([]);
    }
  };

  const loadAvailableSizes = async () => {
    try {
      const response = await api.get("/sizes");
      setAvailableSizes(response.data);
    } catch (error) {
      console.error("Failed to load available sizes:", error);
      setAvailableSizes([]);
    }
  };

  const loadAvailableMaterials = async () => {
    try {
      const response = await api.get("/materials");
      setAvailableMaterials(response.data);
    } catch (error) {
      console.error("Failed to load available materials:", error);
      setAvailableMaterials([]);
    }
  };

  const loadAvailableArtGroups = async () => {
    try {
      const response = await api.get("/artgroup/list");
      setAvailableArtGroups(response.data);
    } catch (error) {
      console.error("Failed to load available art groups:", error);
      setAvailableArtGroups([]);
    }
  };

  // ✅ load accessory master once and group by process
  const loadAccessoryMasterByProcess = async () => {
    try {
      const response = await api.get<AccessoryFromCreation[]>("/accessories/list");
      const map: Record<string, string[]> = {};
      for (const row of response.data || []) {
        const p = (row.processName || "").trim();
        const m = (row.materialName || "").trim();
        if (!p || !m) continue;
        if (!map[p]) map[p] = [];
        if (!map[p].includes(m)) map[p].push(m);
      }
      setMaterialsByProcess(map);
    } catch (e) {
      console.error("Failed to load accessories master:", e);
      setMaterialsByProcess({});
    }
  };

  const saveArt = async (artData: any) => {
    try {
      setLoading(true);
      const response = await api.post<ArtDetailView>("/arts", artData);
      return response.data;
    } catch (error) {
      console.error("Failed to save art:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateArt = async (serialNumber: string, artData: any) => {
    try {
      setLoading(true);
      const response = await api.put<ArtDetailView>(`/arts/${serialNumber}`, artData);
      return response.data;
    } catch (error) {
      console.error("Failed to update art:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteArtFromBackend = async (serialNumber: string) => {
    try {
      setLoading(true);
      await api.delete(`/arts/${serialNumber}`);
    } catch (error) {
      console.error("Failed to delete art:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ---------- handlers ----------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked as any) : value,
    }));
  };

  // ✅ COPY FROM ART: copy processes + accessory details + selected accessories
  const handleCopyFromArtChange = async (selectedArtName: string) => {
    if (!selectedArtName) {
      setFormData((prev) => ({ ...prev, copyFromArtName: "" }));
      return;
    }

    const selectedArt = artListForCopy.find((art) => art.artName === selectedArtName);
    if (!selectedArt) return;

    setFormData((prev) => ({ ...prev, copyFromArtName: selectedArtName }));
    const artDetail = await loadArtDetail(selectedArt.serialNumber);
    if (!artDetail) return;

    const copiedProcesses: ProcessRow[] = (artDetail.processes || []).map((p, index) => ({
      sno: index + 1,
      processName: p.processName || "",
      rate: p.rate || "",
      rate1: p.rate1 || "",
      sizeWid: p.sizeWid || "",
      sizeWidAct: p.sizeWidAct || "",
      itemRef: p.itemRef || "",
      process: p.process || "",
    }));
    setProcessRows(copiedProcesses);

    const copiedSelectedAccessories: MaterialFromCreation[] = (artDetail.accessories || []).map((a) => ({
      id: a.materialId,
      serialNumber: a.serialNumber,
      materialGroupId: a.materialGroupId,
      materialGroupName: a.materialGroupName,
      materialName: a.materialName,
      code: a.code,
      materialUnit: a.materialUnit,
      minimumStock: a.minimumStock,
      maximumStock: a.maximumStock,
    }));
    setSelectedAccessories(copiedSelectedAccessories);

    const copiedAccessoryDetails: AccessoryDetailModalResponseDTO[] = (artDetail.accessoryDetails || []).map((d) => ({
      id: d.id,
      processName: d.processName,
      sno: d.sno,
      accessoryName: d.accessoryName,
      qty: d.qty,
      rate: d.rate,
      amount: d.amount,
    }));
    setAccessoryDetails(copiedAccessoryDetails);

    Swal.fire({
      icon: "success",
      title: "Copied",
      text: `Copied ${copiedProcesses.length} processes and ${copiedAccessoryDetails.length} accessory rows from ${selectedArtName}`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.serialNumber || !formData.artName) {
        Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: "Please fill in required fields: Serial Number and Art Name",
        });
        return;
      }

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
        accessoryDetails: accessoryDetails.map((d) => ({
          id: d.id,
          processName: d.processName,
          sno: d.sno,
          accessoryName: d.accessoryName,
          qty: d.qty,
          rate: d.rate,
          amount: d.amount,
        })),
      };

      if (editingArt) {
        await updateArt(editingArt.serialNumber, requestPayload);
        Swal.fire({ icon: "success", title: "Updated!", text: "Art updated successfully!", timer: 1500, showConfirmButton: false });
      } else {
        await saveArt(requestPayload);
        Swal.fire({ icon: "success", title: "Created!", text: "Art created successfully!", timer: 1500, showConfirmButton: false });
      }

      await loadArts();

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
      });
      setProcessRows([]);
      setSelectedShades([]);
      setSelectedSizes([]);
      setSelectedAccessories([]);
      setAccessoryDetails([]);
      setEditingArt(null);
    } catch (error) {
      console.error("Error saving art:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to save art. Please try again." });
    }
  };

  const handleArtListClick = async () => {
    await loadArts();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleEditArt = async (art: ArtListView) => {
    const artDetail = await loadArtDetail(art.serialNumber);
    if (!artDetail) return;

    setEditingArt(artDetail);
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
    });

    setProcessRows(
      (artDetail.processes || []).map((p) => ({
        sno: p.sno,
        processName: p.processName || "",
        rate: p.rate || "",
        rate1: p.rate1 || "",
        sizeWid: p.sizeWid || "",
        sizeWidAct: p.sizeWidAct || "",
        itemRef: p.itemRef || "",
        process: p.process || "",
      })),
    );

    setSelectedShades(
      (artDetail.shades || []).map((s) => ({
        shadeCode: s.shadeCode,
        shadeName: s.shadeName,
        colorFamily: s.colorFamily,
      })),
    );

    if (artDetail.sizeDetails?.length) {
      setSelectedSizes(
        artDetail.sizeDetails.map((s) => ({
          id: s.id,
          serialNo: s.serialNo,
          sizeName: s.sizeName,
          orderNo: s.orderNo,
          box: s.box || "",
          pcs: s.pcs || "",
          rate: s.rate || "",
        })),
      );
    } else if (artDetail.sizes?.length) {
      setSelectedSizes(
        artDetail.sizes.map((s) => ({
          id: s.id,
          serialNo: s.serialNo,
          sizeName: s.sizeName,
          orderNo: s.orderNo,
          artGroup: s.artGroup,
          box: (s as any).box || "",
          pcs: (s as any).pcs || "",
          rate: (s as any).rate || "",
        })),
      );
    } else setSelectedSizes([]);

    setSelectedAccessories(
      (artDetail.accessories || []).map((a) => ({
        id: a.materialId,
        serialNumber: a.serialNumber,
        materialGroupId: a.materialGroupId,
        materialGroupName: a.materialGroupName,
        materialName: a.materialName,
        code: a.code,
        materialUnit: a.materialUnit,
        minimumStock: a.minimumStock,
        maximumStock: a.maximumStock,
      })),
    );

    setAccessoryDetails(
      (artDetail.accessoryDetails || []).map((d) => ({
        id: d.id,
        processName: d.processName,
        sno: d.sno,
        accessoryName: d.accessoryName,
        qty: d.qty,
        rate: d.rate,
        amount: d.amount,
      })),
    );

    setIsModalOpen(false);
  };

  const handleDeleteArt = async (artToDelete: ArtListView) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this art?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteArtFromBackend(artToDelete.serialNumber);
      await loadArts();
      Swal.fire({ icon: "success", title: "Deleted!", text: "Art deleted successfully!", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to delete art. Please try again." });
    }
  };

  const handleEdit = () => {
    if (!editingArt) Swal.fire({ icon: "info", title: "No Art Selected", text: "No art selected for editing" });
  };

  const handleDelete = async () => {
    if (!editingArt) {
      Swal.fire({ icon: "info", title: "No Art Selected", text: "No art selected for deletion" });
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete ${editingArt.artName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteArtFromBackend(editingArt.serialNumber);
      await loadArts();
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
      });
      setProcessRows([]);
      setSelectedShades([]);
      setSelectedSizes([]);
      setSelectedAccessories([]);
      setAccessoryDetails([]);
      setEditingArt(null);

      Swal.fire({ icon: "success", title: "Deleted!", text: "Art deleted successfully!", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to delete art. Please try again." });
    }
  };

  const handleRemoveShade = (shadeCodeToRemove: string) => {
    setSelectedShades(selectedShades.filter((shade) => shade.shadeCode !== shadeCodeToRemove));
  };

  const handleRemoveSize = (serialNoToRemove: string) => {
    setSelectedSizes(selectedSizes.filter((size) => size.serialNo !== serialNoToRemove));
  };

  const handleRemoveAccessory = (idToRemove: number) => {
    const mat = selectedAccessories.find((x) => x.id === idToRemove);
    const matName = (mat?.materialName || "").trim();

    setSelectedAccessories((prev) => prev.filter((accessory) => accessory.id !== idToRemove));

    if (matName) {
      setAccessoryDetails((prev) => prev.filter((d) => (d.accessoryName || "").trim() !== matName));

      setAccessoryRowsByProcess((prev) => {
        const next = { ...prev };
        for (const p of Object.keys(next)) {
          next[p] = (next[p] || [])
            .filter((r) => (r.accessoryName || "").trim() !== matName)
            .map((r, i) => ({ ...r, sno: i + 1 }));
        }
        return next;
      });
    }
  };

  const handleRemoveProcessRow = (index: number) => {
    const removedProcess = (processRows[index]?.processName || "").trim();
    const updatedRows = processRows.filter((_, i) => i !== index);
    setProcessRows(updatedRows.map((row, i) => ({ ...row, sno: i + 1 })));

    if (removedProcess) {
      setAccessoryDetails((prev) => prev.filter((d) => (d.processName || "").trim() !== removedProcess));
      setAccessoryRowsByProcess((prev) => {
        const next = { ...prev };
        delete next[removedProcess];
        return next;
      });
      setManualInputByProcess((prev) => {
        const next = { ...prev };
        delete next[removedProcess];
        return next;
      });
    }
  };

  const handleProcessRowChange = (index: number, field: keyof ProcessRow, value: string) => {
    setProcessRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const generateSerialNumber = () => {
    const prefix = "ART";
    const year = new Date().getFullYear();
    const unique = Math.floor(10000 + Math.random() * 90000).toString();
    const serial = `${prefix}${year}${unique}`;
    setFormData((prev) => ({ ...prev, serialNumber: serial }));
  };

  // =================== ✅ ALL-PROCESS ACCESSORY MODAL LOGIC ===================
  const buildAccessoryRowsByProcessFromDetails = (processList: string[]) => {
    const grouped: Record<string, AccessoryRowInModal[]> = {};
    for (const proc of processList) grouped[proc] = [];

    for (const d of accessoryDetails) {
      const p = (d.processName || "").trim();
      if (!p) continue;
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push({
        id: d.id,
        sno: d.sno,
        accessoryName: d.accessoryName,
        qty: d.qty,
        rate: d.rate,
        amount: d.amount,
      });
    }

    for (const p of Object.keys(grouped)) {
      grouped[p] = (grouped[p] || [])
        .slice()
        .sort((a, b) => (a.sno || 0) - (b.sno || 0))
        .map((r, idx) => ({ ...r, sno: idx + 1 }));
    }

    return grouped;
  };

  const handleOpenAccessoriesModal = async () => {
    if (!processOptionsForAccessories.length) {
      Swal.fire({
        icon: "info",
        title: "No Processes",
        text: "Please add/copy process rows first. Accessories are process-wise.",
      });
      return;
    }

    setIsAccessoriesModalOpen(true);

    // load master list once
    await loadAccessoryMasterByProcess();

    // init rows per process from existing accessoryDetails
    setAccessoryRowsByProcess(buildAccessoryRowsByProcessFromDetails(processOptionsForAccessories));

    // init manual inputs for each process
    const mi: Record<string, { name: string; qty: string; rate: string }> = {};
    for (const p of processOptionsForAccessories) mi[p] = { name: "", qty: "", rate: "" };
    setManualInputByProcess(mi);
  };

  const handleCloseAccessoriesModal = () => {
    setIsAccessoriesModalOpen(false);
  };

  const handleAccessoryRowChangeInProcess = (proc: string, index: number, field: "qty" | "rate" | "amount", value: string) => {
    setAccessoryRowsByProcess((prev) => {
      const rows = (prev[proc] || []).slice();
      const row = rows[index];
      if (!row) return prev;

      const newRow: AccessoryRowInModal = { ...row, [field]: value };
      if (field === "qty" || field === "rate") {
        const qty = Number.parseFloat(field === "qty" ? value : row.qty) || 0;
        const rate = Number.parseFloat(field === "rate" ? value : row.rate) || 0;
        newRow.amount = (qty * rate).toFixed(2);
      }

      rows[index] = newRow;
      return { ...prev, [proc]: rows };
    });
  };

  const handleRemoveAccessoryRowInProcess = (proc: string, index: number) => {
    setAccessoryRowsByProcess((prev) => {
      const rows = (prev[proc] || []).filter((_, i) => i !== index).map((r, idx) => ({ ...r, sno: idx + 1 }));
      return { ...prev, [proc]: rows };
    });
  };

  const addAccessoryRowToProcess = (proc: string) => {
    const mi = manualInputByProcess[proc] || { name: "", qty: "", rate: "" };
    const name = (mi.name || "").trim();
    if (!name) {
      Swal.fire({ icon: "warning", title: "Missing Name", text: `Please enter accessory name for ${proc}`, timer: 1300, showConfirmButton: false });
      return;
    }

    const qty = parseFloat(mi.qty) || 0;
    const rate = parseFloat(mi.rate) || 0;
    const amount = (qty * rate).toFixed(2);

    setAccessoryRowsByProcess((prev) => {
      const rows = (prev[proc] || []).slice();
      rows.push({
        sno: rows.length + 1,
        accessoryName: name,
        qty: mi.qty || "0",
        rate: mi.rate || "0",
        amount,
      });
      return { ...prev, [proc]: rows };
    });

    setManualInputByProcess((prev) => ({
      ...prev,
      [proc]: { name: "", qty: "", rate: "" },
    }));
  };

  const addAccessoryFromDropdownToProcess = (proc: string, materialName: string) => {
    const name = (materialName || "").trim();
    if (!name) return;

    setAccessoryRowsByProcess((prev) => {
      const rows = (prev[proc] || []).slice();
      rows.push({
        sno: rows.length + 1,
        accessoryName: name,
        qty: "",
        rate: "",
        amount: "0.00",
      });
      return { ...prev, [proc]: rows };
    });
  };

  const processTotal = (proc: string) => {
    const rows = accessoryRowsByProcess[proc] || [];
    return rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const grandTotal = useMemo(() => {
    return Object.keys(accessoryRowsByProcess).reduce((sum, p) => sum + processTotal(p), 0).toFixed(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessoryRowsByProcess]);

  // ✅ PRINT (NO PDF)
  const handlePrintAccessories = () => {
    const procOrder =
      processOptionsForAccessories.length > 0
        ? processOptionsForAccessories
        : Object.keys(accessoryRowsByProcess || {});

    let globalNo = 1;

    const artName = (formData.artName || "-").trim();
    const artNo = (formData.artNo || "-").trim();
    const serial = (formData.serialNumber || "-").trim();
    const dt = new Date().toLocaleString();

    const escapeHtml = (s: string) =>
      String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    const hasAnyRow = procOrder.some((p) =>
      (accessoryRowsByProcess?.[p] || []).some((r) => (r.accessoryName || "").trim()),
    );

    if (!hasAnyRow) {
      Swal.fire({
        icon: "info",
        title: "No Accessories",
        text: "Print ke liye accessory rows available nahi hai.",
        timer: 1400,
        showConfirmButton: false,
      });
      return;
    }

    let html = `
    <html>
      <head>
        <title>Accessory Consumption Detail</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          .header { display:flex; justify-content:space-between; gap:16px; margin-bottom: 12px; }
          .header h2 { margin: 0 0 6px 0; }
          .meta { font-size: 12px; line-height: 1.5; }
          .box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 14px; }
          .procTitle { font-weight: 700; margin: 0 0 8px 0; display:flex; justify-content:space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background: #f3f3f3; }
          .right { text-align: right; }
          .center { text-align: center; }
          .grand { font-weight: 800; font-size: 14px; margin-top: 10px; text-align: right; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2>Accessory Consumption Detail</h2>
            <div class="meta">
              <div><b>Art Name:</b> ${escapeHtml(artName)}</div>
              <div><b>Art No:</b> ${escapeHtml(artNo)}</div>
              <div><b>Serial No:</b> ${escapeHtml(serial)}</div>
            </div>
          </div>
          <div class="meta">
            <div><b>Generated:</b> ${escapeHtml(dt)}</div>
            <div><b>Grand Total:</b> ${escapeHtml(grandTotal)}</div>
          </div>
        </div>
    `;

    for (const proc of procOrder) {
      const rows = (accessoryRowsByProcess?.[proc] || [])
        .filter((r) => (r.accessoryName || "").trim())
        .map((r, idx) => {
          const qtyNum = parseFloat(r.qty || "0") || 0;
          const rateNum = parseFloat(r.rate || "0") || 0;
          const amt = r.amount && String(r.amount).trim() ? r.amount : (qtyNum * rateNum).toFixed(2);

          return {
            procSno: idx + 1,
            accessoryName: (r.accessoryName || "").trim(),
            qty: r.qty || "0",
            rate: r.rate || "0",
            amount: amt,
          };
        });

      if (!rows.length) continue;

      const procTotal = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toFixed(2);

      html += `
        <div class="box">
          <div class="procTitle">
            <div>Process: ${escapeHtml(proc)}</div>
            <div>Total: ${escapeHtml(procTotal)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="center" style="width:55px;">#</th>
                <th class="center" style="width:70px;">SNo</th>
                <th>Accessory</th>
                <th class="right" style="width:90px;">Qty</th>
                <th class="right" style="width:90px;">Rate</th>
                <th class="right" style="width:110px;">Amount</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const r of rows) {
        html += `
          <tr>
            <td class="center">${globalNo++}</td>
            <td class="center">${r.procSno}</td>
            <td>${escapeHtml(r.accessoryName)}</td>
            <td class="right">${escapeHtml(r.qty)}</td>
            <td class="right">${escapeHtml(r.rate)}</td>
            <td class="right">${escapeHtml(r.amount)}</td>
          </tr>
        `;
      }

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    html += `
        <div class="grand">Grand Total: ${escapeHtml(grandTotal)}</div>
      </body>
    </html>
    `;

    const w = window.open("", "_blank", "width=1100,height=700");
    if (!w) {
      Swal.fire({ icon: "error", title: "Popup blocked", text: "Please allow popups to print." });
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();

    setTimeout(() => {
      w.focus();
      w.print();
      w.close();
    }, 300);
  };

  const saveAllAccessoriesFromModal = () => {
    const procs = processOptionsForAccessories;
    if (!procs.length) return;

    const newDetails: AccessoryDetailModalResponseDTO[] = [];

    for (const proc of procs) {
      const rows = (accessoryRowsByProcess[proc] || [])
        .filter((r) => (r.accessoryName || "").trim())
        .map((r, idx) => ({
          id: r.id,
          processName: proc,
          sno: idx + 1,
          accessoryName: (r.accessoryName || "").trim(),
          qty: r.qty || "0",
          rate: r.rate || "0",
          amount: r.amount || "0.00",
        }));

      newDetails.push(...rows);
    }

    setAccessoryDetails(newDetails);

    // update selectedAccessories ONLY from rows (so deletion is reflected)
    const names = Array.from(new Set(newDetails.map((d) => (d.accessoryName || "").trim()).filter(Boolean)));

    const byName = new Map<string, MaterialFromCreation>();
    for (const nm of names) {
      const material = availableMaterials.find((m) => (m.materialName || "").trim() === nm);
      if (material) {
        byName.set(nm, material);
      } else {
        byName.set(nm, {
          id: Date.now() + Math.random(),
          serialNumber: `MANUAL-${Date.now()}`,
          materialGroupId: 0,
          materialGroupName: "Manual Entry",
          materialName: nm,
          code: "MANUAL",
          materialUnit: "PCS",
          minimumStock: "0",
          maximumStock: "0",
        });
      }
    }

    setSelectedAccessories(Array.from(byName.values()));

    Swal.fire({ icon: "success", title: "Saved!", text: "All process accessories saved.", timer: 1000, showConfirmButton: false });
  };

  const saveAndCloseAccessoriesModal = () => {
    saveAllAccessoriesFromModal();
    setIsAccessoriesModalOpen(false);
  };

  // =================== SIZE modal ===================
  const handleSizeSelect = (serialNo: string) => {
    if (!serialNo) return;

    const selectedSize = availableSizes.find((size) => size.serialNo === serialNo);
    if (!selectedSize) return;

    if (selectedSizes.find((size) => size.serialNo === selectedSize.serialNo)) {
      Swal.fire({ icon: "info", title: "Already Selected", text: "This size is already selected!", timer: 1200, showConfirmButton: false });
      return;
    }

    setCurrentSizeSelection(serialNo);
    setIsSizeModalOpen(true);
    setSizeDetails({ box: "", pcs: "", rate: "" });
  };

  const handleSaveSize = () => {
    const selectedSize = availableSizes.find((size) => size.serialNo === currentSizeSelection);
    if (!selectedSize) return;

    if (!sizeDetails.box || !sizeDetails.pcs || !sizeDetails.rate) {
      Swal.fire({ icon: "warning", title: "Incomplete Data", text: "Please fill all fields: Box, Pcs, and Rate" });
      return;
    }

    const newSize: SizeFromCreation = {
      ...selectedSize,
      box: sizeDetails.box,
      pcs: sizeDetails.pcs,
      rate: sizeDetails.rate,
    };

    setSelectedSizes([...selectedSizes, newSize]);
    setIsSizeModalOpen(false);
    setCurrentSizeSelection("");
    setSizeDetails({ box: "", pcs: "", rate: "" });

    Swal.fire({ icon: "success", title: "Added!", timer: 900, showConfirmButton: false });
  };

  // =================== Styles ===================
  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "30px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };

  const layoutStyle: React.CSSProperties = { display: "flex", gap: "20px" };
  const leftStyle: React.CSSProperties = { flex: 1 };
  const rightStyle: React.CSSProperties = { width: "260px" };

  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "17px",
    alignItems: "center",
    marginBottom: "10px",
    flexWrap: "wrap" as const,
  };

  const labelStyle: React.CSSProperties = { width: "180px", fontWeight: "bold" };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
    minWidth: "200px",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: loading ? "not-allowed" : "pointer",
    backgroundColor: loading ? "#ccc" : "#007bff",
    color: "white",
    opacity: loading ? 0.6 : 1,
  };

  const smallButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    background: "#f7f7f7",
    cursor: "pointer",
  };

  const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
  const thtd: React.CSSProperties = { border: "1px solid #ccc", padding: "6px", textAlign: "left" };
  const tableInputStyle: React.CSSProperties = { width: "100%", border: "none", background: "transparent", fontSize: "12px", padding: "2px" };

  const removeButtonStyle: React.CSSProperties = {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "10px",
    padding: "2px 6px",
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    width: "90%",
    maxWidth: "900px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  };

  const modalHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
  };

  const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    margin: "0 2px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  };

  const editButtonStyle: React.CSSProperties = { ...actionButtonStyle, backgroundColor: "#28a745", color: "white" };
  const deleteButtonStyle: React.CSSProperties = { ...actionButtonStyle, backgroundColor: "#dc3545", color: "white" };

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "15px" }}>
          ART CREATION{" "}
          {editingArt && <span style={{ fontSize: "14px", color: "#666" }}>(Editing: {editingArt.artName})</span>}
          {loading && <span style={{ fontSize: "12px", color: "#007bff", marginLeft: "10px" }}>Loading...</span>}
        </h2>

        <div style={layoutStyle}>
          {/* LEFT */}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, artGroup: e.target.value }))}
                  style={inputStyle}
                  disabled={loading}
                >
                  <option value="">Select Art Group...</option>
                  {availableArtGroups.map((g) =>
                    g?.artGroupName ? (
                      <option key={g.serialNo} value={g.artGroupName}>
                        {g.artGroupName}
                      </option>
                    ) : null,
                  )}
                </select>
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Art No</label>
                <input type="text" name="artNo" value={formData.artNo} onChange={handleInputChange} style={inputStyle} disabled={loading} />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Description</label>
                <input type="text" name="artName" value={formData.artName} onChange={handleInputChange} style={inputStyle} disabled={loading} />
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
                <input type="text" name="styleRate" value={formData.styleRate} onChange={handleInputChange} style={inputStyle} disabled={loading} />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Sale Rate</label>
                <input type="text" name="saleRate" value={formData.saleRate} onChange={handleInputChange} style={inputStyle} disabled={loading} />
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
                <input type="text" name="openingBalance" value={formData.openingBalance} onChange={handleInputChange} style={inputStyle} disabled={loading} />
              </div>

              <div style={formRowStyle}>
                <label style={labelStyle}>Brand Name</label>
                <input type="text" name="brandName" value={formData.brandName} onChange={handleInputChange} style={inputStyle} disabled={loading} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 6 }}>
              <div style={{ fontWeight: "bold" }}>Supplier</div>
              {formData.copyFromArtName && (
                <div style={{ fontSize: "12px", color: "#4caf50", fontWeight: "bold" }}>
                  Processes copied from: {formData.copyFromArtName}
                </div>
              )}
            </div>

            {/* ✅ Process table */}
            <div style={{ border: "1px solid #ccc", borderRadius: 6, overflow: "hidden" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thtd}>Sno</th>
                    <th style={thtd}>Process Name</th>
                    <th style={thtd}>Rate</th>
                    <th style={thtd}>Rate1</th>
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
                          style={{ ...tableInputStyle, fontWeight: 600, width: "100%", padding: 4, border: "1px solid #ddd", borderRadius: 3 }}
                        >
                          <option value="">Select Process...</option>
                          {availableProcesses.map((p) => (
                            <option key={p.serialNo} value={p.processName}>
                              {p.processName} ({p.category})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={thtd}>
                        <input value={row.rate} onChange={(e) => handleProcessRowChange(index, "rate", e.target.value)} style={tableInputStyle} placeholder="Rate" />
                      </td>
                      <td style={thtd}>
                        <input value={row.rate1} onChange={(e) => handleProcessRowChange(index, "rate1", e.target.value)} style={tableInputStyle} placeholder="Rate1" />
                      </td>
                      <td style={thtd}>
                        <button type="button" onClick={() => handleRemoveProcessRow(index)} style={removeButtonStyle}>
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
                            const selectedProcess = availableProcesses.find((p) => p.serialNo === e.target.value);
                            if (selectedProcess) {
                              setProcessRows((prev) => [
                                ...prev,
                                {
                                  sno: prev.length + 1,
                                  processName: selectedProcess.processName,
                                  rate: "",
                                  rate1: "",
                                  sizeWid: "",
                                  sizeWidAct: "",
                                  itemRef: "",
                                  process: "",
                                },
                              ]);
                            }
                            e.target.value = "";
                          }
                        }}
                        style={{
                          ...tableInputStyle,
                          fontWeight: 600,
                          width: "100%",
                          padding: 4,
                          border: "1px solid #2196f3",
                          borderRadius: 3,
                          backgroundColor: "#fff",
                        }}
                        disabled={loading}
                      >
                        <option value="">Add Process</option>
                        {availableProcesses.map((p) => (
                          <option key={p.serialNo} value={p.serialNo}>
                            {p.processName} ({p.category})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={thtd} colSpan={3}>
                      <span style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>Select a process to add a new row</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ borderTop: "1px solid #ccc", padding: "10px 8px", background: "#f9fbff" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: "bold", color: "#0d47a1" }}>Process Total</div>
                  <div style={{ fontSize: 13 }}>
                    Rate Total: <span style={{ fontWeight: 700 }}>{totals.totalRate.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={rightStyle}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>Rate Change?</div>

            <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Consumption Detail</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4, display: "block" }}>Select Accessories:</label>
                  <button type="button" onClick={handleOpenAccessoriesModal} style={{ ...smallButtonStyle, backgroundColor: "#fff3e0", fontSize: 12 }}>
                    Open Accessories Modal
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4, display: "block" }}>Select Shade:</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const s = availableShades.find((x) => x.shadeCode === e.target.value);
                        if (s) {
                          if (selectedShades.find((x) => x.shadeCode === s.shadeCode)) {
                            Swal.fire({ icon: "info", title: "Already Selected", timer: 1000, showConfirmButton: false });
                          } else {
                            setSelectedShades((prev) => [...prev, s]);
                          }
                        }
                        e.target.value = "";
                      }
                    }}
                    style={{ ...smallButtonStyle, backgroundColor: "#e3f2fd", fontSize: 12 }}
                  >
                    <option value="">Select Shade...</option>
                    {availableShades.map((s) => (
                      <option key={s.shadeCode} value={s.shadeCode}>
                        {s.shadeName} ({s.colorFamily})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4, display: "block" }}>Select Size:</label>
                  <select
                    onChange={(e) => {
                      handleSizeSelect(e.target.value);
                      e.target.value = "";
                    }}
                    style={{ ...smallButtonStyle, backgroundColor: "#f3e5f5", fontSize: 12 }}
                    value=""
                  >
                    <option value="">Select Size...</option>
                    {availableSizes.map((size) => (
                      <option key={size.serialNo} value={size.serialNo}>
                        {size.sizeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Selected Accessories */}
            {selectedAccessories.length > 0 && (
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: "#ff9800" }}>Selected Accessories ({selectedAccessories.length})</div>
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {selectedAccessories.map((a, idx) => {
                    const procs = processesByAccessoryName.get((a.materialName || "").trim()) || [];
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          marginBottom: 4,
                          backgroundColor: idx % 2 === 0 ? "#f8f9fa" : "#fff",
                          borderRadius: 4,
                          fontSize: 12,
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.materialName}</div>
                          <div style={{ color: "#666", fontSize: 11 }}>
                            {a.code} | {a.materialGroupName}
                          </div>
                          <div style={{ color: "#888", fontSize: 10 }}>Unit: {a.materialUnit}</div>
                          <div style={{ color: "#4b0082", fontSize: 10, marginTop: 2 }}>
                            Processes: <b>{procs.length ? procs.join(", ") : "-"}</b>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveAccessory(a.id)} style={removeButtonStyle}>
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Shades */}
            {selectedShades.length > 0 && (
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: "#007bff" }}>Selected Shades ({selectedShades.length})</div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {selectedShades.map((s, idx) => (
                    <div
                      key={s.shadeCode}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 8px",
                        marginBottom: 4,
                        backgroundColor: idx % 2 === 0 ? "#f8f9fa" : "#fff",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.shadeName}</div>
                        <div style={{ color: "#666" }}>
                          {s.shadeCode} | {s.colorFamily}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveShade(s.shadeCode)} style={removeButtonStyle}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Sizes */}
            {selectedSizes.length > 0 && (
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: "#9c27b0" }}>Selected Sizes ({selectedSizes.length})</div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f3e5f5" }}>
                        <th style={{ ...thtd, fontSize: 10 }}>Size</th>
                        <th style={{ ...thtd, fontSize: 10, textAlign: "center" }}>Box</th>
                        <th style={{ ...thtd, fontSize: 10, textAlign: "center" }}>Pcs</th>
                        <th style={{ ...thtd, fontSize: 10, textAlign: "right" }}>Rate</th>
                        <th style={{ ...thtd, fontSize: 10, textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSizes.map((s, idx) => (
                        <tr key={s.serialNo} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                          <td style={{ ...thtd, fontWeight: 700 }}>{s.sizeName}</td>
                          <td style={{ ...thtd, textAlign: "center" }}>
                            <input
                              value={s.box || ""}
                              onChange={(e) => setSelectedSizes((prev) => prev.map((x, i) => (i === idx ? { ...x, box: e.target.value } : x)))}
                              style={{ width: "100%", padding: 4, border: "1px solid #ddd", borderRadius: 3, textAlign: "center", fontSize: 11 }}
                            />
                          </td>
                          <td style={{ ...thtd, textAlign: "center" }}>
                            <input
                              value={s.pcs || ""}
                              onChange={(e) => setSelectedSizes((prev) => prev.map((x, i) => (i === idx ? { ...x, pcs: e.target.value } : x)))}
                              style={{ width: "100%", padding: 4, border: "1px solid #ddd", borderRadius: 3, textAlign: "center", fontSize: 11 }}
                            />
                          </td>
                          <td style={{ ...thtd, textAlign: "right" }}>
                            <input
                              value={s.rate || ""}
                              onChange={(e) => setSelectedSizes((prev) => prev.map((x, i) => (i === idx ? { ...x, rate: e.target.value } : x)))}
                              style={{ width: "100%", padding: 4, border: "1px solid #ddd", borderRadius: 3, textAlign: "right", fontSize: 11 }}
                            />
                          </td>
                          <td style={{ ...thtd, textAlign: "center" }}>
                            <button type="button" onClick={() => handleRemoveSize(s.serialNo)} style={removeButtonStyle}>
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

        {/* Footer buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
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

      {/* ✅ ACCESSORIES MODAL (ALL processes visible, PRINT added) */}
      {isAccessoriesModalOpen && (
        <div style={modalOverlayStyle} onClick={handleCloseAccessoriesModal}>
          <div style={{ ...modalStyle, maxWidth: "950px", backgroundColor: "#e6e6fa" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...modalHeaderStyle, backgroundColor: "#e6e6fa", borderBottom: "2px solid #9370db" }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "#4b0082" }}>Enter Accessory Detail (All Processes)</h3>
              <button style={closeButtonStyle} onClick={handleCloseAccessoriesModal}>
                &times;
              </button>
            </div>

            <div style={{ marginBottom: 10, fontSize: 12, color: "#444" }}>
              Total Processes: <b>{processOptionsForAccessories.length}</b> &nbsp;|&nbsp; Grand Total: <b>{grandTotal}</b>
            </div>

            {processOptionsForAccessories.map((proc) => {
              const rows = accessoryRowsByProcess[proc] || [];
              const mi = manualInputByProcess[proc] || { name: "", qty: "", rate: "" };
              const masterList = materialsByProcess[proc] || [];
              const total = processTotal(proc).toFixed(2);

              return (
                <div key={proc} style={{ marginBottom: 16, background: "white", border: "1px solid #9370db", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ padding: "10px 12px", background: "#d8bfd8", fontWeight: 800, display: "flex", justifyContent: "space-between" }}>
                    <div>Process: {proc}</div>
                    <div>Total: {total}</div>
                  </div>

                  <div style={{ padding: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1e6ff" }}>
                          <th style={{ ...thtd, padding: 8, fontWeight: "bold", borderColor: "#9370db", width: 60 }}>S No</th>
                          <th style={{ ...thtd, padding: 8, fontWeight: "bold", borderColor: "#9370db" }}>Accessory Name</th>
                          <th style={{ ...thtd, padding: 8, fontWeight: "bold", borderColor: "#9370db", width: 110 }}>Qty</th>
                          <th style={{ ...thtd, padding: 8, fontWeight: "bold", borderColor: "#9370db", width: 110 }}>Rate</th>
                          <th style={{ ...thtd, padding: 8, fontWeight: "bold", borderColor: "#9370db", width: 120 }}>Amount</th>
                          <th style={{ ...thtd, padding: 8, fontWeight: "bold", borderColor: "#9370db", width: 120 }}>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map((row, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8ff" }}>
                            <td style={{ ...thtd, padding: 6, textAlign: "center" }}>{row.sno}</td>
                            <td style={{ ...thtd, padding: 6 }}>{row.accessoryName}</td>
                            <td style={{ ...thtd, padding: 6 }}>
                              <input
                                type="number"
                                value={row.qty}
                                onChange={(e) => handleAccessoryRowChangeInProcess(proc, index, "qty", e.target.value)}
                                style={{ width: "100%", padding: 4, border: "1px solid #ccc", borderRadius: 3, fontSize: 12 }}
                                step="0.01"
                              />
                            </td>
                            <td style={{ ...thtd, padding: 6 }}>
                              <input
                                type="number"
                                value={row.rate}
                                onChange={(e) => handleAccessoryRowChangeInProcess(proc, index, "rate", e.target.value)}
                                style={{ width: "100%", padding: 4, border: "1px solid #ccc", borderRadius: 3, fontSize: 12 }}
                                step="0.01"
                              />
                            </td>
                            <td style={{ ...thtd, padding: 6, textAlign: "right" }}>{row.amount}</td>
                            <td style={{ ...thtd, padding: 6, textAlign: "center" }}>
                              <button onClick={() => handleRemoveAccessoryRowInProcess(proc, index)} style={{ ...removeButtonStyle, padding: "4px 8px", fontSize: 11 }}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* Add row */}
                        <tr style={{ backgroundColor: "#fff8dc" }}>
                          <td style={{ ...thtd, padding: 6, borderColor: "#9370db", textAlign: "center" }}>+</td>

                          <td style={{ ...thtd, padding: 6, borderColor: "#9370db" }}>
                            <input
                              type="text"
                              list={`material-master-datalist-${proc}`}
                              value={mi.name}
                              onChange={(e) =>
                                setManualInputByProcess((prev) => ({
                                  ...prev,
                                  [proc]: { ...mi, name: e.target.value },
                                }))
                              }
                              placeholder="Search & select material..."
                              style={{ width: "100%", padding: 4, border: "1px solid #9370db", borderRadius: 3, fontSize: 12 }}
                            />
                            <datalist id={`material-master-datalist-${proc}`}>
                              {availableMaterials.map((m) => (
                                <option key={m.id} value={m.materialName} />
                              ))}
                            </datalist>

                            {masterList.length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                <select
                                  onChange={(e) => {
                                    addAccessoryFromDropdownToProcess(proc, e.target.value);
                                    e.target.value = "";
                                  }}
                                  style={{ width: "100%", padding: 4, border: "1px solid #9370db", borderRadius: 3, fontSize: 12, fontWeight: "bold" }}
                                >
                                  <option value="">-- Or Select from Process List --</option>
                                  {masterList.map((mName) => (
                                    <option key={mName} value={mName}>
                                      {mName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </td>

                          <td style={{ ...thtd, padding: 6, borderColor: "#9370db" }}>
                            <input
                              type="number"
                              value={mi.qty}
                              onChange={(e) =>
                                setManualInputByProcess((prev) => ({
                                  ...prev,
                                  [proc]: { ...mi, qty: e.target.value },
                                }))
                              }
                              placeholder="0.00"
                              step="0.01"
                              style={{ width: "100%", padding: 4, border: "1px solid #ccc", borderRadius: 3, fontSize: 12 }}
                            />
                          </td>

                          <td style={{ ...thtd, padding: 6, borderColor: "#9370db" }}>
                            <input
                              type="number"
                              value={mi.rate}
                              onChange={(e) =>
                                setManualInputByProcess((prev) => ({
                                  ...prev,
                                  [proc]: { ...mi, rate: e.target.value },
                                }))
                              }
                              placeholder="0.00"
                              step="0.01"
                              style={{ width: "100%", padding: 4, border: "1px solid #ccc", borderRadius: 3, fontSize: 12 }}
                            />
                          </td>

                          <td style={{ ...thtd, padding: 6, borderColor: "#9370db", textAlign: "right" }}>
                            {((parseFloat(mi.qty) || 0) * (parseFloat(mi.rate) || 0)).toFixed(2)}
                          </td>

                          <td style={{ ...thtd, padding: 6, borderColor: "#9370db", textAlign: "center" }}>
                            <button onClick={() => addAccessoryRowToProcess(proc)} style={{ ...buttonStyle, padding: "4px 10px", fontSize: 11, backgroundColor: "#4caf50" }}>
                              Add
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Footer (Save + Print) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                padding: 12,
                backgroundColor: "white",
                borderRadius: 6,
                border: "1px solid #9370db",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={saveAllAccessoriesFromModal} style={{ ...buttonStyle, backgroundColor: "#007bff" }}>
                  Save All
                </button>
                <button onClick={saveAndCloseAccessoriesModal} style={{ ...buttonStyle, backgroundColor: "#4caf50" }}>
                  Save & Close
                </button>
                <button type="button" onClick={handlePrintAccessories} style={{ ...buttonStyle, backgroundColor: "#6c757d" }}>
                  Print
                </button>
              </div>

              <div style={{ fontWeight: "bold", fontSize: 14 }}>
                Grand Total: <span style={{ color: "#4b0082" }}>{grandTotal}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ART LIST MODAL */}
      {isModalOpen && (
        <div style={modalOverlayStyle} onClick={handleCloseModal}>
          <div style={{ ...modalStyle, maxWidth: "1100px" }} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0 }}>
                Art List {loading && <span style={{ fontSize: 12, color: "#007bff" }}>(Loading...)</span>}
              </h3>
              <button style={closeButtonStyle} onClick={handleCloseModal}>
                &times;
              </button>
            </div>

            <div style={{ marginBottom: 15 }}>
              <input
                type="text"
                placeholder="Search by Art No, Art Name, Serial Number, or Art Group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  border: "2px solid #007bff",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  Found {filteredArtList.length} result{filteredArtList.length !== 1 ? "s" : ""}
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      marginLeft: 10,
                      padding: "2px 8px",
                      fontSize: 11,
                      border: "1px solid #dc3545",
                      borderRadius: 3,
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
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1000 }}>
                <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8f9fa", zIndex: 1 }}>
                  <tr>
                    <th style={{ ...thtd, textAlign: "center", width: 50 }}>S.No</th>
                    <th style={{ ...thtd, width: 130 }}>Serial Number</th>
                    <th style={{ ...thtd, width: 110 }}>Art Group</th>
                    <th style={{ ...thtd, minWidth: 150 }}>Art Name</th>
                    <th style={{ ...thtd, width: 100 }}>Art No</th>
                    <th style={{ ...thtd, width: 120 }}>Style Name</th>
                    <th style={{ ...thtd, textAlign: "right", width: 90 }}>Sale Rate</th>
                    <th style={{ ...thtd, width: 80 }}>Season</th>
                    <th style={{ ...thtd, width: 110 }}>Brand Name</th>
                    <th style={{ ...thtd, textAlign: "center", width: 130 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArtList.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ ...thtd, textAlign: "center", padding: 40, color: "#999" }}>
                        {searchQuery ? "No arts found matching your search" : "No arts available"}
                      </td>
                    </tr>
                  ) : (
                    filteredArtList.map((art, index) => (
                      <tr key={art.serialNumber} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                        <td style={{ ...thtd, textAlign: "center" }}>{index + 1}</td>
                        <td style={{ ...thtd, fontFamily: "monospace" }}>{art.serialNumber}</td>
                        <td style={thtd}>{art.artGroup || "-"}</td>
                        <td style={{ ...thtd, fontWeight: 500 }}>{art.artName}</td>
                        <td style={{ ...thtd, fontWeight: "bold", color: "#0066cc" }}>{art.artNo || "-"}</td>
                        <td style={thtd}>{art.styleName || "-"}</td>
                        <td style={{ ...thtd, textAlign: "right", fontWeight: "bold" }}>{art.saleRate ? `₹${art.saleRate}` : "-"}</td>
                        <td style={thtd}>{art.season || "-"}</td>
                        <td style={thtd}>{art.brandName || "-"}</td>
                        <td style={{ ...thtd, textAlign: "center" }}>
                          <button style={editButtonStyle} onClick={() => handleEditArt(art)} disabled={loading}>
                            Edit
                          </button>
                          <button style={deleteButtonStyle} onClick={() => handleDeleteArt(art)} disabled={loading}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <div style={{ fontSize: 13, color: "#666" }}>
                Total Arts: <strong>{filteredArtList.length}</strong>
              </div>
              <button style={buttonStyle} onClick={handleCloseModal} disabled={loading}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIZE MODAL */}
      {isSizeModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setIsSizeModalOpen(false)}>
          <div style={{ ...modalStyle, maxWidth: 450, backgroundColor: "#f3e5f5" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...modalHeaderStyle, backgroundColor: "#f3e5f5", borderBottom: "2px solid #9c27b0" }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "#9c27b0" }}>
                Enter Details for Size: {availableSizes.find((s) => s.serialNo === currentSizeSelection)?.sizeName || ""}
              </h3>
              <button style={closeButtonStyle} onClick={() => setIsSizeModalOpen(false)}>
                &times;
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: "bold", fontSize: 13 }}>Box:</label>
              <input
                type="text"
                value={sizeDetails.box}
                onChange={(e) => setSizeDetails({ ...sizeDetails, box: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #9c27b0", borderRadius: 4 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: "bold", fontSize: 13 }}>Pcs:</label>
              <input
                type="text"
                value={sizeDetails.pcs}
                onChange={(e) => setSizeDetails({ ...sizeDetails, pcs: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #9c27b0", borderRadius: 4 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: "bold", fontSize: 13 }}>Rate:</label>
              <input
                type="text"
                value={sizeDetails.rate}
                onChange={(e) => setSizeDetails({ ...sizeDetails, rate: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #9c27b0", borderRadius: 4 }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setIsSizeModalOpen(false)} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: 4 }}>
                Cancel
              </button>
              <button onClick={handleSaveSize} style={{ padding: "8px 16px", border: "none", borderRadius: 4, backgroundColor: "#9c27b0", color: "white" }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default ArtCreation;