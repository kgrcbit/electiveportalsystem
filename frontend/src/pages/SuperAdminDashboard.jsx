import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { superAdminAPI, authAPI } from "../services/api";
import { showToast } from "../components/Toast";
import ChangePasswordModal from "../components/ChangePasswordModal";
import CollegeHeader from "../components/CollegeHeader";

const BRANCHES = [
  "CSE",
  "IT",
  "EEE",
  "ECE",
  "MECH",
  "CIVIL",
  "CHEM",
  "BIO",
  "AIML",
  "CSM",
  "CET",
  "AIDS",
];

const EMPTY_FORM = {
  name: "",
  username: "",
  branch: "",
  role: "admin",
  password: "",
};

export default function SuperAdminDashboard() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalForm, setModalForm] = useState({ ...EMPTY_FORM });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const info = JSON.parse(localStorage.getItem("userInfo") || "{}");

    if (!token || role !== "super_admin") {
      navigate("/");
      return;
    }

    setUserInfo(info);
    fetchAdmins();
  }, [navigate]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getAdmins();
      setAdmins(response.data || []);
    } catch (err) {
      showToast.error(err.response?.data?.msg || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setModalForm({ ...EMPTY_FORM });
    setModalError("");
    setSelectedAdminId(null);
    setModalOpen(true);
  };

  const openEditModal = (admin) => {
    setModalMode("edit");
    setSelectedAdminId(admin._id);
    setModalForm({
      name: admin.name || "",
      username: admin.username || "",
      branch: admin.branch || "",
      role: admin.role || "admin",
      password: "",
    });
    setModalError("");
    setModalOpen(true);
  };

  const handleModalChange = (field, value) => {
    setModalForm((prev) => {
      if (field === "role" && value === "super_admin") {
        return { ...prev, role: value, branch: "" };
      }
      return { ...prev, [field]: value };
    });
    if (modalError) {
      setModalError("");
    }
  };

  const validateModalForm = () => {
    if (!modalForm.name.trim() || !modalForm.username.trim()) {
      setModalError("Name and username are required");
      return false;
    }
    if (modalForm.role === "admin" && !modalForm.branch) {
      setModalError("Please select a branch for admin users");
      return false;
    }
    if (modalMode === "create" && !modalForm.password) {
      setModalError("Please provide a temporary password");
      return false;
    }
    if (modalForm.password && modalForm.password.length < 6) {
      setModalError("Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const handleModalSubmit = async (event) => {
    event.preventDefault();
    if (!validateModalForm()) {
      return;
    }

    const payload = {
      name: modalForm.name.trim(),
      username: modalForm.username.trim(),
      role: modalForm.role,
    };

    if (modalForm.role === "admin") {
      payload.branch = modalForm.branch;
    }

    if (modalForm.password) {
      payload.password = modalForm.password;
    }

    try {
      setModalLoading(true);
      if (modalMode === "create") {
        await superAdminAPI.createAdmin(payload);
        showToast.success("Admin created successfully");
      } else if (selectedAdminId) {
        await superAdminAPI.updateAdmin(selectedAdminId, payload);
        showToast.success("Admin updated successfully");
      }
      setModalOpen(false);
      setModalForm({ ...EMPTY_FORM });
      await fetchAdmins();
    } catch (err) {
      setModalError(err.response?.data?.msg || "Unable to save administrator");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId, username) => {
    const confirmed = window.confirm(
      `Delete admin "${username}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await superAdminAPI.deleteAdmin(adminId);
      showToast.success("Admin removed successfully");
      await fetchAdmins();
    } catch (err) {
      showToast.error(err.response?.data?.msg || "Failed to delete admin");
    }
  };

  const handlePasswordChange = async ({ currentPassword, newPassword }) => {
    try {
      setPasswordLoading(true);
      setPasswordError("");
      await authAPI.changePassword({ currentPassword, newPassword });
      showToast.success("Password updated successfully");
      setPasswordModalOpen(false);
      return true;
    } catch (err) {
      setPasswordError(err.response?.data?.msg || "Failed to change password");
      return false;
    } finally {
      setPasswordLoading(false);
    }
  };

  const currentUserId = userInfo?.id;

  const renderAdminCard = (admin) => {
    const isSelf = currentUserId && admin._id === currentUserId;

    return (
    <div
      key={admin._id}
      className="group relative rounded-2xl border border-primary/10 bg-card p-6 shadow-classic transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
      onClick={() => openEditModal(admin)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            {admin.role === "super_admin" ? "Super Admin" : "Branch Admin"}
          </p>
          <h3 className="mt-1 text-2xl font-bold text-primary">{admin.name}</h3>
          <p className="text-sm text-primary-light">@{admin.username}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full bg-accent/10 p-2 text-accent transition hover:bg-accent hover:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            onClick={(event) => {
              event.stopPropagation();
              openEditModal(admin);
            }}
            title="Edit admin"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487c.495-.495 1.297-.495 1.792 0l.859.86c.495.494.495 1.296 0 1.791l-8.75 8.75-3.308.367.367-3.308 8.75-8.75z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v4.125A1.125 1.125 0 0 1 18.375 19.5H5.625A1.125 1.125 0 0 1 4.5 18.375V5.625A1.125 1.125 0 0 1 5.625 4.5h4.125"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`rounded-full p-2 focus:outline-none focus:ring-2 ${
              isSelf
                ? "cursor-not-allowed bg-primary/10 text-primary-light focus:ring-transparent"
                : "bg-error/10 text-error transition hover:bg-error hover:text-white focus:ring-error"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              if (!isSelf) {
                handleDeleteAdmin(admin._id, admin.username);
              }
            }}
            title={isSelf ? "You cannot delete your own account" : "Delete admin"}
            disabled={isSelf}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 7.5h12M9.75 7.5V5.25A1.125 1.125 0 0 1 10.875 4.125h2.25A1.125 1.125 0 0 1 14.25 5.25V7.5m4.5 0v12a1.125 1.125 0 0 1-1.125 1.125H6.375A1.125 1.125 0 0 1 5.25 19.5v-12"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 11.25v6M13.5 11.25v6" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-primary">
        <div className="rounded-xl bg-background/60 px-4 py-3 shadow-inner">
          <p className="text-xs font-semibold uppercase text-primary-light">
            Username
          </p>
          <p className="font-medium text-primary">{admin.username}</p>
        </div>
        <div className="rounded-xl bg-background/60 px-4 py-3 shadow-inner">
          <p className="text-xs font-semibold uppercase text-primary-light">
            Branch
          </p>
          <p className="font-medium text-primary">
            {admin.branch || "All branches"}
          </p>
        </div>
      </div>
    </div>
  );
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background font-classic">
      <nav className="bg-card shadow-classic border-b border-primary/10 p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <CollegeHeader type="logo" size="small" />
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">
                Super Admin Control Center
              </h1>
              {userInfo?.name ? (
                <p className="text-primary-light">
                  Welcome back, {userInfo.name}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="rounded-xl bg-primary px-4 py-2 font-semibold text-white shadow-classic transition hover:bg-primary-dark hover:shadow-hover"
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-error px-4 py-2 font-semibold text-white shadow-classic transition hover:bg-error/80 hover:shadow-hover"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6">
        <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-primary/10 bg-card p-6 shadow-classic">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-primary">Administrators</h2>
              <p className="text-primary-light">
                Manage branch admins from a single place.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 font-semibold text-white shadow-classic transition hover:bg-success/80 hover:shadow-hover"
            >
              <span className="text-lg leading-none">＋</span>
              Add Admin
            </button>
          </div>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-primary">
              <div className="flex items-center gap-3 text-lg font-semibold">
                <span className="h-3 w-3 animate-ping rounded-full bg-accent" />
                Loading administrators…
              </div>
            </div>
          ) : admins.filter((a) => a.role === "admin").length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-primary/20 bg-background/40 p-8 text-center">
              <p className="max-w-md text-primary-light">
                No branch admins found. Use the “Add Admin” button to create the
                first administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {admins
                .filter((admin) => admin.role === "admin")
                .map((admin) => renderAdminCard(admin))}
            </div>
          )}
        </section>
      </main>

      <AdminModal
        isOpen={modalOpen}
        mode={modalMode}
        form={modalForm}
        onClose={() => setModalOpen(false)}
        onChange={handleModalChange}
        onSubmit={handleModalSubmit}
        loading={modalLoading}
        error={modalError}
      />

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPasswordError("");
        }}
        onConfirm={handlePasswordChange}
        loading={passwordLoading}
        error={passwordError}
      />
    </div>
  );
}

function AdminModal({
  isOpen,
  mode,
  form,
  onClose,
  onChange,
  onSubmit,
  loading,
  error,
}) {
  if (!isOpen) {
    return null;
  }

  const isAdminRole = form.role === "admin";
  const modalTitle = mode === "edit" ? "Edit Admin" : "Add New Admin";
  const submitLabel = mode === "edit" ? "Save Changes" : "Create Admin";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-primary/10 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-primary">{modalTitle}</h3>
            <p className="text-sm text-primary-light">
              {mode === "edit"
                ? "Update admin details. Leave password blank to keep the current password."
                : "Create a branch admin account with a temporary password."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary/10 p-2 text-primary transition hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-semibold text-primary">
              Name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-primary/20 p-3 text-primary placeholder-primary-light shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary">
              Username
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-primary/20 p-3 text-primary placeholder-primary-light shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
              value={form.username}
              onChange={(event) => onChange("username", event.target.value)}
              placeholder="Choose a unique username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary">
              Role
            </label>
            <select
              value={form.role}
              onChange={(event) => onChange("role", event.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/20 p-3 text-primary shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
            >
              <option value="admin">Branch Admin</option>
            </select>
          </div>
          {isAdminRole ? (
            <div>
              <label className="block text-sm font-semibold text-primary">
                Branch
              </label>
              <select
                value={form.branch}
                onChange={(event) => onChange("branch", event.target.value)}
                className="mt-1 w-full rounded-xl border border-primary/20 p-3 text-primary shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
              >
                <option value="">Select branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-semibold text-primary">
              {mode === "edit" ? "Reset Password (optional)" : "Temporary Password"}
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-primary/20 p-3 text-primary placeholder-primary-light shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error ? (
            <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-primary/20 px-4 py-2 font-semibold text-primary transition hover:bg-background hover:shadow-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2 font-semibold text-white shadow-classic transition hover:bg-accent-dark hover:shadow-hover disabled:cursor-not-allowed disabled:bg-primary-dark"
              disabled={loading}
            >
              {loading ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

