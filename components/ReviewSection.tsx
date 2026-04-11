'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EvaluationReportModal from './EvaluationReportModal'
import { VALIDATION } from '@/lib/constants/validation'

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_id: string
  reviewee_id: string
  review_type: string
}

export default function ReviewSection({
  orderId,
  isClient,
  isCreator,
  isCompleted,
  currentUserId,
  clientId,
  creatorId,
  initialReviews,
}: {
  orderId:        string
  isClient:       boolean
  isCreator:      boolean
  isCompleted:    boolean
  currentUserId:  string
  clientId:       string
  creatorId:      string
  initialReviews: Review[]
}) {
  const router = useRouter()
  const [reviews,        setReviews]        = useState<Review[]>(initialReviews)
  const [rating,         setRating]         = useState(0)
  const [hovered,        setHovered]        = useState(0)
  const [comment,        setComment]        = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [submitted,      setSubmitted]      = useState(false)
  const [reportReviewId, setReportReviewId] = useState<string | null>(null)

  // 自分が出す評価の reviewee_id と review_type を決定
  const myReviewType = isClient ? 'order_to_creator' : 'order_to_client'
  const myRevieweeId = isClient ? creatorId : clientId

  const hasReviewed = reviews.some(
    (r) => r.reviewer_id === currentUserId && r.review_type === myReviewType
  )
  const canReview = isCompleted && (isClient || isCreator) && !hasReviewed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) { setError('評価を選択してください'); return }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, rating, comment: comment.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '評価の投稿に失敗しました')
      setLoading(false)
      return
    }

    const resFetch = await fetch(`/api/reviews?orderId=${orderId}`)
    if (resFetch.ok) {
      const d = await resFetch.json()
      setReviews(d.reviews ?? [])
    }

    setSubmitted(true)
    setLoading(false)
    router.refresh()
  }

  const reviewLabel = isClient ? 'このクリエイターへの評価を投稿' : 'この依頼者への評価を投稿'

  return (
    <>
      <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
        <h2 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 20px' }}>評価</h2>

        {/* 既存評価一覧 */}
        {reviews.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: canReview ? '24px' : '0' }}>
            {reviews.map((r) => {
              const typeLabel = r.review_type === 'order_to_creator' ? '依頼者からの評価'
                              : r.review_type === 'order_to_client'  ? 'クリエイターからの評価'
                              : 'メンバーからの評価'
              const isMyReview = r.reviewee_id === currentUserId
              return (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <StarDisplay rating={r.rating} />
                      <span style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {typeLabel}
                      </span>
                      <span style={{ color: '#5c5b78', fontSize: '12px' }}>
                        {new Date(r.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    {isMyReview && (
                      <button
                        onClick={() => setReportReviewId(r.id)}
                        style={{
                          padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(248,113,113,0.3)',
                          background: 'rgba(248,113,113,0.06)', color: '#f87171',
                          fontSize: '11px', cursor: 'pointer',
                        }}
                      >
                        報告する
                      </button>
                    )}
                  </div>
                  {r.comment && (
                    <p style={{ color: '#d0cfea', fontSize: '14px', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{r.comment}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {reviews.length === 0 && !canReview && (
          <p style={{ color: '#5c5b78', fontSize: '14px', margin: 0 }}>まだ評価はありません</p>
        )}

        {/* 評価投稿フォーム */}
        {canReview && !submitted && (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#a9a8c0', fontSize: '13px', fontWeight: '600', margin: '0 0 12px' }}>{reviewLabel}</p>

            {/* 星評価 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    fontSize: '28px', lineHeight: 1,
                    filter: (hovered || rating) >= s ? 'none' : 'grayscale(1) opacity(0.3)',
                    transform: hovered === s ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.1s',
                  }}
                  aria-label={`${s}星`}
                >
                  ⭐
                </button>
              ))}
              {(hovered || rating) > 0 && (
                <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '700', alignSelf: 'center', marginLeft: '4px' }}>
                  {['', '悪い', 'やや悪い', '普通', '良い', 'とても良い'][hovered || rating]}
                </span>
              )}
            </div>

            {/* コメント */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`コメント（任意・${VALIDATION.REVIEW_COMMENT_MAX}文字以内）`}
              maxLength={VALIDATION.REVIEW_COMMENT_MAX}
              rows={4}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1px solid rgba(199,125,255,0.25)', background: 'rgba(255,255,255,0.05)',
                color: '#f0eff8', fontSize: '14px', lineHeight: '1.6', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <p style={{ color: '#5c5b78', fontSize: '12px', margin: '4px 0 12px', textAlign: 'right' }}>{comment.length}/{VALIDATION.REVIEW_COMMENT_MAX}</p>

            {error && (
              <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || rating === 0}
              style={{
                padding: '12px 28px', borderRadius: '10px', border: 'none',
                background: loading || rating === 0 ? 'rgba(199,125,255,0.3)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                color: '#fff', fontSize: '14px', fontWeight: '700',
                cursor: loading || rating === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '投稿中...' : '評価を投稿する'}
            </button>
          </form>
        )}

        {submitted && (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#4ade80', fontWeight: '700', fontSize: '14px', margin: 0 }}>✅ 評価を投稿しました</p>
          </div>
        )}
      </div>

      {/* 報告モーダル */}
      {reportReviewId && (
        <EvaluationReportModal
          reviewId={reportReviewId}
          onClose={() => setReportReviewId(null)}
        />
      )}
    </>
  )
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: '16px', filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.25)' }}>
          ⭐
        </span>
      ))}
    </div>
  )
}
