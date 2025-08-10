// src/routes/api/healthcheck/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    const podId = 'qk0u2b5eqjm0mk' ;

    const healthcheckUrl = `https://${podId}-8000.proxy.runpod.net/metrics`;

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