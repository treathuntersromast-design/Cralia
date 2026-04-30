'use client';
/**
 * components/DeadlineCalculator.tsx
 *
 * 案件詳細ページ or プロフィール設定ページに埋め込むコンポーネント
 * - 依頼日・作業日数を入力
 * - API を叩いて納期を計算・カレンダーに登録
 * - スキップされた日付の理由を可視化
 */

import { useState } from 'react';
import { Calendar, AlertTriangle, CheckCircle2, Rocket } from 'lucide-react';

interface SkippedDay {
  date: string;
  reason: 'weekend' | 'holiday' | 'calendar_event' | 'off_day';
}

interface DeadlineResult {
  deadline: string;
  working_days: string[];
  skipped_days: SkippedDay[];
  calendar_events_registered: boolean;
  summary: string;
}

const REASON_LABEL: Record<SkippedDay['reason'], { label: string; color: string }> = {
  weekend:        { label: '土日',           color: 'var(--c-text-3)' },
  holiday:        { label: '祝日',           color: '#f9c74f' },
  calendar_event: { label: 'カレンダー不在', color: 'rgb(var(--brand-rgb))' },
  off_day:        { label: '対応外曜日',     color: '#4cc9f0' },
};

export default function DeadlineCalculator({ creatorId }: { creatorId: string }) {
  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [workingDays, setWorkingDays] = useState(10);
  const [result, setResult] = useState<DeadlineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calculate() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/deadline/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creatorId,
          request_date: requestDate,
          working_days_required: workingDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  // スキップ理由ごとに件数を集計
  const skipCounts = result?.skipped_days.reduce(
    (acc, s) => ({ ...acc, [s.reason]: (acc[s.reason as keyof typeof acc] ?? 0) + 1 }),
    {} as Record<SkippedDay['reason'], number>
  );

  return (
    <div style={styles.card}>
      <h2 style={{ ...styles.title, display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={20} aria-hidden /> 納期自動計算</h2>
      <p style={styles.sub}>
        Googleカレンダーの予定・祝日・対応曜日を考慮して納品日を自動算出します
      </p>

      {/* 入力フォーム */}
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>依頼日</label>
          <input
            type="date"
            value={requestDate}
            onChange={(e) => setRequestDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>作業日数</label>
          <div style={styles.inputRow}>
            <input
              type="number"
              min={1}
              max={180}
              value={workingDays}
              onChange={(e) => setWorkingDays(Number(e.target.value))}
              style={{ ...styles.input, width: '80px' }}
            />
            <span style={styles.unit}>営業日</span>
          </div>
        </div>
        <button
          onClick={calculate}
          disabled={loading}
          style={{ ...styles.btn, marginTop: '20px' }}
        >
          {loading ? '計算中...' : '納期を計算する'}
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div style={{ ...styles.errorBox, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden /> {error}
          {error.includes('連携') && (
            <a href="/api/auth/google" style={styles.link}>
              　→ Google カレンダーを連携する
            </a>
          )}
        </div>
      )}

      {/* 結果 */}
      {result && (
        <div style={styles.result}>
          {/* 納品日 強調表示 */}
          <div style={styles.deadlineBox}>
            <div style={styles.deadlineLabel}>確定納品日</div>
            <div style={styles.deadlineDate}>{formatDate(result.deadline)}</div>
            <div style={styles.deadlineSub}>
              依頼日 {formatDate(requestDate)} から {workingDays} 営業日
            </div>
          </div>

          {/* サマリー */}
          <p style={styles.summary}>{result.summary}</p>

          {/* スキップ理由の集計バッジ */}
          {skipCounts && Object.keys(skipCounts).length > 0 && (
            <div style={styles.badgeRow}>
              <span style={styles.badgeLabel}>スキップした日：</span>
              {(Object.entries(skipCounts) as [SkippedDay['reason'], number][]).map(
                ([reason, count]) => (
                  <span
                    key={reason}
                    style={{ ...styles.badge, background: REASON_LABEL[reason].color + '28', color: REASON_LABEL[reason].color }}
                  >
                    {REASON_LABEL[reason].label} {count}日
                  </span>
                )
              )}
            </div>
          )}

          {/* カレンダー登録確認 */}
          {result.calendar_events_registered && (
            <div style={{ ...styles.successBox, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} aria-hidden /> 作業期間と納品日をGoogleカレンダーに登録しました
            </div>
          )}

          {/* 稼働日一覧（折りたたみ） */}
          <details style={styles.details}>
            <summary style={styles.detailsSummary}>
              稼働日一覧（{result.working_days.length}日）
            </summary>
            <div style={styles.dayGrid}>
              {result.working_days.map((d, i) => (
                <span key={d} style={{
                  ...styles.dayChip,
                  background: d === result.deadline ? '#ff6b9d28' : '#ffffff10',
                  border: d === result.deadline ? '1px solid #ff6b9d' : '1px solid var(--c-border)',
                  color: d === result.deadline ? '#ff6b9d' : '#c0bfdf',
                  fontWeight: d === result.deadline ? 700 : 400,
                }}>
                  {i + 1}日目 {formatDate(d)}
                  {d === result.deadline ? <><Rocket size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} aria-hidden /></> : null}
                </span>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

// ── ユーティリティ ──────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getDay()]}）`;
}

// ── スタイル（CSS-in-JS） ─────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--c-surface)',
    border: '1px solid var(--c-border)',
    borderRadius: '16px',
    padding: '28px',
    fontFamily: "'Nunito', sans-serif",
    color: 'var(--c-text)',
    maxWidth: '640px',
  },
  title: { fontSize: '18px', fontWeight: 800, marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--c-text-3)', marginBottom: '24px' },
  row: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: 700, color: 'var(--c-text-3)' },
  input: {
    background: 'var(--c-input-bg)', border: '1.5px solid var(--c-border)', borderRadius: '10px',
    padding: '10px 14px', fontSize: '14px', color: 'var(--c-text)', outline: 'none',
  },
  inputRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  unit: { fontSize: '13px', color: 'var(--c-text-3)' },
  btn: {
    padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
    background: 'rgb(var(--brand-rgb))', color: '#fff',
    fontSize: '14px', fontWeight: 800, fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(30,64,255,0.25)',
  },
  errorBox: {
    marginTop: '16px', background: 'rgba(255,107,157,.1)', border: '1px solid rgba(255,107,157,.3)',
    borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'rgb(var(--brand-rgb))',
  },
  link: { color: 'rgb(var(--brand-rgb))' },
  result: { marginTop: '24px' },
  deadlineBox: {
    background: 'var(--c-accent-a12)',
    border: '1px solid var(--c-border)', borderRadius: '14px',
    padding: '20px', textAlign: 'center', marginBottom: '16px',
  },
  deadlineLabel: { fontSize: '12px', fontWeight: 700, color: 'rgb(var(--brand-rgb))', textTransform: 'uppercase', letterSpacing: '.06em' },
  deadlineDate: { fontSize: '32px', fontWeight: 900, margin: '8px 0 4px' },
  deadlineSub: { fontSize: '13px', color: 'var(--c-text-3)' },
  summary: { fontSize: '13px', color: 'var(--c-text-2)', marginBottom: '12px' },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' },
  badgeLabel: { fontSize: '12px', color: 'var(--c-text-3)', fontWeight: 700 },
  badge: { padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 },
  successBox: {
    background: 'rgba(144,190,109,.12)', border: '1px solid rgba(144,190,109,.3)',
    borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#90be6d', marginBottom: '12px',
  },
  details: { marginTop: '8px' },
  detailsSummary: { fontSize: '13px', color: 'var(--c-text-3)', cursor: 'pointer', fontWeight: 700 },
  dayGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' },
  dayChip: { padding: '5px 12px', borderRadius: '8px', fontSize: '12px' },
};
