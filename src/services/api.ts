import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { 
  ProfileRecord, 
  OpportunityRecord, 
  ApplicationRecord, 
  EarningRecord, 
  ApplicationStage 
} from '../types';
import { 
  sampleOpportunities, 
  sampleApplications, 
  sampleEarnings, 
  initialProfile 
} from '../data/mockData';

// Local storage fallback keys for persistent demo edits
const STORAGE_PROFILE = 'sudu_profile_data';
const STORAGE_APPS = 'sudu_apps_data';
const STORAGE_EARNINGS = 'sudu_earnings_data';

// ========================
// PROFILES
// ========================
export async function getProfile(userId: string): Promise<ProfileRecord> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) return data;
    } catch (e) {
      console.warn('Supabase profile fetch failed, using local', e);
    }
  }

  const saved = localStorage.getItem(STORAGE_PROFILE);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return initialProfile;
}

export async function updateProfile(profile: Partial<ProfileRecord> & { id: string }): Promise<ProfileRecord> {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          country: profile.country,
          education: profile.education,
          skills: profile.skills,
          preferred_payment_methods: profile.preferred_payment_methods
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (data && !error) return data;
    } catch (e) {
      console.warn('Supabase updateProfile error, saved locally', e);
    }
  }

  return profile as ProfileRecord;
}

// ========================
// OPPORTUNITIES
// ========================
export async function getOpportunities(): Promise<OpportunityRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          platform:platforms(*)
        `)
        .order('created_at', { ascending: false });

      if (data && data.length > 0 && !error) {
        return data as OpportunityRecord[];
      }
    } catch (e) {
      console.warn('Supabase getOpportunities error, using verified samples', e);
    }
  }

  return sampleOpportunities;
}

// ========================
// APPLICATIONS
// ========================
export async function getUserApplications(userId: string): Promise<ApplicationRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          opportunity:opportunities(
            *,
            platform:platforms(*)
          )
        `)
        .eq('user_id', userId)
        .order('applied_at', { ascending: false });

      if (data && !error) return data as ApplicationRecord[];
    } catch (e) {
      console.warn('Supabase getUserApplications error, fallback to local', e);
    }
  }

  const saved = localStorage.getItem(STORAGE_APPS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return sampleApplications;
}

export async function createApplication(
  userId: string,
  opportunityId: string,
  status: ApplicationStage = 'Applied',
  notes = 'Tracked in Sudu EarnFlow AI',
  opportunityObj?: OpportunityRecord
): Promise<ApplicationRecord> {
  const newApp: ApplicationRecord = {
    id: `app-${Date.now()}`,
    user_id: userId,
    opportunity_id: opportunityId,
    status,
    notes,
    applied_at: new Date().toISOString(),
    opportunity: opportunityObj
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          opportunity_id: opportunityId,
          status,
          notes,
          applied_at: new Date().toISOString()
        })
        .select(`
          *,
          opportunity:opportunities(
            *,
            platform:platforms(*)
          )
        `)
        .single();

      if (data && !error) return data as ApplicationRecord;
    } catch (e) {
      console.warn('Supabase createApplication error, saved locally', e);
    }
  }

  const currentApps = await getUserApplications(userId);
  const updated = [newApp, ...currentApps.filter(a => a.opportunity_id !== opportunityId)];
  localStorage.setItem(STORAGE_APPS, JSON.stringify(updated));
  return newApp;
}

export async function updateApplicationStage(
  appId: string, 
  status: ApplicationStage, 
  userId?: string
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('applications')
        .update({ status })
        .eq('id', appId);
    } catch (e) {
      console.warn('Supabase updateApplicationStage error', e);
    }
  }

  const saved = localStorage.getItem(STORAGE_APPS);
  if (saved) {
    try {
      const parsed: ApplicationRecord[] = JSON.parse(saved);
      const updated = parsed.map(a => a.id === appId ? { ...a, status } : a);
      localStorage.setItem(STORAGE_APPS, JSON.stringify(updated));
    } catch (e) {}
  }
}

// ========================
// EARNINGS
// ========================
export async function getUserEarnings(userId: string): Promise<EarningRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('earnings')
        .select(`
          *,
          platform:platforms(*)
        `)
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (data && !error) return data as EarningRecord[];
    } catch (e) {
      console.warn('Supabase getUserEarnings error', e);
    }
  }

  const saved = localStorage.getItem(STORAGE_EARNINGS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return sampleEarnings;
}

export async function addEarningRecord(
  userId: string,
  payload: {
    platform_id: string | null;
    opportunity_id: string | null;
    amount: number;
    payment_status: 'Received' | 'Pending';
    payment_date: string;
    payment_method?: string;
    platformName?: string;
  }
): Promise<EarningRecord> {
  const newRec: EarningRecord = {
    id: `ern-${Date.now()}`,
    user_id: userId,
    platform_id: payload.platform_id,
    opportunity_id: payload.opportunity_id,
    amount: payload.amount,
    currency: 'USD',
    payment_status: payload.payment_status,
    payment_date: payload.payment_date,
    payment_method: payload.payment_method || 'Indian bank transfer',
    platform: payload.platformName ? {
      id: payload.platform_id || 'p-custom',
      name: payload.platformName,
      website_url: '',
      india_supported: true,
      payment_methods: [payload.payment_method || 'Indian bank transfer'],
      platform_category: 'Remote Work',
      verification_status: 'Verified',
      notes: ''
    } : undefined
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('earnings')
        .insert({
          user_id: userId,
          platform_id: payload.platform_id,
          opportunity_id: payload.opportunity_id,
          amount: payload.amount,
          payment_status: payload.payment_status,
          payment_date: payload.payment_date,
          currency: 'USD'
        })
        .select(`
          *,
          platform:platforms(*)
        `)
        .single();

      if (data && !error) return data as EarningRecord;
    } catch (e) {
      console.warn('Supabase addEarningRecord error, saving locally', e);
    }
  }

  const current = await getUserEarnings(userId);
  const updated = [newRec, ...current];
  localStorage.setItem(STORAGE_EARNINGS, JSON.stringify(updated));
  return newRec;
}
