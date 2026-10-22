import "dotenv/config";
import { createServer, logger } from "./server.js";

const PORT = parseInt(process.env.MCP_PORT ?? "8787", 10);
const { app } = createServer();

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, `LoadBearing MCP server listening on port ${PORT}`);
  logger.info(`Streamable HTTP MCP endpoint: http://localhost:${PORT}/mcp`);
  logger.info(`SSE events endpoint: http://localhost:${PORT}/events`);
  logger.info(`Health check: http://localhost:${PORT}/healthz`);
});

function handleShutdown() {
  logger.info("Graceful shutdown initiated...");
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
