"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import {
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

// =============== Types ===============
type Role = {
  id: string;
  name: string; // e.g. ROLE_CRM
  description?: string;
  permissions: Record<string, boolean>;
  usersCount?: number;
};

type User = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  roleName: string; // e.g. ROLE_CRM
  status: "active" | "inactive";
  lastActive: string;
  createdAt: string;
};

const permissionModules = [
  {
    name: "Dashboard",
    permissions: [
      { id: "viewDashboard", label: "View Dashboard" },
      { id: "customizeDashboard", label: "Customize Dashboard" },
    ],
  },
  {
    name: "User Management",
    permissions: [
      { id: "viewUsers", label: "View Users" },
      { id: "manageUsers", label: "Manage Users" },
      { id: "editRoles", label: "Edit Roles" },
    ],
  },
  {
    name: "Modules",
    permissions: [
      { id: "manageLogistics", label: "Logistics Module" },
      { id: "manageFinance", label: "Finance Module" },
      { id: "manageHR", label: "HR Module" },
      { id: "manageCRM", label: "CRM Module" },
    ],
  },
  {
    name: "Reports",
    permissions: [
      { id: "viewReports", label: "View Reports" },
      { id: "exportReports", label: "Export Reports" },
    ],
  },
];

const emptyPerms = (): Record<string, boolean> => {
  const m: Record<string, boolean> = {};
  permissionModules.forEach((g) => g.permissions.forEach((p) => (m[p.id] = false)));
  return m;
};

const cleanRole = (r: string) => r.replace(/^ROLE_/, "").replace(/_/g, " ").toUpperCase();
const avatarUrl = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "U")}&backgroundType=gradientLinear&fontFamily=Arial`;
const dotStyle = (color: string) => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "9999px",
  backgroundColor: color,
  marginRight: 6,
});

// =============== Static seed (localStorage) ===============
const LS_USERS = "um_static_users";
const LS_ROLES = "um_static_roles";
const LS_DEPTS = "um_static_departments";

const seedDataIfEmpty = () => {
  if (!localStorage.getItem(LS_ROLES)) {
    const roles: Role[] = [
      {
        id: "r-1",
        name: "ROLE_SUPER_ADMIN",
        description: "System Administrator",
        permissions: {
          ...emptyPerms(),
          viewDashboard: true,
          viewUsers: true,
          manageUsers: true,
          editRoles: true,
          manageCRM: true,
          manageHR: true,
          manageFinance: true,
          manageLogistics: true,
          viewReports: true,
          exportReports: true,
        },
      },
      {
        id: "r-2",
        name: "ROLE_CRM",
        description: "CRM team role",
        permissions: {
          ...emptyPerms(),
          viewDashboard: true,
          viewUsers: true,
          manageCRM: true,
          viewReports: true,
        },
      },
      {
        id: "r-3",
        name: "ROLE_LOGISTICS",
        description: "Logistics team",
        permissions: {
          ...emptyPerms(),
          viewDashboard: true,
          manageLogistics: true,
          viewReports: true,
        },
      },
      {
        id: "r-4",
        name: "ROLE_USER",
        description: "Basic access",
        permissions: {
          ...emptyPerms(),
          viewDashboard: true,
          viewUsers: true,
        },
      },
    ];
    localStorage.setItem(LS_ROLES, JSON.stringify(roles));
  }

  if (!localStorage.getItem(LS_DEPTS)) {
    const departments = ["HR", "Finance", "Logistics", "Sales", "Production", "CRM"];
    localStorage.setItem(LS_DEPTS, JSON.stringify(departments));
  }

  if (!localStorage.getItem(LS_USERS)) {
    const now = new Date();
    const users: User[] = [
      {
        id: "u-1",
        firstname: "Sachin",
        lastname: "Kumar",
        email: "abde@gm.vom",
        phone: "9876543210",
        roleName: "ROLE_CRM",
        status: "active",
        lastActive: new Date(now.getTime() - 1_000 * 60 * 60 * 24).toLocaleString(),
        createdAt: new Date(now.getTime() - 1_000 * 60 * 60 * 48).toISOString(),
      },
      {
        id: "u-2",
        firstname: "mohan",
        lastname: "",
        email: "mohan@gmail.com",
        phone: "9999999999",
        roleName: "ROLE_LOGISTICS",
        status: "active",
        lastActive: "N/A",
        createdAt: new Date(now.getTime() - 1_000 * 60 * 60 * 72).toISOString(),
      },
      {
        id: "u-3",
        firstname: "Sachin",
        lastname: "",
        email: "sachinofficials298@gmail.com",
        phone: "8888888888",
        roleName: "ROLE_USER",
        status: "active",
        lastActive: new Date(now.getTime() - 1_000 * 60 * 60 * 144).toLocaleString(),
        createdAt: new Date(now.getTime() - 1_000 * 60 * 60 * 144).toISOString(),
      },
      {
        id: "u-4",
        firstname: "System",
        lastname: "Administrator",
        email: "admin@jbrc.com",
        phone: "7777777777",
        roleName: "ROLE_SUPER_ADMIN",
        status: "active",
        lastActive: new Date(now.getTime() - 1_000 * 60 * 60 * 24 * 15).toLocaleString(),
        createdAt: new Date(now.getTime() - 1_000 * 60 * 60 * 24 * 15).toISOString(),
      },
    ];
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }
};

const loadUsers = (): User[] => JSON.parse(localStorage.getItem(LS_USERS) || "[]");
const saveUsers = (u: User[]) => localStorage.setItem(LS_USERS, JSON.stringify(u));
const loadRoles = (): Role[] => JSON.parse(localStorage.getItem(LS_ROLES) || "[]");
const saveRoles = (r: Role[]) => localStorage.setItem(LS_ROLES, JSON.stringify(r));
const loadDepartments = (): string[] => JSON.parse(localStorage.getItem(LS_DEPTS) || "[]");

// =============== Component ===============
const UserManagement: React.FC = () => {
  // Tabs
  const [tab, setTab] = useState<"users" | "roles">("users");

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // UI
  const [query, setQuery] = useState("");
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  // Modals
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);

  // Forms
  const [userForm, setUserForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    roleName: "",
    department: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showCPass, setShowCPass] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editNewPassword, setEditNewPassword] = useState("");

  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [rolePerms, setRolePerms] = useState<Record<string, boolean>>(emptyPerms());

  useEffect(() => {
    seedDataIfEmpty();
    const r = loadRoles();
    const d = loadDepartments();
    const u = loadUsers();
    setRoles(r);
    setDepartments(d);
    setUsers(
      u.map((x) => ({
        ...x,
        // recalc usersCount later
      }))
    );
  }, []);

  // Maintain usersCount on roles
  useEffect(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => (counts[u.roleName] = (counts[u.roleName] || 0) + 1));
    setRoles((prev) => prev.map((r) => ({ ...r, usersCount: counts[r.name] || 0 })));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        `${u.firstname} ${u.lastname}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        cleanRole(u.roleName).toLowerCase().includes(q)
    );
  }, [users, query]);

  // ====== Users ======
  const openAddUser = () => {
    setUserForm({
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      roleName: roles[0]?.name || "ROLE_USER",
      department: departments[0] || "",
      password: "",
      confirmPassword: "",
    });
    setShowPass(false);
    setShowCPass(false);
    setAddUserOpen(true);
  };

  const createUser = () => {
    if (!userForm.firstname || !userForm.email || !userForm.roleName) {
      Swal.fire("Validation", "Please fill First name, Email and Role", "warning");
      return;
    }
    if (userForm.password !== userForm.confirmPassword) {
      Swal.fire("Validation", "Passwords do not match", "warning");
      return;
    }
    const newU: User = {
      id: "u-" + Date.now(),
      firstname: userForm.firstname,
      lastname: userForm.lastname,
      email: userForm.email,
      phone: userForm.phone,
      roleName: userForm.roleName,
      status: "active",
      lastActive: "N/A",
      createdAt: new Date().toISOString(),
    };
    const next = [newU, ...users];
    setUsers(next);
    saveUsers(next);
    setAddUserOpen(false);
    Swal.fire({ icon: "success", title: "User created", timer: 900, showConfirmButton: false });
  };

  const openEditUserModal = (u: User) => {
    setEditUser({ ...u });
    setEditNewPassword("");
    setEditUserOpen(true);
  };

  const saveEditedUser = () => {
    if (!editUser) return;
    const next = users.map((x) => (x.id === editUser.id ? editUser : x));
    setUsers(next);
    saveUsers(next);
    setEditUserOpen(false);
    Swal.fire({ icon: "success", title: "User updated", timer: 900, showConfirmButton: false });
  };

  const deleteUser = async (u: User) => {
    const res = await Swal.fire({
      icon: "warning",
      title: `Delete ${u.firstname} ${u.lastname || ""}?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!res.isConfirmed) return;
    const next = users.filter((x) => x.id !== u.id);
    setUsers(next);
    saveUsers(next);
    Swal.fire({ icon: "success", title: "Deleted", timer: 800, showConfirmButton: false });
  };

  // ====== Roles ======
  const openAddRole = () => {
    setRoleForm({ name: "ROLE_", description: "" });
    setRolePerms(emptyPerms());
    setAddRoleOpen(true);
  };

  const createRole = () => {
    const nm = roleForm.name.trim();
    if (!nm || !nm.startsWith("ROLE_")) {
      Swal.fire("Validation", 'Role name must start with "ROLE_"', "warning");
      return;
    }
    const newR: Role = {
      id: "r-" + Date.now(),
      name: nm.toUpperCase(),
      description: roleForm.description,
      permissions: { ...rolePerms },
      usersCount: 0,
    };
    const next = [newR, ...roles];
    setRoles(next);
    saveRoles(next);
    setAddRoleOpen(false);
    Swal.fire({ icon: "success", title: "Role created", timer: 900, showConfirmButton: false });
  };

  const toggleRolePermission = (roleId: string, key: string) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? { ...r, permissions: { ...r.permissions, [key]: !r.permissions[key] } }
          : r
      )
    );
  };

  const saveRolePermissions = (role: Role) => {
    const next = roles.map((r) => (r.id === role.id ? role : r));
    setRoles(next);
    saveRoles(next);
    Swal.fire({ icon: "success", title: "Permissions updated", timer: 800, showConfirmButton: false });
  };

  return (
    <Dashboard>
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-gray-500">Manage user accounts, roles, and permissions across the organization.</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6">
            {/* Top row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-full sm:w-80">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border bg-white"
                />
              </div>

              {/* Removed top "New Role" button as requested */}

              <button
                onClick={openAddUser}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-black font-semibold"
              >
                <PlusIcon className="w-4 h-4" /> Add User
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4">
              <div className="inline-flex bg-gray-100 rounded-xl p-1">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    tab === "users" ? "bg-white shadow" : "text-gray-700"
                  }`}
                  onClick={() => setTab("users")}
                >
                  Users
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    tab === "roles" ? "bg-white shadow" : "text-gray-700"
                  }`}
                  onClick={() => setTab("roles")}
                >
                  Roles & Permissions
                </button>
              </div>
            </div>

            {/* Users tab */}
            {tab === "users" && (
              <div className="mt-4 overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 border-b">Name</th>
                      <th className="text-left p-3 border-b">Role</th>
                      <th className="text-left p-3 border-b">Status</th>
                      <th className="text-left p-3 border-b">Last Active</th>
                      <th className="text-right p-3 border-b"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td className="p-4 text-center text-gray-500" colSpan={5}>
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const name = `${u.firstname} ${u.lastname}`.trim();
                        return (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="p-3 border-b">
                              <div className="flex items-center gap-3">
                                <img
                                  src={avatarUrl(name)}
                                  alt={name}
                                  className="w-9 h-9 rounded-full border bg-white"
                                />
                                <div>
                                  <div className="font-semibold">{name || "—"}</div>
                                  <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 border-b">
                              <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs bg-white">
                                {cleanRole(u.roleName)}
                              </span>
                            </td>
                            <td className="p-3 border-b">
                              <span style={dotStyle(u.status === "active" ? "#22c55e" : "#ef4444")} />
                              <span className="capitalize">{u.status}</span>
                            </td>
                            <td className="p-3 border-b">{u.lastActive}</td>
                            <td className="p-3 border-b">
                              <div className="flex justify-end">
                                <UserActionsMenu
                                  onEdit={() => openEditUserModal(u)}
                                  onDelete={() => deleteUser(u)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Roles tab */}
            {tab === "roles" && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">
                    Total roles: <b>{roles.length}</b>
                  </div>
                  <button
                    onClick={openAddRole}
                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-black font-semibold"
              >
                   <PlusIcon className="w-4 h-4" />
                    Add Role
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b">Role Name</th>
                        <th className="text-left p-3 border-b">Description</th>
                        <th className="text-left p-3 border-b">Users</th>
                        <th className="text-right p-3 border-b">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((r) => {
                        const expanded = expandedRoleId === r.id;
                        return (
                          <React.Fragment key={r.id}>
                            <tr className="hover:bg-gray-50">
                              <td className="p-3 border-b font-semibold">{cleanRole(r.name)}</td>
                              <td className="p-3 border-b">{r.description || "—"}</td>
                              <td className="p-3 border-b">{r.usersCount ?? 0}</td>
                              <td className="p-3 border-b">
                                <div className="flex justify-end gap-2">
                                  <button
                                    className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                                    onClick={() => setExpandedRoleId(expanded ? null : r.id)}
                                  >
                                    {expanded ? "Hide" : "Edit"} Permissions
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {expanded && (
                              <tr>
                                <td colSpan={4} className="p-3 border-b bg-gray-50">
                                  <div className="font-semibold mb-2">
                                    Permissions for <span className="text-blue-600">{cleanRole(r.name)}</span>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {permissionModules.map((mod) => (
                                      <div key={mod.name} className="bg-white border rounded p-3">
                                        <div className="text-sm font-bold text-gray-600 mb-2">{mod.name}</div>
                                        <div className="space-y-2">
                                          {mod.permissions.map((p) => (
                                            <label
                                              key={p.id}
                                              className="flex items-center justify-between border rounded px-3 py-2"
                                            >
                                              <span>{p.label}</span>
                                              <input
                                                type="checkbox"
                                                checked={!!r.permissions[p.id]}
                                                onChange={() => toggleRolePermission(r.id, p.id)}
                                              />
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-right mt-3">
                                    <button
                                      onClick={() => saveRolePermissions(r)}
                                      className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                                    >
                                      Save Changes
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add User Modal */}
        {addUserOpen && (
          <Modal title="Add User" onClose={() => setAddUserOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                label="First name"
                value={userForm.firstname}
                onChange={(v) => setUserForm((s) => ({ ...s, firstname: v }))}
              />
              <TextField
                label="Last name"
                value={userForm.lastname}
                onChange={(v) => setUserForm((s) => ({ ...s, lastname: v }))}
              />
              <TextField
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(v) => setUserForm((s) => ({ ...s, email: v }))}
              />
              <TextField
                label="Phone"
                value={userForm.phone}
                onChange={(v) => setUserForm((s) => ({ ...s, phone: v }))}
              />
              <SelectField
                label="Role"
                value={userForm.roleName}
                onChange={(v) => setUserForm((s) => ({ ...s, roleName: v }))}
                options={roles.map((r) => ({ value: r.name, label: cleanRole(r.name) }))}
              />
              <SelectField
                label="Department"
                value={userForm.department}
                onChange={(v) => setUserForm((s) => ({ ...s, department: v }))}
                options={departments.map((d) => ({ value: d, label: d }))}
              />
              <PasswordField
                label="Password"
                value={userForm.password}
                onChange={(v) => setUserForm((s) => ({ ...s, password: v }))}
                show={showPass}
                setShow={setShowPass}
              />
              <PasswordField
                label="Confirm Password"
                value={userForm.confirmPassword}
                onChange={(v) => setUserForm((s) => ({ ...s, confirmPassword: v }))}
                show={showCPass}
                setShow={setShowCPass}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAddUserOpen(false)} className="px-3 py-2 rounded border bg-white">
                Cancel
              </button>
              <button onClick={createUser} className="px-3 py-2 rounded bg-emerald-600 text-white">
                Create User
              </button>
            </div>
          </Modal>
        )}

        {/* Edit User Modal */}
        {editUserOpen && editUser && (
          <Modal title="Edit User" onClose={() => setEditUserOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                label="First name"
                value={editUser.firstname}
                onChange={(v) => setEditUser({ ...editUser, firstname: v })}
              />
              <TextField
                label="Last name"
                value={editUser.lastname}
                onChange={(v) => setEditUser({ ...editUser, lastname: v })}
              />
              <TextField
                label="Email"
                value={editUser.email}
                onChange={(v) => setEditUser({ ...editUser, email: v })}
              />
              <TextField
                label="Phone"
                value={editUser.phone}
                onChange={(v) => setEditUser({ ...editUser, phone: v })}
              />
              <SelectField
                label="Role"
                value={editUser.roleName}
                onChange={(v) => setEditUser({ ...editUser, roleName: v })}
                options={roles.map((r) => ({ value: r.name, label: cleanRole(r.name) }))}
              />
              <PasswordField
                label="New Password (optional)"
                value={editNewPassword}
                onChange={setEditNewPassword}
                show={false}
                setShow={() => {}}
                canToggle={false}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditUserOpen(false)} className="px-3 py-2 rounded border bg-white">
                Cancel
              </button>
              <button onClick={saveEditedUser} className="px-3 py-2 rounded bg-blue-600 text-white">
                Save Changes
              </button>
            </div>
          </Modal>
        )}

        {/* Add Role Modal (UI same feel as Add User) */}
        {addRoleOpen && (
          <Modal title="Add Role" onClose={() => setAddRoleOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                label='Role Name (e.g. ROLE_SALES)'
                value={roleForm.name}
                onChange={(v) => setRoleForm((s) => ({ ...s, name: v }))}
              />
              <TextField
                label="Description"
                value={roleForm.description}
                onChange={(v) => setRoleForm((s) => ({ ...s, description: v }))}
              />
              <div className="md:col-span-2">
                <div className="text-sm font-semibold mb-2">Permissions</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {permissionModules.map((mod) => (
                    <div key={mod.name} className="bg-white border rounded p-3">
                      <div className="text-sm font-bold text-gray-600 mb-2">{mod.name}</div>
                      <div className="space-y-2">
                        {mod.permissions.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center justify-between border rounded px-3 py-2"
                          >
                            <span>{p.label}</span>
                            <input
                              type="checkbox"
                              checked={!!rolePerms[p.id]}
                              onChange={(e) =>
                                setRolePerms((m) => ({ ...m, [p.id]: e.target.checked }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAddRoleOpen(false)} className="px-3 py-2 rounded border bg-white">
                Cancel
              </button>
              <button onClick={createRole} className="px-3 py-2 rounded bg-blue-600 text-white">
                Create Role
              </button>
            </div>
          </Modal>
        )}
      </div>
    </Dashboard>
  );
};

// =============== Small UI atoms ===============
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          ✕
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  </div>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}> = ({ label, value, onChange, type = "text" }) => (
  <label className="grid gap-1">
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2 bg-white"
    />
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <label className="grid gap-1">
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2 bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  canToggle?: boolean;
}> = ({ label, value, onChange, show, setShow, canToggle = true }) => (
  <label className="grid gap-1 relative">
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    <input
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2 pr-12"
    />
    {canToggle && (
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-[30px] text-blue-600 text-sm"
      >
        {show ? "Hide" : "Show"}
      </button>
    )}
  </label>
);

const UserActionsMenu: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({
  onEdit,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="w-8 h-8 grid place-items-center rounded hover:bg-gray-100"
        onClick={() => setOpen((s) => !s)}
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white border rounded shadow-md w-36 z-10">
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            <PencilSquareIcon className="w-4 h-4 text-blue-600" />
            Edit
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement;