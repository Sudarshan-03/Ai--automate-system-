import React from 'react';
import { AIOpportunityAnalysis } from '../types';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, Landmark } from 'lucide-react';

interface AIIntelligenceBadgeProps {
  analysis?: AIOpportunityAnalysis | null;
  onOpenReport: () => void;
}

export const AIIntelligenceBadge: React.FC<AIIntelligenceBadgeProps> = ({
  analysis,
  onOpenReport
}) => {
  if (!analysis) {
    return (
      <button
        onClick={onOpenReport}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold transition-all hover:scale-[1.02]"
      >
        <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
        <span>Run Gemini Audit</span>
      </button>
    );
  }

  const getCategoryColor = () => {
    switch (analysis.recommendationCategory) {
      case 'Excellent Match':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Good Match':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'Needs Review':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Not Recommended':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={onOpenReport}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-transform hover:scale-[1.03] ${getCategoryColor()}`}
      >
        <Sparkles className="w-2.5 h-2.5" />
        <span>{analysis.matchScore}% {analysis.recommendationCategory}</span>
      </button>

      {analysis.paymentVerification.matchesUserPreference && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" title="Direct Indian Bank Transfer Supported">
          <Landmark className="w-2.5 h-2.5" />
          <span>Bank Transfer</span>
        </span>
      )}

      {analysis.riskAssessment.riskLevel === 'Low' ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          <ShieldCheck className="w-2.5 h-2.5" />
          <span>Low Risk</span>
        </span>
      ) : analysis.riskAssessment.riskLevel === 'Critical' || analysis.riskAssessment.riskLevel === 'High' ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold">
          <ShieldAlert className="w-2.5 h-2.5" />
          <span>{analysis.riskAssessment.riskLevel} Risk</span>
        </span>
      ) : null}
    </div>
  );
};
