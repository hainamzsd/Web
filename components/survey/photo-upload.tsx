'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface PhotoUploadProps {
  surveyId: string
  existingPhotos?: string[]
  onPhotosChange?: (photos: string[]) => void
  maxPhotos?: number
  disabled?: boolean
}

export function PhotoUpload({
  surveyId,
  existingPhotos = [],
  onPhotosChange,
  maxPhotos = 10,
  disabled = false
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (photos.length + files.length > maxPhotos) {
      alert(`Chỉ được tải lên tối đa ${maxPhotos} ảnh`)
      return
    }

    setUploading(true)

    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${surveyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('survey-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error('Upload error:', error)
          alert(`Lỗi tải lên ${file.name}: ${error.message}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('survey-photos')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      }

      const newPhotos = [...photos, ...uploadedUrls]
      setPhotos(newPhotos)
      onPhotosChange?.(newPhotos)

      // Update survey record with new photos
      await supabase
        .from('survey_locations')
        .update({ photos: newPhotos })
        .eq('id', surveyId)

    } catch (error) {
      console.error('Error uploading photos:', error)
      alert('Có lỗi xảy ra khi tải ảnh lên')
    } finally {
      setUploading(false)
      setUploadProgress({})
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = async (photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/survey-photos/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]

        // Delete from storage
        const { error } = await supabase.storage
          .from('survey-photos')
          .remove([filePath])

        if (error) {
          console.error('Delete error:', error)
        }
      }

      // Update local state
      const newPhotos = photos.filter(p => p !== photoUrl)
      setPhotos(newPhotos)
      onPhotosChange?.(newPhotos)

      // Update survey record
      await supabase
        .from('survey_locations')
        .update({ photos: newPhotos })
        .eq('id', surveyId)

    } catch (error) {
      console.error('Error removing photo:', error)
      alert('Có lỗi xảy ra khi xóa ảnh')
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {!disabled && photos.length < maxPhotos && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Chọn ảnh từ thiết bị
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate">{fileName}</span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photoUrl, index) => (
            <div key={photoUrl} className="relative group aspect-square">
              <Image
                src={photoUrl}
                alt={`Survey photo ${index + 1}`}
                fill
                className="object-cover rounded-lg border-2 border-gray-200"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photoUrl)}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {index + 1}/{photos.length}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {disabled ? 'Chưa có ảnh nào' : 'Chưa có ảnh. Nhấn nút bên trên để tải ảnh lên.'}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Tối đa {maxPhotos} ảnh
          </p>
        </div>
      )}

      {/* Photo Counter */}
      {photos.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ImageIcon className="h-4 w-4" />
          <span>
            {photos.length}/{maxPhotos} ảnh
          </span>
        </div>
      )}
    </div>
  )
}
