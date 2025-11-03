const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    rollNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student"], default: "student" },
    branch: {
      type: String,
      required: true,
      enum: [
        "CSE",
        "IT",
        "EEE",
        "ECE",
        "Mechanical",
        "Civil",
        "Chemical",
        "Bio-Technology",
        "AIML",
        "CSE-AIML",
        "CET",
        "AIDS",
        "MECH",
        "civil",
        "automobile",
        "CSM",
        "bio tech",
      ],
    },
    selectedElectives: [
      {
        semester: { type: Number, required: true },
        electiveType: {
          type: String,
          required: true,
          enum: ["professional", "open"],
        },
        electiveNumber: { type: Number, required: true },
        elective: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Elective",
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
