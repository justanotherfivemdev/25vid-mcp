// =========================
// Dashboard API Routes
// =========================
// Provides REST endpoints for monitoring, activity, and system health.

const express = require("express");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const config = require("../config");
const { getRecentLogs, getRecentActivity } = require("../logger");

const router = express.Router();

// Serve dashboard UI static files
router.use("/dashboard", express.static(path.join(__dirname, "../../public")));

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Extended system health metrics
router.get("/api/system/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
    },
    os: {
      loadAvg: os.loadavg(),
      freeMem: os.freemem(),
      totalMem: os.totalmem(),
    },
    nodeVersion: process.version,
  });
});

// System info (legacy compatibility)
router.get("/api/system", (req, res) => {
  res.json({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// MCP logs (last 100 entries, structured)
router.get("/api/mcp/logs", async (req, res) => {
  const logs = await getRecentLogs(100);
  res.json({ logs });
});

// MCP activity (recent tool calls)
router.get("/api/mcp/activity", async (req, res) => {
  const activity = await getRecentActivity(50);
  res.json({ activity });
});

// Deploy logs
router.get("/api/deploy/logs", async (req, res) => {
  try {
    const data = await fs.promises.readFile(config.deployLog, "utf-8");
    const lines = data.split("\n").filter(Boolean).slice(-100);
    res.json({ logs: lines });
  } catch {
    res.json({ logs: [] });
  }
});

// Deploy status (last deploy summary)
router.get("/api/deploy/status", async (req, res) => {
  try {
    const data = await fs.promises.readFile(config.deployLog, "utf-8");
    const lines = data.split("\n").filter(Boolean);
    const last = lines.slice(-5);
    res.json({
      hasLogs: true,
      totalEntries: lines.length,
      recentEntries: last,
    });
  } catch {
    res.json({
      hasLogs: false,
      totalEntries: 0,
      recentEntries: [],
    });
  }
});

// Debug analysis (AI error detection)
router.get("/api/debug/analysis", (req, res) => {
  const { analyzeErrors } = require("../debug/analyzer");
  const report = analyzeErrors({ maxLines: 500 });
  res.json(report);
});

// Git status (parsed)
router.get("/api/git/status", (req, res) => {
  execFile("git", ["status", "--porcelain"], { cwd: config.workspace, timeout: 10000 }, (err, stdout) => {
    if (err) {
      return res.json({ error: "Git not available or not a git repo" });
    }

    const changes = stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => ({
        status: line.substring(0, 2).trim(),
        file: line.substring(3),
      }));

    execFile("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: config.workspace, timeout: 5000 }, (branchErr, branchOut) => {
      res.json({
        branch: branchErr ? "unknown" : branchOut.trim(),
        clean: changes.length === 0,
        changes,
      });
    });
  });
});

module.exports = router;
