import React from 'react';
import { Calendar, Clock, MapPin, Tag, ExternalLink, ChevronRight } from './icons';

export const IBUEventsView: React.FC<{ onNavigateToTab: (tab: string) => void }> = ({ onNavigateToTab }) => {
  const events = [
    {
      id: 'ev-1',
      title: 'Midterm Practicum Accomplishment Report Review',
      date: 'October 15, 2026',
      time: '01:00 PM – 05:00 PM',
      location: 'CS Multimedia Lab 2 & Virtual Google Meet',
      category: 'Academic Milestone',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      description:
        'Official submission of interim Daily Accomplishment Reports and mentor performance feedback signed by HTE supervisors.',
    },
    {
      id: 'ev-2',
      title: 'Host Training Establishment (HTE) Industry Liaison Assembly',
      date: 'October 24, 2026',
      time: '09:00 AM – 12:00 PM',
      location: 'Bicol University College of Science Amphitheater',
      category: 'Industry Partner',
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      description:
        'Coordination conference with partner establishments regarding student performance, MOA compliance, and cybersecurity protocols.',
    },
    {
      id: 'ev-3',
      title: 'Final Practicum Clearance & DTR Logbook Verification',
      date: 'December 12, 2026',
      time: '08:00 AM – 05:00 PM',
      location: 'Dept. of Computer Science Directorate Office',
      category: 'Clearance & Archival',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      description:
        'Final auditing of 240 target hours, verification of unexcused absences, and cohort clearance for academic archival.',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto py-2">
      <div className="border-b border-[#141d2e] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-cyan-400" />
            <span>University Events & Practicum Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Key academic deadlines, orientation sessions, and practicum clearance milestones.
          </p>
        </div>
        <button
          onClick={() => onNavigateToTab('home')}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 self-start sm:self-auto cursor-pointer"
        >
          ← Return to iBU Hub
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="bg-[#0c1421] border border-[#1e293b] rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition shadow-xl"
          >
            <div className="space-y-3">
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${ev.color}`}>
                {ev.category}
              </span>
              <h3 className="font-bold text-white text-base leading-snug">{ev.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{ev.description}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-semibold text-slate-200">{ev.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{ev.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{ev.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
