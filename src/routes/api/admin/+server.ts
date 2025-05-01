import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma/prismaConnection';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

import { env } from '$env/dynamic/private';
const { JWT_SECRET } = env;

export async function POST({ request }) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Unauthorized request: Missing or invalid Authorization header');
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // check if token is expired
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            console.warn('Unauthorized request: Expired token');
            return json({ error: 'Unauthorized: Expired Token' }, { status: 401 });
        }

        // Ensure the user exists in the database
        const user = await prisma.user.findFirst({
            where: {
                username: decoded.username
            }
        });
        if (!user) {
            console.warn('Unauthorized request: User not found in database');
            return json({ error: 'Unauthorized: No User' }, { status: 401 });
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        return json({ error: 'Unauthorized: Token Verification Failure' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    try {
        switch (action) {
            case 'create-token': {
                console.info('Creating a new token');
                console.log(data.endpoints);

                // Validate endpoint names
                const validEndpoints = data.endpoints?.length
                    ? await prisma.endpoint.findMany({
                          where: { endpoint: { in: data.endpoints } },
                          select: { id: true }
                      })
                    : [];
                const validEndpointIds = validEndpoints.map((endpoint) => endpoint.id);

                const newToken = await prisma.token.create({
                    data: {
                        name: data.name,
                        token: data.token || randomBytes(32).toString('hex'),
                        endpoints: {
                            connect: validEndpointIds.map((id: string) => ({ id }))
                        }
                    }
                });
                return json(newToken);
            }

            case 'delete-token':
                console.info(`Deleting token with ID: ${data.id}`);
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
                const validEndpoints = data.endpoints?.length
                    ? await prisma.endpoint.findMany({
                          where: { endpoint: { in: data.endpoints } },
                          select: { id: true }
                      })
                    : [];
                const validEndpointIds = validEndpoints.map((endpoint) => endpoint.id);

                const updatedToken = await prisma.token.update({
                    where: { id: data.id },
                    data: {
                        endpoints: { set: validEndpointIds.map((id: string) => ({ id })) }
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