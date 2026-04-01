// =========================
// Express Middleware
// =========================

const crypto = require("crypto");
const { logHttp, logError } = require("./logger");
const { isIPAllowed } = require("./security");
const config = require("./config");

/**
 * Attach a unique request ID to each request for tracing.
 */
function requestIdMiddleware(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}

/**
 * Log HTTP requests with duration tracking.
 */
function httpLoggerMiddleware(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    logHttp({
      requestId: req.requestId,
      method: req.method,
      path: req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
}

/**
 * Simple in-memory rate limiter per IP.
 */
function createRateLimiter() {
  const hits = new Map();

  // Cleanup old entries periodically to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits) {
      if (now - record.windowStart > config.rateLimit.windowMs) {
        hits.delete(ip);
      }
    }
  }, config.rateLimit.windowMs).unref();

  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now - record.windowStart > config.rateLimit.windowMs) {
      record = { windowStart: now, count: 0 };
      hits.set(ip, record);
    }

    record.count++;

    if (record.count > config.rateLimit.maxRequests) {
      return res.status(429).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Rate limit exceeded" },
      });
    }
    next();
  };
}

/**
 * Request timeout middleware.
 */
function timeoutMiddleware(req, res, next) {
  req.setTimeout(config.requestTimeout, () => {
    if (!res.headersSent) {
      res.status(408).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Request timeout" },
      });
    }
  });
  next();
}

/**
 * IP restriction middleware (optional, for future Cloudflare use).
 */
function ipRestrictionMiddleware(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  if (!isIPAllowed(ip)) {
    return res.status(403).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32000, message: "Access denied" },
    });
  }
  next();
}

module.exports = {
  requestIdMiddleware,
  httpLoggerMiddleware,
  createRateLimiter,
  timeoutMiddleware,
  ipRestrictionMiddleware,
};
