// web/src/setupProxy.js

//With this, calls to /api/... from the React dev server will be forwarded to http://localhost:5050. No CORS issues, and you don’t need to hardcode the host in every file.
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:5050",
      changeOrigin: true,
      // cookie handling if needed:
      // cookieDomainRewrite: "localhost",
    })
  );
};
