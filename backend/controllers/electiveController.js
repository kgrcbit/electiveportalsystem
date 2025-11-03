const Elective = require("../models/Elective");

// Helper function to determine if semester is odd or even
const isOddSemester = (semester) => semester % 2 === 1;

// Add new elective
exports.addElective = async (req, res) => {
  try {
    const { name, code, electiveType, electiveNumber, semester } = req.body;
    const branch = req.userBranch; // From middleware (admin's branch)
    if (!branch) return res.status(400).json({ msg: "Branch is required" });

    // Check duplicate elective code
    const existing = await Elective.findOne({ code });
    if (existing)
      return res.status(400).json({ msg: "Elective code already exists" });

    if (!electiveType || !electiveNumber) {
      return res
        .status(400)
        .json({ msg: "electiveType and electiveNumber are required" });
    }

    const elective = new Elective({
      name,
      code,
      electiveType,
      electiveNumber,
      semester,
      branch,
    });
    await elective.save();

    res.status(201).json({ msg: "Elective added successfully", elective });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get all electives for admin's branch (optionally filter by semester)
exports.getElectives = async (req, res) => {
  try {
    const { semester } = req.query;
    const branch = req.userBranch; // From middleware

    let filter = { branch };
    if (semester) filter.semester = parseInt(semester);

    const electives = await Elective.find(filter).sort({
      semester: 1,
      name: 1,
    });
    res.json(electives);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update elective
exports.updateElective = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = req.userBranch; // From middleware

    // Ensure the elective belongs to the admin's branch
    const elective = await Elective.findOne({ _id: id, branch });
    if (!elective)
      return res
        .status(404)
        .json({ msg: "Elective not found or access denied" });

    const update = {};
    const allowed = [
      "name",
      "code",
      "electiveType",
      "electiveNumber",
      "semester",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const updated = await Elective.findByIdAndUpdate(id, update, { new: true });
    res.json({ msg: "Elective updated", updated });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete elective
exports.deleteElective = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = req.userBranch; // From middleware

    // Ensure the elective belongs to the admin's branch
    const elective = await Elective.findOne({ _id: id, branch });
    if (!elective)
      return res
        .status(404)
        .json({ msg: "Elective not found or access denied" });

    const deleted = await Elective.findByIdAndDelete(id);
    res.json({ msg: "Elective deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get electives for a specific student (filtered by semester and branch)
exports.getElectivesForStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const Student = require("../models/Student");

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    const electives = await Elective.find({
      semester: student.semester,
      branch: student.branch,
    }).sort({ name: 1 });

    res.json(electives);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
