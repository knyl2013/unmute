import { RUNPOD_API_KEY, POD_ID } from '$env/static/private';
import { error } from '@sveltejs/kit';

// --- State ---
let activeConnections = 0;
let shutdownTimer: NodeJS.Timeout | null = null;

// Grace period in milliseconds before shutting down the pod (e.g., 20 minutes)
const SHUTDOWN_GRACE_PERIOD_MS = 20 * 60 * 1000; 
const SHUTDOWN_GRACE_PERIOD_MS_WHEN_NO_CONNECTION = 5 * 60 * 1000; 

// --- Private Functions ---

async function stopPod() {
    console.log(`No active connections. Attempting to stop pod ${POD_ID} after grace period.`);

    if (!POD_ID || !RUNPOD_API_KEY) {
        console.error("STOP_POD_ERROR: POD_ID or RUNPOD_API_KEY env vars not set.");
        return; // Don't throw, just log, as this is an automated background task.
    }

    const stopUrl = `https://rest.runpod.io/v1/pods/${POD_ID}/stop`;

    try {
        const response = await fetch(stopUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RUNPOD_API_KEY}`
            }
        });

        if (!response.ok) {
            // It might already be stopped, which can be a 4xx error. We can treat it as success.
            const errorBody = await response.text();
            console.error(`Failed to stop RunPod pod ${POD_ID}. Status: ${response.status}`, errorBody);
        } else {
            console.log(`Successfully requested to stop pod ${POD_ID}.`);
        }
    } catch (e) {
        console.error("An error occurred while trying to stop the RunPod pod:", e);
    }
}

async function startPod() {
    console.log(`Attempting to start pod ${POD_ID}...`);

    if (!POD_ID || !RUNPOD_API_KEY) {
        console.error("START_POD_ERROR: POD_ID or RUNPOD_API_KEY env vars not set.");
        return; // Don't throw, just log, as this is an automated background task.
    }

    const startUrl = `https://rest.runpod.io/v1/pods/${POD_ID}/start`;

    try {
        const response = await fetch(startUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RUNPOD_API_KEY}`
            }
        });

        if (!response.ok) {
            // It might already be started, which can be a 4xx error. We can treat it as success.
            const errorBody = await response.text();
            console.error(`Failed to start RunPod pod ${POD_ID}. Status: ${response.status}`, errorBody);
        } else {
            console.log(`Successfully requested to start pod ${POD_ID}.`);
        }
    } catch (e) {
        console.error("An error occurred while trying to start the RunPod pod:", e);
    }
}

// --- Public API for our server routes ---

export function registerConnection() {
    if (shutdownTimer) {
        clearTimeout(shutdownTimer);
        shutdownTimer = null;
        console.log("Shutdown timer canceled.");
    }

    startPod();
    activeConnections++;
    console.log(`Connection registered. Active connections: ${activeConnections}. Last registration: ${new Date()}`);
    shutdownTimer = setTimeout(stopPod, SHUTDOWN_GRACE_PERIOD_MS);
}

export function unregisterConnection() {
    activeConnections = Math.max(0, activeConnections - 1); // Prevent going below 0
    console.log(`Connection unregistered. Active connections: ${activeConnections}`);

    if (activeConnections === 0) {
        console.log(`Last connection closed. Starting shutdown timer for ${SHUTDOWN_GRACE_PERIOD_MS_WHEN_NO_CONNECTION / 1000}s.`);
        shutdownTimer = setTimeout(stopPod, SHUTDOWN_GRACE_PERIOD_MS_WHEN_NO_CONNECTION);
    }
}