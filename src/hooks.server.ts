import { sequence } from '@sveltejs/kit/hooks';
import { handle as authenticationHandle } from './auth';

async function headerCheckHandle({ event, resolve }) {
  if (event.url) {
    event.url.protocol = "https:";
  }
	
  const symbols = Object.getOwnPropertySymbols(event.request);
  if (symbols.length > 1) {
    const symbol = symbols[1];
    if (event.request[symbol] && event.request[symbol].url) {
      event.request[symbol].url.protocol = "https:";
      if (event.request[symbol].urlList) {
        for (let i = 0; i < event.request[symbol].urlList.length; i++) {
          if (event.request[symbol].urlList[i]) {
            event.request[symbol].urlList[i].protocol = "https:";
          }
        }
      }
    }
  }
  return resolve(event);
}

export const handle = sequence(authenticationHandle, headerCheckHandle);