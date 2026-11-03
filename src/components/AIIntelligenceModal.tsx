import React, { useState } from 'react';
import { 
  AIOpportunityAnalysis, 
  OpportunityRecord, 
  ProfileRecord,
  IndiaEligibilityStatus,
  RecommendationCategory,
  RiskLevel
} from '../types';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Building2, 
  ExternalLink, 
  RefreshCw, 
  Plus, 
  Banknote, 
  HelpCircle,
  Clock,
  ArrowRight,
  Landmark,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react';
import { runOpportunityIntelligence, persistAIAnalysisToDatabase } from '../services/geminiIntelligence';

interface AIIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityRecord | null;
  profile: ProfileRecord;
  currentAnalysis: AIOpportunityAnalysis | null;
  onAnalysisUpdated: (opportunityId: string, analysis: AIOpportunityAnalysis) => void;
  onTrackInPipeline: (opportunity: OpportunityRecord) => void;
  onOpenPrep?: (opportunity: OpportunityRecord) => void;
}

export const AIIntelligenceModal: React.FC<AIIntelligenceModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  profile,
  currentAnalysis,
  onAnalysisUpdated,
  onTrackInPipeline,
  onOpenPrep
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !opportunity) return null;

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runOpportunityIntelligence(opportunity, profile);
      onAnalysisUpdated(opportunity.id, result);
      // Persist to database
      await persistAIAnalysisToDatabase(profile.id, opportunity.id, result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate AI Opportunity Intelligence audit');
    } finally {
      setLoading(false);
    }
  };

  const analysis = currentAnalysis;

  // Helper styles
  const getCategoryBadge = (cat?: RecommendationCategory) => {
    switch (cat) {
      case 'Excellent Match':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Good Match':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'Needs Review':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Not Recommended':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getIndiaBadge = (status?: IndiaEligibilityStatus) => {
    switch (status) {
      case 'Confirmed available in India':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          label: 'Confirmed Available in India'
        };
      case 'Conditional':
        return {
          icon: AlertTriangle,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          label: 'Conditional India Access'
        };
      case 'Not available':
        return {
          icon: X,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          label: 'Not Available in India'
        };
      default:
        return {
          icon: HelpCircle,
          color: 'text-slate-400 bg-slate-800/80 border-slate-700',
          label: 'Unverified Regional Status'
        };
    }
  };

  const getRiskBadge = (level?: RiskLevel) => {
    switch (level) {
      case 'Low':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'High':
      case 'Critical':
        return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const indiaInfo = getIndiaBadge(analysis?.indiaEligibility);
  const IndiaIcon = indiaInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#0d1424] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="p-5 md:p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-950/60 via-[#0d1424] to-[#0d1424] flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Gemini Opportunity Intelligence
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-medium">{opportunity.platform?.name || 'Verified Platform'}</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
              {opportunity.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!analysis && !loading && (
            <div className="text-center py-12 px-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-bold text-base text-white">No AI Audit Generated Yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Run Gemini Opportunity Intelligence to evaluate match percentage, verify Indian bank transfer compatibility, and detect scam risks.
                </p>
              </div>
              <button
                onClick={handleRunAnalysis}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 mx-auto transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Run Gemini Deep Analysis</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white">Auditing with Gemini Intelligence...</p>
                <p className="text-xs text-slate-400">Verifying Indian banking routes, fee policies, and skills overlap.</p>
              </div>
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Top Score & Verdict Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Match Score Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-medium">Match Score</span>
                  <div className="flex items-baseline gap-2 my-2">
                    <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {analysis.matchScore}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        analysis.matchScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' :
                        analysis.matchScore >= 60 ? 'bg-gradient-to-r from-cyan-500 to-indigo-500' :
                        'bg-gradient-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${analysis.matchScore}%` }}
                    />
                  </div>
                </div>

                {/* Recommendation Category */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-medium">Recommendation Category</span>
                  <div className="my-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${getCategoryBadge(analysis.recommendationCategory)}`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      {analysis.recommendationCategory}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate">
                    {analysis.explanation.isWorthApplying ? '✓ Recommended to apply' : '⚠ Caution advised'}
                  </span>
                </div>

                {/* India Regional Verification */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-medium">India Eligibility</span>
                  <div className="my-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${indiaInfo.color}`}>
                      <IndiaIcon className="w-3.5 h-3.5" />
                      {analysis.indiaEligibility}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-1" title={analysis.indiaEligibilityEvidence}>
                    {analysis.indiaEligibilityEvidence}
                  </span>
                </div>
              </div>

              {/* Payment Verification Section */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs md:text-sm font-bold text-white">Payment Method Verification</h4>
                  </div>
                  <div className="text-[11px]">
                    Candidate Preference:{' '}
                    <span className="font-semibold text-emerald-300">Direct Indian Bank Transfer</span>
                  </div>
                </div>

                {/* Preferred Method Match Banner */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  analysis.paymentVerification.matchesUserPreference
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                }`}>
                  {analysis.paymentVerification.matchesUserPreference ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">
                      {analysis.paymentVerification.matchesUserPreference
                        ? 'Preferred Indian Bank Transfer Supported!'
                        : 'Preferred Direct Indian Bank Transfer Not Natively Listed'}
                    </span>
                    <p className="mt-0.5 text-[11px] text-slate-300 leading-relaxed">
                      {analysis.paymentVerification.analysisNotes}
                    </p>
                  </div>
                </div>

                {/* Gateway Verification Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
                  {[
                    { label: 'Indian Bank', supported: analysis.paymentVerification.directIndianBankTransferSupported },
                    { label: 'UPI', supported: analysis.paymentVerification.upiSupported },
                    { label: 'Payoneer', supported: analysis.paymentVerification.payoneerSupported },
                    { label: 'PayPal', supported: analysis.paymentVerification.paypalSupported },
                    { label: 'AirTM', supported: analysis.paymentVerification.airtmSupported }
                  ].map((gw, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        gw.supported 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="font-medium text-[11px]">{gw.label}</span>
                      {gw.supported ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunity Risk Assessment */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs md:text-sm font-bold text-white">Opportunity Risk & Legitimacy Audit</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskBadge(analysis.riskAssessment.riskLevel)}`}>
                    Risk Level: {analysis.riskAssessment.riskLevel}
                  </span>
                </div>

                {/* Scam & Fee Checks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    analysis.riskAssessment.hasRegistrationFee
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}>
                    {analysis.riskAssessment.hasRegistrationFee ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>Registration Fee: {analysis.riskAssessment.hasRegistrationFee ? 'DETECTED (High Risk!)' : 'None Required (Free to join)'}</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    analysis.riskAssessment.suspiciousPaymentRequests
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}>
                    {analysis.riskAssessment.suspiciousPaymentRequests ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>Suspicious Requests: {analysis.riskAssessment.suspiciousPaymentRequests ? 'FLAGGED' : 'Clean / Compliant'}</span>
                  </div>
                </div>

                {/* Estimated vs Guaranteed Compensation Distinction */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Compensation Nature:</span>
                    <span className={`font-bold ${
                      analysis.riskAssessment.compensationClassification === 'Estimated Compensation'
                        ? 'text-cyan-400'
                        : analysis.riskAssessment.compensationClassification === 'Guaranteed Earnings'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {analysis.riskAssessment.compensationClassification}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {analysis.riskAssessment.compensationNotes}
                  </p>
                </div>
              </div>

              {/* Skills Matching & Explanation */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs md:text-sm font-bold text-white">Skills Alignment & AI Rationale</h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {analysis.explanation.whyMatches}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-emerald-400 block">
                      Matched Skills ({analysis.explanation.skillsMatched.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {analysis.explanation.skillsMatched.map(s => (
                        <span key={s} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-amber-400 block">
                      Missing Competencies ({analysis.explanation.missingSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {analysis.explanation.missingSkills.length > 0 ? (
                        analysis.explanation.missingSkills.map(s => (
                          <span key={s} className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-emerald-400">All required skills present in candidate profile.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Application Tips */}
                {analysis.explanation.applicationTips && analysis.explanation.applicationTips.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                    <span className="font-semibold text-indigo-300 block">Application Preparation Tips:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                      {analysis.explanation.applicationTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 md:p-5 border-t border-slate-800 bg-[#0d1424] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{analysis ? 'Re-audit Opportunity' : 'Run Audit'}</span>
            </button>
            <a
              href={opportunity.opportunity_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>Platform Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrep && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPrep(opportunity);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Prepare Application</span>
              </button>
            )}

            <button
              onClick={() => {
                onTrackInPipeline(opportunity);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track in Pipeline</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
