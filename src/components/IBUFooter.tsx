import React from 'react';

export const IBUFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#050912] border-t border-[#131d2e] text-slate-400 text-xs py-10 px-4 sm:px-6 lg:px-8 mt-16 select-none">
      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Main Footer Directory & Seals */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Seals Section (Left) */}
          <div className="md:col-span-4 flex items-center gap-4">
            {/* Bicol University 1969 Official Circular Seal */}
            <div className="w-20 h-20 shrink-0 relative group cursor-pointer" title="Bicol University Official Seal">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                {/* Outer Ring */}
                <circle cx="50" cy="50" r="48" fill="#0A2342" stroke="#F26522" strokeWidth="2.5" />
                <circle cx="50" cy="50" r="43" fill="#0A2342" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" />
                
                {/* Arc text simulation for BICOL UNIVERSITY */}
                <path id="buArc" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" stroke="none" />
                <text fill="#FFFFFF" fontSize="6.5" fontWeight="bold" letterSpacing="0.8">
                  <textPath href="#buArc" startOffset="50%" textAnchor="middle">
                    BICOL UNIVERSITY
                  </textPath>
                </text>

                {/* Bottom 1969 text */}
                <text x="50" y="87" fill="#F26522" fontSize="7" fontWeight="black" textAnchor="middle">
                  • 1969 •
                </text>

                {/* Inner Shield & Symbols */}
                <path d="M 32,35 L 68,35 L 68,58 Q 50,75 32,58 Z" fill="#FFFFFF" stroke="#F26522" strokeWidth="1.2" />
                {/* Flaming Torch & Knowledge Gear */}
                <path d="M 50,38 L 47,48 L 53,48 Z" fill="#F26522" />
                <circle cx="50" cy="40" r="3.5" fill="#F26522" opacity="0.9" />
                <path d="M 44,52 L 56,52 L 54,60 L 46,60 Z" fill="#0A2342" />
                {/* University Rays */}
                <circle cx="50" cy="50" r="1.5" fill="#FED7AA" />
              </svg>
            </div>

            {/* DPO / DPS National Privacy Commission Compliance Seal */}
            <div className="w-20 h-24 shrink-0 relative group cursor-pointer" title="DPO/DPS NPC Registered Compliance Seal">
              <svg viewBox="0 0 80 100" className="w-full h-full drop-shadow-md">
                {/* Blue Badge Crest */}
                <rect x="5" y="4" width="70" height="52" rx="10" fill="#0A2342" stroke="#60A5FA" strokeWidth="1.5" />
                
                {/* DPO / DPS text banner */}
                <rect x="10" y="8" width="60" height="15" rx="4" fill="#1D4ED8" />
                <text x="40" y="19" fill="#FFFFFF" fontSize="7.5" fontWeight="extrabold" textAnchor="middle" letterSpacing="0.5">
                  DPO / DPS
                </text>

                {/* QR Code and NPC simulation inside badge */}
                <rect x="25" y="27" width="30" height="23" rx="3" fill="#FFFFFF" />
                <rect x="29" y="31" width="5" height="5" fill="#0A2342" />
                <rect x="46" y="31" width="5" height="5" fill="#0A2342" />
                <rect x="29" y="41" width="5" height="5" fill="#0A2342" />
                <circle cx="40" cy="38" r="2.5" fill="#F26522" />
                <text x="40" y="55" fill="#0A2342" fontSize="3" fontWeight="bold" textAnchor="middle">
                  NPC COMPLIANT
                </text>

                {/* Ribbon tails hanging below */}
                <path d="M 22,56 L 22,88 L 30,80 L 38,88 L 38,56 Z" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1" />
                <path d="M 42,56 L 42,88 L 50,80 L 58,88 L 58,56 Z" fill="#1D4ED8" stroke="#1E40AF" strokeWidth="1" />
              </svg>
            </div>

            {/* Seal accreditation label */}
            <div className="text-[11px] text-slate-500 leading-snug">
              <div className="font-bold text-slate-300">Republic of the Philippines</div>
              <div>Bicol University ISO 9001:2015</div>
              <div className="text-cyan-400 font-mono text-[10px]">NPC DPO-DPS Verified</div>
            </div>
          </div>

          {/* 4 Directory Columns (Right) */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-[11px]">
            {/* Column 1: Admissions Office */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                ADMISSIONS OFFICE
              </h4>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <a href="#application" className="hover:text-cyan-400 transition">
                    Application Form
                  </a>
                </li>
                <li>
                  <a href="#requirements" className="hover:text-cyan-400 transition">
                    Admission Requirements
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: University Health Services */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                UNIVERSITY HEALTH SERVICES
              </h4>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <a href="#medical" className="hover:text-cyan-400 transition">
                    Medical Schedule
                  </a>
                </li>
                <li>
                  <a href="#download" className="hover:text-cyan-400 transition">
                    Download Requirements
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: University Registrar */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                UNIVERSITY REGISTRAR
              </h4>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <a href="#events" className="hover:text-cyan-400 transition">
                    Events
                  </a>
                </li>
                <li>
                  <a href="#requirements" className="hover:text-cyan-400 transition">
                    Download Requirements
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: System Concerns */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                SYSTEM CONCERNS
              </h4>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <a href="#support" className="hover:text-cyan-400 transition">
                    Technical Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Horizontal Divider & Legal Copyright */}
        <div className="pt-6 border-t border-[#131d2e] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            <div className="font-semibold text-slate-300">
              Bicol University Integrated Information System
            </div>
            <div>© 2026 Bicol University. All rights reserved.</div>
          </div>

          <div className="flex items-center gap-5 font-medium text-slate-400">
            <a href="#terms" className="hover:text-cyan-400 transition">Terms</a>
            <a href="#privacy" className="hover:text-cyan-400 transition">Privacy</a>
            <a href="#cookies" className="hover:text-cyan-400 transition">Cookies</a>
            <a href="#cookie-policy" className="hover:text-cyan-400 transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
