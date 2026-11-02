"""
AI Service Layer Interface
Stage 2: Gemini API Integration for AI Resume Analysis
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AIService:
    """
    Central service interface for Generative AI operations.
    Keeps LLM prompt construction and API calls cleanly separated from HTTP controllers.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.provider = "gemini" if self.api_key else "unconfigured"
        self._client = None

    def is_configured(self) -> bool:
        """Returns whether an AI API key has been supplied."""
        return bool(self.api_key and self.api_key.strip())

    def _get_client(self):
        if self._client is None and self.is_configured():
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                return None
        return self._client

    def analyze_resume_prompt(self, resume_text: str, target_role: str) -> Dict[str, Any]:
        """
        Stage 2: Analyzes resume text against target role criteria using Gemini 3.8 Flash.
        Returns strict structured JSON matching platform schemas.
        """
        if not self.is_configured():
            raise RuntimeError("Gemini API key is not configured.")

        client = self._get_client()
        if not client:
            raise RuntimeError("Failed to obtain Gemini client instance.")

        prompt = f"""
You are an expert technical recruiter and university career mentor evaluating an engineering student's resume for a '{target_role}' position.
Evaluate the resume thoroughly and return ONLY a valid JSON object matching this exact schema:

{{
  "score": <integer from 0 to 100 representing overall ATS and technical readiness>,
  "summary": "<2-3 sentence executive assessment of candidate fit and major strengths/weaknesses>",
  "matched_skills": ["<skill1>", "<skill2>", ...],
  "missing_skills": ["<missing skill critical for {target_role}>", ...],
  "bullet_improvements": [
    {{
      "original": "<an actual bullet point from the resume that is weak, vague, or lacks metrics>",
      "improved": "<re-written version using the Google X-Y-Z formula (Accomplished [X] by doing [Z], as measured by [Y]). CRITICAL: NEVER invent metrics, percentages, user counts, or uptime not present in the source resume. If measurable results are missing, insert an explicit bracketed placeholder like '[insert quantified metric, e.g. reduced latency by X%]' so the user can insert their genuine metric>",
      "reason": "<clear explanation of how the rewrite strengthens the bullet and what verifiable metric the student should add>"
    }}
  ],
  "formatting_audit": {{
    "readability": "<'Excellent' | 'Good' | 'Needs Improvement'>",
    "ats_score": <integer from 0 to 100>,
    "formatting_flags": ["<positive or negative formatting note, e.g. 'Standard section headers detected'>", ...]
  }}
}}

Resume Text:
\"\"\"{resume_text[:12000]}\"\"\"

Provide 2 to 4 high-value bullet improvements. Output pure JSON without markdown code fences.
"""

        try:
            interaction = client.interactions.create(
                model="gemini-3.8-flash",
                input=prompt,
            )

            raw_output = interaction.output_text or ""
            # Clean possible markdown fences
            cleaned_output = raw_output.strip()
            if cleaned_output.startswith("```json"):
                cleaned_output = cleaned_output[7:]
            elif cleaned_output.startswith("```"):
                cleaned_output = cleaned_output[3:]
            if cleaned_output.endswith("```"):
                cleaned_output = cleaned_output[:-3]
            cleaned_output = cleaned_output.strip()

            parsed = json.loads(cleaned_output)
            return parsed

        except Exception as e:
            logger.error(f"Error calling Gemini API for resume analysis: {e}")
            raise RuntimeError(f"AI Resume Analysis failed: {str(e)}")

    def evaluate_skill_gap_prompt(
        self,
        candidate_skills: list,
        target_role: str,
        role_benchmark: dict,
        resume_text: str = "",
    ) -> Dict[str, Any]:
        """
        Stage 3: Evaluates candidate skills against the application-defined benchmark using Gemini 3.8 Flash.
        Enforces 3 strict states: Direct Match, Related / Adjacent (never counted as direct), and Missing.
        Excludes arbitrary time estimates from learning recommendations.
        """
        if not self.is_configured():
            raise RuntimeError("Gemini API key is not configured.")

        client = self._get_client()
        if not client:
            raise RuntimeError("Failed to obtain Gemini client instance.")

        core_skills = role_benchmark.get("core_skills", [])
        comp_skills = role_benchmark.get("complementary_skills", [])
        categories = role_benchmark.get("categories", {})
        adjacencies = role_benchmark.get("skill_adjacencies", {})

        prompt = f"""
You are an expert technical mentor evaluating a university student's profile for the target role: '{target_role}'.
Compare the candidate's verified skills against the application-defined role benchmark.

ROLE BENCHMARK PROFILE:
- Core Competencies: {json.dumps(core_skills)}
- Complementary Competencies: {json.dumps(comp_skills)}
- Skill Categories: {json.dumps(categories)}
- Known Adjacencies: {json.dumps(adjacencies)}

CANDIDATE VERIFIED SKILLS:
{json.dumps(candidate_skills)}

OPTIONAL RESUME CONTEXT:
\"\"\"{resume_text[:6000] if resume_text else 'None provided; rely on candidate verified skills list.'}\"\"\"

STRICT EVALUATION RULES:
1. Direct Match: The skill is explicitly present in the candidate's skills or resume text.
2. Related / Adjacent: The candidate possesses a related foundation (e.g. JavaScript when TypeScript is required, SQL when PostgreSQL is required), but lacks the exact skill. DO NOT count adjacent skills as direct matches!
3. Missing: The benchmark requirement has insufficient evidence.
4. Priority for missing/adjacent skills:
   - High: Missing Core competencies without direct match.
   - Medium: Complementary skills or Core skills with adjacent foundation.
   - Low: Minor complementary tooling.
5. NO ARBITRARY TIME ESTIMATES: Do NOT estimate hours, days, or weeks. Provide conceptual learning direction and a concrete project/practice idea.
6. ZERO HALLUCINATION: Never claim a candidate has a skill unless supported by the provided candidate skills or resume text.

Return ONLY a valid JSON object matching this exact schema:
{{
  "metrics": {{
    "overall_coverage": <float between 0 and 100 based on formula 65% core + 35% complementary, with adjacent skills credited at 50% partial value>,
    "core_coverage": <float between 0 and 100 for core competencies>,
    "complementary_coverage": <float between 0 and 100 for complementary competencies>,
    "total_benchmark_skills": <integer count of core + complementary>,
    "direct_match_count": <integer>,
    "adjacent_match_count": <integer>,
    "missing_count": <integer>
  }},
  "skills": {{
    "direct_matches": [
      {{ "name": "<skill name>", "tier": "<'core'|'complementary'>", "category": "<category>", "evidence": "<matched term>" }}
    ],
    "adjacent_skills": [
      {{ "target_skill": "<benchmark skill>", "candidate_skill": "<candidate's related skill>", "tier": "<'core'|'complementary'>", "category": "<category>", "rationale": "<explanation of foundation vs gap>" }}
    ],
    "missing_skills": [
      {{ "name": "<skill name>", "tier": "<'core'|'complementary'>", "priority": "<'High'|'Medium'|'Low'>", "category": "<category>", "impact": "<short explanation of why it matters>" }}
    ]
  }},
  "recommendations": [
    {{
      "skill": "<skill name>",
      "priority": "<'High'|'Medium'|'Low'>",
      "why_it_matters": "<why this skill is essential for this benchmark>",
      "learning_direction": "<key conceptual topics to study>",
      "project_idea": "<concrete practice project or code demonstration idea>"
    }}
  ],
  "benchmark_notice": "Evaluated against application-defined reference profiles (65% core / 35% complementary weighting). This benchmark serves as a curated academic baseline and is not an exhaustive guarantee of individual employer requirements."
}}

Output pure JSON without markdown fences.
"""

        try:
            interaction = client.interactions.create(
                model="gemini-3.8-flash",
                input=prompt,
            )

            raw_output = interaction.output_text or ""
            cleaned = raw_output.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            return parsed

        except Exception as e:
            logger.error(f"Error calling Gemini API for skill gap evaluation: {e}")
            raise RuntimeError(f"AI Skill Gap Analysis failed: {str(e)}")

    def generate_interview_questions_prompt(
        self,
        target_role: str,
        difficulty: str,
        question_focus: str,
        selected_skills: list,
        question_count: int,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Stage 4: Synthesizes role-calibrated interview practice questions using Gemini 3.8 Flash.
        Enforces strict anti-hallucination rules, exact count, structured categories, and key talking points.
        """
        if not self.is_configured():
            raise RuntimeError("Gemini API key is not configured.")

        client = self._get_client()
        if not client:
            raise RuntimeError("Failed to obtain Gemini client instance.")

        context_summary = "None provided. Generate questions based solely on the target role, difficulty, and selected topics."
        if context_data:
            source = context_data.get("source", "")
            if source == "skill_gap":
                missing = context_data.get("missing_skills", [])
                adjacent = context_data.get("adjacent_skills", [])
                core_cov = context_data.get("core_coverage", 0)
                context_summary = (
                    f"Candidate Skill Gap Evaluation for {target_role} (Core Coverage: {core_cov}%).\n"
                    f"Detected Missing Skills to target: {', '.join(missing[:6]) if missing else 'None'}.\n"
                    f"Adjacent Skills with transfer foundation: {', '.join([a.get('target_skill', '') for a in adjacent[:4]]) if adjacent else 'None'}."
                )
            elif source == "resume":
                matched = context_data.get("matched_skills", [])
                filename = context_data.get("filename", "resume.pdf")
                context_summary = (
                    f"Candidate Analyzed Resume ({filename}).\n"
                    f"Verified Skills from document: {', '.join(matched[:8]) if matched else 'General CS fundamentals'}."
                )

        prompt = f"""
You are an expert technical interviewer and engineering hiring manager calibrating interview practice questions for a candidate preparing for a '{target_role}' role.

CALIBRATION PARAMETERS:
- Target Role: {target_role}
- Target Difficulty: {difficulty} (e.g. Beginner/Junior, Intermediate/Mid-Level, Advanced/Senior)
- Question Focus / Distribution: {question_focus} (e.g. Technical Fundamentals, Coding & Algorithms, System Design & Architecture, Behavioral & Project Experience, or Mixed / Balanced)
- Selected Skills / Topics: {json.dumps(selected_skills)}
- Exact Number of Questions Required: {question_count}

CANDIDATE CONTEXT (FOR CALIBRATION ONLY):
{context_summary}

STRICT ANTI-HALLUCINATION & INTEGRITY RULES:
1. NEVER invent specific candidate accomplishments, past employers, degrees, metrics, or project names that were not provided in the context.
2. If context mentions a missing skill (e.g., Docker or TypeScript), formulate the question to assess conceptual foundations or trade-offs in that skill.
3. NEVER promise or claim that answering these questions guarantees hiring or placement.
4. Distribute question categories according to the '{question_focus}' parameter. If 'Mixed / Balanced', provide a balanced blend of Technical Fundamentals, Coding/Algorithms, System Design, and Behavioral questions.
5. Provide actionable 'guidance' (3-4 bullet points) covering key concepts or talking points an interviewer would look for. Do NOT frame them as the 'single correct answer'.
6. Return EXACTLY {question_count} questions in the list.

Return ONLY a valid JSON array of objects matching this exact schema:
[
  {{
    "question": "<The full interview question>",
    "category": "<'Technical Fundamentals' | 'Coding & Algorithms' | 'System Design & Architecture' | 'Behavioral & Project Experience'>",
    "difficulty": "{difficulty}",
    "skill_or_topic": "<Specific topic or technology, e.g. 'React & State Management' or 'REST API & Microservices'>",
    "guidance": [
      "<Key concept or talking point 1 to consider in an answer>",
      "<Key concept or talking point 2>",
      "<Key concept or talking point 3>"
    ],
    "context_note": "<Optional short note if question directly targets a detected skill gap or resume skill, e.g. 'Targeted from your missing skill benchmark: Docker', or null if general>"
  }}
]

Output pure JSON without markdown code fences.
"""

        try:
            interaction = client.interactions.create(
                model="gemini-3.8-flash",
                input=prompt,
            )

            raw_output = interaction.output_text or ""
            cleaned = raw_output.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return parsed[:question_count]
            elif isinstance(parsed, dict) and "questions" in parsed:
                return parsed["questions"][:question_count]
            return []

        except Exception as e:
            logger.error(f"Error calling Gemini API for interview question generation: {e}")
            raise RuntimeError(f"AI Interview Generation failed: {str(e)}")

    def generate_study_plan_prompt(
        self,
        goal: str,
        topics: List[str],
        daily_hours: float,
        horizon_weeks: int,
        study_preferences: Dict[str, Any],
        context_data: Optional[Dict[str, Any]] = None,
        schedule_skeleton: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Stage 5: Synthesizes structured, actionable study session objectives and resource hints
        calibrated to the student's goal, verified context, and exact mathematical schedule skeleton using Gemini 3.8 Flash.
        Strict anti-hallucination guardrails: cannot alter durations, day counts, or invent unearned credentials.
        """
        if not self.is_configured():
            raise RuntimeError("Gemini API key is not configured.")

        client = self._get_client()
        if not client:
            raise RuntimeError("Failed to obtain Gemini client instance.")

        context_summary = "None provided. Plan is calibrated strictly from user-selected topics and parameters."
        if context_data:
            source = context_data.get("source", "")
            if source == "skill_gap":
                missing = context_data.get("missing_skills", [])
                adjacent = context_data.get("adjacent_skills", [])
                core_cov = context_data.get("core_coverage", 0)
                role = context_data.get("target_role", "Target Role")
                context_summary = (
                    f"Candidate Skill Gap Evaluation for {role} (Core Coverage: {core_cov}%).\n"
                    f"Identified Missing Skills to remediate: {', '.join(missing[:6]) if missing else 'None'}.\n"
                    f"Adjacent Skills: {', '.join([a.get('target_skill', '') for a in adjacent[:4]]) if adjacent else 'None'}."
                )
            elif source == "interview":
                role = context_data.get("target_role", "Target Role")
                diff = context_data.get("difficulty", "Intermediate")
                focus = context_data.get("question_focus", "Mixed")
                skills = context_data.get("selected_skills", [])
                context_summary = (
                    f"Candidate Interview Preparation Context for {role} ({diff} Level, Focus: {focus}).\n"
                    f"Key Interview Focus Areas: {', '.join(skills[:6]) if skills else 'General technical questions'}."
                )
            elif source == "resume":
                filename = context_data.get("filename", "resume.pdf")
                skills = context_data.get("extracted_skills", [])
                context_summary = (
                    f"Candidate Analyzed Resume ({filename}).\n"
                    f"Verified Foundational Skills: {', '.join(skills[:8]) if skills else 'General CS fundamentals'}."
                )

        skeleton_prompt = []
        if schedule_skeleton:
            for item in schedule_skeleton:
                skeleton_prompt.append({
                    "sequence_order": item.get("sequence_order"),
                    "week_number": item.get("week_number"),
                    "day_number": item.get("day_number"),
                    "topic": item.get("topic"),
                    "activity_type": item.get("activity_type"),
                    "duration_minutes": item.get("duration_minutes"),
                    "priority": item.get("priority", "standard"),
                })

        prompt = f"""
You are an expert university academic advisor and technical career mentor calibrating a structured study roadmap for a student.

PLANNING PARAMETERS:
- Planning Goal: {goal}
- Topics / Subjects: {json.dumps(topics)}
- Available Daily Commitment: {daily_hours} hours/day ({int(daily_hours * 60)} minutes/session)
- Planning Horizon: {horizon_weeks} weeks
- Study Preferences: {json.dumps(study_preferences)}

STUDENT BACKGROUND CONTEXT:
{context_summary}

PRE-CALCULATED SCHEDULE SKELETON:
The study dates, day numbers, sequence order, topics, activity types, and durations have ALREADY been computed and locked.
{json.dumps(skeleton_prompt, indent=2)}

STRICT PRODUCT & INTEGRITY RULES:
1. DO NOT change sequence_order, week_number, day_number, topic, activity_type, or duration_minutes. They are mathematically locked.
2. For each study session in the skeleton, provide:
   - "session_objective": A crisp, actionable 1-2 sentence description of what the student must learn, build, practice, or review in this specific session.
   - "resource_hints": An array of exactly 3 concrete concepts, subtopics, implementation exercises, or reference documentation topics for the student to focus on.
3. NEVER promise or claim that completing this study plan guarantees passing an exam, getting hired, or mastering a skill. Use empowering, factual guidance language.
4. NEVER invent candidate accomplishments, degrees, past employers, or fake scores.
5. If activity_type is 'Rest', session_objective should be "Scheduled rest and buffer day for cognitive recovery or catching up on previous topics." and resource_hints should be ["Review key notes if needed", "Recharge mental stamina", "Rest and buffer buffer"].

Return ONLY a valid JSON array of objects with the exact length matching the schedule skeleton ({len(skeleton_prompt)} items):
[
  {{
    "sequence_order": <integer matching skeleton>,
    "week_number": <integer matching skeleton>,
    "day_number": <integer matching skeleton>,
    "topic": "<string matching skeleton>",
    "session_objective": "<crisp, concrete 1-2 sentence objective>",
    "activity_type": "<string matching skeleton>",
    "duration_minutes": <integer matching skeleton>,
    "priority": "<string matching skeleton>",
    "resource_hints": [
      "<Concept or task 1>",
      "<Concept or task 2>",
      "<Concept or task 3>"
    ]
  }}
]

Output pure JSON without markdown code fences.
"""

        try:
            interaction = client.interactions.create(
                model="gemini-3.8-flash",
                input=prompt,
            )

            raw_output = interaction.output_text or ""
            cleaned = raw_output.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict) and "sessions" in parsed:
                return parsed["sessions"]
            return []

        except Exception as e:
            logger.error(f"Error calling Gemini API for study plan generation: {e}")
            raise RuntimeError(f"AI Study Plan Generation failed: {str(e)}")


# Singleton instance ready for DI
ai_service = AIService()

