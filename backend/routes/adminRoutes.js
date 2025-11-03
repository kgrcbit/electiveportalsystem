const express = require("express");
const {
  uploadStudents,
  getStudents,
  getSemesters,
  getElectivesBySemester,
  getElectiveTypesBySemester,
  getElectivesByType,
  getSectionsBySemester,
  getFilteredRegistrations,
  uploadMiddleware,
} = require("../controllers/adminController");
const {
  protect,
  adminOnly,
  branchAccess,
} = require("../middleware/authMiddleware");
const router = express.Router();

// All admin routes require authentication, admin role, and branch access
router.use(protect);
router.use(adminOnly);
router.use(branchAccess);

// Test endpoint to verify upload functionality
router.post("/test-upload", uploadMiddleware, (req, res) => {
  res.json({
    msg: "Test upload successful",
    fileReceived: !!req.file,
    userBranch: req.userBranch,
  });
});

// Upload students from Excel
router.post("/upload-students", uploadMiddleware, uploadStudents);

// Get all students for admin's branch
router.get("/students", getStudents);

// Filtering endpoints
router.get("/semesters", getSemesters);
router.get("/electives/:semester", getElectivesBySemester);
router.get("/elective-types/:semester", getElectiveTypesBySemester);
// Aliases to avoid path mismatch issues
router.get("/electives/types/:semester", getElectiveTypesBySemester);
router.get("/elective-types", (req, res, next) => {
  // Map query ?semester= to params handler for compatibility
  if (req.query.semester) {
    req.params.semester = req.query.semester;
    return getElectiveTypesBySemester(req, res, next);
  }
  return res.status(400).json({ msg: "semester is required" });
});
router.get("/electives-by-type", getElectivesByType);
router.get("/sections/:semester", getSectionsBySemester);
router.get("/filtered-registrations", getFilteredRegistrations);

module.exports = router;
