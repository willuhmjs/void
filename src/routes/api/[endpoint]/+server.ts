import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma/prismaConnection';

export const POST: RequestHandler = async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized: No Token', { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log(token);

    const dbToken = await prisma.token.findFirst({ 
        where: {
            token: token
        },
        select: {
            id: true,
            endpoints: true
        }
    });
    console.log(dbToken);
    if (!dbToken) {
        return new Response('Unauthorized: Invalid Token', { status: 401 });
    }

    const hasEndpoint = dbToken.endpoints.find((endpoint) => endpoint.endpoint === `/${params.endpoint}`);
    if (!hasEndpoint) {
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

        // Log just the status code
        console.log('Response status code from target URL:', response.status);

        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};
