import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma/prismaConnection';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

import { env } from '$env/dynamic/private';
const { JWT_SECRET } = env;

export async function POST({ request }) {
    const authHeader = request.headers.get('Authorization');
    const host = request.headers.get('X-Forwarded-For') || request.headers.get('Remote-Addr') || "Unkown"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`Unauthorized request from ${host}: Missing or invalid Authorization header`);
        return json({ error: 'Unauthorized: missing header' }, { status: 401 });
    }

    try {
        await authenticate(authHeader);
    } catch (error) {
        console.error(`Token verification from ${host} failed:`, error);
        return json({ error: 'Unauthorized: Token Verification Failure' }, { status: 401 });
    }

    const { action, data } = await request.json();

    try {
        switch (action) {
            case 'create-token': {
                console.info(`Creating a new token ${data.name}`);
                const newToken = await prisma.token.create({
                    data: {
                        name: data.name,
                        token: data.token || randomBytes(32).toString('hex'),
                        endpoints: { connect: await getEndpointIds(data.endpoints) }
                    }
                });
                return json(newToken);
            }

            case 'delete-token':
                console.info(`Deleting token ${data.id}`);
                await prisma.token.delete({
                    where: { id: data.id }
                });
                return json({ success: true });

            case 'create-endpoint': {
                console.info('Creating a new endpoint');
                const newEndpoint = await prisma.endpoint.create({
                    data: {
                        endpoint: data.endpoint,
                        remote_endpoint: data.remote_endpoint,
                        method: data.method,
                        tokens: data.tokenIds?.length
                            ? { connect: data.tokenIds.map((id: string) => ({ id })) }
                            : undefined
                    }
                });
                return json(newEndpoint);
            }

            case 'delete-endpoint':
                console.info(`Deleting endpoint with ID: ${data.id}`);
                await prisma.endpoint.update({
                    where: { id: data.id },
                    data: { tokens: { set: [] } }
                });
                await prisma.endpoint.delete({
                    where: { id: data.id }
                });
                return json({ success: true });

            case 'update-endpoint-tokens': {
                console.info(`Updating tokens for endpoint with ID: ${data.id}`);
                const updatedEndpoint = await prisma.endpoint.update({
                    where: { id: data.id },
                    data: {
                        tokens: { set: data.tokenIds.map((id: string) => ({ id })) }
                    }
                });
                return json(updatedEndpoint);
            }

            case 'update-token-endpoints': {
                console.info(`Updating endpoints for token with ID: ${data.id}`);

                const updatedToken = await prisma.token.update({
                    where: { id: data.id },
                    data: {
                        endpoints: { set: await getEndpointIds(data.endpoints) }
                    }
                });
                return json(updatedToken);
            }

            case 'list-tokens': {
                console.info('Listing all tokens');
                const tokens = await prisma.token.findMany({
                    select: {
                        id: true,
                        name: true,
                        token: true
                    }
                });
                return json(tokens);
            }

            default:
                console.warn(`Invalid action received: ${action}`);
                return json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function authenticate(authHeader: String){
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    // check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw json({ error: 'Unauthorized: Expired Token' }, { status: 401 });
    }

    // Ensure the user exists in the database
    const user = await prisma.user.findFirst({
        where: {
            username: decoded.username
        }
    });
    if (!user) {
        throw json({ error: 'Unauthorized: No User' }, { status: 401 });
    }
}

async function getEndpointIds(endpointNames: string[] | undefined) {
    if (!endpointNames?.length) return [];
    const endpoints = await prisma.endpoint.findMany({
        where: { endpoint: { in: endpointNames } },
        select: { id: true }
    });

    return endpoints.map((ep) => ({ id: ep.id }));
}