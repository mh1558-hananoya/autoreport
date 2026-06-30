// 依存を追加しない簡易CSVパーサ。
// ダブルクォート囲み・"" エスケープ・クォート内のカンマ/改行に対応する。
export function parseCsv(text: string): string[][] {
  // 先頭のBOM（Excel書き出しCSVに付く）を除去
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // エスケープされた "" を1つの " として扱う
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // CRLFのCRは無視
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  // 末尾の行（改行で終わっていない場合）を取りこぼさない
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // 全セルが空の行（空行）は除外
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
