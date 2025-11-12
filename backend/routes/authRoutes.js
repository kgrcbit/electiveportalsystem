const express = require("express");
const { login, changePassword } = require("../controllers/authController");
const { protect, requireRole } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/login", login);
router.put(
  "/change-password",
  protect,
  requireRole("admin", "super_admin"),
  changePassword
);

module.exports = router;
