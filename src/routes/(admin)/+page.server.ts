import { prisma } from '$lib/server/prisma/prismaConnection';
import { error } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
const { JWT_SECRET } = env;

export async function load() {
    try {
        console.info('Fetching tokens and endpoints');
        const tokens = await prisma.token.findMany({
            select: {
                id: true,
                token: true,
                name: true, 
                endpoints: {
                    select: {
                        id: true,
                        endpoint: true
                    }
                }
            }
        });

        const endpoints = await prisma.endpoint.findMany({
            select: {
                id: true,
                endpoint: true,
                remote_endpoint: true,
                method: true
            }
        });

        return {
            tokens,
            endpoints
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        return {
            tokens: [],
            endpoints: []
        };
    }
}

function checkAuth<T>(session: T): T {
    if (!session || !session.user) {
        console.warn('Unauthorized access attempt');
        return error(401, "Unauthorized");
    }
    return session;
}

export const actions = {
    'add-token': async ({ request, locals }) => {
        console.info('Adding a new token');
        const session = checkAuth(await locals.auth());
        const formData = await request.formData();
        const name = formData.get('name') as string;

        if (name) {
            const token = randomBytes(32).toString('hex'); // Generate a random 32-byte token

            await prisma.token.create({
                data: {
                    name,
                    token,
                   
                }
            });
        }
    },
    'delete-token': async ({ request, locals }) => {
        console.info('Deleting a token');
        const session = checkAuth(await locals.auth());
        const formData = await request.formData();
        const tokenId = formData.get('tokenId');

        if (tokenId) {
            await prisma.token.delete({
                where: { id: tokenId }
            });
        }
    },
    'add-endpoint': async ({ request, locals }) => {
        console.info('Adding a new endpoint');
        const session = checkAuth(await locals.auth());
        const formData = await request.formData();
        const tokenIds = formData.getAll('tokenIds'); // Allow multiple token IDs
        let endpoint = formData.get('endpoint') as string;
        let remote_endpoint = formData.get('remote_endpoint') as string;
        const method = formData.get('method');

        console.log('Form Data:', { tokenIds, endpoint, remote_endpoint, method }); // Debugging log

        // Remove trailing slashes from URLs
        if (endpoint) endpoint = endpoint.replace(/\/+$/, '');
        if (remote_endpoint) remote_endpoint = remote_endpoint.replace(/\/+$/, '');

        if (endpoint && remote_endpoint && method) {
            try {
                const data: any = {
                    method,
                    endpoint,
                    remote_endpoint
                };

                // Include tokens only if tokenIds is not empty
                if (tokenIds.length > 0) {
                    data.tokens = { connect: tokenIds.map((id) => ({ id })) };
                }

                await prisma.endpoint.create({ data });
                console.log('Endpoint created successfully'); // Debugging log
            } catch (error) {
                console.error('Error creating endpoint:', error); // Debugging log
            }
        } else {
            console.error('Invalid form data for creating endpoint'); // Debugging log
        }
    },
    'delete-endpoint': async ({ request, locals }) => {
        console.info('Deleting an endpoint');
        const session = checkAuth(await locals.auth());
        const formData = await request.formData();
        const endpointId = formData.get('endpointId') as string | null;

        if (endpointId) {
            // Disconnect all tokens associated with this endpoint
            await prisma.endpoint.update({
              where: { id: endpointId || undefined },
              data: {
                tokens: {
                  set: [] 
                }
              }
            });
        
            // Now delete the endpoint
            await prisma.endpoint.delete({
              where: { id: endpointId }
            });
          }
    },
    'update-endpoint-tokens': async ({ request, locals }) => {
        console.info('Updating tokens for an endpoint');
        const session = checkAuth(await locals.auth());
        const formData = await request.formData();
        const endpointId = formData.get('endpointId') as string | null;
        const tokenIds = formData.getAll('tokenIds') as string[];

        if (endpointId) {
            await prisma.endpoint.update({
                where: { id: endpointId },
                data: {
                    tokens: {
                        set: tokenIds.map((id) => ({ id }))
                    }
                }
            });
        }
    },
    'update-token-endpoints': async ({ request, locals }) => {
        console.info('Updating endpoints for a token');
        const session = checkAuth(await locals.auth());
        const formData = await request.formData();
        const tokenId = formData.get('tokenId') as string | null;
        const endpointIds = formData.getAll('endpoints') as string[];

        if (tokenId) {
            await prisma.token.update({
                where: { id: tokenId },
                data: {
                    endpoints: {
                        set: endpointIds.map((id) => ({ id }))
                    }
                }
            });
        }
    },
    'refresh-token': async ({ request, locals }) => {
        console.info('Refreshing a token');
        const session = checkAuth(await locals.auth());
        const token = jwt.sign({ username: session.user.email.split("@")[0] }, JWT_SECRET, { expiresIn: '30m' });
        return { token };
    }
};
