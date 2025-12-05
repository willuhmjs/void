import { SvelteKitAuth } from "@auth/sveltekit"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from './lib/server/prisma/prismaConnection';
import Keycloak from "@auth/sveltekit/providers/keycloak"
export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  useSecureCookies: true,
  providers: [Keycloak({
    profile(profile) {
        return {
            name: profile.name ?? "",
            email: profile.email ?? "",
            image: profile.image ?? "",
            username: profile.preferred_username ?? "",
        }
    },
    allowDangerousEmailAccountLinking: true,
  })],
  trustHost: true,
})