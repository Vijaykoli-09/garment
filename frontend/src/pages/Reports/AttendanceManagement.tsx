"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY";

type ProcessMaster = {
  serialNo: string; // keep string in UI
  processName: string;
};

type Employee = {
  code: string;
  employeeName: string;
  salaryType?: string; // kept (but NOT used for filtering)
  dateOfJoining?: string; // "YYYY-MM-DD" (LocalDate from backend)
  process?: { serialNo: any; processName: string };
};

type AttendanceExceptionRow = {
  id: number;
  employeeCode: string;
  employeeName?: string;
  processSerialNo?: string;
  processName?: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus; // ABSENT/HALF_DAY typically
};

type Props = {
  open: boolean;
  onClose: () => void;

  // Optional defaults (SalaryReport can pass current filters)
  defaultDate?: string; // YYYY-MM-DD
  defaultProcessSerialNo?: string; // ignored (attendance is only for Salary process)
  defaultEmployeeCode?: string; // employee code

  // Optional callback (SalaryReport can refresh salary-support after save)
  onSaved?: () => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const getTodayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const normUpper = (v: any) => String(v ?? "").trim().toUpperCase();

/**
 * ✅ Correct rule (as per requirement):
 * Attendance is ONLY for employees whose Process = Salary.
 * Salary Type does NOT matter.
 */
const isSalaryProcessEmployee = (e: Employee) => normUpper(e?.process?.processName) === "SALARY";

const AttendanceManagement: React.FC<Props> = ({
  open,
  onClose,
  defaultDate,
  defaultEmployeeCode,
  onSaved,
}) => {
  const [attendanceDate, setAttendanceDate] = useState<string>(defaultDate || getTodayIso());

  // process is forced to Salary process only
  const [processSerialNo, setProcessSerialNo] = useState<string>("");

  // optional employee filter (only within Salary process employees)
  const [employeeCode, setEmployeeCode] = useState<string>(defaultEmployeeCode || "");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [processList, setProcessList] = useState<ProcessMaster[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // initial (server) effective status for selected date
  const [initialStatusByEmp, setInitialStatusByEmp] = useState<Record<string, AttendanceStatus>>({});
  // current UI selections
  const [statusByEmp, setStatusByEmp] = useState<Record<string, AttendanceStatus>>({});

  const didInitDefaultsRef = useRef(false);

  // -------- Modal open: apply defaults once + load masters --------
  useEffect(() => {
    if (!open) return;

    if (!didInitDefaultsRef.current) {
      setAttendanceDate(defaultDate || getTodayIso());
      setEmployeeCode(defaultEmployeeCode || "");
      setSearchTerm("");
      didInitDefaultsRef.current = true;
    }
  }, [open, defaultDate, defaultEmployeeCode]);

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

        // ✅ Salary-process-only employees
        const salaryEmployees = normalizedEmp.filter(isSalaryProcessEmployee);
        setEmployees(salaryEmployees);

        const procList: any[] = Array.isArray(procRes.data) ? procRes.data : procRes.data?.data || [];
        const normalizedProc: ProcessMaster[] = procList.map((p: any) => ({
          serialNo: String(p.serialNo),
          processName: String(p.processName || "").trim(),
        }));

        // ✅ Dropdown should contain ONLY Salary process
        const salaryProc = normalizedProc.find((p) => normUpper(p.processName) === "SALARY");
        const salaryProcList = salaryProc ? [salaryProc] : [];
        setProcessList(salaryProcList);

        // Force processSerialNo to Salary process (if found)
        setProcessSerialNo(salaryProc?.serialNo || "");
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load employees/processes", "error");
      }
    };

    loadMasters();
  }, [open]);

  // reset init flag when closed
  useEffect(() => {
    if (!open) {
      didInitDefaultsRef.current = false;
      setInitialStatusByEmp({});
      setStatusByEmp({});
      setEmployees([]);
      setProcessList([]);
      setProcessSerialNo("");
    }
  }, [open]);

  // If a non-salary employeeCode was passed as default, clear it
  useEffect(() => {
    if (!open) return;
    if (employees.length === 0) return;
    if (!employeeCode) return;

    const found = employees.find((e) => String(e.code) === String(employeeCode));
    if (!found) setEmployeeCode("");
  }, [open, employees, employeeCode]);

  // -------- Filtering helpers --------
  const employeesScope = useMemo(() => {
    let list = employees;

    if (processSerialNo) {
      list = list.filter((e) => String(e.process?.serialNo || "") === String(processSerialNo));
    }
    if (employeeCode) {
      list = list.filter((e) => String(e.code) === String(employeeCode));
    }

    return [...list].sort((a, b) =>
      (a.employeeName || "").localeCompare(b.employeeName || "", undefined, { sensitivity: "base" })
    );
  }, [employees, processSerialNo, employeeCode]);

  const employeesShown = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return employeesScope;

    return employeesScope.filter((e) => {
      const code = (e.code || "").toLowerCase();
      const name = (e.employeeName || "").toLowerCase();
      const proc = (e.process?.processName || "").toLowerCase();
      return code.includes(term) || name.includes(term) || proc.includes(term);
    });
  }, [employeesScope, searchTerm]);

  const employeesForDropdown = useMemo(() => {
    let list = employees;
    if (processSerialNo) {
      list = list.filter((e) => String(e.process?.serialNo || "") === String(processSerialNo));
    }
    return [...list].sort((a, b) =>
      (a.employeeName || "").localeCompare(b.employeeName || "", undefined, { sensitivity: "base" })
    );
  }, [employees, processSerialNo]);

  const isApplicableForDate = (emp: Employee, ymd: string) => {
    const doj = emp.dateOfJoining;
    if (!doj) return true;
    return String(ymd) >= String(doj);
  };

  // -------- Load attendance exceptions for selected date --------
  const loadAttendanceForDate = async () => {
    if (!open) return;
    if (!attendanceDate) return;

    setLoading(true);
    try {
      const params: any = { from: attendanceDate, to: attendanceDate };

      // Salary-process-only (if we have serialNo)
      if (processSerialNo) params.processSerialNo = processSerialNo;

      // optional employee filter
      if (employeeCode) params.employeeCode = employeeCode;

      const res = await api.get("/attendance/exceptions", { params });
      const exceptions: AttendanceExceptionRow[] = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const excMap: Record<string, AttendanceStatus> = {};
      for (const r of exceptions) {
        if (r?.employeeCode && r?.status) excMap[String(r.employeeCode)] = r.status;
      }

      const init: Record<string, AttendanceStatus> = {};
      const curr: Record<string, AttendanceStatus> = {};

      for (const e of employeesScope) {
        const code = String(e.code);

        if (!isApplicableForDate(e, attendanceDate)) {
          init[code] = "PRESENT";
          curr[code] = "PRESENT";
          continue;
        }

        const st: AttendanceStatus = excMap[code] || "PRESENT";
        init[code] = st;
        curr[code] = st;
      }

      setInitialStatusByEmp(init);
      setStatusByEmp(curr);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (employees.length === 0) return;
    loadAttendanceForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attendanceDate, processSerialNo, employeeCode, employees.length]);

  // -------- Counts --------
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let half = 0;
    let notJoined = 0;

    for (const e of employeesScope) {
      const code = String(e.code);

      if (!isApplicableForDate(e, attendanceDate)) {
        notJoined++;
        continue;
      }

      const st: AttendanceStatus = statusByEmp[code] || "PRESENT";
      if (st === "PRESENT") present++;
      else if (st === "ABSENT") absent++;
      else half++;
    }

    const totalApplicable = present + absent + half;
    const effectiveDays = present + half * 0.5;
    const percent = totalApplicable === 0 ? 0 : (effectiveDays / totalApplicable) * 100;

    return {
      present,
      absent,
      half,
      notJoined,
      totalApplicable,
      effectiveDays: Math.round(effectiveDays * 100) / 100,
      percent: Math.round(percent * 100) / 100,
    };
  }, [employeesScope, statusByEmp, attendanceDate]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const e of employeesScope) {
      if (!isApplicableForDate(e, attendanceDate)) continue;

      const code = String(e.code);
      const init = initialStatusByEmp[code] || "PRESENT";
      const curr = statusByEmp[code] || "PRESENT";
      if (init !== curr) n++;
    }
    return n;
  }, [employeesScope, statusByEmp, initialStatusByEmp, attendanceDate]);

  // -------- Bulk set --------
  const setAllStatuses = (st: AttendanceStatus) => {
    const next = { ...statusByEmp };
    for (const e of employeesScope) {
      if (!isApplicableForDate(e, attendanceDate)) continue;
      next[String(e.code)] = st;
    }
    setStatusByEmp(next);
  };

  // -------- Save --------
  const handleSave = async () => {
    if (!attendanceDate) return Swal.fire("Validation Error", "Please select a Date", "warning");

    const changes: { employeeCode: string; date: string; status: AttendanceStatus }[] = [];
    for (const e of employeesScope) {
      if (!isApplicableForDate(e, attendanceDate)) continue;

      const code = String(e.code);
      const init = initialStatusByEmp[code] || "PRESENT";
      const curr = statusByEmp[code] || "PRESENT";

      if (init !== curr) {
        changes.push({ employeeCode: code, date: attendanceDate, status: curr });
      }
    }

    if (changes.length === 0) return Swal.fire("Info", "No changes to save.", "info");

    setSaving(true);
    try {
      await Promise.all(changes.map((c) => api.post("/attendance", c)));
      Swal.fire("Saved!", `Attendance saved for ${changes.length} employee(s).`, "success");
      await loadAttendanceForDate();
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err?.response?.data?.message || "Failed to save attendance", "error");
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
            <div className="text-lg font-bold">Attendance Management (Salary Process Only)</div>
            <div className="text-xs text-gray-600 mt-1">
              Scope rule: <strong>Process = Salary</strong> (Salary Type ignored). Missing record = <strong>PRESENT</strong>.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded text-sm hover:bg-gray-100" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 overflow-auto" style={{ maxHeight: "calc(90vh - 56px)" }}>
          {/* Filters */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <label className="block text-sm">Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              />
            </div>

            <div className="col-span-3">
              <label className="block text-sm">Process</label>
              <select
                value={processSerialNo}
                className="mt-1 p-2 border rounded w-full bg-gray-100"
                disabled
                title="Attendance is only for Salary process employees"
              >
                {processList.length === 0 && <option value="">Salary (not found in master)</option>}
                {processList.map((p) => (
                  <option key={p.serialNo} value={p.serialNo}>
                    {p.processName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-3">
              <label className="block text-sm">Employee</label>
              <select
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">-- All Salary Process Employees --</option>
                {employeesForDropdown.map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.employeeName} ({e.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-3">
              <label className="block text-sm">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code/name..."
                className="mt-1 p-2 border rounded w-full"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
              onClick={loadAttendanceForDate}
              disabled={loading || employees.length === 0}
            >
              {loading ? "Loading..." : "Load"}
            </button>

            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || loading || employees.length === 0}
            >
              {saving ? "Saving..." : `Save${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </button>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button className="px-3 py-2 border rounded hover:bg-gray-100" onClick={() => setAllStatuses("PRESENT")}>
                Mark All Present
              </button>
              <button className="px-3 py-2 border rounded hover:bg-gray-100" onClick={() => setAllStatuses("HALF_DAY")}>
                Mark All Half Day
              </button>
              <button className="px-3 py-2 border rounded hover:bg-gray-100" onClick={() => setAllStatuses("ABSENT")}>
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-3 text-sm text-gray-700">
            <div className="flex flex-wrap gap-4">
              <div>
                Scope Employees: <strong>{employeesScope.length}</strong> (Shown: <strong>{employeesShown.length}</strong>)
              </div>
              <div>
                Present: <strong>{counts.present}</strong>
              </div>
              <div>
                Half Day: <strong>{counts.half}</strong>
              </div>
              <div>
                Absent: <strong>{counts.absent}</strong>
              </div>
              <div>
                Not Joined (DOJ &gt; Date): <strong>{counts.notJoined}</strong>
              </div>
              <div>
                Effective Days: <strong>{counts.effectiveDays}</strong> / {counts.totalApplicable} (<strong>{counts.percent}%</strong>)
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 border rounded overflow-auto" style={{ maxHeight: "55vh" }}>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="border px-2 py-1">S No</th>
                  <th className="border px-2 py-1">Code</th>
                  <th className="border px-2 py-1">Employee</th>
                  <th className="border px-2 py-1">Process</th>
                  <th className="border px-2 py-1">DOJ</th>
                  <th className="border px-2 py-1">Status</th>
                  <th className="border px-2 py-1">Info</th>
                </tr>
              </thead>
              <tbody>
                {employeesShown.map((e, idx) => {
                  const code = String(e.code);
                  const applicable = isApplicableForDate(e, attendanceDate);

                  const init = initialStatusByEmp[code] || "PRESENT";
                  const curr = statusByEmp[code] || "PRESENT";
                  const dirty = applicable && init !== curr;

                  return (
                    <tr key={code} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border px-2 py-1">{code}</td>
                      <td className="border px-2 py-1">{e.employeeName}</td>
                      <td className="border px-2 py-1">{e.process?.processName || ""}</td>
                      <td className="border px-2 py-1">{e.dateOfJoining || ""}</td>
                      <td className="border px-2 py-1">
                        <select
                          className={`p-1 border rounded w-full ${dirty ? "border-orange-500" : ""}`}
                          disabled={!applicable}
                          value={curr}
                          onChange={(ev) => {
                            const v = ev.target.value as AttendanceStatus;
                            setStatusByEmp((prev) => ({ ...prev, [code]: v }));
                          }}
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="HALF_DAY">HALF_DAY</option>
                          <option value="ABSENT">ABSENT</option>
                        </select>
                      </td>
                      <td className="border px-2 py-1 text-xs text-gray-700">
                        {!applicable ? (
                          <span className="text-gray-500">Not applicable (before DOJ)</span>
                        ) : init !== "PRESENT" ? (
                          <span className="text-blue-700">
                            Exception saved: <strong>{init}</strong>
                          </span>
                        ) : (
                          <span className="text-gray-500">Default PRESENT</span>
                        )}
                        {dirty && <div className="text-orange-700">Changed (not saved)</div>}
                      </td>
                    </tr>
                  );
                })}

                {employeesShown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="border px-2 py-4 text-center text-gray-500">
                      No Salary process employees found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-600 mt-3">
            Save behavior:
            <ul className="list-disc ml-5 mt-1">
              <li>
                Setting an employee to <strong>PRESENT</strong> will remove any existing exception (so it becomes default PRESENT).
              </li>
              <li>
                Setting to <strong>ABSENT</strong> / <strong>HALF_DAY</strong> will store/update an exception record.
              </li>
              <li>Records before Date of Joining are disabled and not saved.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;