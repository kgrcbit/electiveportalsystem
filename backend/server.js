const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const Admin = require("./models/Admin");
const bcrypt = require("bcrypt");
const Student = require("./models/Student");

async function createAdmins() {
  const branches = [
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

  for (const branch of branches) {
    const username = `admin${branch.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const existing = await Admin.findOne({ username });
    if (!existing) {
      const hashed = await bcrypt.hash("admin123", 10);
      const admin = new Admin({
        name: `${branch} Admin`,
        username,
        password: hashed,
        branch,
      });
      await admin.save();
      console.log(`✅ ${branch} admin created: ${username} / admin123`);
    }
  }
}

async function ensureSuperAdmin() {
  const username = process.env.SUPER_ADMIN_USERNAME || "superadmin";
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
  const password = process.env.SUPER_ADMIN_PASSWORD || "superadmin123";

  let admin = await Admin.findOne({ username });
  if (!admin) {
    const hashed = await bcrypt.hash(password, 10);
    admin = new Admin({
      name,
      username,
      password: hashed,
      role: "super_admin",
    });
    await admin.save();
    console.log(`✅ Super admin created: ${username}`);
    return;
  }

  if (admin.role !== "super_admin") {
    admin.role = "super_admin";
    admin.branch = undefined;
    await admin.save();
    console.log(`⚠️ Updated ${username} to super admin role`);
  }
}

// createAdmins will be invoked after DB connects

// Routes
const authRoutes = require("./routes/authRoutes");
const electiveRoutes = require("./routes/electiveRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Elective Subject Registration System API",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      electives: "/api/electives",
      registrations: "/api/registrations",
      reports: "/api/reports",
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/electives", electiveRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);

// MongoDB connect
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("✅ MongoDB Connected");
      // Seed per-branch admins
      await createAdmins();
      await ensureSuperAdmin();
    })
    .catch((err) => {
      console.error("❌ DB Error:", err);
      console.log("⚠️ Continuing without MongoDB for testing...");
    });
} else {
  console.log("⚠️ No MONGO_URI found, continuing without MongoDB...");
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
