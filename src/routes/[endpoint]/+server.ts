import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma/prismaConnection';

async function getEndpoint(request: Request, params){
    const host = request.headers.get('X-Forwarded-For') || request.headers.get('Remote-Addr')
    const authHeader = request.headers.get('Authorization');

    let dbEndpoints = []

    if (authHeader){
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
        if (dbToken){
            dbEndpoints = dbToken.endpoints;
        } else{
            console.warn(`Unauthorized request from ${host}: Token does not exist in database`);
            return null;
        }
    } else if (host){
        const dbHost = await prisma.host.findFirst({
            where: {
                host: host
            },
            select: {
                id: true,
                endpoints: true
            }
        })
        if (dbHost){
            dbEndpoints = dbHost.endpoints;
        } else{
            console.warn(`Unauthorized request from ${host}: Host does not exist in database`);
            return null;
        }
    }
    else {
        console.warn(`Unauthorized request from ${host}: Token or Host not in database`);
        return null;
    }

    const hasEndpoint = dbEndpoints.find((endpoint) => endpoint.endpoint === `/${params.endpoint}`);
    if (hasEndpoint){
        return hasEndpoint.remote_endpoint;
    } else{
        console.warn(`Unauthorized request from ${host}: does not have access to endpoint /${params.endpoint}`);
        return null;
    }
}

export const POST: RequestHandler = async ({ request, params }) => {
    const host = request.headers.get('X-Forwarded-For') || request.headers.get('Remote-Addr')
    const endpoint = await getEndpoint(request, params);
    if (!endpoint){
        return new Response('Unauthorized', { status: 403 });
    }
    const headers = new Headers(request.headers);
    headers.delete('Authorization'); 

    try {
        const response = await fetch(endpoint, {
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

        console.info(`Response received for ${host} from remote endpoint ${endpoint} with status: ${response.status}`);
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
    const host = request.headers.get('X-Forwarded-For') || request.headers.get('Remote-Addr')
    const endpoint = await getEndpoint(request, params);
    if (!endpoint) {
        return new Response('Unauthorized', { status: 403 });
    }

    const headers = new Headers(request.headers);
    headers.delete('Authorization'); 

    try {
        const queryString = url.search; // Extract query parameters from the URL
        const remoteUrl = `${endpoint}${queryString}`; // Append query parameters to the remote endpoint

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

        console.info(`Response received for ${host} from remote endpoint ${endpoint} with status: ${response.status}`);
        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying GET request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};
