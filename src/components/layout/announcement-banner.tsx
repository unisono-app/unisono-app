/**
 * 開発者からのユーザー向けお知らせバナー（ヘッダー直下に帯状で表示）。
 *
 * 環境変数 `ANNOUNCEMENT_MESSAGE` に文言をセットすると表示され、空／未設定なら非表示。
 * `ANNOUNCEMENT_LEVEL="warning"` で警告色、それ以外は情報色。
 * サーバーコンポーネントで process.env を読むため、値の変更は再デプロイで反映される。
 */
export function AnnouncementBanner() {
  const message = process.env.ANNOUNCEMENT_MESSAGE?.trim();
  if (!message) return null;

  const isWarning = process.env.ANNOUNCEMENT_LEVEL === "warning";
  return (
    <div
      role="status"
      className={`border-b px-4 py-2 text-center text-sm ${
        isWarning
          ? "border-yellow-200 bg-yellow-50 text-yellow-800"
          : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      {message}
    </div>
  );
}
