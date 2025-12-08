import Link from "next/link";
import { MapPin, Users, Shield, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl w-full text-center">
        {/* Government Header */}
        {/* <div className="mb-8">
          <p className="text-sm text-slate-500 tracking-wide mb-1">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Độc lập - Tự do - Hạnh phúc
          </p>
          <div className="w-16 h-0.5 bg-red-600 mx-auto mb-8"></div>
        </div> */}

        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight">
          Hệ thống Định danh Vị trí Quốc gia
        </h1>
        <p className="text-lg text-slate-500 mb-4">
          Cục Cảnh sát Quản lý Hành chính về Trật tự Xã hội - C06
        </p>
        <p className="text-slate-400 mb-12 max-w-2xl mx-auto">
          Nền tảng quản lý và chuẩn hóa thông tin địa điểm trên phạm vi toàn quốc
        </p>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            href="/login"
            className="group bg-white rounded-xl border border-slate-200 p-6 transition-all hover:shadow-lg hover:border-blue-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:bg-blue-100 transition-colors">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              Cán bộ Xã/Phường
            </h2>
            <p className="text-sm text-slate-500">
              Tiếp nhận và xử lý phiếu khảo sát từ ứng dụng di động
            </p>
          </Link>

          <Link
            href="/login"
            className="group bg-white rounded-xl border border-slate-200 p-6 transition-all hover:shadow-lg hover:border-orange-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:bg-orange-100 transition-colors">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              Giám sát viên
            </h2>
            <p className="text-sm text-slate-500">
              Kiểm tra và phê duyệt đề xuất từ cán bộ cấp xã/phường
            </p>
          </Link>

          <Link
            href="/login"
            className="group bg-white rounded-xl border border-slate-200 p-6 transition-all hover:shadow-lg hover:border-red-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:bg-red-100 transition-colors">
              <BarChart3 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              Quản trị Trung ương
            </h2>
            <p className="text-sm text-slate-500">
              Quản lý toàn quốc, cấp mã định danh và thống kê báo cáo
            </p>
          </Link>
        </div>

        {/* Login Button */}
        <Link
          href="/login"
          className="inline-flex items-center justify-center bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
        >
          Đăng nhập hệ thống
        </Link>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            © 2024 Bộ Công an Việt Nam. Bản quyền được bảo lưu.
          </p>
        </div>
      </div>
    </main>
  );
}
