import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma/prismaConnection';

export const POST: RequestHandler = async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    const host = request.headers.get('Host') || request.headers.get('X-Forwarded-For') || request.headers.get('Remote-Addr')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`Unauthorized request from ${host}: Missing or invalid Authorization header`);
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
        console.warn(`Unauthorized request from ${host}: Token not found in database`);
        return new Response('Unauthorized: Invalid Token', { status: 401 });
    }

    const hasEndpoint = dbToken.endpoints.find((endpoint) => endpoint.endpoint === `/${params.endpoint}`);
    if (!hasEndpoint) {
        console.warn(`Unauthorized request from ${host}: Token does not have access to endpoint /${params.endpoint}`);
        return new Response('Unauthorized: Invalid Endpoint', { status: 401 });
    }

    const headers = new Headers(request.headers);
    headers.delete('Authorization'); 

    try {
        const response = await fetch(hasEndpoint.remote_endpoint, {
            method: request.method,
            headers: headers,
            body: request.body, 
            redirect: 'follow',
            duplex: 'half' 
        });

        if (response.status >= 400) {
            const errorBody = await response.text();
            console.error(`Error response from remote endpoint: ${response.status} ${response.statusText}, Body: ${errorBody}`);
        }

        console.info(`Response received from remote endpoint ${hasEndpoint.remote_endpoint} with status: ${response.status}`);
        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};

export const GET: RequestHandler = async ({ request, params, url }) => {
    const authHeader = request.headers.get('Authorization');
    const host = request.headers.get('Host') || request.headers.get('X-Forwarded-For') || request.headers.get('Remote-Addr')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`Unauthorized request from ${host}: Missing or invalid Authorization header`);
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
        console.warn(`Unauthorized request from ${host}: Token not found in database`);
        return new Response('Unauthorized: Invalid Token', { status: 401 });
    }

    const hasEndpoint = dbToken.endpoints.find((endpoint) => endpoint.endpoint === `/${params.endpoint}`);
    if (!hasEndpoint) {
        console.warn(`Unauthorized request from ${host}: Token does not have access to endpoint /${params.endpoint}`);
        return new Response('Unauthorized: Invalid Endpoint', { status: 401 });
    }

    const headers = new Headers(request.headers);
    headers.delete('Authorization'); 

    try {
        const queryString = url.search; // Extract query parameters from the URL
        const remoteUrl = `${hasEndpoint.remote_endpoint}${queryString}`; // Append query parameters to the remote endpoint

        console.info(`Proxying GET request to remote endpoint: ${remoteUrl}`);
        const response = await fetch(remoteUrl, {
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
