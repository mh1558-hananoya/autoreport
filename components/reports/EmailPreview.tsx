'use client';

interface EmailPreviewProps {
  subject: string;
  bodyHtml: string;
  email: string;
}

export default function EmailPreview({ subject, bodyHtml, email }: EmailPreviewProps) {
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
          srcDoc={bodyHtml}
          className="w-full min-h-[600px] bg-white"
          title="メールプレビュー"
        />
      </div>
    </div>
  );
}
