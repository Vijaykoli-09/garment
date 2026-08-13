"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

type ProcessMaster = {
  serialNo: string;
  processName: string;
};

type Employee = {
  code: string;
  employeeName: string;
  salaryType?: string;
  workingHours?: number; // normal working hours
  hourlyRate?: number; // optional (backend added)
  dateOfJoining?: string; // "YYYY-MM-DD"
  process?: { serialNo: any; processName: string };
};

type ExtraHoursRow = {
  id: number;
  employeeCode: string;
  employeeName?: string;
  processSerialNo?: string;
  processName?: string;
  date: string; // "YYYY-MM-DD"
  extraHours: number;
  extraHourRate: number;
  amount: number;
  remarks?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // Optional defaults for filters (SalaryReport can pass current filters)
  defaultFromDate?: string; // YYYY-MM-DD
  defaultToDate?: string; // YYYY-MM-DD
  defaultProcessSerialNo?: string;
  defaultEmployeeCode?: string;

  // Optional callback for SalaryReport to refresh after save/delete
  onSaved?: () => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const getTodayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const getFirstOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const n0 = (v: any) => {
  const x = Number.parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : 0;
};

const ExtraHoursManagement: React.FC<Props> = ({
  open,
  onClose,
  defaultFromDate,
  defaultToDate,
  defaultProcessSerialNo,
  defaultEmployeeCode,
  onSaved,
}) => {
  // ------- Masters -------
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [processList, setProcessList] = useState<ProcessMaster[]>([]);

  // ------- Filters for list -------
  const [fromDate, setFromDate] = useState<string>(defaultFromDate || getFirstOfMonthIso());
  const [toDate, setToDate] = useState<string>(defaultToDate || getTodayIso());
  const [processSerialNo, setProcessSerialNo] = useState<string>(defaultProcessSerialNo || "");
  const [employeeCodeFilter, setEmployeeCodeFilter] = useState<string>(defaultEmployeeCode || "");

  // ------- Entry Form -------
  const [editingId, setEditingId] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState<string>(getTodayIso());
  const [employeeCode, setEmployeeCode] = useState<string>(defaultEmployeeCode || "");
  const [extraHours, setExtraHours] = useState<string>("0");
  const [extraHourRate, setExtraHourRate] = useState<string>("0");
  const [remarks, setRemarks] = useState<string>("");

  // ------- Data -------
  const [rows, setRows] = useState<ExtraHoursRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const didInitDefaultsRef = useRef(false);

  // apply defaults once per open
  useEffect(() => {
    if (!open) return;

    if (!didInitDefaultsRef.current) {
      setFromDate(defaultFromDate || getFirstOfMonthIso());
      setToDate(defaultToDate || getTodayIso());
      setProcessSerialNo(defaultProcessSerialNo || "");
      setEmployeeCodeFilter(defaultEmployeeCode || "");

      // entry defaults
      setEntryDate(getTodayIso());
      setEmployeeCode(defaultEmployeeCode || "");
      setEditingId(null);
      setExtraHours("0");
      setExtraHourRate("0");
      setRemarks("");

      didInitDefaultsRef.current = true;
    }
  }, [open, defaultFromDate, defaultToDate, defaultProcessSerialNo, defaultEmployeeCode]);

  // reset init flag when closed
  useEffect(() => {
    if (!open) {
      didInitDefaultsRef.current = false;
      setRows([]);
    }
  }, [open]);

  // load masters when open
  useEffect(() => {
    if (!open) return;

    const loadMasters = async () => {
      try {
        const [empRes, procRes] = await Promise.all([api.get("/employees"), api.get("/process/list")]);

        const empList: Employee[] = Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || [];
        const normalizedEmp = empList.map((e) => ({
          ...e,
          process: e.process ? { ...e.process, serialNo: String((e.process as any).serialNo) } : undefined,
        }));
        setEmployees(normalizedEmp);

        const procList: any[] = Array.isArray(procRes.data) ? procRes.data : procRes.data?.data || [];
        const normalizedProc: ProcessMaster[] = procList.map((p: any) => ({
          serialNo: String(p.serialNo),
          processName: String(p.processName || "").trim(),
        }));
        setProcessList(normalizedProc);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load employees/processes", "error");
      }
    };

    if (employees.length === 0 || processList.length === 0) loadMasters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const employeesForDropdown = useMemo(() => {
    let list = employees;
    if (processSerialNo) {
      list = list.filter((e) => String(e.process?.serialNo || "") === String(processSerialNo));
    }
    return [...list].sort((a, b) =>
      (a.employeeName || "").localeCompare(b.employeeName || "", undefined, { sensitivity: "base" })
    );
  }, [employees, processSerialNo]);

  const selectedEmployee = useMemo(() => {
    const code = String(employeeCode || "").trim();
    if (!code) return undefined;
    return employees.find((e) => String(e.code) === code);
  }, [employees, employeeCode]);

  const normalWorkingHours = selectedEmployee?.workingHours ?? 0;

  const computedAmount = useMemo(() => {
    const h = n0(extraHours);
    const r = n0(extraHourRate);
    return Math.round(h * r * 100) / 100;
  }, [extraHours, extraHourRate]);

  const entryApplicable = useMemo(() => {
    if (!selectedEmployee) return true;
    const doj = selectedEmployee.dateOfJoining;
    if (!doj) return true;
    return String(entryDate) >= String(doj);
  }, [selectedEmployee, entryDate]);

  // ------- Load list -------
  const loadList = async () => {
    if (!open) return;
    if (!fromDate || !toDate) return Swal.fire("Validation Error", "Please select From & To dates", "warning");

    setLoading(true);
    try {
      const params: any = { from: fromDate, to: toDate };
      if (employeeCodeFilter) params.employeeCode = employeeCodeFilter;
      if (processSerialNo) params.processSerialNo = processSerialNo;

      const res = await api.get("/extra-hours", { params });
      const list: ExtraHoursRow[] = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const sorted = [...list].sort((a, b) => {
        const dc = String(a.date || "").localeCompare(String(b.date || ""));
        if (dc !== 0) return dc;
        return String(a.employeeName || "").localeCompare(String(b.employeeName || ""), undefined, { sensitivity: "base" });
      });

      setRows(sorted);
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err?.response?.data?.message || "Failed to load extra hours list", "error");
    } finally {
      setLoading(false);
    }
  };

  // auto load when open (after defaults)
  useEffect(() => {
    if (!open) return;
    if (!fromDate || !toDate) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ------- Form actions -------
  const resetForm = () => {
    setEditingId(null);
    setEntryDate(getTodayIso());
    setEmployeeCode(defaultEmployeeCode || "");
    setExtraHours("0");
    setExtraHourRate("0");
    setRemarks("");
  };

  const handleEdit = (r: ExtraHoursRow) => {
    setEditingId(r.id);
    setEntryDate(r.date);
    setEmployeeCode(String(r.employeeCode));
    setExtraHours(String(r.extraHours ?? 0));
    setExtraHourRate(String(r.extraHourRate ?? 0));
    setRemarks(String(r.remarks ?? ""));
  };

  const handleDelete = async (id: number) => {
    const ok = await Swal.fire({
      title: "Delete?",
      text: "Are you sure you want to delete this extra hours entry?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });

    if (!ok.isConfirmed) return;

    try {
      await api.delete(`/extra-hours/${id}`);
      Swal.fire("Deleted!", "Extra hours deleted successfully.", "success");
      await loadList();
      onSaved?.();
      if (editingId === id) resetForm();
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err?.response?.data?.message || "Failed to delete extra hours", "error");
    }
  };

  const handleSave = async () => {
    if (!employeeCode?.trim()) {
      return Swal.fire("Validation Error", "Please select an Employee", "warning");
    }
    if (!entryDate) {
      return Swal.fire("Validation Error", "Please select Date", "warning");
    }
    if (!entryApplicable) {
      return Swal.fire("Validation Error", "Entry date cannot be before employee Date of Joining", "warning");
    }

    const h = n0(extraHours);
    const r = n0(extraHourRate);

    if (h < 0) return Swal.fire("Validation Error", "Extra Hours cannot be negative", "warning");
    if (r < 0) return Swal.fire("Validation Error", "Extra Hour Rate cannot be negative", "warning");

    const payload = {
      employeeCode: String(employeeCode).trim(),
      date: entryDate,
      extraHours: h,
      extraHourRate: r,
      remarks: remarks?.trim() || "",
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/extra-hours/${editingId}`, payload);
        Swal.fire("Updated!", "Extra hours updated successfully.", "success");
      } else {
        await api.post("/extra-hours", payload);
        Swal.fire("Saved!", "Extra hours saved successfully.", "success");
      }

      resetForm();
      await loadList();
      onSaved?.();
    } catch (err: any) {
      console.error(err);

      const msg = err?.response?.data?.message || err?.response?.data || "Failed to save extra hours";

      if (String(msg).toLowerCase().includes("already exists")) {
        const existing = rows.find((x) => String(x.employeeCode) === String(payload.employeeCode) && String(x.date) === String(payload.date));
        if (existing) {
          const goEdit = await Swal.fire({
            title: "Already exists",
            text: "An entry already exists for this employee and date. Do you want to edit it?",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Edit existing",
          });
          if (goEdit.isConfirmed) handleEdit(existing);
          return;
        }
      }

      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />

      <div className="relative bg-white rounded shadow overflow-hidden w-[95%] lg:w-[90%]" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <div className="text-lg font-bold">Extra Hours Management</div>
            <div className="text-xs text-gray-600 mt-1">
              Amount is auto-calculated: <strong>Extra Hours × Extra Hour Rate</strong> (rate entered manually).
            </div>
          </div>
          <button className="px-3 py-1 border rounded text-sm hover:bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-3 overflow-auto" style={{ maxHeight: "calc(90vh - 56px)" }}>
          {/* Filters */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-2">
              <label className="block text-sm">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
            </div>

            <div className="col-span-3">
              <label className="block text-sm">Process (Filter)</label>
              <select
                value={processSerialNo}
                onChange={(e) => {
                  setProcessSerialNo(e.target.value);
                  setEmployeeCodeFilter("");
                }}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">-- All Processes --</option>
                {processList.map((p) => (
                  <option key={p.serialNo} value={p.serialNo}>
                    {p.processName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-3">
              <label className="block text-sm">Employee (Filter)</label>
              <select value={employeeCodeFilter} onChange={(e) => setEmployeeCodeFilter(e.target.value)} className="mt-1 p-2 border rounded w-full">
                <option value="">{processSerialNo ? "-- All Process Employees --" : "-- All Employees --"}</option>
                {employeesForDropdown.map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.employeeName} ({e.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60" onClick={loadList} disabled={loading}>
                {loading ? "Loading..." : "Load List"}
              </button>
            </div>
          </div>

          {/* Entry Form */}
          <div className="mt-5 border rounded p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{editingId ? `Edit Extra Hours (ID: ${editingId})` : "Add Extra Hours"}</div>
              <div className="text-xs text-gray-600">
                Normal Working Hours: <strong>{Number(normalWorkingHours || 0).toLocaleString()}</strong>
                {selectedEmployee?.hourlyRate != null && (
                  <>
                    {" "}
                    | Employee Hourly Rate: <strong>{Number(selectedEmployee.hourlyRate || 0).toLocaleString()}</strong>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 mt-3 items-end">
              <div className="col-span-2">
                <label className="block text-sm">Date</label>
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div className="col-span-4">
                <label className="block text-sm">Employee</label>
                <select value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} className="mt-1 p-2 border rounded w-full">
                  <option value="">-- Select Employee --</option>
                  {employeesForDropdown.map((e) => (
                    <option key={e.code} value={e.code}>
                      {e.employeeName} ({e.code}) {e.process?.processName ? `- ${e.process.processName}` : ""}
                    </option>
                  ))}
                </select>
                {!entryApplicable && <div className="text-[11px] text-red-600 mt-1">Entry date is before employee DOJ. Not allowed.</div>}
              </div>

              <div className="col-span-2">
                <label className="block text-sm">Extra Hours</label>
                <input type="number" value={extraHours} onChange={(e) => setExtraHours(e.target.value)} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm">Extra Hour Rate</label>
                <input type="number" value={extraHourRate} onChange={(e) => setExtraHourRate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm">Amount</label>
                <input
                  type="text"
                  value={computedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  disabled
                  className="mt-1 p-2 border rounded w-full bg-gray-200"
                />
              </div>

              <div className="col-span-10">
                <label className="block text-sm">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-1 p-2 border rounded w-full"
                  placeholder="Optional"
                />
              </div>

              <div className="col-span-2 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
                <button className="flex-1 px-4 py-2 border rounded hover:bg-gray-100" onClick={resetForm}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="mt-5 border rounded overflow-auto" style={{ maxHeight: "45vh" }}>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="border px-2 py-1">S No</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Employee</th>
                  <th className="border px-2 py-1">Process</th>
                  <th className="border px-2 py-1 text-right">Extra Hours</th>
                  <th className="border px-2 py-1 text-right">Rate</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Remarks</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border px-2 py-1">{r.date}</td>
                    <td className="border px-2 py-1">
                      {r.employeeName} <span className="text-xs text-gray-500">({r.employeeCode})</span>
                    </td>
                    <td className="border px-2 py-1">{r.processName || ""}</td>
                    <td className="border px-2 py-1 text-right">{Number(r.extraHours || 0).toLocaleString()}</td>
                    <td className="border px-2 py-1 text-right">{Number(r.extraHourRate || 0).toLocaleString()}</td>
                    <td className="border px-2 py-1 text-right">
                      {Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border px-2 py-1">{r.remarks || ""}</td>
                    <td className="border px-2 py-1">
                      <button className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 mr-2" onClick={() => handleEdit(r)}>
                        Edit
                      </button>
                      <button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700" onClick={() => handleDelete(r.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="border px-2 py-4 text-center text-gray-500">
                      No extra hours found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>

              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={4} className="border px-2 py-1 text-right">
                      Totals
                    </td>
                    <td className="border px-2 py-1 text-right">{rows.reduce((s, x) => s + n0(x.extraHours), 0).toLocaleString()}</td>
                    <td className="border px-2 py-1" />
                    <td className="border px-2 py-1 text-right">
                      {rows.reduce((s, x) => s + n0(x.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border px-2 py-1" />
                    <td className="border px-2 py-1" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="text-xs text-gray-600 mt-3">
            Tip: If you get "already exists for this employee and date", load the list for that date range and click <strong>Edit</strong> on the existing row.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtraHoursManagement;