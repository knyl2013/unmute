import { RUNPOD_API_KEY } from '$env/static/private';
import { error } from '@sveltejs/kit';

// --- State ---
let activePodId: string | null = null; // ID of the pod this server is actively managing
let activeConnections = 0;
let shutdownTimer: NodeJS.Timeout | null = null; // Timer for shutting down the *active* pod

// Tracks background cleanup timers for idle pods to prevent duplicate timers
// Key: podId, Value: NodeJS.Timeout
const cleanupTimers = new Map<string, NodeJS.Timeout>();

// --- Constants ---
const SHUTDOWN_GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes for active pod
const SHUTDOWN_GRACE_PERIOD_MS_WHEN_NO_CONNECTION = 5 * 60 * 1000; // 5 minutes for active pod
const IDLE_POD_CLEANUP_MS = 30 * 60 * 1000; // 30-minute cleanup for any discovered idle pod

const RUNPOD_API_BASE_URL = 'https://rest.runpod.io/v1';

const POD_CREATE_CONFIG = {
    "cloudType": "SECURE",
    "name": "SvelteKit On-Demand Pod",
    "gpuTypeIds": ["NVIDIA GeForce RTX 4090"],
    "containerDiskInGb": 20,
    "volumeInGb": 20,
    "ports": ["8000/http","22/tcp"],
    "templateId": "ogn0w7m9jb",
    "gpuCount": 1
};


// --- Private API Functions ---

/**
 * Terminates (deletes) a specific pod and cleans up any associated timers.
 */
async function terminatePod(podIdToTerminate: string) {
    console.log(`[TERMINATE] Attempting to terminate pod ${podIdToTerminate}.`);
    if (!RUNPOD_API_KEY) {
        console.error("TERMINATE_POD_ERROR: RUNPOD_API_KEY env var not set.");
        return;
    }

    // Clear any pending cleanup timer for this pod
    if (cleanupTimers.has(podIdToTerminate)) {
        clearTimeout(cleanupTimers.get(podIdToTerminate)!);
        cleanupTimers.delete(podIdToTerminate);
        console.log(`[TERMINATE] Cleared background cleanup timer for ${podIdToTerminate}.`);
    }

    const terminateUrl = `${RUNPOD_API_BASE_URL}/pods/${podIdToTerminate}/terminate`;
    try {
        await fetch(terminateUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
        });
        console.log(`[TERMINATE] Successfully requested termination for pod ${podIdToTerminate}.`);
    } catch (e) {
        console.error(`[TERMINATE] An error occurred while terminating pod ${podIdToTerminate}:`, e);
    } finally {
        // If this was our active pod, reset the server's state
        if (activePodId === podIdToTerminate) {
            console.log("[STATE] Resetting active pod state.");
            activePodId = null;
            activeConnections = 0;
            shutdownTimer = null;
        }
    }
}

/**
 * Fetches a list of all pods on the account.
 */
async function listPods(): Promise<any[] | null> {
    console.log("Fetching list of existing pods...");
    const listUrl = `${RUNPOD_API_BASE_URL}/pods`;
    try {
        const response = await fetch(listUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
        });
        if (!response.ok) {
            console.error(`Failed to list pods. Status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data || [];
    } catch (e) {
        console.error("An error occurred while listing pods:", e);
        return null;
    }
}

/**
 * Sends a request to start a stopped pod.
 */
async function startPod(podId: string): Promise<boolean> {
    console.log(`Attempting to start existing pod ${podId}...`);
    const startUrl = `${RUNPOD_API_BASE_URL}/pods/${podId}/start`;
    try {
        const response = await fetch(startUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
        });
        if (!response.ok) {
            console.error(`Failed to start pod ${podId}. Status: ${response.status}`, await response.text());
            return false;
        }
        console.log(`Successfully requested to start pod ${podId}.`);
        return true;
    } catch (e) {
        console.error(`An error occurred while starting pod ${podId}:`, e);
        return false;
    }
}

/**
 * Schedules a 30-minute termination timer for any pod that is not the active one.
 * This acts as a garbage collector for orphaned pods.
 * @param allPods - The list of all pods from the API.
 * @param currentActivePodId - The ID of the pod we are using, which should NOT be cleaned up.
 */
function scheduleCleanupForIdlePods(allPods: any[], currentActivePodId: string | null) {
    console.log(`[CLEANUP] Scanning ${allPods.length} pods for background cleanup scheduling.`);
    for (const pod of allPods) {
        // Don't schedule cleanup for the pod we are actively using
        if (pod.id === currentActivePodId) {
            continue;
        }
        // If a cleanup timer already exists for this pod, do nothing
        if (cleanupTimers.has(pod.id)) {
            continue;
        }

        console.log(`[CLEANUP] Scheduling 30-minute termination for idle pod ${pod.id}.`);
        const timer = setTimeout(() => {
            console.log(`[CLEANUP] Idle timer expired for pod ${pod.id}.`);
            terminatePod(pod.id);
        }, IDLE_POD_CLEANUP_MS);

        cleanupTimers.set(pod.id, timer);
    }
}

/**
 * Creates a new pod on RunPod and returns its ID.
 */
async function createAndStartPod(): Promise<string | null> {
    console.log("No suitable stopped pod found. Creating a new one...");
    if (!RUNPOD_API_KEY) {
        console.error("CREATE_POD_ERROR: RUNPOD_API_KEY env var not set.");
        return null;
    }
    const createUrl = `${RUNPOD_API_BASE_URL}/pods`;
    try {
        const response = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(POD_CREATE_CONFIG)
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error(`Failed to create RunPod pod. Status: ${response.status}`, responseData);
            return null;
        }
        console.log(`Successfully created pod. Full response:`, responseData);
        return responseData.id;
    } catch (e) {
        console.error("An error occurred while creating the pod:", e);
        return null;
    }
}

/**
 * Gets a pod, prioritizing reusing a stopped one, and creating one as a fallback.
 * Also triggers the cleanup scheduling for all other pods.
 */
async function getOrCreatePod(): Promise<string | null> {
    const reusablePods = (await listPods()) || [];

    console.log("Found pods: ", reusablePods);
    
    let chosenPodId: string | null = null;
    for (const reusablePod of reusablePods) {
        if (reusablePod) {
            console.log(`Found reusable stopped pod: ${reusablePod.id}. Attempting to start...`);
            if (await startPod(reusablePod.id)) {
                chosenPodId = reusablePod.id;
                console.log(`
    /**************************************************/
    ***   Successfully restarted existing pod!   ***
    ***      POD ID: ${chosenPodId}      ***
    /**************************************************/
                `);
                // Since we're using this pod, cancel its cleanup timer if it exists
                if (chosenPodId && cleanupTimers.has(chosenPodId)) {
                    console.log(`[CLEANUP] Canceling background cleanup for reactivated pod ${chosenPodId}.`);
                    clearTimeout(cleanupTimers.get(chosenPodId)!);
                    cleanupTimers.delete(chosenPodId);
                }
                break;
            }
        }
    }
    
    // Schedule cleanup for all pods, making sure to exclude the one we just chose
    scheduleCleanupForIdlePods(reusablePods, chosenPodId);

    // If we couldn't reuse a pod, create a new one
    if (!chosenPodId) {
        console.log("No suitable stopped pod found or failed to start. Creating a new one...");
        chosenPodId = await createAndStartPod();
        if (chosenPodId) {
            console.log(`
/**************************************************/
 ***      Successfully created new pod!       ***
 ***      POD ID: ${chosenPodId}      ***
/**************************************************/
            `);
        }
    }

    return chosenPodId;
}


// --- Public API for Server Routes ---

/**
 * Registers a client connection. Acquires a pod if one isn't active.
 * Resets the 30-minute shutdown timer for the *active* pod.
 */
export async function registerConnection() {
    if (shutdownTimer) {
        clearTimeout(shutdownTimer);
        shutdownTimer = null;
        console.log("[STATE] Active pod shutdown timer canceled due to new activity.");
    }

    if (!activePodId) {
        console.log("[STATE] No active pod. Acquiring one...");
        const podId = await getOrCreatePod();
        if (podId) {
            activePodId = podId;
        } else {
            console.error("CRITICAL: Failed to get or create a pod. Cannot register connection.");
            return { status: "fail", podId: null };
        }
    }

    activeConnections++;
    console.log(`[STATE] Connection registered. Active connections: ${activeConnections}. Pod: ${activePodId}`);

    // Set a new 30-minute shutdown timer for the active pod
    console.log(`[STATE] Active pod shutdown timer set for ${SHUTDOWN_GRACE_PERIOD_MS / 60000} minutes.`);
    shutdownTimer = setTimeout(() => terminatePod(activePodId!), SHUTDOWN_GRACE_PERIOD_MS);
    const webSocketUrl = `wss://${activePodId}-8000.proxy.runpod.net/v1/realtime`;

    return { status: "success", podId: activePodId, webSocketUrl: webSocketUrl };
}

/**
 * Unregisters a client connection.
 * If it's the last connection, starts a short timer to terminate the active pod.
 */
export function unregisterConnection() {
    activeConnections = Math.max(0, activeConnections - 1);
    console.log(`[STATE] Connection unregistered. Active connections: ${activeConnections}`);

    if (activeConnections === 0 && activePodId) {
        if (shutdownTimer) clearTimeout(shutdownTimer);
        
        console.log(`[STATE] Last connection closed. Starting final shutdown timer for ${SHUTDOWN_GRACE_PERIOD_MS_WHEN_NO_CONNECTION / 60000} minutes.`);
        shutdownTimer = setTimeout(() => terminatePod(activePodId!), SHUTDOWN_GRACE_PERIOD_MS_WHEN_NO_CONNECTION);
    }
}