import { sequence } from '@sveltejs/kit/hooks';
import { handle as authenticationHandle } from './auth';

async function headerCheckHandle({ event, resolve }) {
  // Example: check for a custom header
  const myHeader = event.request.headers.get('X-Forwarded-Proto');
  console.log('X-Forwarded-Proto:', myHeader);
  return resolve(event);
}

export const handle = sequence(authenticationHandle, headerCheckHandle);