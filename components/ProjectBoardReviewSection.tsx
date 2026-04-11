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
}

type Member = {
  userId: string
  name:   string
}

type MemberEval = {
  revieweeId: string
  rating:     number
  comment:    string
}

export default function ProjectBoardReviewSection({
  boardId,
  isCompleted,
  currentUserId,
  members,
  initialReviews,
}: {
  boardId:        string
  isCompleted:    boolean
  currentUserId:  string
  members:        Member[]
  initialReviews: Review[]
}) {
  const router = useRouter()

  const otherMembers = members.filter((m) => m.userId !== currentUserId)

  // 自分が既に投稿済みかチェック
  const hasReviewed = initialReviews.some((r) => r.reviewer_id === currentUserId)
  const canReview   = isCompleted && otherMembers.length > 0 && !hasReviewed

  // 各メンバーへの評価フォームを初期化
  const [evals, setEvals] = useState<Record<string, MemberEval>>(
    Object.fromEntries(otherMembers.map((m) => [m.userId, { revieweeId: m.userId, rating: 0, comment: '' }]))
  )
  const [hoveredMap,   setHoveredMap]   = useState<Record<string, number>>({})
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [submitted,    setSubmitted]    = useState(false)
  const [reportReviewId, setReportReviewId] = useState<string | null>(null)

  const allRated = otherMembers.every((m) => (evals[m.userId]?.rating ?? 0) > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allRated) { setError('全メンバーへの評価（星）を入力してください'); return }
    setLoading(true)
    setError(null)

    const evaluations = otherMembers.map((m) => ({
      revieweeId: m.userId,
      rating:     evals[m.userId].rating,
      comment:    evals[m.userId].comment.trim() || null,
    }))

    const res = await fetch('/api/reviews/project-board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, evaluations }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '評価の投稿に失敗しました')
      setLoading(false)
      return
    }
    setSubmitted(true)
    setLoading(false)
    router.refresh()
  }

  // 評価の表示用: reviewee_id に対する表示名を解決
  const memberNameMap = Object.fromEntries(members.map((m) => [m.userId, m.name]))

  // 評価者別にグループ化して表示（自分が受けた評価のみ報告ボタン付き）
  const myReceivedReviews = initialReviews.filter((r) => r.reviewee_id === currentUserId)

  return (
    <>
      <div style={{ background: 'rgba(22,22,31,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
        <h2 style={{ color: '#7c7b99', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 4px' }}>
          メンバー評価
        </h2>
        <p style={{ color: '#5c5b78', fontSize: '12px', margin: '0 0 20px' }}>
          プロジェクト完了後の相互評価（評価しない / 全員評価するの二択）
        </p>

        {/* 自分への評価一覧 */}
        {myReceivedReviews.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: '#7c7b99', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 10px' }}>
              自分への評価
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myReceivedReviews.map((r) => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: r.comment ? '8px' : '0', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StarDisplay rating={r.rating} />
                      <span style={{ color: '#5c5b78', fontSize: '12px' }}>
                        {new Date(r.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
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
                  </div>
                  {r.comment && (
                    <p style={{ color: '#d0cfea', fontSize: '14px', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 自分が出した評価の確認 */}
        {hasReviewed && (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ color: '#4ade80', fontWeight: '700', fontSize: '14px', margin: 0 }}>✅ メンバー評価を投稿済みです</p>
          </div>
        )}

        {/* 評価フォーム */}
        {canReview && !submitted && (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#a9a8c0', fontSize: '13px', fontWeight: '600', margin: '0 0 16px' }}>
              全メンバーを一括評価（{otherMembers.length}名）
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
              {otherMembers.map((member) => {
                const ev = evals[member.userId]
                const h  = hoveredMap[member.userId] ?? 0
                return (
                  <div key={member.userId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                    <p style={{ color: '#f0eff8', fontSize: '14px', fontWeight: '700', margin: '0 0 10px' }}>
                      {member.name}
                    </p>

                    {/* 星評価 */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEvals((prev) => ({ ...prev, [member.userId]: { ...prev[member.userId], rating: s } }))}
                          onMouseEnter={() => setHoveredMap((prev) => ({ ...prev, [member.userId]: s }))}
                          onMouseLeave={() => setHoveredMap((prev) => ({ ...prev, [member.userId]: 0 }))}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                            fontSize: '24px', lineHeight: 1,
                            filter: (h || ev.rating) >= s ? 'none' : 'grayscale(1) opacity(0.3)',
                            transform: h === s ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.1s',
                          }}
                          aria-label={`${s}星`}
                        >
                          ⭐
                        </button>
                      ))}
                      {(h || ev.rating) > 0 && (
                        <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '700', alignSelf: 'center', marginLeft: '4px' }}>
                          {['', '悪い', 'やや悪い', '普通', '良い', 'とても良い'][h || ev.rating]}
                        </span>
                      )}
                    </div>

                    {/* コメント */}
                    <textarea
                      value={ev.comment}
                      onChange={(e) => setEvals((prev) => ({ ...prev, [member.userId]: { ...prev[member.userId], comment: e.target.value } }))}
                      placeholder={`コメント（任意・${VALIDATION.REVIEW_COMMENT_MAX}文字以内）`}
                      maxLength={VALIDATION.REVIEW_COMMENT_MAX}
                      rows={2}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                        border: '1px solid rgba(199,125,255,0.2)', background: 'rgba(255,255,255,0.04)',
                        color: '#f0eff8', fontSize: '13px', lineHeight: '1.5', resize: 'vertical',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <p style={{ color: '#5c5b78', fontSize: '11px', margin: '3px 0 0', textAlign: 'right' }}>
                      {ev.comment.length}/{VALIDATION.REVIEW_COMMENT_MAX}
                    </p>
                  </div>
                )
              })}
            </div>

            {error && (
              <p style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={loading || !allRated}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                  background: loading || !allRated ? 'rgba(199,125,255,0.3)' : 'linear-gradient(135deg, #ff6b9d, #c77dff)',
                  color: '#fff', fontSize: '14px', fontWeight: '700',
                  cursor: loading || !allRated ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '投稿中...' : `全員（${otherMembers.length}名）を一括評価する`}
              </button>
            </div>
            <p style={{ color: '#5c5b78', fontSize: '12px', margin: '8px 0 0' }}>
              ※ 一部だけの評価は受け付けていません。全員分の星評価を入力してから投稿してください。
            </p>
          </form>
        )}

        {submitted && (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#4ade80', fontWeight: '700', fontSize: '14px', margin: 0 }}>✅ メンバー評価を投稿しました</p>
          </div>
        )}

        {!isCompleted && (
          <p style={{ color: '#5c5b78', fontSize: '13px', margin: 0 }}>プロジェクト完了後に評価できます</p>
        )}

        {isCompleted && otherMembers.length === 0 && (
          <p style={{ color: '#5c5b78', fontSize: '13px', margin: 0 }}>評価できるメンバーがいません</p>
        )}
      </div>

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
        <span key={s} style={{ fontSize: '15px', filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.25)' }}>
          ⭐
        </span>
      ))}
    </div>
  )
}
