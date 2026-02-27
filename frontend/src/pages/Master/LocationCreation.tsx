"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard"; // adjust path if needed
import Swal from "sweetalert2";

// =============== Types ===============
interface Location {
  id?: number;
  serialNumber?: string;
  branchName: string;
  branchCode?: string;
  station?: string;
  stateName?: string;
  address?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
  transportName?: string;
  active?: boolean;
  remarks?: string;
}

// =============== API Client ===============
const BASE =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:8080/api";

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const LocationAPI = {
  list: (search?: string) =>
    http<Location[]>(
      `${BASE}/locations${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),
  nextSerial: () =>
    http<{ serialNumber: string }>(`${BASE}/locations/next-serial`),
  create: (body: Location) =>
    http<Location>(`${BASE}/locations`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: number, body: Location) =>
    http<Location>(`${BASE}/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    fetch(`${BASE}/locations/${id}`, { method: "DELETE" }).then(async (r) => {
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
          const j = await r.json();
          msg = j.message || msg;
        } catch {}
        throw new Error(msg);
      }
    }),
};

// =============== Component ===============
const LocationCreation: React.FC = () => {
  const [list, setList] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [q, setQ] = useState("");

  const [form, setForm] = useState<Location>({
    id: undefined,
    serialNumber: "",
    branchName: "",
    branchCode: "",
    station: "",
    stateName: "",
    address: "",
    pinCode: "",
    phone: "",
    email: "",
    transportName: "",
    active: true,
    remarks: "",
  });

  const isEdit = useMemo(() => !!form.id, [form.id]);

  const loadList = async (search?: string) => {
    try {
      const data = await LocationAPI.list(search);
      setList(data);
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", e.message || "Failed to load locations", "error");
    }
  };

  const loadNextSerial = async () => {
    try {
      const { serialNumber } = await LocationAPI.nextSerial();
      setForm((p) => ({ ...p, serialNumber }));
    } catch (e) {
      console.error(e);
      // ignore preview error
    }
  };

  // Initial load
  useEffect(() => {
    loadList();
    loadNextSerial();
  }, []);

  // Debounced server-side search
  useEffect(() => {
    const t = setTimeout(() => {
      const s = q.trim();
      loadList(s || undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const resetForm = async () => {
    setForm({
      id: undefined,
      serialNumber: "",
      branchName: "",
      branchCode: "",
      station: "",
      stateName: "",
      address: "",
      pinCode: "",
      phone: "",
      email: "",
      transportName: "",
      active: true,
      remarks: "",
    });
    await loadNextSerial();
  };

  const validate = (): string | null => {
    if (!form.branchName?.trim()) return "Branch Name is required";
    if (!form.station?.trim()) return "Station (City) is required";
    return null;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const el = e.currentTarget;
    const { name } = el;

    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: el.checked as any }));
    } else {
      setForm((prev) => ({ ...prev, [name]: el.value }));
    }
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Swal.fire("Validation", err, "warning");
      return;
    }
    try {
      setLoading(true);
      if (isEdit && form.id) {
        const saved = await LocationAPI.update(form.id, form);
        setForm(saved);
        Swal.fire("Updated", "Location updated successfully", "success");
      } else {
        await LocationAPI.create(form);
        Swal.fire("Saved", "Location created successfully", "success");
        await resetForm();
      }
      await loadList(q.trim() || undefined);
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", e.message || "Failed to save location", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) {
      Swal.fire("Info", "No record selected", "info");
      return;
    }
    const res = await Swal.fire({
      icon: "warning",
      title: "Delete this location?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!res.isConfirmed) return;
    try {
      setLoading(true);
      await LocationAPI.remove(id);
      if (form.id === id) await resetForm();
      await loadList(q.trim() || undefined);
      Swal.fire("Deleted", "Location deleted", "success");
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", e.message || "Failed to delete", "error");
    } finally {
      setLoading(false);
    }
  };

  // Server-side search already applied; just render list
  const filtered = useMemo(() => list, [list]);

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-bold flex-1 text-center">
              Location Creation
            </h2>
            <div className="space-x-2"></div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="font-semibold block mb-1">Serial No</label>
              <input
                value={form.serialNumber || ""}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Branch Name</label>
              <input
                name="branchName"
                value={form.branchName || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Branch Code</label>
              <input
                name="branchCode"
                value={form.branchCode || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="active"
                  checked={!!form.active}
                  onChange={handleChange}
                />
                Active
              </label>
            </div>

            <div>
              <label className="font-semibold block mb-1">Station (City)</label>
              <input
                name="station"
                value={form.station || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">State</label>
              <input
                name="stateName"
                value={form.stateName || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Pin Code</label>
              <input
                name="pinCode"
                value={form.pinCode || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Transport</label>
              <input
                name="transportName"
                value={form.transportName || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>

            <div className="col-span-2">
              <label className="font-semibold block mb-1">Address</label>
              <input
                name="address"
                value={form.address || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Phone</label>
              <input
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>

            <div className="col-span-4">
              <label className="font-semibold block mb-1">Remarks</label>
              <input
                name="remarks"
                value={form.remarks || ""}
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={handleSave}
              disabled={loading}
              className={`px-4 py-2 rounded text-white ${
                loading ? "bg-emerald-300" : "bg-emerald-600"
              }`}
            >
              {isEdit ? "Update" : "Save"}
            </button>
            <button
              onClick={() =>
                form.id
                  ? handleDelete(form.id)
                  : Swal.fire("Info", "No record selected", "info")
              }
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Delete
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-orange-500 text-white rounded"
            >
              New
            </button>
            <button
              onClick={() => setListOpen(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded"
            >
              Location List
            </button>
          </div>
        </div>
      </div>

      {/* List Modal */}
      {listOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Locations</h3>
              <button
                onClick={() => setListOpen(false)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Close
              </button>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search serial / branch / station / state / code"
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-[70vh] border">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-center">#</th>
                    <th className="border p-2">Serial</th>
                    <th className="border p-2">Branch</th>
                    <th className="border p-2">Code</th>
                    <th className="border p-2">Station</th>
                    <th className="border p-2">State</th>
                    <th className="border p-2">Active</th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x, i) => (
                    <tr key={x.id || x.serialNumber} className="hover:bg-gray-50">
                      <td className="border p-2 text-center">{i + 1}</td>
                      <td className="border p-2">{x.serialNumber}</td>
                      <td className="border p-2">{x.branchName}</td>
                      <td className="border p-2">{x.branchCode}</td>
                      <td className="border p-2">{x.station}</td>
                      <td className="border p-2">{x.stateName}</td>
                      <td className="border p-2">{x.active ? "Yes" : "No"}</td>
                      <td className="border p-2 text-center space-x-2">
                        <button
                          onClick={() => {
                            setForm({ ...x });
                            setListOpen(false);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => x.id && handleDelete(x.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="border p-3 text-center text-gray-500">
                        No locations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
};

export default LocationCreation;