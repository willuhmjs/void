import { SvelteKitAuth } from "@auth/sveltekit"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from './lib/server/prisma/prismaConnection';
import Keycloak from "@auth/sveltekit/providers/keycloak"
import { dev } from '$app/environment'; 
export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  useSecureCookies: true,
  callbacks: {
    signIn({ profile }) {
      if (dev) return true;
      return profile.groups.includes("syskids")
    }
  },
  providers: [Keycloak({
    profile(profile) {
        return {
            name: profile.name ?? "",
            email: profile.email ?? "",
            image: profile.image ?? "",
            groups: profile.groups,
            username: profile.preferred_username ?? "",
        }
    },

  })],
  trustHost: true,
})