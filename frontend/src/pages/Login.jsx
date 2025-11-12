import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import CollegeHeader from "../components/CollegeHeader";

export default function Login() {
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
      if (role === "admin") {
        navigate("/admin-dashboard");
      } else if (role === "super_admin") {
        navigate("/super-admin");
      } else {
        navigate("/student-dashboard");
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { rollNo, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem(
        "userInfo",
        JSON.stringify({
          name: res.data.name,
          rollNo: rollNo,
          id: res.data.id,
          semester: res.data.semester,
          branch: res.data.branch,
          section: res.data.section,
          username: res.data.username,
        })
      );

      // Redirect based on user role
      if (res.data.role === "admin") {
        navigate("/admin-dashboard");
      } else if (res.data.role === "super_admin") {
        navigate("/super-admin");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-classic flex flex-col">
      <CollegeHeader type="header" />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-classic p-10 w-full max-w-md border border-primary/10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary mb-2 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-primary-light">
              Sign in to access your dashboard
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error rounded-xl p-3 mb-6 shadow-classic">
              <p className="text-error text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-primary text-sm font-medium mb-2">
                Roll Number
              </label>
              <input
                type="text"
                placeholder="Enter your roll number"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full p-3 rounded-xl border border-primary/20 text-primary placeholder-primary-light focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover"
                required
              />
            </div>

            <div>
              <label className="block text-primary text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-primary/20 text-primary placeholder-primary-light focus:outline-none focus:ring-2 focus:ring-accent transition-shadow shadow-classic hover:shadow-hover"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark disabled:bg-primary-dark disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-shadow shadow-classic hover:shadow-hover text-lg tracking-wide"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
