'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Save } from 'lucide-react'

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cấu hình Hệ thống</h1>
        <p className="text-gray-500 mt-1">
          Quản lý thiết lập và tham số hệ thống
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quy trình phê duyệt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Thời gian SLA (giờ)
            </label>
            <input
              type="number"
              defaultValue={48}
              className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Thời gian tối đa để xử lý một khảo sát
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Tự động phê duyệt
            </label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="ml-2 text-sm text-gray-700">
                  Tự động phê duyệt nếu đầy đủ thông tin
                </span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="ml-2 text-sm text-gray-700">
                  Yêu cầu xác nhận từ 2 người
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trường dữ liệu bắt buộc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Tên vị trí</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Địa chỉ</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Tên chủ sở hữu</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Số CMND/CCCD</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Số điện thoại</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Hình ảnh</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cấu hình Bản đồ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Tile Server URL
            </label>
            <input
              type="text"
              defaultValue="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Zoom mặc định
            </label>
            <input
              type="number"
              defaultValue={6}
              min={1}
              max={20}
              className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quy tắc mã định danh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Số thứ tự bắt đầu
            </label>
            <input
              type="number"
              defaultValue={1}
              className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Định dạng
            </label>
            <input
              type="text"
              defaultValue="PP-DD-CC-NNNNNN"
              disabled
              className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 bg-gray-50 font-mono"
            />
            <p className="text-sm text-gray-500 mt-1">
              PP: Tỉnh, DD: Huyện, CC: Xã, NNNNNN: Số thứ tự
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Lưu cấu hình
        </Button>
      </div>
    </div>
  )
}
