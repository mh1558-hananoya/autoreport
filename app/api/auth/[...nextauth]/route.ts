import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// 社内向けの共有パスワード認証。
// 環境変数 APP_PASSWORD と一致した場合のみログインを許可する。
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: '社内ログイン',
      credentials: {
        password: { label: 'パスワード', type: 'password' },
      },
      async authorize(credentials) {
        const expected = process.env.APP_PASSWORD;
        // APP_PASSWORD 未設定時は誰もログインさせない（フェイルセーフ）
        if (!expected) {
          console.error('APP_PASSWORD が未設定のためログインを拒否しました');
          return null;
        }
        if (credentials?.password === expected) {
          return { id: 'staff', name: '花のや' };
        }
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
