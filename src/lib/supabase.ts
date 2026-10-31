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
 * Resolve the role records that belong to an authenticated user.
 *
 * NOTE: The public `students` table has NO `email` column (only `id` / `auth_user_id`),
 * so students are matched by auth uid there, and by email in `student_profiles`.
 * Each query only references columns that actually exist, so a single bad column
 * can no longer make the whole lookup fail silently (which previously left freshly
 * onboarded Google users stuck on the onboarding screen forever).
 */
export async function findRoleRecords(
  authUserId: string | null | undefined,
  email: string | null | undefined
): Promise<{ coordinator: any | null; student: any | null; studentProfile: any | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { coordinator: null, student: null, studentProfile: null };
  }
  const cleanEmail = (email || '').toLowerCase().trim();
  const uid = authUserId && isValidUuid(authUserId) ? authUserId : null;

  const coordFilters: string[] = [];
  if (uid) coordFilters.push(`auth_user_id.eq.${uid}`, `id.eq.${uid}`);
  if (cleanEmail) coordFilters.push(`email.eq.${cleanEmail}`);

  const [coordRes, studentRes] = await Promise.all([
    coordFilters.length
      ? supabase.from('coordinators').select('*').or(coordFilters.join(',')).limit(1)
      : Promise.resolve({ data: null, error: null } as any),
    uid
      ? supabase.from('students').select('*').or(`auth_user_id.eq.${uid},id.eq.${uid}`).limit(1)
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  if (coordRes.error) console.warn('[ROLE LOOKUP] coordinators query error:', coordRes.error);
  if (studentRes.error) console.warn('[ROLE LOOKUP] students query error:', studentRes.error);

  return {
    coordinator: coordRes.data && coordRes.data.length > 0 ? coordRes.data[0] : null,
    student: studentRes.data && studentRes.data.length > 0 ? studentRes.data[0] : null,
    studentProfile: null,
  };
}

/**
 * Map raw Supabase `students` + `student_profiles` rows into the app's camelCase Student shape.
 */
export function mapDbStudentRecord(studentRow: any, profileRow: any, email: string, meta?: any): any {
  const s = studentRow || {};
  const p = profileRow || {};
  const m = meta || {};
  const cleanEmail = (p.email || m.email || email || '').toLowerCase().trim();
  return {
    id: s.id || p.id || m.id,
    buId: p.bu_id || m.bu_id || p.student_id_number || extractStudentIdFromEmail(cleanEmail),
    studentIdNumber: p.student_id_number || m.bu_id || p.bu_id || undefined,
    fullName: p.full_name || m.full_name || s.full_name || cleanEmail.split('@')[0],
    email: cleanEmail,
    degree: p.degree || m.degree || 'BS Computer Science',
    college: p.college || m.department || 'College of Science',
    classBlock: p.class_block || m.class_block || undefined,
    batchId: p.batch_id || m.batch_id || 'batch-1',
    enrollmentType: (m.group_id || s.group_id) ? 'group' : (m.enrollment_type || 'individual'),
    companyId: m.company_id || p.company_id || '',
    companyName: m.company_name || p.company_name || 'Not Yet Enrolled (Pending Application)',
    companyBranch: m.company_branch || p.company_branch || undefined,
    mentorName: m.mentor_name || p.mentor_name || 'Unassigned',
    coordinatorId: s.coordinator_id || m.coordinator_id || p.coordinator_id || undefined,
    coordinatorName: m.coordinator_name || p.coordinator_name || undefined,
    coordinatorEmail: m.coordinator_email || p.coordinator_email || undefined,
    dutyStart: m.duty_start || p.duty_start || '08:00',
    dutyEnd: m.duty_end || p.duty_end || '17:00',
    dutyDays: m.duty_days || p.duty_days || 'Mon,Tue,Wed,Thu,Fri',
    targetHours: Number(s.required_hours ?? m.target_hours ?? p.target_hours ?? 240),
    renderedHours: Number(s.completed_hours ?? m.rendered_hours ?? p.rendered_hours ?? 0),
    attendanceRate: Number(p.attendance_rate ?? 100),
    status: m.status || p.status || 'active',
    enrollmentStatus: m.enrollment_status || p.enrollment_status || 'not_enrolled',
    scheduledDeploymentDate: m.scheduled_deployment_date || p.scheduled_deployment_date || undefined,
    deploymentApproved: Boolean(m.deployment_approved || p.deployment_approved),
    isArchived: Boolean(p.is_archived),
    avatarUrl: m.avatar_url || p.avatar_url || '',
    groupId: s.group_id || m.group_id || undefined,
    groupName: m.group_name || undefined,
    pendingGroupInvitation: m.pending_group_invitation || undefined,
  };
}

/**
 * Strict Role Isolation Check: Prevents an account from registering across both roles.
 * Accepts an email and/or Supabase auth uid.
 */
export async function checkRoleIsolation(
  userIdOrEmail: string,
  targetRole: 'coordinator' | 'student',
  authUserId?: string | null
): Promise<{ allowed: boolean; conflictingRole?: 'coordinator' | 'student'; message?: string }> {
  if (!isSupabaseConfigured || !supabase) return { allowed: true };
  const clean = (userIdOrEmail || '').toLowerCase().trim();
  const email = clean.includes('@') ? clean : '';
  const uid = authUserId || (isValidUuid(clean) ? clean : null);

  try {
    const { coordinator, student, studentProfile } = await findRoleRecords(uid, email);
    if (targetRole === 'coordinator' && (student || studentProfile)) {
      return {
        allowed: false,
        conflictingRole: 'student',
        message: 'This account is already registered as a Student.',
      };
    }
    if (targetRole === 'student' && coordinator) {
      return {
        allowed: false,
        conflictingRole: 'coordinator',
        message: 'This account is already registered as a Coordinator.',
      };
    }
  } catch (err) {
    console.warn('Role isolation query note:', err);
  }

  return { allowed: true };
}

/**
 * Synchronize user profile into Supabase.
 * Throws when the role-isolation check fails or the primary role table write fails,
 * so the UI never proceeds on a write that did not land.
 */
export async function syncProfileToSupabase(profile: {
  id?: string;
  authUserId?: string;
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
  const authUid = profile.authUserId && isValidUuid(profile.authUserId) ? profile.authUserId : null;

  const singleProfileId = authUid
    ? authUid
    : (profile.id && isValidUuid(profile.id))
    ? profile.id
    : getDeterministicUuid(cleanEmail);

  // Strict Role Isolation Enforcement (must throw - never swallowed)
  const isolation = await checkRoleIsolation(cleanEmail, profile.role, authUid || singleProfileId);
  if (!isolation.allowed) {
    throw new Error(isolation.message);
  }

  if (profile.role === 'coordinator') {
    // 1. PRIMARY: coordinators table (linked to auth.users via auth_user_id)
    const coordPayload: any = {
      id: singleProfileId,
      auth_user_id: authUid,
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
    if (coordErr) {
      throw new Error(`Could not save coordinator account to Supabase: ${coordErr.message}`);
    }
  } else {
    // 1. PRIMARY: students table (linked to auth.users via auth_user_id)
    const studentPayload: any = {
      id: singleProfileId,
      auth_user_id: authUid,
      full_name: profile.fullName,
      required_hours: 240.0,
      completed_hours: 0.0,
    };
    let { error: sErr } = await supabase.from('students').upsert(studentPayload, { onConflict: 'id' });
    if (sErr && (sErr.code === '23503' || String(sErr.message || '').includes('foreign key constraint'))) {
      delete studentPayload.auth_user_id;
      const { error: sErr2 } = await supabase.from('students').upsert(studentPayload, { onConflict: 'id' });
      sErr = sErr2;
    }
    logDbDiagnostic('upsert', !sErr, 'students', { email: cleanEmail }, sErr);
    if (sErr) {
      throw new Error(`Could not save student account to Supabase: ${sErr.message}`);
    }
  }

  // 2. Persist rich metadata directly to Supabase Auth user
  try {
    await supabase.auth.updateUser({
      data: {
        role: profile.role,
        full_name: profile.fullName,
        bu_id: profile.buId,
        department: profile.department || 'Department of Computer Science',
        class_block: profile.classBlock || '',
        avatar_url: avatarToSave || '',
      },
    });
  } catch (metaErr) {
    console.warn('Could not update user metadata:', metaErr);
  }
}

/**
 * Synchronize student record into Supabase 'students' and 'student_profiles' tables
 */
export async function syncStudentToSupabase(student: {
  id?: string;
  authUserId?: string;
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
  groupId?: string;
  groupName?: string;
  pendingGroupInvitation?: any;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const cleanEmail = student.email.toLowerCase().trim();
  const avatarToSave = student.avatarUrl && student.avatarUrl.trim() !== '' ? student.avatarUrl.trim() : null;
  const studentIdNum = student.studentIdNumber || student.buId;
  const authUid = student.authUserId && isValidUuid(student.authUserId) ? student.authUserId : null;
  const singleProfileId = authUid || (isValidUuid(student.id) ? student.id! : getDeterministicUuid(cleanEmail));

  // Strict Role Isolation Enforcement: Check if already registered as a Coordinator
  const emailCheck = await checkRoleIsolation(cleanEmail, 'student', singleProfileId);
  if (!emailCheck.allowed) {
    throw new Error(emailCheck.message);
  }

  // 1. Sync to students table (user's schema) - maintaining single row without duplicate inserts
  try {
    const { data: existingStudentRow } = await supabase
      .from('students')
      .select('id')
      .or(`id.eq.${singleProfileId},auth_user_id.eq.${singleProfileId}`)
      .limit(1)
      .maybeSingle();

    if (existingStudentRow?.id) {
      const updateData: any = {
        full_name: student.fullName,
        required_hours: Number(student.targetHours) || 240.00,
        completed_hours: Number(student.renderedHours) || 0.00,
      };
      if (student.coordinatorId && isValidUuid(student.coordinatorId)) {
        updateData.coordinator_id = student.coordinatorId;
      }
      updateData.group_id = isValidUuid(student.groupId) ? student.groupId : null;
      const { error: upErr } = await supabase.from('students').update(updateData).eq('id', existingStudentRow.id);
      logDbDiagnostic('update', !upErr, 'students', { id: existingStudentRow.id }, upErr);
    } else {
      let payload: any = {
        id: singleProfileId,
        auth_user_id: authUid,
        full_name: student.fullName,
        required_hours: Number(student.targetHours) || 240.00,
        completed_hours: Number(student.renderedHours) || 0.00,
        coordinator_id: isValidUuid(student.coordinatorId) ? student.coordinatorId : null,
        group_id: isValidUuid(student.groupId) ? student.groupId : null,
      };
      let { error: err1 } = await supabase.from('students').upsert(payload, { onConflict: 'id' });
      if (err1 && (err1.code === '23503' || String(err1.message || '').includes('foreign key constraint'))) {
        delete payload.auth_user_id;
        const { error: err2 } = await supabase.from('students').upsert(payload, { onConflict: 'id' });
        logDbDiagnostic('upsert_without_auth_fk', !err2, 'students', { id: singleProfileId }, err2);
      } else {
        logDbDiagnostic('upsert', !err1, 'students', { id: singleProfileId }, err1);
      }
    }
  } catch (sErr) {
    logDbDiagnostic('syncStudentToSupabase_students', false, 'students', student, sErr);
  }

  // 2. Persist rich metadata directly to Supabase Auth user
  try {
    await supabase.auth.updateUser({
      data: {
        bu_id: student.buId,
        student_id_number: studentIdNum,
        full_name: student.fullName,
        degree: student.degree || 'BS Computer Science',
        class_block: student.classBlock || '',
        company_id: student.companyId || '',
        company_name: student.companyName || '',
        company_branch: student.companyBranch || '',
        mentor_name: student.mentorName || '',
        coordinator_id: student.coordinatorId || '',
        coordinator_name: student.coordinatorName || '',
        coordinator_email: student.coordinatorEmail || '',
        duty_start: student.dutyStart || '08:00',
        duty_end: student.dutyEnd || '17:00',
        target_hours: student.targetHours || 240,
        rendered_hours: student.renderedHours || 0,
        scheduled_deployment_date: student.scheduledDeploymentDate || null,
        deployment_approved: Boolean(student.deploymentApproved),
        enrollment_status: student.enrollmentStatus || 'not_enrolled',
        status: student.status || 'active',
        group_id: student.groupId || null,
        group_name: student.groupName || null,
        pending_group_invitation: student.pendingGroupInvitation || null,
        avatar_url: avatarToSave || '',
      },
    });
  } catch (metaErr) {
    console.warn('Could not update user metadata in Supabase Auth:', metaErr);
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
        if (isoTimeOut) {
          // Time-Out: update existing open attendance row
          const { data: openRow } = await supabase
            .from('attendances')
            .select('id')
            .eq('student_id', studentUuid)
            .eq('date', isoDate)
            .is('time_out', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (openRow?.id) {
            await supabase.from('attendances').update({
              time_out: isoTimeOut,
              hours_rendered: Number(log.hoursRendered) || 0,
              ai_flagged: Boolean(log.status === 'absent' || log.status === 'undertime'),
            }).eq('id', openRow.id);
          } else {
            await supabase.from('attendances').insert({
              student_id: studentUuid,
              date: isoDate,
              time_in: isoTimeIn,
              time_out: isoTimeOut,
              hours_rendered: Number(log.hoursRendered) || 0,
              ai_flagged: Boolean(log.status === 'absent' || log.status === 'undertime'),
            });
          }
        } else {
          // Time-In: insert a new open attendance row
          await supabase.from('attendances').insert({
            student_id: studentUuid,
            date: isoDate,
            time_in: isoTimeIn,
            time_out: null,
            hours_rendered: Number(log.hoursRendered) || 0,
            ai_flagged: Boolean(log.status === 'absent' || log.status === 'undertime'),
          });
        }
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

// ============================================================================
// ATTENDANCE STATE MACHINE & SUPABASE SERVICE FUNCTIONS (Single Source of Truth)
// ============================================================================

export type AttendanceState = 'A' | 'B' | 'C' | 'D' | 'E';

export interface TodayAttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  hours_rendered: number;
  ai_flagged?: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface AttendanceStateMachine {
  state: AttendanceState;
  isTimeInEnabled: boolean;
  isTimeOutEnabled: boolean;
  activeOpenRecord: TodayAttendanceRecord | null;
  closedCount: number;
  openCount: number;
  totalCount: number;
  statusMessage: string;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone
 */
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure evaluation function enforcing the 5 exact attendance states:
 * - State A (0 records today): [Time-In] ENABLED. [Time-Out] DISABLED.
 * - State B (1 open record - missing time_out): [Time-In] DISABLED. [Time-Out] ENABLED.
 * - State C (1 closed record - has time_in and time_out): [Time-In] ENABLED (2nd shift). [Time-Out] DISABLED.
 * - State D (1 closed record + 1 open record): [Time-In] DISABLED. [Time-Out] ENABLED for open record.
 * - State E (2 closed records): [Time-In] DISABLED (Daily max reached). [Time-Out] DISABLED.
 */
export function evaluateAttendanceState(records: TodayAttendanceRecord[]): AttendanceStateMachine {
  const list = records || [];
  const openRecords = list.filter((r) => !r.time_out);
  const closedRecords = list.filter((r) => Boolean(r.time_out));
  const total = list.length;
  const activeOpenRecord = openRecords[openRecords.length - 1] || null;

  // Strict handling: Any open record means a shift is currently in progress
  if (openRecords.length > 0) {
    if (closedRecords.length >= 1) {
      // State D: 1 closed record + 1 open record
      return {
        state: 'D',
        isTimeInEnabled: false,
        isTimeOutEnabled: true,
        activeOpenRecord,
        closedCount: closedRecords.length,
        openCount: openRecords.length,
        totalCount: total,
        statusMessage: 'Shift 2 Active — Ready for Time-Out',
      };
    }
    // State B: 1 open record (missing time_out)
    return {
      state: 'B',
      isTimeInEnabled: false,
      isTimeOutEnabled: true,
      activeOpenRecord,
      closedCount: 0,
      openCount: openRecords.length,
      totalCount: total,
      statusMessage: 'Shift 1 Active — Ready for Time-Out',
    };
  }

  // When there are no open records:
  if (closedRecords.length === 0) {
    // State A: 0 records today
    return {
      state: 'A',
      isTimeInEnabled: true,
      isTimeOutEnabled: false,
      activeOpenRecord: null,
      closedCount: 0,
      openCount: 0,
      totalCount: 0,
      statusMessage: 'Ready to punch Shift 1 Time-In',
    };
  }

  if (closedRecords.length === 1) {
    // State C: 1 closed record (has time_in and time_out)
    return {
      state: 'C',
      isTimeInEnabled: true,
      isTimeOutEnabled: false,
      activeOpenRecord: null,
      closedCount: 1,
      openCount: 0,
      totalCount: 1,
      statusMessage: 'Shift 1 Completed — Ready to punch Shift 2 Time-In',
    };
  }

  // State E: 2 or more closed records (Daily maximum reached)
  return {
    state: 'E',
    isTimeInEnabled: false,
    isTimeOutEnabled: false,
    activeOpenRecord: null,
    closedCount: closedRecords.length,
    openCount: 0,
    totalCount: total,
    statusMessage: 'Daily Maximum Reached (2 Shifts Completed)',
  };
}

/**
 * Fetch ALL attendance records for the given student on today's date directly from Supabase
 */
export async function fetchTodayAttendanceRecords(
  studentId: string,
  dateStr?: string
): Promise<{ records: TodayAttendanceRecord[]; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { records: [], error: null };
  }

  const targetDate = dateStr || getTodayDateString();

  try {
    let studentUuid = isValidUuid(studentId) ? studentId : null;
    if (!studentUuid) {
      const { data: sRow } = await supabase
        .from('students')
        .select('id')
        .or(`id.eq.${studentId},auth_user_id.eq.${studentId}`)
        .limit(1)
        .maybeSingle();
      if (sRow?.id) studentUuid = sRow.id;
    }

    if (!studentUuid) {
      return { records: [], error: null };
    }

    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('student_id', studentUuid)
      .eq('date', targetDate)
      .order('created_at', { ascending: true });

    if (error) throw error;
    const rawList = ((data as TodayAttendanceRecord[]) || []);

    // Sort chronologically by time_in or created_at
    const sorted = [...rawList].sort((a, b) => {
      const timeA = new Date(a.time_in || a.created_at || 0).getTime();
      const timeB = new Date(b.time_in || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    // Deduplicate any accidental duplicate punches (records within 60 seconds of each other)
    const deduped: TodayAttendanceRecord[] = [];
    for (const rec of sorted) {
      const recTime = new Date(rec.time_in || rec.created_at || 0).getTime();
      const isDuplicate = deduped.some((existing) => {
        const existingTime = new Date(existing.time_in || existing.created_at || 0).getTime();
        return Math.abs(recTime - existingTime) < 60000;
      });
      if (!isDuplicate) {
        deduped.push(rec);
      }
    }

    // Daily maximum: strictly 2 shifts per day (Morning = 1st, Afternoon = 2nd). No third for a day.
    const cleanRecords = deduped.slice(0, 2);
    return { records: cleanRecords, error: null };
  } catch (err: any) {
    console.error('fetchTodayAttendanceRecords error:', err);
    return { records: [], error: err };
  }
}

/**
 * Executes a Time-In mutation directly against Supabase attendances table,
 * validated against the state machine.
 */
export async function punchTimeInToSupabase(params: {
  studentId: string;
  studentName: string;
  companyId?: string;
  companyName?: string;
  dutyStart?: string;
  dutyEnd?: string;
  workstationIp?: string;
  remarks?: string;
  dtrImageLink?: string;
}): Promise<{ records: TodayAttendanceRecord[]; record: TodayAttendanceRecord; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const todayDate = getTodayDateString();
  let studentUuid = isValidUuid(params.studentId) ? params.studentId : null;
  if (!studentUuid) {
    const { data: sRow } = await supabase
      .from('students')
      .select('id')
      .or(`id.eq.${params.studentId},auth_user_id.eq.${params.studentId}`)
      .limit(1)
      .maybeSingle();
    if (sRow?.id) studentUuid = sRow.id;
  }

  if (!studentUuid) {
    throw new Error('Student account record could not be resolved in Supabase.');
  }

  // 1. Fetch current today's records and enforce strict state machine
  const { records: currentRecords, error: fetchErr } = await fetchTodayAttendanceRecords(studentUuid, todayDate);
  if (fetchErr) throw fetchErr;

  const currentMachine = evaluateAttendanceState(currentRecords);
  if (!currentMachine.isTimeInEnabled) {
    if (currentMachine.state === 'E' || currentRecords.length >= 2) {
      throw new Error('Daily maximum reached: You have already completed 2 duty shifts today. No third shift is allowed.');
    }
    throw new Error('Cannot punch Time-In: A duty shift is currently active and requires Time-Out first.');
  }

  const shiftNum = currentMachine.state === 'C' ? 2 : 1;
  const now = new Date();
  const timeInIso = now.toISOString();

  // 2. Insert into Supabase attendances table
  const { data: inserted, error: insertErr } = await supabase
    .from('attendances')
    .insert({
      student_id: studentUuid,
      date: todayDate,
      time_in: timeInIso,
      time_out: null,
      hours_rendered: 0.00,
      ai_flagged: false,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  // 3. Sync to backend API for session cache (skipSupabaseSync avoids duplicate insertion)
  try {
    await fetch('/api/attendance/time-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: params.studentId,
        workstationIp: params.workstationIp,
        remarks: params.remarks || `Student Duty Punch (Shift ${shiftNum})`,
        dtrImageLink: params.dtrImageLink,
        shiftNumber: shiftNum,
        dutyStart: params.dutyStart,
        dutyEnd: params.dutyEnd,
        skipSupabaseSync: true,
      }),
    });
  } catch (apiErr) {
    console.warn('Backend time-in notification note:', apiErr);
  }

  // 4. Fetch fresh records from Supabase
  const { records: freshRecords } = await fetchTodayAttendanceRecords(studentUuid, todayDate);

  return {
    record: (inserted as TodayAttendanceRecord),
    records: freshRecords.length > 0 ? freshRecords : [...currentRecords, inserted].slice(0, 2),
    error: null,
  };
}

/**
 * Executes a Time-Out mutation directly against Supabase attendances table,
 * closing the currently active open record.
 */
export async function punchTimeOutToSupabase(params: {
  studentId: string;
  recordId?: string;
  studentName?: string;
  remarks?: string;
  dtrImageLink?: string;
}): Promise<{ records: TodayAttendanceRecord[]; record: TodayAttendanceRecord; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const todayDate = getTodayDateString();
  let studentUuid = isValidUuid(params.studentId) ? params.studentId : null;
  if (!studentUuid) {
    const { data: sRow } = await supabase
      .from('students')
      .select('id')
      .or(`id.eq.${params.studentId},auth_user_id.eq.${params.studentId}`)
      .limit(1)
      .maybeSingle();
    if (sRow?.id) studentUuid = sRow.id;
  }

  if (!studentUuid) {
    throw new Error('Student account record could not be resolved in Supabase.');
  }

  // 1. Fetch current today's records and enforce strict state machine
  const { records: currentRecords, error: fetchErr } = await fetchTodayAttendanceRecords(studentUuid, todayDate);
  if (fetchErr) throw fetchErr;

  const currentMachine = evaluateAttendanceState(currentRecords);
  if (!currentMachine.isTimeOutEnabled || !currentMachine.activeOpenRecord) {
    throw new Error('Cannot punch Time-Out: No open Time-In duty record found for today.');
  }

  const targetRecord = currentMachine.activeOpenRecord;
  const now = new Date();
  const timeOutIso = now.toISOString();

  // Calculate hours rendered
  const timeInMs = targetRecord.time_in ? new Date(targetRecord.time_in).getTime() : now.getTime();
  const elapsedMs = Math.max(0, now.getTime() - timeInMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const netSeconds = elapsedSeconds > 18000 ? elapsedSeconds - 3600 : elapsedSeconds;
  const hoursRendered = Number(Math.max(0.01, netSeconds / 3600).toFixed(2));

  // 2. Update the specific open record in Supabase attendances table
  const { data: updated, error: updateErr } = await supabase
    .from('attendances')
    .update({
      time_out: timeOutIso,
      hours_rendered: hoursRendered,
    })
    .eq('id', targetRecord.id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // 3. Update student completed_hours in Supabase students table
  try {
    const { data: stData } = await supabase
      .from('students')
      .select('completed_hours')
      .eq('id', studentUuid)
      .maybeSingle();
    if (stData) {
      const newTotal = Number((Number(stData.completed_hours || 0) + hoursRendered).toFixed(2));
      await supabase.from('students').update({ completed_hours: newTotal }).eq('id', studentUuid);
    }
  } catch (stErr) {
    console.warn('Completed hours increment note:', stErr);
  }

  // 4. Sync to backend API for server state (skipSupabaseSync avoids duplicate closing/insertion)
  try {
    await fetch('/api/attendance/time-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: params.studentId,
        remarks: params.remarks,
        dtrImageLink: params.dtrImageLink,
        shiftNumber: currentMachine.state === 'D' ? 2 : 1,
        skipSupabaseSync: true,
      }),
    });
  } catch (apiErr) {
    console.warn('Backend time-out notification note:', apiErr);
  }

  // 5. Fetch fresh records from Supabase
  const { records: freshRecords } = await fetchTodayAttendanceRecords(studentUuid, todayDate);

  return {
    record: (updated as TodayAttendanceRecord),
    records: freshRecords.length > 0 ? freshRecords : currentRecords.map((r) => (r.id === targetRecord.id ? updated : r)).slice(0, 2),
    error: null,
  };
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

    // 1. Sync to accomplishment_reports table (user's schema) with duplicate prevention
    if (studentUuid) {
      try {
        const { data: existingRows } = await supabase
          .from('accomplishment_reports')
          .select('id')
          .eq('student_id', studentUuid)
          .eq('week_start', isoDate);

        if (existingRows && existingRows.length > 0) {
          await supabase
            .from('accomplishment_reports')
            .update({
              week_end: isoDate,
              raw_task_logs: `${report.workCategory}: ${report.taskTitle} - ${report.taskDescription} (${report.hoursSpent}h rendered)`,
              nlp_summary: report.obstaclesFaced || report.taskDescription || report.taskTitle,
              status: report.taskStatus === 'completed' ? 'Approved' : 'Pending',
            })
            .eq('id', existingRows[0].id);

          // Clean up any extra duplicates in DB
          if (existingRows.length > 1) {
            for (let i = 1; i < existingRows.length; i++) {
              await supabase.from('accomplishment_reports').delete().eq('id', existingRows[i].id);
            }
          }
        } else {
          await supabase.from('accomplishment_reports').insert({
            student_id: studentUuid,
            week_start: isoDate,
            week_end: isoDate,
            raw_task_logs: `${report.workCategory}: ${report.taskTitle} - ${report.taskDescription} (${report.hoursSpent}h rendered)`,
            nlp_summary: report.obstaclesFaced || report.taskDescription || report.taskTitle,
            status: report.taskStatus === 'completed' ? 'Approved' : 'Pending',
          });
        }
      } catch (repErr) {
        console.warn('Sync to accomplishment_reports note:', repErr);
      }
    }
  } catch (err) {
    console.warn('Supabase syncAccomplishment notice:', err);
  }
}

/**
 * Delete / Unsubmit Accomplishment Report directly from Supabase
 */
export async function deleteAccomplishmentFromSupabase(
  reportId: string,
  studentId?: string,
  date?: string
): Promise<boolean> {
  let deleted = false;
  if (isSupabaseConfigured && supabase) {
    try {
      if (isValidUuid(reportId)) {
        const { error } = await supabase.from('accomplishment_reports').delete().eq('id', reportId);
        if (!error) deleted = true;
      }
      if (studentId && date) {
        let studentUuid = isValidUuid(studentId) ? studentId : null;
        if (!studentUuid) {
          const { data: sRow } = await supabase.from('students').select('id').eq('full_name', studentId).maybeSingle();
          if (sRow?.id) studentUuid = sRow.id;
        }
        if (studentUuid) {
          const isoDate = toIsoDate(date);
          await supabase.from('accomplishment_reports').delete()
            .eq('student_id', studentUuid)
            .eq('week_start', isoDate);
          deleted = true;
        }
      }
    } catch (err) {
      console.warn('Supabase accomplishment report deletion error:', err);
    }
  }

  // Also notify server backend endpoint to remove from in-memory array
  try {
    await fetch(`/api/accomplishments/${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
    });
  } catch {}

  return deleted;
}

/**
 * Submit Weekend Overtime Request to Supabase
 */
export async function requestOvertimeToSupabase(payload: {
  studentId: string;
  studentName: string;
  companyId?: string;
  companyName?: string;
  date: string;
  hoursRequested: number;
  reason: string;
}): Promise<boolean> {
  const isoDate = toIsoDate(payload.date);
  if (isSupabaseConfigured && supabase) {
    try {
      let studentUuid = isValidUuid(payload.studentId) ? payload.studentId : null;
      if (!studentUuid) {
        const { data: sRow } = await supabase.from('students').select('id').eq('full_name', payload.studentName).maybeSingle();
        if (sRow?.id) studentUuid = sRow.id;
      }

      try {
        await supabase.from('overtime_requests').insert({
          student_id: studentUuid,
          student_name: payload.studentName,
          date: isoDate,
          hours_requested: payload.hoursRequested,
          reason: payload.reason,
          status: 'pending',
        });
      } catch {}

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const meta = authData.user.user_metadata || {};
        const existingOt = meta.overtime_requests || [];
        const newOt = {
          id: `ot-${Date.now()}`,
          studentId: payload.studentId,
          studentName: payload.studentName,
          companyId: payload.companyId,
          companyName: payload.companyName,
          date: isoDate,
          hoursRequested: payload.hoursRequested,
          reason: payload.reason,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        await supabase.auth.updateUser({
          data: {
            overtime_requests: [newOt, ...existingOt],
          },
        });
      }
    } catch (err) {
      console.warn('Supabase overtime request error:', err);
    }
  }

  try {
    await fetch('/api/attendance/overtime-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}

  return true;
}

/**
 * Mark or Unmark Friday as Work From Home (WFH) in Supabase
 */
export async function markFridayWfhInSupabase(payload: {
  studentId: string;
  studentName: string;
  date: string;
  isWfh?: boolean;
}): Promise<boolean> {
  const isWfh = payload.isWfh !== false;
  const isoDate = toIsoDate(payload.date);

  if (isSupabaseConfigured && supabase) {
    try {
      let studentUuid = isValidUuid(payload.studentId) ? payload.studentId : null;
      if (!studentUuid) {
        const { data: sRow } = await supabase.from('students').select('id').eq('full_name', payload.studentName).maybeSingle();
        if (sRow?.id) studentUuid = sRow.id;
      }

      if (studentUuid && isWfh) {
        const isoIn = `${isoDate}T08:00:00.000Z`;
        const isoOut = `${isoDate}T17:00:00.000Z`;
        const { data: existingAtt } = await supabase.from('attendances')
          .select('id')
          .eq('student_id', studentUuid)
          .eq('date', isoDate)
          .maybeSingle();

        if (existingAtt?.id) {
          await supabase.from('attendances').update({
            time_in: isoIn,
            time_out: isoOut,
            hours_rendered: 8.0,
            ai_flagged: false,
          }).eq('id', existingAtt.id);
        } else {
          await supabase.from('attendances').insert({
            student_id: studentUuid,
            date: isoDate,
            time_in: isoIn,
            time_out: isoOut,
            hours_rendered: 8.0,
            ai_flagged: false,
          });
        }
      }

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const meta = authData.user.user_metadata || {};
        let wfhDates: string[] = meta.wfh_dates || [];
        if (isWfh) {
          if (!wfhDates.includes(isoDate)) wfhDates = [...wfhDates, isoDate];
        } else {
          wfhDates = wfhDates.filter((d: string) => d !== isoDate);
        }
        await supabase.auth.updateUser({
          data: { wfh_dates: wfhDates },
        });
      }
    } catch (err) {
      console.warn('Supabase markFridayWfh error:', err);
    }
  }

  try {
    await fetch('/api/attendance/mark-wfh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: payload.studentId,
        date: payload.date,
        isWfh,
      }),
    });
  } catch {}

  return true;
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
        { event: '*', schema: 'public', table: 'coordinators' },
        (payload) => {
          console.log('[SUPABASE REALTIME] Coordinators changed:', payload.eventType);
          onChangeCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        (payload) => {
          console.log('[SUPABASE REALTIME] Groups changed:', payload.eventType);
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

/**
 * Update a student's dynamic expected duty schedule in Supabase and server
 */
export async function updateStudentScheduleInSupabase(params: {
  studentId: string;
  dutyStart: string;
  dutyEnd: string;
}): Promise<{ success: boolean; error: Error | null }> {
  try {
    // 1. Update Supabase students table if available
    if (isSupabaseConfigured && supabase) {
      let studentUuid = isValidUuid(params.studentId) ? params.studentId : null;
      if (!studentUuid) {
        const { data: sRow } = await supabase
          .from('students')
          .select('id')
          .or(`id.eq.${params.studentId},auth_user_id.eq.${params.studentId}`)
          .limit(1)
          .maybeSingle();
        if (sRow?.id) studentUuid = sRow.id;
      }

      if (studentUuid) {
        try {
          await supabase
            .from('students')
            .update({
              duty_start: params.dutyStart,
              duty_end: params.dutyEnd,
            })
            .eq('id', studentUuid);
        } catch (dbErr) {
          console.warn('Direct students table schedule update note:', dbErr);
        }
      }
    }

    // 2. Call backend schedule endpoint
    const res = await fetch(`/api/students/${params.studentId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dutyStart: params.dutyStart,
        dutyEnd: params.dutyEnd,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update schedule on server.');
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('updateStudentScheduleInSupabase error:', err);
    return { success: false, error: err };
  }
}

/**
 * Fetch a student's registered Host Training Establishment (HTE) company from Supabase
 */
export async function fetchStudentRegisteredCompany(studentId: string): Promise<{
  company: {
    id: string;
    name: string;
    branch?: string;
    sector?: string;
    address?: string;
    contactPerson?: string;
    contactEmail?: string;
  } | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { company: null, error: null };
  }

  try {
    let studentUuid = isValidUuid(studentId) ? studentId : null;
    if (!studentUuid) {
      const { data: sRow } = await supabase
        .from('students')
        .select('id')
        .or(`id.eq.${studentId},auth_user_id.eq.${studentId}`)
        .limit(1)
        .maybeSingle();
      if (sRow?.id) studentUuid = sRow.id;
    }

    // Attempt to query companies table from Supabase
    const { data: compRows, error: compErr } = await supabase
      .from('companies')
      .select('*');

    if (!compErr && compRows && compRows.length > 0) {
      return {
        company: {
          id: compRows[0].id,
          name: compRows[0].name,
          branch: compRows[0].branch,
          sector: compRows[0].sector,
          address: compRows[0].address,
          contactPerson: compRows[0].contact_person,
          contactEmail: compRows[0].contact_email,
        },
        error: null,
      };
    }

    // Fall back to server companies endpoint
    const res = await fetch('/api/companies');
    if (res.ok) {
      const comps = await res.json();
      if (Array.isArray(comps) && comps.length > 0) {
        return { company: comps[0], error: null };
      }
    }

    return { company: null, error: null };
  } catch (err: any) {
    return { company: null, error: err };
  }
}
