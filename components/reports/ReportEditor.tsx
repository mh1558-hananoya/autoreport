'use client';

import { ClaudeReportResponse } from '@/lib/types';
import SectionEditor from './SectionEditor';
import ProposalList from './ProposalList';

interface ReportEditorProps {
  report: ClaudeReportResponse;
  subject: string;
  onSubjectChange: (subject: string) => void;
  onChange: (report: ClaudeReportResponse) => void;
  onRegenerateSection: (section: string) => Promise<void>;
}

export default function ReportEditor({
  report,
  subject,
  onSubjectChange,
  onChange,
  onRegenerateSection,
}: ReportEditorProps) {
  return (
    <div className="space-y-4">
      <SectionEditor
        label="件名"
        value={subject}
        onChange={onSubjectChange}
      />

      <SectionEditor
        label="サマリー"
        value={report.summary}
        onChange={(v) => onChange({ ...report, summary: v })}
        onRegenerate={() => onRegenerateSection('summary')}
        multiline
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">良かった点</label>
          <button
            type="button"
            onClick={() => onRegenerateSection('good_points')}
            className="text-xs text-accent hover:underline"
          >
            このセクションだけ再生成
          </button>
        </div>
        {report.good_points.map((point, i) => (
          <textarea
            key={i}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            rows={2}
            value={point}
            onChange={(e) => {
              const updated = [...report.good_points];
              updated[i] = e.target.value;
              onChange({ ...report, good_points: updated });
            }}
          />
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">気になる点</label>
          <button
            type="button"
            onClick={() => onRegenerateSection('concern_points')}
            className="text-xs text-accent hover:underline"
          >
            このセクションだけ再生成
          </button>
        </div>
        {report.concern_points.map((point, i) => (
          <textarea
            key={i}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            rows={2}
            value={point}
            onChange={(e) => {
              const updated = [...report.concern_points];
              updated[i] = e.target.value;
              onChange({ ...report, concern_points: updated });
            }}
          />
        ))}
      </div>

      {report.alert_level === 3 && report.alert_message ? (
        <SectionEditor
          label="アラートメッセージ（L3）"
          value={report.alert_message}
          onChange={(v) => onChange({ ...report, alert_message: v })}
          multiline
        />
      ) : (
        <ProposalList
          proposals={report.proposals}
          onChange={(proposals) => onChange({ ...report, proposals })}
        />
      )}
    </div>
  );
}
