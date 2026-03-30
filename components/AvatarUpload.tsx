'use client'

import { useState, useRef } from 'react'

interface Props {
  currentUrl: string | null
  displayName: string
  size?: number
  onUploaded?: (url: string) => void
  readonly?: boolean
}

export default function AvatarUpload({ currentUrl, displayName, size = 80, onUploaded, readonly = false }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const initial = displayName ? displayName[0].toUpperCase() : '?'

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ローカルプレビュー
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'アップロードに失敗しました')
      setPreview(data.avatarUrl)
      onUploaded?.(data.avatarUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
      setPreview(currentUrl)
    } finally {
      setUploading(false)
      // input をリセットして同じファイルを再選択できるようにする
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        onClick={() => { if (!readonly && !uploading) inputRef.current?.click() }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #ff6b9d, #c77dff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.4,
          fontWeight: '700',
          color: '#fff',
          cursor: readonly ? 'default' : 'pointer',
          border: readonly ? 'none' : '2px solid rgba(199,125,255,0.4)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initial
        )}
        {!readonly && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: uploading ? 1 : 0,
            transition: 'opacity 0.2s',
            borderRadius: '50%',
          }}
            onMouseEnter={(e) => { if (!uploading) (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
            onMouseLeave={(e) => { if (!uploading) (e.currentTarget as HTMLDivElement).style.opacity = '0' }}
          >
            {uploading
              ? <span style={{ color: '#fff', fontSize: '12px' }}>...</span>
              : <span style={{ color: '#fff', fontSize: '20px' }}>📷</span>
            }
          </div>
        )}
      </div>

      {!readonly && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            background: 'none',
            border: 'none',
            color: uploading ? '#7c7b99' : '#c77dff',
            fontSize: '12px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {uploading ? 'アップロード中...' : '画像を変更'}
        </button>
      )}

      {error && (
        <p style={{ color: '#ff6b9d', fontSize: '12px', margin: 0, textAlign: 'center' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
