import { prisma } from '$lib/server/prisma/prismaConnection';
import { error } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key';

export async function load() {
    try {
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
        return error(401, "Unauthorized");
    }
    return session;
}

export const actions = {
    'add-token': async ({ request }) => {
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const endpointIds = formData.getAll('endpointIds') as string[]; // User-provided endpoint IDs

        if (name) {
            const token = randomBytes(32).toString('hex'); // Generate a random 32-byte token

            await prisma.token.create({
                data: {
                    name,
                    token,
                    endpoints: endpointIds.length > 0
                        ? { connect: endpointIds.map((id) => ({ id })) }
                        : []
                }
            });
        }
    },
    'delete-token': async ({ request }) => {
        const formData = await request.formData();
        const tokenId = formData.get('tokenId');

        if (tokenId) {
            await prisma.token.delete({
                where: { id: tokenId }
            });
        }
    },
    'add-endpoint': async ({ request }) => {
        const formData = await request.formData();
        const tokenIds = formData.getAll('tokenIds'); // Allow multiple token IDs
        const endpoint = formData.get('endpoint');
        const remote_endpoint = formData.get('remote_endpoint');
        const method = formData.get('method');

        console.log('Form Data:', { tokenIds, endpoint, remote_endpoint, method }); // Debugging log

        if (endpoint && remote_endpoint && method) {
            try {
                await prisma.endpoint.create({
                    data: {
                        method,
                        endpoint,
                        remote_endpoint,
                        tokens: tokenIds.length > 0
                            ? { connect: tokenIds.map((id) => ({ id })) }
                            : [] // Allow no tokens to be connected
                    }
                });
                console.log('Endpoint created successfully'); // Debugging log
            } catch (error) {
                console.error('Error creating endpoint:', error); // Debugging log
            }
        } else {
            console.error('Invalid form data for creating endpoint'); // Debugging log
        }
    },
    'delete-endpoint': async ({ request }) => {
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
    'update-endpoint-tokens': async ({ request }) => {
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
    'update-token-endpoints': async ({ request }) => {
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
        const fSession = await locals.auth();
        console.log(fSession);
        const session = checkAuth(fSession);
        const userId = session?.user?.id;
        const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30m' });
        return { token };
    }
};
