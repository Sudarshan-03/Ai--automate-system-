export type NavTab = 
  | 'dashboard' 
  | 'discover' 
  | 'recommendations' 
  | 'applications' 
  | 'earnings' 
  | 'profile' 
  | 'settings';

export type ApplicationStage = 
  | 'Saved' 
  | 'Applied' 
  | 'Assessment' 
  | 'Interview' 
  | 'Pending approval' 
  | 'Accepted' 
  | 'Rejected';

export type IndiaEligibilityStatus = 
  | 'Confirmed available in India'
  | 'Conditional'
  | 'Not available'
  | 'Unverified';

export type RecommendationCategory = 
  | 'Excellent Match'
  | 'Good Match'
  | 'Needs Review'
  | 'Not Recommended';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type CompensationType = 
  | 'Estimated Compensation' 
  | 'Guaranteed Earnings' 
  | 'Unrealistic/Deceptive';

export interface PaymentVerificationResult {
  supportedMethods: string[];
  directIndianBankTransferSupported: boolean;
  upiSupported: boolean;
  payoneerSupported: boolean;
  paypalSupported: boolean;
  airtmSupported: boolean;
  otherMethods: string[];
  matchesUserPreference: boolean; // checks if Indian bank transfer is supported
  analysisNotes: string;
}

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  hasRegistrationFee: boolean;
  suspiciousPaymentRequests: boolean;
  unrealisticIncomeClaims: boolean;
  isUnverifiedPlatform: boolean;
  potentialScamIndicators: string[];
  compensationClassification: CompensationType;
  compensationNotes: string;
  riskSummary: string;
}

export interface AIOpportunityAnalysis {
  matchScore: number; // 0 - 100
  recommendationCategory: RecommendationCategory;
  indiaEligibility: IndiaEligibilityStatus;
  indiaEligibilityEvidence: string;
  paymentVerification: PaymentVerificationResult;
  riskAssessment: RiskAssessmentResult;
  explanation: {
    whyMatches: string;
    requiredSkills: string[];
    skillsMatched: string[];
    missingSkills: string[];
    isWorthApplying: boolean;
    summaryVerdict: string;
    applicationTips: string[];
  };
  analyzedAt: string;
}

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  country: string;
  education: string;
  skills: string[];
  preferred_payment_methods: string[];
  created_at?: string;
  experience_years?: number;
  min_hourly_rate?: number;
  weekly_hours?: number;
}

export interface PlatformRecord {
  id: string;
  name: string;
  website_url: string;
  india_supported: boolean;
  payment_methods: string[];
  platform_category: string;
  verification_status: string;
  notes: string;
  created_at?: string;
}

export interface OpportunityRecord {
  id: string;
  platform_id: string;
  title: string;
  description: string;
  opportunity_url: string;
  compensation: string;
  currency: string;
  country_eligibility: string[];
  payment_methods: string[];
  skills_required: string[];
  deadline: string;
  source: string;
  verification_status: string;
  created_at?: string;
  platform?: PlatformRecord;
  // Cached or runtime AI Intelligence
  aiAnalysis?: AIOpportunityAnalysis | null;
}

export interface AIApplicationPrep {
  coverLetter: string;
  keyHighlights: string[];
  assessmentStrategy: string[];
  screeningScenarios: {
    question: string;
    sampleApproach: string;
  }[];
  payoutChecklist: string[];
  generatedAt: string;
}

export interface ApplicationRecord {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: ApplicationStage;
  cover_letter?: string;
  screening_answers?: {
    ai_intelligence?: AIOpportunityAnalysis;
    ai_prep?: AIApplicationPrep;
    [key: string]: any;
  };
  applied_at: string;
  notes?: string;
  opportunity?: OpportunityRecord;
}

export interface EarningRecord {
  id: string;
  user_id: string;
  platform_id: string | null;
  opportunity_id: string | null;
  amount: number;
  currency: string;
  payment_status: 'Received' | 'Pending';
  payment_date: string;
  payment_method?: string;
  created_at?: string;
  platform?: PlatformRecord;
}
