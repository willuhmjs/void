import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma/prismaConnection';

export const POST: RequestHandler = async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Unauthorized request: Missing or invalid Authorization header');
        return new Response('Unauthorized: No Token', { status: 401 });
    }

    const token = authHeader.substring(7);

    const dbToken = await prisma.token.findFirst({ 
        where: {
            token: token
        },
        select: {
            id: true,
            endpoints: true
        }
    });
    if (!dbToken) {
        console.warn('Unauthorized request: Token not found in database');
        return new Response('Unauthorized: Invalid Token', { status: 401 });
    }

    const hasEndpoint = dbToken.endpoints.find((endpoint) => endpoint.endpoint === `/${params.endpoint}`);
    if (!hasEndpoint) {
        console.warn(`Unauthorized request: Token does not have access to endpoint /${params.endpoint}`);
        return new Response('Unauthorized: Invalid Endpoint', { status: 401 });
    }

    const headers = new Headers(request.headers);
    headers.delete('Authorization'); 

    try {
        console.info(`Proxying request to remote endpoint: ${hasEndpoint.remote_endpoint}`);
        const response = await fetch(hasEndpoint.remote_endpoint, {
            method: request.method,
            headers: headers,
            body: request.body, 
            redirect: 'follow',
            duplex: 'half' 
        });

        if (response.status >= 400) {
            if (response.status === 404) {
                console.error(`Error response from remote endpoint: ${response.status} ${response.statusText}`);
            } else {
                const errorBody = await response.text();
                console.error(`Error response from remote endpoint: ${response.status} ${response.statusText}, Body: ${errorBody}`);
            }
        }

        console.info(`Response received from remote endpoint with status: ${response.status}`);
        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};

export const GET: RequestHandler = async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Unauthorized request: Missing or invalid Authorization header');
        return new Response('Unauthorized: No Token', { status: 401 });
    }

    const token = authHeader.substring(7);

    const dbToken = await prisma.token.findFirst({ 
        where: {
            token: token
        },
        select: {
            id: true,
            endpoints: true
        }
    });
    if (!dbToken) {
        console.warn('Unauthorized request: Token not found in database');
        return new Response('Unauthorized: Invalid Token', { status: 401 });
    }

    const hasEndpoint = dbToken.endpoints.find((endpoint) => endpoint.endpoint === `/${params.endpoint}`);
    if (!hasEndpoint) {
        console.warn(`Unauthorized request: Token does not have access to endpoint /${params.endpoint}`);
        return new Response('Unauthorized: Invalid Endpoint', { status: 401 });
    }

    const headers = new Headers(request.headers);
    headers.delete('Authorization'); 

    try {
        console.info(`Proxying GET request to remote endpoint: ${hasEndpoint.remote_endpoint}`);
        const response = await fetch(hasEndpoint.remote_endpoint, {
            method: 'GET',
            headers: headers,
            redirect: 'follow'
        });

        if (response.status >= 400) {
            if (response.status === 404) {
                console.error(`Error response from remote endpoint: ${response.status} ${response.statusText}`);
            } else {
                const errorBody = await response.text();
                console.error(`Error response from remote endpoint: ${response.status} ${response.statusText}, Body: ${errorBody}`);
            }
        }

        console.info(`Response received from remote endpoint with status: ${response.status}`);
        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying GET request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};
