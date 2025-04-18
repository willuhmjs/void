import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, url }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log(token);

    const isTokenValid = true; // Replace with actual token verification logic
    if (!isTokenValid) {
        return new Response('Unauthorized', { status: 401 });
    }

    const headers = new Headers(request.headers);
    headers.delete('Authorization'); // Optional, depending on target server requirements

    const targetUrl = `http://localhost:3100/loki/${url.searchParams.get('path')}`;

    try {
            const bodyText = await new Response(request.body).text();
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers, // You can send all headers or just forward selected ones
            body: bodyText, // Forward raw body stream
        });

        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        console.error('Error proxying request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};
