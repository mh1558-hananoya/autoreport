'use client';

import { useRef, useEffect, useState } from 'react';

interface EmailPreviewProps {
  subject: string;
  bodyHtml: string;
  email: string;
}

export default function EmailPreview({ subject, bodyHtml, email }: EmailPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          setHeight(doc.body.scrollHeight + 40);
        }
      } catch {
        // cross-origin の場合は無視
      }
    };

    iframe.addEventListener('load', adjustHeight);
    return () => iframe.removeEventListener('load', adjustHeight);
  }, [bodyHtml]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-md p-4 space-y-2">
        <div className="flex text-sm">
          <span className="text-gray-500 w-16">宛先:</span>
          <span>{email}</span>
        </div>
        <div className="flex text-sm">
          <span className="text-gray-500 w-16">件名:</span>
          <span className="font-medium">{subject}</span>
        </div>
      </div>
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <iframe
          ref={iframeRef}
          srcDoc={bodyHtml}
          className="w-full bg-white"
          style={{ height: `${height}px` }}
          title="メールプレビュー"
        />
      </div>
    </div>
  );
}
