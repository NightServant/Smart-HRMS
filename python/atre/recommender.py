"""
Automated Training Recommendation Engine (ATRE)

Recommends training suggestions from the structured IPCR form payload.
The engine now looks at Administrative Office sections/rows and matches
them against seminar focus areas instead of the retired criteria_ratings map.
"""

from __future__ import annotations

from typing import Any


SEMESTRAL_PASSING_SCORE = 3.0
ATTENTION_SCORE = 3.5


def recommend(payload: dict[str, Any]) -> dict[str, Any]:
    seminars = payload.get("seminars", []) or []
    form_payload = payload.get("form_payload", {}) or {}

    weak_areas = identify_weak_areas(form_payload)

    if not weak_areas:
        return {
            "recommendations": [],
            "risk_level": "LOW",
            "risk_actions": [],
            "weak_areas": [],
        }

    recommendations = build_recommendations(seminars, weak_areas)
    risk_level, risk_actions = assess_risk(weak_areas)

    return {
        "recommendations": recommendations,
        "risk_level": risk_level,
        "risk_actions": risk_actions,
        "weak_areas": weak_areas,
    }


def identify_weak_areas(form_payload: dict[str, Any]) -> list[dict[str, Any]]:
    weak_areas: list[dict[str, Any]] = []

    for section in form_payload.get("sections", []) or []:
        section_title = str(section.get("title", "")).strip()

        for row in section.get("rows", []) or []:
            average = normalize_score(row.get("average"))

            if average is None or average >= ATTENTION_SCORE:
                continue

            severity = "CRITICAL" if average < SEMESTRAL_PASSING_SCORE else "IMPROVEMENT"
            weak_areas.append({
                "area": section_title or str(row.get("target", "Administrative Services")),
                "criterion": str(row.get("target", "")).strip(),
                "rating": round(average, 2),
                "severity": severity,
            })

    weak_areas.sort(key=lambda area: area["rating"])

    return weak_areas


def build_recommendations(seminars: list[dict[str, Any]], weak_areas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    recommendations: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for weak_area in weak_areas:
        area_text = normalize_text(weak_area["area"])
        criterion_text = normalize_text(weak_area["criterion"])

        for seminar in seminars:
            seminar_id = int(seminar.get("id", 0))
            target_area = normalize_text(seminar.get("target_performance_area", ""))
            description = normalize_text(seminar.get("description", ""))

            score = match_score(area_text, criterion_text, target_area, description)
            if score <= 0:
                continue

            severity_weight = 1.4 if weak_area["severity"] == "CRITICAL" else 1.0
            final_score = round(score * severity_weight, 4)

            recommendations.append({
                "seminar_id": seminar_id,
                "description": str(seminar.get("description", "")),
                "target_performance_area": str(seminar.get("target_performance_area", "")),
                "score": final_score,
                "priority": "HIGH" if weak_area["severity"] == "CRITICAL" else "MEDIUM",
                "matched_area": weak_area["area"],
            })

    recommendations.sort(key=lambda item: item["score"], reverse=True)

    deduped: list[dict[str, Any]] = []
    for recommendation in recommendations:
        seminar_id = int(recommendation["seminar_id"])

        if seminar_id in seen_ids:
            continue

        seen_ids.add(seminar_id)
        deduped.append(recommendation)

    return deduped[:8]


def assess_risk(weak_areas: list[dict[str, Any]]) -> tuple[str, list[str]]:
    critical_count = sum(1 for area in weak_areas if area["severity"] == "CRITICAL")

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

    return "MEDIUM", [
        "Recommend focused seminars for the lowest-rated service areas.",
        "Monitor improvement during the next evaluation cycle.",
    ]


def match_score(area_text: str, criterion_text: str, target_area: str, description: str) -> float:
    searchable_text = f"{target_area} {description}"
    score = 0.0

    if area_text and area_text in searchable_text:
        score += 1.0

    if criterion_text and criterion_text in searchable_text:
        score += 1.0

    for token in tokenize(area_text) | tokenize(criterion_text):
        if token and token in searchable_text:
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
