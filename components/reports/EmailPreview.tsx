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
      <dl className="space-y-2 rounded-lg border border-border bg-surface-muted/50 p-4">
        <div className="flex text-sm">
          <dt className="w-16 shrink-0 text-muted">宛先</dt>
          <dd className="tabular text-foreground">{email}</dd>
        </div>
        <div className="flex text-sm">
          <dt className="w-16 shrink-0 text-muted">件名</dt>
          <dd className="font-medium text-foreground">{subject}</dd>
        </div>
      </dl>
      <div className="overflow-hidden rounded-lg border border-border">
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
