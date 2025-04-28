import { sequence } from '@sveltejs/kit/hooks';
import { handle as authenticationHandle } from './auth';

async function headerCheckHandle({ event, resolve }) {
  // Example: check for a custom header
for (const [key, value] of event.request.headers.entries()) {
    console.log(`${key}: ${value}`);
}
  return resolve(event);
}

export const handle = sequence(authenticationHandle, headerCheckHandle);