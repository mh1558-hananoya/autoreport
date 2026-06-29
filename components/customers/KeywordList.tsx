'use client';

import { useState } from 'react';
import { inputClass, SectionTitle, btnSecondary } from '@/components/ui/kit';

interface Keyword {
  keyword: string;
  target_url: string;
}

interface KeywordListProps {
  keywords: Keyword[];
  onChange: (keywords: Keyword[]) => void;
}

export default function KeywordList({ keywords, onChange }: KeywordListProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    onChange([...keywords, { keyword: newKeyword.trim(), target_url: newUrl.trim() }]);
    setNewKeyword('');
    setNewUrl('');
  };

  const removeKeyword = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index));
  };

  return (
    <div>
      <SectionTitle
        hint={
          <>
            この顧客のサイトで上位表示を狙うキーワードを登録します。登録すると、毎月のレポートで
            <strong className="font-medium text-foreground">検索順位の推移</strong>
            を自動で追跡・報告します。
            <br />
            ターゲットURL（任意）は、そのキーワードで上位化させたいページのURLです。例：「外壁塗装 名古屋」で料金ページを上げたいなら、料金ページのURLを指定します。
          </>
        }
      >
        ステップ3: 監視キーワード
      </SectionTitle>
      {keywords.length > 0 && (
        <div className="mb-4 space-y-2">
          {keywords.map((kw, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-3 py-2"
            >
              <span className="flex-1 text-sm font-medium text-foreground">{kw.keyword}</span>
              <span className="flex-1 truncate text-xs text-faint">{kw.target_url || '—'}</span>
              <button
                onClick={() => removeKeyword(i)}
                className="text-xs font-medium text-muted transition-colors hover:text-accent"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={inputClass}
          placeholder="例：外壁塗装 名古屋"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
        />
        <input
          className={inputClass}
          placeholder="例：https://example.co.jp/price/（任意）"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
        />
        <button type="button" onClick={addKeyword} className={`${btnSecondary} shrink-0`}>
          追加
        </button>
      </div>
    </div>
  );
}
