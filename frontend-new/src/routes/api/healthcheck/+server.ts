// src/routes/api/healthcheck/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { POD_ID } from '$env/static/private';


export const GET: RequestHandler = async () => {
    if (!POD_ID) {
        console.error("POD_ID environment variable is not set.");
        throw error(500, 'Server configuration error.');
    }
    

    const healthcheckUrl = `https://${POD_ID}-8000.proxy.runpod.net/metrics`;

    try {
        const response = await fetch(healthcheckUrl, {
            method: 'GET',
        });

        if (!response.ok) {
            return json({ status: "offline" });
        }
    } catch (e: any) {
        console.log("Error while doing health check, err:", e);
        return json({ status: "offline" });
    }

    return json({ status: "online" });
};