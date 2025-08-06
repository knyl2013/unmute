// src/routes/api/websocket-url/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This is our new serverless function (API endpoint).
// It handles GET requests to `/api/websocket-url`.
export const GET: RequestHandler = async () => {
  // In the future, you could have dynamic logic here to select a server,
  // generate a temporary token, etc.
  const webSocketUrl = "wss://3vzar43t5x8c9b-8000.proxy.runpod.net/v1/realtime";

  // We return the URL in a JSON object.
  // The `json()` helper from SvelteKit sets the correct Content-Type header.
  return json({
    url: webSocketUrl
  });
};