"""
Automated Training Recommendation Engine (ATRE)

Recommends training seminars from the structured IPCR form payload using
content-based filtering aligned to the IPCR 1–5 rating scale.

Rating-tier mapping:
  average rounds to 1 or 2  →  tier '1-2'  — Remedial / foundational (immediate)
  average rounds to 3 or 4  →  tier '3-4'  — Proficiency enhancement  (improvement)
  average rounds to 5        →  tier '5'    — Mastery / leadership      (maintenance)

Each row in the IPCR form receives recommendations exclusively from the
seminar pool that matches its computed rating tier, then filtered further
by content similarity against the criterion text.
"""

from __future__ import annotations

from typing import Any


SEMESTRAL_PASSING_SCORE = 3.0   # below this → CRITICAL
TIER_MASTERY_THRESHOLD = 4.5    # at or above this → tier '5' (maintenance)
TIER_REMEDIAL_THRESHOLD = 2.5   # below this → tier '1-2' (immediate)


def recommend(payload: dict[str, Any]) -> dict[str, Any]:
    seminars = payload.get("seminars", []) or []
    form_payload = payload.get("form_payload", {}) or {}

    areas = identify_areas(form_payload)

    if not areas:
        return {
            "recommendations": [],
            "risk_level": "LOW",
            "risk_actions": [],
            "weak_areas": [],
        }

    recommendations = build_recommendations(seminars, areas)
    risk_level, risk_actions = assess_risk(areas)

    return {
        "recommendations": recommendations,
        "risk_level": risk_level,
        "risk_actions": risk_actions,
        "weak_areas": [a for a in areas if a["severity"] != "MAINTENANCE"],
    }


def identify_areas(form_payload: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Collect every rated row and assign its rating tier and severity.

    All rows are included so that even high performers receive maintenance-level
    recommendations. Low-rated rows are sorted first so they receive priority
    in the recommendation list.
    """
    areas: list[dict[str, Any]] = []

    for section in form_payload.get("sections", []) or []:
        section_title = str(section.get("title", "")).strip()

        for row in section.get("rows", []) or []:
            average = normalize_score(row.get("average"))

            if average is None:
                continue

            tier = rating_tier(average)
            severity = resolve_severity(average, tier)

            areas.append({
                "area": section_title or "Administrative Services",
                "criterion": str(row.get("target", "")).strip(),
                "rating": round(average, 2),
                "severity": severity,
                "rating_tier": tier,
            })

    # Sort so lowest-rated (most critical) areas appear first
    areas.sort(key=lambda a: a["rating"])

    return areas


def build_recommendations(
    seminars: list[dict[str, Any]],
    areas: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    For each rated area, select matching seminars from the corresponding
    rating tier, scored by content similarity to the criterion text.
    """
    scored: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for area in areas:
        tier = area["rating_tier"]
        tier_pool = [s for s in seminars if s.get("rating_tier") == tier]

        area_text = normalize_text(area["area"])
        criterion_text = normalize_text(area["criterion"])

        for seminar in tier_pool:
            seminar_id = int(seminar.get("id", 0))
            target_area = normalize_text(seminar.get("target_performance_area", ""))
            description = normalize_text(seminar.get("description", ""))

            score = match_score(area_text, criterion_text, target_area, description)
            if score <= 0:
                continue

            # Critical areas get a scoring boost so they surface first
            severity_weight = 1.4 if area["severity"] == "CRITICAL" else 1.0
            final_score = round(score * severity_weight, 4)

            scored.append({
                "seminar_id": seminar_id,
                "title": str(seminar.get("title", "")),
                "description": str(seminar.get("description", "")),
                "target_performance_area": str(seminar.get("target_performance_area", "")),
                "rating_tier": tier,
                "score": final_score,
                "priority": resolve_priority(area["severity"]),
                "matched_area": area["area"],
            })

    scored.sort(key=lambda item: item["score"], reverse=True)

    deduped: list[dict[str, Any]] = []
    for item in scored:
        if item["seminar_id"] not in seen_ids:
            seen_ids.add(item["seminar_id"])
            deduped.append(item)

    return deduped[:8]


def assess_risk(areas: list[dict[str, Any]]) -> tuple[str, list[str]]:
    critical_count = sum(1 for a in areas if a["severity"] == "CRITICAL")

    if critical_count >= 3:
        return "CRITICAL", [
            "Immediate HR coaching is recommended.",
            "Prioritize capability-building for the lowest-rated Administrative Services areas.",
            "Track progress before the next semester closes.",
        ]

    if critical_count >= 1:
        return "HIGH", [
            "Assign targeted seminars and require progress tracking.",
            "Coordinate with the evaluator for a short improvement plan.",
        ]

    improvement_count = sum(1 for a in areas if a["severity"] == "IMPROVEMENT")
    if improvement_count >= 1:
        return "MEDIUM", [
            "Recommend focused seminars for areas needing proficiency enhancement.",
            "Monitor improvement during the next evaluation cycle.",
        ]

    return "LOW", [
        "Performance is at mastery level. Recommend leadership and sustainability seminars.",
    ]


def rating_tier(average: float) -> str:
    """Map a float average to the IPCR 1-5 rating tier bucket."""
    if average < TIER_REMEDIAL_THRESHOLD:
        return "1-2"
    if average < TIER_MASTERY_THRESHOLD:
        return "3-4"
    return "5"


def resolve_severity(average: float, tier: str) -> str:
    if tier == "5":
        return "MAINTENANCE"
    if average < SEMESTRAL_PASSING_SCORE:
        return "CRITICAL"
    return "IMPROVEMENT"


def resolve_priority(severity: str) -> str:
    if severity == "CRITICAL":
        return "HIGH"
    if severity == "MAINTENANCE":
        return "LOW"
    return "MEDIUM"


def match_score(
    area_text: str,
    criterion_text: str,
    target_area: str,
    description: str,
) -> float:
    searchable = f"{target_area} {description}"
    score = 0.0

    if area_text and area_text in searchable:
        score += 1.0

    if criterion_text and criterion_text in searchable:
        score += 2.0  # criterion match is stronger signal

    for token in tokenize(area_text) | tokenize(criterion_text):
        if token and token in searchable:
            score += 0.15

    return score


def normalize_score(value: Any) -> float | None:
    if value in (None, ""):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").lower().split())


def tokenize(value: str) -> set[str]:
    return {token for token in value.split(" ") if len(token) > 3}
