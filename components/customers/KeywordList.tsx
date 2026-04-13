'use client';

import { useState } from 'react';

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
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">
        ステップ3: 監視キーワード
      </h3>
      <div className="space-y-2 mb-4">
        {keywords.map((kw, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
            <span className="text-sm font-medium flex-1">{kw.keyword}</span>
            <span className="text-xs text-gray-400 flex-1">{kw.target_url || '-'}</span>
            <button
              onClick={() => removeKeyword(i)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              削除
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="例：外壁塗装 名古屋"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
        />
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="例：https://example.co.jp/price/（任意）"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
        />
        <button
          type="button"
          onClick={addKeyword}
          className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700"
        >
          追加
        </button>
      </div>
    </div>
  );
}
