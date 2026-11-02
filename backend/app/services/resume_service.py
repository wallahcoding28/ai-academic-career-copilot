"""
Resume Service Layer
Stage 2: PDF/DOCX parsing, keyword matching, ATS scoring, and Gemini/Heuristic analysis.
"""

import io
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.models.db import get_db
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

# Standard industry skill benchmarks by role for student success calibration
ROLE_BENCHMARKS: Dict[str, Dict[str, List[str]]] = {
    "Full Stack Developer": {
        "core": ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "HTML", "CSS", "Git"],
        "complementary": ["REST API", "Docker", "PostgreSQL", "MongoDB", "Express", "Tailwind CSS", "Redux", "CI/CD"],
    },
    "Frontend Engineer": {
        "core": ["JavaScript", "TypeScript", "React", "HTML5", "CSS3", "Git", "Responsive Design"],
        "complementary": ["Redux", "Next.js", "Tailwind CSS", "Webpack", "Vite", "Jest", "Web Performance", "Accessibility"],
    },
    "Backend Engineer": {
        "core": ["Python", "Java", "SQL", "REST API", "Database Design", "Git", "Data Structures"],
        "complementary": ["PostgreSQL", "Docker", "Redis", "Microservices", "Flask", "Django", "Spring Boot", "Kafka", "Linux"],
    },
    "Machine Learning Engineer": {
        "core": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "NumPy", "Linear Algebra"],
        "complementary": ["MLOps", "Docker", "Data Preprocessing", "NLP", "Computer Vision", "HuggingFace", "SQL", "Feature Engineering"],
    },
    "Data Analyst / Scientist": {
        "core": ["Python", "SQL", "Pandas", "NumPy", "Data Visualization", "Excel", "Statistics"],
        "complementary": ["Tableau", "PowerBI", "Matplotlib", "Seaborn", "A/B Testing", "ETL", "Jupyter", "Machine Learning"],
    },
    "DevOps & Cloud Engineer": {
        "core": ["Linux", "Docker", "Kubernetes", "Git", "CI/CD", "Bash", "Networking"],
        "complementary": ["Terraform", "AWS", "GCP", "Ansible", "Prometheus", "Grafana", "Python", "Cloud Security"],
    },
}

DEFAULT_BENCHMARK = {
    "core": ["Python", "JavaScript", "SQL", "Git", "Data Structures", "Problem Solving"],
    "complementary": ["Docker", "REST API", "Database Design", "Linux", "Testing"],
}


class ResumeService:
    """Business logic for resume parsing, keyword matching, and scoring."""

    @staticmethod
    def parse_document(file_bytes: bytes, filename: str) -> str:
        """
        Extracts plain text from PDF, DOCX, or TXT file uploads.
        """
        lower_name = filename.lower()
        extracted_text = ""

        if lower_name.endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                pages_text = []
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        pages_text.append(text)
                extracted_text = "\n\n".join(pages_text)
            except Exception as e:
                logger.error(f"Failed to extract PDF text from {filename}: {e}")
                raise ValueError(f"Could not parse PDF file: {str(e)}")

        elif lower_name.endswith(".docx"):
            try:
                import docx
                doc = docx.Document(io.BytesIO(file_bytes))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                # Also include text from tables if present
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                        if row_text:
                            paragraphs.append(row_text)
                extracted_text = "\n\n".join(paragraphs)
            except Exception as e:
                logger.error(f"Failed to extract DOCX text from {filename}: {e}")
                raise ValueError(f"Could not parse DOCX file: {str(e)}")

        elif lower_name.endswith(".txt"):
            try:
                extracted_text = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                extracted_text = file_bytes.decode("latin-1", errors="replace")

        else:
            raise ValueError(f"Unsupported document format '{filename}'. Please upload a PDF, DOCX, or TXT file.")

        cleaned = re.sub(r"[ \t]+", " ", extracted_text)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

        if len(cleaned) < 50:
            raise ValueError(
                "Extracted resume content is too short or unreadable. "
                "Ensure the document contains selectable text and is not an image-only scan."
            )

        return cleaned

    @classmethod
    def analyze_resume(
        cls,
        resume_text: str,
        filename: str,
        file_size: int,
        target_role: str,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Performs diagnostic resume evaluation against target role criteria.
        Uses Gemini if configured; otherwise uses high-precision deterministic ATS heuristics.
        Persists results into the SQLite database.
        """
        analysis_data: Dict[str, Any] = {}
        analysis_mode = "ats_heuristic"

        # 1. Attempt Gemini 3.8 Flash analysis if configured
        if ai_service.is_configured():
            try:
                gemini_result = ai_service.analyze_resume_prompt(resume_text, target_role)
                if isinstance(gemini_result, dict) and "score" in gemini_result:
                    analysis_data = gemini_result
                    analysis_mode = "gemini_ai"
            except Exception as e:
                logger.warning(f"Gemini analysis failed; falling back to ATS heuristic engine: {e}")

        # 2. Fallback to rule-based ATS evaluation engine if Gemini is unconfigured or failed
        if not analysis_data:
            analysis_data = cls._run_heuristic_ats_analysis(resume_text, target_role)
            analysis_mode = "ats_heuristic"

        score = int(analysis_data.get("score", 70))
        matched_skills = analysis_data.get("matched_skills", [])
        missing_skills = analysis_data.get("missing_skills", [])

        # 3. Persist analysis into SQLite resumes table
        resume_record_id = None
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO resumes (user_id, filename, file_size, raw_text, extracted_skills, feedback_json, score)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    user_id,
                    filename,
                    file_size,
                    resume_text[:20000],
                    json.dumps(matched_skills),
                    json.dumps(analysis_data),
                    float(score),
                ),
            )
            db.commit()
            resume_record_id = cursor.lastrowid
        except Exception as e:
            logger.error(f"Failed to persist resume record to SQLite: {e}")

        # 4. Standardize return payload
        return {
            "id": resume_record_id,
            "filename": filename,
            "file_size": file_size,
            "target_role": target_role,
            "analysis_mode": analysis_mode,
            "score": score,
            "summary": analysis_data.get("summary", ""),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "bullet_improvements": analysis_data.get("bullet_improvements", []),
            "formatting_audit": analysis_data.get(
                "formatting_audit",
                {"readability": "Good", "ats_score": 75, "formatting_flags": []},
            ),
        }

    @classmethod
    def _run_heuristic_ats_analysis(cls, text: str, role: str) -> Dict[str, Any]:
        """
        Deterministic, transparent ATS resume evaluation for offline resilience and explainable scoring.
        Analyzes keyword coverage, quantifiable metric frequency, section hierarchy, and action verbs.
        """
        benchmark = ROLE_BENCHMARKS.get(role, DEFAULT_BENCHMARK)
        all_benchmark_skills = benchmark["core"] + benchmark["complementary"]

        text_lower = text.lower()

        # Skill matching
        matched: List[str] = []
        missing: List[str] = []

        for skill in all_benchmark_skills:
            pattern = r"\b" + re.escape(skill.lower()) + r"\b"
            if re.search(pattern, text_lower):
                matched.append(skill)
            else:
                missing.append(skill)

        # Ensure unique preserved order
        matched = list(dict.fromkeys(matched))
        missing = list(dict.fromkeys(missing))

        # Check for standard sections
        sections_found = []
        for sec in ["Education", "Experience", "Projects", "Skills", "Certifications"]:
            if re.search(r"\b" + sec.lower() + r"\b", text_lower):
                sections_found.append(sec)

        # Check for quantifiable metrics (numbers, percentages, metrics like ms, %, $, X)
        has_metrics = bool(re.search(r"\b\d+([.,]\d+)?\s*(%|x|ms|s|k|users|requests|percent)?\b", text_lower))
        metric_matches = re.findall(r"\b\d+([.,]\d+)?\s*(%|x|users|ms)\b", text_lower)
        metric_count = len(metric_matches)

        # Calculate score (40% skill match + 30% metric density + 30% structure)
        skill_ratio = len(matched) / max(len(all_benchmark_skills), 1)
        skill_points = min(40, int(skill_ratio * 55))

        metric_points = 30 if metric_count >= 4 else (20 if metric_count >= 2 else 10)
        structure_points = int((len(sections_found) / 5) * 30)
        overall_score = max(35, min(95, skill_points + metric_points + structure_points))

        # Extract weak bullets for improvement suggestions
        bullet_improvements = cls._generate_heuristic_bullet_improvements(text, role, matched)

        formatting_flags = [
            f"Detected {len(sections_found)} of 5 standard resume sections ({', '.join(sections_found)})."
        ]
        if metric_count >= 3:
            formatting_flags.append("Strong usage of quantifiable metrics and numeric achievements.")
        else:
            formatting_flags.append("Limited quantifiable metrics found; add percentage or numerical outcomes.")

        if "Projects" in sections_found:
            formatting_flags.append("Dedicated Projects section recognized by ATS parser.")

        return {
            "score": overall_score,
            "summary": (
                f"Candidate demonstrates foundational technical competencies for {role} with "
                f"{len(matched)} matching skill keywords identified. Increasing quantifiable metrics "
                f"in project descriptions and incorporating missing industry competencies ({', '.join(missing[:3])}) "
                "will notably strengthen alignment with target role benchmarks."
            ),
            "matched_skills": matched,
            "missing_skills": missing[:6],
            "bullet_improvements": bullet_improvements,
            "formatting_audit": {
                "readability": "Excellent" if overall_score >= 80 else "Good",
                "ats_score": min(95, overall_score + 5),
                "formatting_flags": formatting_flags,
            },
        }

    @staticmethod
    def _generate_heuristic_bullet_improvements(text: str, role: str, matched_skills: List[str]) -> List[Dict[str, str]]:
        """Finds candidate bullet lines in resume text and produces X-Y-Z formula upgrades."""
        # Find potential bullet points (lines starting with -, *, •, or standard action verbs)
        lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 25]
        candidate_bullets = []

        weak_verb_pattern = re.compile(
            r"^(worked on|helped with|responsible for|created|made|did|handled|involved in)\b",
            re.IGNORECASE,
        )

        for line in lines:
            cleaned_line = re.sub(r"^[-*•\d.]+\s*", "", line)
            if weak_verb_pattern.search(cleaned_line) and len(cleaned_line) < 180:
                candidate_bullets.append(cleaned_line)

        improvements = []

        if candidate_bullets:
            first_weak = candidate_bullets[0]
            primary_skill = matched_skills[0] if matched_skills else "Python/React"
            improvements.append({
                "original": first_weak,
                "improved": (
                    f"Architected and deployed responsive feature modules utilizing {primary_skill}, "
                    "improving system throughput [insert quantified result, e.g., reduced latency by X% or supported N workflows]."
                ),
                "reason": (
                    "Replaces passive verb with strong technical action verb ('Architected') and provides a "
                    "structured placeholder to insert genuine measured outcomes without fabricating metrics."
                ),
            })

        # Provide a general template-based improvement for student coursework projects
        primary_skill = matched_skills[0] if matched_skills else "modern frameworks"
        improvements.append({
            "original": "Built a full stack web application project for semester coursework.",
            "improved": (
                f"Engineered an end-to-end web platform leveraging {primary_skill}, implementing RESTful API endpoints "
                "and relational schemas [insert verifiable metric, e.g., validated with N test suites or deployed to N active users]."
            ),
            "reason": (
                "Applies Google's X-Y-Z formula (Accomplished [X] by doing [Z], as measured by [Y]) with a clear "
                "placeholder for authentic project metrics rather than unverified claims."
            ),
        })

        return improvements

    @staticmethod
    def get_resume_history(limit: int = 10, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieves recent resume evaluations from SQLite filtered by user_id if authenticated."""
        try:
            db = get_db()
            cursor = db.cursor()
            if user_id is not None:
                cursor.execute(
                    """
                    SELECT id, filename, file_size, score, extracted_skills, feedback_json, created_at, user_id
                    FROM resumes
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?;
                    """,
                    (user_id, limit),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, filename, file_size, score, extracted_skills, feedback_json, created_at, user_id
                    FROM resumes
                    WHERE user_id IS NULL
                    ORDER BY created_at DESC
                    LIMIT ?;
                    """,
                    (limit,),
                )
            rows = cursor.fetchall()
            results = []
            for row in rows:
                results.append({
                    "id": row["id"],
                    "user_id": row["user_id"],
                    "filename": row["filename"],
                    "file_size": row["file_size"],
                    "score": row["score"],
                    "extracted_skills": json.loads(row["extracted_skills"]) if row["extracted_skills"] else [],
                    "feedback": json.loads(row["feedback_json"]) if row["feedback_json"] else {},
                    "created_at": row["created_at"],
                })
            return results
        except Exception as e:
            logger.error(f"Failed to fetch resume history: {e}")
            return []

    @staticmethod
    def get_resume_by_id(resume_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Retrieves a single evaluated resume by its ID ensuring user data isolation."""
        try:
            db = get_db()
            cursor = db.cursor()
            if user_id is not None:
                cursor.execute(
                    """
                    SELECT id, filename, file_size, score, raw_text, extracted_skills, feedback_json, created_at, user_id
                    FROM resumes
                    WHERE id = ? AND user_id = ?;
                    """,
                    (resume_id, user_id),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, filename, file_size, score, raw_text, extracted_skills, feedback_json, created_at, user_id
                    FROM resumes
                    WHERE id = ? AND user_id IS NULL;
                    """,
                    (resume_id,),
                )
            row = cursor.fetchone()
            if not row:
                return None

            feedback = json.loads(row["feedback_json"]) if row["feedback_json"] else {}
            extracted_skills = json.loads(row["extracted_skills"]) if row["extracted_skills"] else []

            # Format to match ResumeAnalysisResult interface for seamless client restoration
            target_role = feedback.get("target_role", "Full Stack Developer")
            analysis_mode = feedback.get("analysis_mode", "ats_heuristic")
            summary = feedback.get("summary", "Analysis summary not available.")
            matched_skills = feedback.get("matched_skills", extracted_skills)
            missing_skills = feedback.get("missing_skills", [])
            bullet_improvements = feedback.get("bullet_improvements", [])
            formatting_audit = feedback.get("formatting_audit", {
                "readability": "Good",
                "ats_score": int(row["score"]),
                "formatting_flags": [],
            })

            return {
                "id": row["id"],
                "user_id": row["user_id"],
                "filename": row["filename"],
                "file_size": row["file_size"],
                "score": row["score"],
                "target_role": target_role,
                "analysis_mode": analysis_mode,
                "summary": summary,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "bullet_improvements": bullet_improvements,
                "formatting_audit": formatting_audit,
                "extracted_skills": extracted_skills,
                "feedback": feedback,
                "created_at": row["created_at"],
            }
        except Exception as e:
            logger.error(f"Failed to fetch resume {resume_id}: {e}")
            return None


