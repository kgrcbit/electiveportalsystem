const Student = require("../models/Student");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { rollNo, username, password } = req.body;

    // Try student login by rollNo first
    let user = null;
    let role = null;

    if (rollNo) {
      user = await Student.findOne({ rollNo });
      role = user ? "student" : null;
    }

    // If not a student, try admin by username (or reuse rollNo as username for compatibility)
    if (!user) {
      const adminUserName = username || rollNo;
      if (adminUserName) {
        user = await Admin.findOne({ username: adminUserName });
        role = user ? user.role : null;
      }
    }

    if (!user || !role) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const tokenPayload = { id: user._id, role };
    if (role === "student") tokenPayload.branch = user.branch;
    if (role === "admin") tokenPayload.branch = user.branch;

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const response = {
      token,
      role,
      name: user.name,
      branch: user.branch,
      username: user.username,
      id: user._id,
    };
    if (role === "student") {
      response.semester = user.semester;
      response.branch = user.branch;
      response.section = user.section;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ msg: "Current password and new password are required" });
    }

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ msg: "New password must be different from current password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
