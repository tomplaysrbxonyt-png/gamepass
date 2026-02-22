// proxy-server.js — version corrigée
const https = require("https");
const http  = require("http");
const url   = require("url");

const PORT = process.env.PORT || 3000;

function fetchRoblox(targetUrl) {
  return new Promise((resolve, reject) => {
    const req = https.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RobloxProxy/1.0)",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`[PROXY] ${res.statusCode} ${targetUrl}`);
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on("error", (e) => {
      console.error(`[PROXY] ERROR ${targetUrl}:`, e.message);
      reject(e);
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

const ROUTES = {
  // /clothing?username=XXX&subcategory=55
  "/clothing": async (q) => {
    const { username, subcategory } = q;
    if (!username || !subcategory) return { code: 400, body: { error: "username and subcategory required" } };
    const apiUrl = `https://catalog.roblox.com/v1/search/items/details?Category=3&Subcategory=${subcategory}&Limit=30&CreatorName=${encodeURIComponent(username)}`;
    return fetchRoblox(apiUrl);
  },

  // /games?userId=XXX
  "/games": async (q) => {
    const { userId } = q;
    if (!userId) return { code: 400, body: { error: "userId required" } };
    const apiUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc`;
    return fetchRoblox(apiUrl);
  },

  // /placedetails?placeId=XXX
  // ✅ Utilise l'API publique — pas besoin d'auth contrairement à multiget-place-details
  "/placedetails": async (q) => {
    const { placeId } = q;
    if (!placeId) return { code: 400, body: { error: "placeId required" } };
    const apiUrl = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`;
    return fetchRoblox(apiUrl);
  },

  // /gamepasses?universeId=XXX
  "/gamepasses": async (q) => {
    const { universeId } = q;
    if (!universeId) return { code: 400, body: { error: "universeId required" } };
    const apiUrl = `https://games.roblox.com/v1/universes/${universeId}/game-passes?limit=100&sortOrder=Asc`;
    return fetchRoblox(apiUrl);
  },

  // /health
  "/health": async () => {
    return { status: 200, body: JSON.stringify({ ok: true, time: Date.now() }) };
  },
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const parsed = url.parse(req.url, true);
  const handler = ROUTES[parsed.pathname];

  if (!handler) {
    // Log toutes les routes inconnues pour debug
    console.warn("[PROXY] Route inconnue:", req.url);
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Route not found", path: parsed.pathname, available: Object.keys(ROUTES) }));
  }

  try {
    const result = await handler(parsed.query);
    // result peut avoir .status ou .code
    const statusCode = result.status || result.code || 200;
    const body = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
    res.writeHead(statusCode);
    res.end(body);
  } catch (err) {
    console.error("[PROXY] Erreur handler:", err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: "Upstream error", message: err.message }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Proxy running on port ${PORT}`);
  console.log("Routes disponibles:", Object.keys(ROUTES).join(", "));
});
