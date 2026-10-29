require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const authenticate = require("./middleware/authenticate");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/api/auth/register", async (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    const place = body.place === undefined ? "" : body.place;

    if (
      !name ||
      name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 8 ||
      typeof place !== "string" ||
      place.trim().length > 100
    ) {
      return res.status(400).json({
        message:
          "A name (up to 100 characters), valid email, and password (at least 8 characters) are required; place must be 100 characters or fewer."
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, place: place.trim(), passwordHash });

    return res.status(201).json({
      message: "Registration successful.",
      user: { id: user.id, name: user.name, email: user.email, place: user.place }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    console.error("Registration failed:", error);
    return res.status(500).json({ message: "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const body = req.body || {};
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    return res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email, place: user.place }
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Login failed." });
  }
});

app.get("/api/users/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email place createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        place: user.place,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Profile lookup failed:", error);
    return res.status(500).json({ message: "Could not load profile." });
  }
});

app.get("/api/users", authenticate, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      return res.status(400).json({ message: "Page must be positive; limit must be between 1 and 100." });
    }

    const [users, total] = await Promise.all([
      User.find()
        .select("name place createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments()
    ]);

    return res.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        place: user.place,
        createdAt: user.createdAt
      })),
      pagination: { page, limit, total }
    });
  } catch (error) {
    console.error("User list failed:", error);
    return res.status(500).json({ message: "Could not load users." });
  }
});

app.patch("/api/users/profile", authenticate, async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};

    if (Object.hasOwn(body, "name")) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
        return res.status(400).json({ message: "Name must be between 1 and 100 characters." });
      }
      updates.name = body.name.trim();
    }
    if (Object.hasOwn(body, "place")) {
      if (typeof body.place !== "string" || body.place.trim().length > 100) {
        return res.status(400).json({ message: "Place must be 100 characters or fewer." });
      }
      updates.place = body.place.trim();
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide a name or place to update." });
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true
    }).select("name email place");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: "Profile updated.",
      user: { id: user.id, name: user.name, email: user.email, place: user.place }
    });
  } catch (error) {
    console.error("Profile update failed:", error);
    return res.status(500).json({ message: "Could not update profile." });
  }
});

app.delete("/api/users/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ message: "Account deleted." });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return res.status(500).json({ message: "Could not delete account." });
  }
});

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a secret of at least 32 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected successfully: ${mongoose.connection.name}`);
  app.listen(port, () => {
    console.log(`User API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Could not start the API:", error);
  process.exitCode = 1;
});
