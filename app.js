const express = require("express");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();
require("./utils/cronJobs");
const cookieParser = require("cookie-parser");

const { testConnection } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const emailTestRoutes = require("./routes/emailTestRoutes");
const aiRoutes = require("./routes/aiRoutes");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
  }),
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/test-email", emailTestRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/resumes", resumeRoutes);

// ─── View Routes (Frontend Pages) ───────────────────────
app.get("/login", (req, res) => res.render("auth/login"));
app.get("/register", (req, res) => res.render("auth/register"));
app.get("/forgot-password", (req, res) => res.render("auth/forgot-password"));
app.get("/dashboard", (req, res) => res.render("dashboard"));
app.get("/applications", (req, res) => res.render("applications"));
app.get("/profile", (req, res) => res.render("profile"));
app.get("/ai", (req, res) => res.render("ai"));

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "🚀 Career Platform API is running" });
});

app.use((req, res) => {
  res.status(404).render("404");
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await testConnection();
});

module.exports = app;
