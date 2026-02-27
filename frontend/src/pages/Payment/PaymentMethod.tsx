import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

type PaymentToType = "Party" | "Employee" | "";

// matches your PaymentMode DTO from backend
interface PaymentMode {
  id: number;
  bankNameOrUpiId: string;
  accountNo: string;
}

interface PaymentRecord {
  id: number;
  entryType: string;
  paymentTo: PaymentToType;
  paymentDate: string;
  date: string;
  processName: string;
  partyName?: string;
  employeeName?: string;
  paymentThrough: string;
  amount: string;
  balance: string;
  remarks: string;
}

const routes = {
  // KEEP create to match your existing backend
  create: "/payment/create",
  // list/get/update/delete for payments
  list: "/payment",
  get: (id: number) => `/payment/${id}`,
  update: (id: number) => `/payment/${id}`,
  delete: (id: number) => `/payment/${id}`,
  // Names for Party
  names: (type: PaymentToType) => `/payment/names/${type}`,
  // Employees and processes
  employees: "/employees",
  processes: "/process/list",
  // Payment modes
  paymentModes: "/payment/payment-mode",
};

const PaymentForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    entryType: "",
    paymentTo: "" as PaymentToType,
    paymentDate: new Date().toISOString().split("T")[0],
    processName: "",
    partyName: "",
    paymentThrough: "Cash", // default Cash
    amount: "",
    balance: "",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  // Lists and modals
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  const [partyList, setPartyList] = useState<string[]>([]);
  const [partySearchText, setPartySearchText] = useState("");
  const [showPartyModal, setShowPartyModal] = useState(false);

  const [processList, setProcessList] = useState<any[]>([]);
  const [processSearchText, setProcessSearchText] = useState("");
  const [showProcessModal, setShowProcessModal] = useState(false);

  const [showList, setShowList] = useState(false);
  const [paymentList, setPaymentList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

  const [savedRecords, setSavedRecords] = useState<PaymentRecord[]>([]);

  // payment modes from backend
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);

  // Load processes, employees, saved payment records, payment modes
  useEffect(() => {
    loadProcesses();
    loadEmployees();
    loadSavedRecords();
    loadPaymentModes();
  }, []);

  const loadProcesses = () => {
    api
      .get(routes.processes)
      .then((r) => setProcessList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load processes", "error"));
  };

  const loadEmployees = () => {
    api
      .get(routes.employees)
      .then((r) => setEmployeeList(Array.isArray(r.data) ? r.data : []))
      .catch(() => Swal.fire("Error", "Failed to load employees", "error"));
  };

  const loadPartyNames = async () => {
    try {
      const res = await api.get(routes.names("Party"));
      setPartyList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPartyList([]);
      console.error("Error fetching party names:", err);
      Swal.fire("Error", "Failed to load party names", "error");
    }
  };

  const loadSavedRecords = async () => {
    try {
      const res = await api.get(routes.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setSavedRecords(data);
    } catch (err) {
      console.error("Error loading saved records:", err);
    }
  };

  const loadPaymentModes = async () => {
    try {
      const res = await api.get(routes.paymentModes);
      setPaymentModes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading payment modes:", err);
      Swal.fire("Error", "Failed to load payment modes", "error");
    }
  };

  // Input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Reset name when paymentTo changes
    if (name === "paymentTo") {
      setFormData((prev) => ({
        ...prev,
        paymentTo: value as PaymentToType,
        partyName: "",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Open modals
  const openProcessModal = () => {
    setShowProcessModal(true);
    setProcessSearchText("");
  };

  const openNameModal = async () => {
    if (!formData.paymentTo) {
      Swal.fire("Info", "Please select 'Payment To' first", "info");
      return;
    }
    if (formData.paymentTo === "Employee") {
      setEmployeeSearchText("");
      setShowEmployeeModal(true);
    } else if (formData.paymentTo === "Party") {
      await loadPartyNames();
      setPartySearchText("");
      setShowPartyModal(true);
    }
  };

  const selectProcess = (p: any) => {
    setFormData((prev) => ({ ...prev, processName: p.processName || "" }));
    setShowProcessModal(false);
  };

  const selectEmployee = (e: any) => {
    const name = e.name || e.employeeName || "";
    setFormData((prev) => ({ ...prev, partyName: name }));
    setShowEmployeeModal(false);
  };

  const selectParty = (name: string) => {
    setFormData((prev) => ({ ...prev, partyName: name || "" }));
    setShowPartyModal(false);
  };

  // Filters
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

  const filteredList = Array.isArray(paymentList)
    ? paymentList.filter((x) => {
        const s = searchText.toLowerCase();
        const displayName =
          (x.paymentTo === "Employee" ? x.employeeName : x.partyName) || "";
        return (
          !searchText ||
          (x.entryType || "").toLowerCase().includes(s) ||
          (x.paymentTo || "").toLowerCase().includes(s) ||
          (x.processName || "").toLowerCase().includes(s) ||
          displayName.toLowerCase().includes(s)
        );
      })
    : [];

  // Save / Update
  const handleSave = async () => {
    const required = [
      formData.entryType,
      formData.paymentTo,
      formData.paymentDate,
      formData.date,
      formData.paymentThrough,
      formData.amount,
    ];

    if (required.some((x) => !x)) {
      Swal.fire("Error", "Please fill all required fields!", "error");
      return;
    }
    if (!formData.partyName) {
      Swal.fire(
        "Error",
        `Please select a ${formData.paymentTo || "Party/Employee"} name`,
        "error",
      );
      return;
    }

    const payload: any = {
      entryType: formData.entryType,
      paymentTo: formData.paymentTo,
      paymentDate: formData.paymentDate,
      paymentThrough: formData.paymentThrough, // "Cash" or "SBI-123..."
      amount: formData.amount,
      remarks: formData.remarks,
      processName: formData.processName,
      balance: formData.balance,
      date: formData.date,
      partyName: formData.paymentTo === "Party" ? formData.partyName : "",
      employeeName:
        formData.paymentTo === "Employee" ? formData.partyName : "",
    };

    try {
      if (editingId) {
        await api.put(routes.update(editingId), payload);
        Swal.fire("Success", "Payment updated!", "success");
      } else {
        await api.post(routes.create, payload);
        Swal.fire("Success", "Payment saved successfully!", "success");
      }
      setEditingId(null);
      handleAddNew(false);
      loadSavedRecords();
    } catch (error: any) {
      console.error("Error saving payment:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to save",
        "error",
      );
    }
  };

  const openList = async () => {
    try {
      const res = await api.get(routes.list);
      const data = Array.isArray(res.data) ? res.data : [];
      setPaymentList(data);
      setShowList(true);
    } catch (err) {
      console.error("Load list error:", err);
      Swal.fire("Error", "Failed to load list", "error");
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const res = await api.get(routes.get(id));
      const rec: PaymentRecord = res.data;

      setFormData({
        entryType: rec.entryType || "",
        paymentTo: (rec.paymentTo as PaymentToType) || "",
        paymentDate: rec.paymentDate || new Date().toISOString().split("T")[0],
        processName: rec.processName || "",
        partyName:
          rec.paymentTo === "Employee"
            ? rec.employeeName || ""
            : rec.partyName || "",
        paymentThrough: rec.paymentThrough || "Cash",
        amount: rec.amount || "",
        balance: rec.balance || "",
        remarks: rec.remarks || "",
        date: rec.date || new Date().toISOString().split("T")[0],
      });
      setEditingId(id);
      setShowList(false);
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
        await api.delete(routes.delete(targetId));
        setPaymentList((prev) => prev.filter((x) => x.id !== targetId));
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
      paymentTo: "" as PaymentToType,
      paymentDate: new Date().toISOString().split("T")[0],
      processName: "",
      partyName: "",
      paymentThrough: "Cash", // reset to Cash
      amount: "",
      balance: "",
      remarks: "",
      date: new Date().toISOString().split("T")[0],
    });
    setEditingId(null);
    if (showToast) Swal.fire("Cleared", "Ready for new entry", "success");
  };

  // UI
  return (
    <Dashboard>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-white shadow-md rounded-lg w-full max-w-4xl mx-auto p-6 border">
          <h2 className="text-2xl font-bold text-center mb-6">Payment Form</h2>

          {/* Header */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold">Entry Type</label>
              <select
                name="entryType"
                value={formData.entryType}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="">Select</option>
                <option value="Other">Other</option>
                <option value="Purchase">Purchase</option>
                <option value="Salary">Salary</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold">Payment To</label>
              <select
                name="paymentTo"
                value={formData.paymentTo}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="">Select</option>
                <option value="Party">Party</option>
                <option value="Employee">Employee</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold">Payment Date</label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              />
            </div>

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

            <div className="col-span-2">
              <label className="block mb-1 font-semibold">
                Party / Employee Name
              </label>
              <input
                type="text"
                name="partyName"
                value={formData.partyName}
                onClick={openNameModal}
                readOnly
                placeholder="Click to select"
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
                {/* Always have Cash as default/simple option */}
                <option value="Cash">Cash</option>

                {/* Dynamic options from payment modes: BANKNAME-ACCOUNTNO */}
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

          {/* Footer Actions */}
          <div className="flex flex-wrap justify-between mt-6">
            <div>
              <button
                onClick={() => handleAddNew()}
                className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
              >
                Add New
              </button>

              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded mr-2 hover:bg-green-600"
              >
                {editingId ? "Update" : "Save"}
              </button>

              <button
                onClick={openList}
                className="px-4 py-2 bg-yellow-500 text-white rounded mr-2 hover:bg-yellow-600"
              >
                List
              </button>

              <button
                onClick={() => handleDelete()}
                className="bg-red-500 text-white px-4 py-2 rounded mr-2 hover:bg-red-600"
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
            <h3 className="font-bold text-lg mb-3">Recently Saved Records</h3>
            <div className="overflow-auto max-h-[200px]">
              <table className="w-full text-sm border">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Payment To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {savedRecords.slice(-5).map((record, idx) => {
                    const name =
                      record.paymentTo === "Employee"
                        ? record.employeeName
                        : record.partyName;
                    return (
                      <tr key={record.id}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">
                          {record.paymentDate
                            ? new Date(
                                record.paymentDate,
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="border p-2">{record.paymentTo}</td>
                        <td className="border p-2">{name}</td>
                        <td className="border p-2">
                          {record.processName || "-"}
                        </td>
                        <td className="border p-2 text-right">
                          {record.amount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Employee Selection Modal */}
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
                      <td className="border p-2">
                        {e.name || e.employeeName}
                      </td>
                      <td className="border p-2">
                        {e.code || e.employeeCode}
                      </td>
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

      {/* Party Selection Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">
              Select Party
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

      {/* Process Selection Modal */}
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

      {/* List View Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">
              Payment List
            </h3>

            <input
              placeholder="Search by Entry Type / Payment To / Name / Process"
              className="border p-2 rounded w-full mb-3"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Payment Date</th>
                    <th className="border p-2">Entry Type</th>
                    <th className="border p-2">Payment To</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Process</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="border p-4 text-center text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((d: any, i: number) => {
                      const name =
                        d.paymentTo === "Employee"
                          ? d.employeeName
                          : d.partyName;
                      return (
                        <tr key={d.id}>
                          <td className="border p-2 text-center">{i + 1}</td>
                          <td className="border p-2">
                            {d.paymentDate
                              ? new Date(
                                  d.paymentDate,
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="border p-2">{d.entryType}</td>
                          <td className="border p-2">{d.paymentTo}</td>
                          <td className="border p-2">{name}</td>
                          <td className="border p-2">
                            {d.processName || "-"}
                          </td>
                          <td className="border p-2 text-right">
                            {d.amount}
                          </td>
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

export default PaymentForm;