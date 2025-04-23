import { SvelteKitAuth } from "@auth/sveltekit"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from './lib/server/prisma/prismaConnection';
import Keycloak from "@auth/sveltekit/providers/keycloak"
 
export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Keycloak({
    profile(profile) {
        console.log(profile)
        return {
            name: profile.name ?? "",
            email: profile.email ?? "",
            image: profile.image ?? "",
            groups: profile.groups ?? ["user"],
            username: profile.preferred_username ?? "",
        }
    },
    // authorization: {
    //     params: {
    //       scope: "openid profile email groups",
    //     },
    //   },
  })],
  trustHost: true,
})