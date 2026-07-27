import WebSocket from 'ws';

/**
 * Push log line to local Loki
 */
const pushToLoki = async (serviceId, logLine, timestampStr) => {
  let nsTimestamp;
  if (timestampStr) {
    try {
      nsTimestamp = (new Date(timestampStr).getTime() * 1000000).toString();
    } catch (_) {
      nsTimestamp = (Date.now() * 1000000).toString();
    }
  } else {
    nsTimestamp = (Date.now() * 1000000).toString();
  }

  const payload = {
    streams: [
      {
        stream: {
          container: "nexus-backend", // Match frontend default query for logs
          job: "render-cloud",
          service_id: serviceId
        },
        values: [
          [ nsTimestamp, `[Render Cloud] ${logLine}` ]
        ]
      }
    ]
  };

  try {
    await fetch('http://localhost:3100/loki/api/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Fail silently
  }
};

/**
 * Start background WebSocket connection to stream logs from Render and forward to Loki
 */
export const startRenderLogBridge = (ownerId, serviceId, token, onLog) => {
  if (!ownerId || !serviceId || !token) {
    onLog('warn', 'Missing parameters for Render log bridge. Skipping...');
    return;
  }

  const wsUrl = `wss://api.render.com/v1/logs/subscribe?ownerId=${ownerId}&resource=${serviceId}`;
  onLog('info', `Connecting to Render live log stream for service: ${serviceId}...`);

  const ws = new WebSocket(wsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  ws.on('open', () => {
    onLog('success', `Connected to Render live logs for ${serviceId}. Forwarding to local Loki.`);
  });

  ws.on('message', async (data) => {
    try {
      const logData = JSON.parse(data.toString());
      // Render websocket messages can stream either array or object.
      // Usually, they are in the format: { timestamp: "...", text: "..." }
      const text = logData.text || logData.message || JSON.stringify(logData);
      const timestamp = logData.timestamp || new Date().toISOString();
      await pushToLoki(serviceId, text, timestamp);
    } catch (err) {
      // Quietly log error locally
      console.error('Error forwarding Render log line:', err.message);
    }
  });

  ws.on('error', (err) => {
    onLog('warn', `Render log bridge WebSocket error: ${err.message}`);
  });

  ws.on('close', () => {
    onLog('info', `Render log bridge WebSocket closed for ${serviceId}. Reconnecting in 10 seconds...`);
    setTimeout(() => startRenderLogBridge(ownerId, serviceId, token, onLog), 10000);
  });
};
