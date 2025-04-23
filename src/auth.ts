import { SvelteKitAuth } from "@auth/sveltekit"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from './lib/server/prisma/prismaConnection';
import Keycloak from "@auth/sveltekit/providers/keycloak"
 
export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Keycloak],
  trustHost: true,
})