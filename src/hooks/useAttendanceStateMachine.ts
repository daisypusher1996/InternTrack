import { useState, useEffect, useCallback, useRef } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  getTodayDateString,
  fetchTodayAttendanceRecords,
  punchTimeInToSupabase,
  punchTimeOutToSupabase,
  evaluateAttendanceState,
  TodayAttendanceRecord,
  AttendanceStateMachine,
} from '../lib/supabase';

interface UseAttendanceStateMachineProps {
  studentId: string;
  studentName?: string;
  companyId?: string;
  companyName?: string;
  dutyStart?: string;
  dutyEnd?: string;
  onSuccess?: () => Promise<void> | void;
}

export function useAttendanceStateMachine({
  studentId,
  studentName,
  companyId,
  companyName,
  dutyStart,
  dutyEnd,
  onSuccess,
}: UseAttendanceStateMachineProps) {
  const [todayRecords, setTodayRecords] = useState<TodayAttendanceRecord[]>([]);
  const [stateMachine, setStateMachine] = useState<AttendanceStateMachine>(() =>
    evaluateAttendanceState([])
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<'in' | 'out' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentDateRef = useRef<string>(getTodayDateString());

  // 1. Fetch and Evaluate Today's Records (Single Source of Truth)
  const refreshRecords = useCallback(async () => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    const today = getTodayDateString();
    currentDateRef.current = today;

    try {
      const { records, error: fetchErr } = await fetchTodayAttendanceRecords(studentId, today);
      if (fetchErr) {
        console.warn('Could not fetch today attendance records from Supabase:', fetchErr);
        setError(fetchErr.message || 'Failed to fetch current attendance records.');
        setTodayRecords([]);
        setStateMachine(evaluateAttendanceState([]));
      } else {
        setTodayRecords(records);
        const evaluated = evaluateAttendanceState(records);
        setStateMachine(evaluated);
        setError(null);
      }
    } catch (err: any) {
      console.warn('Error refreshing records from Supabase:', err);
      setStateMachine(evaluateAttendanceState([]));
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  // Initial fetch on mount or studentId change
  useEffect(() => {
    setIsLoading(true);
    refreshRecords();
  }, [refreshRecords]);

  // Date change monitor (e.g. crossing midnight or clock shift)
  useEffect(() => {
    const timer = setInterval(() => {
      const today = getTodayDateString();
      if (today !== currentDateRef.current) {
        currentDateRef.current = today;
        refreshRecords();
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(timer);
  }, [refreshRecords]);

  // Realtime subscription for live sync if another session/tab punches
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !studentId) return;

    const channel = supabase
      .channel(`attendance-gate-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
        },
        () => {
          refreshRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, refreshRecords]);

  // 2. Anti-Spam & UI Lockout: Time-In
  const handleTimeIn = useCallback(
    async (remarks?: string, dtrImageLink?: string) => {
      if (isMutating || isLoading) return;
      setIsMutating(true);
      setActiveAction('in');
      setError(null);

      try {
        const result = await punchTimeInToSupabase({
          studentId,
          studentName: studentName || 'Student Intern',
          companyId,
          companyName,
          dutyStart,
          dutyEnd,
          remarks,
          dtrImageLink,
        });

        // Set fresh records returned by Supabase
        setTodayRecords(result.records);
        setStateMachine(evaluateAttendanceState(result.records));

        if (onSuccess) {
          await onSuccess();
        }
      } catch (err: any) {
        console.error('Time-In error:', err);
        setError(err.message || 'Failed to record Time-In against Supabase.');
        // Re-evaluate from latest records to ensure UI reflects actual DB state
        await refreshRecords();
      } finally {
        setIsMutating(false);
        setActiveAction(null);
      }
    },
    [studentId, studentName, companyId, companyName, dutyStart, dutyEnd, isMutating, isLoading, onSuccess, refreshRecords]
  );

  // 3. Anti-Spam & UI Lockout: Time-Out
  const handleTimeOut = useCallback(
    async (remarks?: string, dtrImageLink?: string) => {
      if (isMutating || isLoading) return;
      setIsMutating(true);
      setActiveAction('out');
      setError(null);

      try {
        const result = await punchTimeOutToSupabase({
          studentId,
          studentName,
          recordId: stateMachine.activeOpenRecord?.id,
          remarks,
          dtrImageLink,
        });

        // Set fresh records returned by Supabase
        setTodayRecords(result.records);
        setStateMachine(evaluateAttendanceState(result.records));

        if (onSuccess) {
          await onSuccess();
        }
      } catch (err: any) {
        console.error('Time-Out error:', err);
        setError(err.message || 'Failed to record Time-Out against Supabase.');
        // Re-evaluate from latest records to ensure UI reflects actual DB state
        await refreshRecords();
      } finally {
        setIsMutating(false);
        setActiveAction(null);
      }
    },
    [studentId, studentName, stateMachine.activeOpenRecord, isMutating, isLoading, onSuccess, refreshRecords]
  );

  const dismissError = useCallback(() => setError(null), []);

  return {
    todayRecords,
    stateMachine,
    isLoading,
    isMutating,
    activeAction,
    error,
    handleTimeIn,
    handleTimeOut,
    refreshRecords,
    dismissError,
  };
}
