"""
Automated Training Recommendation Engine (ATRE)
Content-Based Filtering using TF-IDF + Cosine Similarity + Recency Scoring.

Input:  JSON with 'seminars' (list) and 'criteria_ratings' (dict)
Output: JSON with 'recommendations', 'risk_level', 'risk_actions', 'weak_areas'
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from sklearn.preprocessing import MinMaxScaler


def assess_risk(performance_areas: dict) -> tuple[str, list[str]]:
    """Determine employee risk level based on rating distribution."""
    failed_count = sum(1 for r in performance_areas.values() if int(r) == 1)
    needs_improvement_count = sum(1 for r in performance_areas.values() if int(r) == 2)

    if failed_count >= 3:
        return "CRITICAL", [
            "IMMEDIATE HR INTERVENTION REQUIRED",
            "Schedule performance improvement plan meeting",
            "Probation consideration recommended",
        ]
    elif failed_count >= 1:
        return "HIGH", [
            "Close monitoring required",
            "Mandatory training within 30 days",
            "Weekly progress tracking",
        ]
    elif needs_improvement_count >= 4:
        return "MEDIUM", [
            "Development plan recommended",
            "Target improvement areas",
        ]
    return "LOW", []


def recommend(payload: dict) -> dict:
    """Generate training recommendations based on criteria ratings and available seminars."""
    seminars = payload.get("seminars", [])
    criteria_ratings = payload.get("criteria_ratings", {})

    # --- Edge cases ---
    if not criteria_ratings:
        return {
            "recommendations": [],
            "risk_level": "NONE",
            "risk_actions": [],
            "weak_areas": [],
        }

    if not seminars:
        risk_level, risk_actions = assess_risk(criteria_ratings)
        weak = _identify_weak_areas(criteria_ratings)
        return {
            "recommendations": [],
            "risk_level": risk_level,
            "risk_actions": risk_actions,
            "weak_areas": weak,
        }

    # --- Identify weak performance areas ---
    failed_areas = {
        area: int(rating)
        for area, rating in criteria_ratings.items()
        if int(rating) == 1
    }
    needs_improvement_areas = {
        area: int(rating)
        for area, rating in criteria_ratings.items()
        if int(rating) == 2
    }

    all_low_areas = {**failed_areas, **needs_improvement_areas}

    if not all_low_areas:
        return {
            "recommendations": [],
            "risk_level": "LOW",
            "risk_actions": [],
            "weak_areas": [],
        }

    # --- Build DataFrame from seminars ---
    df = pd.DataFrame(seminars)

    # Combined features for TF-IDF: title + description
    df["features"] = (
        df["title"].fillna("") + " " + df["description"].fillna("")
    )

    # --- TF-IDF Vectorization ---
    tfidf = TfidfVectorizer(
        stop_words="english", ngram_range=(1, 2), max_features=5000
    )
    tfidf_matrix = tfidf.fit_transform(df["features"])
    cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix)

    # --- Recency scoring ---
    try:
        df["date_parsed"] = pd.to_datetime(df["date"], errors="coerce")
        df["date_numeric"] = df["date_parsed"].astype(np.int64)
        scaler = MinMaxScaler()
        df["recency_norm"] = scaler.fit_transform(df[["date_numeric"]])
    except Exception:
        df["recency_norm"] = 0.5  # fallback if dates fail

    # --- Build area-to-seminar index (case-insensitive) ---
    area_index: dict[str, list[int]] = {}
    for idx, row in df.iterrows():
        area = str(row.get("target_performance_area", "")).strip().lower()
        if area:
            area_index.setdefault(area, []).append(idx)

    # --- Generate recommendations per weak area ---
    all_recs: list[dict] = []

    for area_name, rating in all_low_areas.items():
        priority_weight = 1.5 if rating == 1 else 1.0
        priority_label = "HIGH" if rating == 1 else "MEDIUM"
        area_key = area_name.strip().lower()

        matching_indices = area_index.get(area_key, [])
        if not matching_indices:
            continue

        for src_idx in matching_indices:
            sim_scores = cosine_sim[src_idx]
            for tgt_idx in matching_indices:
                sim = float(sim_scores[tgt_idx])
                recency = float(df.at[tgt_idx, "recency_norm"])
                final_score = (0.7 * sim * priority_weight) + (0.3 * recency)

                row = df.iloc[tgt_idx]
                all_recs.append({
                    "seminar_id": int(row.get("id", 0)),
                    "title": str(row.get("title", "")),
                    "description": str(row.get("description", "")),
                    "location": str(row.get("location", "")),
                    "time": str(row.get("time", "")),
                    "speaker": str(row.get("speaker", "")),
                    "target_performance_area": str(
                        row.get("target_performance_area", "")
                    ),
                    "date": str(row.get("date", "")),
                    "score": round(final_score, 4),
                    "priority": priority_label,
                    "matched_area": area_name,
                })

    # --- Deduplicate by seminar_id, keep highest score ---
    seen: dict[int, dict] = {}
    for rec in sorted(all_recs, key=lambda x: x["score"], reverse=True):
        sid = rec["seminar_id"]
        if sid not in seen:
            seen[sid] = rec

    recommendations = sorted(seen.values(), key=lambda x: x["score"], reverse=True)

    # --- Risk assessment ---
    risk_level, risk_actions = assess_risk(criteria_ratings)
    weak_areas = _identify_weak_areas(criteria_ratings)

    return {
        "recommendations": recommendations,
        "risk_level": risk_level,
        "risk_actions": risk_actions,
        "weak_areas": weak_areas,
    }


def _identify_weak_areas(criteria_ratings: dict) -> list[dict]:
    """Build weak areas list with severity labels."""
    weak = []
    for area, rating in criteria_ratings.items():
        r = int(rating)
        if r <= 2:
            weak.append({
                "area": area,
                "rating": r,
                "severity": "CRITICAL" if r == 1 else "IMPROVEMENT",
            })
    return weak
