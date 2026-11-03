import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  BriefcaseBusiness,
  WalletCards,
  UserCheck,
  Settings as SettingsIcon,
  Search,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  HelpCircle,
  FileText,
  Sliders,
  Calendar,
  Check,
  X,
  Landmark,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import {
  NavTab,
  ApplicationStage,
  ProfileRecord,
  OpportunityRecord,
  ApplicationRecord,
  EarningRecord,
  AIOpportunityAnalysis,
  AIApplicationPrep,
  RecommendationCategory
} from './types';
import * as api from './services/api';
import { 
  getStoredLocalAnalysis, 
  saveLocalAnalysis, 
  runOpportunityIntelligence, 
  persistAIAnalysisToDatabase 
} from './services/geminiIntelligence';
import { AIIntelligenceModal } from './components/AIIntelligenceModal';
import { AIIntelligenceBadge } from './components/AIIntelligenceBadge';
import { AIApplicationPrepModal } from './components/AIApplicationPrepModal';
import { isSupabaseConfigured } from './lib/supabaseClient';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Application Data States
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);

  // AI Intelligence Modal State
  const [selectedOppForAI, setSelectedOppForAI] = useState<OpportunityRecord | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, AIOpportunityAnalysis>>({});

  // AI Application Prep Studio State
  const [selectedOppForPrep, setSelectedOppForPrep] = useState<OpportunityRecord | null>(null);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [prepMap, setPrepMap] = useState<Record<string, AIApplicationPrep>>({});
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);

  // Loading & Notification States
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3800);
  };

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      const userProfile = await api.getProfile('usr-default-01');
      setProfile(userProfile);

      const [opps, apps, earns] = await Promise.all([
        api.getOpportunities(),
        api.getUserApplications(userProfile.id),
        api.getUserEarnings(userProfile.id)
      ]);

      setOpportunities(opps);
      setApplications(apps);
      setEarnings(earns);

      // Restore AI Intelligence cache & application prep
      const initialMap: Record<string, AIOpportunityAnalysis> = {};
      const initialPrep: Record<string, AIApplicationPrep> = {};

      apps.forEach(app => {
        if (app.screening_answers?.ai_intelligence) {
          initialMap[app.opportunity_id] = app.screening_answers.ai_intelligence;
        }
        if (app.screening_answers?.ai_prep) {
          initialPrep[app.opportunity_id] = app.screening_answers.ai_prep;
        }
      });
      opps.forEach(opp => {
        if (!initialMap[opp.id]) {
          const cached = getStoredLocalAnalysis(opp.id);
          if (cached) initialMap[opp.id] = cached;
        }
      });
      setAiAnalysisMap(initialMap);
      setPrepMap(initialPrep);
    } catch (e: any) {
      console.error(e);
      showToast('Error syncing workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Financial Calculations
  const totalEarned = useMemo(() => 
    earnings.filter(e => e.payment_status === 'Received').reduce((acc, curr) => acc + Number(curr.amount), 0),
    [earnings]
  );

  const pendingPayments = useMemo(() => 
    earnings.filter(e => e.payment_status === 'Pending').reduce((acc, curr) => acc + Number(curr.amount), 0),
    [earnings]
  );

  const pendingApprovalsCount = useMemo(() => 
    applications.filter(a => a.status === 'Pending approval' || a.status === 'Assessment').length,
    [applications]
  );

  const acceptedCount = useMemo(() => 
    applications.filter(a => a.status === 'Accepted').length,
    [applications]
  );

  // Quick Application Handler
  const handleApplyQuick = async (opp: OpportunityRecord) => {
    if (!profile) return;
    const existing = applications.find(a => a.opportunity_id === opp.id);
    if (existing) {
      showToast(`Already tracked in pipeline as: ${existing.status}`);
      return;
    }

    try {
      const created = await api.createApplication(
        profile.id, 
        opp.id, 
        'Applied', 
        'Direct tracking from Sudu EarnFlow AI', 
        opp
      );
      setApplications(prev => [created, ...prev]);
      showToast(`Added "${opp.title}" to Applied tracking pipeline!`);
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handleStageChange = async (appId: string, newStage: ApplicationStage) => {
    try {
      await api.updateApplicationStage(appId, newStage, profile?.id);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStage } : a));
      showToast(`Application moved to ${newStage}`);
    } catch (e: any) {
      showToast(`Error updating stage: ${e.message}`);
    }
  };

  // Open AI Modal
  const openAIIntelligence = (opp: OpportunityRecord) => {
    setSelectedOppForAI(opp);
    setIsAIModalOpen(true);
  };

  const handleAnalysisUpdated = (opportunityId: string, analysis: AIOpportunityAnalysis) => {
    setAiAnalysisMap(prev => ({
      ...prev,
      [opportunityId]: analysis
    }));
    // Sync into applications state if currently tracked
    setApplications(prev => prev.map(app => {
      if (app.opportunity_id === opportunityId) {
        return {
          ...app,
          screening_answers: {
            ...app.screening_answers,
            ai_intelligence: analysis
          }
        };
      }
      return app;
    }));
    showToast(`Gemini audit complete: ${analysis.matchScore}% Match (${analysis.recommendationCategory})`);
  };

  // Open AI Prep Studio Modal
  const openApplicationPrep = (opp: OpportunityRecord) => {
    setSelectedOppForPrep(opp);
    setIsPrepModalOpen(true);
  };

  const handlePrepSaved = (opportunityId: string, prep: AIApplicationPrep) => {
    setPrepMap(prev => ({
      ...prev,
      [opportunityId]: prep
    }));
    setApplications(prev => prev.map(app => {
      if (app.opportunity_id === opportunityId) {
        return {
          ...app,
          cover_letter: prep.coverLetter,
          screening_answers: {
            ...app.screening_answers,
            ai_prep: prep
          }
        };
      }
      return app;
    }));
    showToast('Application proposal & benchmark strategy saved to pipeline!');
  };

  // 1-Click Batch AI Radar Audit
  const handleBatchAudit = async () => {
    if (!profile || isBatchAuditing) return;
    setIsBatchAuditing(true);
    showToast('Starting Gemini Opportunity Radar audit across listings...');
    try {
      const unaudited = opportunities.filter(o => !aiAnalysisMap[o.id]);
      if (unaudited.length === 0) {
        showToast('All opportunities have already been audited with Gemini!');
        setIsBatchAuditing(false);
        return;
      }

      for (const opp of unaudited) {
        try {
          const res = await runOpportunityIntelligence(opp, profile);
          setAiAnalysisMap(prev => ({ ...prev, [opp.id]: res }));
          await persistAIAnalysisToDatabase(profile.id, opp.id, res);
        } catch (e) {
          console.warn(`Failed audit for ${opp.title}:`, e);
        }
      }
      showToast(`Completed batch AI audit for ${unaudited.length} opportunities!`);
    } catch (err: any) {
      showToast(`Batch audit error: ${err.message}`);
    } finally {
      setIsBatchAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-[#0f172a]/95 border border-indigo-500/50 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs md:text-sm text-indigo-100 animate-fade-in max-w-md">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <span>{notification}</span>
        </div>
      )}

      {/* AI Opportunity Intelligence Modal */}
      {selectedOppForAI && profile && (
        <AIIntelligenceModal
          isOpen={isAIModalOpen}
          onClose={() => {
            setIsAIModalOpen(false);
            setSelectedOppForAI(null);
          }}
          opportunity={selectedOppForAI}
          profile={profile}
          currentAnalysis={aiAnalysisMap[selectedOppForAI.id] || null}
          onAnalysisUpdated={handleAnalysisUpdated}
          onTrackInPipeline={handleApplyQuick}
          onOpenPrep={openApplicationPrep}
        />
      )}

      {/* AI Application Preparation Studio Modal */}
      {selectedOppForPrep && profile && (
        <AIApplicationPrepModal
          isOpen={isPrepModalOpen}
          onClose={() => {
            setIsPrepModalOpen(false);
            setSelectedOppForPrep(null);
          }}
          opportunity={selectedOppForPrep}
          profile={profile}
          existingPrep={prepMap[selectedOppForPrep.id] || null}
          onSaved={handlePrepSaved}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0d1424] border-r border-slate-800/80 p-5 shrink-0 select-none">
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
              EarnFlow AI
            </span>
            <span className="block text-[10px] tracking-wider uppercase font-semibold text-cyan-400">
              SUDU INTELLIGENCE
            </span>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'discover', label: 'Discover Opps', icon: Compass },
            { id: 'recommendations', label: 'AI Intelligence', icon: Sparkles, badge: 'Gemini' },
            { id: 'applications', label: 'Applications', icon: BriefcaseBusiness, count: applications.length },
            { id: 'earnings', label: 'Earnings Tracker', icon: WalletCards },
            { id: 'profile', label: 'My Profile', icon: UserCheck },
            { id: 'settings', label: 'Settings', icon: SettingsIcon }
          ].map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded-md border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && !item.badge && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-900/60 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Database & AI Engine Pill */}
        <div className="mt-auto p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gemini 3.8 Flash Active</span>
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Preferred Method:{' '}
            <span className="text-emerald-400 font-semibold">Indian Bank Transfer</span>
          </p>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">Sudu EarnFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="capitalize font-semibold text-slate-200">{currentTab}</span>
            <span>/</span>
            <span>AI Opportunity Intelligence</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Cleared: ${totalEarned.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-indigo-600/40 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <span className="text-xs font-medium text-slate-300 hidden sm:inline">
                {profile?.full_name || 'Aarav Sharma'}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Pages Container */}
        <div className="flex-1 px-4 md:px-8 pt-6 max-w-7xl w-full mx-auto">
          {loading && opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
              <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Initializing Sudu EarnFlow AI Workspace...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  totalOpportunities={opportunities.length}
                  recommendedCount={opportunities.length}
                  applicationsSubmitted={applications.length}
                  pendingApprovals={pendingApprovalsCount}
                  acceptedCount={acceptedCount}
                  totalEarnings={totalEarned}
                  pendingEarnings={pendingPayments}
                  recentOpportunities={opportunities.slice(0, 3)}
                  aiAnalysisMap={aiAnalysisMap}
                  onNavigate={setCurrentTab}
                  onQuickApply={handleApplyQuick}
                  onOpenAIModal={openAIIntelligence}
                  onOpenPrep={openApplicationPrep}
                  onBatchAudit={handleBatchAudit}
                  isBatchAuditing={isBatchAuditing}
                />
              )}

              {currentTab === 'discover' && (
                <DiscoverView 
                  opportunities={opportunities} 
                  aiAnalysisMap={aiAnalysisMap}
                  onApply={handleApplyQuick}
                  onOpenAIModal={openAIIntelligence}
                  onOpenPrep={openApplicationPrep}
                />
              )}

              {currentTab === 'recommendations' && (
                <RecommendationsView 
                  opportunities={opportunities}
                  profile={profile!}
                  aiAnalysisMap={aiAnalysisMap}
                  onApply={handleApplyQuick}
                  onOpenAIModal={openAIIntelligence}
                  onOpenPrep={openApplicationPrep}
                />
              )}

              {currentTab === 'applications' && (
                <ApplicationManagerView 
                  applications={applications} 
                  aiAnalysisMap={aiAnalysisMap}
                  prepMap={prepMap}
                  onStageChange={handleStageChange}
                  onOpenAIModal={openAIIntelligence}
                  onOpenPrep={openApplicationPrep}
                />
              )}

              {currentTab === 'earnings' && (
                <EarningsTrackerView 
                  earnings={earnings} 
                  totalEarned={totalEarned} 
                  pendingPayments={pendingPayments} 
                  onAddManualRecord={async (payload) => {
                    const rec = await api.addEarningRecord(profile!.id, payload);
                    setEarnings(prev => [rec, ...prev]);
                    showToast('Recorded new earning ledger entry!');
                  }}
                />
              )}

              {currentTab === 'profile' && profile && (
                <ProfileView 
                  profile={profile} 
                  onSaveProfile={async (updated) => {
                    const saved = await api.updateProfile(updated);
                    setProfile(saved);
                    showToast('Profile and verified skills updated!');
                  }} 
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView showToast={showToast} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1424]/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex justify-around items-center">
        {[
          { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
          { id: 'discover', label: 'Discover', icon: Compass },
          { id: 'recommendations', label: 'AI Intel', icon: Sparkles },
          { id: 'applications', label: 'Pipeline', icon: BriefcaseBusiness },
          { id: 'earnings', label: 'Earnings', icon: WalletCards },
          { id: 'profile', label: 'Profile', icon: UserCheck }
        ].map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id as NavTab)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors text-[10px] font-medium ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// PAGE 1: DASHBOARD
// ----------------------------------------------------------------------------------
function DashboardView({
  totalOpportunities,
  recommendedCount,
  applicationsSubmitted,
  pendingApprovals,
  acceptedCount,
  totalEarnings,
  pendingEarnings,
  recentOpportunities,
  aiAnalysisMap,
  onNavigate,
  onQuickApply,
  onOpenAIModal,
  onOpenPrep,
  onBatchAudit,
  isBatchAuditing
}: {
  totalOpportunities: number;
  recommendedCount: number;
  applicationsSubmitted: number;
  pendingApprovals: number;
  acceptedCount: number;
  totalEarnings: number;
  pendingEarnings: number;
  recentOpportunities: OpportunityRecord[];
  aiAnalysisMap: Record<string, AIOpportunityAnalysis>;
  onNavigate: (tab: NavTab) => void;
  onQuickApply: (opp: OpportunityRecord) => void;
  onOpenAIModal: (opp: OpportunityRecord) => void;
  onOpenPrep: (opp: OpportunityRecord) => void;
  onBatchAudit: () => void;
  isBatchAuditing: boolean;
}) {
  const chartData = [
    { name: 'Mon', applications: 2, earnings: 45 },
    { name: 'Tue', applications: 4, earnings: 110 },
    { name: 'Wed', applications: 1, earnings: 160 },
    { name: 'Thu', applications: 5, earnings: 240 },
    { name: 'Fri', applications: 3, earnings: 320 },
    { name: 'Sat', applications: 6, earnings: 420 },
    { name: 'Sun', applications: applicationsSubmitted, earnings: totalEarnings },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/40 border border-indigo-500/20 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gemini AI Opportunity Radar & Verification Active</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Legitimate Online Earning Pathways for India.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Sudu EarnFlow AI audits remote platforms against your skillset, verifies direct Indian bank transfer support, scans for scam risks, and tracks your earnings.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('recommendations')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <span>Explore AI Matches</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={onBatchAudit}
              disabled={isBatchAuditing}
              className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-medium text-xs md:text-sm border border-cyan-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBatchAuditing ? 'animate-spin' : ''}`} />
              <span>{isBatchAuditing ? 'Auditing Radar...' : '1-Click Full Radar Audit'}</span>
            </button>
            <button
              onClick={() => onNavigate('discover')}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs md:text-sm border border-slate-700 transition-all"
            >
              View All ({totalOpportunities})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {[
          { label: 'Total Opps', val: totalOpportunities, icon: Compass, color: 'text-cyan-400' },
          { label: 'Audited Opps', val: Object.keys(aiAnalysisMap).length, icon: Sparkles, color: 'text-indigo-400' },
          { label: 'Submitted', val: applicationsSubmitted, icon: FileText, color: 'text-amber-400' },
          { label: 'Pending Approval', val: pendingApprovals, icon: Clock, color: 'text-yellow-400' },
          { label: 'Accepted', val: acceptedCount, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Total Earned', val: `$${totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-300' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {stat.val}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Application Activity & Earning Momentum</h3>
              <p className="text-xs text-slate-400">Weekly tracked activity</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Apps
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Earnings ($)
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="earnings" stroke="#10b981" fillOpacity={1} fill="url(#colorEarnings)" strokeWidth={2} />
                <Area type="monotone" dataKey="applications" stroke="#6366f1" fillOpacity={1} fill="url(#colorApps)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 md:p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Financial Snapshot</h3>
            <p className="text-xs text-slate-400 mb-6">Audited earnings from verified online platforms</p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-xs text-slate-400 block mb-1">Pending Clearance</span>
                <span className="text-2xl font-bold text-amber-400">${pendingEarnings.toFixed(2)}</span>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Scheduled for release via weekly platform batches</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-xs text-slate-400 block mb-1">Cleared Earnings</span>
                <span className="text-2xl font-bold text-emerald-400">${totalEarnings.toFixed(2)}</span>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Received in Indian bank / designated accounts</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('earnings')}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Full Payout Breakdown</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Opportunities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Opportunities Ready for Audit</span>
          </h3>
          <button
            onClick={() => onNavigate('discover')}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            Explore all postings →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentOpportunities.map(opp => {
            const analysis = aiAnalysisMap[opp.id];
            return (
              <div key={opp.id} className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-400">{opp.platform?.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                      {opp.platform?.platform_category}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100 line-clamp-1">{opp.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{opp.description}</p>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-emerald-400">{opp.compensation}</span>
                    <AIIntelligenceBadge
                      analysis={analysis}
                      onOpenReport={() => onOpenAIModal(opp)}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => onOpenAIModal(opp)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium flex items-center justify-center gap-1 border border-indigo-500/25 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>AI Audit</span>
                  </button>
                  <button
                    onClick={() => onOpenPrep(opp)}
                    className="py-1.5 px-2.5 rounded-lg bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 text-xs font-medium border border-cyan-500/25 transition-all flex items-center gap-1"
                    title="AI Application Proposal & Test Strategy"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Prep</span>
                  </button>
                  <button
                    onClick={() => onQuickApply(opp)}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                  >
                    Track
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// PAGE 2: DISCOVER OPPORTUNITIES
// ----------------------------------------------------------------------------------
function DiscoverView({
  opportunities,
  aiAnalysisMap,
  onApply,
  onOpenAIModal,
  onOpenPrep
}: {
  opportunities: OpportunityRecord[];
  aiAnalysisMap: Record<string, AIOpportunityAnalysis>;
  onApply: (opp: OpportunityRecord) => void;
  onOpenAIModal: (opp: OpportunityRecord) => void;
  onOpenPrep: (opp: OpportunityRecord) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterBankOnly, setFilterBankOnly] = useState(false);
  const [filterIndiaOnly, setFilterIndiaOnly] = useState(false);
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);

  const categories = ['All', 'AI Training', 'Data Annotation', 'Search & Ads Evaluation', 'AI Alignment', 'Audio & Translation'];

  const filtered = useMemo(() => {
    return opportunities.filter(opp => {
      const matchSearch =
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.platform?.name && opp.platform.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategory === 'All' || opp.platform?.platform_category === selectedCategory;
      
      const hasBank = (opp.payment_methods || []).some(p => 
        p.toLowerCase().includes('bank') || p.toLowerCase().includes('wire') || p.toLowerCase().includes('direct')
      );
      const matchBank = !filterBankOnly || hasBank;

      const isIndiaEligible = 
        (opp.country_eligibility || []).some(c => c.toLowerCase().includes('india') || c.toLowerCase().includes('global')) ||
        Boolean(opp.platform?.india_supported);
      const matchIndia = !filterIndiaOnly || isIndiaEligible;

      const isSafe = opp.verification_status !== 'Unverified / High Risk' && opp.platform?.verification_status !== 'Unverified / High Risk';
      const matchVerified = !filterVerifiedOnly || isSafe;

      return matchSearch && matchCat && matchBank && matchIndia && matchVerified;
    });
  }, [opportunities, searchTerm, selectedCategory, filterBankOnly, filterIndiaOnly, filterVerifiedOnly]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Discover Opportunities</h2>
          <p className="text-xs md:text-sm text-slate-400">Curated, manually verified remote earning platforms with real-world payment routes.</p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          Showing <span className="text-white font-semibold">{filtered.length}</span> verified postings
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search roles, required skills, or platforms (e.g. Python, Hindi, RLHF)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <button
            onClick={() => setFilterIndiaOnly(!filterIndiaOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              filterIndiaOnly 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Confirmed India</span>
          </button>
          <button
            onClick={() => setFilterBankOnly(!filterBankOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              filterBankOnly 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-400" />
            <span>Indian Bank Transfer</span>
          </button>
          <button
            onClick={() => setFilterVerifiedOnly(!filterVerifiedOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              filterVerifiedOnly 
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exclude High Risk</span>
          </button>
        </div>
      </div>

      {/* Opportunity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(opp => {
          const analysis = aiAnalysisMap[opp.id];
          return (
            <div
              key={opp.id}
              className="bg-[#0f172a] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-indigo-400">{opp.platform?.name}</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" /> {opp.verification_status}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-1 group-hover:text-cyan-300 transition-colors">
                      {opp.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {opp.description}
                </p>

                {/* AI Intelligence Badge Bar */}
                <div className="pt-1">
                  <AIIntelligenceBadge
                    analysis={analysis}
                    onOpenReport={() => onOpenAIModal(opp)}
                  />
                </div>

                {/* Badges / Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {(opp.skills_required || []).map(skill => (
                    <span key={skill} className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl space-y-1.5 border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Compensation:</span>
                    <span className="font-bold text-emerald-400">{opp.compensation}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Country Eligibility:</span>
                    <span className="text-slate-300 text-right truncate max-w-[160px]">
                      {opp.country_eligibility?.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Payment Methods:</span>
                    <span className="text-cyan-300 truncate max-w-[160px] text-right">
                      {opp.payment_methods?.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Deadline:</span>
                    <span className="text-slate-300">{opp.deadline}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAIModal(opp)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{analysis ? 'AI Report' : 'Run Audit'}</span>
                </button>
                <button
                  onClick={() => onOpenPrep(opp)}
                  className="py-2 px-3 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 hover:text-white border border-cyan-500/25 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  title="Prepare Application Pitch & Screening Guide"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Prep</span>
                </button>
                <button
                  onClick={() => onApply(opp)}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-md shadow-indigo-600/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Track</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// PAGE 3: AI INTELLIGENCE & RECOMMENDATIONS
// ----------------------------------------------------------------------------------
function RecommendationsView({
  opportunities,
  profile,
  aiAnalysisMap,
  onApply,
  onOpenAIModal,
  onOpenPrep
}: {
  opportunities: OpportunityRecord[];
  profile: ProfileRecord;
  aiAnalysisMap: Record<string, AIOpportunityAnalysis>;
  onApply: (opp: OpportunityRecord) => void;
  onOpenAIModal: (opp: OpportunityRecord) => void;
  onOpenPrep: (opp: OpportunityRecord) => void;
}) {
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Compute or read recommendation score
  const enrichedList = useMemo(() => {
    return opportunities.map(opp => {
      const existing = aiAnalysisMap[opp.id];
      if (existing) {
        return {
          ...opp,
          ai: existing
        };
      }

      // Default quick calculation before full Gemini audit is triggered
      const matched = (opp.skills_required || []).filter(s => 
        profile.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
      );
      const missing = (opp.skills_required || []).filter(s => !matched.includes(s));
      const hasBank = (opp.payment_methods || []).some(p => p.toLowerCase().includes('bank') || p.toLowerCase().includes('wire'));
      const isIndia = (opp.country_eligibility || []).some(c => c.toLowerCase() === 'india' || c.toLowerCase() === 'global');
      const isFlagged = (opp.title || '').toLowerCase().includes('high risk');

      const rawScore = isFlagged ? 18 : Math.min(95, Math.round((matched.length / Math.max(opp.skills_required?.length || 1, 1)) * 60 + (isIndia ? 30 : 0) + (hasBank ? 10 : 0)));
      
      const category: RecommendationCategory = isFlagged 
        ? 'Not Recommended' 
        : rawScore >= 80 
        ? 'Excellent Match' 
        : rawScore >= 60 
        ? 'Good Match' 
        : 'Needs Review';

      const initialAnalysis: AIOpportunityAnalysis = {
        matchScore: rawScore,
        recommendationCategory: category,
        indiaEligibility: isFlagged ? 'Unverified' : isIndia ? 'Confirmed available in India' : 'Not available',
        indiaEligibilityEvidence: isIndia ? 'Country eligibility explicitly includes India.' : 'India not listed in primary regional parameters.',
        paymentVerification: {
          supportedMethods: opp.payment_methods || [],
          directIndianBankTransferSupported: hasBank,
          upiSupported: (opp.payment_methods || []).some(p => p.toLowerCase().includes('upi')),
          payoneerSupported: (opp.payment_methods || []).some(p => p.toLowerCase().includes('payoneer')),
          paypalSupported: (opp.payment_methods || []).some(p => p.toLowerCase().includes('paypal')),
          airtmSupported: (opp.payment_methods || []).some(p => p.toLowerCase().includes('airtm')),
          otherMethods: [],
          matchesUserPreference: hasBank,
          analysisNotes: hasBank 
            ? 'Supports direct Indian bank transfer via NEFT/IMPS remittance.' 
            : 'Direct Indian bank transfer not confirmed; third-party payment intermediary required.'
        },
        riskAssessment: {
          riskLevel: isFlagged ? 'Critical' : 'Low',
          hasRegistrationFee: isFlagged,
          suspiciousPaymentRequests: isFlagged,
          unrealisticIncomeClaims: isFlagged,
          isUnverifiedPlatform: isFlagged,
          potentialScamIndicators: isFlagged ? ['Registration fee requested upfront', 'Unrealistic earning guarantee'] : [],
          compensationClassification: isFlagged ? 'Unrealistic/Deceptive' : 'Estimated Compensation',
          compensationNotes: isFlagged ? 'Deceptive guarantee' : 'Variable task-based compensation.',
          riskSummary: isFlagged ? 'High-risk unverified offer.' : 'Verified platform with compliant payment policies.'
        },
        explanation: {
          whyMatches: `Matched ${matched.length} of ${opp.skills_required?.length || 0} required skills for ${opp.platform?.name}.`,
          requiredSkills: opp.skills_required || [],
          skillsMatched: matched,
          missingSkills: missing,
          isWorthApplying: !isFlagged && rawScore >= 60,
          summaryVerdict: isFlagged ? 'Do not apply.' : 'Solid earning candidate.',
          applicationTips: ['Highlight past evaluation experience on onboarding assessment.']
        },
        analyzedAt: new Date().toISOString()
      };

      return {
        ...opp,
        ai: initialAnalysis
      };
    }).sort((a, b) => b.ai.matchScore - a.ai.matchScore);
  }, [opportunities, profile, aiAnalysisMap]);

  const filtered = useMemo(() => {
    if (filterCategory === 'All') return enrichedList;
    return enrichedList.filter(item => item.ai.recommendationCategory === filterCategory);
  }, [enrichedList, filterCategory]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold border border-cyan-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini Opportunity Intelligence Matrix</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">AI Tailored Opportunities</h2>
        <p className="text-xs md:text-sm text-slate-400">
          Ranked dynamically by skill compatibility, India legal residency, direct Indian bank transfer support, and scam risk detection.
        </p>
      </div>

      {/* Category Pills Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['All', 'Excellent Match', 'Good Match', 'Needs Review', 'Not Recommended'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterCategory === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recommendations Feed */}
      <div className="space-y-4">
        {filtered.map(item => {
          const ai = item.ai;
          const matchColor = 
            ai.matchScore >= 80 
              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
              : ai.matchScore >= 60 
              ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
              : ai.matchScore >= 45 
              ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
              : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

          return (
            <div
              key={item.id}
              className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition-all"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-indigo-400">{item.platform?.name}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-300 font-medium">{item.platform?.platform_category}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${matchColor}`}>
                    {ai.matchScore}% Match ({ai.recommendationCategory})
                  </span>
                  
                  {/* India Eligibility Badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    ai.indiaEligibility === 'Confirmed available in India'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : ai.indiaEligibility === 'Conditional'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {ai.indiaEligibility}
                  </span>

                  {/* Bank Transfer Badge */}
                  {ai.paymentVerification.matchesUserPreference && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 font-medium">
                      <Landmark className="w-2.5 h-2.5" />
                      Direct Bank Transfer Supported
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">{item.title}</h3>

                {/* AI Rationale Box */}
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">AI Verdict: </span>
                    <span>{ai.explanation.whyMatches}</span>
                    <span className="block mt-0.5 text-slate-400 text-[11px]">
                      Compensation classification: <strong>{ai.riskAssessment.compensationClassification}</strong>
                    </span>
                  </div>
                </div>

                {/* Skills Analysis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">
                      Matched Skills ({ai.explanation.skillsMatched.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ai.explanation.skillsMatched.map(s => (
                        <span key={s} className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">
                      Missing Competencies ({ai.explanation.missingSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ai.explanation.missingSkills.length > 0 ? (
                        ai.explanation.missingSkills.map(s => (
                          <span key={s} className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-amber-400" /> {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-400">All required skills present!</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Action Panel */}
              <div className="md:w-56 shrink-0 flex flex-col justify-center gap-3 md:border-l md:border-slate-800/80 md:pl-6">
                <div>
                  <span className="text-xs text-slate-400 block">Compensation</span>
                  <span className="text-lg font-bold text-emerald-400">{item.compensation}</span>
                  <span className="text-[10px] text-slate-500 block">Deadline: {item.deadline}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => onOpenAIModal(item)}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Full AI Dossier</span>
                  </button>

                  <button
                    onClick={() => onOpenPrep(item)}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 hover:text-white border border-cyan-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Prepare Application</span>
                  </button>

                  <button
                    onClick={() => onApply(item)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-md shadow-indigo-600/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Track in Pipeline</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// PAGE 4: APPLICATION MANAGER
// ----------------------------------------------------------------------------------
function ApplicationManagerView({
  applications,
  aiAnalysisMap,
  prepMap,
  onStageChange,
  onOpenAIModal,
  onOpenPrep
}: {
  applications: ApplicationRecord[];
  aiAnalysisMap: Record<string, AIOpportunityAnalysis>;
  prepMap?: Record<string, AIApplicationPrep>;
  onStageChange: (id: string, stage: ApplicationStage) => void;
  onOpenAIModal: (opp: OpportunityRecord) => void;
  onOpenPrep: (opp: OpportunityRecord) => void;
}) {
  const stages: ApplicationStage[] = [
    'Saved',
    'Applied',
    'Assessment',
    'Interview',
    'Pending approval',
    'Accepted',
    'Rejected'
  ];

  const [activeStageFilter, setActiveStageFilter] = useState<string>('All');

  const filteredApps = useMemo(() => {
    if (activeStageFilter === 'All') return applications;
    return applications.filter(a => a.status === activeStageFilter);
  }, [applications, activeStageFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Application Pipeline</h2>
          <p className="text-xs md:text-sm text-slate-400">Track milestones, technical assessments, and store Gemini Intelligence audits in database.</p>
        </div>
        <div className="text-xs text-slate-400">
          Total active: <span className="text-white font-bold">{applications.length}</span>
        </div>
      </div>

      {/* Stage Selector Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveStageFilter('All')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeStageFilter === 'All'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({applications.length})
        </button>
        {stages.map(st => {
          const count = applications.filter(a => a.status === st).length;
          const isActive = activeStageFilter === st;
          return (
            <button
              key={st}
              onClick={() => setActiveStageFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{st}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <BriefcaseBusiness className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No applications in this stage</h3>
            <p className="text-xs text-slate-500 mt-1">Track opportunities from Discover or AI Intelligence.</p>
          </div>
        ) : (
          filteredApps.map(app => {
            const opp = app.opportunity;
            const ai = app.screening_answers?.ai_intelligence || (opp ? aiAnalysisMap[opp.id] : null);
            const hasPrep = Boolean(app.cover_letter || app.screening_answers?.ai_prep || (opp && prepMap?.[opp.id]));

            return (
              <div
                key={app.id}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-white">{opp?.platform?.name || 'Platform'}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">{opp?.compensation || 'Standard Rate'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                      {app.status}
                    </span>

                    {/* AI Tag */}
                    {ai && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Score: {ai.matchScore}%
                      </span>
                    )}

                    {hasPrep && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        Cover Letter Ready
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-sm text-slate-200">{opp?.title || 'Tracked Application'}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{app.notes || 'No notes added'}</p>
                  
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Applied: {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                    {opp && (
                      <button
                        onClick={() => onOpenAIModal(opp)}
                        className="text-indigo-400 hover:text-indigo-300 underline text-xs"
                      >
                        Inspect AI Intelligence Audit
                      </button>
                    )}
                    {opp && (
                      <button
                        onClick={() => onOpenPrep(opp)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 text-xs"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{hasPrep ? 'Edit Application Proposal' : 'Prepare Proposal with AI'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500">Update Status:</span>
                  <select
                    value={app.status}
                    onChange={(e) => onStageChange(app.id, e.target.value as ApplicationStage)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    {stages.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// PAGE 5: EARNINGS TRACKER
// ----------------------------------------------------------------------------------
function EarningsTrackerView({
  earnings,
  totalEarned,
  pendingPayments,
  onAddManualRecord
}: {
  earnings: EarningRecord[];
  totalEarned: number;
  pendingPayments: number;
  onAddManualRecord: (payload: {
    platform_id: string | null;
    opportunity_id: string | null;
    amount: number;
    payment_status: 'Received' | 'Pending';
    payment_date: string;
    payment_method?: string;
    platformName?: string;
  }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [method, setMethod] = useState('Indian bank transfer');
  const [status, setStatus] = useState<'Received' | 'Pending'>('Received');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [calcHours, setCalcHours] = useState(20);
  const [calcRate, setCalcRate] = useState(25);

  const INR_RATE = 86.50;

  const formatCurrency = (amountUSD: number) => {
    if (currency === 'INR') {
      const inr = amountUSD * INR_RATE;
      return `₹${Math.round(inr).toLocaleString('en-IN')}`;
    }
    return `$${amountUSD.toFixed(2)}`;
  };

  const platformBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    earnings.forEach(e => {
      const name = e.platform?.name || 'Freelance Remittance';
      map[name] = (map[name] || 0) + Number(e.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [earnings]);

  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    onAddManualRecord({
      platform_id: null,
      opportunity_id: null,
      amount: parseFloat(amount),
      payment_status: status,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: method,
      platformName: platformName || 'Outlier / Contract'
    });

    setAmount('');
    setPlatformName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Earnings & Settlements</h2>
          <p className="text-xs md:text-sm text-slate-400">Track cleared remittances, pending invoices, and Indian bank transfer settlements.</p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currency === 'USD' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            USD ($)
          </button>
          <button
            onClick={() => setCurrency('INR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currency === 'INR' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>INR (₹)</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 opacity-80">1$ = ₹86.50</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block mb-1">Total Earned (Received)</span>
          <span className="text-2xl md:text-3xl font-extrabold text-emerald-400">{formatCurrency(totalEarned)}</span>
          <span className="text-[11px] text-slate-500 block mt-2">Deposited to verified accounts</span>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block mb-1">Pending Clearance</span>
          <span className="text-2xl md:text-3xl font-extrabold text-amber-400">{formatCurrency(pendingPayments)}</span>
          <span className="text-[11px] text-slate-500 block mt-2">Awaiting weekly batch release</span>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block mb-1">Net Aggregate</span>
          <span className="text-2xl md:text-3xl font-extrabold text-white">{formatCurrency(totalEarned + pendingPayments)}</span>
          <span className="text-[11px] text-slate-500 block mt-2">Combined ledger volume</span>
        </div>
      </div>

      {/* Projected Monthly Income Calculator & Remittance Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income Projection Widget */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Projected Monthly Earning Potential</span>
            </h3>
            <span className="text-xs text-cyan-300 font-semibold">{currency === 'INR' ? 'In Indian Rupees (₹)' : 'In US Dollars ($)'}</span>
          </div>

          <p className="text-xs text-slate-400">
            Estimate your monthly net income from verified platforms based on hourly commitment.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Avg Hourly Target ($/hr): <strong className="text-white">${calcRate}</strong></label>
              <input
                type="range"
                min="12"
                max="65"
                step="1"
                value={calcRate}
                onChange={e => setCalcRate(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Weekly Commitment: <strong className="text-white">{calcHours} hrs/wk</strong></label>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={calcHours}
                onChange={e => setCalcHours(parseInt(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Est. Monthly Earnings (~{calcHours * 4.3} hrs):</span>
              <span className="text-xl font-bold text-emerald-400">
                {formatCurrency(calcHours * 4.33 * calcRate)}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span>Weekly: <strong>{formatCurrency(calcHours * calcRate)}</strong></span>
              <span className="block text-slate-500">Based on regular task throughput</span>
            </div>
          </div>
        </div>

        {/* Indian Bank Transfer Compliance Checklist */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Direct Indian Bank Transfer Remittance Guide</h3>
          </div>

          <p className="text-xs text-slate-400">
            Checklist for receiving international client funds directly into HDFC, SBI, ICICI, Axis, or other Indian bank accounts.
          </p>

          <div className="space-y-1.5 text-xs">
            {[
              { title: 'PAN Name Match', desc: 'Ensure platform account legal name matches PAN Card and Bank passbook exactly.' },
              { title: 'Form W-8BEN', desc: 'File online to reduce US tax withholding from 30% to 15% under the India-US DTAA treaty.' },
              { title: 'IFSC & SWIFT Code', desc: 'Provide IFSC code for NEFT/IMPS or SWIFT/BIC for direct wire remittances.' },
              { title: 'FIRC Retrieval', desc: 'Download Foreign Inward Remittance Certificate from your bank net-banking portal for ITR filing.' }
            ].map((step, idx) => (
              <div key={idx} className="p-2 bg-slate-900/80 rounded-lg border border-slate-800/80 flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">{step.title}: </span>
                  <span className="text-slate-400 text-[11px]">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Platform-wise Earnings</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution by remote platform</p>
          <div className="h-56 w-full flex items-center justify-center">
            {platformBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {platformBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => `$${Number(val || 0).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-500 italic">No earnings data recorded yet</span>
            )}
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            {platformBreakdown.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-semibold">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Log Payout Event</h3>
          <p className="text-xs text-slate-400 mb-4">Add records from your gig accounts</p>
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Platform Name</label>
              <input
                type="text"
                placeholder="e.g. Welocalize, Alignerr, Outlier"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Amount ($ USD)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="250.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'Received' | 'Pending')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Received">Received</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Method</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Indian bank transfer">Indian bank transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Payoneer">Payoneer</option>
                  <option value="PayPal">PayPal</option>
                  <option value="AirTM">AirTM</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-md shadow-indigo-600/30"
            >
              Add Ledger Item
            </button>
          </form>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Recent Ledger Entries</h3>
            <p className="text-xs text-slate-400 mb-4">Latest verified transactions</p>
            <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
              {earnings.map(item => (
                <div key={item.id} className="p-3 bg-slate-900/90 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">{item.platform?.name || 'Direct Task Contract'}</span>
                    <span className="text-[11px] text-slate-400">{item.payment_date} • {item.payment_method || 'Indian bank transfer'}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block ${item.payment_status === 'Received' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      +${Number(item.amount).toFixed(2)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${
                      item.payment_status === 'Received' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'
                    }`}>
                      {item.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// PAGE 6: MY PROFILE
// ----------------------------------------------------------------------------------
function ProfileView({
  profile,
  onSaveProfile
}: {
  profile: ProfileRecord;
  onSaveProfile: (updated: ProfileRecord) => void;
}) {
  const [formData, setFormData] = useState<ProfileRecord>(profile);
  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skills.includes(skillInput.trim())) {
        setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skillToRemove)
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Candidate Profile & Skill Inventory</h2>
        <p className="text-xs md:text-sm text-slate-400">
          The Gemini Opportunity Intelligence Engine references these verified parameters to calculate match scores and eligibility.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name || ''}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Country of Legal Residency</label>
            <input
              type="text"
              value={formData.country || ''}
              onChange={e => setFormData({ ...formData, country: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Highest Education Attained</label>
            <input
              type="text"
              value={formData.education || ''}
              onChange={e => setFormData({ ...formData, education: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Relevant Experience (Years)</label>
            <input
              type="number"
              value={formData.experience_years || 2}
              onChange={e => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Preferred Payment Method</label>
            <select
              value={formData.preferred_payment_methods?.[0] || 'Indian bank transfer'}
              onChange={e => setFormData({ ...formData, preferred_payment_methods: [e.target.value] })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Indian bank transfer">Direct Indian bank transfer (Preferred)</option>
              <option value="UPI">UPI</option>
              <option value="Payoneer">Payoneer</option>
              <option value="PayPal">PayPal</option>
              <option value="Wise">Wise</option>
            </select>
          </div>
        </div>

        {/* Skills Tag Management */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 block">
            Skills & Competencies <span className="text-slate-500">(Type and press Enter to add)</span>
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl min-h-[50px] items-center">
            {(formData.skills || []).map(skill => (
              <span
                key={skill}
                className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="e.g. Python, RLHF, Hindi Translation..."
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none flex-1 min-w-[180px] py-1"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs md:text-sm shadow-lg shadow-indigo-600/30 transition-all"
          >
            Save Profile & Update AI Engine
          </button>
        </div>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// PAGE 7: SETTINGS
// ----------------------------------------------------------------------------------
function SettingsView({ showToast }: { showToast: (msg: string) => void }) {
  const [minMatchThreshold, setMinMatchThreshold] = useState(70);
  const [strictIndiaCheck, setStrictIndiaCheck] = useState(true);
  const [blockHighRisk, setBlockHighRisk] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Platform & AI Preferences</h2>
        <p className="text-xs md:text-sm text-slate-400">Configure matching thresholds, scam protection heuristics, and notification settings.</p>
      </div>

      <div className="space-y-5">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">AI Opportunity Intelligence Controls</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">Minimum Match Threshold for Recommendation</span>
                  <span className="text-slate-400">Filter out low-alignment opportunities automatically</span>
                </div>
                <span className="font-mono text-cyan-400 font-bold text-sm">{minMatchThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={minMatchThreshold}
                onChange={e => setMinMatchThreshold(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Strict India Residency Enforcement</span>
                  <span className="text-slate-400">Flag opportunities as Conditional/Not Available unless verified with documentation</span>
                </div>
                <input
                  type="checkbox"
                  checked={strictIndiaCheck}
                  onChange={e => setStrictIndiaCheck(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Auto-Flag Registration Fee Listings</span>
                  <span className="text-slate-400">Mark platforms requiring upfront starter kit / test fees as Critical Risk</span>
                </div>
                <input
                  type="checkbox"
                  checked={blockHighRisk}
                  onChange={e => setBlockHighRisk(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sliders className="w-4 h-4" />
            <h3 className="font-bold text-sm text-white">Notifications & Alerts</h3>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-200 block">Direct Bank Transfer Opportunity Alerts</span>
              <span className="text-slate-400">Receive alerts when new verified listings supporting Indian Bank Transfer appear</span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={e => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600 bg-slate-900 border-slate-700 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => showToast('Preferences updated and applied to Gemini Intelligence engine.')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30"
          >
            Save Intelligence Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
