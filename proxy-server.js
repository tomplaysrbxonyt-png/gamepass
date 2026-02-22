// proxy-server.js
// Héberge ce fichier sur Render.com (gratuit)
// Il fait le pont entre ton jeu Roblox et l'API Roblox
//
// DEPLOY sur Render.com :
// 1. Crée un compte sur https://render.com
// 2. New > Web Service > "Deploy from a public Git repo" OU colle ce fichier
// 3. Build Command : npm install
// 4. Start Command : node proxy-server.js
// 5. Copie l'URL fournie par Render (ex: https://mon-proxy.onrender.com)
// 6. Colle cette URL dans Assets Loader.lua à la ligne PROXY_URL

const https = require("https");
const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════
// Fonction de requête vers l'API Roblox
// ═══════════════════════════════════════
function fetchRoblox(targetUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
      timeout: 8000,
    };
    https.get(targetUrl, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject).on("timeout", () => reject(new Error("Timeout")));
  });
}

// ═══════════════════════════════════════
// Routes
// ═══════════════════════════════════════
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;
  const q = parsed.query;

  try {
    // GET /clothing?username=XXX&subcategory=55
    if (path === "/clothing") {
      const { username, subcategory } = q;
      if (!username || !subcategory) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "username and subcategory required" }));
      }
      const apiUrl = `https://catalog.roblox.com/v1/search/items/details?Category=3&Subcategory=${subcategory}&Limit=30&CreatorName=${encodeURIComponent(username)}`;
      const result = await fetchRoblox(apiUrl);
      res.writeHead(result.status);
      return res.end(result.body);
    }

    // GET /games?userId=XXX
    if (path === "/games") {
      const { userId } = q;
      if (!userId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "userId required" }));
      }
      const apiUrl = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc`;
      const result = await fetchRoblox(apiUrl);
      res.writeHead(result.status);
      return res.end(result.body);
    }

    // GET /placedetails?placeId=XXX
    if (path === "/placedetails") {
      const { placeId } = q;
      if (!placeId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "placeId required" }));
      }
      const apiUrl = `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`;
      const result = await fetchRoblox(apiUrl);
      res.writeHead(result.status);
      return res.end(result.body);
    }

    // GET /gamepasses?universeId=XXX
    if (path === "/gamepasses") {
      const { universeId } = q;
      if (!universeId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "universeId required" }));
      }
      const apiUrl = `https://games.roblox.com/v1/universes/${universeId}/game-passes?limit=100&sortOrder=Asc`;
      const result = await fetchRoblox(apiUrl);
      res.writeHead(result.status);
      return res.end(result.body);
    }

    // GET /health
    if (path === "/health") {
      res.writeHead(200);
      return res.end(JSON.stringify({ status: "ok", time: Date.now() }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});