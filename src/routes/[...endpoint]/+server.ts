import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma/prismaConnection';

export const POST: RequestHandler = async ({ request, params }) => {
    const host = request.headers.get('X-Forwarded-For') || request.headers.get('Remote-Addr')
    let endpoint;
    try{
        endpoint = await getEndpoint(request, params);
    } catch (error){
        console.warn(`Exception getting endpoint for ${host}:`, error);
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
            console.error(`Response (${response.status}) received for ${host} from endpoint ${endpoint}: ${response.body}`)
        } else{
            console.info(`Response (${response.status}) received for ${host} from endpoint ${endpoint}: ${response.statusText}`)
        }
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
    let endpoint;
    try {
        endpoint = await getEndpoint(request, params);
    } catch (error) {
        console.warn(`Exception getting endpoint for ${host}:`, error);
        return new Response('Unauthorized', { status: 403 });
    }
    const headers = new Headers(request.headers);
    headers.delete('Authorization'); 

    try {
        const queryString = url.search; // Extract query parameters from the URL
        const remoteUrl = `${endpoint}${queryString}`; // Append query parameters to the remote endpoint

        console.info(`Proxying GET request to remote endpoint: ${remoteUrl}`);
        const response = await fetch(remoteUrl, {
            method: request.method,
            headers: headers,
            redirect: 'follow'
        });

        if (response.status >= 400) {
            console.error(`Response (${response.status}) received for ${host} from endpoint ${endpoint}: ${response.body}`)
        } else{
            console.info(`Response (${response.status}) received for ${host} from endpoint ${endpoint}: ${response.statusText}`)
        }

        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying GET request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};

async function getEndpoint(request: Request, params) {
    const authHeader = request.headers.get('Authorization');

    if (authHeader) {
        const token = authHeader.substring(7, authHeader.length);

        const dbToken = await prisma.token.findFirst({
            where: {
                token: token
            },
            select: {
                id: true,
                endpoints: true
            }
        });
        if (dbToken) {
            const endpoint = dbToken.endpoints.find((endpoint) => endpoint.endpoint === `/${params.endpoint}`);
            if (endpoint) {
                return endpoint.remote_endpoint;
            } else {
                throw `Missing access to /${params.endpoint}`;
            }
        } else {
            throw `Token not in database`;
        }
    } else {
        throw "Missing header";
    }
}