/**
 * Google Drive の共有URL を埋め込み用URL に変換
 *
 * 入力: https://drive.google.com/file/d/{ID}/view?usp=...
 *       https://drive.google.com/file/d/{ID}/edit
 *       https://drive.google.com/open?id={ID}
 * 出力: https://drive.google.com/file/d/{ID}/preview
 */
export function googleDriveUrlToEmbed(url: string): string | null {
  if (!url) return null;

  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) {
    return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
  }

  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) {
    return `https://drive.google.com/file/d/${queryMatch[1]}/preview`;
  }

  return null;
}

/** 現在の会計年度を返す（4月〜翌3月） */
export function getCurrentFiscalYear(): number {
  const now = new Date();
  return now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}
