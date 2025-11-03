const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
    branch: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
