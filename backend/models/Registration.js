const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    elective: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Elective",
      required: true,
    },
    semester: { type: Number, required: true },
    electiveType: { type: String, required: true, enum: ["professional", "open"] },
    electiveNumber: { type: Number, required: true },
  },
  { timestamps: true }
);

registrationSchema.index(
  { student: 1, semester: 1, electiveType: 1, electiveNumber: 1 },
  { unique: true }
); // one per group

module.exports = mongoose.model("Registration", registrationSchema);
