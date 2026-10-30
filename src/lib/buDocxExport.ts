import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  HeadingLevel,
  PageBreak,
  HeightRule,
} from 'docx';
import { saveAs } from 'file-saver';
import { Student, AttendanceLog, AccomplishmentReport } from '../types';

export interface BUDocxExportOptions {
  student: Student;
  campusName?: string; // e.g. "POLANGUI" or "COLLEGE OF SCIENCE"
  campusAddress?: string; // e.g. "Polangui, Albay" or "Legazpi City, Albay"
  campusEmail?: string; // e.g. "bupc-dean@bicol-u.edu.ph"
  supervisorName?: string;
  supervisorPosition?: string;
  startDate?: string;
  endDate?: string;
  formType: 'daily' | 'weekly' | 'monthly' | 'all';
  // Optional custom or enriched fields
  trainings?: string;
  proposedActivities?: { activity: string; accomplishment: string }[];
  problemsEncountered?: string[];
  solutionsApplied?: string[];
  nextPeriodGoals?: string[];
  weeklyBreakdown?: {
    day1?: string;
    day2?: string;
    day3?: string;
    day4?: string;
    day5?: string;
  };
  monthlyBreakdown?: {
    week1?: string;
    week2?: string;
    week3?: string;
    week4?: string;
  };
}

// Border definitions
const solidBorder = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: '000000',
};

const cellBorders = {
  top: solidBorder,
  bottom: solidBorder,
  left: solidBorder,
  right: solidBorder,
};

const lightCellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
};

const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
};

const transparentBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
};

/**
 * Creates the Institutional BU Header paragraph elements
 */
function createBUHeader(
  campus = 'POLANGUI',
  address = 'Polangui, Albay',
  email = 'bupc-dean@bicol-u.edu.ph'
): (Paragraph | Table)[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'REPUBLIC OF THE PHILIPPINES',
          size: 18,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'BICOL UNIVERSITY',
          bold: true,
          size: 26,
          font: 'Arial',
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: campus.toUpperCase(),
          bold: true,
          size: 22,
          font: 'Arial',
          color: '1E293B',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: address,
          size: 18,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: `Email: ${email}   |   ISO 9001: 2015 SOCOTEC SCP000722Q   |   BAGONG PILIPINAS`,
          size: 16,
          italics: true,
          font: 'Arial',
          color: '475569',
        }),
      ],
    }),
    // Horizontal separator
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          color: '000000',
        },
      },
      spacing: { before: 0, after: 200 },
      children: [],
    }),
  ];
}

/**
 * Page 1: Daily Attendance and Accomplishment Form
 */
function generateDailyFormElements(
  options: BUDocxExportOptions,
  attendanceLogs: AttendanceLog[],
  accomplishments: AccomplishmentReport[]
): (Paragraph | Table)[] {
  const { student, campusName, campusAddress, campusEmail } = options;
  const supervisor = options.supervisorName || student.mentorName || 'Company Supervisor';
  const company = student.companyName || 'Host Training Establishment';

  // Sort logs by date ascending
  const sortedLogs = [...attendanceLogs]
    .filter((l) => l.studentId === student.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Determine beginning and ending date
  const firstDate = options.startDate || sortedLogs[0]?.date || 'May 06, 2026';
  const lastDate = options.endDate || sortedLogs[sortedLogs.length - 1]?.date || 'June 20, 2026';

  const elements: (Paragraph | Table)[] = [
    ...createBUHeader(campusName, campusAddress, campusEmail),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: 'DAILY ATTENDANCE AND ACCOMPLISHMENT FORM',
          bold: true,
          size: 24,
          font: 'Arial',
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: '(Please keep one copy of this form and give one to the Company to serve as a sign-in sheet to document your internship hours. Give a copy of the completed time sheet to your Student Internship Program (SIP) Coordinator every Saturday at minimum.)',
          italics: true,
          size: 16,
          font: 'Arial',
          color: '334155',
        }),
      ],
    }),

    // Student & Company Info Table (2-column layout)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: transparentBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Student Name: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: student.fullName, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Internship Site: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: company, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({ text: 'Beginning Date: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: firstDate, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({ text: 'Ending Date: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: lastDate, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 0, after: 80 }, children: [] }),
  ];

  // Daily Table Headers: Date | Arrival Time | Departure Time | Accomplishment/s | Total Hours | Verified by
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: 'F1F5F9' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Date', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: 'F1F5F9' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Arrival Time', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: 'F1F5F9' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Departure Time', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 37, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: 'F1F5F9' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Accomplishment/s', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: 'F1F5F9' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Total Hours', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: 'F1F5F9' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Verified by', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    }),
  ];

  let cumulativeHours = 0;

  // If no logs found, populate standard template rows
  const displayLogs = sortedLogs.length > 0 ? sortedLogs : [];

  // Match accomplishment reports with dates if available
  displayLogs.forEach((log) => {
    cumulativeHours += Number(log.hoursRendered) || 0;
    const matchingAccomplishment = accomplishments.find(
      (a) => a.studentId === student.id && a.date === log.date
    );
    const accomplishmentText =
      matchingAccomplishment?.taskDescription ||
      matchingAccomplishment?.taskTitle ||
      log.remarks ||
      '';

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: log.date, size: 17, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: log.actualTimeIn || '08:00 AM', size: 17, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: log.actualTimeOut || '05:00 PM', size: 17, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: accomplishmentText, size: 17, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${(Number(log.hoursRendered) || 8).toFixed(1)}`, size: 17, font: 'Arial' }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: log.verificationStatus === 'verified' ? 'Verified' : 'Pending',
                    size: 16,
                    font: 'Arial',
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  // Ensure minimum 8 rows for official document appearance if sparse
  const emptyRowsNeeded = Math.max(0, 8 - displayLogs.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
        ],
      })
    );
  }

  // Total Hours Row
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          borders: cellBorders,
          shading: { fill: 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'Total Hours:', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          shading: { fill: 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${cumulativeHours > 0 ? cumulativeHours.toFixed(1) : (student.renderedHours || 40).toFixed(1)} hrs`,
                  bold: true,
                  size: 18,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          borders: cellBorders,
          shading: { fill: 'F8FAFC' },
          children: [new Paragraph({ children: [] })],
        }),
      ],
    })
  );

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    })
  );

  // Spacing
  elements.push(new Paragraph({ spacing: { before: 180, after: 240 }, children: [] }));

  // Signatures
  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: transparentBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: '__________________________________', bold: true, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Company Supervisor's Signature", bold: true, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Name: ${supervisor}`, size: 17, font: 'Arial', italics: true }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: 'Date: ________________________', bold: true, size: 18, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  spacing: { before: 160, after: 0 },
                  children: [
                    new TextRun({ text: '__________________________________', bold: true, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Student Intern's Signature", bold: true, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Name: ${student.fullName}`, size: 17, font: 'Arial', italics: true }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 160, after: 0 },
                  children: [
                    new TextRun({ text: 'Date: ________________________', bold: true, size: 18, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  return elements;
}

/**
 * Page 2: Weekly Accomplishment Form
 */
function generateWeeklyFormElements(
  options: BUDocxExportOptions,
  accomplishments: AccomplishmentReport[]
): (Paragraph | Table)[] {
  const { student, campusName, campusAddress, campusEmail } = options;
  const supervisor = options.supervisorName || student.mentorName || 'Company Supervisor';
  const supervisorPos = options.supervisorPosition || 'Student Internship Technical Mentor';
  const company = student.companyName || 'Host Training Establishment';

  const beginning = options.startDate || 'May 06, 2026';
  const ending = options.endDate || 'May 10, 2026';

  // Extract accomplishments for this student
  const studentReports = accomplishments.filter((r) => r.studentId === student.id);

  const day1 =
    options.weeklyBreakdown?.day1 ??
    studentReports[0]?.taskDescription ??
    studentReports[0]?.taskTitle ??
    '';
  const day2 =
    options.weeklyBreakdown?.day2 ??
    studentReports[1]?.taskDescription ??
    studentReports[1]?.taskTitle ??
    '';
  const day3 =
    options.weeklyBreakdown?.day3 ??
    studentReports[2]?.taskDescription ??
    studentReports[2]?.taskTitle ??
    '';
  const day4 =
    options.weeklyBreakdown?.day4 ??
    studentReports[3]?.taskDescription ??
    studentReports[3]?.taskTitle ??
    '';
  const day5 =
    options.weeklyBreakdown?.day5 ??
    studentReports[4]?.taskDescription ??
    studentReports[4]?.taskTitle ??
    '';

  const trainings = options.trainings || '';

  const activities =
    options.proposedActivities && options.proposedActivities.length > 0
      ? options.proposedActivities
      : studentReports.length > 0
      ? studentReports.slice(0, 4).map((r) => ({
          activity: r.supervisorAssignedDuty || r.taskTitle || '',
          accomplishment: r.taskDescription || r.taskTitle || '',
        }))
      : [{ activity: '', accomplishment: '' }];

  const problems =
    options.problemsEncountered && options.problemsEncountered.length > 0
      ? options.problemsEncountered
      : [];

  const solutions =
    options.solutionsApplied && options.solutionsApplied.length > 0
      ? options.solutionsApplied
      : [];

  const goals =
    options.nextPeriodGoals && options.nextPeriodGoals.length > 0
      ? options.nextPeriodGoals
      : [];

  const elements: (Paragraph | Table)[] = [
    ...createBUHeader(campusName, campusAddress, campusEmail),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 140 },
      children: [
        new TextRun({
          text: 'WEEKLY ACCOMPLISHMENT FORM',
          bold: true,
          size: 24,
          font: 'Arial',
        }),
      ],
    }),

    // Metadata Table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: transparentBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Student Name: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: student.fullName, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Company Name: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: company, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({ text: 'Beginning Date: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: beginning, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({ text: 'Ending Date: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: ending, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 0, after: 80 }, children: [] }),

    // Main Boxed Content Table matching the BU PDF format
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Duties Performed this week: Day 1-5
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({ text: 'Duties Performed this week:', bold: true, size: 19, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: 'Day 1: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: day1, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: 'Day 2: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: day2, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: 'Day 3: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: day3, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: 'Day 4: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: day4, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 40 },
                  children: [
                    new TextRun({ text: 'Day 5: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: day5, size: 18, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // What new training/s took place this week?
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 30 },
                  children: [
                    new TextRun({
                      text: 'What new training/s took place this week?',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 0, after: 40 },
                  children: [new TextRun({ text: trainings, size: 18, font: 'Arial' })],
                }),
              ],
            }),
          ],
        }),

        // Major Accomplishments Header
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 30 },
                  children: [
                    new TextRun({
                      text: 'What are your major accomplishments based from the Proposed Activities in your Training Schedule Form? Provide a detailed description of the tasks involved in the accomplishment.',
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                // Nested Table for PROPOSED ACTIVITY/IES vs ACCOMPLISHMENTS
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          borders: cellBorders,
                          shading: { fill: 'F1F5F9' },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [
                                new TextRun({
                                  text: 'PROPOSED ACTIVITY/IES',
                                  bold: true,
                                  size: 18,
                                  font: 'Arial',
                                }),
                              ],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          borders: cellBorders,
                          shading: { fill: 'F1F5F9' },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [
                                new TextRun({
                                  text: 'ACCOMPLISHMENTS',
                                  bold: true,
                                  size: 18,
                                  font: 'Arial',
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    ...activities.map(
                      (act) =>
                        new TableRow({
                          children: [
                            new TableCell({
                              borders: cellBorders,
                              children: [
                                new Paragraph({
                                  children: [new TextRun({ text: `• ${act.activity}`, size: 17, font: 'Arial' })],
                                }),
                              ],
                            }),
                            new TableCell({
                              borders: cellBorders,
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: `• ${act.accomplishment}`, size: 17, font: 'Arial' }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        })
                    ),
                  ],
                }),
              ],
            }),
          ],
        }),

        // What problems have you encountered this week?
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 20 },
                  children: [
                    new TextRun({
                      text: 'What problems have you encountered this week?',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...problems.map(
                  (p) =>
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [new TextRun({ text: `• ${p}`, size: 18, font: 'Arial' })],
                    })
                ),
              ],
            }),
          ],
        }),

        // How did you overcome or solve those problems?
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 20 },
                  children: [
                    new TextRun({
                      text: 'How did you overcome or solve those problems?',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...solutions.map(
                  (s) =>
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [new TextRun({ text: `• ${s}`, size: 18, font: 'Arial' })],
                    })
                ),
              ],
            }),
          ],
        }),

        // List one or two goals you have set for yourself next week.
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 20 },
                  children: [
                    new TextRun({
                      text: 'List one or two goals you have set for yourself next week.',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...goals.map(
                  (g) =>
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [new TextRun({ text: `• ${g}`, size: 18, font: 'Arial' })],
                    })
                ),
              ],
            }),
          ],
        }),
      ],
    }),

    // Noted by section
    new Paragraph({ spacing: { before: 200, after: 40 }, children: [new TextRun({ text: 'Noted by:', size: 19, font: 'Arial' })] }),
    new Paragraph({
      spacing: { before: 80, after: 20 },
      children: [
        new TextRun({
          text: '____________________________________',
          bold: true,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: supervisor,
          bold: true,
          size: 19,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: supervisorPos,
          size: 17,
          font: 'Arial',
          italics: true,
          color: '475569',
        }),
      ],
    }),
  ];

  return elements;
}

/**
 * Page 3: Monthly Accomplishment Form
 */
function generateMonthlyFormElements(
  options: BUDocxExportOptions,
  accomplishments: AccomplishmentReport[]
): (Paragraph | Table)[] {
  const { student, campusName, campusAddress, campusEmail } = options;
  const supervisor = options.supervisorName || student.mentorName || 'Company Supervisor';
  const supervisorPos = options.supervisorPosition || 'Student Internship Technical Mentor';
  const company = student.companyName || 'Host Training Establishment';

  const beginning = options.startDate || 'May 01, 2026';
  const ending = options.endDate || 'May 31, 2026';

  const studentReports = accomplishments.filter((r) => r.studentId === student.id);

  const week1 =
    options.monthlyBreakdown?.week1 ??
    studentReports[0]?.taskDescription ??
    studentReports[0]?.taskTitle ??
    '';
  const week2 =
    options.monthlyBreakdown?.week2 ??
    studentReports[1]?.taskDescription ??
    studentReports[1]?.taskTitle ??
    '';
  const week3 =
    options.monthlyBreakdown?.week3 ??
    studentReports[2]?.taskDescription ??
    studentReports[2]?.taskTitle ??
    '';
  const week4 =
    options.monthlyBreakdown?.week4 ??
    studentReports[3]?.taskDescription ??
    studentReports[3]?.taskTitle ??
    '';

  const trainings = options.trainings || '';

  const activities =
    options.proposedActivities && options.proposedActivities.length > 0
      ? options.proposedActivities
      : studentReports.length > 0
      ? studentReports.slice(0, 4).map((r) => ({
          activity: r.supervisorAssignedDuty || r.taskTitle || '',
          accomplishment: r.taskDescription || r.taskTitle || '',
        }))
      : [{ activity: '', accomplishment: '' }];

  const problems =
    options.problemsEncountered && options.problemsEncountered.length > 0
      ? options.problemsEncountered
      : [];

  const solutions =
    options.solutionsApplied && options.solutionsApplied.length > 0
      ? options.solutionsApplied
      : [];

  const goals =
    options.nextPeriodGoals && options.nextPeriodGoals.length > 0
      ? options.nextPeriodGoals
      : [];

  const elements: (Paragraph | Table)[] = [
    ...createBUHeader(campusName, campusAddress, campusEmail),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 140 },
      children: [
        new TextRun({
          text: 'MONTHLY ACCOMPLISHMENT FORM',
          bold: true,
          size: 24,
          font: 'Arial',
        }),
      ],
    }),

    // Metadata Table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: transparentBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Student Name: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: student.fullName, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Company Name: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: company, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({ text: 'Beginning Date: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: beginning, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: transparentBorders,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 120 },
                  children: [
                    new TextRun({ text: 'Ending Date: ', bold: true, size: 19, font: 'Arial' }),
                    new TextRun({ text: ending, underline: {}, size: 19, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 0, after: 80 }, children: [] }),

    // Main Boxed Content Table matching the BU PDF format
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Duties Performed this month: Week 1-4
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({ text: 'Duties Performed this month:', bold: true, size: 19, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: 'Week 1: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: week1, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: 'Week 2: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: week2, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({ text: 'Week 3: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: week3, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20, after: 40 },
                  children: [
                    new TextRun({ text: 'Week 4: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: week4, size: 18, font: 'Arial' }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // What new training/s took place this month?
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 30 },
                  children: [
                    new TextRun({
                      text: 'What new training/s took place this month?',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 0, after: 40 },
                  children: [new TextRun({ text: trainings, size: 18, font: 'Arial' })],
                }),
              ],
            }),
          ],
        }),

        // Major Accomplishments Header
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 30 },
                  children: [
                    new TextRun({
                      text: 'What are your major accomplishments based from the Proposed Activities in your Training Schedule Form? Provide a detailed description of the tasks involved in the accomplishment.',
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                // Nested Table for PROPOSED ACTIVITY/IES vs ACCOMPLISHMENTS
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          borders: cellBorders,
                          shading: { fill: 'F1F5F9' },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [
                                new TextRun({
                                  text: 'PROPOSED ACTIVITY/IES',
                                  bold: true,
                                  size: 18,
                                  font: 'Arial',
                                }),
                              ],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          borders: cellBorders,
                          shading: { fill: 'F1F5F9' },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [
                                new TextRun({
                                  text: 'ACCOMPLISHMENTS',
                                  bold: true,
                                  size: 18,
                                  font: 'Arial',
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    ...activities.map(
                      (act) =>
                        new TableRow({
                          children: [
                            new TableCell({
                              borders: cellBorders,
                              children: [
                                new Paragraph({
                                  children: [new TextRun({ text: `• ${act.activity}`, size: 17, font: 'Arial' })],
                                }),
                              ],
                            }),
                            new TableCell({
                              borders: cellBorders,
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: `• ${act.accomplishment}`, size: 17, font: 'Arial' }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        })
                    ),
                  ],
                }),
              ],
            }),
          ],
        }),

        // What problems have you encountered this month?
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 20 },
                  children: [
                    new TextRun({
                      text: 'What problems have you encountered this month?',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...problems.map(
                  (p) =>
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [new TextRun({ text: `• ${p}`, size: 18, font: 'Arial' })],
                    })
                ),
              ],
            }),
          ],
        }),

        // How did you overcome or solve those problems?
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 20 },
                  children: [
                    new TextRun({
                      text: 'How did you overcome or solve those problems?',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...solutions.map(
                  (s) =>
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [new TextRun({ text: `• ${s}`, size: 18, font: 'Arial' })],
                    })
                ),
              ],
            }),
          ],
        }),

        // List one or two goals you have set for yourself next period.
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 20 },
                  children: [
                    new TextRun({
                      text: 'List one or two goals you have set for yourself next week.',
                      bold: true,
                      size: 19,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...goals.map(
                  (g) =>
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [new TextRun({ text: `• ${g}`, size: 18, font: 'Arial' })],
                    })
                ),
              ],
            }),
          ],
        }),
      ],
    }),

    // Noted by section
    new Paragraph({ spacing: { before: 200, after: 40 }, children: [new TextRun({ text: 'Noted by:', size: 19, font: 'Arial' })] }),
    new Paragraph({
      spacing: { before: 80, after: 20 },
      children: [
        new TextRun({
          text: '____________________________________',
          bold: true,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: supervisor,
          bold: true,
          size: 19,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: supervisorPos,
          size: 17,
          font: 'Arial',
          italics: true,
          color: '475569',
        }),
      ],
    }),
  ];

  return elements;
}

/**
 * Main export function to generate and download the .docx file
 */
export async function exportBUAccomplishmentDocx(
  options: BUDocxExportOptions,
  attendanceLogs: AttendanceLog[],
  accomplishments: AccomplishmentReport[]
): Promise<void> {
  const sectionsChildren: (Paragraph | Table)[] = [];

  if (options.formType === 'daily') {
    sectionsChildren.push(...generateDailyFormElements(options, attendanceLogs, accomplishments));
  } else if (options.formType === 'weekly') {
    sectionsChildren.push(...generateWeeklyFormElements(options, accomplishments));
  } else if (options.formType === 'monthly') {
    sectionsChildren.push(...generateMonthlyFormElements(options, accomplishments));
  } else {
    // All 3 forms bundled together into a single multi-page Word document with clean page breaks!
    sectionsChildren.push(...generateDailyFormElements(options, attendanceLogs, accomplishments));
    sectionsChildren.push(new Paragraph({ children: [new PageBreak()] }));
    sectionsChildren.push(...generateWeeklyFormElements(options, accomplishments));
    sectionsChildren.push(new Paragraph({ children: [new PageBreak()] }));
    sectionsChildren.push(...generateMonthlyFormElements(options, accomplishments));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch (720 dxa)
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: sectionsChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  const cleanName = options.student.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const typeLabel =
    options.formType === 'daily'
      ? 'Daily_Attendance_Form'
      : options.formType === 'weekly'
      ? 'Weekly_Accomplishment_Form'
      : options.formType === 'monthly'
      ? 'Monthly_Accomplishment_Form'
      : 'Complete_Student_Internship_Portfolio_Pack';

  const fileName = `BU_${typeLabel}_${cleanName}.docx`;
  saveAs(blob, fileName);
}
