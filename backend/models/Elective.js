const mongoose = require("mongoose");

const electiveSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    electiveType: { type: String, required: true, enum: ["professional", "open"] },
    electiveNumber: { type: Number, required: true }, // professional: 1-6, open: 1-3
    semester: { type: Number, required: true },
    branch: { type: String, required: true, enum: ["CSE", "IT", "EEE", "ECE", "Mechanical", "Civil", "Chemical", "Bio-Technology", "AIML", "CSE-AIML", "CET", "AIDS", "MECH", "civil", "automobile", "CSM", "bio tech"] }
}, { timestamps: true });

// Validate electiveNumber range based on electiveType
electiveSchema.pre("validate", function (next) {
    if (this.electiveType === "professional") {
        if (this.electiveNumber < 1 || this.electiveNumber > 6) {
            return next(new Error("Professional electives must have electiveNumber between 1 and 6"));
        }
    }
    if (this.electiveType === "open") {
        if (this.electiveNumber < 1 || this.electiveNumber > 3) {
            return next(new Error("Open electives must have electiveNumber between 1 and 3"));
        }
    }
    next();
});

module.exports = mongoose.model("Elective", electiveSchema);
