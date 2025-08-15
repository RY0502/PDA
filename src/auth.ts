import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // In v5, provider credentials are inferred from AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
  providers: [Google],
  // You can customize callbacks here if needed
  // callbacks: {
  //   async session({ session, token }) {
  //     // Attach user id or other fields if needed
  //     return session;
  //   },
  // },
});
