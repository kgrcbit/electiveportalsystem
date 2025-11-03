const ExcelJS = require("exceljs");
const Registration = require("../models/Registration");
const Elective = require("../models/Elective");

// Export one file per elective
exports.exportPerElective = async (req, res) => {
    try {
        console.log("Export per elective called with query:", req.query);
        const { electiveId } = req.query;

        if (!electiveId) {
            console.log("No elective ID provided");
            return res.status(400).json({ msg: "Elective ID is required" });
        }

        console.log("Looking for elective with ID:", electiveId);
        const elective = await Elective.findById(electiveId);
        if (!elective) {
            console.log("Elective not found");
            return res.status(404).json({ msg: "Elective not found" });
        }

        console.log("Found elective:", elective.name);

        // Ensure the elective belongs to the admin's branch (if admin is branch-scoped)
        if (req.user.role === "student" && elective.branch !== req.userBranch) {
            console.log("Elective does not belong to admin's branch");
            return res.status(403).json({ msg: "Access denied: Elective not in your branch" });
        }

        const regs = await Registration.find({ elective: electiveId }).populate("student");
        console.log("Found registrations:", regs.length);

        // Sort registrations by roll number
        regs.sort((a, b) => a.student.rollNo.localeCompare(b.student.rollNo));

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(elective.name);

        sheet.columns = [
            { header: "Roll No", key: "rollNo", width: 15 },
            { header: "Name", key: "name", width: 25 },
            { header: "Semester", key: "semester", width: 10 },
            { header: "Section", key: "section", width: 10 },
        ];

        regs.forEach(r => {
            sheet.addRow({
                rollNo: r.student.rollNo,
                name: r.student.name,
                semester: r.student.semester,
                section: r.student.section
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Disposition", `attachment; filename=${elective.code}_enrollments.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    } catch (err) {
        res.status(500).json({ msg: "Error generating report", error: err.message });
    }
};

// Export one file per elective and section
exports.exportPerElectiveSection = async (req, res) => {
    try {
        console.log("Export per elective section called with query:", req.query);
        const { electiveId, section } = req.query;

        if (!electiveId || !section) {
            console.log("Missing required parameters");
            return res.status(400).json({ msg: "Elective ID and Section are required" });
        }

        console.log("Looking for elective with ID:", electiveId, "and section:", section);
        const elective = await Elective.findById(electiveId);
        if (!elective) {
            console.log("Elective not found");
            return res.status(404).json({ msg: "Elective not found" });
        }

        console.log("Found elective:", elective.name);

        // Ensure the elective belongs to the admin's branch (if admin is branch-scoped)
        if (req.user.role === "student" && elective.branch !== req.userBranch) {
            console.log("Elective does not belong to admin's branch");
            return res.status(403).json({ msg: "Access denied: Elective not in your branch" });
        }

        // Get registrations for the elective and filter by section
        const regs = await Registration.find({ elective: electiveId })
            .populate({
                path: "student",
                match: { section: section }
            })
            .then(registrations => registrations.filter(reg => reg.student !== null));

        console.log("Found registrations for section:", regs.length);

        // Sort registrations by roll number
        regs.sort((a, b) => a.student.rollNo.localeCompare(b.student.rollNo));

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`${elective.name} - Section ${section}`);

        sheet.columns = [
            { header: "Roll No", key: "rollNo", width: 15 },
            { header: "Name", key: "name", width: 25 },
            { header: "Semester", key: "semester", width: 10 },
            { header: "Section", key: "section", width: 10 },
        ];

        regs.forEach(r => {
            sheet.addRow({
                rollNo: r.student.rollNo,
                name: r.student.name,
                semester: r.student.semester,
                section: r.student.section
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Disposition", `attachment; filename=${elective.code}_Section${section}_enrollments.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    } catch (err) {
        res.status(500).json({ msg: "Error generating report", error: err.message });
    }
};

// Export one Excel file with multiple sheets
exports.exportMultiSheet = async (req, res) => {
    try {
        const electives = await Elective.find().sort({ semester: 1, name: 1 });
        const workbook = new ExcelJS.Workbook();

        // Add summary sheet
        const summarySheet = workbook.addWorksheet("Summary");
        summarySheet.columns = [
            { header: "Elective Code", key: "code", width: 15 },
            { header: "Elective Name", key: "name", width: 30 },
            { header: "Semester", key: "semester", width: 10 },
            { header: "Type", key: "type", width: 10 },
            { header: "Enrollments", key: "enrollments", width: 12 },
        ];

        for (let elective of electives) {
            const regs = await Registration.find({ elective: elective._id }).populate("student");

            // Sort registrations by roll number
            regs.sort((a, b) => a.student.rollNo.localeCompare(b.student.rollNo));

            const sheet = workbook.addWorksheet(`${elective.code}`);

            sheet.columns = [
                { header: "Roll No", key: "rollNo", width: 15 },
                { header: "Name", key: "name", width: 25 },
                { header: "Semester", key: "semester", width: 10 },
                { header: "Odd/Even", key: "oddEven", width: 10 },
            ];

            regs.forEach(r => {
                const oddEven = (r.student.semester % 2 === 1) ? "odd" : "even";
                sheet.addRow({
                    rollNo: r.student.rollNo,
                    name: r.student.name,
                    semester: r.student.semester,
                    oddEven
                });
            });

            // Add to summary
            summarySheet.addRow({
                code: elective.code,
                name: elective.name,
                semester: elective.semester,
                type: elective.oddEven,
                enrollments: regs.length
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Disposition", "attachment; filename=all_electives_report.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    } catch (err) {
        res.status(500).json({ msg: "Error generating report", error: err.message });
    }
};
