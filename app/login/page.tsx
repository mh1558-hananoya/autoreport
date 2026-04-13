'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">花のや</h1>
        <p className="text-gray-500 mb-6">月次レポート管理システム</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full bg-accent text-white py-3 px-4 rounded-md hover:opacity-90 transition font-medium"
        >
          Googleアカウントでログイン
        </button>
      </div>
    </div>
  );
}
