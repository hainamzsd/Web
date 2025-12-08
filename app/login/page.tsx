import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6 text-slate-400 text-sm hover:text-slate-600 transition-colors">
            ← Quay về trang chủ
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Hệ thống Định danh Vị trí C06
          </h1>
          <p className="text-slate-500 text-sm">
            Đăng nhập để truy cập hệ thống
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
