// cPanel Passenger entry point for Next.js
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const app = next({ dir: __dirname, dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(0, () => {
    console.log("Next.js server started via Passenger");
  });
});
