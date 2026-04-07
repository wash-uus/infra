import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const SERVICE = 'reviews';
const PORT = parseInt(process.env.PORT ?? '8004', 10);

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () =>
  console.log(`[${SERVICE}] listening on :${PORT}`),
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[${SERVICE}] ${signal} — shutting down`);
  server.close(() => { process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error(`[${SERVICE}] Unhandled rejection`, reason);
});
process.on('uncaughtException', (err) => {
  console.error(`[${SERVICE}] Uncaught exception — forcing shutdown`, err);
  process.exit(1);
});
