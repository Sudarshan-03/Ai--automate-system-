import { OpportunityRecord, PlatformRecord, ProfileRecord, ApplicationRecord, EarningRecord } from '../types';

export const initialProfile: ProfileRecord = {
  id: 'usr-default-01',
  full_name: 'Aarav Sharma',
  email: 'aarav.sharma@sudu-earnflow.ai',
  country: 'India',
  education: 'B.Tech in Computer Science & Engineering',
  skills: [
    'Python',
    'Data Annotation',
    'Prompt Engineering',
    'RLHF Evaluation',
    'English (Fluent)',
    'Critical Reading',
    'Fact-Checking'
  ],
  preferred_payment_methods: ['Indian bank transfer', 'UPI', 'Wise'],
  experience_years: 3,
  min_hourly_rate: 20,
  weekly_hours: 20
};

export const samplePlatforms: PlatformRecord[] = [
  {
    id: 'plat-1',
    name: 'Outlier AI',
    website_url: 'https://outlier.ai',
    india_supported: true,
    payment_methods: ['Indian bank transfer', 'PayPal', 'Direct Deposit'],
    platform_category: 'AI Training',
    verification_status: 'Verified Provider',
    notes: 'Primary LLM reinforcement learning platform. Payouts processed weekly on Tuesdays via direct bank wire/NEFT and PayPal.'
  },
  {
    id: 'plat-2',
    name: 'DataAnnotation Tech',
    website_url: 'https://dataannotation.tech',
    india_supported: false,
    payment_methods: ['PayPal'],
    platform_category: 'Data Annotation',
    verification_status: 'Verified Provider',
    notes: 'High pay AI evaluation tasks. Currently restricted to US, Canada, UK, Australia, Ireland, and New Zealand; India applicants may face conditional screening.'
  },
  {
    id: 'plat-3',
    name: 'Welocalize India',
    website_url: 'https://welocalize.com',
    india_supported: true,
    payment_methods: ['Indian bank transfer', 'UPI', 'Direct Deposit'],
    platform_category: 'Search & Ads Evaluation',
    verification_status: 'Verified Provider',
    notes: 'Legitimate multinational localization agency with formal registered Indian entity. Pays directly to Indian bank accounts.'
  },
  {
    id: 'plat-4',
    name: 'Alignerr by Labelbox',
    website_url: 'https://alignerr.com',
    india_supported: true,
    payment_methods: ['Indian bank transfer', 'Payoneer', 'Deel'],
    platform_category: 'AI Alignment',
    verification_status: 'Verified Provider',
    notes: 'Deel-powered global contractor payroll. Supports direct INR withdrawal to any Indian savings or current bank account.'
  },
  {
    id: 'plat-5',
    name: 'OneForma by Centific',
    website_url: 'https://oneforma.com',
    india_supported: true,
    payment_methods: ['Payoneer', 'PayPal', 'Indian bank transfer'],
    platform_category: 'Audio & Translation',
    verification_status: 'Verified Provider',
    notes: 'Multimodal AI training datasets. Supports Indian banking via Payoneer direct transfer integration.'
  },
  {
    id: 'plat-6',
    name: 'QuickEarn Matrix (Flagged Demo)',
    website_url: 'https://quickearn-matrix-unverified.example.com',
    india_supported: false,
    payment_methods: ['AirTM', 'Crypto (TRC-20)'],
    platform_category: 'Unverified Gig',
    verification_status: 'Unverified / High Risk',
    notes: 'Demo test case: Flags $15 registration kit fee, promises unrealistic $80/hr guaranteed typing, unknown business entity.'
  }
];

export const sampleOpportunities: OpportunityRecord[] = [
  {
    id: 'opp-1',
    platform_id: 'plat-1',
    title: 'AI Python & Reasoning Evaluator',
    description: 'Evaluate, benchmark, and improve code generation responses produced by leading foundational AI models. Formulate step-by-step mathematical reasoning and debug synthetic algorithms.',
    opportunity_url: 'https://outlier.ai/evaluators',
    compensation: '$25 - $45 / hr (Est.)',
    currency: 'USD',
    country_eligibility: ['India', 'United States', 'Canada', 'United Kingdom', 'Germany'],
    payment_methods: ['Indian bank transfer', 'PayPal', 'Direct Deposit'],
    skills_required: ['Python', 'Problem Solving', 'RLHF Evaluation', 'Prompt Engineering'],
    deadline: '2026-12-15',
    source: 'Sudu Opportunity Radar',
    verification_status: 'Verified Demo Listing',
    platform: samplePlatforms[0]
  },
  {
    id: 'opp-2',
    platform_id: 'plat-4',
    title: 'Expert Subject Matter Evaluator - STEM & Coding',
    description: 'Review high-difficulty benchmarks in software architecture, computer science principles, and algorithm complexity. Requires passing a 45-minute technical verification assessment.',
    opportunity_url: 'https://alignerr.com/apply',
    compensation: '$30 - $55 / hr (Est.)',
    currency: 'USD',
    country_eligibility: ['India', 'Global', 'United States', 'Canada'],
    payment_methods: ['Indian bank transfer', 'Payoneer', 'Deel'],
    skills_required: ['Python', 'Prompt Engineering', 'Critical Reading', 'Fact-Checking'],
    deadline: '2026-12-31',
    source: 'Sudu Opportunity Radar',
    verification_status: 'Verified Demo Listing',
    platform: samplePlatforms[3]
  },
  {
    id: 'opp-3',
    platform_id: 'plat-3',
    title: 'Search & Ad Relevance Evaluator (Hindi / English)',
    description: 'Measure the accuracy, safety, and cultural intent of search engine results and ad units for internet users in the Indian market. Flexible part-time hours with weekly reporting.',
    opportunity_url: 'https://welocalize.com/jobs',
    compensation: '$14 - $18 / hr (Est.)',
    currency: 'USD',
    country_eligibility: ['India'],
    payment_methods: ['Indian bank transfer', 'UPI', 'Direct Deposit'],
    skills_required: ['English (Fluent)', 'Fact-Checking', 'Critical Reading'],
    deadline: '2026-11-30',
    source: 'Sudu Opportunity Radar',
    verification_status: 'Verified Demo Listing',
    platform: samplePlatforms[2]
  },
  {
    id: 'opp-4',
    platform_id: 'plat-2',
    title: 'Bilingual Prompt Response Auditor',
    description: 'Audit dual-model generative text outputs for logical consistency, truthfulness, and safety compliance. Strict geographic residency check during registration.',
    opportunity_url: 'https://dataannotation.tech',
    compensation: '$20 - $25 / hr (Est.)',
    currency: 'USD',
    country_eligibility: ['United States', 'Canada', 'United Kingdom', 'Australia'],
    payment_methods: ['PayPal'],
    skills_required: ['Critical Reading', 'Fact-Checking', 'English (Fluent)'],
    deadline: '2026-12-20',
    source: 'Sudu Opportunity Radar',
    verification_status: 'Verified Demo Listing',
    platform: samplePlatforms[1]
  },
  {
    id: 'opp-5',
    platform_id: 'plat-5',
    title: 'Indian Accent Voice & Audio Transcriber',
    description: 'Transcribe regional Indian English, Hindi-English code-switching, and speech samples to train next-gen acoustic speech recognition systems.',
    opportunity_url: 'https://oneforma.com/projects',
    compensation: '$12 - $17 / hr (Est.)',
    currency: 'USD',
    country_eligibility: ['India', 'Global'],
    payment_methods: ['Payoneer', 'PayPal', 'Indian bank transfer'],
    skills_required: ['English (Fluent)', 'Data Annotation', 'Audio Transcription'],
    deadline: '2027-01-10',
    source: 'Sudu Opportunity Radar',
    verification_status: 'Verified Demo Listing',
    platform: samplePlatforms[4]
  },
  {
    id: 'opp-6',
    platform_id: 'plat-6',
    title: 'Instant Data Entry Assistant [HIGH RISK SIMULATION]',
    description: 'Guaranteed $80/hr typing captcha forms from home! Pay $15 refundable registration fee to unlock task server and beginner starter kit.',
    opportunity_url: 'https://quickearn-matrix-unverified.example.com/apply',
    compensation: '$80 / hr (Guaranteed Claim)',
    currency: 'USD',
    country_eligibility: ['Unspecified / Global'],
    payment_methods: ['AirTM', 'Crypto (TRC-20)'],
    skills_required: ['Typing', 'No Experience Needed'],
    deadline: 'Immediate',
    source: 'External Forum Crawl',
    verification_status: 'Unverified / Flagged',
    platform: samplePlatforms[5]
  }
];

export const sampleApplications: ApplicationRecord[] = [
  {
    id: 'app-01',
    user_id: 'usr-default-01',
    opportunity_id: 'opp-1',
    status: 'Assessment',
    applied_at: '2026-11-01T10:00:00Z',
    notes: 'Completed technical coding test. Awaiting queue verification from Outlier team.',
    opportunity: sampleOpportunities[0]
  },
  {
    id: 'app-02',
    user_id: 'usr-default-01',
    opportunity_id: 'opp-3',
    status: 'Accepted',
    applied_at: '2026-10-24T14:30:00Z',
    notes: 'Onboarding completed. Direct Indian bank transfer details (IFSC + Account) submitted to Welocalize HR.',
    opportunity: sampleOpportunities[2]
  },
  {
    id: 'app-03',
    user_id: 'usr-default-01',
    opportunity_id: 'opp-2',
    status: 'Pending approval',
    applied_at: '2026-10-29T18:15:00Z',
    notes: 'Submitted Alignerr STEM screening. Passing score achieved, awaiting project assignment.',
    opportunity: sampleOpportunities[1]
  }
];

export const sampleEarnings: EarningRecord[] = [
  {
    id: 'ern-01',
    user_id: 'usr-default-01',
    platform_id: 'plat-3',
    opportunity_id: 'opp-3',
    amount: 320.00,
    currency: 'USD',
    payment_status: 'Received',
    payment_date: '2026-10-28',
    payment_method: 'Indian bank transfer (NEFT)',
    platform: samplePlatforms[2]
  },
  {
    id: 'ern-02',
    user_id: 'usr-default-01',
    platform_id: 'plat-3',
    opportunity_id: 'opp-3',
    amount: 280.00,
    currency: 'USD',
    payment_status: 'Received',
    payment_date: '2026-10-21',
    payment_method: 'Indian bank transfer (NEFT)',
    platform: samplePlatforms[2]
  },
  {
    id: 'ern-03',
    user_id: 'usr-default-01',
    platform_id: 'plat-1',
    opportunity_id: 'opp-1',
    amount: 450.00,
    currency: 'USD',
    payment_status: 'Pending',
    payment_date: '2026-11-04',
    payment_method: 'Indian bank transfer',
    platform: samplePlatforms[0]
  },
  {
    id: 'ern-04',
    user_id: 'usr-default-01',
    platform_id: 'plat-4',
    opportunity_id: 'opp-2',
    amount: 375.00,
    currency: 'USD',
    payment_status: 'Pending',
    payment_date: '2026-11-05',
    payment_method: 'Deel / Bank Transfer',
    platform: samplePlatforms[3]
  }
];
