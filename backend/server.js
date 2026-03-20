const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(__dirname, "visitor-pins.json");
const MAX_PINS = 400;
const SAME_AREA_THRESHOLD = 0.35;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...headers
  });
  res.end(body);
}

async function readPins() {
  try {
    const raw = await fsp.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writePins(pins) {
  await fsp.writeFile(DATA_FILE, JSON.stringify(pins.slice(-MAX_PINS), null, 2) + "\n", "utf8");
}

function isValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePin(pin) {
  if (!pin || !isValidNumber(pin.lat) || !isValidNumber(pin.lng)) return null;

  return {
    lat: Number(pin.lat),
    lng: Number(pin.lng),
    city: typeof pin.city === "string" ? pin.city : "",
    region: typeof pin.region === "string" ? pin.region : "",
    country: typeof pin.country === "string" ? pin.country : "",
    recordedAt: typeof pin.recordedAt === "string" && pin.recordedAt ? pin.recordedAt : new Date().toISOString()
  };
}

function isSameArea(a, b) {
  return Math.abs(a.lat - b.lat) < SAME_AREA_THRESHOLD && Math.abs(a.lng - b.lng) < SAME_AREA_THRESHOLD;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 50_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function handlePinsApi(req, res) {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (req.method === "GET") {
    const pins = await readPins();
    send(res, 200, JSON.stringify({ pins }), { "Content-Type": MIME[".json"] });
    return;
  }

  if (req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const pin = normalizePin(body.pin);
      if (!pin) {
        send(res, 400, JSON.stringify({ error: "Invalid pin payload" }), { "Content-Type": MIME[".json"] });
        return;
      }

      const pins = await readPins();
      if (!pins.some((existing) => isSameArea(existing, pin))) {
        pins.push(pin);
        await writePins(pins);
      }

      const freshPins = await readPins();
      send(res, 200, JSON.stringify({ pins: freshPins, current: pin }), { "Content-Type": MIME[".json"] });
    } catch (err) {
      send(res, 400, JSON.stringify({ error: err.message || "Bad request" }), { "Content-Type": MIME[".json"] });
    }
    return;
  }

  send(res, 405, JSON.stringify({ error: "Method not allowed" }), { "Content-Type": MIME[".json"] });
}

function safePathname(urlPathname) {
  let pathname = decodeURIComponent(urlPathname);
  if (pathname === "/") pathname = "/index.html";
  const resolved = path.resolve(ROOT_DIR, "." + pathname);
  if (!resolved.startsWith(ROOT_DIR)) return null;
  return resolved;
}

function serveStatic(req, res, pathname) {
  const filePath = safePathname(pathname);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback404 = path.join(ROOT_DIR, "404.html");
      fs.readFile(fallback404, (notFoundErr, data) => {
        if (notFoundErr) {
          send(res, 404, "Not Found");
          return;
        }
        send(res, 404, data, { "Content-Type": MIME[".html"] });
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 500, "Server error");
        return;
      }
      send(res, 200, data, { "Content-Type": contentType });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/visitor-pins") {
    await handlePinsApi(req, res);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
