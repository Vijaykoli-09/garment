// src/components/payment/Recipt.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

type ReceiptToType = "Party" | "Employee" | "Other" | "";

// from backend
interface PaymentMode {
  id: number;
  bankNameOrUpiId: string;
  accountNo: string;
}

// Employee shape (from /employees)
interface Employee {
  id: number;
  code: string;
  employeeName: string;
  process?: {
    serialNo: string | number;
    processName: string;
  };
  [key: string]: any;
}

// Party shape (from /party/all)
interface Party {
  id: number;
  serialNumber: string;
  partyName: string;
  agent?: {
    serialNo: string | number;
    agentName: string;
  };
  [key: string]: any;
}

interface ReceiptRecord {
  id: number;
  entryType: string;
  receiptTo: ReceiptToType;
  receiptDate: string; // From Date
  processName: string;
  partyName?: string;
  employeeName?: string;
  paymentThrough: string;
  amount: number | null;
  balance: number | null; // (+) Dr, (-) Cr (UI will show)
  remarks: string;
  agentName?: string;
  date?: string; // To Date
}

const routesReceipt = {
  create: "/recipt/create",
  list: "/recipt",
  get: (id: number) => `/recipt/${id}`,
  update: (id: number) => `/recipt/${id}`,
  delete: (id: number) => `/recipt/${id}`,
  employees: "/employees",
  processes: "/process/list",
  paymentModes: "/payment/payment-mode",
  agents: "/agent/list",
  productionReceiptList: "/production-receipt",
  partyPaymentList: "/payment/list",
  parties: "/party/all",
  dispatchChallans: "/dispatch-challan",
};

type FormData = {
  entryType: string;
  receiptTo: ReceiptToType;
  receiptDate: string;
  processName: string;
  name: string; // party/employee name
  paymentThrough: string;
  amount: number | "";
  balance: number | ""; // (+) Dr, (-) Cr
  remarks: string;
  agentName: string;
  date: string;
};

const PaymentReceiptForm: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<FormData>({
    entryType: "",
    receiptTo: "" as ReceiptToType,
    receiptDate: today,
    processName: "",
    name: "",
    paymentThrough: "Cash",
    amount: "",
    balance: "",
    remarks: "",
    agentName: "",
    date: today,
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  // Lists for modals
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  const [partyList, setPartyList] = useState<Party[]>([]);
  const [partySearchText, setPartySearchText] = useState("");
  const [showPartyModal, setShowPartyModal] = useState(false);

  const [processList, setProcessList] = useState<any[]>([]);
  const [processSearchText, setProcessSearchText] = useState("");
  const [showProcessModal, setShowProcessModal] = useState(false);

  const [agentList, setAgentList] = useState<any[]>([]);
  const [agentSearchText, setAgentSearchText] = useState("");
  const [showAgentModal, setShowAgentModal] = useState(false);

  const [showList, setShowList] = useState(false);
  const [receiptList, setReceiptList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

  const [savedRecords, setSavedRecords] = useState<ReceiptRecord[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);

  // data for Show table (for PARTY)
  const [showData, setShowData] = useState<any[]>([]);
  const [showLoading, setShowLoading] = useState(false);

  // Production Receipt popup (for EMPLOYEE)
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [, setProductionReceipts] = useState<any[]>([]);
  const [productionRows, setProductionRows] = useState<any[]>([]);

  // Cache of dispatch challans
  const [dispatchChallans, setDispatchChallans] = useState<any[]>([]);
  // Base balance for Party (before receipt amount is applied)
  const [partyBaseBalance, setPartyBaseBalance] = useState<number | null>(null);

  useEffect(() => {
    loadProcesses();
    loadEmployees();
    loadAgents();
    loadSavedRecords();
    loadPaymentModes();
    loadParties();
    loadDispatchChallans();
  }, []);

  const loadProcesses = () => {
    api
      .get(routesReceipt.processes)
      .then((r) => setProcessList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load processes", "error"));
  };

  const loadEmployees = () => {
    api
      .get(routesReceipt.employees)
      .then((r) => setEmployeeList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load employees", "error"));
  };

  const loadParties = () => {
    api
      .get(routesReceipt.parties)
      .then((r) => setPartyList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load parties", "error"));
  };

  const loadAgents = () => {
    api
      .get(routesReceipt.agents)
      .then((r) => setAgentList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load agents", "error"));
  };

  const loadSavedRecords = async () => {
    try {
      const res = await api.get(routesReceipt.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setSavedRecords(data);
    } catch (err) {
      console.error("Error loading saved records:", err);
    }
  };

  const loadPaymentModes = async () => {
    try {
      const res = await api.get(routesReceipt.paymentModes);
      setPaymentModes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading payment modes:", err);
      Swal.fire("Error", "Failed to load payment modes", "error");
    }
  };

  const loadDispatchChallans = async () => {
    try {
      const res = await api.get(routesReceipt.dispatchChallans);
      const list = Array.isArray(res.data) ? res.data : [];
      setDispatchChallans(list);
      console.log("Dispatch challans loaded:", list.length);
    } catch (err) {
      console.error("Error loading dispatch challans:", err);
      // do not block the screen; balance will just stay empty
    }
  };

  const norm = (s: any) => (s ?? "").toString().trim().toLowerCase();

  // -------- Dr/Cr helpers (NEW) ----------
  const getDrCr = (val: number | "" | null | undefined) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = Number(val);
    if (!Number.isFinite(n) || n === 0) return "";
    return n > 0 ? "Dr" : "Cr";
  };

  const absVal = (val: number | "" | null | undefined) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = Number(val);
    if (!Number.isFinite(n)) return "";
    return Math.abs(n);
  };

  const balanceDrCr = useMemo(() => getDrCr(formData.balance), [formData.balance]);
  const baseBalDrCr = useMemo(() => getDrCr(partyBaseBalance ?? null), [partyBaseBalance]);
  // --------------------------------------

  // Compute base balance for party from cached dispatchChallans
  const computePartyBaseBalance = (partyName: string) => {
    if (!partyName || dispatchChallans.length === 0) {
      setPartyBaseBalance(null);
      setFormData((prev) => ({ ...prev, balance: "" }));
      return;
    }

    const matches = dispatchChallans.filter(
      (ch: any) => norm(ch.partyName) === norm(partyName),
    );

    const totalNet = matches.reduce(
      (sum: number, ch: any) => sum + Number(ch.netAmt ?? 0),
      0,
    );

    // NOTE:
    // We are treating +ve as Dr and -ve as Cr.
    setPartyBaseBalance(totalNet);
    setFormData((prev) => ({
      ...prev,
      balance: totalNet,
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "receiptTo") {
      setFormData((prev) => ({
        ...prev,
        receiptTo: value as ReceiptToType,
        name: "",
        balance: "",
        amount: "",
        agentName: "",
      }));
      setPartyBaseBalance(null);
      setShowData([]);
      return;
    }

    if (name === "receiptDate") {
      setFormData((prev) => {
        const fromDate = value;
        let toDate = prev.date;
        if (!toDate || toDate < fromDate) {
          toDate = fromDate;
        }
        return {
          ...prev,
          receiptDate: fromDate,
          date: toDate,
        };
      });
      setShowData([]);
      return;
    }

    if (name === "date") {
      setFormData((prev) => {
        const fromDate = prev.receiptDate;
        let toDate = value;
        if (fromDate && toDate < fromDate) {
          toDate = fromDate;
        }
        return {
          ...prev,
          date: toDate,
        };
      });
      setShowData([]);
      return;
    }

    if (name === "amount") {
      const num = value === "" ? "" : Number(value);
      setFormData((prev) => ({
        ...prev,
        amount: num,
        balance:
          prev.receiptTo === "Party" && partyBaseBalance !== null
            ? partyBaseBalance - (num === "" ? 0 : Number(num))
            : prev.balance,
      }));
      return;
    }

    if (name === "balance") {
      // Allow manual editing for non-Party
      if (formData.receiptTo !== "Party") {
        setFormData((prev) => ({
          ...prev,
          balance: value === "" ? "" : Number(value),
        }));
      }
      return;
    }

    if (name === "name") setShowData([]);

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openProcessModal = () => {
    setShowProcessModal(true);
    setProcessSearchText("");
  };

  // NAME MODAL: allow opening even if process is empty
  const openNameModal = async () => {
    if (!formData.receiptTo) {
      Swal.fire("Info", "Please select Receipt To (Party/Employee)", "info");
      return;
    }

    if (formData.receiptTo === "Employee") {
      setEmployeeSearchText("");
      setShowEmployeeModal(true);
    } else if (formData.receiptTo === "Party") {
      setPartySearchText("");
      setShowPartyModal(true);
    }
  };

  const openAgentModal = () => {
    if (formData.receiptTo === "Party") return; // auto-filled for Party
    setAgentSearchText("");
    setShowAgentModal(true);
  };

  const selectProcess = (p: any) => {
    setFormData((prev) => ({
      ...prev,
      processName: p.processName || "",
      name: "",
      agentName: "",
      amount: "",
      balance: "",
    }));
    setPartyBaseBalance(null);
    setShowProcessModal(false);
    setShowData([]);
  };

  const selectEmployee = (e: Employee) => {
    const name = e.employeeName || "";
    setFormData((prev) => ({ ...prev, name, amount: "", balance: "" }));
    setPartyBaseBalance(null);
    setShowEmployeeModal(false);
  };

  // When selecting party, auto-fill agentName and compute base balance
  const selectParty = (p: Party) => {
    const partyName = p.partyName || "";
    setFormData((prev) => ({
      ...prev,
      name: partyName,
      agentName: p.agent?.agentName || prev.agentName,
      amount: "",
      balance: "",
    }));
    setShowPartyModal(false);
    computePartyBaseBalance(partyName);
  };

  const selectAgent = (a: any) => {
    const name = a.name || a.agentName || "";
    setFormData((prev) => ({ ...prev, agentName: name }));
    setShowAgentModal(false);
  };

  // Filter employees: by search + selected process (process is optional)
  const filteredEmployees = useMemo(() => {
    const search = employeeSearchText.toLowerCase();
    const processFilter = formData.processName.toLowerCase();

    return employeeList.filter((e) => {
      const name = (e.employeeName || "").toLowerCase();
      const code = (e.code || "").toLowerCase();
      const empProcess = (e.process?.processName || "").toLowerCase();

      const matchesSearch =
        !search || name.includes(search) || code.includes(search);

      const matchesProcess =
        !processFilter || !empProcess || empProcess === processFilter;

      return matchesSearch && matchesProcess;
    });
  }, [employeeList, employeeSearchText, formData.processName]);

  // Filter parties: by search (and process if present)
  const filteredParties = useMemo(() => {
    const search = partySearchText.toLowerCase();
    const processFilter = formData.processName.toLowerCase();

    return partyList.filter((p) => {
      const name = (p.partyName || "").toLowerCase();
      const partyProcess = (p as any).process?.processName
        ? (p as any).process.processName.toLowerCase()
        : "";

      const matchesSearch = !search || name.includes(search);

      const matchesProcess =
        !processFilter || !partyProcess || partyProcess === processFilter;

      return matchesSearch && matchesProcess;
    });
  }, [partyList, partySearchText, formData.processName]);

  const filteredProcesses = processList.filter((p) =>
    (p.processName || "")
      .toLowerCase()
      .includes(processSearchText.toLowerCase()),
  );

  const filteredAgents = agentList.filter((a) =>
    (a.name || a.agentName || "")
      .toLowerCase()
      .includes(agentSearchText.toLowerCase()),
  );

  const filteredList = Array.isArray(receiptList)
    ? receiptList.filter((x) => {
        const s = searchText.toLowerCase();
        const displayName =
          (x.receiptTo === "Employee" ? x.employeeName : x.partyName) || "";
        return (
          !searchText ||
          (x.entryType || "").toLowerCase().includes(s) ||
          (x.receiptTo || "").toLowerCase().includes(s) ||
          (x.processName || "").toLowerCase().includes(s) ||
          displayName.toLowerCase().includes(s)
        );
      })
    : [];

  const handleSave = async () => {
    // All fields optional
    const payload: any = {
      entryType: formData.entryType,
      receiptTo: formData.receiptTo,
      receiptDate: formData.receiptDate || null,
      processName: formData.processName || "",
      paymentThrough: formData.paymentThrough || "",
      amount: formData.amount === "" ? null : formData.amount,
      balance: formData.balance === "" ? null : formData.balance, // sign kept (+ Dr, - Cr)
      remarks: formData.remarks || "",
      date: formData.date || null,
      partyName: formData.receiptTo === "Party" ? formData.name || "" : "",
      employeeName:
        formData.receiptTo === "Employee" ? formData.name || "" : "",
      agentName: formData.agentName || "",
    };

    try {
      if (editingId) {
        await api.put(routesReceipt.update(editingId), payload);
        Swal.fire("Success", "Receipt updated!", "success");
      } else {
        await api.post(routesReceipt.create, payload);
        Swal.fire("Success", "Receipt saved successfully!", "success");
      }
      setEditingId(null);
      handleAddNew(false);
      loadSavedRecords();
    } catch (error: any) {
      console.error("Error saving receipt:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to save",
        "error",
      );
    }
  };

  const openList = async () => {
    try {
      const res = await api.get(routesReceipt.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setReceiptList(data);
      setShowList(true);
    } catch (err) {
      console.error("Load list error:", err);
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const res = await api.get(routesReceipt.get(id));
      const rec: ReceiptRecord = res.data;

      const fromDate = rec.receiptDate || today;
      const toDate = rec.date && rec.date >= fromDate ? rec.date : fromDate;

      setFormData({
        entryType: rec.entryType || "",
        receiptTo: (rec.receiptTo as ReceiptToType) || "",
        receiptDate: fromDate,
        processName: rec.processName || "",
        name:
          rec.receiptTo === "Employee"
            ? rec.employeeName || ""
            : rec.partyName || "",
        paymentThrough: rec.paymentThrough || "Cash",
        amount:
          rec.amount === null || rec.amount === undefined
            ? ""
            : Number(rec.amount),
        balance:
          rec.balance === null || rec.balance === undefined
            ? ""
            : Number(rec.balance),
        remarks: rec.remarks || "",
        agentName: rec.agentName || "",
        date: toDate,
      });

      // For Party, approximate baseBalance = amount + balance
      if (rec.receiptTo === "Party") {
        const amt = Number(rec.amount ?? 0);
        const bal = Number(rec.balance ?? 0);
        const base = !isNaN(amt) && !isNaN(bal) ? amt + bal : null;
        setPartyBaseBalance(base);
      } else {
        setPartyBaseBalance(null);
      }

      setEditingId(id);
      setShowList(false);
      setShowData([]);
    } catch (err) {
      console.error("Edit Error:", err);
      Swal.fire("Error", "Failed to load record", "error");
    }
  };

  const handleDelete = async (id?: number) => {
    const targetId = id ?? editingId;
    if (!targetId) {
      Swal.fire("Info", "No record selected to delete", "info");
      return;
    }

    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(routesReceipt.delete(targetId));
        setReceiptList((prev) => prev.filter((x) => x.id !== targetId));
        if (editingId === targetId) {
          setEditingId(null);
          handleAddNew(false);
        }
        Swal.fire("Deleted!", "Record deleted successfully", "success");
        loadSavedRecords();
      } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  const handleAddNew = (showToast = true) => {
    setFormData({
      entryType: "",
      receiptTo: "" as ReceiptToType,
      receiptDate: today,
      processName: "",
      name: "",
      paymentThrough: "Cash",
      amount: "",
      balance: "",
      remarks: "",
      agentName: "",
      date: today,
    });
    setEditingId(null);
    setPartyBaseBalance(null);
    setShowData([]);
    if (showToast) Swal.fire("Cleared", "Ready for new entry", "success");
  };

  const handleShow = async () => {
    if (formData.receiptTo !== "Party" && formData.receiptTo !== "Employee") {
      Swal.fire(
        "Info",
        "Please select Receipt To (Party/Employee) to Show",
        "info",
      );
      return;
    }

    // EMPLOYEE -> production receipts
    if (formData.receiptTo === "Employee") {
      setShowLoading(true);
      setProductionReceipts([]);
      setProductionRows([]);

      try {
        const res = await api.get(routesReceipt.productionReceiptList);
        const all = Array.isArray(res.data) ? res.data : [];

        const from = formData.receiptDate ? new Date(formData.receiptDate) : null;
        const to = formData.date ? new Date(formData.date) : null;

        const filtered = all.filter((pr: any) => {
          const processOk = formData.processName
            ? (pr.processName || "").toLowerCase() ===
              formData.processName.toLowerCase()
            : true;

          const empOk = formData.name
            ? (pr.employeeName || "").toLowerCase() ===
              formData.name.toLowerCase()
            : true;

          const dStr = pr.dated || pr.receiptDate;
          if (!dStr) return false;

          const d = new Date(dStr);
          const dateOk = from && to ? d >= from && d <= to : true;

          return processOk && empOk && dateOk;
        });

        setProductionReceipts(filtered);

        const flat: any[] = [];
        filtered.forEach((pr: any) => {
          (pr.rows || []).forEach((r: any, idx: number) => {
            flat.push({
              key: `${pr.id}-${idx}`,
              dated: pr.dated || pr.receiptDate || "",
              voucherNo: pr.voucherNo || "",
              employeeName: pr.employeeName || "",
              processName: pr.processName || "",
              cardNo: r.cardNo || "",
              artNo: r.artNo || "",
              shade: r.shade || r.Size || "",
              pcs: r.pcs || "",
              rate: r.rate || "",
              amount: r.amount || "",
              remarks: r.remarks || "",
            });
          });
        });

        setProductionRows(flat);
        setShowProductionModal(true);
      } catch (err) {
        console.error("Show (production receipts) Error:", err);
        Swal.fire("Error", "Failed to load production receipts", "error");
      } finally {
        setShowLoading(false);
      }

      return;
    }

    // PARTY -> payment list
    setShowLoading(true);
    setShowData([]);

    try {
      const params: any = {};
      if (formData.receiptDate) params.fromDate = formData.receiptDate;
      if (formData.date) params.toDate = formData.date;
      if (formData.name) params.partyName = formData.name;

      const res = await api.get(routesReceipt.partyPaymentList, { params });

      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length === 0) {
        Swal.fire("Info", "No payment record found for given filters", "info");
        setShowData([]);
      } else {
        setShowData(data);
        setTimeout(() => {
          const el = document.getElementById("show-table-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 0);
      }
    } catch (err) {
      console.error("Show Error:", err);
      Swal.fire("Error", "Failed to load data for Show", "error");
    } finally {
      setShowLoading(false);
    }
  };

  const isAgentSelectable = formData.receiptTo !== "Party";

  return (
    <Dashboard>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-white shadow-md rounded-lg w-full max-w-4xl mx-auto p-6 border">
          <h2 className="text-2xl font-bold text-center mb-6">
            Payment Receipt
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold">Receipt To</label>
              <select
                name="receiptTo"
                value={formData.receiptTo}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="">Select</option>
                <option value="Party">Party</option>
                <option value="Employee">Employee</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div />

            <div className="col-span-2">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 font-semibold">From Date</label>
                  <input
                    type="date"
                    name="receiptDate"
                    value={formData.receiptDate}
                    onChange={handleChange}
                    className="border p-2 w-full rounded"
                  />
                </div>

                <div className="flex-1">
                  <label className="block mb-1 font-semibold">To Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={formData.receiptDate}
                    className="border p-2 w-full rounded"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Process Name</label>
              <input
                type="text"
                name="processName"
                value={formData.processName}
                onClick={openProcessModal}
                readOnly
                placeholder="Click to select process (optional)"
                className="border p-2 w-full rounded cursor-pointer bg-gray-50 hover:bg-gray-100"
              />
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">
                Party / Employee Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onClick={openNameModal}
                readOnly
                placeholder="Click to select"
                className="border p-2 w-full rounded cursor-pointer bg-gray-50 hover:bg-gray-100"
              />
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Agent Name</label>
              <input
                type="text"
                name="agentName"
                value={formData.agentName}
                onClick={isAgentSelectable ? openAgentModal : undefined}
                readOnly
                placeholder={
                  formData.receiptTo === "Party"
                    ? "Auto-filled from party broker"
                    : "Click to select agent"
                }
                className="border p-2 w-full rounded cursor-pointer bg-gray-50 hover:bg-gray-100"
              />
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Payment Through</label>
              <select
                name="paymentThrough"
                value={formData.paymentThrough}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="">Select</option>
                <option value="Cash">Cash</option>
                {paymentModes.map((pm, index) => {
                  const label = `${pm.bankNameOrUpiId}-${pm.accountNo}`;
                  const key = pm.id ?? label ?? index;
                  return (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>

            {/* Balance + Dr/Cr (UPDATED UI) */}
            <div>
              <label className="block mb-1 font-semibold">Balance</label>

              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  name="balance"
                  value={formData.balance}
                  onChange={handleChange}
                  readOnly={formData.receiptTo === "Party"}
                  placeholder={
                    formData.receiptTo === "Party"
                      ? "Base from Dispatch - Amount"
                      : ""
                  }
                  className={`border p-2 w-full rounded ${
                    formData.receiptTo === "Party"
                      ? "bg-gray-50 cursor-not-allowed"
                      : ""
                  }`}
                />

                <input
                  type="text"
                  value={balanceDrCr}
                  readOnly
                  placeholder="Dr/Cr"
                  className="border p-2 w-20 rounded bg-gray-50 text-center"
                  title="Balance Type"
                />
              </div>

              {/* Optional hint (base balance from dispatch) */}
              {formData.receiptTo === "Party" && partyBaseBalance !== null && (
                <div className="text-xs text-gray-600 mt-1">
                  Base (Dispatch): {absVal(partyBaseBalance)} {baseBalDrCr}
                  {formData.amount !== "" && (
                    <>
                      {" "}
                      | Current: {absVal(formData.balance)} {balanceDrCr}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Remarks</label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-between mt-6">
            <div className="space-x-2">
              <button
                onClick={() => handleAddNew()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Add New
              </button>

              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {editingId ? "Update" : "Save"}
              </button>

              <button
                onClick={handleShow}
                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
                disabled={showLoading}
              >
                {showLoading ? "Loading..." : "Show"}
              </button>

              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                List
              </button>

              <button
                onClick={() => handleDelete()}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>

              <button
                onClick={() => navigate(-1)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Exit
              </button>
            </div>
          </div>
        </div>

        {savedRecords.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-4xl mx-auto">
            <h3 className="font-bold text-lg mb-3">Recently Saved Receipts</h3>
            <div className="overflow-auto max-h-[200px]">
              <table className="w-full text-sm border">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">From Date</th>
                    <th className="border p-2">To Date</th>
                    <th className="border p-2">Receipt To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Agent</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Balance</th>
                    <th className="border p-2">Dr/Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {savedRecords.slice(-5).map((record, idx) => {
                    const name =
                      record.receiptTo === "Employee"
                        ? record.employeeName
                        : record.partyName;

                    const rowKey =
                      record.id ??
                      (record as any).receiptId ??
                      `${record.receiptDate}-${record.processName}-${idx}`;

                    const drcr = getDrCr(record.balance);
                    const balAbs = absVal(record.balance);

                    return (
                      <tr key={rowKey}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">
                          {record.receiptDate
                            ? new Date(record.receiptDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="border p-2">
                          {record.date
                            ? new Date(record.date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="border p-2">{record.receiptTo}</td>
                        <td className="border p-2">{name}</td>
                        <td className="border p-2">{record.agentName || "-"}</td>
                        <td className="border p-2">
                          {record.processName || "-"}
                        </td>
                        <td className="border p-2 text-right">
                          {record.amount ?? "-"}
                        </td>
                        <td className="border p-2 text-right">
                          {record.balance === null || record.balance === undefined
                            ? "-"
                            : balAbs}
                        </td>
                        <td className="border p-2 text-center">{drcr || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Show Table (Party) */}
        {formData.receiptTo === "Party" && showData.length > 0 && (
          <div
            id="show-table-section"
            className="mt-6 p-4 bg-white rounded-lg border border-gray-200 max-w-5xl mx-auto"
          >
            <h3 className="font-bold text-lg mb-3">
              Party Payments (From {formData.receiptDate} To {formData.date})
            </h3>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">#</th>
                    {Object.keys(showData[0] || {}).map((key) => (
                      <th key={key} className="border p-2">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border p-2 text-center">{idx + 1}</td>
                      {Object.keys(showData[0] || {}).map((key) => (
                        <td key={key} className="border p-2">
                          {row[key] !== null && row[key] !== undefined
                            ? String(row[key])
                            : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">
              Select Employee (Process: {formData.processName || "All"})
            </h3>
            <input
              type="text"
              placeholder="Search employee name or code..."
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
                  {filteredEmployees.map((e, idx) => (
                    <tr key={e.id ?? e.code ?? idx}>
                      <td className="border p-2">{e.employeeName}</td>
                      <td className="border p-2">{e.code}</td>
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
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={4}>
                        No employees found
                      </td>
                    </tr>
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

      {/* Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">
              Select Party (Process: {formData.processName || "All"})
            </h3>
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
                    <th className="border p-2">Party Name</th>
                    <th className="border p-2">Broker</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((p, idx) => (
                    <tr key={p.id ?? p.serialNumber ?? idx}>
                      <td className="border p-2">{p.partyName}</td>
                      <td className="border p-2">{p.agent?.agentName || "-"}</td>
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
                      <td className="border p-2 text-center" colSpan={3}>
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

      {/* Process Modal */}
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
                  {filteredProcesses.map((p: any) => (
                    <tr key={p.serialNo || p.id || p.processName}>
                      <td className="border p-2">{p.processName}</td>
                      <td className="border p-2">{p.category}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectProcess(p)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProcesses.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={3}>
                        No processes found
                      </td>
                    </tr>
                  )}
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

      {/* Agent Modal (for Employee/Other only) */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Agent</h3>
            <input
              type="text"
              placeholder="Search agent name..."
              value={agentSearchText}
              onChange={(e) => setAgentSearchText(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Agent Name</th>
                    <th className="border p-2">Code</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((a: any, idx: number) => (
                    <tr key={a.id ?? a.agentCode ?? a.code ?? idx}>
                      <td className="border p-2">{a.name || a.agentName}</td>
                      <td className="border p-2">{a.code || a.agentCode}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectAgent(a)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAgents.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={3}>
                        No agents found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAgentModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Receipt detailed list modal (Employee Show) */}
      {showProductionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">
              Production Receipts –{" "}
              {formData.name ? `${formData.name} / ` : ""}
              {formData.processName || "All Processes"} (From{" "}
              {formData.receiptDate} To {formData.date})
            </h3>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Voucher No</th>
                    <th className="border p-2">Employee</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Cutting Lot No</th>
                    <th className="border p-2">Art No</th>
                    <th className="border p-2">Shade</th>
                    <th className="border p-2">Pcs</th>
                    <th className="border p-2">Rate</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {productionRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="border p-4 text-center text-gray-500"
                      >
                        No production receipts found
                      </td>
                    </tr>
                  ) : (
                    productionRows.map((row: any, idx: number) => (
                      <tr key={row.key || idx}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">
                          {row.dated
                            ? new Date(row.dated).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="border p-2">{row.voucherNo || "-"}</td>
                        <td className="border p-2">{row.employeeName || "-"}</td>
                        <td className="border p-2">{row.processName || "-"}</td>
                        <td className="border p-2">{row.cardNo || "-"}</td>
                        <td className="border p-2">{row.artNo || "-"}</td>
                        <td className="border p-2">{row.shade || "-"}</td>
                        <td className="border p-2 text-right">{row.pcs || ""}</td>
                        <td className="border p-2 text-right">{row.rate || ""}</td>
                        <td className="border p-2 text-right">{row.amount || ""}</td>
                        <td className="border p-2">{row.remarks || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowProductionModal(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">Receipt List</h3>

            <input
              placeholder="Search by Entry Type / Receipt To / Name / Process"
              className="border p-2 rounded w-full mb-3"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">From Date</th>
                    <th className="border p-2">To Date</th>
                    <th className="border p-2">Entry Type</th>
                    <th className="border p-2">Receipt To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Agent</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Balance</th>
                    <th className="border p-2">Dr/Cr</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="border p-4 text-center text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d: any, i: number) => {
                      const name =
                        d.receiptTo === "Employee" ? d.employeeName : d.partyName;

                      const rowKey = d.id ?? d.receiptId ?? i;

                      const drcr = getDrCr(d.balance);
                      const balAbs = absVal(d.balance);

                      return (
                        <tr key={rowKey}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">
                            {d.receiptDate
                              ? new Date(d.receiptDate).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="border p-2">
                            {d.date ? new Date(d.date).toLocaleDateString() : "-"}
                          </td>
                          <td className="border p-2">{d.entryType}</td>
                          <td className="border p-2">{d.receiptTo}</td>
                          <td className="border p-2">{name}</td>
                          <td className="border p-2">{d.agentName || "-"}</td>
                          <td className="border p-2">{d.processName || "-"}</td>
                          <td className="border p-2 text-right">{d.amount ?? "-"}</td>
                          <td className="border p-2 text-right">
                            {d.balance === null || d.balance === undefined ? "-" : balAbs}
                          </td>
                          <td className="border p-2 text-center">{drcr || "-"}</td>
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-5">
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
  );
};

export default PaymentReceiptForm;