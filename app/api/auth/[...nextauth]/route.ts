import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      // 管理者のメールアドレスのみ許可
      const allowedEmails = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim());
      if (allowedEmails.length > 0 && allowedEmails[0] !== '') {
        return allowedEmails.includes(user.email || '');
      }
      return true;
    },
  },
});

export { handler as GET, handler as POST };
