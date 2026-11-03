"""
Study Planning Service Layer
Stage 5: Workload balancing, deterministic schedule construction, dual-engine generation,
and transactional versioned persistence.
"""

import json
import logging
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
from app.models.db import get_db
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

# Standard validation limits
MIN_DAILY_HOURS = 0.5
MAX_DAILY_HOURS = 6.0
VALID_HORIZONS = [1, 2, 4, 8]
VALID_GOALS = [
    "Academic Subjects",
    "Skill Development",
    "Interview Preparation",
    "Career Preparation",
    "Mixed Goals",
]

# Rich Curated Technical Curricula Catalog (Offline Fallback Engine)
TOPIC_CATALOG: Dict[str, Dict[str, Any]] = {
    "data structures & algorithms": {
        "learn": "Analyze algorithmic complexity (Big-O time/space) and master core memory layouts.",
        "practice": "Implement and solve LeetCode-style problems focusing on pointers and recursion.",
        "project": "Build an in-memory priority queue or custom graph traversal search engine.",
        "review": "Review edge cases: empty structures, cycle detection, and memory constraints.",
        "resources": [
            "Time & space complexity invariants",
            "Pointer manipulation and recursion depth",
            "Tree balance and hash collision handling",
        ],
    },
    "redis": {
        "learn": "Study Redis memory architecture, single-threaded event loop, and data structures (strings, hashes, sets, zsets).",
        "practice": "Configure eviction policies (LRU/LFU) and implement write-through and cache-aside patterns.",
        "project": "Construct a distributed rate limiter and session storage manager using Redis key expiration.",
        "review": "Inspect Redis persistence tradeoffs: RDB snapshots vs AOF append-only logging.",
        "resources": [
            "Cache-aside and write-through invalidation",
            "Redis eviction algorithms (LRU, LFU, TTL)",
            "Pub/Sub messaging and atomic Lua scripts",
        ],
    },
    "docker": {
        "learn": "Examine container virtualization, Linux namespaces, cgroups, and layered filesystem architecture.",
        "practice": "Author optimized multi-stage Dockerfiles reducing production image footprints.",
        "project": "Orchestrate multi-container application stack with Docker Compose and private networks.",
        "review": "Audit container security: non-root execution, vulnerability scans, and secret mounts.",
        "resources": [
            "Multi-stage build optimization and caching",
            "Volume persistence and bridge networking",
            "Security hardening: non-root users and distroless images",
        ],
    },
    "system design": {
        "learn": "Master scalability fundamentals: horizontal scaling, load balancers, and CAP theorem trade-offs.",
        "practice": "Draft architecture diagrams addressing single points of failure and database read replicas.",
        "project": "Design an idempotent payment gateway with transactional outbox and event streaming.",
        "review": "Calculate back-of-the-envelope capacity: QPS, storage throughput, and network bandwidth.",
        "resources": [
            "Consistent hashing and load balancing strategies",
            "Database sharding and replication lag",
            "Asynchronous processing with event queues",
        ],
    },
    "postgresql": {
        "learn": "Understand relational schema normalization, foreign key constraints, and ACID transaction isolation levels.",
        "practice": "Analyze query performance with EXPLAIN ANALYZE and design B-Tree composite indexes.",
        "project": "Implement connection pooling, optimistic concurrency locking, and database migrations.",
        "review": "Audit slow queries, sequential table scans, and lock contention under high write loads.",
        "resources": [
            "EXPLAIN ANALYZE and index scan optimization",
            "Transaction isolation: Read Committed vs Serializable",
            "Connection pooling and connection exhaustion mitigation",
        ],
    },
    "python": {
        "learn": "Master Python data model: dunder methods, generators, iterators, and memory management via reference counting.",
        "practice": "Implement asynchronous I/O workflows with asyncio and concurrent.futures.",
        "project": "Develop a high-throughput async web service with type hints and Pydantic validation.",
        "review": "Profile Python CPU/memory bottlenecks and understand the Global Interpreter Lock (GIL).",
        "resources": [
            "Generators, memory efficiency, and yield expressions",
            "Asyncio event loops and non-blocking tasks",
            "Decorators, context managers, and type annotations",
        ],
    },
    "react": {
        "learn": "Deep dive into React rendering cycle, Virtual DOM diffing, and reconciliation heuristics.",
        "practice": "Optimize component re-renders using useMemo, useCallback, and custom state hooks.",
        "project": "Build an interactive client-side dashboard with state management and optimistic UI updates.",
        "review": "Audit React memory leaks, dangling event listeners, and stale closure traps.",
        "resources": [
            "Virtual DOM reconciliation and key assignment",
            "Hook dependency arrays and memoization patterns",
            "Error boundaries and component suspension",
        ],
    },
    "typescript": {
        "learn": "Explore TypeScript structural type system: generics, union types, and utility types.",
        "practice": "Implement type guards, discriminate unions, and generic constraint helpers.",
        "project": "Refactor untyped API payloads into strictly typed domain models with zero 'any' escapes.",
        "review": "Review advanced typing patterns: mapped types, conditional types, and keyof inferences.",
        "resources": [
            "Discriminated unions and exhaustive switch checks",
            "Generic type parameters with constraint boundaries",
            "Declaration files and third-party type augmentations",
        ],
    },
    "operating systems": {
        "learn": "Analyze CPU scheduling, process vs thread lifecycle, and virtual memory paging mechanics.",
        "practice": "Solve race conditions using mutexes, semaphores, and condition variables in concurrent code.",
        "project": "Implement a multithreaded worker pool with task queue synchronization.",
        "review": "Investigate deadlock four conditions (Coffman) and avoidance strategies.",
        "resources": [
            "Page faults, TLB caches, and virtual address translation",
            "Context switching overhead and thread synchronization",
            "Deadlock prevention and banker's algorithm principles",
        ],
    },
    "computer networks": {
        "learn": "Study OSI and TCP/IP models, TCP 3-way handshake, flow control, and sliding window protocols.",
        "practice": "Analyze network packet captures (Wireshark/tcpdump) and inspect TLS 1.3 handshake frames.",
        "project": "Build a custom HTTP/1.1 socket client implementing connection keep-alive and headers parsing.",
        "review": "Examine DNS resolution latency, CDN edge routing, and TCP slow-start implications.",
        "resources": [
            "TCP vs UDP: reliability, head-of-line blocking, and congestion control",
            "TLS encryption handshake and certificate validation",
            "DNS hierarchy, TTL caching, and round-robin balancing",
        ],
    },
    "kubernetes": {
        "learn": "Study container orchestration: Pods, Deployments, ReplicaSets, and Kubelet control loops.",
        "practice": "Write declarative YAML manifests configuring readiness/liveness probes and resource limits.",
        "project": "Deploy an ingress controller routing traffic across canary and production service deployments.",
        "review": "Review pod disruption budgets, horizontal pod autoscaling (HPA), and cluster capacity.",
        "resources": [
            "Pod lifecycle and probe configuration (readiness/liveness)",
            "Service discovery: ClusterIP, NodePort, and LoadBalancer",
            "ConfigMaps, Secrets, and rolling deployment strategies",
        ],
    },
    "ci/cd": {
        "learn": "Study automated build pipelines: linting, unit testing, artifact publishing, and environment promotion.",
        "practice": "Write pipeline configuration scripts automating container builds and test matrices.",
        "project": "Construct a deployment workflow with automated quality gates and rollback triggers.",
        "review": "Audit CI caching strategies to reduce test suite runtimes from 15 mins to under 3 mins.",
        "resources": [
            "Pipeline caching for dependencies and Docker layers",
            "Matrix builds and automated test suite sharding",
            "Branch protection rules and security secret scanning",
        ],
    },
}


def _get_curriculum_template(topic: str) -> Dict[str, Any]:
    """Retrieves curated curriculum for a topic or generates a clean fallback."""
    clean_topic = topic.lower().strip()
    for key, data in TOPIC_CATALOG.items():
        if key in clean_topic or clean_topic in key:
            return data
    return {
        "learn": f"Study foundational architecture, key mechanics, and core concepts of {topic}.",
        "practice": f"Complete hands-on programming exercises and problem sets applying {topic}.",
        "project": f"Build a practical modular component or integration utilizing {topic}.",
        "review": f"Conduct structured concept self-assessment and review common failure modes in {topic}.",
        "resources": [
            f"Core architecture and syntax fundamentals of {topic}",
            f"Implementation patterns and performance considerations",
            f"Common pitfalls and production edge cases in {topic}",
        ],
    }


class StudyPlannerService:
    """Core business logic for AI Study Planner."""

    @staticmethod
    def validate_plan_parameters(
        goal: str,
        topics: List[str],
        daily_hours: float,
        horizon_weeks: int,
        study_preferences: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates planning inputs against physical and cognitive scheduling constraints.
        Returns (is_valid, error_message).
        """
        if not goal or not isinstance(goal, str) or goal.strip() not in VALID_GOALS:
            return False, f"Invalid goal. Must be one of: {', '.join(VALID_GOALS)}"

        if not topics or not isinstance(topics, list) or len(topics) == 0:
            return False, "At least one study topic or subject must be specified."

        cleaned_topics = [t.strip() for t in topics if isinstance(t, str) and t.strip()]
        if len(cleaned_topics) == 0:
            return False, "Topics cannot be empty."

        if daily_hours < MIN_DAILY_HOURS or daily_hours > MAX_DAILY_HOURS:
            return (
                False,
                f"Daily study commitment must be between {MIN_DAILY_HOURS} hours (30 mins) and {MAX_DAILY_HOURS} hours.",
            )

        if horizon_weeks not in VALID_HORIZONS:
            return (
                False,
                f"Planning horizon must be one of: {', '.join(map(str, VALID_HORIZONS))} weeks.",
            )

        # Calculate maximum available study days based on rest days preference
        prefs = study_preferences or {}
        rest_mode = prefs.get("rest_days_mode", "weekends_off")
        days_per_week = 5 if rest_mode == "weekends_off" else (6 if rest_mode == "one_day_off" else 7)
        total_available_study_days = horizon_weeks * days_per_week

        if len(cleaned_topics) > total_available_study_days:
            return (
                False,
                f"Cannot schedule {len(cleaned_topics)} distinct topics in {total_available_study_days} available study days. "
                f"Please select up to {total_available_study_days} topics or increase your planning horizon.",
            )

        return True, None

    @staticmethod
    def build_schedule_skeleton(
        topics: List[str],
        daily_hours: float,
        horizon_weeks: int,
        study_preferences: Optional[Dict[str, Any]] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Deterministically constructs the locked schedule skeleton:
        days, weeks, duration, sequence order, topic assignments, and activity types.
        """
        prefs = study_preferences or {}
        rest_mode = prefs.get("rest_days_mode", "weekends_off")
        include_revision = prefs.get("include_revision", True)
        duration_minutes = int(round(daily_hours * 60))

        # Sort topics: missing skills from skill gap get highest priority in early weeks
        ordered_topics = list(topics)
        missing_skills = []
        if context_data and context_data.get("missing_skills"):
            missing_skills = [s.lower() for s in context_data["missing_skills"]]
            ordered_topics.sort(
                key=lambda t: 0 if any(m in t.lower() or t.lower() in m for m in missing_skills) else 1
            )

        skeleton: List[Dict[str, Any]] = []
        sequence_order = 1
        total_days = horizon_weeks * 7

        # Calculate study days per week
        is_study_day = []
        if rest_mode == "weekends_off":
            # Mon-Fri study (days 1-5), Sat-Sun rest (days 6-7)
            is_study_day = [True, True, True, True, True, False, False]
        elif rest_mode == "one_day_off":
            # Mon-Sat study, Sun rest
            is_study_day = [True, True, True, True, True, True, False]
        else:
            # Daily study
            is_study_day = [True] * 7

        topic_idx = 0
        num_topics = len(ordered_topics)

        for day in range(1, total_days + 1):
            week_num = ((day - 1) // 7) + 1
            day_of_week = ((day - 1) % 7) + 1  # 1 to 7

            if not is_study_day[day_of_week - 1]:
                # Scheduled rest/buffer day
                skeleton.append({
                    "sequence_order": sequence_order,
                    "week_number": week_num,
                    "day_number": day,
                    "topic": "Rest & Buffer",
                    "activity_type": "Rest",
                    "duration_minutes": duration_minutes,
                    "priority": "buffer",
                    "is_rest": True,
                })
                sequence_order += 1
                continue

            # Determine topic for this study day
            # Cycle through topics, allocating multiple sessions per topic if horizon allows
            current_topic = ordered_topics[topic_idx % num_topics]
            is_core_gap = any(m in current_topic.lower() for m in missing_skills)

            # Assign activity type based on week rhythm
            # Day 1-2: Learn / Practice; Day 3: Practice; Day 4: Project Work; Day 5: Review/Quiz
            if day_of_week in [1, 2]:
                act_type = "Learn & Practice"
            elif day_of_week == 3:
                act_type = "Practice"
            elif day_of_week == 4:
                act_type = "Project Work"
            else:
                act_type = "Review & Quiz" if include_revision else "Practice"

            priority = "core_gap" if is_core_gap else ("high" if week_num <= 2 else "standard")

            skeleton.append({
                "sequence_order": sequence_order,
                "week_number": week_num,
                "day_number": day,
                "topic": current_topic,
                "activity_type": act_type,
                "duration_minutes": duration_minutes,
                "priority": priority,
                "is_rest": False,
            })

            sequence_order += 1
            # Advance topic index periodically
            if day_of_week in [2, 4]:
                topic_idx += 1

        return skeleton

    @classmethod
    def populate_sessions_deterministically(
        cls, skeleton: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Fills objectives and resource hints from the offline topic catalog.
        Guaranteed zero API dependencies and zero hallucinated text.
        """
        populated_sessions: List[Dict[str, Any]] = []

        for item in skeleton:
            if item.get("is_rest") or item.get("activity_type") == "Rest":
                populated_sessions.append({
                    "sequence_order": item["sequence_order"],
                    "week_number": item["week_number"],
                    "day_number": item["day_number"],
                    "topic": "Rest & Buffer Day",
                    "activity_type": "Rest",
                    "duration_minutes": item["duration_minutes"],
                    "priority": "buffer",
                    "session_objective": "Scheduled rest and buffer day for cognitive recovery or catching up on previous sessions.",
                    "resource_hints": [
                        "Review personal notes or flagged problem sets",
                        "Rest and cognitive recharge",
                        "Flexible buffer for unfinished tasks",
                    ],
                })
                continue

            topic = item["topic"]
            act_type = item["activity_type"]
            curriculum = _get_curriculum_template(topic)

            if act_type == "Learn & Practice":
                obj = curriculum["learn"]
            elif act_type == "Practice":
                obj = curriculum["practice"]
            elif act_type == "Project Work":
                obj = curriculum["project"]
            elif act_type == "Review & Quiz":
                obj = curriculum["review"]
            else:
                obj = f"Hands-on study and application session for {topic}."

            populated_sessions.append({
                "sequence_order": item["sequence_order"],
                "week_number": item["week_number"],
                "day_number": item["day_number"],
                "topic": topic,
                "activity_type": act_type,
                "duration_minutes": item["duration_minutes"],
                "priority": item.get("priority", "standard"),
                "session_objective": obj,
                "resource_hints": curriculum["resources"],
            })

        return populated_sessions

    @classmethod
    def generate_plan_sessions(
        cls,
        goal: str,
        topics: List[str],
        daily_hours: float,
        horizon_weeks: int,
        study_preferences: Optional[Dict[str, Any]] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Dual-Engine Coordinator:
        1. Builds mathematically locked schedule skeleton.
        2. Tries Gemini AI to enrich session objectives and resource hints.
        3. If Gemini is unavailable or fails, falls back seamlessly to deterministic catalog.
        Returns (sessions_list, generation_mode).
        """
        skeleton = cls.build_schedule_skeleton(
            topics, daily_hours, horizon_weeks, study_preferences, context_data
        )

        # Attempt Gemini AI generation if configured
        if ai_service.is_configured():
            try:
                ai_sessions = ai_service.generate_study_plan_prompt(
                    goal=goal,
                    topics=topics,
                    daily_hours=daily_hours,
                    horizon_weeks=horizon_weeks,
                    study_preferences=study_preferences or {},
                    context_data=context_data,
                    schedule_skeleton=skeleton,
                )

                if ai_sessions and isinstance(ai_sessions, list) and len(ai_sessions) == len(skeleton):
                    # Validate and merge AI objectives while preserving locked skeleton numbers
                    merged = []
                    for idx, skel_item in enumerate(skeleton):
                        ai_item = ai_sessions[idx] if idx < len(ai_sessions) else {}
                        obj = ai_item.get("session_objective") or ""
                        hints = ai_item.get("resource_hints") or []
                        if not obj or len(hints) == 0:
                            # Fall back on catalog if AI item is incomplete
                            cat = _get_curriculum_template(skel_item["topic"])
                            obj = cat["learn"]
                            hints = cat["resources"]

                        merged.append({
                            "sequence_order": skel_item["sequence_order"],
                            "week_number": skel_item["week_number"],
                            "day_number": skel_item["day_number"],
                            "topic": skel_item["topic"],
                            "activity_type": skel_item["activity_type"],
                            "duration_minutes": skel_item["duration_minutes"],
                            "priority": skel_item["priority"],
                            "session_objective": obj,
                            "resource_hints": hints,
                        })
                    return merged, "gemini_ai"
            except Exception as e:
                logger.warning(f"AI generation failed, using deterministic catalog fallback: {e}")

        # Deterministic Catalog Fallback
        sessions = cls.populate_sessions_deterministically(skeleton)
        return sessions, "deterministic_engine"

    @classmethod
    def create_plan_transactional(
        cls,
        user_id: Optional[int],
        goal: str,
        topics: List[str],
        daily_hours: float,
        horizon_weeks: int,
        study_preferences: Optional[Dict[str, Any]] = None,
        context_source: str = "custom",
        skill_gap_id: Optional[int] = None,
        interview_session_id: Optional[int] = None,
        resume_id: Optional[int] = None,
        parent_plan_id: Optional[int] = None,
        version: int = 1,
    ) -> Dict[str, Any]:
        """
        Creates a new study plan and its sessions within a single transactional boundary.
        If parent_plan_id is supplied, archives the previous plan (is_active = 0).
        Rolls back completely on failure.
        """
        is_valid, err = cls.validate_plan_parameters(
            goal, topics, daily_hours, horizon_weeks, study_preferences
        )
        if not is_valid:
            raise ValueError(err)

        context_data = cls._resolve_context(
            context_source, skill_gap_id, interview_session_id, resume_id, user_id=user_id
        )

        sessions, gen_mode = cls.generate_plan_sessions(
            goal=goal,
            topics=topics,
            daily_hours=daily_hours,
            horizon_weeks=horizon_weeks,
            study_preferences=study_preferences,
            context_data=context_data,
        )

        total_sessions = len(sessions)
        study_sessions_only = [s for s in sessions if s.get("activity_type") != "Rest"]
        total_hours = round(sum(s["duration_minutes"] for s in study_sessions_only) / 60.0, 1)

        title = f"{goal} • {horizon_weeks} Week Roadmap"

        summary = {
            "total_weeks": horizon_weeks,
            "total_days": horizon_weeks * 7,
            "study_sessions_count": len(study_sessions_only),
            "rest_days_count": total_sessions - len(study_sessions_only),
            "total_planned_hours": total_hours,
            "weekly_hours": round(total_hours / horizon_weeks, 1),
            "topics": topics,
        }

        db = get_db()
        cursor = db.cursor()

        try:
            # If this is a regeneration/new version, archive the parent plan
            if parent_plan_id:
                cursor.execute(
                    "UPDATE study_plans SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                    (parent_plan_id,),
                )

            import datetime
            target_date_val = (
                datetime.date.today() + datetime.timedelta(days=horizon_weeks * 7)
            ).isoformat()

            # Insert new master plan
            cursor.execute(
                """
                INSERT INTO study_plans (
                    user_id, parent_plan_id, version, title, goal, topics_json,
                    subjects_json, target_date,
                    context_source, skill_gap_id, interview_session_id, resume_id,
                    daily_hours, horizon_weeks, study_preferences_json,
                    total_sessions, total_hours, completed_sessions,
                    generation_mode, plan_summary_json, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1);
                """,
                (
                    user_id,
                    parent_plan_id,
                    version,
                    title,
                    goal,
                    json.dumps(topics),
                    json.dumps(topics),
                    target_date_val,
                    context_source,
                    skill_gap_id,
                    interview_session_id,
                    resume_id,
                    daily_hours,
                    horizon_weeks,
                    json.dumps(study_preferences or {}),
                    total_sessions,
                    total_hours,
                    gen_mode,
                    json.dumps(summary),
                ),
            )
            plan_id = cursor.lastrowid

            # Insert granular study sessions
            for s in sessions:
                cursor.execute(
                    """
                    INSERT INTO study_sessions (
                        plan_id, week_number, day_number, sequence_order,
                        topic, session_objective, activity_type,
                        duration_minutes, priority, resource_hints_json,
                        is_completed
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
                    """,
                    (
                        plan_id,
                        s["week_number"],
                        s["day_number"],
                        s["sequence_order"],
                        s["topic"],
                        s["session_objective"],
                        s["activity_type"],
                        s["duration_minutes"],
                        s.get("priority", "standard"),
                        json.dumps(s.get("resource_hints", [])),
                    ),
                )

            db.commit()
            return cls.get_plan_by_id(plan_id, user_id=user_id)

        except Exception as ex:
            db.rollback()
            logger.error(f"Transaction failed in create_plan_transactional: {ex}")
            raise ex

    @classmethod
    def regenerate_plan_transactional(
        cls,
        plan_id: int,
        daily_hours: Optional[float] = None,
        horizon_weeks: Optional[int] = None,
        topics: Optional[List[str]] = None,
        study_preferences: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Transactional versioned regeneration:
        1. Retrieves parent plan.
        2. Merges updated parameters or uses existing.
        3. Creates a new version (version = parent.version + 1, parent_plan_id = plan_id).
        4. Archives parent plan (is_active = 0).
        5. Preserves historical sessions in parent plan.
        6. Rolls back on any failure.
        """
        parent = cls.get_plan_by_id(plan_id, user_id=user_id)
        if not parent:
            raise ValueError(f"Plan with id {plan_id} not found.")

        new_hours = daily_hours if daily_hours is not None else parent["daily_hours"]
        new_horizon = horizon_weeks if horizon_weeks is not None else parent["horizon_weeks"]
        new_topics = topics if topics is not None else parent["topics"]
        new_prefs = study_preferences if study_preferences is not None else parent.get("study_preferences", {})
        new_version = (parent.get("version") or 1) + 1

        return cls.create_plan_transactional(
            user_id=parent.get("user_id"),
            goal=parent["goal"],
            topics=new_topics,
            daily_hours=new_hours,
            horizon_weeks=new_horizon,
            study_preferences=new_prefs,
            context_source=parent["context_source"],
            skill_gap_id=parent.get("skill_gap_id"),
            interview_session_id=parent.get("interview_session_id"),
            resume_id=parent.get("resume_id"),
            parent_plan_id=plan_id,
            version=new_version,
        )

    @staticmethod
    def toggle_session_completion(plan_id: int, session_id: int, is_completed: bool, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Atomically toggles a study session's completion state and recalculates plan totals.
        """
        db = get_db()
        cursor = db.cursor()

        if user_id is not None:
            cursor.execute("SELECT id FROM study_plans WHERE id = ? AND user_id = ?;", (plan_id, user_id))
            if not cursor.fetchone():
                raise ValueError(f"Plan {plan_id} not found or access denied for this user.")
        else:
            cursor.execute("SELECT id FROM study_plans WHERE id = ? AND user_id IS NULL;", (plan_id,))
            if not cursor.fetchone():
                raise ValueError(f"Plan {plan_id} not found or access denied.")

        cursor.execute(
            "SELECT id, plan_id FROM study_sessions WHERE id = ? AND plan_id = ?;",
            (session_id, plan_id),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Session {session_id} not found in plan {plan_id}.")

        completed_val = 1 if is_completed else 0
        cursor.execute(
            """
            UPDATE study_sessions
            SET is_completed = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id = ? AND plan_id = ?;
            """,
            (completed_val, completed_val, session_id, plan_id),
        )

        # Recalculate plan completion
        cursor.execute(
            "SELECT COUNT(*) FROM study_sessions WHERE plan_id = ? AND is_completed = 1 AND activity_type != 'Rest';",
            (plan_id,),
        )
        completed_count = cursor.fetchone()[0]

        cursor.execute(
            "UPDATE study_plans SET completed_sessions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
            (completed_count, plan_id),
        )

        db.commit()

        # Fetch updated session row
        cursor.execute("SELECT * FROM study_sessions WHERE id = ?;", (session_id,))
        sess_row = cursor.fetchone()

        return {
            "session": {
                "id": sess_row["id"],
                "plan_id": sess_row["plan_id"],
                "week_number": sess_row["week_number"],
                "day_number": sess_row["day_number"],
                "sequence_order": sess_row["sequence_order"],
                "topic": sess_row["topic"],
                "session_objective": sess_row["session_objective"],
                "activity_type": sess_row["activity_type"],
                "duration_minutes": sess_row["duration_minutes"],
                "priority": sess_row["priority"],
                "resource_hints": json.loads(sess_row["resource_hints_json"] or "[]"),
                "is_completed": bool(sess_row["is_completed"]),
                "completed_at": sess_row["completed_at"],
            },
            "plan_completed_sessions": completed_count,
        }

    @classmethod
    def get_plan_by_id(cls, plan_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Retrieves a full study plan with organized sessions and metrics."""
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM study_plans WHERE id = ?;", (plan_id,))
        plan_row = cursor.fetchone()
        if not plan_row:
            return None

        if user_id is not None:
            if plan_row["user_id"] != user_id:
                return None
        else:
            if plan_row["user_id"] is not None:
                return None

        cursor.execute(
            "SELECT * FROM study_sessions WHERE plan_id = ? ORDER BY sequence_order ASC;",
            (plan_id,),
        )
        session_rows = cursor.fetchall()

        sessions = []
        for r in session_rows:
            sessions.append({
                "id": r["id"],
                "plan_id": r["plan_id"],
                "week_number": r["week_number"],
                "day_number": r["day_number"],
                "sequence_order": r["sequence_order"],
                "topic": r["topic"],
                "session_objective": r["session_objective"],
                "activity_type": r["activity_type"],
                "duration_minutes": r["duration_minutes"],
                "priority": r["priority"],
                "resource_hints": json.loads(r["resource_hints_json"] or "[]"),
                "is_completed": bool(r["is_completed"]),
                "completed_at": r["completed_at"],
            })

        topics = json.loads(plan_row["topics_json"] or "[]")
        summary = json.loads(plan_row["plan_summary_json"] or "{}")
        prefs = json.loads(plan_row["study_preferences_json"] or "{}")

        # Determine next actionable session (first uncompleted non-rest session)
        next_session = None
        for s in sessions:
            if not s["is_completed"] and s["activity_type"] != "Rest":
                next_session = s
                break

        # Calculate progress percentage against non-rest study sessions
        study_sessions = [s for s in sessions if s["activity_type"] != "Rest"]
        total_study_count = len(study_sessions)
        completed_study_count = sum(1 for s in study_sessions if s["is_completed"])
        progress_percentage = (
            round((completed_study_count / total_study_count) * 100, 1)
            if total_study_count > 0
            else 0.0
        )

        return {
            "id": plan_row["id"],
            "user_id": plan_row["user_id"],
            "parent_plan_id": plan_row["parent_plan_id"],
            "version": plan_row["version"] or 1,
            "title": plan_row["title"],
            "goal": plan_row["goal"],
            "topics": topics,
            "context_source": plan_row["context_source"],
            "skill_gap_id": plan_row["skill_gap_id"],
            "interview_session_id": plan_row["interview_session_id"],
            "resume_id": plan_row["resume_id"],
            "daily_hours": plan_row["daily_hours"],
            "horizon_weeks": plan_row["horizon_weeks"],
            "study_preferences": prefs,
            "total_sessions": plan_row["total_sessions"],
            "total_hours": plan_row["total_hours"],
            "completed_sessions": completed_study_count,
            "total_study_sessions": total_study_count,
            "progress_percentage": progress_percentage,
            "generation_mode": plan_row["generation_mode"],
            "generation_mode_label": (
                "AI-Generated"
                if plan_row["generation_mode"] == "gemini_ai"
                else "Offline Curriculum Engine"
            ),
            "plan_summary": summary,
            "is_active": bool(plan_row["is_active"]),
            "created_at": plan_row["created_at"],
            "updated_at": plan_row["updated_at"],
            "next_session": next_session,
            "sessions": sessions,
        }

    @staticmethod
    def get_plan_history(limit: int = 20, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieves past study plans with high-level progress statistics."""
        db = get_db()
        cursor = db.cursor()

        if user_id is not None:
            cursor.execute(
                """
                SELECT p.*,
                    (SELECT COUNT(*) FROM study_sessions s WHERE s.plan_id = p.id AND s.activity_type != 'Rest') as total_study_sessions,
                    (SELECT COUNT(*) FROM study_sessions s WHERE s.plan_id = p.id AND s.is_completed = 1 AND s.activity_type != 'Rest') as completed_study_sessions
                FROM study_plans p
                WHERE p.user_id = ?
                ORDER BY p.id DESC
                LIMIT ?;
                """,
                (user_id, limit),
            )
        else:
            cursor.execute(
                """
                SELECT p.*,
                    (SELECT COUNT(*) FROM study_sessions s WHERE s.plan_id = p.id AND s.activity_type != 'Rest') as total_study_sessions,
                    (SELECT COUNT(*) FROM study_sessions s WHERE s.plan_id = p.id AND s.is_completed = 1 AND s.activity_type != 'Rest') as completed_study_sessions
                FROM study_plans p
                WHERE p.user_id IS NULL
                ORDER BY p.id DESC
                LIMIT ?;
                """,
                (limit,),
            )
        rows = cursor.fetchall()

        history = []
        for r in rows:
            total_s = r["total_study_sessions"] or 0
            completed_s = r["completed_study_sessions"] or 0
            pct = round((completed_s / total_s) * 100, 1) if total_s > 0 else 0.0

            history.append({
                "id": r["id"],
                "parent_plan_id": r["parent_plan_id"],
                "version": r["version"] or 1,
                "title": r["title"],
                "goal": r["goal"],
                "topics": json.loads(r["topics_json"] or "[]"),
                "context_source": r["context_source"],
                "daily_hours": r["daily_hours"],
                "horizon_weeks": r["horizon_weeks"],
                "total_hours": r["total_hours"],
                "target_date": r["target_date"],
                "total_study_sessions": total_s,
                "completed_study_sessions": completed_s,
                "progress_percentage": pct,
                "generation_mode": r["generation_mode"],
                "generation_mode_label": (
                    "AI-Generated"
                    if r["generation_mode"] == "gemini_ai"
                    else "Offline Curriculum Engine"
                ),
                "is_active": bool(r["is_active"]),
                "created_at": r["created_at"],
            })

        return history

    @staticmethod
    def get_context_summary(user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Retrieves available verified context from Skill Gap, Interview, and Resume tables
        for seamless cross-module calibration. Returns real data or None/empty indicators.
        """
        db = get_db()
        cursor = db.cursor()

        # 1. Latest Skill Gap Evaluation
        if user_id is not None:
            cursor.execute(
                """
                SELECT id, target_role, missing_skills, adjacent_skills, core_coverage, created_at
                FROM skill_evaluations
                WHERE user_id = ?
                ORDER BY id DESC LIMIT 1;
                """,
                (user_id,),
            )
        else:
            cursor.execute(
                """
                SELECT id, target_role, missing_skills, adjacent_skills, core_coverage, created_at
                FROM skill_evaluations
                WHERE user_id IS NULL
                ORDER BY id DESC LIMIT 1;
                """
            )
        sg_row = cursor.fetchone()
        skill_gap_context = None
        if sg_row:
            raw_missing = json.loads(sg_row["missing_skills"] or "[]")
            missing_names = [
                m["name"] if isinstance(m, dict) else str(m) for m in raw_missing
            ]
            raw_adjacent = json.loads(sg_row["adjacent_skills"] or "[]")

            skill_gap_context = {
                "id": sg_row["id"],
                "target_role": sg_row["target_role"],
                "missing_skills": missing_names,
                "adjacent_skills": raw_adjacent,
                "core_coverage": sg_row["core_coverage"],
                "created_at": sg_row["created_at"],
            }

        # 2. Latest Interview Session
        if user_id is not None:
            cursor.execute(
                """
                SELECT id, target_role, difficulty, question_focus, selected_skills, created_at
                FROM interview_sessions
                WHERE user_id = ?
                ORDER BY id DESC LIMIT 1;
                """,
                (user_id,),
            )
        else:
            cursor.execute(
                """
                SELECT id, target_role, difficulty, question_focus, selected_skills, created_at
                FROM interview_sessions
                WHERE user_id IS NULL
                ORDER BY id DESC LIMIT 1;
                """
            )
        int_row = cursor.fetchone()
        interview_context = None
        if int_row:
            interview_context = {
                "id": int_row["id"],
                "target_role": int_row["target_role"],
                "difficulty": int_row["difficulty"],
                "question_focus": int_row["question_focus"],
                "selected_skills": json.loads(int_row["selected_skills"] or "[]"),
                "created_at": int_row["created_at"],
            }

        # 3. Latest Resume Record
        if user_id is not None:
            cursor.execute(
                """
                SELECT id, filename, score, extracted_skills, created_at
                FROM resumes
                WHERE user_id = ?
                ORDER BY id DESC LIMIT 1;
                """,
                (user_id,),
            )
        else:
            cursor.execute(
                """
                SELECT id, filename, score, extracted_skills, created_at
                FROM resumes
                WHERE user_id IS NULL
                ORDER BY id DESC LIMIT 1;
                """
            )
        res_row = cursor.fetchone()
        resume_context = None
        if res_row:
            resume_context = {
                "id": res_row["id"],
                "filename": res_row["filename"],
                "score": res_row["score"],
                "extracted_skills": json.loads(res_row["extracted_skills"] or "[]"),
                "created_at": res_row["created_at"],
            }

        return {
            "skill_gap": skill_gap_context,
            "interview": interview_context,
            "resume": resume_context,
        }

    @classmethod
    def _resolve_context(
        cls,
        context_source: str,
        skill_gap_id: Optional[int],
        interview_session_id: Optional[int],
        resume_id: Optional[int],
        user_id: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """Resolves specific database records into a clean context dictionary."""
        db = get_db()
        cursor = db.cursor()

        if context_source == "skill_gap":
            if skill_gap_id:
                if user_id is not None:
                    cursor.execute(
                        "SELECT * FROM skill_evaluations WHERE id = ? AND user_id = ?;", (skill_gap_id, user_id)
                    )
                else:
                    cursor.execute(
                        "SELECT * FROM skill_evaluations WHERE id = ? AND user_id IS NULL;", (skill_gap_id,)
                    )
                row = cursor.fetchone()
                if not row:
                    raise ValueError(f"Skill Gap ID {skill_gap_id} was not found in database history for this user.")
            else:
                if user_id is not None:
                    cursor.execute(
                        "SELECT * FROM skill_evaluations WHERE user_id = ? ORDER BY id DESC LIMIT 1;", (user_id,)
                    )
                else:
                    cursor.execute(
                        "SELECT * FROM skill_evaluations WHERE user_id IS NULL ORDER BY id DESC LIMIT 1;"
                    )
                row = cursor.fetchone()
            if row:
                raw_missing = json.loads(row["missing_skills"] or "[]")
                missing_names = [
                    m["name"] if isinstance(m, dict) else str(m) for m in raw_missing
                ]
                return {
                    "source": "skill_gap",
                    "target_role": row["target_role"],
                    "missing_skills": missing_names,
                    "adjacent_skills": json.loads(row["adjacent_skills"] or "[]"),
                    "core_coverage": row["core_coverage"],
                }

        elif context_source == "interview":
            if interview_session_id:
                if user_id is not None:
                    cursor.execute(
                        "SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?;",
                        (interview_session_id, user_id),
                    )
                else:
                    cursor.execute(
                        "SELECT * FROM interview_sessions WHERE id = ? AND user_id IS NULL;",
                        (interview_session_id,),
                    )
                row = cursor.fetchone()
                if not row:
                    raise ValueError(f"Interview session ID {interview_session_id} was not found in database history for this user.")
            else:
                if user_id is not None:
                    cursor.execute(
                        "SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1;", (user_id,)
                    )
                else:
                    cursor.execute(
                        "SELECT * FROM interview_sessions WHERE user_id IS NULL ORDER BY id DESC LIMIT 1;"
                    )
                row = cursor.fetchone()
            if row:
                return {
                    "source": "interview",
                    "target_role": row["target_role"],
                    "difficulty": row["difficulty"],
                    "question_focus": row["question_focus"],
                    "selected_skills": json.loads(row["selected_skills"] or "[]"),
                }

        elif context_source == "resume":
            if resume_id:
                if user_id is not None:
                    cursor.execute("SELECT * FROM resumes WHERE id = ? AND user_id = ?;", (resume_id, user_id))
                else:
                    cursor.execute("SELECT * FROM resumes WHERE id = ? AND user_id IS NULL;", (resume_id,))
                row = cursor.fetchone()
                if not row:
                    raise ValueError(f"Resume ID {resume_id} was not found in database history for this user.")
            else:
                if user_id is not None:
                    cursor.execute("SELECT * FROM resumes WHERE user_id = ? ORDER BY id DESC LIMIT 1;", (user_id,))
                else:
                    cursor.execute("SELECT * FROM resumes WHERE user_id IS NULL ORDER BY id DESC LIMIT 1;")
                row = cursor.fetchone()
            if row:
                return {
                    "source": "resume",
                    "filename": row["filename"],
                    "extracted_skills": json.loads(row["extracted_skills"] or "[]"),
                }

        return None
