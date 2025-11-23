import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            C06 Platform
          </h1>
          <p className="text-gray-600">
            Hệ thống Định danh Vị trí Quốc gia
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
