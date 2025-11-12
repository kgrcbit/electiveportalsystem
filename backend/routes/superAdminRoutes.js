const express = require("express");
const {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require("../controllers/superAdminController");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(superAdminOnly);

router.get("/admins", getAdmins);
router.post("/admins", createAdmin);
router.put("/admins/:id", updateAdmin);
router.delete("/admins/:id", deleteAdmin);

module.exports = router;

