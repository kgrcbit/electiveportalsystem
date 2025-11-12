import { useEffect, useState } from "react";
import { electiveAPI, registrationAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";
import CollegeHeader from "../components/CollegeHeader";

export default function StudentDashboard() {
  const [electives, setElectives] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const user = JSON.parse(localStorage.getItem("userInfo") || "{}");

    if (!token || role !== "student") {
      navigate("/login");
      return;
    }

    setUserInfo(user);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [myRegRes, electivesRes] = await Promise.all([
        registrationAPI.getMy(),
        electiveAPI.getMy(),
      ]);
      const regs = Array.isArray(myRegRes.data)
        ? myRegRes.data
        : myRegRes.data && myRegRes.data.elective
          ? [myRegRes.data]
          : [];
      setMyRegistrations(regs);
      setElectives(Array.isArray(electivesRes.data) ? electivesRes.data : []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      } else {
        showToast.error("Failed to load electives");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id) => {
    try {
      await registrationAPI.register({ electiveId: id });
      showToast.success("Elective registered successfully!");
      fetchData(); // Refresh data instead of full page reload
    } catch (err) {
      showToast.error(err.response?.data?.msg || "Error registering elective");
    }
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

  // Build maps to enforce one per (type + number)
  const registeredByGroup = (
    Array.isArray(myRegistrations) ? myRegistrations : []
  ).reduce((acc, reg) => {
    if (!reg || !reg.electiveType || reg.electiveNumber == null) return acc;
    const key = `${reg.electiveType}:${Number(reg.electiveNumber)}`;
    acc[key] = reg;
    return acc;
  }, {});

  const grouped = (Array.isArray(electives) ? electives : []).reduce(
    (acc, e) => {
      if (!e || !e.electiveType || e.electiveNumber == null) return acc;
      const type = e.electiveType === "professional" ? "professional" : "open";
      const num = Number(e.electiveNumber);
      if (!acc[type][num]) acc[type][num] = [];
      acc[type][num].push(e);
      return acc;
    },
    { professional: {}, open: {} }
  );

  const sortedNumbers = (obj) =>
    Object.keys(obj)
      .map(Number)
      .sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-background font-classic">
      {/* Header */}
      <nav className="bg-card shadow-classic border-b border-primary/10 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <CollegeHeader type="logo" size="small" />
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">
                Student Dashboard
              </h1>
              {userInfo && (
                <>
                  <p className="text-primary-light">Welcome, {userInfo.name}</p>
                  <p className="text-accent">
                    (Semester {userInfo.semester}, {userInfo.branch} -{" "}
                    {userInfo.section})
                  </p>
                </>
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

      <div className="max-w-4xl mx-auto p-6">
        {myRegistrations && myRegistrations.length > 0 && (
          <div className="bg-card rounded-2xl shadow-classic p-8 border border-primary/10 mb-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">
                Your Current Selections
              </h2>
              <div className="grid gap-4">
                {(Array.isArray(myRegistrations) ? myRegistrations : [])
                  .sort((a, b) => {
                    const tA = a?.electiveType === "professional" ? 0 : 1;
                    const tB = b?.electiveType === "professional" ? 0 : 1;
                    return (
                      tA - tB ||
                      Number(a?.electiveNumber) - Number(b?.electiveNumber)
                    );
                  })
                  .map((reg) => (
                    <div
                      key={reg._id}
                      className="bg-background rounded-xl p-6 border border-primary/10 text-left"
                    >
                      <h3 className="text-2xl font-semibold mb-2 text-primary">
                        {reg.elective?.name}
                      </h3>
                      <p className="text-accent text-lg mb-2">
                        Code: {reg.elective?.code}
                      </p>
                      <p className="text-primary-light">
                        {reg?.electiveType === "professional"
                          ? "Professional"
                          : "Open"}{" "}
                        • Elective {Number(reg?.electiveNumber)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Available Electives
            </h2>
            <p className="text-gray-600 text-lg">
              Choose one from each category
            </p>
          </div>

          {electives.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-classic p-8 text-center border border-primary/10">
              <h3 className="text-2xl font-bold mb-4 text-primary">
                No Electives Available
              </h3>
              <p className="text-primary-light">
                There are currently no electives available for your semester and
                branch. Please contact your administrator for more information.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {["professional", "open"].map((type) => (
                <div key={type}>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">
                    {type === "professional"
                      ? "Professional Electives"
                      : "Open Electives"}
                  </h3>
                  {Object.keys(grouped[type]).length === 0 ? (
                    <p className="text-primary-light">No {type} electives.</p>
                  ) : (
                    sortedNumbers(grouped[type]).map((num) => {
                      const group = grouped[type][num] || [];
                      const key = `${type}:${num}`;
                      const alreadyChosen = Boolean(registeredByGroup[key]);
                      const chosenElectiveId =
                        registeredByGroup[key]?.elective?._id;
                      return (
                        <div key={key} className="mb-6">
                          <h4 className="text-lg font-semibold mb-3 text-primary">
                            {type === "professional" ? "Professional" : "Open"}{" "}
                            • Elective {num}
                          </h4>
                          <div className="grid gap-4">
                            {(Array.isArray(group) ? group : []).map(
                              (elective) => {
                                const isSelectedInGroup =
                                  chosenElectiveId === elective?._id;
                                return (
                                  <div
                                    key={elective._id}
                                    className="bg-card rounded-2xl shadow-classic p-6 hover:shadow-hover transition border border-primary/10"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <h5 className="text-lg font-semibold text-primary mb-1">
                                          {elective?.name}
                                        </h5>
                                        <p className="text-accent text-sm mb-1">
                                          Code: {elective?.code}
                                        </p>
                                        <p className="text-primary-light text-sm">
                                          Semester {elective?.semester}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {alreadyChosen && isSelectedInGroup && (
                                          <span className="px-3 py-1 rounded-full text-xs bg-success text-white">
                                            Selected
                                          </span>
                                        )}
                                        <button
                                          onClick={() =>
                                            handleSelect(elective?._id)
                                          }
                                          disabled={alreadyChosen}
                                          className={`px-4 py-2 rounded-xl font-semibold transition-shadow shadow-classic hover:shadow-hover text-white ${alreadyChosen
                                              ? "bg-primary-dark cursor-not-allowed"
                                              : "bg-accent hover:bg-accent-dark"
                                            }`}
                                        >
                                          {alreadyChosen
                                            ? "Selection Locked"
                                            : "Select This Elective"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
