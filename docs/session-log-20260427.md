# Cralia 開発セッションログ — 2026-04-27

---

## 概要

AI 依頼文アシスタントのシステムプロンプト拡充（著作権・ポートフォリオ・Meet 誘導ルール）、および Google Meet 予定アラートのダッシュボード表示機能を実装した。  
前セッションで実施したライトテーマへの変更は全ファイルを git checkout で差し戻し済み（ダーク統一を維持）。

---

## 実装内容

### 1. AI 依頼文アシスタント — システムプロンプト拡充

**ファイル**: `app/api/ai/request-draft/route.ts`

チェックリストに以下3点を追加・更新した。

#### 追加・変更チェック項目

| 番号 | 項目 | 変更種別 | 内容 |
|---|---|---|---|
| 11 | 著作権・権利帰属の明示 | 更新 | 「著作権譲渡（すべての権利を依頼者に移す）」か「利用許諾（クリエイターが著作権を保持し、使用権のみ付与）」のどちらかを明示するよう求める形に強化 |
| 14 | クリエイターによるポートフォリオ掲載の可否 | **新規追加** | クリエイターが成果物を自身のポートフォリオ・実績サイト・SNS 等に掲載することを依頼者が許可するかどうかを確認するチェックを追加 |
| 16 | 外部サイト・連絡先への誘導 | 更新 | Google Meet（ビデオ・音声通話）はクリエイターと依頼者の双方が合意した場合に限り誘導可と明示。それ以外の外部連絡先は引き続き禁止 |

#### 絶対に守るルール 更新内容

```
唯一の例外として、Google Meet（ビデオ・音声通話）は
クリエイターと依頼者の双方が合意した場合に限り誘導してよい。
その場合は「お互いに了承のうえ」という前置きとともに案内すること
```

チェック項目の通し番号は旧 15〜20 → 新 16〜21 に繰り下がっている。

---

### 2. ダッシュボード — Google Meet 予定アラート

Googleカレンダー連携済みのユーザーに対して、今後12時間以内に Google Meet 付きの予定がある場合、ダッシュボード上部にバナーを表示する機能を実装。

#### 新規ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `app/api/calendar/upcoming-meets/route.ts` | API ルート (GET) | 今から12時間以内の Meet 付きイベントを取得して返す |
| `components/UpcomingMeetBanner.tsx` | クライアントコンポーネント | バナー表示・Meet 参加リンク |

#### API: `/api/calendar/upcoming-meets`

- Google Calendar API に `hangoutLink` / `conferenceData` フィールドを追加して取得
- `timeMin = now`, `timeMax = now + 12h` で期間を絞る
- `hangoutLink` または `conferenceData.entryPoints[type=video].uri` を持つイベントのみ返す
- レスポンス: `{ meets: { id, title, start, hangoutLink }[] }`
- カレンダー未連携ユーザーには `{ meets: [] }` を返す（エラーにしない）
- トークン期限切れ時は既存の events ルートと同様に自動リフレッシュ

#### コンポーネント: `UpcomingMeetBanner`

- Props: `calConnected: boolean`（未連携なら API 呼び出し自体をスキップ）
- マウント時に `/api/calendar/upcoming-meets` を fetch
- Meet がなければ何も表示しない（`return null`）
- 複数の Meet がある場合は縦に並べて全件表示
- 各イベントに開始時刻・タイトル・「Meet に参加 →」リンクを表示

#### ダッシュボード組み込み

`app/dashboard/page.tsx` のウェルカムカード直後（稼働中プロジェクトの前）に `<UpcomingMeetBanner calConnected={calConnected} />` を配置。  
`calConnected` は既存の `calTokenRows` から取得済みのため追加クエリなし。

---

## その他（セッション冒頭の確認事項）

### MCP サーバー追加コマンド

ユーザーから `claude mcp add --transport http exa "mcp.exa.ai/mcp"` の実行を依頼されたが、拡張機能内のサンドボックス環境では `claude` CLI が PATH に存在しないため実行不可。ユーザーに対してターミナル（拡張機能の外）から直接実行するよう案内した。

---

## 変更ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `app/api/ai/request-draft/route.ts` | 更新（SYSTEM_PROMPT 拡充） |
| `app/api/calendar/upcoming-meets/route.ts` | 新規作成 |
| `components/UpcomingMeetBanner.tsx` | 新規作成 |
| `app/dashboard/page.tsx` | 更新（UpcomingMeetBanner インポート・配置） |

---

## 次回セッションへの引き継ぎ事項

- Meet アラートは Google Calendar 連携済みユーザーのみ動作する。未連携ユーザーへのフォールバックはバナー非表示（現状維持）
- `app/request-draft/`・`app/api/auth/me/`・`app/api/ai/request-draft-guest/` は未コミットの untracked ファイルとして存在している（前セッションで作成）。コミット対象に含めるか確認が必要
