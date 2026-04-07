/**
 * K6 WebSocket / Socket.io Load Test — INFRA Messaging Service
 *
 * Tests the messaging microservice (port 8001) under concurrent WebSocket load.
 * Simulates users connected simultaneously and exchanging messages.
 *
 * Targets:
 *   500 concurrent WebSocket connections (sustained)
 *   message round-trip p95 < 200 ms
 *   connection error rate < 0.5%
 *
 * Run:
 *   SOCKET_URL=wss://your-messaging.run.app \
 *   AUTH_TOKEN=<firebase-id-token> \
 *   k6 run load_tests/k6_websocket_test.js
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '1m',  target: 100 },
    { duration: '3m',  target: 500 },
    { duration: '2m',  target: 500 },
    { duration: '1m',  target: 0   },
  ],
  thresholds: {
    ws_connecting:         ['p(95)<1000'],
    ws_session_duration:   ['p(95)<360000'],  // sessions should last the full test
    message_roundtrip_ms:  ['p(95)<200'],
    connection_errors:     ['rate<0.005'],
    messages_sent:         ['count>0'],
  },
};

// ── Metrics ───────────────────────────────────────────────────────────────────
const connectionErrors  = new Rate('connection_errors');
const messageRoundtrip  = new Trend('message_roundtrip_ms', true);
const messagesSent      = new Counter('messages_sent');
const messagesReceived  = new Counter('messages_received');

// ── Config ────────────────────────────────────────────────────────────────────
const SOCKET_URL   = __ENV.SOCKET_URL   || 'ws://localhost:8001';
const AUTH_TOKEN   = __ENV.AUTH_TOKEN   || '';
const CONV_IDS     = (__ENV.CONV_IDS    || 'conv-1,conv-2,conv-3').split(',');

// ── VU entrypoint ─────────────────────────────────────────────────────────────
export default function () {
  const convId    = CONV_IDS[randomIntBetween(0, CONV_IDS.length - 1)];
  const sessionId = uuidv4();

  const url = `${SOCKET_URL}/socket.io/?EIO=4&transport=websocket&auth_token=${AUTH_TOKEN}`;

  const res = ws.connect(url, {}, function (socket) {
    let lastSentAt = null;
    let messagesInSession = 0;
    const SESSION_DURATION_MS = 30_000;

    // ── Socket.io handshake ───────────────────────────────────────────────────
    socket.on('open', () => {
      // Socket.io: send connection packet + join conversation room
      socket.send('40');  // Engine.io open → Socket.io connect
    });

    socket.on('message', (rawMsg) => {
      // Engine.io heartbeat ping
      if (rawMsg === '2') {
        socket.send('3');  // pong
        return;
      }

      // Socket.io message: 42["event", data]
      if (rawMsg.startsWith('42')) {
        messagesReceived.add(1);
        try {
          const payload = JSON.parse(rawMsg.slice(2));
          const [event, data] = payload;

          if (event === 'connect') {
            // Join conversation room
            socket.send(`42["joinConversation",{"conversationId":"${convId}"}]`);
          } else if (event === 'message' && lastSentAt !== null) {
            // Record round-trip
            if (data?.tempId === sessionId) {
              messageRoundtrip.add(Date.now() - lastSentAt);
              lastSentAt = null;
            }
          }
        } catch { /* ignore parse errors */ }
      }
    });

    // ── Send a message every ~5 seconds ──────────────────────────────────────
    socket.setInterval(() => {
      if (messagesInSession >= 6) return;  // max 6 messages per 30s session

      const msg = {
        conversationId: convId,
        text:           `K6 load test message ${messagesInSession + 1} / session ${sessionId.slice(0, 8)}`,
        tempId:         sessionId,
      };

      lastSentAt = Date.now();
      socket.send(`42["sendMessage",${JSON.stringify(msg)}]`);
      messagesSent.add(1);
      messagesInSession++;
    }, 5000);

    socket.setTimeout(() => {
      socket.close();
    }, SESSION_DURATION_MS);

    socket.on('close', () => {
      // Normal close — nothing to do
    });

    socket.on('error', (err) => {
      connectionErrors.add(1);
      check(null, {
        'no websocket errors': () => false,
      });
    });
  });

  check(res, {
    'WebSocket connected (101)': (r) => r && r.status === 101,
  }) || connectionErrors.add(1);

  sleep(Math.random() * 2 + 1);
}
