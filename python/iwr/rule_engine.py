# =============================================================================
# rule_engine.py
# SHRMS — Intelligent Workflow Routing
# Task 2 of 7 — Rule-Based Workflow (Layer 1)
#
# WHAT THIS FILE IS:
#   Layer 1 of the Intelligent Workflow Routing system.
#   Implements the Rule-Based Workflow using forward-chaining rule evaluation.
#
# HOW IT WORKS (Forward Chaining):
#   1. A fact (the submitted form fields) is evaluated against all rules
#   2. Each rule checks a single condition (alpha-style matching)
#   3. The first rule whose condition is satisfied fires immediately
#      (forward chaining — from known facts toward a conclusion)
#   4. A fired rule returns its verdict as the compliance result
#   5. If no rule fires, the document is compliant
#
#   IF a document passes ALL rules → result is "compliant"
#   IF a document fails ANY rule   → result contains the violation reason
#
# MAPS TO workflow.png:
#   Leave path      → "Leave management table"
#   Evaluation path → "Check Employee ID and assigned evaluator"
# =============================================================================

from datetime import date

from org_and_rules import EMPLOYEES, LEAVE_RULES, IPCR_PASSING_SCORE, IPCR_EVALUATOR_ID


class RuleEngine:

    # =========================================================================
    # LEAVE APPLICATION — Compliance Check
    # =========================================================================

    def check_leave(self, application: dict) -> tuple:
        """
        Checks a leave application against Civil Service rules.

        Parameters:
            application (dict):
                employee_id             (str)  — e.g. "EMP-005"
                leave_type              (str)  — e.g. "vacation_leave"
                days_requested          (int)  — e.g. 3
                start_date              (date) — e.g. date(2025, 9, 1)
                has_medical_certificate  (bool) — True or False
                has_solo_parent_id       (bool) — True or False
                has_marriage_certificate (bool) — True or False

        Returns:
            (True,  "Compliant")      — all rules passed, proceed to Decision Tree
            (False, "<reason text>")  — a rule failed, return document to employee
        """

        # Extract every field from the submitted form
        employee_id  = application.get("employee_id")
        leave_type   = application.get("leave_type")
        days_req     = application.get("days_requested", 0)
        start_date   = application.get("start_date", date.today())

        # ------------------------------------------------------------------
        # RULE 1: Employee must exist in the org chart
        # IF employee_id not in EMPLOYEES THEN return
        # ------------------------------------------------------------------
        if employee_id not in EMPLOYEES:
            return False, f"Employee ID '{employee_id}' does not exist in the system."

        # ------------------------------------------------------------------
        # RULE 2: Leave type must be a recognized CSC leave category
        # IF leave_type not in LEAVE_RULES THEN return
        # ------------------------------------------------------------------
        rule = LEAVE_RULES.get(leave_type)
        if rule is None:
            return False, f"'{leave_type}' is not a recognized leave type."

        # ------------------------------------------------------------------
        # RULE 3: Days requested must be at least 1
        # IF days_requested < 1 THEN return
        # ------------------------------------------------------------------
        if days_req < 1:
            return False, "Days requested must be at least 1."

        # ------------------------------------------------------------------
        # RULE 4: Fixed-entitlement leaves cannot exceed their annual cap
        # Covers: maternity (105), paternity (7), solo parent (7),
        #         force (5), special privilege (3), wellness (5),
        #         special sick leave for women (90)
        # IF leave_type has a fixed cap
        # AND days_requested > max_days THEN return
        # ------------------------------------------------------------------
        max_days = rule.get("max_days_per_year") or rule.get("max_days")
        if max_days is not None:
            if days_req > max_days:
                label = leave_type.replace("_", " ").title()
                return False, (
                    f"Days requested ({days_req}) exceeds the maximum allowed "
                    f"({max_days}) for {label}."
                )

        # ------------------------------------------------------------------
        # RULE 6: Advance notice — applies to any leave type that has
        #         min_days_advance_notice defined in the Knowledge Base.
        # Covered types: vacation (5d), force (5d), special privilege (5d),
        #   wellness (5d), maternity (30d), paternity (30d),
        #   special sick leave for women (5d).
        # IF min_days_advance_notice is set
        # AND days_until_start < min_notice THEN return
        # ------------------------------------------------------------------
        min_notice = rule.get("min_days_advance_notice")
        if min_notice is not None:
            days_until_start = (start_date - date.today()).days
            leave_type_label = leave_type.replace("_", " ").title()
            if days_until_start < min_notice:
                return False, (
                    f"{leave_type_label} must be filed at least {min_notice} day(s) "
                    f"in advance. You filed only {days_until_start} day(s) before."
                )

        # ------------------------------------------------------------------
        # RULE 7: Sick leave exceeding 6 days requires a medical certificate
        # IF leave_type == sick_leave
        # AND days_requested > 6
        # AND has_medical_certificate == False THEN return
        # ------------------------------------------------------------------
        if leave_type == "sick_leave":
            cert_threshold = rule["medical_cert_required_after"]   # 6 days
            has_cert = application.get("has_medical_certificate", False)

            if days_req > cert_threshold and not has_cert:
                return False, (
                    f"Sick leave exceeding {cert_threshold} days "
                    f"requires a medical certificate."
                )

        # ------------------------------------------------------------------
        # RULE 8: Solo Parent Leave requires a Solo Parent ID card
        # IF leave_type == solo_parent_leave
        # AND has_solo_parent_id == False THEN return
        # ------------------------------------------------------------------
        if leave_type == "solo_parent_leave":
            has_id = application.get("has_solo_parent_id", False)
            if not has_id:
                return False, "Solo Parent Leave requires a valid Solo Parent ID card."

        # ------------------------------------------------------------------
        # RULE 9: Paternity Leave requires a Marriage Certificate
        # IF leave_type == paternity_leave
        # AND has_marriage_certificate == False THEN return
        # ------------------------------------------------------------------
        if leave_type == "paternity_leave":
            has_cert = application.get("has_marriage_certificate", False)
            if not has_cert:
                return False, "Paternity Leave requires a valid Marriage Certificate."

        # ------------------------------------------------------------------
        # RULE 10: Special Sick Leave for Women requires a medical certificate
        # IF leave_type == special_sick_leave_for_women
        # AND has_medical_certificate == False THEN return
        # ------------------------------------------------------------------
        if leave_type == "special_sick_leave_for_women":
            has_cert = application.get("has_medical_certificate", False)
            if not has_cert:
                return False, (
                    "Special Sick Leave for Women requires a medical certificate."
                )

        # ------------------------------------------------------------------
        # All rules passed — document is compliant
        # ------------------------------------------------------------------
        return True, "Compliant"


    # =========================================================================
    # IPCR FORM — Compliance Check + Evaluator Assignment
    # Maps to workflow.png: Evaluation path →
    #   "Check Employee ID and assigned evaluator (Supervisor ID)"
    #
    # WHY THE RULE ENGINE OWNS EVALUATOR ASSIGNMENT:
    #   In an LGU setting, CSC IPCR guidelines explicitly require that the
    #   rater must be the employee's immediate supervisor. This is a rule —
    #   not just a data lookup. The Rule Engine enforces it and returns the
    #   assigned evaluator as part of the compliance result.
    # =========================================================================

    def check_ipcr(self, form: dict) -> tuple:
        """
        Validates an IPCR form and assigns the evaluator per CSC rules
        using forward-chaining rule evaluation.

        Returns:
            (True,  "Compliant",     evaluator_dict) — valid, evaluator assigned
            (False, "<reason text>", None)           — invalid, return to submitter
        """

        # Extract fields
        employee_id = form.get("employee_id", "")
        is_first    = form.get("is_first_submission", True)
        rating      = form.get("performance_rating")

        # Pre-compute derived values
        employee      = EMPLOYEES.get(employee_id)
        supervisor_id = employee["supervisor_id"] if employee else None

        # IPCR_EVALUATOR_ID override (Option B):
        #   None      → use the employee's own immediate supervisor (standard CSC rule)
        #   "EMP-001" → override to Department Head for small-office exception
        evaluator_id = IPCR_EVALUATOR_ID if IPCR_EVALUATOR_ID else supervisor_id
        supervisor   = EMPLOYEES.get(evaluator_id) if evaluator_id else None

        evaluator = None
        if supervisor:
            evaluator = {
                "employee_id": evaluator_id,
                "name":        supervisor["name"],
                "role":        supervisor["role"],
            }

        employee_name = employee["name"] if employee else ""

        # ------------------------------------------------------------------
        # RULE 1: Employee must exist in the org chart
        # ------------------------------------------------------------------
        if employee is None:
            return (
                False,
                f"Employee ID '{employee_id}' does not exist in the system.",
                None
            )

        # ------------------------------------------------------------------
        # RULE 2: CSC IPCR Rule — employee must have an immediate supervisor
        # ------------------------------------------------------------------
        if supervisor_id is None:
            return (
                False,
                f"{employee_name} is the Department Head and cannot "
                f"be evaluated through this system.",
                None
            )

        # ------------------------------------------------------------------
        # RULE 3: The assigned supervisor must exist in the system
        # ------------------------------------------------------------------
        if supervisor is None:
            return (
                False,
                f"Assigned evaluator (ID: {supervisor_id}) for "
                f"{employee_name} was not found in the system.",
                None
            )

        # ------------------------------------------------------------------
        # RULE 4a: Returning form — rating is missing
        # ------------------------------------------------------------------
        if not is_first and rating is None:
            return (
                False,
                "Performance rating is missing on the returning form.",
                None
            )

        # ------------------------------------------------------------------
        # RULE 4b: Returning form — rating is out of valid range
        # ------------------------------------------------------------------
        if not is_first and rating is not None and not (1.0 <= rating <= 5.0):
            return (
                False,
                f"Performance rating {rating} is invalid. "
                f"Must be between 1.0 and 5.0.",
                None
            )

        # ------------------------------------------------------------------
        # All rules passed — document is compliant
        # ------------------------------------------------------------------
        return True, "Compliant", evaluator
