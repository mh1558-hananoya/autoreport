// 未ログインのアクセスをサーバー側で /login にリダイレクトする。
// （従来はクライアント側のリダイレクトのみで、保護が緩かった）
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/customers/:path*', '/reports/:path*'],
};
