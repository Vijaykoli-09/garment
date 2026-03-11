import React, { useEffect, useState } from "react";
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

// adjust to your Receipt DTO from backend
interface ReceiptRecord {
  id: number;
  entryType: string;
  receiptTo: ReceiptToType;
  receiptDate: string; // From Date
  processName: string;
  partyName?: string;
  employeeName?: string;
  paymentThrough: string;
  amount: string;
  balance: string;
  remarks: string;
  agentName?: string;
  date?: string; // To Date
}

const routesReceipt = {
  create: "/payment/receipt/create",
  list: "/payment/receipt",
  get: (id: number) => `/payment/receipt/${id}`,
  update: (id: number) => `/payment/receipt/${id}`,
  delete: (id: number) => `/payment/receipt/${id}`,
  names: (type: ReceiptToType) => `/payment/names/${type}`,
  employees: "/employees",
  processes: "/process/list",
  paymentModes: "/payment/payment-mode",
  agents: "/agent/list",
  productionReceiptList: "/production-receipt",
  partyPaymentList: "/payment/list",
};

const PaymentReceiptForm: React.FC = () => {
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    entryType: "",
    receiptTo: "" as ReceiptToType,
    receiptDate: today, // From Date
    processName: "",
    name: "", // party/employee name
    paymentThrough: "Cash",
    amount: "",
    balance: "",
    remarks: "",
    agentName: "",
    date: today, // To Date
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  // Lists for modals
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  const [partyList, setPartyList] = useState<string[]>([]);
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

  useEffect(() => {
    loadProcesses();
    loadEmployees();
    loadAgents();
    loadSavedRecords();
    loadPaymentModes();
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

  const loadPartyNames = async () => {
    try {
      const res = await api.get(routesReceipt.names("Party"));
      setPartyList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPartyList([]);
      console.error("Error fetching party names:", err);
      Swal.fire("Error", "Failed to load party names", "error");
    }
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "receiptTo") {
      setFormData((prev) => ({
        ...prev,
        receiptTo: value as ReceiptToType,
        name: "",
      }));
      setShowData([]);
      return;
    }

    // From Date (receiptDate) – keep To Date (date) >= From Date
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

    // To Date (date) – prevent selecting a date before From Date
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

    if (name === "name") setShowData([]);

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openProcessModal = () => {
    setShowProcessModal(true);
    setProcessSearchText("");
  };

  const openNameModal = async () => {
    if (formData.receiptTo === "Employee") {
      setEmployeeSearchText("");
      setShowEmployeeModal(true);
    } else if (formData.receiptTo === "Party") {
      await loadPartyNames();
      setPartySearchText("");
      setShowPartyModal(true);
    }
  };

  const openAgentModal = () => {
    setAgentSearchText("");
    setShowAgentModal(true);
  };

  const selectProcess = (p: any) => {
    setFormData((prev) => ({ ...prev, processName: p.processName || "" }));
    setShowProcessModal(false);
  };

  const selectEmployee = (e: any) => {
    const name = e.name || e.employeeName || "";
    setFormData((prev) => ({ ...prev, name }));
    setShowEmployeeModal(false);
  };

  const selectParty = (name: string) => {
    setFormData((prev) => ({ ...prev, name: name || "" }));
    setShowPartyModal(false);
  };

  const selectAgent = (a: any) => {
    const name = a.name || a.agentName || "";
    setFormData((prev) => ({ ...prev, agentName: name }));
    setShowAgentModal(false);
  };

  const filteredEmployees = employeeList.filter((e) =>
    (e.name || e.employeeName || "")
      .toLowerCase()
      .includes(employeeSearchText.toLowerCase()),
  );

  const filteredProcesses = processList.filter((p) =>
    (p.processName || "")
      .toLowerCase()
      .includes(processSearchText.toLowerCase()),
  );

  const filteredParties = partyList.filter((p) =>
    (p || "").toLowerCase().includes(partySearchText.toLowerCase()),
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

  // ✅ Removed "all fields compulsory" validations
  const handleSave = async () => {
    const payload: any = {
      entryType: formData.entryType,
      receiptTo: formData.receiptTo,
      receiptDate: formData.receiptDate, // From Date
      processName: formData.processName,
      paymentThrough: formData.paymentThrough,
      amount: formData.amount,
      balance: formData.balance,
      remarks: formData.remarks,
      date: formData.date, // To Date
      partyName: formData.receiptTo === "Party" ? formData.name : "",
      employeeName: formData.receiptTo === "Employee" ? formData.name : "",
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
        amount: rec.amount || "",
        balance: rec.balance || "",
        remarks: rec.remarks || "",
        agentName: rec.agentName || "",
        date: toDate,
      });
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
    setShowData([]);
    if (showToast) Swal.fire("Cleared", "Ready for new entry", "success");
  };

  // ✅ Removed "compulsory" checks here too (kept only minimal routing sanity)
  const handleShow = async () => {
    if (formData.receiptTo !== "Party" && formData.receiptTo !== "Employee") {
      Swal.fire("Info", "Please select Receipt To (Party/Employee) to Show", "info");
      return;
    }

    // ===== EMPLOYEE CASE -> PRODUCTION RECEIPT POPUP =====
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
            ? (pr.employeeName || "").toLowerCase() === formData.name.toLowerCase()
            : true;

          const dStr = pr.dated || pr.receiptDate;
          if (!dStr) return false;

          const d = new Date(dStr);
          const dateOk =
            from && to ? d >= from && d <= to : true;

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

    // ===== PARTY CASE -> payment list =====
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

            {/* keep grid alignment */}
            <div />

            {/* ✅ From Date & To Date in ONE LINE */}
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

            {/* Process */}
            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Process Name</label>
              <input
                type="text"
                name="processName"
                value={formData.processName}
                onClick={openProcessModal}
                readOnly
                placeholder="Click to select process"
                className="border p-2 w-full rounded cursor-pointer bg-gray-50 hover:bg-gray-100"
              />
            </div>

            {/* Party / Employee */}
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

            {/* Agent */}
            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Agent Name</label>
              <input
                type="text"
                name="agentName"
                value={formData.agentName}
                onClick={openAgentModal}
                readOnly
                placeholder="Click to select agent"
                className="border p-2 w-full rounded cursor-pointer bg-gray-50 hover:bg-gray-100"
              />
            </div>

            {/* Payment Through */}
            <div className="col-span-2">
              <label className="block mb-1 font-semibold">Payment Through</label>
              <select
                name="paymentThrough"
                value={formData.paymentThrough}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="Cash">Cash</option>
                {paymentModes.map((pm) => {
                  const label = `${pm.bankNameOrUpiId}-${pm.accountNo}`;
                  return (
                    <option key={pm.id} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Amount & Balance */}
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

            <div>
              <label className="block mb-1 font-semibold">Balance</label>
              <input
                type="number"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>

            {/* Remarks */}
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

        {/* Recently Saved Records */}
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
                  </tr>
                </thead>
                <tbody>
                  {savedRecords.slice(-5).map((record, idx) => {
                    const name =
                      record.receiptTo === "Employee"
                        ? record.employeeName
                        : record.partyName;
                    return (
                      <tr key={record.id}>
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
                        <td className="border p-2 text-right">{record.amount}</td>
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
              Select Employee
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
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((e) => (
                    <tr key={e.id}>
                      <td className="border p-2">{e.name || e.employeeName}</td>
                      <td className="border p-2">{e.code || e.employeeCode}</td>
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
                    <th className="border p-2">Party Name</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((name, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{name}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectParty(name)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredParties.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center" colSpan={2}>
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
            <h3 className="text-xl font-bold text-center mb-4">
              Select Process
            </h3>
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

      {/* Agent Modal */}
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
                  {filteredAgents.map((a: any) => (
                    <tr key={a.id}>
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
              {formData.processName || "All Processes"} (From {formData.receiptDate} To{" "}
              {formData.date})
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
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="border p-4 text-center text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d: any, i: number) => {
                      const name =
                        d.receiptTo === "Employee" ? d.employeeName : d.partyName;
                      return (
                        <tr key={d.id}>
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
                          <td className="border p-2 text-right">{d.amount}</td>
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