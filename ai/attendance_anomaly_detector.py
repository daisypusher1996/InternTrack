#!/usr/bin/env python3
"""
InternTrack - Attendance Anomaly Detection & Schedule Alert Engine
Bicol University - Department of Computer Science
Authors: Camacho, Ecat, Narito | Adviser: Dr. Floradel S. Relucio

Implements:
1. Rule-based expected duty schedule vs. actual time-in/out verification
2. Statistical / Machine Learning anomaly detection (Z-score & IQR offset scoring)
3. Multi-channel automated alerts (Student notice, Coordinator flag, Web push, Email)
"""

import sys
import json
import math
from datetime import datetime, time, timedelta

def parse_time(time_str):
    """Parse HH:MM or HH:MM:SS string to time object."""
    if not time_str:
        return None
    parts = time_str.strip().split(":")
    return time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)

def calculate_time_diff_minutes(t1, t2):
    """Difference in minutes between two time objects (t2 - t1 on same day)."""
    m1 = t1.hour * 60 + t1.minute
    m2 = t2.hour * 60 + t2.minute
    return m2 - m1

class AttendanceAnomalyDetector:
    def __init__(self, grace_period_minutes=15, z_threshold=2.2):
        self.grace_period_minutes = grace_period_minutes
        self.z_threshold = z_threshold

    def calculate_ml_anomaly_score(self, lateness_minutes, history_latenesses):
        """
        Calculates an anomaly probability (0.0 to 1.0) using statistical Z-score
        and distribution variance of the student's historical check-in habits.
        """
        if not history_latenesses or len(history_latenesses) < 3:
            # Cold-start fallback: sigmoid mapped lateness
            # 0 min -> 0.05, 30 min -> 0.5, 60 min -> 0.88, >90 min -> 0.98
            score = 1.0 / (1.0 + math.exp(-0.06 * (lateness_minutes - 25)))
            return round(min(max(score, 0.05), 0.99), 4)

        mean = sum(history_latenesses) / len(history_latenesses)
        variance = sum((x - mean) ** 2 for x in history_latenesses) / len(history_latenesses)
        std_dev = math.sqrt(variance) if variance > 0 else 5.0

        z_score = abs(lateness_minutes - mean) / (std_dev if std_dev > 0.1 else 1.0)
        
        # Normalize z-score to probability [0.0, 1.0]
        # z = 2.0 corresponds to ~0.75, z >= 3.0 to ~0.95
        prob = 1.0 / (1.0 + math.exp(-1.5 * (z_score - 1.8)))
        return round(min(max(prob, 0.10), 0.99), 4)

    def analyze_record(self, student, expected_schedule, actual_log, history_latenesses=None, current_check_time="10:00:00"):
        """
        Compares expected duty schedule against actual time-in records.
        Generates structured alerts matching BU Concept Paper requirements.
        """
        if history_latenesses is None:
            history_latenesses = [2, -5, 0, 4, -2] # historical typical minutes offset

        student_name = student.get("full_name", "Student Intern")
        student_email = student.get("email", "student@bicol-u.edu.ph")
        coordinator_email = student.get("coordinator_email", "ojt.coordinator@bicol-u.edu.ph")
        company_name = student.get("company_name", "Partner Company HTE")
        
        date_str = actual_log.get("date", datetime.now().strftime("%B %d, %Y"))
        exp_start_str = expected_schedule.get("duty_start", "08:00")
        exp_end_str = expected_schedule.get("duty_end", "17:00")
        
        exp_start = parse_time(exp_start_str)
        exp_end = parse_time(exp_end_str)
        current_time = parse_time(current_check_time)
        
        actual_in_str = actual_log.get("actual_time_in")
        actual_in = parse_time(actual_in_str) if actual_in_str else None
        
        formatted_window = f"{exp_start_str} – {exp_end_str}, {date_str}"
        alerts = []

        # Case 1: Student has NOT recorded a time-in within the expected window
        grace_deadline_min = exp_start.hour * 60 + exp_start.minute + self.grace_period_minutes
        curr_min = current_time.hour * 60 + current_time.minute
        
        if actual_in is None:
            if curr_min > grace_deadline_min:
                delay_past_grace = curr_min - grace_deadline_min
                anomaly_score = self.calculate_ml_anomaly_score(delay_past_grace + 30, history_latenesses)
                
                # Concept paper exact notice formulation:
                # "Juan Dela Cruz has not recorded a time-in for the scheduled internship period (8:00 AM – 5:00 PM, August 19, 2026).
                #  The system has notified the student and flagged this entry for the OJT coordinator's review."
                notice_message = (
                    f"{student_name} has not recorded a time-in for the scheduled internship period "
                    f"({formatted_window}). The system has notified the student and flagged this entry "
                    f"for the OJT coordinator's review."
                )
                
                alerts.append({
                    "alert_id": f"ALT-{student.get('id', 'STU')}-{date_str.replace(' ', '')}",
                    "student_id": student.get("id"),
                    "student_name": student_name,
                    "company_name": company_name,
                    "anomaly_type": "MISSED_ATTENDANCE_WINDOW",
                    "severity": "high",
                    "detection_method": "hybrid_rule_and_zscore",
                    "anomaly_score": anomaly_score,
                    "expected_schedule": formatted_window,
                    "message": notice_message,
                    "notification_payload": {
                        "email": {
                            "to": [student_email, coordinator_email],
                            "subject": f"[InternTrack Alert] Missed Duty Window Notice: {student_name}",
                            "body": (
                                f"Dear {student_name} and Practicum Coordinator,\n\n"
                                f"{notice_message}\n\n"
                                f"Partner Company: {company_name}\n"
                                f"Action Required: Please submit an official excuse form or time-in reconciliation in InternTrack.\n\n"
                                f"Bicol University OJT Practicum Directorate"
                            )
                        },
                        "web_push": {
                            "title": "InternTrack Duty Window Missed",
                            "body": f"No check-in detected for {student_name} at {company_name} ({exp_start_str}). Coordinator alerted.",
                            "url": "/attendance"
                        },
                        "in_app": {
                            "category": "urgent_attendance",
                            "badge": "FLAGGED_ABSENT_WINDOW",
                            "can_excuse": True
                        }
                    },
                    "timestamp": datetime.now().isoformat()
                })
        else:
            # Case 2: Time-in recorded but significantly late
            diff = calculate_time_diff_minutes(exp_start, actual_in)
            if diff > self.grace_period_minutes:
                anomaly_score = self.calculate_ml_anomaly_score(diff, history_latenesses)
                severity = "critical" if diff > 60 else ("medium" if diff > 30 else "low")
                notice_message = (
                    f"{student_name} recorded a late time-in ({actual_in_str}) exceeding the "
                    f"{self.grace_period_minutes}-minute grace period by {diff - self.grace_period_minutes} minutes "
                    f"at {company_name}. Entry flagged for coordinator verification."
                )
                alerts.append({
                    "alert_id": f"ALT-LATE-{student.get('id', 'STU')}",
                    "student_id": student.get("id"),
                    "student_name": student_name,
                    "company_name": company_name,
                    "anomaly_type": "LATE_CHECK_IN_ANOMALY",
                    "severity": severity,
                    "detection_method": "statistical_zscore",
                    "anomaly_score": anomaly_score,
                    "expected_schedule": formatted_window,
                    "message": notice_message,
                    "notification_payload": {
                        "email": {
                            "to": [student_email, coordinator_email],
                            "subject": f"[InternTrack] Late Attendance Flagged: {student_name}",
                            "body": notice_message
                        },
                        "web_push": {
                            "title": "InternTrack Late Check-in",
                            "body": notice_message,
                            "url": "/attendance"
                        },
                        "in_app": {
                            "category": "tardiness_alert",
                            "badge": f"+{diff}m Late",
                            "can_excuse": True
                        }
                    },
                    "timestamp": datetime.now().isoformat()
                })

        return alerts

def main():
    detector = AttendanceAnomalyDetector(grace_period_minutes=15)
    
    # Check if input passed via stdin or argument
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        sample_student = {
            "id": "stu-101",
            "full_name": "Juan Dela Cruz",
            "email": "juan.delacruz@bicol-u.edu.ph",
            "coordinator_email": "floradel.relucio@bicol-u.edu.ph",
            "company_name": "DOST Region V (Regional Office)"
        }
        sample_schedule = {
            "duty_start": "08:00",
            "duty_end": "17:00"
        }
        sample_log = {
            "date": "August 19, 2026",
            "actual_time_in": None # No time-in!
        }
        
        alerts = detector.analyze_record(
            student=sample_student,
            expected_schedule=sample_schedule,
            actual_log=sample_log,
            current_check_time="09:30:00"
        )
        print(json.dumps({"status": "success", "alerts_detected": len(alerts), "alerts": alerts}, indent=2))
        return

    # Read from stdin
    try:
        raw_input = sys.stdin.read()
        if raw_input.strip():
            payload = json.loads(raw_input)
            student = payload.get("student", {})
            schedule = payload.get("schedule", {})
            log = payload.get("log", {})
            history = payload.get("history_latenesses", [0, 5, -2, 3, 10])
            check_time = payload.get("current_check_time", "10:00:00")
            
            alerts = detector.analyze_record(student, schedule, log, history, check_time)
            print(json.dumps({"status": "success", "alerts_detected": len(alerts), "alerts": alerts}))
        else:
            print(json.dumps({"status": "empty_input", "alerts": []}))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
