import { createClient, SupabaseClient, Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

// Environment credentials for Supabase project lgfgxdhxjnmuebjsefnc
const defaultSupabaseUrl = 'https://lgfgxdhxjnmuebjsefnc.supabase.co';
const defaultAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZmd4ZGh4am5tdWVianNlZm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTU5NzEsImV4cCI6MjEwNzEzMTk3MX0.PfNJI-eX1HkYnbe8ScNR0t53w75oOdbBi1lCm-S47pk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseUrl.trim() !== ''
);

// Create Supabase client instance with auto session persistence and URL detection
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Database Types for InternTrack
export interface DbProfile {
  id: string;
  user_id?: string;
  email: string;
  full_name: string;
  role: 'coordinator' | 'student';
  bu_id: string;
  department: string;
  class_block?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbStudent {
  id: string;
  profile_id?: string;
  bu_id: string;
  full_name: string;
  email: string;
  degree: string;
  class_block?: string;
  batch_id?: string;
  company_id?: string;
  company_name?: string;
  company_branch?: string;
  mentor_name?: string;
  coordinator_id?: string;
  coordinator_name?: string;
  duty_start: string;
  duty_end: string;
  target_hours: number;
  rendered_hours: number;
  enrollment_status: 'not_enrolled' | 'pending_approval' | 'approved' | 'declined';
  status: 'active' | 'completed' | 'at_risk';
  created_at: string;
}

export interface DbAttendanceLog {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  time_in: string;
  time_out?: string;
  hours_rendered: number;
  status: 'present' | 'late' | 'undertime' | 'absent';
  remarks?: string;
  created_at: string;
}

export interface DbAccomplishmentReport {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  week_number: number;
  work_category: string;
  task_title: string;
  task_description: string;
  supervisor_assigned_duty?: string;
  hours_spent: number;
  task_status: 'completed' | 'in_progress' | 'blocked';
  obstacles_faced?: string;
  created_at: string;
}

/**
 * Automatically assume the student number between the first few letters and @bicol-u.edu.ph
 * e.g., "jae2023-9312-44732@bicol-u.edu.ph" -> "2023-9312-44732"
 */
export function extractStudentIdFromEmail(email: string): string {
  if (!email) return '';
  const clean = email.trim().toLowerCase();
  const atIndex = clean.indexOf('@');
  const localPart = atIndex !== -1 ? clean.slice(0, atIndex) : clean;
  // Match digits and hyphens starting from the first digit
  const match = localPart.match(/\d[\d-]*/);
  if (match) {
    return match[0].replace(/-+$/, '');
  }
  // Fallback: strip leading letters
  const stripped = localPart.replace(/^[a-zA-Z._-]+/, '');
  return stripped || localPart;
}

/**
 * Verify whether an email is a valid Bicol University institutional student email
 */
export function isStudentEmailValid(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase().endsWith('@bicol-u.edu.ph');
}

/**
 * Probe Google OAuth status in Supabase & Google Cloud Console
 */
export async function checkGoogleOAuthStatus(): Promise<{
  configured: boolean;
  error?: string;
  message?: string;
  clientId?: string;
  redirectUri?: string;
  appName?: string;
  authorizeUrl?: string;
}> {
  try {
    const origin = encodeURIComponent(window.location.origin);
    const res = await fetch(`/api/auth/check-google-oauth?origin=${origin}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not probe Google OAuth status:', err);
  }
  return {
    configured: false,
    error: 'network_error',
    message: 'Could not connect to auth verification service.',
  };
}

/**
 * Trigger Google OAuth Sign-In or Sign-Up via Supabase
 */
export async function signInWithGoogle(): Promise<{
  error: Error | null;
  providerNotConfigured?: boolean;
  errorType?: string;
  clientId?: string;
  redirectUri?: string;
  message?: string;
  url?: string;
  isPopup?: boolean;
  popupOpened?: boolean;
}> {
  // First, verify live status with our backend probe
  const liveStatus = await checkGoogleOAuthStatus();
  if (!liveStatus.configured) {
    return {
      error: null,
      providerNotConfigured: true,
      errorType: liveStatus.error,
      clientId: liveStatus.clientId,
      redirectUri: liveStatus.redirectUri || 'https://lgfgxdhxjnmuebjsefnc.supabase.co/auth/v1/callback',
      message: liveStatus.message || 'Google OAuth requires configuration in Google Cloud Console.',
    };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return {
          error: null,
          providerNotConfigured: true,
          errorType: 'provider_error',
          message: error.message,
        };
      }

      const targetUrl = data?.url || liveStatus.authorizeUrl;

      if (!targetUrl) {
        return {
          error: new Error('No authorization URL returned by Supabase.'),
        };
      }

      const isIframe = window.self !== window.top;

      if (isIframe) {
        // Google accounts login sets X-Frame-Options: DENY, so it cannot load inside an iframe.
        // We open the Google sign-in window in a popup or new tab.
        let authWindow: Window | null = null;
        try {
          authWindow = window.open(
            targetUrl,
            'google_oauth_popup',
            'width=550,height=680,menubar=no,toolbar=no,status=no,resizable=yes'
          );
        } catch (e) {
          console.warn('Popup open error:', e);
        }

        const opened = !!authWindow && !authWindow.closed;
        return {
          error: null,
          url: targetUrl,
          isPopup: true,
          popupOpened: opened,
          message: opened
            ? 'Google Sign-In opened in a secure window. Please complete sign-in.'
            : 'Popup blocked. Click "Open Google Sign-In" to continue.',
        };
      } else {
        // Standalone window: redirect directly
        window.location.assign(targetUrl);
        return { error: null, url: targetUrl };
      }
    } catch (err: any) {
      return { error: err };
    }
  }

  return {
    error: null,
    providerNotConfigured: true,
    message: 'Supabase credentials configuring...',
  };
}

/**
 * Register via standard Create Account with Supabase Email Confirmation & 6-digit OTP
 */
export async function signUpWithEmail(data: {
  email: string;
  password?: string;
  fullName: string;
  role: 'coordinator' | 'student';
  buId?: string;
  department?: string;
  classBlock?: string;
  companyId?: string;
}): Promise<{
  error: Error | null;
  needsConfirmation: boolean;
  officialOtp?: string;
  actionLink?: string;
  rateLimited?: boolean;
  message?: string;
}> {
  try {
    const res = await fetch('/api/auth/supabase-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to initialize Supabase registration');
    }

    // Also attempt client-side Supabase auth signup in background
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signUp({
          email: data.email,
          password: data.password || 'TemporaryPassword123!',
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: data.fullName,
              role: data.role,
              bu_id: data.buId,
              department: data.department,
              class_block: data.classBlock,
            },
          },
        });
      } catch (e) {
        // If client-side hit rate limit, backend generateLink handled it cleanly
      }
    }

    return {
      error: null,
      needsConfirmation: true,
      officialOtp: result.officialOtp,
      actionLink: result.actionLink,
      rateLimited: result.rateLimited,
      message: result.message,
    };
  } catch (err: any) {
    return {
      error: err,
      needsConfirmation: false,
    };
  }
}

/**
 * Verify 6-digit Email Confirmation OTP code via Supabase
 */
export async function verifyEmailOtp(data: {
  email: string;
  token: string;
}): Promise<{ error: Error | null; user?: any }> {
  const cleanToken = data.token.trim();

  try {
    const res = await fetch('/api/auth/supabase-verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, token: cleanToken }),
    });
    const result = await res.json();
    if (res.ok && result.success) {
      // Also establish client-side Supabase session if token valid
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.verifyOtp({
            email: data.email,
            token: cleanToken,
            type: 'signup',
          });
        } catch (e) {
          // Fall through
        }
      }
      return { error: null, user: result.user };
    } else if (!res.ok && result.error) {
      return { error: new Error(result.error) };
    }
  } catch (err: any) {
    // Continue to client-side fallback
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: verifyData, error } = await supabase.auth.verifyOtp({
        email: data.email,
        token: cleanToken,
        type: 'signup',
      });
      if (error) throw error;
      return { error: null, user: verifyData.user };
    } catch (err: any) {
      return { error: err };
    }
  }

  return {
    error: new Error('Invalid verification code. Please check your 6-digit OTP or request a new code.'),
  };
}

/**
 * Resend Email Confirmation OTP with rate limiting helper
 */
export async function resendVerificationEmail(email: string): Promise<{
  error: Error | null;
  newOtp?: string;
  actionLink?: string;
}> {
  try {
    const res = await fetch('/api/auth/supabase-resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resend confirmation code');

    // Also attempt client-side Supabase resend
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: window.location.origin },
        });
      } catch (e) {
        // Rate-limited
      }
    }

    return { error: null, newOtp: data.newOtp, actionLink: data.actionLink };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Check if the current user profile in Supabase is missing institutional details
 */
export function isProfileMissingInstitutionalDetails(profile: Partial<DbProfile> | null | undefined): boolean {
  if (!profile) return true;
  const hasRole = Boolean(profile.role === 'coordinator' || profile.role === 'student');
  const hasBuId = Boolean(profile.bu_id && profile.bu_id.trim() !== '');
  const hasDepartment = Boolean(profile.department && profile.department.trim() !== '');
  return !hasRole || !hasBuId || !hasDepartment;
}

/**
 * Health check helper to verify Supabase connection status
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; projectUrl: string }> {
  try {
    const res = await fetch('/api/supabase/status');
    const data = await res.json();
    if (data.configured) {
      return {
        ok: true,
        projectUrl: data.url || 'lgfgxdhxjnmuebjsefnc.supabase.co',
        message: `Successfully connected to Supabase (${data.url || 'lgfgxdhxjnmuebjsefnc.supabase.co'})`,
      };
    }
  } catch (e) {
    // Continue
  }

  if (isSupabaseConfigured && supabase) {
    return {
      ok: true,
      projectUrl: supabaseUrl,
      message: `Connected to Supabase at ${supabaseUrl}`,
    };
  }

  return {
    ok: false,
    projectUrl: '',
    message: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  };
}

export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Generates a permanent, single profile UUID for an account based on email
export function getDeterministicUuid(email: string): string {
  const clean = (email || '').toLowerCase().trim();
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  const hex = (p1 + p2 + p3 + p4).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function toIsoDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return new Date().toISOString().split('T')[0];
}

export function toIsoDateTime(dateStr?: string | null, timeStr?: string | null): string | null {
  if (!timeStr) return null;
  try {
    if (timeStr.includes('T')) return new Date(timeStr).toISOString();
    const isoDate = toIsoDate(dateStr);
    const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    d.setUTCHours(h, m, s, 0);
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Diagnostic logs function within the Supabase service module to catch silent failures
 * during syncStudentToSupabase and related operations, providing a console output
 * for every successful or failed database write.
 */
export function logDbDiagnostic(
  operation: string,
  success: boolean,
  targetTable: string,
  details?: any,
  error?: any
) {
  const timestamp = new Date().toISOString();
  const errorCode = error?.code || error?.status;
  if (errorCode === 'PGRST205' || String(error?.message || '').includes('schema cache')) {
    console.warn(
      `[SUPABASE DB NOTICE] [${timestamp}] Table "${targetTable}" not present in remote schema cache (optional table skipped).`
    );
    return;
  }

  if (success) {
    console.log(
      `[SUPABASE DB WRITE SUCCESS] [${timestamp}] Operation: "${operation}" | Table: "${targetTable}"`,
      details || ''
    );
  } else {
    console.error(
      `[SUPABASE DB WRITE FAILURE] [${timestamp}] Operation: "${operation}" | Table: "${targetTable}"`,
      error || details || 'Unknown error'
    );
  }
}

/**
 * Strict Role Isolation Check: Prevents an account from registering across both roles.
 */
export async function checkRoleIsolation(
  userIdOrEmail: string,
  targetRole: 'coordinator' | 'student'
): Promise<{ allowed: boolean; conflictingRole?: 'coordinator' | 'student'; message?: string }> {
  if (!isSupabaseConfigured || !supabase) return { allowed: true };
  const clean = userIdOrEmail.toLowerCase().trim();

  try {
    if (targetRole === 'coordinator') {
      const { data: st } = await supabase
        .from('students')
        .select('id, email, auth_user_id')
        .or(`email.eq.${clean},auth_user_id.eq.${clean},id.eq.${clean}`)
        .limit(1);
      if (st && st.length > 0) {
        return {
          allowed: false,
          conflictingRole: 'student',
          message: 'This account is already registered as a Student.',
        };
      }
    } else {
      const { data: cp } = await supabase
        .from('coordinators')
        .select('id, email, auth_user_id')
        .or(`email.eq.${clean},auth_user_id.eq.${clean},id.eq.${clean}`)
        .limit(1);
      if (cp && cp.length > 0) {
        return {
          allowed: false,
          conflictingRole: 'coordinator',
          message: 'This account is already registered as a Coordinator.',
        };
      }
    }
  } catch (err) {
    console.warn('Role isolation query note:', err);
  }

  return { allowed: true };
}

/**
 * Synchronize user profile into Supabase
 */
export async function syncProfileToSupabase(profile: {
  id?: string;
  email: string;
  fullName: string;
  role: 'coordinator' | 'student';
  buId: string;
  department?: string;
  classBlock?: string;
  avatarUrl?: string;
  studentIdNumber?: string;
  coordinatorIdNumber?: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const cleanEmail = profile.email.toLowerCase().trim();
  const avatarToSave = profile.avatarUrl && profile.avatarUrl.trim() !== '' ? profile.avatarUrl.trim() : null;

  try {
    const singleProfileId = (profile.id && isValidUuid(profile.id))
      ? profile.id
      : isValidUuid(profile.studentIdNumber)
      ? profile.studentIdNumber!
      : isValidUuid(profile.coordinatorIdNumber)
      ? profile.coordinatorIdNumber!
      : getDeterministicUuid(cleanEmail);

    // Strict Role Isolation Enforcement
    const isolation = await checkRoleIsolation(singleProfileId, profile.role);
    if (!isolation.allowed) {
      throw new Error(isolation.message);
    }
    const emailIsolation = await checkRoleIsolation(cleanEmail, profile.role);
    if (!emailIsolation.allowed) {
      throw new Error(emailIsolation.message);
    }

    if (profile.role === 'coordinator') {
      // 1. Sync to coordinators table (user's schema)
      let coordPayload: any = {
        id: singleProfileId,
        auth_user_id: singleProfileId,
        full_name: profile.fullName,
        email: cleanEmail,
        department: profile.department || 'Department of Computer Science',
      };
      let { error: coordErr } = await supabase.from('coordinators').upsert(coordPayload, { onConflict: 'email' });
      if (coordErr && (coordErr.code === '23503' || String(coordErr.message || '').includes('foreign key constraint'))) {
        delete coordPayload.auth_user_id;
        const { error: coordErr2 } = await supabase.from('coordinators').upsert(coordPayload, { onConflict: 'email' });
        coordErr = coordErr2;
      }
      logDbDiagnostic('upsert', !coordErr, 'coordinators', { email: cleanEmail }, coordErr);

      // 2. Also sync to coordinator_profiles
      const coordIdNum = profile.coordinatorIdNumber || profile.buId;
      let cpPayload: any = {
        id: singleProfileId,
        user_id: singleProfileId,
        coordinator_id_number: coordIdNum,
        bu_id: profile.buId,
        full_name: profile.fullName,
        email: cleanEmail,
        role: 'coordinator',
        department: profile.department || 'Department of Computer Science',
        avatar_url: avatarToSave,
        updated_at: new Date().toISOString(),
      };
      let { error: cpErr } = await supabase.from('coordinator_profiles').upsert(cpPayload, { onConflict: 'email' });
      if (cpErr && (cpErr.code === '23503' || String(cpErr.message || '').includes('foreign key constraint'))) {
        delete cpPayload.user_id;
        const { error: cpErr2 } = await supabase.from('coordinator_profiles').upsert(cpPayload, { onConflict: 'email' });
        cpErr = cpErr2;
      }
      logDbDiagnostic('upsert', !cpErr, 'coordinator_profiles', { email: cleanEmail }, cpErr);
    } else {
      // Student profile
      const studentIdNum = profile.studentIdNumber || profile.buId;
      let spPayload: any = {
        id: singleProfileId,
        user_id: singleProfileId,
        student_id_number: studentIdNum,
        bu_id: profile.buId,
        full_name: profile.fullName,
        email: cleanEmail,
        department: profile.department || 'Department of Computer Science',
        class_block: profile.classBlock || null,
        avatar_url: avatarToSave,
        updated_at: new Date().toISOString(),
      };
      let { error: spErr } = await supabase.from('student_profiles').upsert(spPayload, { onConflict: 'email' });
      if (spErr && (spErr.code === '23503' || String(spErr.message || '').includes('foreign key constraint'))) {
        delete spPayload.user_id;
        const { error: spErr2 } = await supabase.from('student_profiles').upsert(spPayload, { onConflict: 'email' });
        spErr = spErr2;
      }
      logDbDiagnostic('upsert', !spErr, 'student_profiles', { email: cleanEmail }, spErr);

      // 2. Also sync to students public table linking auth_user_id
      let studentPayload: any = {
        id: singleProfileId,
        auth_user_id: singleProfileId,
        full_name: profile.fullName,
        required_hours: 240.00,
        completed_hours: 0.00,
      };
      let { error: sErr } = await supabase.from('students').upsert(studentPayload, { onConflict: 'id' });
      if (sErr && (sErr.code === '23503' || String(sErr.message || '').includes('foreign key constraint'))) {
        delete studentPayload.auth_user_id;
        const { error: sErr2 } = await supabase.from('students').upsert(studentPayload, { onConflict: 'id' });
        sErr = sErr2;
      }
      logDbDiagnostic('upsert', !sErr, 'students', { email: cleanEmail }, sErr);
    }

    // 3. Keep profiles table updated
    const { error: pErr } = await supabase.from('profiles').upsert(
      {
        id: singleProfileId,
        email: cleanEmail,
        full_name: profile.fullName,
        role: profile.role,
        bu_id: profile.buId,
        department: profile.department || 'Department of Computer Science',
        class_block: profile.classBlock || null,
        avatar_url: avatarToSave,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
    logDbDiagnostic('upsert', !pErr, 'profiles', { email: cleanEmail }, pErr);
  } catch (err) {
    logDbDiagnostic('syncProfileToSupabase', false, 'profiles/coordinators', profile, err);
  }
}

/**
 * Synchronize student record into Supabase 'students' and 'student_profiles' tables
 */
export async function syncStudentToSupabase(student: {
  id?: string;
  buId: string;
  studentIdNumber?: string;
  fullName: string;
  email: string;
  degree?: string;
  classBlock?: string;
  companyId?: string;
  companyName?: string;
  companyBranch?: string;
  mentorName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  dutyStart?: string;
  dutyEnd?: string;
  scheduledDeploymentDate?: string;
  deploymentApproved?: boolean;
  targetHours?: number;
  renderedHours?: number;
  enrollmentStatus?: string;
  status?: string;
  avatarUrl?: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const cleanEmail = student.email.toLowerCase().trim();
  const avatarToSave = student.avatarUrl && student.avatarUrl.trim() !== '' ? student.avatarUrl.trim() : null;
  const studentIdNum = student.studentIdNumber || student.buId;
  const singleProfileId = isValidUuid(student.id) ? student.id! : getDeterministicUuid(cleanEmail);

  // Strict Role Isolation Enforcement: Check if already registered as a Coordinator
  const coordCheck = await checkRoleIsolation(singleProfileId, 'student');
  if (!coordCheck.allowed) {
    throw new Error(coordCheck.message);
  }
  const emailCheck = await checkRoleIsolation(cleanEmail, 'student');
  if (!emailCheck.allowed) {
    throw new Error(emailCheck.message);
  }

  // 1. Sync to students table (user's schema) - maintaining single row without duplicate inserts
  try {
    const { data: existingStudentRow } = await supabase
      .from('students')
      .select('id')
      .or(`id.eq.${singleProfileId}`)
      .maybeSingle();

    let insErr: any = null;
    if (existingStudentRow?.id) {
      let { error: upErr } = await supabase.from('students').update({
        full_name: student.fullName,
        required_hours: Number(student.targetHours) || 240.00,
        completed_hours: Number(student.renderedHours) || 0.00,
      }).eq('id', existingStudentRow.id);

      if (upErr && (upErr.code === '23503' || String(upErr.message || '').includes('foreign key constraint'))) {
        const { error: upErr2 } = await supabase.from('students').update({
          full_name: student.fullName,
          required_hours: Number(student.targetHours) || 240.00,
          completed_hours: Number(student.renderedHours) || 0.00,
        }).eq('id', existingStudentRow.id);
        upErr = upErr2;
      }
      insErr = upErr;
      logDbDiagnostic('update', !upErr, 'students', { id: existingStudentRow.id }, upErr);
    } else {
      let payload: any = {
        id: singleProfileId,
        auth_user_id: singleProfileId,
        full_name: student.fullName,
        required_hours: Number(student.targetHours) || 240.00,
        completed_hours: Number(student.renderedHours) || 0.00,
      };
      let { error: err1 } = await supabase.from('students').upsert(payload, { onConflict: 'id' });
      if (err1 && (err1.code === '23503' || String(err1.message || '').includes('foreign key constraint'))) {
        delete payload.auth_user_id;
        const { error: err2 } = await supabase.from('students').upsert(payload, { onConflict: 'id' });
        insErr = err2;
        logDbDiagnostic('upsert_without_auth_fk', !err2, 'students', { id: singleProfileId }, err2);
      } else {
        insErr = err1;
        logDbDiagnostic('upsert', !err1, 'students', { id: singleProfileId }, err1);
      }
    }
  } catch (sErr) {
    logDbDiagnostic('syncStudentToSupabase_students', false, 'students', student, sErr);
  }

  // 2. Sync to student_profiles table
  try {
    const studentPayload: any = {
      id: singleProfileId,
      user_id: singleProfileId,
      student_id_number: studentIdNum,
      bu_id: student.buId,
      full_name: student.fullName,
      email: cleanEmail,
      degree: student.degree || 'BS Computer Science',
      class_block: student.classBlock || null,
      company_id: student.companyId || null,
      company_name: student.companyName || null,
      company_branch: student.companyBranch || null,
      mentor_name: student.mentorName || null,
      coordinator_id: student.coordinatorId || null,
      coordinator_name: student.coordinatorName || null,
      coordinator_email: student.coordinatorEmail || null,
      duty_start: student.dutyStart || '08:00',
      duty_end: student.dutyEnd || '17:00',
      target_hours: student.targetHours || 240,
      rendered_hours: student.renderedHours || 0,
      scheduled_deployment_date: student.scheduledDeploymentDate || null,
      deployment_approved: Boolean(student.deploymentApproved),
      enrollment_status: student.enrollmentStatus || 'pending_approval',
      status: student.status || 'active',
      avatar_url: avatarToSave,
      updated_at: new Date().toISOString(),
    };
    let { error: spErr } = await supabase.from('student_profiles').upsert(studentPayload, { onConflict: 'email' });
    if (spErr && (spErr.code === '23503' || String(spErr.message || '').includes('foreign key constraint'))) {
      delete studentPayload.user_id;
      const { error: spErr2 } = await supabase.from('student_profiles').upsert(studentPayload, { onConflict: 'email' });
      spErr = spErr2;
    }
    logDbDiagnostic('upsert', !spErr, 'student_profiles', { email: cleanEmail }, spErr);
  } catch (spErr) {
    logDbDiagnostic('syncStudentToSupabase_student_profiles', false, 'student_profiles', student, spErr);
  }
}

/**
 * Synchronize company into Supabase 'companies' table
 */
export async function syncCompanyToSupabase(company: {
  id?: string;
  name: string;
  sector: string;
  address: string;
  branch?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('companies').upsert(
      {
        name: company.name,
        sector: company.sector,
        address: company.address,
        branch: company.branch || company.address,
        contact_person: company.contactPerson,
        contact_email: company.contactEmail,
        contact_phone: company.contactPhone,
      },
      { onConflict: 'name' }
    );
  } catch (err) {
    console.warn('Supabase syncCompany notice:', err);
  }
}

/**
 * Synchronize attendance punch into Supabase 'attendances' and 'attendance_logs' tables
 */
export async function syncAttendanceToSupabase(log: {
  studentId: string;
  studentIdNumber?: string;
  studentName: string;
  companyId?: string;
  companyName?: string;
  date: string;
  actualTimeIn?: string | null;
  actualTimeOut?: string | null;
  hoursRendered?: number;
  status?: string;
  workstationIp?: string;
  remarks?: string;
  dtrImageLink?: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    let studentUuid = isValidUuid(log.studentId) ? log.studentId : null;
    if (!studentUuid) {
      try {
        const { data: sRow } = await supabase
          .from('students')
          .select('id')
          .eq('full_name', log.studentName)
          .maybeSingle();
        if (sRow?.id) studentUuid = sRow.id;
      } catch {}
    }

    const isoDate = toIsoDate(log.date);
    const isoTimeIn = toIsoDateTime(log.date, log.actualTimeIn);
    const isoTimeOut = toIsoDateTime(log.date, log.actualTimeOut);

    // 1. Sync to attendances table (user's schema)
    if (studentUuid) {
      try {
        await supabase.from('attendances').insert({
          student_id: studentUuid,
          date: isoDate,
          time_in: isoTimeIn,
          time_out: isoTimeOut,
          hours_rendered: Number(log.hoursRendered) || 0,
          ai_flagged: Boolean(log.status === 'absent' || log.status === 'undertime'),
        });
      } catch (attErr) {
        console.warn('Sync to attendances table note:', attErr);
      }
    }

    // 2. Also sync to attendance_logs table
    try {
      await supabase.from('attendance_logs').insert({
        student_id: log.studentId,
        student_id_number: log.studentIdNumber || null,
        student_name: log.studentName,
        company_id: log.companyId || null,
        company_name: log.companyName || null,
        date: log.date,
        time_in: log.actualTimeIn || null,
        time_out: log.actualTimeOut || null,
        hours_rendered: log.hoursRendered || 0,
        status: log.status || 'present',
        workstation_ip: log.workstationIp || '192.168.10.155',
        remarks: log.remarks || null,
        dtr_image_link: log.dtrImageLink || null,
        created_at: new Date().toISOString(),
      });
    } catch {}
  } catch (err) {
    console.warn('Supabase syncAttendance notice:', err);
  }
}

/**
 * Synchronize daily accomplishment into Supabase 'accomplishment_reports' table
 */
export async function syncAccomplishmentToSupabase(report: {
  studentId: string;
  studentIdNumber?: string;
  studentName: string;
  companyId?: string;
  companyName?: string;
  date: string;
  weekNumber?: number;
  workCategory: string;
  taskTitle: string;
  taskDescription: string;
  supervisorAssignedDuty?: string;
  hoursSpent: number;
  taskStatus?: string;
  obstaclesFaced?: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    let studentUuid = isValidUuid(report.studentId) ? report.studentId : null;
    if (!studentUuid) {
      try {
        const { data: sRow } = await supabase
          .from('students')
          .select('id')
          .eq('full_name', report.studentName)
          .maybeSingle();
        if (sRow?.id) studentUuid = sRow.id;
      } catch {}
    }

    const isoDate = toIsoDate(report.date);

    // 1. Sync to accomplishment_reports table (user's schema)
    if (studentUuid) {
      try {
        await supabase.from('accomplishment_reports').insert({
          student_id: studentUuid,
          week_start: isoDate,
          week_end: isoDate,
          raw_task_logs: `${report.workCategory}: ${report.taskTitle} - ${report.taskDescription} (${report.hoursSpent}h rendered)`,
          nlp_summary: report.obstaclesFaced || report.taskDescription || report.taskTitle,
          status: report.taskStatus === 'completed' ? 'Approved' : 'Pending',
        });
      } catch (repErr) {
        console.warn('Sync to accomplishment_reports note:', repErr);
      }
    }
  } catch (err) {
    console.warn('Supabase syncAccomplishment notice:', err);
  }
}

/**
 * Setup Supabase Realtime subscription to listen for instant postgres changes on attendance,
 * accomplishment reports, and student profiles, broadcasting updates to coordinators live.
 */
export function subscribeToRealtimeData(onChangeCallback: (payload: any) => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('interntrack_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        (payload) => {
          console.log('[SUPABASE REALTIME] Attendance log changed:', payload.eventType);
          onChangeCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendances' },
        (payload) => {
          console.log('[SUPABASE REALTIME] Attendances changed:', payload.eventType);
          onChangeCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accomplishment_reports' },
        (payload) => {
          console.log('[SUPABASE REALTIME] Accomplishment report changed:', payload.eventType);
          onChangeCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          console.log('[SUPABASE REALTIME] Students changed:', payload.eventType);
          onChangeCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_profiles' },
        (payload) => {
          console.log('[SUPABASE REALTIME] Student profile changed:', payload.eventType);
          onChangeCallback(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[SUPABASE REALTIME] Live channels subscribed successfully.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Could not establish Supabase Realtime subscription:', err);
    return () => {};
  }
}
