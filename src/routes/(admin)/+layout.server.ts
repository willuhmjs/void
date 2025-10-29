import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types"
import { env } from '$env/dynamic/private';
 
export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();
  const debug = env.DEBUG || "false"
  if ((!session || !session?.user) && debug == "false") {
      return redirect(307, '/auth/signin')
  }
  return {
    session,
  }
}