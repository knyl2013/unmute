import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerConnection, unregisterConnection } from '$lib/server/podManager';

// This endpoint handles notifying the server about a client's connection status.
export const POST: RequestHandler = async ({ request }) => {
    const { action } = await request.json();

    switch (action) {
        case 'register':
            registerConnection();
            return json({ success: true, message: 'Connection registered.' });
        
        case 'unregister':
            unregisterConnection();
            return json({ success: true, message: 'Connection unregistered.' });
        
        default:
            throw error(400, 'Invalid action specified. Use "register" or "unregister".');
    }
};