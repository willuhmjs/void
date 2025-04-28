import { sequence } from '@sveltejs/kit/hooks';
import { handle as authenticationHandle } from './auth';

async function headerCheckHandle({ event, resolve }) {
  event.url.protocol = "https:";
	
  const symbol = Object.getOwnPropertySymbols(event.request)[1];
  
  event.request[symbol].url.protocol = "https:";
  for (let i = 0; i < event.request[symbol].urlList.length; i++) {
      event.request[symbol].urlList[i].protocol = "https:";
  }
  return resolve(event);
}

export const handle = sequence(authenticationHandle, headerCheckHandle);