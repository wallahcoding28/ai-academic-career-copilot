"""
Skill Gap Service Layer
Stage 3: Role benchmark evaluation, strict 3-state matching (Direct, Adjacent, Missing),
weighted coverage computation, SQLite persistence, and dual-engine fallback.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from app.models.db import get_db
from app.services.ai_service import ai_service
from app.services.resume_service import ResumeService
from app.services.role_benchmarks import (
    CURATED_RECOMMENDATIONS,
    DEFAULT_RECOMMENDATION,
    ROLE_BENCHMARK_PROFILES,
    SKILL_SYNONYMS,
)

logger = logging.getLogger(__name__)

BENCHMARK_NOTICE = (
    "Evaluated against application-defined reference profiles (65% core / 35% complementary weighting). "
    "This benchmark serves as a curated academic baseline and is not an exhaustive guarantee of individual employer requirements."
)


class SkillService:
    """Business logic for evaluating student skills against target role benchmarks."""

    @staticmethod
    def get_available_roles() -> List[Dict[str, Any]]:
        """Returns all configured target role benchmarks and their competency metadata."""
        roles = []
        for role_name, data in ROLE_BENCHMARK_PROFILES.items():
            roles.append({
                "id": role_name.lower().replace(" ", "-").replace("/", "-"),
                "title": data["title"],
                "description": data["description"],
                "core_skills_count": len(data["core_skills"]),
                "complementary_skills_count": len(data["complementary_skills"]),
                "categories": list(dict.fromkeys(data["categories"].values())),
            })
        return roles

    @staticmethod
    def get_role_benchmark(role: str) -> Dict[str, Any]:
        """Fetches standard skill requirements and category mappings for a role."""
        if role in ROLE_BENCHMARK_PROFILES:
            return ROLE_BENCHMARK_PROFILES[role]
        raise ValueError(f"Unknown target role '{role}'. Supported benchmarks: {list(ROLE_BENCHMARK_PROFILES.keys())}")

    @classmethod
    def extract_skills_from_text(cls, text: str) -> List[str]:
        """
        Scans document text with word-boundary regexes against known tech terms and aliases.
        Returns a sorted, unique list of canonical skill names found in the text.
        """
        text_lower = text.lower()
        detected: Set[str] = set()

        for alias, canonical in SKILL_SYNONYMS.items():
            pattern = r"\b" + re.escape(alias) + r"\b"
            if re.search(pattern, text_lower):
                detected.add(canonical)

        return sorted(list(detected))

    @classmethod
    def evaluate_skill_gap(
        cls,
        target_role: str,
        resume_id: Optional[int] = None,
        file_bytes: Optional[bytes] = None,
        filename: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates a candidate profile against target role benchmark.
        Accepts either an existing resume_id (reuse flow) or fresh file upload.
        Executes Gemini if available; otherwise uses deterministic fallback engine.
        Persists results into SQLite skill_evaluations table.
        """
        benchmark = cls.get_role_benchmark(target_role)
        target_role = benchmark["title"]

        resume_filename = "Uploaded Resume"
        resume_text = ""
        candidate_skills: List[str] = []
        source_type = "resume_reuse"

        # 1. Flow A: Reuse existing analyzed resume
        if resume_id:
            source_type = "resume_reuse"
            try:
                db = get_db()
                cursor = db.cursor()
                if user_id is not None:
                    cursor.execute(
                        "SELECT id, filename, raw_text, extracted_skills FROM resumes WHERE id = ? AND user_id = ?;",
                        (resume_id, user_id),
                    )
                else:
                    cursor.execute(
                        "SELECT id, filename, raw_text, extracted_skills FROM resumes WHERE id = ? AND user_id IS NULL;",
                        (resume_id,),
                    )
                row = cursor.fetchone()
                if row:
                    resume_filename = row["filename"] or f"resume_{resume_id}.pdf"
                    resume_text = row["raw_text"] or ""
                    if row["extracted_skills"]:
                        try:
                            candidate_skills = json.loads(row["extracted_skills"])
                        except Exception:
                            candidate_skills = []
                else:
                    raise ValueError(f"Resume ID {resume_id} not found in database history for the current user.")
            except Exception as e:
                logger.error(f"Error fetching resume {resume_id}: {e}")
                if "not found" in str(e).lower():
                    raise

        # 2. Flow B: Fresh resume upload
        elif file_bytes and filename:
            source_type = "resume_upload"
            resume_filename = filename
            resume_text = ResumeService.parse_document(file_bytes, filename)
            candidate_skills = cls.extract_skills_from_text(resume_text)

        else:
            raise ValueError("Please provide an existing resume_id or upload a resume file.")

        # Ensure candidate skills are comprehensively extracted from resume text
        if resume_text:
            text_skills = cls.extract_skills_from_text(resume_text)
            candidate_skills = list(dict.fromkeys(candidate_skills + text_skills))

        analysis_mode = "deterministic_benchmark"
        eval_result: Dict[str, Any] = {}

        # 3. Attempt Gemini evaluation if configured
        if ai_service.is_configured():
            try:
                gemini_output = ai_service.evaluate_skill_gap_prompt(
                    candidate_skills=candidate_skills,
                    target_role=target_role,
                    role_benchmark=benchmark,
                    resume_text=resume_text,
                )
                if isinstance(gemini_output, dict) and "metrics" in gemini_output:
                    eval_result = gemini_output
                    analysis_mode = "gemini_ai"
            except Exception as e:
                logger.warning(f"Gemini skill evaluation failed; falling back to deterministic engine: {e}")

        # 4. Fallback to deterministic rule-based evaluation if Gemini unconfigured or failed
        if not eval_result:
            eval_result = cls._evaluate_deterministic_gap(
                candidate_skills=candidate_skills,
                target_role=target_role,
                benchmark=benchmark,
                resume_text=resume_text,
            )
            analysis_mode = "deterministic_benchmark"

        metrics = eval_result.get("metrics", {})
        skills_data = eval_result.get("skills", {})
        recommendations = eval_result.get("recommendations", [])

        overall_cov = float(metrics.get("overall_coverage", 0.0))
        core_cov = float(metrics.get("core_coverage", 0.0))
        comp_cov = float(metrics.get("complementary_coverage", 0.0))

        direct_matches = skills_data.get("direct_matches", [])
        adjacent_skills = skills_data.get("adjacent_skills", [])
        missing_skills = skills_data.get("missing_skills", [])

        # 5. Persist evaluation into SQLite skill_evaluations table
        evaluation_record_id = None
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO skill_evaluations (
                    user_id, resume_id, source_type, target_role,
                    current_skills, matched_skills, adjacent_skills, missing_skills,
                    match_percentage, core_coverage, complementary_coverage,
                    analysis_mode, recommendations_json, detailed_results_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    user_id,
                    resume_id,
                    source_type,
                    target_role,
                    json.dumps(candidate_skills),
                    json.dumps(direct_matches),
                    json.dumps(adjacent_skills),
                    json.dumps(missing_skills),
                    overall_cov,
                    core_cov,
                    comp_cov,
                    analysis_mode,
                    json.dumps(recommendations),
                    json.dumps(eval_result),
                ),
            )
            db.commit()
            evaluation_record_id = cursor.lastrowid
        except Exception as e:
            logger.error(f"Failed to persist skill evaluation to SQLite: {e}")

        # 6. Return standardized response payload
        return {
            "id": evaluation_record_id,
            "target_role": target_role,
            "analysis_mode": analysis_mode,
            "source_type": source_type,
            "resume_id": resume_id,
            "resume_filename": resume_filename,
            "metrics": metrics,
            "skills": skills_data,
            "recommendations": recommendations,
            "benchmark_notice": BENCHMARK_NOTICE,
        }

    @classmethod
    def _evaluate_deterministic_gap(
        cls,
        candidate_skills: List[str],
        target_role: str,
        benchmark: Dict[str, Any],
        resume_text: str = "",
    ) -> Dict[str, Any]:
        """
        Deterministic, offline-reliable skill gap computation.
        Implements strict 3-state categorization (Direct Match, Related/Adjacent, Missing)
        and mathematical application-defined 65/35 weighting.
        """
        core_skills: List[str] = benchmark["core_skills"]
        comp_skills: List[str] = benchmark["complementary_skills"]
        categories: Dict[str, str] = benchmark["categories"]
        adjacencies: Dict[str, Dict[str, Any]] = benchmark.get("skill_adjacencies", {})

        # Normalize candidate skills
        candidate_set: Set[str] = set()
        for s in candidate_skills:
            norm = SKILL_SYNONYMS.get(s.lower(), s)
            candidate_set.add(norm)

        # Also scan raw text if available for direct matches
        if resume_text:
            text_lower = resume_text.lower()
            for s in core_skills + comp_skills:
                pattern = r"\b" + re.escape(s.lower()) + r"\b"
                if re.search(pattern, text_lower):
                    candidate_set.add(s)

        direct_matches: List[Dict[str, str]] = []
        adjacent_skills: List[Dict[str, str]] = []
        missing_skills: List[Dict[str, str]] = []

        direct_core_count = 0
        direct_comp_count = 0
        adjacent_core_count = 0
        adjacent_comp_count = 0

        # Evaluate Core Skills
        for skill in core_skills:
            category = categories.get(skill, "Core Fundamentals")
            if skill in candidate_set:
                direct_matches.append({
                    "name": skill,
                    "tier": "core",
                    "category": category,
                    "evidence": skill,
                })
                direct_core_count += 1
            elif skill in adjacencies and any(p in candidate_set for p in adjacencies[skill]["prerequisites"]):
                # Found adjacent foundation, but NOT direct match
                matching_prereq = [p for p in adjacencies[skill]["prerequisites"] if p in candidate_set][0]
                adjacent_skills.append({
                    "target_skill": skill,
                    "candidate_skill": matching_prereq,
                    "tier": "core",
                    "category": category,
                    "rationale": adjacencies[skill]["rationale"],
                })
                adjacent_core_count += 1
            else:
                missing_skills.append({
                    "name": skill,
                    "tier": "core",
                    "priority": "High",
                    "category": category,
                    "impact": f"Essential core competency expected for {target_role} baseline qualification.",
                })

        # Evaluate Complementary Skills
        for skill in comp_skills:
            category = categories.get(skill, "Complementary")
            if skill in candidate_set:
                direct_matches.append({
                    "name": skill,
                    "tier": "complementary",
                    "category": category,
                    "evidence": skill,
                })
                direct_comp_count += 1
            elif skill in adjacencies and any(p in candidate_set for p in adjacencies[skill]["prerequisites"]):
                matching_prereq = [p for p in adjacencies[skill]["prerequisites"] if p in candidate_set][0]
                adjacent_skills.append({
                    "target_skill": skill,
                    "candidate_skill": matching_prereq,
                    "tier": "complementary",
                    "category": category,
                    "rationale": adjacencies[skill]["rationale"],
                })
                adjacent_comp_count += 1
            else:
                missing_skills.append({
                    "name": skill,
                    "tier": "complementary",
                    "priority": "Medium",
                    "category": category,
                    "impact": f"Differentiating toolchain skill strengthening candidate profile for {target_role}.",
                })

        # Calculate Coverage Metrics
        total_core = max(len(core_skills), 1)
        total_comp = max(len(comp_skills), 1)
        total_benchmark = len(core_skills) + len(comp_skills)

        # Core coverage: Direct (100%) + Adjacent (50%)
        core_coverage = round(((direct_core_count + (0.5 * adjacent_core_count)) / total_core) * 100, 1)
        comp_coverage = round(((direct_comp_count + (0.5 * adjacent_comp_count)) / total_comp) * 100, 1)

        # Overall: 65% Core weight + 35% Complementary weight
        overall_coverage = round((0.65 * core_coverage) + (0.35 * comp_coverage), 1)
        overall_coverage = max(0.0, min(100.0, overall_coverage))

        # Generate Actionable Learning Recommendations
        # Prioritize missing core skills, then adjacent core skills, then complementary skills
        recommendations: List[Dict[str, str]] = []
        actionable_skills = [
            (m["name"], m["priority"]) for m in missing_skills if m["priority"] == "High"
        ] + [
            (a["target_skill"], "High" if a["tier"] == "core" else "Medium") for a in adjacent_skills
        ] + [
            (m["name"], m["priority"]) for m in missing_skills if m["priority"] != "High"
        ]

        seen_rec_skills: Set[str] = set()
        for skill_name, priority in actionable_skills:
            if skill_name in seen_rec_skills:
                continue
            seen_rec_skills.add(skill_name)

            rec_data = CURATED_RECOMMENDATIONS.get(skill_name, DEFAULT_RECOMMENDATION)
            recommendations.append({
                "skill": skill_name,
                "priority": priority,
                "why_it_matters": rec_data["why_it_matters"],
                "learning_direction": rec_data["learning_direction"],
                "project_idea": rec_data["project_idea"],
            })

            if len(recommendations) >= 4:
                break

        return {
            "metrics": {
                "overall_coverage": overall_coverage,
                "core_coverage": core_coverage,
                "complementary_coverage": comp_coverage,
                "total_benchmark_skills": total_benchmark,
                "direct_match_count": len(direct_matches),
                "adjacent_match_count": len(adjacent_skills),
                "missing_count": len(missing_skills),
            },
            "skills": {
                "direct_matches": direct_matches,
                "adjacent_skills": adjacent_skills,
                "missing_skills": missing_skills,
            },
            "recommendations": recommendations,
            "benchmark_notice": BENCHMARK_NOTICE,
        }

    @staticmethod
    def get_skill_history(limit: int = 10, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieves recent skill gap evaluations from SQLite, filtered by user_id if authenticated."""
        try:
            db = get_db()
            cursor = db.cursor()
            if user_id is not None:
                cursor.execute(
                    """
                    SELECT 
                        s.id, s.target_role, s.match_percentage, s.core_coverage, 
                        s.complementary_coverage, s.source_type, s.analysis_mode,
                        s.current_skills, s.matched_skills, s.adjacent_skills, 
                        s.missing_skills, s.recommendations_json, s.created_at,
                        s.resume_id,
                        r.filename as resume_filename
                    FROM skill_evaluations s
                    LEFT JOIN resumes r ON s.resume_id = r.id
                    WHERE s.user_id = ?
                    ORDER BY s.created_at DESC
                    LIMIT ?;
                    """,
                    (user_id, limit),
                )
            else:
                cursor.execute(
                    """
                    SELECT 
                        s.id, s.target_role, s.match_percentage, s.core_coverage, 
                        s.complementary_coverage, s.source_type, s.analysis_mode,
                        s.current_skills, s.matched_skills, s.adjacent_skills, 
                        s.missing_skills, s.recommendations_json, s.created_at,
                        s.resume_id,
                        r.filename as resume_filename
                    FROM skill_evaluations s
                    LEFT JOIN resumes r ON s.resume_id = r.id
                    WHERE s.user_id IS NULL
                    ORDER BY s.created_at DESC
                    LIMIT ?;
                    """,
                    (limit,),
                )
            rows = cursor.fetchall()
            results = []
            for row in rows:
                results.append({
                    "id": row["id"],
                    "resume_id": row["resume_id"],
                    "target_role": row["target_role"],
                    "match_percentage": row["match_percentage"],
                    "core_coverage": row["core_coverage"],
                    "complementary_coverage": row["complementary_coverage"],
                    "source_type": row["source_type"],
                    "analysis_mode": row["analysis_mode"],
                    "resume_filename": row["resume_filename"] or "Uploaded Resume",
                    "current_skills": json.loads(row["current_skills"]) if row["current_skills"] else [],
                    "matched_skills": json.loads(row["matched_skills"]) if row["matched_skills"] else [],
                    "adjacent_skills": json.loads(row["adjacent_skills"]) if row["adjacent_skills"] else [],
                    "missing_skills": json.loads(row["missing_skills"]) if row["missing_skills"] else [],
                    "recommendations": json.loads(row["recommendations_json"]) if row["recommendations_json"] else [],
                    "created_at": row["created_at"],
                })
            return results
        except Exception as e:
            logger.error(f"Failed to fetch skill gap history: {e}")
            return []

    @staticmethod
    def get_evaluation_by_resume(resume_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Retrieves the latest skill gap evaluation for a specific resume_id ensuring user data isolation."""
        try:
            db = get_db()
            cursor = db.cursor()
            if user_id is not None:
                cursor.execute(
                    """
                    SELECT 
                        s.id, s.target_role, s.match_percentage, s.core_coverage, 
                        s.complementary_coverage, s.source_type, s.analysis_mode,
                        s.current_skills, s.matched_skills, s.adjacent_skills, 
                        s.missing_skills, s.recommendations_json, s.detailed_results_json,
                        s.created_at, s.resume_id,
                        r.filename as resume_filename
                    FROM skill_evaluations s
                    LEFT JOIN resumes r ON s.resume_id = r.id
                    WHERE s.resume_id = ? AND s.user_id = ?
                    ORDER BY s.created_at DESC
                    LIMIT 1;
                    """,
                    (resume_id, user_id),
                )
            else:
                cursor.execute(
                    """
                    SELECT 
                        s.id, s.target_role, s.match_percentage, s.core_coverage, 
                        s.complementary_coverage, s.source_type, s.analysis_mode,
                        s.current_skills, s.matched_skills, s.adjacent_skills, 
                        s.missing_skills, s.recommendations_json, s.detailed_results_json,
                        s.created_at, s.resume_id,
                        r.filename as resume_filename
                    FROM skill_evaluations s
                    LEFT JOIN resumes r ON s.resume_id = r.id
                    WHERE s.resume_id = ? AND s.user_id IS NULL
                    ORDER BY s.created_at DESC
                    LIMIT 1;
                    """,
                    (resume_id,),
                )
            row = cursor.fetchone()
            if not row:
                return None

            detailed = json.loads(row["detailed_results_json"]) if row["detailed_results_json"] else {}
            metrics = detailed.get("metrics", {
                "overall_coverage": row["match_percentage"],
                "core_coverage": row["core_coverage"],
                "complementary_coverage": row["complementary_coverage"],
                "total_benchmark_skills": 0,
                "direct_match_count": 0,
                "adjacent_match_count": 0,
                "missing_count": 0,
            })
            skills_data = detailed.get("skills", {
                "direct_matches": json.loads(row["matched_skills"]) if row["matched_skills"] else [],
                "adjacent_skills": json.loads(row["adjacent_skills"]) if row["adjacent_skills"] else [],
                "missing_skills": json.loads(row["missing_skills"]) if row["missing_skills"] else [],
            })
            recommendations = json.loads(row["recommendations_json"]) if row["recommendations_json"] else []

            return {
                "id": row["id"],
                "target_role": row["target_role"],
                "source_type": row["source_type"],
                "resume_filename": row["resume_filename"] or "Uploaded Resume",
                "analysis_mode": row["analysis_mode"],
                "resume_id": row["resume_id"],
                "metrics": metrics,
                "skills": skills_data,
                "recommendations": recommendations,
                "benchmark_notice": detailed.get("benchmark_notice", BENCHMARK_NOTICE),
                "created_at": row["created_at"],
            }
        except Exception as e:
            logger.error(f"Failed to fetch evaluation for resume {resume_id}: {e}")
            return None

