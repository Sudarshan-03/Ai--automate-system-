import { 
  AIOpportunityAnalysis, 
  AIApplicationPrep,
  OpportunityRecord, 
  ProfileRecord, 
  ApplicationRecord,
  RecommendationCategory,
  IndiaEligibilityStatus,
  RiskLevel,
  CompensationType 
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const LOCAL_STORAGE_AI_KEY = 'sudu_earnflow_ai_intelligence_cache';

// ==========================================
// VALIDATION ENGINE
// ==========================================
export function validateAIAnalysis(data: any): AIOpportunityAnalysis | null {
  if (!data || typeof data !== 'object') return null;

  const validCategories: RecommendationCategory[] = [
    'Excellent Match',
    'Good Match',
    'Needs Review',
    'Not Recommended'
  ];

  const validEligibility: IndiaEligibilityStatus[] = [
    'Confirmed available in India',
    'Conditional',
    'Not available',
    'Unverified'
  ];

  const validRisk: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
  const validComp: CompensationType[] = [
    'Estimated Compensation', 
    'Guaranteed Earnings', 
    'Unrealistic/Deceptive'
  ];

  const rawScore = typeof data.matchScore === 'number' ? data.matchScore : parseInt(data.matchScore);
  if (isNaN(rawScore)) return null;
  const matchScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  const recommendationCategory = validCategories.includes(data.recommendationCategory) 
    ? data.recommendationCategory 
    : 'Needs Review';

  const indiaEligibility = validEligibility.includes(data.indiaEligibility) 
    ? data.indiaEligibility 
    : 'Unverified';

  const payment = data.paymentVerification;
  if (!payment || typeof payment !== 'object') return null;

  const risk = data.riskAssessment;
  if (!risk || typeof risk !== 'object') return null;

  const explanation = data.explanation;
  if (!explanation || typeof explanation !== 'object') return null;

  return {
    matchScore,
    recommendationCategory,
    indiaEligibility,
    indiaEligibilityEvidence: String(data.indiaEligibilityEvidence || 'No verified regional audit trail submitted.'),
    paymentVerification: {
      supportedMethods: Array.isArray(payment.supportedMethods) ? payment.supportedMethods.map(String) : [],
      directIndianBankTransferSupported: Boolean(payment.directIndianBankTransferSupported),
      upiSupported: Boolean(payment.upiSupported),
      payoneerSupported: Boolean(payment.payoneerSupported),
      paypalSupported: Boolean(payment.paypalSupported),
      airtmSupported: Boolean(payment.airtmSupported),
      otherMethods: Array.isArray(payment.otherMethods) ? payment.otherMethods.map(String) : [],
      matchesUserPreference: Boolean(payment.matchesUserPreference),
      analysisNotes: String(payment.analysisNotes || 'Standard contract terms apply.')
    },
    riskAssessment: {
      riskLevel: validRisk.includes(risk.riskLevel) ? risk.riskLevel : 'Medium',
      hasRegistrationFee: Boolean(risk.hasRegistrationFee),
      suspiciousPaymentRequests: Boolean(risk.suspiciousPaymentRequests),
      unrealisticIncomeClaims: Boolean(risk.unrealisticIncomeClaims),
      isUnverifiedPlatform: Boolean(risk.isUnverifiedPlatform),
      potentialScamIndicators: Array.isArray(risk.potentialScamIndicators) ? risk.potentialScamIndicators.map(String) : [],
      compensationClassification: validComp.includes(risk.compensationClassification) 
        ? risk.compensationClassification 
        : 'Estimated Compensation',
      compensationNotes: String(risk.compensationNotes || ''),
      riskSummary: String(risk.riskSummary || 'General platform risk rating.')
    },
    explanation: {
      whyMatches: String(explanation.whyMatches || 'Competency profile alignment.'),
      requiredSkills: Array.isArray(explanation.requiredSkills) ? explanation.requiredSkills.map(String) : [],
      skillsMatched: Array.isArray(explanation.skillsMatched) ? explanation.skillsMatched.map(String) : [],
      missingSkills: Array.isArray(explanation.missingSkills) ? explanation.missingSkills.map(String) : [],
      isWorthApplying: Boolean(explanation.isWorthApplying),
      summaryVerdict: String(explanation.summaryVerdict || ''),
      applicationTips: Array.isArray(explanation.applicationTips) ? explanation.applicationTips.map(String) : []
    },
    analyzedAt: data.analyzedAt || new Date().toISOString()
  };
}

// ==========================================
// LOCAL STORAGE CACHE HELPERS
// ==========================================
export function getStoredLocalAnalysis(opportunityId: string): AIOpportunityAnalysis | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AI_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const item = store[opportunityId];
    return item ? validateAIAnalysis(item) : null;
  } catch (e) {
    return null;
  }
}

export function saveLocalAnalysis(opportunityId: string, analysis: AIOpportunityAnalysis) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AI_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[opportunityId] = analysis;
    localStorage.setItem(LOCAL_STORAGE_AI_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Failed to cache AI analysis locally', e);
  }
}

// ==========================================
// RUN GEMINI AUDIT
// ==========================================
export async function runOpportunityIntelligence(
  opportunity: OpportunityRecord,
  profile: ProfileRecord
): Promise<AIOpportunityAnalysis> {
  const response = await fetch('/api/intelligence/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunity, profile })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Intelligence API error (HTTP ${response.status})`);
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error('Intelligence analysis returned invalid payload');
  }

  const validated = validateAIAnalysis(json.data);
  if (!validated) {
    throw new Error('AI analysis validation failed: Malformed structured output received from Gemini');
  }

  // Cache locally
  saveLocalAnalysis(opportunity.id, validated);

  return validated;
}

// ==========================================
// STORE IN DATABASE (applications.screening_answers)
// ==========================================
export async function persistAIAnalysisToDatabase(
  userId: string,
  opportunityId: string,
  analysis: AIOpportunityAnalysis
): Promise<void> {
  // Always update local cache
  saveLocalAnalysis(opportunityId, analysis);

  if (!isSupabaseConfigured) {
    return; // Graceful offline/local mode
  }

  try {
    // 1. Check if application record exists
    const { data: existingApp, error: fetchErr } = await supabase
      .from('applications')
      .select('id, screening_answers, status')
      .eq('user_id', userId)
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existingApp) {
      // Update existing application
      const currentAnswers = existingApp.screening_answers || {};
      const updatedAnswers = {
        ...currentAnswers,
        ai_intelligence: analysis
      };

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          screening_answers: updatedAnswers
        })
        .eq('id', existingApp.id);

      if (updateErr) throw updateErr;
    } else {
      // Create new application with 'Saved' status and the AI Intelligence
      const { error: insertErr } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          opportunity_id: opportunityId,
          status: 'Saved',
          applied_at: new Date().toISOString(),
          notes: `Audited via Sudu AI: ${analysis.recommendationCategory} (${analysis.matchScore}% Match)`,
          screening_answers: {
            ai_intelligence: analysis
          }
        });

      if (insertErr) throw insertErr;
    }
  } catch (err: any) {
    console.error('Failed to persist AI analysis to Supabase:', err);
    // Even if remote DB write fails, local storage keeps the UI intact
  }
}

// ==========================================
// RUN APPLICATION PREPARATION ENGINE
// ==========================================
export async function runApplicationPrep(
  opportunity: OpportunityRecord,
  profile: ProfileRecord,
  customNotes?: string
): Promise<AIApplicationPrep> {
  const response = await fetch('/api/intelligence/prepare-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunity, profile, customNotes })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Prep API failed with status ${response.status}`);
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error('Invalid preparation response received from AI engine');
  }

  const prepData: AIApplicationPrep = {
    coverLetter: String(json.data.coverLetter || ''),
    keyHighlights: Array.isArray(json.data.keyHighlights) ? json.data.keyHighlights.map(String) : [],
    assessmentStrategy: Array.isArray(json.data.assessmentStrategy) ? json.data.assessmentStrategy.map(String) : [],
    screeningScenarios: Array.isArray(json.data.screeningScenarios) ? json.data.screeningScenarios : [],
    payoutChecklist: Array.isArray(json.data.payoutChecklist) ? json.data.payoutChecklist.map(String) : [],
    generatedAt: json.data.generatedAt || new Date().toISOString()
  };

  return prepData;
}

export async function persistApplicationPrepToDatabase(
  userId: string,
  opportunityId: string,
  prep: AIApplicationPrep,
  notes?: string
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, screening_answers, cover_letter')
      .eq('user_id', userId)
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    if (existingApp) {
      await supabase
        .from('applications')
        .update({
          cover_letter: prep.coverLetter,
          screening_answers: {
            ...(existingApp.screening_answers || {}),
            ai_prep: prep
          },
          notes: notes || undefined
        })
        .eq('id', existingApp.id);
    } else {
      await supabase
        .from('applications')
        .insert({
          user_id: userId,
          opportunity_id: opportunityId,
          status: 'Applied',
          cover_letter: prep.coverLetter,
          screening_answers: {
            ai_prep: prep
          },
          applied_at: new Date().toISOString(),
          notes: notes || 'Generated with Sudu AI Application Prep'
        });
    }
  } catch (err) {
    console.warn('Failed to persist prep to database:', err);
  }
}
