import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import api from "../../api/axiosInstance";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { INDIA_STATES } from "../../api/indiaStates";

type ColumnId =
  | "srNo"
  | "serialNumber"
  | "partyName"
  | "gstNo"
  | "mobileNo"
  | "stateName"
  | "station"
  | "category"
  | "openingBalance"
  | "openingTaxBalance"
  | "date"
  | "agent"
  | "transport"
  | "creditDays"
  | "creditAmount";

const columnLabels: Record<ColumnId, string> = {
  srNo: "Sr No",
  serialNumber: "Serial No",
  partyName: "Party Name",
  gstNo: "GST No",
  mobileNo: "Mobile No",
  stateName: "State Name",
  station: "Station",
  category: "Category",
  openingBalance: "Opening Balance",
  openingTaxBalance: "Opening Tax Balance",
  date: "Date",
  agent: "Agent",
  transport: "Transporter",
  creditDays: "Credit Days",
  creditAmount: "Credit Amount",
};

const PartyCreation: React.FC = () => {
  const [formData, setFormData] = useState<any>({
    id: null,
    serialNumber: "",
    partyName: "",
    address: "",
    mobileNo: "",
    gstNo: "",
    openingBalance: "",
    openingBalanceType: "CR",
    openingTaxBalance: "",
    date: "",
    category: { serialNo: "", categoryName: "" },
    stateName: "",
    stateCode: "",
    agent: { serialNo: "" },
    transport: { serialNumber: "" },
    creditDays: "",
    creditAmount: "",
    station: "",
    customerGrade: "Standard",
  });

  const [allParties, setAllParties] = useState<any[]>([]);
  const [filteredParties, setFilteredParties] = useState<any[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [agents, setAgents] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [customerGrades, setCustomerGrades] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [filterState, setFilterState] = useState<string>("");
  const [filterStation, setFilterStation] = useState<string>("");
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterTransport, setFilterTransport] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // ---------- Station dropdown ----------
  const [stationOptions, setStationOptions] = useState<string[]>([]);
  const [isStationDropdownOpen, setIsStationDropdownOpen] =
    useState<boolean>(false);
  const [stationSearchTerm, setStationSearchTerm] = useState<string>("");
  const stationWrapperRef = useRef<HTMLDivElement | null>(null);

  // Column visibility for table + print
  const [columnVisibility, setColumnVisibility] = useState<
    Record<ColumnId, boolean>
  >({
    srNo: true,
    serialNumber: true,
    partyName: true,
    gstNo: true,
    mobileNo: true,
    stateName: true,
    station: true,
    category: true,
    openingBalance: true,
    openingTaxBalance: true,
    date: true,
    agent: true,
    transport: true,
    creditDays: true,
    creditAmount: true,
  });

  // Hidden full table for PDF (all columns)
  const pdfTableRef = useRef<HTMLDivElement | null>(null);

  // ------------ Dropdowns ------------
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [gradesRes, categoriesRes, agentsRes, transportsRes] =
          await Promise.all([
            api.get("/grades").catch(() => ({ data: [] })),
            api.get("/categories").catch(() => ({ data: [] })),
            api.get("/agent/list").catch(() => ({ data: [] })),
            api.get("/transports").catch(() => ({ data: [] })),
          ]);

        setCustomerGrades(gradesRes.data);
        setCategories(categoriesRes.data);
        setAgents(agentsRes.data);
        setTransports(transportsRes.data);
      } catch (err) {
        console.error("Dropdown load error", err);
      }
    };

    loadDropdowns();
  }, []);

  // ------------ Parties list ------------
  const loadAllParties = async () => {
    try {
      const response = await api.get("/party/all");
      setAllParties(response.data);
      setFilteredParties(response.data);
      setFilterState("");
      setFilterStation("");
      setFilterAgent("");
      setFilterTransport("");
      setSearchTerm("");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load parties", "error");
    }
  };

  useEffect(() => {
    loadAllParties();
  }, []);

  // Build station options from all parties whenever data changes
  useEffect(() => {
    const stations = Array.from(
      new Set(
        allParties
          .map((p: any) => p.station)
          .filter(
            (v: any) => v !== null && v !== undefined && v.toString().trim() !== ""
          )
      )
    ).sort((a: string, b: string) => a.localeCompare(b));
    setStationOptions(stations);
  }, [allParties]);

  // click-outside to close custom station dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stationWrapperRef.current &&
        !stationWrapperRef.current.contains(event.target as Node)
      ) {
        setIsStationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // filtered station list based on search term in dropdown
  const filteredStationOptions = useMemo(() => {
    const q = stationSearchTerm.trim().toLowerCase();
    if (!q) return stationOptions;
    return stationOptions.filter((s) => s.toLowerCase().includes(q));
  }, [stationOptions, stationSearchTerm]);

  const stationExistsExact = useMemo(
    () =>
      !!stationSearchTerm.trim() &&
      stationOptions.some(
        (s) => s.toLowerCase() === stationSearchTerm.trim().toLowerCase()
      ),
    [stationOptions, stationSearchTerm]
  );

  // ------------ Form handlers ------------
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target as HTMLInputElement;

    if (name === "agent") {
      setFormData((prev: any) => ({ ...prev, agent: { serialNo: value } }));
    } else if (name === "transport") {
      setFormData((prev: any) => ({
        ...prev,
        transport: { serialNumber: value },
      }));
    } else if (name === "category") {
      const selectedCategory = categories.find((c) => c.serialNo === value);
      setFormData((prev: any) => ({
        ...prev,
        category: selectedCategory || { serialNo: "", categoryName: "" },
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const isEditMode = useMemo(
    () =>
      formData.serialNumber &&
      allParties.some((t) => t.serialNumber === formData.serialNumber),
    [formData.serialNumber, allParties]
  );

  // Auto-generate serial number for new records
  useEffect(() => {
    if (!formData.serialNumber) {
      const prefix = "PT";
      const year = new Date().getFullYear();
      const unique = Date.now().toString().slice(-4);
      const serial = `${prefix}${year}${unique}`;
      setFormData((prev: any) => ({ ...prev, serialNumber: serial }));
    }
  }, [formData.serialNumber]);

  const handleSave = async () => {
    try {
      if (!formData.openingBalanceType) formData.openingBalanceType = "CR";

      if (formData.id) {
        await api.put(`/party/update/${formData.id}`, formData);
        Swal.fire("Updated!", "Party updated successfully", "success");
      } else {
        await api.post("/party/save", formData);
        Swal.fire("Added!", "Party saved successfully", "success");
      }

      // After save, reload parties. New station (if any) will come in this list,
      // and stationOptions (derived from allParties) will include it automatically.
      loadAllParties();
      handleAddNew();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save party", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/party/delete/${id}`);
      Swal.fire("Deleted!", "Party deleted successfully", "success");
      loadAllParties();
      handleAddNew();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete party", "error");
    }
  };

  const handleAddNew = () => {
    setFormData({
      id: null,
      serialNumber: "",
      partyName: "",
      address: "",
      mobileNo: "",
      gstNo: "",
      openingBalance: "",
      openingBalanceType: "CR",
      openingTaxBalance: "",
      date: "",
      category: { serialNo: "", categoryName: "" },
      stateName: "",
      stateCode: "",
      agent: { serialNo: "" },
      transport: { serialNumber: "" },
      creditDays: "",
      creditAmount: "",
      station: "",
      customerGrade: "Standard",
    });
  };

  const formatOpeningBalance = (p: any) => {
    if (
      p.openingBalance === null ||
      p.openingBalance === undefined ||
      p.openingBalance === ""
    )
      return "";
    const type = p.openingBalanceType || "CR";
    const label = type === "DR" ? "Dr" : "Cr";
    return `${p.openingBalance} ${label}`;
  };

  // ------------ Filters ------------
  const applyFilters = (overrides?: {
    term?: string;
    state?: string;
    station?: string;
    agent?: string;
    transport?: string;
  }) => {
    const termRaw = overrides?.term ?? searchTerm;
    const term = (termRaw || "").toLowerCase();

    const stateFilter = overrides?.state ?? filterState;
    const stationFilter = overrides?.station ?? filterStation;
    const agentFilter = overrides?.agent ?? filterAgent;
    const transportFilter = overrides?.transport ?? filterTransport;

    let filtered = allParties;

    if (term) {
      filtered = filtered.filter((p: any) => {
        const values = [
          p.serialNumber,
          p.partyName,
          p.gstNo,
          p.mobileNo,
          p.stateName,
          p.station,
          p.category?.categoryName,
          p.agent?.agentName,
          p.transport?.transportName,
        ];
        return values
          .filter((v) => v !== null && v !== undefined)
          .some((v) =>
            v
              .toString()
              .toLowerCase()
              .includes(term)
          );
      });
    }

    if (stateFilter) {
      filtered = filtered.filter((p: any) => p.stateName === stateFilter);
    }

    if (stationFilter) {
      filtered = filtered.filter((p: any) => p.station === stationFilter);
    }

    if (agentFilter) {
      filtered = filtered.filter(
        (p: any) => p.agent && p.agent.agentName === agentFilter
      );
    }

    if (transportFilter) {
      filtered = filtered.filter(
        (p: any) => p.transport && p.transport.transportName === transportFilter
      );
    }

    setFilteredParties(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters({ term });
  };

  const uniqueStates = useMemo(
    () =>
      Array.from(
        new Set(
          allParties
            .map((p: any) => p.stateName)
            .filter((v: any) => v !== null && v !== undefined && v !== "")
        )
      ),
    [allParties]
  );

  const uniqueStations = useMemo(() => {
    let source = allParties;
    if (filterState) {
      source = allParties.filter((p: any) => p.stateName === filterState);
    }
    return Array.from(
      new Set(
        source
          .map((p: any) => p.station)
          .filter((v: any) => v !== null && v !== undefined && v !== "")
      )
    );
  }, [allParties, filterState]);

  const uniqueAgents = useMemo(
    () =>
      Array.from(
        new Set(
          allParties
            .map((p: any) => p.agent?.agentName)
            .filter((v: any) => v !== null && v !== undefined && v !== "")
        )
      ),
    [allParties]
  );

  const uniqueTransports = useMemo(
    () =>
      Array.from(
        new Set(
          allParties
            .map((p: any) => p.transport?.transportName)
            .filter((v: any) => v !== null && v !== undefined && v !== "")
        )
      ),
    [allParties]
  );

  // ------------ Column visibility handlers ------------
  const handleToggleColumn = (id: ColumnId) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getPrintColumns = (): ColumnId[] => {
    const selected = (Object.keys(columnVisibility) as ColumnId[]).filter(
      (id) => columnVisibility[id]
    );
    if (selected.length === 0) {
      // If no columns are selected, print all of them as a fallback
      return Object.keys(columnVisibility) as ColumnId[];
    }
    return selected;
  };

  const getColumnValueForPrint = (
    colId: ColumnId,
    p: any,
    idx: number
  ): string => {
    switch (colId) {
      case "srNo":
        return String(idx + 1);
      case "serialNumber":
        return p.serialNumber || "";
      case "partyName":
        return p.partyName || "";
      case "gstNo":
        return p.gstNo || "";
      case "mobileNo":
        return p.mobileNo || "";
      case "stateName":
        return p.stateName || "";
      case "station":
        return p.station || "";
      case "category":
        return p.category?.categoryName || "";
      case "openingBalance":
        return formatOpeningBalance(p) || "";
      case "openingTaxBalance":
        return p.openingTaxBalance === null ||
          p.openingTaxBalance === undefined
          ? ""
          : String(p.openingTaxBalance);
      case "date":
        return p.date || "";
      case "agent":
        return p.agent?.agentName || "";
      case "transport":
        return p.transport?.transportName || "";
      case "creditDays":
        return p.creditDays === null || p.creditDays === undefined
          ? ""
          : String(p.creditDays);
      case "creditAmount":
        return p.creditAmount === null || p.creditAmount === undefined
          ? ""
          : String(p.creditAmount);
      default:
        return "";
    }
  };

  // ------------ Print ------------
  const handlePrint = () => {
    if (!filteredParties.length) {
      Swal.fire("No data", "No parties to print. Check filters.", "info");
      return;
    }

    // Sort parties alphabetically by partyName for printing
    const partiesToPrintSorted = [...filteredParties].sort((a, b) =>
      (a.partyName || "").localeCompare(b.partyName || "")
    );

    const cols = getPrintColumns();

    const headerHtml = cols
      .map((colId) => `<th>${columnLabels[colId]}</th>`)
      .join("");

    const bodyHtml = partiesToPrintSorted // Use the sorted array here
      .map((p, i) => {
        const cells = cols
          .map(
            (colId) =>
              `<td>${getColumnValueForPrint(colId, p, i)
                .toString()
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</td>`
          )
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const today = new Date().toLocaleDateString("en-IN");
    const w = window.open("", "_blank");
    if (!w) return;

    const html = `
      <html>
        <head>
          <title>Party List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 12px; }
            h2 { text-align:center; margin: 0 0 8px; }
            h4 { text-align:center; margin: 0 0 8px; font-weight: normal; }
            table { width:100%; border-collapse:collapse; margin-top:10px; }
            th,td { border:1px solid #333; padding:6px; font-size:12px; text-align:center; }
            thead th { background:#eee; }
          </style>
        </head>
        <body>
          <h2>Party Master List</h2>
          <h4>As On: ${today}</h4>
          <table>
            <thead>
              <tr>${headerHtml}</tr>
            </thead>
            <tbody>
              ${bodyHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  // ------------ Export PDF (always ALL columns) ------------
  const handleExportPDF = async () => {
    if (!filteredParties.length) {
      Swal.fire("No data", "No parties to export. Check filters.", "info");
      return;
    }

    const input = pdfTableRef.current;
    if (!input) {
      Swal.fire("Error", "Table not found for export.", "error");
      return;
    }

    try {
      // Sort parties alphabetically by partyName for PDF export as well
      const partiesForPdf = [...filteredParties].sort((a, b) =>
        (a.partyName || "").localeCompare(b.partyName || "")
      );

      // Temporarily render a full table with ALL columns for html2canvas
      // This is necessary because html2canvas only renders what's visible
      // in the DOM, so we use the hidden `pdfTableRef` which contains all columns.
      // We need to pass the sorted data to it somehow for rendering.
      // A more robust solution might involve creating the PDF HTML manually,
      // similar to `handlePrint`, but for a fixed-layout PDF.
      // For now, we'll assume `pdfTableRef` gets its data from `filteredParties`
      // and sort `filteredParties` before calling `html2canvas`.

      // To make pdfTableRef use the sorted data, you'd typically need to
      // re-render it with the sorted data. Since it's hidden and always
      // renders all parties, we just need to ensure the data source `filteredParties`
      // is sorted *before* `html2canvas` is called.
      // The current `pdfTableRef` JSX already iterates over `filteredParties`.
      // The `filteredParties` state itself is what needs to be sorted temporarily
      // or a new component needs to render the sorted list.
      // For `html2canvas` on a hidden element, it will capture what's in the DOM.
      // The most straightforward way is to manage the sort on `filteredParties`
      // before it's passed to the hidden table, or ensure the hidden table
      // explicitly uses a sorted version.

      // A simple approach for the `pdfTableRef` is to use the `partiesForPdf` directly:
      // This part is tricky. `html2canvas(input)` will capture the current state of `input`.
      // If `input`'s content is rendered from `filteredParties`, then `filteredParties`
      // *must* be sorted before `html2canvas` is called.

      // Let's modify the JSX for `pdfTableRef` slightly to accept a prop
      // or ensure `filteredParties` is sorted before being rendered into the ref.
      // Since `pdfTableRef` is rendered using `filteredParties.map`,
      // we need to make sure `filteredParties` is sorted at the moment of capture.
      // The easiest way for a one-off capture is to generate the HTML string
      // or modify the ref's content directly (less React-idiomatic).
      // Given `pdfTableRef` directly renders from `filteredParties`, we need
      // to make a temporary `div` or ensure the `filteredParties` state is sorted.

      // For simplicity and correctness with the existing structure, let's create
      // a temporary div, populate it with sorted data, and then capture it.
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = `
        <style>
          table { width:100%; border-collapse:collapse; margin-top:10px; }
          th,td { border:1px solid #333; padding:4px; font-size:10px; text-align:center; }
          thead th { background:#eee; }
        </style>
        <table>
          <thead>
            <tr>
              <th>Sr No</th><th>Serial No</th><th>Party Name</th><th>GST No</th>
              <th>Mobile No</th><th>State Name</th><th>Station</th><th>Category</th>
              <th>Opening Balance</th><th>Opening Tax Balance</th><th>Date</th>
              <th>Agent</th><th>Transporter</th><th>Credit Days</th><th>Credit Amount</th>
            </tr>
          </thead>
          <tbody>
            ${partiesForPdf.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${p.serialNumber || ''}</td>
                <td>${p.partyName || ''}</td>
                <td>${p.gstNo || ''}</td>
                <td>${p.mobileNo || ''}</td>
                <td>${p.stateName || ''}</td>
                <td>${p.station || ''}</td>
                <td>${p.category?.categoryName || ''}</td>
                <td>${formatOpeningBalance(p) || ''}</td>
                <td>${p.openingTaxBalance === null || p.openingTaxBalance === undefined ? '' : String(p.openingTaxBalance)}</td>
                <td>${p.date || ''}</td>
                <td>${p.agent?.agentName || ''}</td>
                <td>${p.transport?.transportName || ''}</td>
                <td>${p.creditDays === null || p.creditDays === undefined ? '' : String(p.creditDays)}</td>
                <td>${p.creditAmount === null || p.creditAmount === undefined ? '' : String(p.creditAmount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      document.body.appendChild(tempDiv); // Temporarily add to DOM for capture

      const canvas = await html2canvas(tempDiv, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;

      const ratio = Math.min(pdfWidth / imgWidthPx, pdfHeight / imgHeightPx);
      const imgWidth = imgWidthPx * ratio * 0.9; // Adjust scale for better fit
      const imgHeight = imgHeightPx * ratio * 0.9; // Adjust scale for better fit

      const x = (pdfWidth - imgWidth) / 2;
      const y = 10;

      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`party-list-${Date.now()}.pdf`);

      document.body.removeChild(tempDiv); // Clean up temporary div

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to export PDF", "error");
    }
  };

  // ------------ Inline styles ------------
  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "10px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };
  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "17px",
    alignItems: "center",
    marginBottom: "10px",
  };
  const labelStyle: React.CSSProperties = {
    width: "150px",
    fontWeight: "bold",
  };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "none",
    height: "50px",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };

  const modalContainerStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 8,
    width: isFullScreen ? "98vw" : "90vw",
    height: isFullScreen ? "96vh" : "80vh",
    maxWidth: "1600px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    position: "relative",
  };

  const modalHeaderStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderBottom: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const modalBodyStyle: React.CSSProperties = {
    padding: "10px 16px 12px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  };

  const modalFooterStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderTop: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  };

  const tableWrapperStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    marginTop: 8,
    border: "1px solid #eee",
    overflowX: "auto",
    overflowY: "auto",
  };

  const headerTitleStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
  };

  const smallTextStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#666",
  };

  const stationDropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderTop: "none",
    zIndex: 20,
  };

  const stationDropdownItemStyle: React.CSSProperties = {
    padding: "6px 10px",
    cursor: "pointer",
  };

  // ------------ JSX ------------
  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2
          style={{
            textAlign: "center",
            marginBottom: "10px",
            fontSize: "25px",
            fontWeight: 800,
          }}
        >
          Party Creation
        </h2>
        <form>
          <div style={formRowStyle}>
            <label style={labelStyle}>Serial Number</label>
            <input
              name="serialNumber"
              value={formData.serialNumber || ""}
              onChange={handleChange}
              style={{
                ...inputStyle,
                backgroundColor: isEditMode ? "#f8f9fa" : "#e9ecef",
              }}
              disabled
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>GST No.</label>
            <input
              type="text"
              name="gstNo"
              value={formData.gstNo}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Party Name</label>
            <input
              type="text"
              name="partyName"
              value={formData.partyName}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Mobile No.</label>
            <input
              type="text"
              name="mobileNo"
              value={formData.mobileNo}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              style={textareaStyle}
            ></textarea>
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Opening Balance</label>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <input
                type="number"
                name="openingBalance"
                value={formData.openingBalance}
                onChange={handleChange}
                style={inputStyle}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                <input
                  type="radio"
                  name="openingBalanceType"
                  value="CR"
                  checked={formData.openingBalanceType === "CR"}
                  onChange={handleChange}
                />
                Credit
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                <input
                  type="radio"
                  name="openingBalanceType"
                  value="DR"
                  checked={formData.openingBalanceType === "DR"}
                  onChange={handleChange}
                />
                Debit
              </label>
            </div>

            <label style={labelStyle}>Opening Tax Balance</label>
            <input
              type="number"
              name="openingTaxBalance"
              value={formData.openingTaxBalance}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Category</label>
            <select
              name="category"
              value={formData.category.serialNo}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.serialNo} value={c.serialNo}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>State Name</label>
            <select
              value={formData.stateName}
              onChange={(e) => {
                const selected = INDIA_STATES.find(
                  (s) => s.name === e.target.value
                );

                setFormData((prev: any) => ({
                  ...prev,
                  stateName: selected?.name || "",
                  stateCode: selected?.code || "",
                }));
              }}
              style={inputStyle}
            >
              <option value="">-- Select State --</option>
              {INDIA_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <label style={labelStyle}>State Code</label>
            <input
              type="text"
              value={formData.stateCode}
              disabled
              style={{ ...inputStyle, backgroundColor: "#e9ecef" }}
            />
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Station</label>
            <div
              ref={stationWrapperRef}
              style={{ position: "relative", flex: 1 }}
            >
              {/* Clickable label area */}
              <div
                onClick={() => {
                  setIsStationDropdownOpen((prev) => !prev);
                  setStationSearchTerm("");
                }}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    color: formData.station ? "#000" : "#6c757d",
                  }}
                >
                  {formData.station || "Select Station"}
                </span>
                <span style={{ fontSize: 12 }}>▼</span>
              </div>

              {/* Dropdown with search + list */}
              {isStationDropdownOpen && (
                <div style={stationDropdownStyle}>
                  <div style={{ padding: "6px 8px", borderBottom: "1px solid #ddd" }}>
                    <input
                      type="text"
                      value={stationSearchTerm}
                      onChange={(e) => setStationSearchTerm(e.target.value)}
                      placeholder="Search or type station"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        fontSize: 13,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {filteredStationOptions.map((st) => (
                      <div
                        key={st}
                        style={stationDropdownItemStyle}
                        onClick={() => {
                          setFormData((prev: any) => ({
                            ...prev,
                            station: st,
                          }));
                          setIsStationDropdownOpen(false);
                          setStationSearchTerm("");
                        }}
                      >
                        {st}
                      </div>
                    ))}

                    {/* Option to use new station if not in list */}
                    {stationSearchTerm.trim() && !stationExistsExact && (
                      <div
                        style={{
                          ...stationDropdownItemStyle,
                          borderTop: "1px solid #eee",
                          fontStyle: "italic",
                          backgroundColor: "#f8f9fa",
                        }}
                        onClick={() => {
                          const val = stationSearchTerm.trim();
                          setFormData((prev: any) => ({
                            ...prev,
                            station: val,
                          }));
                          setIsStationDropdownOpen(false);
                          setStationSearchTerm("");
                        }}
                      >
                        Use "{stationSearchTerm.trim()}"
                      </div>
                    )}

                    {filteredStationOptions.length === 0 &&
                      !stationSearchTerm.trim() && (
                        <div
                          style={{
                            ...stationDropdownItemStyle,
                            color: "#999",
                            cursor: "default",
                          }}
                        >
                          No stations available
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            <label style={labelStyle}>Grade</label>
            <select
              name="customerGrade"
              value={formData.customerGrade}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">-- Select Grade --</option>
              {customerGrades.map((g) => (
                <option key={g.serialNo} value={g.gradeName}>
                  {g.gradeName}
                </option>
              ))}
            </select>
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Agent Name</label>
            <select
              name="agent"
              value={formData.agent.serialNo}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">-- Select Agent --</option>
              {agents.map((a) => (
                <option key={a.serialNo} value={a.serialNo}>
                  {a.agentName}
                </option>
              ))}
            </select>

            <label style={labelStyle}>Transporter</label>
            <select
              name="transport"
              value={formData.transport.serialNumber}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">-- Select Transporter --</option>
              {transports.map((t) => (
                <option key={t.serialNumber} value={t.serialNumber}>
                  {t.transportName}
                </option>
              ))}
            </select>
          </div>

          <div style={formRowStyle}>
            <label style={labelStyle}>Credit Days</label>
            <input
              type="number"
              name="creditDays"
              value={formData.creditDays}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Credit Amount</label>
            <input
              type="number"
              name="creditAmount"
              value={formData.creditAmount}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginTop: "30px",
            }}
          >
            <button type="button" onClick={handleSave} style={buttonStyle}>
              {formData.id ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowListModal(true);
                setIsFullScreen(false);
              }}
              style={buttonStyle}
            >
              Party List
            </button>
          </div>
        </form>

        {/* --------- PARTY LIST MODAL --------- */}
        {showListModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContainerStyle}>
              {/* Header */}
              <div style={modalHeaderStyle}>
                <div style={headerTitleStyle}>
                  <span style={{ fontWeight: 600 }}>Party List</span>
                  <span style={smallTextStyle}>
                    Rows: {filteredParties.length}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#6c757d",
                      padding: "6px 10px",
                    }}
                    onClick={() => setIsFullScreen((prev) => !prev)}
                  >
                    {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                  <button
                    type="button"
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#dc3545",
                      padding: "6px 10px",
                    }}
                    onClick={() => {
                      setShowListModal(false);
                      setIsFullScreen(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={modalBodyStyle}>
                <input
                  type="text"
                  placeholder="Search by Serial No, Party Name, GST, Mobile, State..."
                  onChange={handleSearchChange}
                  value={searchTerm}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    marginBottom: 10,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <select
                    value={filterState}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterState(value);
                      setFilterStation("");
                      applyFilters({ state: value });
                    }}
                    style={{ padding: 8, minWidth: 150 }}
                  >
                    <option value="">All States</option>
                    {uniqueStates.map((s: any) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStation}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterStation(value);
                      applyFilters({ station: value });
                    }}
                    style={{ padding: 8, minWidth: 150 }}
                  >
                    <option value="">All Stations</option>
                    {uniqueStations.map((s: any) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterAgent}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterAgent(value);
                      applyFilters({ agent: value });
                    }}
                    style={{ padding: 8, minWidth: 150 }}
                  >
                    <option value="">All Agents</option>
                    {uniqueAgents.map((s: any) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterTransport}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterTransport(value);
                      applyFilters({ transport: value });
                    }}
                    style={{ padding: 8, minWidth: 150 }}
                  >
                    <option value="">All Transporters</option>
                    {uniqueTransports.map((s: any) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Column filters (for table + print) */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: 8,
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Columns:</span>
                  {(Object.keys(columnLabels) as ColumnId[]).map((id) => (
                    <label key={id} style={{ display: "flex", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={columnVisibility[id]}
                        onChange={() => handleToggleColumn(id)}
                      />
                      {columnLabels[id]}
                    </label>
                  ))}
                </div>

                {/* Scrollable table wrapper (visible, uses columnVisibility) */}
                <div style={tableWrapperStyle}>
                  <table
                    style={{
                      width: "100%",
                      minWidth: "1500px",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        {columnVisibility.srNo && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Sr No
                          </th>
                        )}
                        {columnVisibility.serialNumber && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Serial No
                          </th>
                        )}
                        {columnVisibility.partyName && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Party Name
                          </th>
                        )}
                        {columnVisibility.gstNo && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            GST No
                          </th>
                        )}
                        {columnVisibility.mobileNo && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Mobile No
                          </th>
                        )}
                        {columnVisibility.stateName && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            State Name
                          </th>
                        )}
                        {columnVisibility.station && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Station
                          </th>
                        )}
                        {columnVisibility.category && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Category
                          </th>
                        )}
                        {columnVisibility.openingBalance && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Opening Balance
                          </th>
                        )}
                        {columnVisibility.openingTaxBalance && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Opening Tax Balance
                          </th>
                        )}
                        {columnVisibility.date && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Date
                          </th>
                        )}
                        {columnVisibility.agent && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Agent
                          </th>
                        )}
                        {columnVisibility.transport && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Transporter
                          </th>
                        )}
                        {columnVisibility.creditDays && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Credit Days
                          </th>
                        )}
                        {columnVisibility.creditAmount && (
                          <th style={{ border: "1px solid #ddd", padding: 8 }}>
                            Credit Amount
                          </th>
                        )}
                        <th style={{ border: "1px solid #ddd", padding: 12 }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sort for display in modal table too (optional, but good for consistency) */}
                      {filteredParties.sort((a, b) =>
                        (a.partyName || "").localeCompare(b.partyName || "")
                      ).map((p, idx) => (
                        <tr key={p.id}>
                          {columnVisibility.srNo && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {idx + 1}
                            </td>
                          )}
                          {columnVisibility.serialNumber && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.serialNumber}
                            </td>
                          )}
                          {columnVisibility.partyName && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.partyName}
                            </td>
                          )}
                          {columnVisibility.gstNo && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.gstNo}
                            </td>
                          )}
                          {columnVisibility.mobileNo && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.mobileNo}
                            </td>
                          )}
                          {columnVisibility.stateName && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.stateName}
                            </td>
                          )}
                          {columnVisibility.station && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.station}
                            </td>
                          )}
                          {columnVisibility.category && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.category?.categoryName}
                            </td>
                          )}
                          {columnVisibility.openingBalance && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {formatOpeningBalance(p)}
                            </td>
                          )}
                          {columnVisibility.openingTaxBalance && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.openingTaxBalance}
                            </td>
                          )}
                          {columnVisibility.date && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.date}
                            </td>
                          )}
                          {columnVisibility.agent && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.agent?.agentName}
                            </td>
                          )}
                          {columnVisibility.transport && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.transport?.transportName}
                            </td>
                          )}
                          {columnVisibility.creditDays && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.creditDays}
                            </td>
                          )}
                          {columnVisibility.creditAmount && (
                            <td
                              style={{
                                border: "1px solid #eee",
                                padding: 8,
                              }}
                            >
                              {p.creditAmount}
                            </td>
                          )}

                          <td
                            style={{
                              border: "1px solid #eee",
                              padding: 12,
                            }}
                          >
                            <button
                              style={{
                                ...buttonStyle,
                                backgroundColor: "green",
                                padding: "5px 8px",
                                marginRight: 4,
                                marginBottom: "5px",
                              }}
                              onClick={() => {
                                setFormData({
                                  ...p,
                                  openingBalanceType:
                                    p.openingBalanceType || "CR",
                                });
                                setShowListModal(false);
                                setIsFullScreen(false);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                ...buttonStyle,
                                backgroundColor: "red",
                                padding: "4px 8px",
                              }}
                              onClick={() => handleDelete(p.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredParties.length === 0 && (
                        <tr>
                          <td
                            colSpan={16}
                            style={{ textAlign: "center", padding: 10 }}
                          >
                            No matching parties found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Hidden FULL table (all columns) for PDF export - THIS IS NO LONGER USED, replaced by tempDiv creation */}
                {/* <div
                  ref={pdfTableRef}
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    top: 0,
                    background: "#fff",
                    padding: 10,
                  }}
                >
                  <table
                    style={{
                      width: "1500px",
                      borderCollapse: "collapse",
                      fontSize: 10,
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Sr No
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Serial No
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Party Name
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          GST No
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Mobile No
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          State Name
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Station
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Category
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Opening Balance
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Opening Tax Balance
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Date
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Agent
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Transporter
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Credit Days
                        </th>
                        <th style={{ border: "1px solid #ddd", padding: 4 }}>
                          Credit Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                       {filteredParties.map((p, idx) => ( // This will now render sorted if filteredParties itself is sorted.
                        <tr key={p.id}>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {idx + 1}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.serialNumber}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.partyName}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.gstNo}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.mobileNo}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.stateName}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.station}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.category?.categoryName}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {formatOpeningBalance(p)}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.openingTaxBalance}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.date}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.agent?.agentName}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.transport?.transportName}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.creditDays}
                          </td>
                          <td style={{ border: "1px solid #eee", padding: 4 }}>
                            {p.creditAmount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div> */}
              </div>

              {/* Footer */}
              <div style={modalFooterStyle}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={handlePrint}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 4,
                      border: "none",
                      background: "#000",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Print
                  </button>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 4,
                      border: "none",
                      background: "#28a745",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Export PDF
                  </button>
                </div>

                <span style={smallTextStyle}>
                  Filtered Parties: {filteredParties.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default PartyCreation;