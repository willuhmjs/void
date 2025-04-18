import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, url }) => {
    // Extract the Authorization header

    const authHeader = request.headers.get('Authorization');

    // Check if the Authorization header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7); // Extract the token (after "Bearer ")
    console.log(token);
    // Verify the token (placeholder, implement your logic here)
    const isTokenValid = true; // Replace with actual token verification logic
    if (!isTokenValid) {
        return new Response('Unauthorized', { status: 401 });
    }
    const headers = new Headers(request.headers);
    headers.delete('Authorization');
    // Proxy the request to another server
    const targetUrl = `http://localhost:3100/${url.searchParams.get('path')}`; 
    const body = await request.text(); 

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
            },
            body
        });

        const responseText = await response.text();
        console.log('Response from target server:', responseText);

        return new Response(responseText, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};