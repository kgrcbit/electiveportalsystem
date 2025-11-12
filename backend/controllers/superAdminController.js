const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");

const sanitizeAdmin = (admin) => {
  const adminObject = admin.toObject();
  delete adminObject.password;
  return adminObject;
};

exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.json(admins.map(sanitizeAdmin));
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, username, password, branch, role = "admin" } = req.body;

    if (!name || !username || !password) {
      return res
        .status(400)
        .json({ msg: "Name, username and password are required" });
    }

    if (role === "admin" && !branch) {
      return res
        .status(400)
        .json({ msg: "Branch is required when creating an admin" });
    }

    const existing = await Admin.findOne({ username });
    if (existing) {
      return res.status(409).json({ msg: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name,
      username,
      password: hashedPassword,
      branch: role === "admin" ? branch : undefined,
      role,
    });

    res.status(201).json(sanitizeAdmin(admin));
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, branch, role } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    if (username && username !== admin.username) {
      const existing = await Admin.findOne({ username });
      if (existing) {
        return res.status(409).json({ msg: "Username already exists" });
      }
    }

    if (role === "admin" && !branch && !admin.branch) {
      return res
        .status(400)
        .json({ msg: "Branch is required for administrators" });
    }

    if (name) admin.name = name;
    if (username) admin.username = username;
    if (typeof role === "string") admin.role = role;
    if (admin.role === "admin") {
      if (branch) admin.branch = branch;
    } else {
      admin.branch = undefined;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      admin.password = hashedPassword;
    }

    await admin.save();

    res.json(sanitizeAdmin(admin));
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res
        .status(400)
        .json({ msg: "You cannot delete your own administrator account" });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    await admin.deleteOne();
    res.json({ msg: "Admin deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

