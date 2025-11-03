const Registration = require("../models/Registration");
const Elective = require("../models/Elective");
const Student = require("../models/Student");

// Student chooses elective
exports.registerElective = async (req, res) => {
    try {
        const { electiveId } = req.body;
        const studentId = req.user.id; // from JWT

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ msg: "Student not found" });

        const elective = await Elective.findById(electiveId);
        if (!elective) return res.status(404).json({ msg: "Elective not found" });

        // Check if elective matches student's semester and branch
        if (student.semester !== elective.semester || student.branch !== elective.branch) {
            return res.status(400).json({ msg: "Elective not valid for this student" });
        }

        // Prevent multiple registrations for the same (semester, type, number)
        const existing = await Registration.findOne({
            student: studentId,
            semester: student.semester,
            electiveType: elective.electiveType,
            electiveNumber: elective.electiveNumber
        });
        if (existing) {
            return res.status(400).json({ msg: "You have already registered for this elective slot" });
        }

        const newReg = new Registration({
            student: studentId,
            elective: electiveId,
            semester: student.semester,
            electiveType: elective.electiveType,
            electiveNumber: elective.electiveNumber
        });
        await newReg.save();

        // Optionally reflect in Student document for quick lookup
        try {
            await Student.updateOne(
                { _id: studentId },
                {
                    $pull: {
                        selectedElectives: {
                            semester: student.semester,
                            electiveType: elective.electiveType,
                            electiveNumber: elective.electiveNumber
                        }
                    }
                }
            );
            await Student.updateOne(
                { _id: studentId },
                {
                    $addToSet: {
                        selectedElectives: {
                            semester: student.semester,
                            electiveType: elective.electiveType,
                            electiveNumber: elective.electiveNumber,
                            elective: elective._id
                        }
                    }
                }
            );
        } catch {}

        res.status(201).json({ msg: "Elective registered successfully", newReg });
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// View student's registered elective
exports.getMyRegistration = async (req, res) => {
    try {
        const studentId = req.user.id;
        const regs = await Registration.find({ student: studentId }).populate("elective");
        if (!regs || regs.length === 0) return res.json({ msg: "No elective registered yet" });

        res.json(regs);
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// Admin: view all registrations for their branch
exports.getAllRegistrations = async (req, res) => {
    try {
        const branch = req.userBranch; // From middleware (admin's branch)

        // Get all students in admin's branch
        const students = await Student.find({ branch });
        const studentIds = students.map(student => student._id);

        // Get registrations for students in this branch, sorted by roll number
        const regs = await Registration.find({ student: { $in: studentIds } })
            .populate("student elective")
            .sort({ "student.rollNo": 1 });
        res.json(regs);
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};
