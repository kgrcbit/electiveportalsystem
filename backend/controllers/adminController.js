const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
const multer = require("multer");

// Configure multer for file upload
const storage = multer.memoryStorage();
const allowedMimes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isMimeOk = allowedMimes.includes(file.mimetype);
    const isExtOk = /\.(xlsx|xls)$/i.test(file.originalname || "");
    if (isMimeOk || isExtOk) return cb(null, true);
    const err = new Error("INVALID_FILE_TYPE");
    return cb(err);
  },
});

// Excel upload for student creation
exports.uploadStudents = async (req, res) => {
  try {
    console.log("Excel upload started");
    console.log("File received:", req.file ? "Yes" : "No");
    console.log("User branch:", req.userBranch);

    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    // Admin's branch from middleware
    const branch = req.userBranch;
    console.log("Processing for branch:", branch);
    if (!branch) {
      return res.status(400).json({ msg: "Branch is required" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log("Excel data rows:", data.length);
    console.log("First row sample:", data[0]);

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const row of data) {
      try {
        const { Name, RollNo, Section, Password, Semester } = row;

        console.log("Processing row:", {
          Name,
          RollNo,
          Section,
          Password: "***",
          Semester,
        });

        if (!Name || !RollNo || !Section || !Password || !Semester) {
          results.errors.push(
            `Row missing required fields: ${JSON.stringify(row)}`
          );
          continue;
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({ rollNo: RollNo });

        // Convert password to string to handle numeric passwords from Excel
        const passwordString = String(Password);

        if (existingStudent) {
          // Update existing student
          const hashedPassword = await bcrypt.hash(passwordString, 10);
          await Student.findByIdAndUpdate(existingStudent._id, {
            name: Name,
            section: Section,
            password: hashedPassword,
            branch: branch,
            semester: parseInt(Semester),
          });
          results.updated++;
          console.log("Updated student:", RollNo);
        } else {
          // Create new student
          const hashedPassword = await bcrypt.hash(passwordString, 10);
          const newStudent = new Student({
            rollNo: RollNo,
            name: Name,
            section: Section,
            password: hashedPassword,
            branch: branch,
            semester: parseInt(Semester),
          });
          await newStudent.save();
          results.created++;
          console.log("Created student:", RollNo);
        }
      } catch (error) {
        console.error("Error processing row:", error);
        results.errors.push(
          `Error processing row ${JSON.stringify(row)}: ${error.message}`
        );
      }
    }

    console.log("Upload results:", results);
    res.json({
      msg: "Student upload completed",
      results,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get all students for admin's branch
exports.getStudents = async (req, res) => {
  try {
    const branch = req.userBranch; // From middleware
    const students = await Student.find({ branch })
      .select("-password")
      .sort({ rollNo: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get available semesters for filtering
exports.getSemesters = async (req, res) => {
  try {
    const branch = req.userBranch;
    const semesters = await Student.distinct("semester", { branch });
    res.json(semesters.sort());
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get electives for a specific semester
exports.getElectivesBySemester = async (req, res) => {
  try {
    const { semester } = req.params;
    const branch = req.userBranch;

    const electives = await require("../models/Elective")
      .find({
        branch,
        semester: parseInt(semester),
      })
      .sort({ name: 1 });

    res.json(electives);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get sections for a specific semester
exports.getSectionsBySemester = async (req, res) => {
  try {
    const { semester } = req.params;
    const branch = req.userBranch;

    const sectionFilter = { semester: parseInt(semester), branch };
    const sections = await Student.distinct("section", sectionFilter);

    res.json(sections.sort());
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get filtered registrations
exports.getFilteredRegistrations = async (req, res) => {
  try {
    const { semester, electiveId, electiveType, section } = req.query;
    const branch = req.userBranch;

    // Build filter for students
    const studentFilter = { branch };
    if (semester) studentFilter.semester = parseInt(semester);
    if (section) studentFilter.section = section;

    // Get students matching the filter
    const students = await Student.find(studentFilter).select("_id");
    const studentIds = students.map((student) => student._id);

    // Build registration filter
    const registrationFilter = { student: { $in: studentIds } };
    if (electiveId) {
      registrationFilter.elective = electiveId;
    } else if (electiveType) {
      const Elective = require("../models/Elective");
      const electiveQuery = { branch, electiveType };
      if (semester) electiveQuery.semester = parseInt(semester);
      const electives = await Elective.find(electiveQuery).select("_id");
      const electiveIds = electives.map((e) => e._id);
      // If no electives for this type, result should be empty set
      registrationFilter.elective = {
        $in: electiveIds.length ? electiveIds : [null],
      };
    }

    // Get registrations with populated data
    const registrations = await require("../models/Registration")
      .find(registrationFilter)
      .populate("student", "name rollNo section semester")
      .populate("elective", "name code electiveType electiveNumber")
      .sort({ "student.rollNo": 1 });

    res.json(registrations);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get elective types for a specific semester
exports.getElectiveTypesBySemester = async (req, res) => {
  try {
    const { semester } = req.params;
    const branch = req.userBranch;

    const Elective = require("../models/Elective");
    const filter = { branch };
    if (semester) filter.semester = parseInt(semester);

    const types = await Elective.distinct("electiveType", filter);
    res.json(types.sort());
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get electives filtered by type (and optional semester)
exports.getElectivesByType = async (req, res) => {
  try {
    const { type, semester } = req.query;
    const branch = req.userBranch;

    if (!type) {
      return res.status(400).json({ msg: "'type' is required" });
    }

    const Elective = require("../models/Elective");
    const filter = { branch, electiveType: type };
    if (semester) filter.semester = parseInt(semester);

    const electives = await Elective.find(filter).sort({ name: 1 });
    res.json(electives);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Export upload middleware
exports.uploadMiddleware = (req, res, next) => {
  upload.single("excelFile")(req, res, (err) => {
    if (err) {
      if (err.message === "INVALID_FILE_TYPE") {
        return res
          .status(400)
          .json({ msg: "Only .xlsx or .xls files are allowed" });
      }
      return res.status(400).json({ msg: err.message || "File upload error" });
    }
    next();
  });
};
