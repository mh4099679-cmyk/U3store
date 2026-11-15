const { createServer } = require("http");
const { parse } = require("url");
const fs = require("fs");
const path = require("path");
const next = require("next");

// Detect production mode automatically if .next folder is built
const isNextBuildPresent = fs.existsSync(path.join(__dirname, ".next"));
const dev = process.env.NODE_ENV ? process.env.NODE_ENV !== "production" : !isNextBuildPresent;

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  })
    .once("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> U3 Store is running on port ${port} (mode: ${dev ? "development" : "production"})`);
    });
});
