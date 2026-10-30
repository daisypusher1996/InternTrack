import React from 'react';
import { GraduationCap, Building2, AlertCircle } from 'lucide-react';

interface BUMascotWelcomeProps {
  userName: string;
  role: 'coordinator' | 'student';
  classBlock?: string;
  hoursRemaining?: number;
  isEnrolled?: boolean;
  enrollmentStatus?: 'not_enrolled' | 'pending_peer_approval' | 'pending_approval' | 'approved' | 'declined';
  pendingApprovalsCount?: number;
}

export const BUMascotWelcome: React.FC<BUMascotWelcomeProps> = ({
  userName,
  role,
  classBlock,
  hoursRemaining,
  isEnrolled,
  enrollmentStatus,
  pendingApprovalsCount = 0,
}) => {
  // Determine greeting based on current hour without showing a clock
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const greeting = getGreeting();

  // For students, remaining hours description is strictly only permitted after enrollment is approved
  const isApproved =
    role === 'student'
      ? (isEnrolled === true || enrollmentStatus === 'approved') &&
        enrollmentStatus !== 'pending_peer_approval' &&
        enrollmentStatus !== 'pending_approval' &&
        enrollmentStatus !== 'declined' &&
        enrollmentStatus !== 'not_enrolled'
      : true;

  return (
    <div className="rounded-2xl p-5 md:p-6 text-white shadow-lg bg-gradient-to-r from-[#020617] via-[#091528] to-[#111c33] border border-slate-800 relative overflow-hidden transition-all duration-300">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Personalized Greeting & Note Summary */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F26522] flex items-center gap-1.5">
              {role === 'coordinator' ? (
                <Building2 className="w-3.5 h-3.5 text-[#F26522]" />
              ) : (
                <GraduationCap className="w-3.5 h-3.5 text-[#F26522]" />
              )}
              {role === 'coordinator' ? 'Practicum Directorate' : 'Internship Portal'}
            </span>
            {classBlock && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-slate-300 border border-white/15">
                {classBlock}
              </span>
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
            {greeting}, <span className="text-[#F26522]">{userName}</span>
          </h2>

          {/* Note Summary */}
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
            {role === 'coordinator' ? (
              pendingApprovalsCount > 0 ? (
                <>
                  You have <strong className="text-amber-400 font-bold">{pendingApprovalsCount} student application{pendingApprovalsCount > 1 ? 's' : ''}</strong> awaiting deployment review. All course blocks are currently synced with host establishments.
                </>
              ) : (
                <>
                  All student internship applications are reviewed and active. Live daily time records and accomplishment submissions are tracked in real-time.
                </>
              )
            ) : !isApproved ? (
              /* When student is not yet approved, do NOT include any remaining hours description */
              enrollmentStatus === 'pending_peer_approval' ? (
                <>
                  Welcome to the Bicol University Practicum Portal. Your Group Cohort application has been submitted and is currently awaiting verification sign-on from your invited peers.
                </>
              ) : enrollmentStatus === 'pending_approval' ? (
                <>
                  Welcome to the Bicol University Practicum Portal. Your Host Training Establishment (HTE) placement application is currently pending coordinator endorsement. DTR logging will be unlocked upon approval.
                </>
              ) : enrollmentStatus === 'declined' ? (
                <>
                  Welcome to the Bicol University Practicum Portal. Your enrollment application was returned for revision. Please review coordinator feedback and resubmit your placement details.
                </>
              ) : (
                <>
                  Welcome to the Bicol University Practicum Portal. Complete your Host Training Establishment (HTE) enrollment to begin your practicum deployment.
                </>
              )
            ) : hoursRemaining !== undefined ? (
              /* Only after enrollment is approved, show remaining hours */
              <>
                You have <strong className="text-amber-400 font-bold">{hoursRemaining.toFixed(1)} hours</strong> remaining to complete your target practicum hours. Remember to punch your Time-In upon workstation arrival.
              </>
            ) : (
              <>
                Ready for your internship duties. Keep your daily accomplishments logged and maintain consistent schedule adherence.
              </>
            )}
          </p>
        </div>

        {/* Right: Quick Stat Pill / Status Note */}
        {role !== 'coordinator' && !isApproved && (
          <div className="shrink-0 flex items-center gap-3">
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Enrollment Status</div>
              <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1.5 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {enrollmentStatus === 'pending_approval'
                    ? 'Awaiting Endorsement'
                    : enrollmentStatus === 'declined'
                    ? 'Revision Required'
                    : 'Enrollment Pending'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
