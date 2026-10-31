export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'coordinator' | 'student';
  buId: string;
  studentIdNumber?: string;
  coordinatorIdNumber?: string;
  department: string;
  classBlock?: string; // e.g. "BSCS 4-A"
  batchId?: string;
  avatarUrl?: string;
  studentProfile?: Student;
}

export interface ClassBatch {
  id: string;
  batchCode: string;
  batchName: string;
  blockSection: string;
  academicYear: string;
  semester: string;
  coordinatorName: string;
  totalStudents: number;
  completedStudents: number;
  totalHoursRendered: number;
  targetHours: number;
  isArchived: boolean;
  archivedDate?: string;
  createdAt: string;
  partnerCompaniesCount: number;
  groupsCount: number;
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  address: string;
  branch: string; // Specific company branch (e.g. Rawis Regional Office, Legazpi Capitol Branch, etc.)
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  moaStatus: 'active' | 'pending_renewal' | 'under_review';
  maxInterns: number;
  currentInterns: number;
  workstationSubnet: string;
}

export interface CompanyBranchGroup {
  companyId: string;
  companyName: string;
  branch: string;
  students: Student[];
  totalHoursRendered: number;
  mentorName?: string;
  sector?: string;
}

export interface GroupMemberInvitation {
  studentId: string;
  studentEmail: string;
  studentName: string;
  studentBuId?: string;
  classBlock?: string;
  status: 'creator' | 'pending' | 'accepted' | 'declined';
  respondedAt?: string;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  companyId: string;
  companyName: string;
  companyBranch?: string;
  leaderId: string;
  leaderName: string;
  academicYear: string;
  semester: string;
  targetHours: number;
  membersCount: number;
  totalHoursRendered?: number;
  members?: Student[];
  invitations?: GroupMemberInvitation[];
  peerApprovalStatus?: 'pending_peer_approvals' | 'all_peers_approved';
  scheduledDeploymentDate?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  mentorName?: string;
  status: 'active' | 'completed' | 'pending';
}

export interface Student {
  id: string;
  buId: string;
  studentIdNumber?: string;
  fullName: string;
  email: string;
  degree: string;
  college: string;
  classBlock?: string;
  batchId?: string;
  enrollmentType?: 'individual' | 'group';
  groupId?: string;
  groupName?: string;
  companyId: string;
  companyName: string;
  companyBranch?: string; // Company Branch assignment
  mentorName: string;
  coordinatorId?: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  dutyStart: string;
  dutyEnd: string;
  dutyDays: string;
  targetHours: number;
  renderedHours: number;
  attendanceRate: number;
  status: 'active' | 'completed' | 'at_risk';
  enrollmentStatus?: 'not_enrolled' | 'pending_peer_approval' | 'pending_approval' | 'approved' | 'declined';
  enrollmentDeclinedReason?: string;
  scheduledDeploymentDate?: string;
  startDate?: string;
  deploymentApproved?: boolean;
  deploymentApprovedAt?: string;
  completionApproved?: boolean;
  completionApprovedAt?: string;
  isArchived?: boolean;
  avatarUrl: string;
  wfhDates?: string[];
  pendingGroupInvitation?: {
    groupId: string;
    groupName: string;
    companyId: string;
    companyName: string;
    companyBranch?: string;
    leaderName: string;
    leaderEmail: string;
    scheduledDeploymentDate?: string;
    startDate?: string;
    coordinatorName?: string;
    mentorName?: string;
    invitedAt: string;
  };
}

export interface CoordinatorInfo {
  id: string;
  coordinatorIdNumber?: string;
  fullName: string;
  email: string;
  department?: string;
  buId?: string;
}

export interface UnaccomplishedTask {
  id: string;
  studentId: string;
  type: 'missing_time_out' | 'missing_accomplishment' | 'enrollment_pending' | 'unexcused_absence';
  title: string;
  description: string;
  date: string;
  urgency: 'high' | 'medium' | 'urgent';
  actionType: 'time_out' | 'submit_report' | 'submit_excuse' | 'view_enrollment';
}

export interface OvertimeRequest {
  id: string;
  studentId: string;
  studentName: string;
  companyId?: string;
  companyName?: string;
  date: string;
  hoursRequested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  coordinatorNotes?: string;
  createdAt: string;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentIdNumber?: string;
  studentName: string;
  companyId: string;
  companyName: string;
  date: string;
  shiftNumber?: 1 | 2;
  shiftLabel?: 'Morning Shift' | 'Afternoon Shift';
  expectedTimeIn: string;
  actualTimeIn: string | null;
  expectedTimeOut: string;
  actualTimeOut: string | null;
  hoursRendered: number;
  status: 'present' | 'late' | 'absent' | 'undertime' | 'wfh';
  verificationStatus: 'verified' | 'pending' | 'flagged';
  workstationIp: string;
  remarks?: string;
  dtrImageLink?: string;
}

export interface AccomplishmentReport {
  id: string;
  studentId: string;
  studentIdNumber?: string;
  studentName: string;
  groupId?: string;
  groupName?: string;
  companyId: string;
  companyName: string;
  date: string;
  weekNumber: number;
  workCategory: 'System Testing & QA' | 'Documentation' | 'Frontend Dev' | 'Backend Dev' | 'Network & IT Support' | 'Data Analytics';
  taskTitle: string;
  taskDescription: string;
  supervisorAssignedDuty?: string; // Optional duty or assignment given by internship supervisor
  hoursSpent: number;
  taskStatus: 'completed' | 'in_progress' | 'blocked';
  obstaclesFaced?: string;
}

export interface AttendanceAlert {
  id: string;
  studentId: string;
  studentName: string;
  companyName: string;
  anomalyType: 'MISSED_ATTENDANCE_WINDOW' | 'LATE_CHECK_IN_ANOMALY' | 'CONSECUTIVE_UNEXCUSED' | 'UNDERTIME_DEPARTURE';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionMethod: string;
  anomalyScore: number;
  expectedSchedule: string;
  message: string;
  emailDispatched: boolean;
  pushDispatched: boolean;
  status: 'pending_review' | 'acknowledged' | 'excused' | 'sanctioned';
  createdAt: string;
}

export interface AISummary {
  id: string;
  groupId?: string;
  groupName?: string;
  studentId?: string;
  studentName?: string;
  weekNumber: number;
  totalMembers: number;
  membersAttended: number;
  totalHoursRendered: number;
  tasksSubmitted: number;
  tasksCompleted: number;
  dominantWorkAreas: string[];
  aiHighlight: string;
  keyFindings: string[];
  decisionSupportNotes: string;
  generatedAt: string;
}

export interface SystemStats {
  totalStudents: number;
  activeGroups: number;
  partnerCompanies: number;
  totalHoursRendered: string;
  avgAttendanceRate: string;
  pendingAlerts: number;
  targetHoursStandard: number;
}

export interface ISOEvaluation {
  id: string;
  evaluatorName: string;
  evaluatorRole: string;
  functionalSuitability: number;
  performanceEfficiency: number;
  usability: number;
  reliability: number;
  security: number;
  maintainability: number;
  average: number;
  comments: string;
  date: string;
}

export interface BUCourseConfig {
  code: string;
  name: string;
  college: string;
  department: string;
  blocks: string[];
}

export const BU_COURSES: BUCourseConfig[] = [
  {
    code: 'BSCS',
    name: 'BS Computer Science',
    college: 'College of Science',
    department: 'Department of Computer Science',
    blocks: ['BSCS 4-A', 'BSCS 4-B', 'BSCS 4-C', 'BSCS 3-A', 'BSCS 3-B'],
  },
  {
    code: 'BSIT',
    name: 'BS Information Technology',
    college: 'College of Science',
    department: 'Department of Information Technology',
    blocks: ['BSIT 4-A', 'BSIT 4-B', 'BSIT 4-C', 'BSIT 3-A', 'BSIT 3-B'],
  },
  {
    code: 'BSIS',
    name: 'BS Information Systems',
    college: 'College of Science',
    department: 'Department of Information Systems',
    blocks: ['BSIS 4-A', 'BSIS 4-B', 'BSIS 3-A'],
  },
  {
    code: 'BS-BIO',
    name: 'BS Biology',
    college: 'College of Science',
    department: 'Department of Biology',
    blocks: ['BS BIO 4-A', 'BS BIO 4-B', 'BS BIO 3-A'],
  },
  {
    code: 'BS-CHEM',
    name: 'BS Chemistry',
    college: 'College of Science',
    department: 'Department of Chemistry',
    blocks: ['BS CHEM 4-A', 'BS CHEM 4-B', 'BS CHEM 3-A'],
  },
  {
    code: 'BS-MET',
    name: 'BS Meteorology',
    college: 'College of Science',
    department: 'Department of Meteorology',
    blocks: ['BS MET 4-A', 'BS MET 3-A'],
  },
];
