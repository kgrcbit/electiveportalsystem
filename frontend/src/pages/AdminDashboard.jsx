import { useEffect, useState } from "react";
import { electiveAPI, registrationAPI, adminAPI } from "../services/api";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";
import toast from "react-hot-toast";
import CollegeHeader from "../components/CollegeHeader";

export default function AdminDashboard() {
  const [electives, setElectives] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("electives");

  // Add effect to handle tab changes
  useEffect(() => {
    if (activeTab === "electives") {
      fetchElectives();
    }
  }, [activeTab]);
  const [newElective, setNewElective] = useState({
    name: "",
    code: "",
    electiveType: "",
    electiveNumber: "",
    semester: "",
  });
  const [editingElective, setEditingElective] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    electiveType: "",
    electiveNumber: "",
    semester: "",
  });
  const [excelFile, setExcelFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Filtering state
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [electiveTypes, setElectiveTypes] = useState([]);
  const [selectedElectiveType, setSelectedElectiveType] = useState("");
  const [selectedElective, setSelectedElective] = useState("");
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);

  const deriveElectiveTypes = (list) => {
    const set = new Set(
      (list || []).map((e) => e.electiveType).filter(Boolean)
    );
    return Array.from(set).sort();
  };

  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const user = JSON.parse(localStorage.getItem("userInfo") || "{}");

    if (!token || role !== "admin") {
      navigate("/admin-login");
      return;
    }

    setUserInfo(user);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchElectives(),
        fetchRegistrations(),
        fetchSemesters(),
      ]);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/admin-login");
      } else {
        setError("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchElectives = async () => {
    try {
      const res = await electiveAPI.getAll();
      setElectives(res.data);
    } catch (err) {
      showToast.error("Failed to load electives");
    }
  };

  const fetchRegistrations = async () => {
    const res = await registrationAPI.getAll();
    setRegistrations(res.data);
  };

  const fetchSemesters = async () => {
    const res = await adminAPI.getSemesters();
    setSemesters(res.data);
  };

  const fetchElectivesBySemester = async (semester) => {
    if (!semester) return;
    const res = await adminAPI.getElectivesBySemester(semester);
    setElectives(res.data);
    // Fallback: derive types from electives if types not yet loaded
    if (!electiveTypes.length) {
      const types = deriveElectiveTypes(res.data);
      if (types.length) setElectiveTypes(types);
    }
  };

  const fetchElectiveTypesBySemester = async (semester) => {
    if (!semester) return;
    try {
      const res = await adminAPI.getElectiveTypesBySemester(semester);
      const types = res.data || [];
      if (types.length) {
        setElectiveTypes(types);
      } else if (electives.length) {
        // Fallback if API returns empty
        const derived = deriveElectiveTypes(electives);
        setElectiveTypes(derived);
      } else {
        setElectiveTypes([]);
      }
    } catch (err) {
      // Fallback to derive from current electives on error
      if (electives.length) {
        setElectiveTypes(deriveElectiveTypes(electives));
      } else {
        setElectiveTypes([]);
      }
    }
  };

  const fetchElectivesByType = async (type, semester) => {
    if (!type) return;
    try {
      const res = await adminAPI.getElectivesByType(type, semester);
      setElectives(res.data || []);
    } catch (err) {
      setElectives([]);
    }
  };

  const fetchSectionsBySemester = async (semester) => {
    if (!semester) return;
    const res = await adminAPI.getSectionsBySemester(semester);
    setSections(res.data);
  };

  const fetchFilteredRegistrations = async () => {
    const params = {};
    if (selectedSemester) params.semester = selectedSemester;
    if (selectedElectiveType) params.electiveType = selectedElectiveType;
    if (selectedElective) params.electiveId = selectedElective;
    if (selectedSection) params.section = selectedSection;

    const res = await adminAPI.getFilteredRegistrations(params);
    setFilteredRegistrations(res.data);
  };

  const handleAddElective = async (e) => {
    e.preventDefault();
    try {
      await electiveAPI.create(newElective);
      setNewElective({
        name: "",
        code: "",
        electiveType: "",
        electiveNumber: "",
        semester: "",
      });
      showToast.success("Elective added successfully!");
      fetchElectives();
    } catch (err) {
      showToast.error(err.response?.data?.msg || "Failed to add elective");
    }
  };

  const handleEditElective = (elective) => {
    setEditingElective(elective._id);
    setEditForm({
      name: elective.name,
      code: elective.code,
      electiveType: elective.electiveType || "",
      electiveNumber: String(elective.electiveNumber || ""),
      semester: elective.semester.toString(),
    });
  };

  const handleUpdateElective = async (e) => {
    e.preventDefault();
    try {
      await electiveAPI.update(editingElective, editForm);
      showToast.success("Elective updated successfully!");
      setEditingElective(null);
      fetchElectives();
    } catch (err) {
      showToast.error(err.response?.data?.msg || "Failed to update elective");
    }
  };

  const handleCancelEdit = () => {
    setEditingElective(null);
    setEditForm({ name: "", code: "", description: "", semester: "" });
  };

  const handleDeleteElective = async (id) => {
    if (window.confirm("Are you sure you want to delete this elective?")) {
      try {
        await electiveAPI.delete(id);
        showToast.success("Elective deleted successfully!");
        fetchElectives();
      } catch (err) {
        showToast.error(err.response?.data?.msg || "Failed to delete elective");
      }
    }
  };

  const handleDownloadPerElective = async (electiveId, electiveCode) => {
    try {
      console.log("Downloading report for elective:", electiveId, electiveCode);
      const res = await API.get(
        `/reports/per-elective?electiveId=${electiveId}`,
        { responseType: "blob" }
      );
      console.log("Download response received:", res.status);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${electiveCode}_enrollments.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      console.error("Error response:", err.response?.data);
      showToast.error(
        "Failed to download report: " + (err.response?.data?.msg || err.message)
      );
    }
  };

  const handleDownloadPerElectiveSection = async (
    electiveId,
    electiveCode,
    section
  ) => {
    try {
      console.log(
        "Downloading section report for elective:",
        electiveId,
        electiveCode,
        "section:",
        section
      );
      const res = await API.get(
        `/reports/per-elective-section?electiveId=${electiveId}&section=${section}`,
        { responseType: "blob" }
      );
      console.log("Download response received:", res.status);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${electiveCode}_Section${section}_enrollments.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      console.error("Error response:", err.response?.data);
      showToast.error(
        "Failed to download section report: " +
        (err.response?.data?.msg || err.message)
      );
    }
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      showToast.error("Please select an Excel file");
      return;
    }

    try {
      const loadingToast = showToast.loading("Uploading file...");
      setUploadLoading(true);
      console.log(
        "Uploading file:",
        excelFile.name,
        excelFile.type,
        excelFile.size
      );

      const formData = new FormData();
      formData.append("excelFile", excelFile);

      console.log("FormData created, sending request...");
      const res = await adminAPI.uploadStudents(formData);
      console.log("Upload response:", res.data);

      toast.dismiss(loadingToast);
      showToast.success(
        `Excel uploaded successfully! Created: ${res.data.results.created}, Updated: ${res.data.results.updated}`
      );
      setExcelFile(null);
    } catch (err) {
      console.error("Upload error:", err);
      console.error("Error response:", err.response?.data);
      showToast.error(err.response?.data?.msg || "Failed to upload Excel file");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setExcelFile(null);
      return;
    }
    const isMimeOk = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ].includes(file.type);
    const isExtOk = /\.(xlsx|xls)$/i.test(file.name || "");
    if (!(isMimeOk || isExtOk)) {
      showToast.error("Only .xlsx or .xls files are allowed");
      e.target.value = ""; // reset input
      setExcelFile(null);
      return;
    }
    setExcelFile(file);
  };

  // Filtering handlers
  const handleSemesterChange = async (semester) => {
    setSelectedSemester(semester);
    setSelectedElectiveType("");
    setSelectedElective("");
    setSelectedSection("");
    setElectives([]);
    setElectiveTypes([]);
    setSections([]);
    setFilteredRegistrations([]);

    if (semester) {
      await Promise.all([
        fetchElectiveTypesBySemester(semester),
        fetchElectivesBySemester(semester),
        fetchSectionsBySemester(semester),
      ]);
    }
  };

  const handleElectiveChange = (electiveId) => {
    setSelectedElective(electiveId);
  };

  const handleElectiveTypeChange = async (type) => {
    setSelectedElectiveType(type);
    setSelectedElective("");
    if (type) {
      await fetchElectivesByType(type, selectedSemester);
    } else if (selectedSemester) {
      await fetchElectivesBySemester(selectedSemester);
    }
  };

  const handleSectionChange = (section) => {
    setSelectedSection(section);
  };

  const handleApplyFilter = async () => {
    await fetchFilteredRegistrations();
  };

  const handleClearFilter = () => {
    setSelectedSemester("");
    setSelectedElectiveType("");
    setSelectedElective("");
    setSelectedSection("");
    setElectives([]);
    setElectiveTypes([]);
    setSections([]);
    setFilteredRegistrations([]);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-800 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-classic">
      {/* Header */}
      <nav className="bg-card shadow-classic border-b border-primary/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <CollegeHeader type="logo" size="small" />
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">
                Admin Dashboard
              </h1>
              {userInfo && (
                <p className="text-primary-light">Welcome, {userInfo.name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-error hover:bg-error/80 transition text-white rounded-xl shadow-classic hover:shadow-hover font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-card rounded-xl shadow-classic p-1 mb-8 border border-primary/10">
          <button
            onClick={() => {
              setActiveTab("electives");
            }}
            className={`px-6 py-3 rounded-xl font-semibold transition-shadow shadow-classic hover:shadow-hover text-primary-light ${activeTab === "electives"
              ? "bg-accent text-white shadow-hover"
              : "hover:bg-background text-primary"
              }`}
          >
            Manage Electives
          </button>
          <button
            onClick={() => {
              setActiveTab("students");
            }}
            className={`px-6 py-3 rounded-lg transition ${activeTab === "students"
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-50 text-gray-700"
              }`}
          >
            Upload Students
          </button>
          <button
            onClick={() => setActiveTab("registrations")}
            className={`px-6 py-3 rounded-lg transition ${activeTab === "registrations"
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-50 text-gray-700"
              }`}
          >
            View Registrations
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-6 py-3 rounded-lg transition ${activeTab === "reports"
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-50 text-gray-700"
              }`}
          >
            Download Reports
          </button>
        </div>

        {/* Students Upload Tab */}
        {activeTab === "students" && (
          <div className="bg-card rounded-2xl shadow-classic p-8 border border-primary/10 min-h-[500px] flex flex-col justify-start">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Upload Students</h2>
              <a
                href="/student_upload_sample.csv"
                download
                className="bg-accent hover:bg-accent-dark text-white font-semibold py-2 px-4 rounded-xl transition-shadow shadow-classic hover:shadow-hover"
              >
                Download Sample CSV
              </a>
            </div>

            <div className="bg-background rounded-xl p-6 mb-8 border border-primary/10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Excel Upload Instructions
              </h3>
              <div className="text-primary-light space-y-2">
                <p>
                  • Upload an Excel file (.xlsx) with the following columns:
                </p>
                <p>
                  • <strong>Name:</strong> Student's full name
                </p>
                <p>
                  • <strong>RollNo:</strong> Student's roll number
                </p>
                <p>
                  • <strong>Section:</strong> Student's section
                </p>
                <p>
                  • <strong>Password:</strong> Student's login password
                </p>
                <p>
                  • <strong>Semester:</strong> Student's current semester (1-8)
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Note: Students will be automatically assigned to your branch (
                  {userInfo?.branch})
                </p>
              </div>
            </div>

            <form onSubmit={handleExcelUpload} className="space-y-6">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Select Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="w-full p-3 rounded-xl border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={uploadLoading || !excelFile}
                  className="bg-success hover:bg-success/80 disabled:bg-primary-dark disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-shadow shadow-classic hover:shadow-hover"
                >
                  {uploadLoading ? "Uploading..." : "Upload Students"}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!excelFile) {
                      showToast.error("Please select a file first");
                      return;
                    }
                    try {
                      const loadingToast = showToast.loading(
                        "Testing file upload..."
                      );
                      const formData = new FormData();
                      formData.append("excelFile", excelFile);
                      const res = await adminAPI.testUpload(formData);
                      console.log("Test upload response:", res.data);
                      toast.dismiss(loadingToast);
                      showToast.success(`Test successful: ${res.data.msg}`);
                    } catch (err) {
                      console.error("Test upload error:", err);
                      showToast.error(
                        "Test upload failed: " +
                        (err.response?.data?.msg || err.message)
                      );
                    }
                  }}
                  disabled={!excelFile}
                  className="bg-accent hover:bg-accent-dark disabled:bg-primary-dark disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-shadow shadow-classic hover:shadow-hover"
                >
                  Test Upload
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Elective Management Tab */}
        {activeTab === "electives" && (
          <div className="bg-card rounded-2xl shadow-classic p-8 border border-primary/10 min-h-[500px] flex flex-col justify-start">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              Manage Electives
            </h2>

            {/* Add New Elective Form */}
            <div className="bg-background rounded-xl p-6 mb-8 border border-primary/10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Add New Elective
              </h3>
              <form
                onSubmit={handleAddElective}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <input
                  type="text"
                  placeholder="Elective Name"
                  value={newElective.name}
                  onChange={(e) =>
                    setNewElective({ ...newElective, name: e.target.value })
                  }
                  className="p-3 rounded-xl border border-primary/20 text-primary placeholder-primary-light focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover"
                  required
                />
                <input
                  type="text"
                  placeholder="Code (e.g., 22CSC01)"
                  value={newElective.code}
                  onChange={(e) =>
                    setNewElective({ ...newElective, code: e.target.value })
                  }
                  className="p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <select
                  value={newElective.electiveType}
                  onChange={(e) =>
                    setNewElective({
                      ...newElective,
                      electiveType: e.target.value,
                      electiveNumber: "",
                    })
                  }
                  className="p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Elective Type</option>
                  <option value="professional">Professional Elective</option>
                  <option value="open">Open Elective</option>
                </select>
                <select
                  value={newElective.electiveNumber}
                  onChange={(e) =>
                    setNewElective({
                      ...newElective,
                      electiveNumber: e.target.value,
                    })
                  }
                  className="p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!newElective.electiveType}
                  required
                >
                  <option value="">Select Elective Number</option>
                  {(newElective.electiveType === "professional"
                    ? [1, 2, 3, 4, 5, 6]
                    : [1, 2, 3]
                  ).map((n) => (
                    <option key={n} value={n}>{`${n}`}</option>
                  ))}
                </select>
                <select
                  value={newElective.semester}
                  onChange={(e) =>
                    setNewElective({ ...newElective, semester: e.target.value })
                  }
                  className="p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Semester</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-dark px-6 py-3 rounded-xl font-semibold transition-shadow shadow-classic hover:shadow-hover text-white col-span-full md:col-span-1"
                >
                  Add Elective
                </button>
              </form>
            </div>

            {/* Electives List */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Current Electives
              </h3>
              {electives.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No electives added yet
                </p>
              ) : (
                electives.map((elective) => (
                  <div
                    key={elective._id}
                    className="bg-background rounded-xl p-4 border border-primary/10 shadow-classic hover:shadow-hover transition"
                  >
                    {editingElective === elective._id ? (
                      // Edit Form
                      <form
                        onSubmit={handleUpdateElective}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <input
                            type="text"
                            placeholder="Elective Name"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            className="p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Code (e.g., CS501)"
                            value={editForm.code}
                            onChange={(e) =>
                              setEditForm({ ...editForm, code: e.target.value })
                            }
                            className="p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                          <select
                            value={editForm.electiveType}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                electiveType: e.target.value,
                                electiveNumber: "",
                              })
                            }
                            className="p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select Elective Type</option>
                            <option value="professional">
                              Professional Elective
                            </option>
                            <option value="open">Open Elective</option>
                          </select>
                          <select
                            value={editForm.electiveNumber}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                electiveNumber: e.target.value,
                              })
                            }
                            className="p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!editForm.electiveType}
                            required
                          >
                            <option value="">Select Elective Number</option>
                            {(editForm.electiveType === "professional"
                              ? [1, 2, 3, 4, 5, 6]
                              : [1, 2, 3]
                            ).map((n) => (
                              <option
                                key={n}
                                value={n}
                              >{`Elective ${n}`}</option>
                            ))}
                          </select>
                          <select
                            value={editForm.semester}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                semester: e.target.value,
                              })
                            }
                            className="p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select Semester</option>
                            <option value="2">Semester 2</option>
                            <option value="3">Semester 3</option>
                            <option value="4">Semester 4</option>
                            <option value="5">Semester 5</option>
                            <option value="6">Semester 6</option>
                            <option value="7">Semester 7</option>
                            <option value="8">Semester 8</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition text-white"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Display Mode
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">
                            {elective.name}
                          </h4>
                          <p className="text-blue-600">Code: {elective.code}</p>
                          <p className="text-gray-600">
                            Semester {elective.semester} •{" "}
                            {elective.semester % 2 === 1 ? "Odd" : "Even"}
                          </p>
                          <p className="text-gray-500 text-sm">
                            {elective.electiveType === "professional"
                              ? "Professional"
                              : "Open"}{" "}
                            • Elective {elective.electiveNumber}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditElective(elective)}
                            className="bg-accent hover:bg-accent-dark px-4 py-2 rounded-xl transition-shadow shadow-classic hover:shadow-hover text-white font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteElective(elective._id)}
                            className="bg-error hover:bg-error/80 px-4 py-2 rounded-xl transition-shadow shadow-classic hover:shadow-hover text-white font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Registrations Tab */}
        {activeTab === "registrations" && (
          <div className="bg-card rounded-2xl shadow-classic p-8 border border-primary/10 min-h-[500px] flex flex-col justify-start">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              Student Registrations
            </h2>

            {/* Filter Controls */}
            <div className="bg-background rounded-xl p-6 mb-8 border border-primary/10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Filter Registrations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Semester Filter */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Select Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => handleSemesterChange(e.target.value)}
                    className="w-full p-3 rounded-xl border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover"
                  >
                    <option value="">Choose Semester</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Elective Type Filter */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Select Elective Type
                  </label>
                  <select
                    value={selectedElectiveType}
                    onChange={(e) => handleElectiveTypeChange(e.target.value)}
                    disabled={!selectedSemester}
                    className="w-full p-3 rounded-xl border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover disabled:bg-background"
                  >
                    <option value="">All Types</option>
                    {electiveTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Elective Filter */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Select Elective
                  </label>
                  <select
                    value={selectedElective}
                    onChange={(e) => handleElectiveChange(e.target.value)}
                    disabled={!selectedSemester}
                    className="w-full p-3 rounded-xl border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover disabled:bg-background"
                  >
                    <option value="">Choose Elective</option>
                    {electives.map((elective) => (
                      <option key={elective._id} value={elective._id}>
                        {elective.name} ({elective.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Filter */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Select Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    disabled={!selectedSemester}
                    className="w-full p-3 rounded-xl border border-primary/20 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover disabled:bg-background"
                  >
                    <option value="">Choose Section</option>
                    {sections.map((section) => (
                      <option key={section} value={section}>
                        Section {section}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-2 items-end">
                  <button
                    onClick={handleApplyFilter}
                    disabled={!selectedSemester}
                    className="bg-accent hover:bg-accent-dark disabled:bg-primary-dark disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-shadow shadow-classic hover:shadow-hover"
                  >
                    Apply Filter
                  </button>
                  <button
                    onClick={handleClearFilter}
                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-xl transition-shadow shadow-classic hover:shadow-hover"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            {filteredRegistrations.length === 0 && !selectedSemester ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  Select a semester to view registrations
                </p>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No registrations found for the selected filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-4">
                  <p className="text-gray-600">
                    Showing {filteredRegistrations.length} registration(s)
                  </p>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-4 font-semibold text-gray-800">
                        Roll Number
                      </th>
                      <th className="pb-4 font-semibold text-gray-800">
                        Student Name
                      </th>
                      <th className="pb-4 font-semibold text-gray-800">
                        Semester
                      </th>
                      <th className="pb-4 font-semibold text-gray-800">
                        Section
                      </th>
                      <th className="pb-4 font-semibold text-gray-800">
                        Elective
                      </th>
                      <th className="pb-4 font-semibold text-gray-800">
                        Elective Code
                      </th>
                      <th className="pb-4 font-semibold text-gray-800">
                        Registered Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations
                      .sort((a, b) =>
                        a.student.rollNo.localeCompare(b.student.rollNo)
                      )
                      .map((reg) => (
                        <tr key={reg._id} className="border-b border-gray-100">
                          <td className="py-4 text-gray-700">
                            {reg.student.rollNo}
                          </td>
                          <td className="py-4 text-gray-700">
                            {reg.student.name}
                          </td>
                          <td className="py-4 text-gray-700">
                            {reg.student.semester}
                          </td>
                          <td className="py-4 text-gray-700">
                            {reg.student.section}
                          </td>
                          <td className="py-4 text-gray-700">
                            {reg.elective.name}
                          </td>
                          <td className="py-4 text-gray-700">
                            {reg.elective.code}
                          </td>
                          <td className="py-4 text-gray-700">
                            {new Date(reg.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="bg-card rounded-2xl shadow-classic p-8 border border-primary/10 min-h-[500px] flex flex-col justify-start">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              Download Reports
            </h2>

            <div className="bg-background rounded-xl p-6 border border-primary/10">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Elective-wise Reports
              </h3>
              <p className="text-gray-600 mb-6">
                Select a semester to view and download reports for electives in
                that semester.
              </p>

              {/* Semester Filter for Reports */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Select Semester for Reports
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  className="w-full md:w-64 p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Elective Type Filter for Reports */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Select Elective Type for Reports
                </label>
                <select
                  value={selectedElectiveType}
                  onChange={(e) => handleElectiveTypeChange(e.target.value)}
                  disabled={!selectedSemester}
                  className="w-full md:w-64 p-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {electiveTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedSemester ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    Select a semester to view electives for reporting
                  </p>
                </div>
              ) : electives.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    No electives available for Semester {selectedSemester}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {electives.map((elective) => {
                    const electiveRegistrations = registrations.filter(
                      (reg) => reg.elective._id === elective._id
                    );
                    const sections = [
                      ...new Set(
                        electiveRegistrations.map((reg) => reg.student.section)
                      ),
                    ].sort();

                    return (
                      <div
                        key={elective._id}
                        className="bg-card rounded-xl p-4 border border-primary/10 shadow-classic hover:shadow-hover transition"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800">
                              {elective.name}
                            </h4>
                            <p className="text-blue-600 text-sm">
                              Code: {elective.code}
                            </p>
                            <p className="text-gray-600 text-sm">
                              Semester {elective.semester} •{" "}
                              {electiveRegistrations.length} students enrolled
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleDownloadPerElective(
                                elective._id,
                                elective.code
                              )
                            }
                            className="bg-accent hover:bg-accent-dark px-4 py-2 rounded-xl text-sm font-semibold transition-shadow shadow-classic hover:shadow-hover text-white"
                            disabled={electiveRegistrations.length === 0}
                          >
                            Download All
                          </button>
                        </div>

                        {sections.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 mb-2">
                              Download by Section:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {sections.map((section) => {
                                const sectionRegistrations =
                                  electiveRegistrations.filter(
                                    (reg) => reg.student.section === section
                                  );
                                return (
                                  <button
                                    key={section}
                                    onClick={() =>
                                      handleDownloadPerElectiveSection(
                                        elective._id,
                                        elective.code,
                                        section
                                      )
                                    }
                                    className="bg-success hover:bg-success/80 px-3 py-1 rounded-xl text-xs font-medium transition-shadow shadow-classic hover:shadow-hover text-white"
                                    disabled={sectionRegistrations.length === 0}
                                  >
                                    Section {section} (
                                    {sectionRegistrations.length})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
