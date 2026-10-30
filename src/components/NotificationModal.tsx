import React from 'react';
import { X, AlertTriangle, Bell, Check, ShieldAlert, Mail } from 'lucide-react';
import { AttendanceAlert } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AttendanceAlert[];
  onResolveAlert: (id: string, action: 'acknowledge' | 'excuse' | 'sanction') => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onResolveAlert,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#020617] w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-200">
        {/* Modal Header */}
        <div className="bg-[#020617] text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#F26522] rounded-xl text-white shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Attendance Anomaly & Schedule Alerts</h2>
              <p className="text-xs text-slate-300">
                AI decision-support notifications flagged for Student Internship Coordinator review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-800 flex-1">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
              No pending attendance alerts detected.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-800">
                      {alert.anomalyType}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{alert.studentName}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">({alert.companyName})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    Score: {alert.anomalyScore}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-slate-800 dark:text-amber-200 font-medium leading-relaxed">
                  "{alert.message}"
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#F26522]" />
                    <span>Dispatched to Student & Coordinator</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onResolveAlert(alert.id, 'acknowledge')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => onResolveAlert(alert.id, 'excuse')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      Accept Excuse
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/90 p-4 px-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Close Alerts
          </button>
        </div>
      </div>
    </div>
  );
};
