const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    place: { type: String, trim: true, maxlength: 100, default: "" },
    passwordHash: { type: String, required: true, select: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
