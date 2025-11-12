const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, branch }
        next();
    } catch (err) {
        res.status(401).json({ msg: "Invalid token" });
    }
};

exports.requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res
            .status(403)
            .json({ msg: `Access denied: Requires role ${roles.join(", ")}` });
    }
    next();
};

exports.adminOnly = exports.requireRole("admin");
exports.superAdminOnly = exports.requireRole("super_admin");

exports.branchAccess = (req, res, next) => {
    // For admin users, branch is carried in token
    if (req.user.role === "admin") {
        req.userBranch = req.user.branch;
        return next();
    }
    if (req.user.role === "super_admin") {
        return next();
    }
    // For student users, get their branch from the database
    if (req.user.role === "student") {
        const Student = require("../models/Student");
        Student.findById(req.user.id)
            .then(user => {
                if (!user) return res.status(404).json({ msg: "User not found" });
                req.userBranch = user.branch;
                next();
            })
            .catch(err => res.status(500).json({ msg: "Server error", error: err.message }));
        return;
    }
    next();
};
