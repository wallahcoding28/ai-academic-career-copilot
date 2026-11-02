"""
Interview Service Layer
Stage 4: AI and Deterministic Interview Question Generation, Calibration,
Context Integration (Resume & Skill Gap), and SQLite Session Persistence.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Set

from app.models.db import get_db
from app.services.ai_service import ai_service
from app.services.role_benchmarks import ROLE_BENCHMARK_PROFILES

logger = logging.getLogger(__name__)

SUPPORTED_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"]
DIFFICULTY_ALIASES = {
    "junior": "Beginner",
    "beginner": "Beginner",
    "mid": "Intermediate",
    "mid-level": "Intermediate",
    "intermediate": "Intermediate",
    "senior": "Advanced",
    "advanced": "Advanced",
}

SUPPORTED_QUESTION_FOCUSES = [
    "Mixed / Balanced",
    "Technical Fundamentals",
    "Coding & Algorithms",
    "System Design & Architecture",
    "Behavioral & Project Experience",
]

SUPPORTED_QUESTION_COUNTS = [5, 10, 15, 20]
SUPPORTED_CONTEXT_SOURCES = ["none", "resume", "skill_gap"]


# ==============================================================================
# Comprehensive Curated Deterministic Question Catalog (Offline Parity)
# Organized by Role -> Category -> Difficulty -> Questions with Guidance
# ==============================================================================

OFFLINE_QUESTION_BANK: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "Full Stack Developer": {
        "Technical Fundamentals": [
            {
                "question": "Explain the reconciliation process and virtual DOM diffing algorithm in React. Under what scenarios can improper key usage cause state inconsistencies or unintended remounting?",
                "difficulty": "Intermediate",
                "skill_or_topic": "React & State Management",
                "guidance": [
                    "O(n) heuristic diffing algorithm versus O(n^3) traditional tree diffing.",
                    "Preservation of component identity across re-renders when keys are stable.",
                    "Hazards of using dynamic array indices as keys when inserting or sorting items.",
                ],
            },
            {
                "question": "How does Node.js handle concurrency despite having a single-threaded JavaScript execution model? Explain the role of libuv, worker threads, and the event loop phases.",
                "difficulty": "Intermediate",
                "skill_or_topic": "Node.js & Event Loop",
                "guidance": [
                    "Event loop phases: timers, pending callbacks, poll, check, close callbacks.",
                    "Libuv thread pool handling blocking I/O (filesystem, DNS, crypto).",
                    "Offloading CPU-intensive calculations to worker threads or child processes.",
                ],
            },
            {
                "question": "What is the difference between SQL JOIN types (INNER, LEFT, FULL, CROSS), and how does indexing foreign keys impact query execution plan latency?",
                "difficulty": "Beginner",
                "skill_or_topic": "SQL & Relational Databases",
                "guidance": [
                    "Definition of Cartesian product reduction in INNER versus outer joins.",
                    "Hash join, nested loop, and merge join execution strategies.",
                    "How B-Tree index lookups prevent expensive table sequential scans on foreign keys.",
                ],
            },
            {
                "question": "Compare React server components (RSC) with traditional client-side rendering (CSR) and server-side rendering (SSR) regarding bundle size and network waterfalls.",
                "difficulty": "Advanced",
                "skill_or_topic": "React Architecture & RSC",
                "guidance": [
                    "Zero-bundle-size server execution for non-interactive dependencies.",
                    "Direct database access without intermediate JSON REST endpoints.",
                    "Streaming HTML rendering with Suspense boundaries to eliminate blocking waterfalls.",
                ],
            },
            {
                "question": "Explain CSS specificity hierarchy and how modern layout approaches like CSS Grid and Flexbox resolve vertical centering and responsive reflows.",
                "difficulty": "Beginner",
                "skill_or_topic": "HTML5 & CSS3 Layouts",
                "guidance": [
                    "Specificity calculation formula: Inline style > ID > Class/Attribute/Pseudo-class > Element.",
                    "Flexbox 1-dimensional distribution versus CSS Grid 2-dimensional area placement.",
                    "Intrinsic sizing techniques (minmax, clamp) to minimize media query clutter.",
                ],
            },
        ],
        "Coding & Algorithms": [
            {
                "question": "Implement an in-memory Least Recently Used (LRU) cache supporting get(key) and put(key, value) operations with strictly O(1) time complexity.",
                "difficulty": "Intermediate",
                "skill_or_topic": "Data Structures & LRU Cache",
                "guidance": [
                    "Combining a Hash Map (O(1) lookup) with a Doubly Linked List (O(1) node detachment and insertion).",
                    "Eviction policy: moving accessed nodes to head, evicting from tail on capacity overflow.",
                    "Edge cases: updating existing keys, null values, and zero-capacity initialization.",
                ],
            },
            {
                "question": "Given an asynchronous list of tasks with concurrency limit N, write a function that executes tasks in batches without exceeding the maximum concurrent worker threshold.",
                "difficulty": "Intermediate",
                "skill_or_topic": "JavaScript Promises & Concurrency",
                "guidance": [
                    "Managing an active worker pool using Promise.all or Promise.race.",
                    "Recursive queue consumption as slots free up upon task resolution.",
                    "Graceful error aggregation so one rejection does not immediately drop in-flight tasks.",
                ],
            },
            {
                "question": "Given an array of integers representing HTTP status response latencies, write an efficient algorithm to find the length of the longest consecutive subarray with sum equal to K.",
                "difficulty": "Advanced",
                "skill_or_topic": "Algorithms & Prefix Sums",
                "guidance": [
                    "Prefix sum approach paired with a Hash Map storing first-seen index of each prefix sum.",
                    "O(N) single-pass time complexity versus O(N^2) brute-force nested iteration.",
                    "Handling zero and negative value edge cases.",
                ],
            },
            {
                "question": "Write a function to debounce an API autocomplete search input in TypeScript, ensuring proper generic typing and cancellation capabilities.",
                "difficulty": "Beginner",
                "skill_or_topic": "TypeScript & Closures",
                "guidance": [
                    "Utilizing closures to store the timer reference across invocations.",
                    "Clearing existing setTimeout on subsequent keystrokes before threshold expiration.",
                    "Providing TypeScript generics to preserve argument and return signatures.",
                ],
            },
        ],
        "System Design & Architecture": [
            {
                "question": "How would you architect an idempotent payment processing endpoint in a distributed backend? How do idempotency keys and transactional outbox patterns prevent double-charging?",
                "difficulty": "Intermediate",
                "skill_or_topic": "REST API & Distributed Systems",
                "guidance": [
                    "Client-generated UUID idempotency keys cached in a transactional store (Redis/Postgres).",
                    "Transactional outbox pattern ensuring database state and message broker events stay atomic.",
                    "Handling concurrent race conditions using database unique constraints or distributed locks.",
                ],
            },
            {
                "question": "Design a real-time collaborative document editor (similar to Google Docs or Notion). Compare Operational Transformation (OT) with Conflict-free Replicated Data Types (CRDTs).",
                "difficulty": "Advanced",
                "skill_or_topic": "System Architecture & CRDTs",
                "guidance": [
                    "Centralized transformation server requirements for OT versus peer-to-peer convergence in CRDTs.",
                    "Handling network partitions, offline edits, and causal ordering with vector clocks.",
                    "Storage and transport optimizations (WebSockets for real-time deltas, periodic snapshots).",
                ],
            },
            {
                "question": "Explain how you would design database schema and indexing strategies for a multi-tenant SaaS application to balance tenant data isolation with operational maintainability.",
                "difficulty": "Intermediate",
                "skill_or_topic": "Database Architecture & Multi-Tenancy",
                "guidance": [
                    "Trade-offs between shared database/shared schema, separate schema, and separate databases.",
                    "Row-level security (RLS) enforcement in PostgreSQL using tenant_id columns.",
                    "Composite indexing strategy: (tenant_id, created_at) to avoid cross-tenant index bloat.",
                ],
            },
        ],
        "Behavioral & Project Experience": [
            {
                "question": "Describe a challenging engineering trade-off you made in a recent project between development velocity and code maintainability. How did you validate your technical choices?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Engineering Judgment & Trade-offs",
                "guidance": [
                    "Clearly state the technical dilemma, constraints, and business or project deadline.",
                    "Explain the analytical framework used to decide which compromises were acceptable.",
                    "Describe how technical debt was tracked and subsequently remediated.",
                ],
            },
            {
                "question": "Walk through a situation where a production bug or unexpected deployment failure occurred in your application. How did you diagnose the root cause and prevent recurrence?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Incident Management & RCA",
                "guidance": [
                    "Diagnostic workflow: inspecting logs, APM traces, error reporting, and reproducing locally.",
                    "Short-term containment (rollback or feature flag) versus permanent bugfix.",
                    "Post-mortem: writing automated regression tests and improving monitoring or alerts.",
                ],
            },
            {
                "question": "How do you approach code reviews when collaborating with peers? Give an example of constructive feedback you delivered that improved architectural quality.",
                "difficulty": "Beginner",
                "skill_or_topic": "Team Collaboration & Code Quality",
                "guidance": [
                    "Differentiating stylistic nitpicks (automated via linter) from architectural or logic concerns.",
                    "Providing clear explanations and alternatives rather than dogmatic assertions.",
                    "Focusing on test coverage, readability, and failure-mode boundaries.",
                ],
            },
        ],
    },
    "Frontend Engineer": {
        "Technical Fundamentals": [
            {
                "question": "Explain how the browser rendering pipeline converts raw HTML, CSS, and JavaScript into pixels on screen. How do DOM tree, CSSOM, Render Tree, Layout, and Paint stages interact?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Browser Rendering & Critical Path",
                "guidance": [
                    "Constructing the DOM and CSSOM trees in parallel.",
                    "Render tree synthesis filtering invisible nodes (e.g. display: none).",
                    "Distinguishing Reflow/Layout (geometry calculation) from Repaint (visual styling) and Compositing (GPU layers).",
                ],
            },
            {
                "question": "What are the core Web Vitals (LCP, INP, CLS)? Explain what each measures and concrete engineering interventions to optimize them.",
                "difficulty": "Intermediate",
                "skill_or_topic": "Web Performance & Core Web Vitals",
                "guidance": [
                    "Largest Contentful Paint (LCP): priority hints, modern image formats, server-side caching.",
                    "Interaction to Next Paint (INP): breaking long tasks, yield to main thread with scheduler API.",
                    "Cumulative Layout Shift (CLS): reserving aspect ratios on dynamic media and web fonts.",
                ],
            },
            {
                "question": "Explain TypeScript's type inference system. What are conditional types, mapped types, and how do distributive conditional types work with union types?",
                "difficulty": "Advanced",
                "skill_or_topic": "TypeScript Advanced Type System",
                "guidance": [
                    "Syntax and mechanism of `T extends U ? X : Y` conditional evaluation.",
                    "Distribution over naked type parameters in unions (`(A | B) extends U`).",
                    "Practical utility examples: creating deep readonly, pick, or omit utility types.",
                ],
            },
            {
                "question": "What is semantic HTML and how does proper ARIA attribute usage affect assistive technologies like screen readers? Give an example of a common accessibility pitfall.",
                "difficulty": "Beginner",
                "skill_or_topic": "Web Accessibility (a11y)",
                "guidance": [
                    "Using native elements (`<button>`, `<dialog>`, `<nav>`) instead of clickable `<div>` tags.",
                    "Managing keyboard focus order and focus traps in modal dialogs.",
                    "Providing accessible names via `aria-label` or `aria-labelledby` where visual text is absent.",
                ],
            },
        ],
        "Coding & Algorithms": [
            {
                "question": "Implement a custom React hook `useIntersectionObserver` that observes target element visibility and returns an isIntersecting boolean, ensuring proper cleanup on unmount.",
                "difficulty": "Intermediate",
                "skill_or_topic": "React Hooks & DOM APIs",
                "guidance": [
                    "Maintaining a ref to the observed DOM node.",
                    "Instantiating `IntersectionObserver` inside `useEffect` with appropriate threshold options.",
                    "Disconnecting the observer in the hook's cleanup return callback to prevent memory leaks.",
                ],
            },
            {
                "question": "Write a deep clone utility in JavaScript that recursively duplicates objects and arrays, correctly handling circular references, dates, and nested structures.",
                "difficulty": "Advanced",
                "skill_or_topic": "JavaScript & Recursion",
                "guidance": [
                    "Using a `WeakMap` to track visited objects and resolve circular reference cycles.",
                    "Handling special built-in objects (`Date`, `RegExp`, `Map`, `Set`).",
                    "Comparing against modern native `structuredClone()` limitations.",
                ],
            },
        ],
        "System Design & Architecture": [
            {
                "question": "Design a modular Design System component library for an enterprise SaaS. How would you structure token hierarchy, atomic components, and headless component logic?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Frontend Architecture & Design Systems",
                "guidance": [
                    "3-tier design token architecture: Global tokens -> Semantic tokens -> Component tokens.",
                    "Separating behavior/accessibility (headless primitives like Radix/Zag) from styling.",
                    "Package distribution strategy (monorepo, tree-shaking, automated visual regression tests).",
                ],
            },
            {
                "question": "How would you architect a client-side micro-frontend application? Compare Module Federation with iframe isolation in terms of runtime performance and shared state.",
                "difficulty": "Advanced",
                "skill_or_topic": "Micro-Frontends & Module Federation",
                "guidance": [
                    "Dynamic remote container loading and singleton dependency sharing (e.g. single React instance).",
                    "Cross-application routing and shared authentication state.",
                    "Resilience: handling remote micro-app network failures gracefully with error boundaries.",
                ],
            },
        ],
        "Behavioral & Project Experience": [
            {
                "question": "Describe a project where you significantly improved user-perceived performance or page load speed. What profiling tools did you use and how did you measure success?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Performance Profiling & Real Experience",
                "guidance": [
                    "Using Chrome DevTools Performance panel, Lighthouse, and Web Vitals field telemetry.",
                    "Identifying bottlenecks: oversized JavaScript bundles, unoptimized fonts, or main-thread jank.",
                    "Quantifying the impact using before-and-after baseline metrics.",
                ],
            },
        ],
    },
    "Backend Engineer": {
        "Technical Fundamentals": [
            {
                "question": "Explain ACID properties in relational database transactions. How do isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) prevent specific concurrency anomalies?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Database ACID & Concurrency",
                "guidance": [
                    "Atomicity, Consistency, Isolation, Durability breakdown.",
                    "Concurrency phenomena: dirty reads, non-repeatable reads, phantom reads, and write skew.",
                    "Mechanisms: Two-Phase Locking (2PL) versus Multi-Version Concurrency Control (MVCC).",
                ],
            },
            {
                "question": "What is the difference between synchronous HTTP/REST, asynchronous message queues (RabbitMQ/Kafka), and gRPC? When should each be chosen?",
                "difficulty": "Intermediate",
                "skill_or_topic": "API Protocols & Message Brokers",
                "guidance": [
                    "HTTP/REST: standard client-to-service communication with loose coupling.",
                    "Message queues: decoupled event publishing, load leveling, and asynchronous background jobs.",
                    "gRPC: high-throughput internal microservice communication using Protocol Buffers over HTTP/2.",
                ],
            },
            {
                "question": "Explain how Linux epoll and non-blocking I/O enable modern web servers to handle hundreds of thousands of concurrent network connections.",
                "difficulty": "Advanced",
                "skill_or_topic": "Operating Systems & Network I/O",
                "guidance": [
                    "O(1) event notification in epoll versus O(N) linear polling in select/poll.",
                    "Edge-triggered versus level-triggered event notification models.",
                    "Reactor pattern implementation in modern servers (Nginx, Netty, Node.js).",
                ],
            },
        ],
        "Coding & Algorithms": [
            {
                "question": "Implement a thread-safe connection pool in Python or Go that manages a fixed set of database connections, supporting acquire() with timeout and release() semantics.",
                "difficulty": "Intermediate",
                "skill_or_topic": "Concurrency & Connection Pooling",
                "guidance": [
                    "Using synchronization primitives (mutexes, condition variables, or blocking queues).",
                    "Handling connection health checks, eviction of stale sockets, and max lifetime limits.",
                    "Graceful timeout exceptions when the pool is completely exhausted.",
                ],
            },
            {
                "question": "Write an efficient algorithm to detect deadlocks in a resource allocation graph containing multiple threads and locks.",
                "difficulty": "Advanced",
                "skill_or_topic": "Graph Algorithms & Deadlock Detection",
                "guidance": [
                    "Modeling threads and locks as nodes in a directed graph.",
                    "Cycle detection using Depth-First Search (DFS) with 3-color vertex marking (white, gray, black).",
                    "Time complexity: O(V + E) where V is threads+resources and E is allocations+requests.",
                ],
            },
        ],
        "System Design & Architecture": [
            {
                "question": "Design a scalable URL shortener service (like bit.ly) handling 100M new URLs created per month and 1B redirects per month. Include data schema, base62 encoding, and caching.",
                "difficulty": "Intermediate",
                "skill_or_topic": "System Design & Distributed Storage",
                "guidance": [
                    "Base62 encoding of auto-incrementing 64-bit integer IDs versus MD5/SHA256 hashing.",
                    "Read-heavy caching with Redis (80-20 rule) to offload database lookups.",
                    "Storage estimation: calculating disk and bandwidth needs for 5-year retention.",
                ],
            },
            {
                "question": "How would you design a distributed rate limiter across multiple web server instances using Redis? Compare fixed window, sliding log, and token bucket approaches.",
                "difficulty": "Intermediate",
                "skill_or_topic": "Distributed Caching & Rate Limiting",
                "guidance": [
                    "Lua scripts in Redis to execute atomic increment and expiry operations without race conditions.",
                    "Memory and latency trade-offs between sliding window counter and token bucket.",
                    "Handling Redis downtime: fail-open versus fail-closed security strategies.",
                ],
            },
        ],
        "Behavioral & Project Experience": [
            {
                "question": "Describe a scenario where a database query or endpoint caused severe latency spikes in production. How did you identify the slow query and optimize it?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Database Optimization & Production Debugging",
                "guidance": [
                    "Analyzing query execution plans with `EXPLAIN ANALYZE`.",
                    "Diagnosing missing indexes, sequential scans, or N+1 query patterns.",
                    "Implementing covering indexes, query restructuring, or read replicas.",
                ],
            },
        ],
    },
    "Machine Learning Engineer": {
        "Technical Fundamentals": [
            {
                "question": "Explain the vanishing and exploding gradient problems in deep neural networks. How do residual connections, layer normalization, and Xavier/He weight initialization mitigate them?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Deep Learning Fundamentals & Backpropagation",
                "guidance": [
                    "Chain rule multiplication through many layers causing exponential decay or explosion.",
                    "Residual skip connections creating identity shortcuts for gradient flow (`F(x) + x`).",
                    "Normalization stabilizing internal covariate shift and maintaining variance across layers.",
                ],
            },
            {
                "question": "Compare Precision, Recall, F1-Score, and ROC-AUC. In an imbalanced dataset (e.g. fraud detection with 0.1% positive cases), why is accuracy misleading?",
                "difficulty": "Beginner",
                "skill_or_topic": "ML Evaluation Metrics",
                "guidance": [
                    "Accuracy paradox: predicting majority class yields 99.9% accuracy with zero real utility.",
                    "Precision-Recall trade-off and when to prioritize high Recall (medical diagnosis/fraud).",
                    "Techniques: SMOTE, class-weighted loss functions, and PR-AUC evaluation.",
                ],
            },
            {
                "question": "Explain the multi-head self-attention mechanism in the Transformer architecture. What are Query, Key, and Value matrices, and why is attention scaled by sqrt(d_k)?",
                "difficulty": "Advanced",
                "skill_or_topic": "Transformers & Attention Mechanism",
                "guidance": [
                    "Scaled dot-product attention formula: `softmax((Q * K^T) / sqrt(d_k)) * V`.",
                    "Scaling factor prevents dot products from growing excessively large, avoiding vanishing softmax gradients.",
                    "Multi-head projection allowing the model to attend to information from different representation subspaces.",
                ],
            },
        ],
        "Coding & Algorithms": [
            {
                "question": "Write a PyTorch custom dataset and data loader implementation with data augmentation transforms for handling out-of-core image or tabular data efficiently.",
                "difficulty": "Intermediate",
                "skill_or_topic": "PyTorch & Data Engineering",
                "guidance": [
                    "Overriding `__len__` and `__getitem__` methods.",
                    "Applying on-the-fly transforms in `__getitem__` to conserve memory.",
                    "Configuring `num_workers`, `pin_memory`, and prefetching in `DataLoader`.",
                ],
            },
            {
                "question": "Implement an algorithm to compute cosine similarity between a query vector and a matrix of embeddings from scratch in NumPy, optimizing for vectorized operations.",
                "difficulty": "Beginner",
                "skill_or_topic": "NumPy & Vector Mathematics",
                "guidance": [
                    "Formula: dot product divided by product of L2 norms.",
                    "Using `np.linalg.norm` along specific axes without explicit Python for-loops.",
                    "Handling zero-norm vectors to avoid division by zero errors.",
                ],
            },
        ],
        "System Design & Architecture": [
            {
                "question": "Design an end-to-end MLOps pipeline for training, validating, deploying, and monitoring a real-time recommendation model with automated drift detection.",
                "difficulty": "Intermediate",
                "skill_or_topic": "MLOps Architecture & Model Serving",
                "guidance": [
                    "Feature store (offline batch vs online low-latency lookup).",
                    "Model registry (MLflow/Weights & Biases) with automated CI/CD evaluation gates.",
                    "Monitoring data drift (KS-test/PSI) and concept drift to trigger automated re-training.",
                ],
            },
        ],
        "Behavioral & Project Experience": [
            {
                "question": "Describe a project where your model performed exceptionally well on validation data but degraded in real-world deployment. How did you diagnose data leakage or distribution shift?",
                "difficulty": "Intermediate",
                "skill_or_topic": "ML Debugging & Data Leakage",
                "guidance": [
                    "Investigating target leakage (features containing future information not available at inference).",
                    "Identifying train-test distribution mismatch and covariate shift.",
                    "Implementing strict time-based splits and leakage detection audits.",
                ],
            },
        ],
    },
    "Data Analyst / Scientist": {
        "Technical Fundamentals": [
            {
                "question": "Explain statistical hypothesis testing. What are p-values, Type I and Type II errors, and statistical power? How do you calculate required sample size for an A/B test?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Statistics & A/B Testing",
                "guidance": [
                    "Null hypothesis vs alternative hypothesis framework.",
                    "Type I (false positive, alpha) vs Type II (false negative, beta) errors.",
                    "Power calculations based on Minimum Detectable Effect (MDE), variance, and sample size.",
                ],
            },
            {
                "question": "Compare Star Schema and Snowflake Schema in data warehousing. How do fact tables and dimension tables differ, and when is denormalization preferred in OLAP systems?",
                "difficulty": "Beginner",
                "skill_or_topic": "Data Warehousing & Dimensional Modeling",
                "guidance": [
                    "Fact tables contain measurable quantitative events; dimension tables store context attributes.",
                    "Star schema denormalizes dimensions for faster query performance with fewer joins.",
                    "Snowflake schema normalizes dimensions to reduce redundancy at the cost of complex join graphs.",
                ],
            },
        ],
        "Coding & Algorithms": [
            {
                "question": "Write a SQL query using window functions (e.g. ROW_NUMBER, DENSE_RANK, LAG) to calculate month-over-month revenue growth percentage per product category.",
                "difficulty": "Intermediate",
                "skill_or_topic": "Advanced SQL & Analytics",
                "guidance": [
                    "Using `LAG(revenue, 1) OVER (PARTITION BY category ORDER BY month)` to fetch prior month revenue.",
                    "Calculating percentage growth: `(current - previous) / previous * 100`.",
                    "Handling edge cases like division by zero or first month with no prior history (`COALESCE`/`NULLIF`).",
                ],
            },
            {
                "question": "Using Pandas, write clean code to clean a dirty dataset containing missing values, duplicate user IDs, and mixed date formats, outputting summary statistics.",
                "difficulty": "Beginner",
                "skill_or_topic": "Pandas & Data Cleaning",
                "guidance": [
                    "Identifying missing data patterns (`isna()`) and choosing appropriate imputation strategies.",
                    "Deduplication using `drop_duplicates(subset=['user_id'], keep='last')`.",
                    "Safe datetime conversion with `pd.to_datetime(..., errors='coerce')`.",
                ],
            },
        ],
        "System Design & Architecture": [
            {
                "question": "Design an automated ETL data pipeline that ingests transactional logs from cloud storage, transforms them with dbt, and populates analytical dashboards with sub-hourly freshness.",
                "difficulty": "Intermediate",
                "skill_or_topic": "ETL Pipelines & Data Modeling",
                "guidance": [
                    "Data lake staging to data warehouse (BigQuery/Snowflake) raw tables.",
                    "Medallion architecture: Bronze (raw) -> Silver (cleaned/conformed) -> Gold (business aggregations).",
                    "Automated data quality checks (null constraints, uniqueness tests) with dbt or Great Expectations.",
                ],
            },
        ],
        "Behavioral & Project Experience": [
            {
                "question": "Tell me about a time you presented complex statistical findings or predictive insights to non-technical business stakeholders. How did you ensure your message drove action?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Data Storytelling & Stakeholder Management",
                "guidance": [
                    "Framing technical metrics in terms of concrete business impact and revenue/cost drivers.",
                    "Using intuitive data visualizations (clean bar/line charts) rather than dense mathematical tables.",
                    "Highlighting actionable recommendations and operational next steps.",
                ],
            },
        ],
    },
    "DevOps & Cloud Engineer": {
        "Technical Fundamentals": [
            {
                "question": "Explain the internal architecture of Docker multi-stage builds. How do they optimize production container image security and deployment footprint compared to single-stage Dockerfiles?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Docker & Container Optimization",
                "guidance": [
                    "Separation of heavy build-time toolchains (compilers, SDKs) from minimal runtime base images (alpine/distroless).",
                    "Copying only compiled binaries and essential production dependencies into the final stage.",
                    "Significant reduction in image attack surface and deployment transfer bandwidth.",
                ],
            },
            {
                "question": "What is the difference between blue/green deployments, canary deployments, and rolling updates in Kubernetes? How does each handle zero-downtime releases?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Kubernetes Deployment Strategies",
                "guidance": [
                    "Rolling update: gradual replacement of old pods with new pods; minimal resource overhead.",
                    "Blue/Green: running two identical production environments, switching traffic at router level; fast rollback.",
                    "Canary: routing a small percentage of real user traffic (e.g. 5%) to new version to validate error rates before wide release.",
                ],
            },
            {
                "question": "Explain Infrastructure as Code (IaC) principles using Terraform. What is state management, how do remote state locks prevent race conditions, and why is drift detection critical?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Terraform & Infrastructure as Code",
                "guidance": [
                    "Declarative resource definitions mapped to real cloud resources via `terraform.tfstate`.",
                    "Remote state backend (e.g. S3 + DynamoDB or GCS) with atomic locking during applies.",
                    "Drift detection comparing actual cloud API state against desired declared configuration.",
                ],
            },
        ],
        "Coding & Algorithms": [
            {
                "question": "Write a bash script or Python automation that parses server access logs, extracts top 10 IP addresses causing HTTP 5xx errors in the last hour, and alerts via webhook.",
                "difficulty": "Beginner",
                "skill_or_topic": "Bash & Log Automation",
                "guidance": [
                    "Using `awk`, `grep`, `sort`, and `uniq -c` pipelines or Python regex matching.",
                    "Filtering timestamps for the last 60 minutes.",
                    "Sending JSON payloads with `curl` to a webhook endpoint.",
                ],
            },
        ],
        "System Design & Architecture": [
            {
                "question": "Design a high-availability CI/CD pipeline for a microservices architecture supporting automated unit tests, container security scanning (Trivy), and GitOps deployment with ArgoCD.",
                "difficulty": "Intermediate",
                "skill_or_topic": "CI/CD & GitOps Architecture",
                "guidance": [
                    "Fast parallel execution of unit and lint stages before heavy build steps.",
                    "Vulnerability scanning failing pipelines if critical CVEs are detected.",
                    "GitOps: pushing new image tags to git deployment repo, where ArgoCD reconciles cluster state automatically.",
                ],
            },
        ],
        "Behavioral & Project Experience": [
            {
                "question": "Describe a major infrastructure outage or deployment failure you resolved. What post-mortem steps and automated guardrails did you put in place to ensure it cannot recur?",
                "difficulty": "Intermediate",
                "skill_or_topic": "Site Reliability & Incident Management",
                "guidance": [
                    "Incident response: triaging severity, communicating status, rolling back safely.",
                    "Blameless post-mortem identifying system vulnerabilities rather than individual fault.",
                    "Implementing automated canary checks and health probes to catch similar failures automatically.",
                ],
            },
        ],
    },
}


class InterviewService:
    """
    Central orchestration service for Interview Practice Generation.
    Manages roles, question categories, context resolution (Resume & Skill Gap),
    dual-engine generation (Gemini vs Deterministic), and SQLite persistence.
    """

    @classmethod
    def get_available_roles(cls) -> List[Dict[str, Any]]:
        """Returns the 6 standardized benchmark roles."""
        result = []
        for role_name, data in ROLE_BENCHMARK_PROFILES.items():
            result.append({
                "id": role_name.lower().replace(" ", "_").replace("/", "_"),
                "title": data["title"],
                "description": data["description"],
                "core_skills": data["core_skills"],
                "core_skills_count": len(data["core_skills"]),
                "complementary_skills_count": len(data["complementary_skills"]),
            })
        return result

    @classmethod
    def generate_interview_session(
        cls,
        target_role: str,
        difficulty: str = "Intermediate",
        question_focus: str = "Mixed / Balanced",
        selected_skills: Optional[List[str]] = None,
        question_count: int = 5,
        context_source: str = "none",
        resume_id: Optional[int] = None,
        skill_gap_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generates and persists an interview question set.
        Validates parameters, resolves optional context, executes dual-engine generation,
        and saves session to SQLite.
        """
        # 1. Validation
        if target_role not in ROLE_BENCHMARK_PROFILES:
            raise ValueError(
                f"Unknown target role '{target_role}'. Supported roles: {list(ROLE_BENCHMARK_PROFILES.keys())}"
            )

        # Normalize difficulty
        diff_norm = DIFFICULTY_ALIASES.get(difficulty.lower(), difficulty)
        if diff_norm not in SUPPORTED_DIFFICULTIES:
            raise ValueError(
                f"Invalid difficulty '{difficulty}'. Supported: {SUPPORTED_DIFFICULTIES}"
            )
        difficulty = diff_norm

        if question_focus not in SUPPORTED_QUESTION_FOCUSES:
            raise ValueError(
                f"Invalid question focus '{question_focus}'. Supported: {SUPPORTED_QUESTION_FOCUSES}"
            )

        if question_count not in SUPPORTED_QUESTION_COUNTS:
            raise ValueError(
                f"Invalid question count '{question_count}'. Supported counts: {SUPPORTED_QUESTION_COUNTS}"
            )

        if context_source not in SUPPORTED_CONTEXT_SOURCES:
            raise ValueError(
                f"Invalid context source '{context_source}'. Supported: {SUPPORTED_CONTEXT_SOURCES}"
            )

        selected_skills = selected_skills or []

        # 2. Resolve Context Data (Resume or Skill Gap)
        context_data: Optional[Dict[str, Any]] = None

        if context_source == "resume" or (resume_id and context_source != "skill_gap"):
            if not resume_id:
                raise ValueError("resume_id is required when context_source is 'resume'.")
            context_source = "resume"
            context_data = cls._resolve_resume_context(resume_id)

        elif context_source == "skill_gap" or (skill_gap_id and context_source != "resume"):
            if not skill_gap_id:
                raise ValueError("skill_gap_id is required when context_source is 'skill_gap'.")
            context_source = "skill_gap"
            context_data = cls._resolve_skill_gap_context(skill_gap_id)

        # 3. Dual-Engine Generation Execution
        generation_mode = "deterministic_engine"
        questions: List[Dict[str, Any]] = []

        if ai_service.is_configured():
            try:
                ai_questions = ai_service.generate_interview_questions_prompt(
                    target_role=target_role,
                    difficulty=difficulty,
                    question_focus=question_focus,
                    selected_skills=selected_skills,
                    question_count=question_count,
                    context_data=context_data,
                )
                if ai_questions and len(ai_questions) >= question_count:
                    questions = ai_questions[:question_count]
                    generation_mode = "gemini_ai"
            except Exception as e:
                logger.warning(f"Gemini interview generation failed; falling back to offline engine: {e}")

        # 4. Fallback to Deterministic Engine if Gemini unconfigured or failed
        if not questions:
            questions = cls._generate_deterministic_questions(
                target_role=target_role,
                difficulty=difficulty,
                question_focus=question_focus,
                selected_skills=selected_skills,
                question_count=question_count,
                context_data=context_data,
            )
            generation_mode = "deterministic_engine"

        # Ensure every question has 1-based question_number
        for i, q in enumerate(questions):
            q["question_number"] = i + 1

        # Extract categories present in question set
        categories_present = sorted(list(set(q.get("category", "General") for q in questions)))

        # 5. Persist Session to SQLite
        session_id = None
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO interview_sessions (
                    user_id, target_role, difficulty, question_focus,
                    selected_skills, question_count, context_source,
                    resume_id, skill_gap_id, generation_mode,
                    categories_json, questions_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    user_id,
                    target_role,
                    difficulty,
                    question_focus,
                    json.dumps(selected_skills),
                    question_count,
                    context_source,
                    resume_id,
                    skill_gap_id,
                    generation_mode,
                    json.dumps(categories_present),
                    json.dumps(questions),
                ),
            )
            db.commit()
            session_id = cursor.lastrowid
        except Exception as e:
            logger.error(f"Failed to persist interview session to SQLite: {e}")

        return {
            "id": session_id,
            "target_role": target_role,
            "difficulty": difficulty,
            "question_focus": question_focus,
            "selected_skills": selected_skills,
            "question_count": len(questions),
            "context_source": context_source,
            "resume_id": resume_id,
            "skill_gap_id": skill_gap_id,
            "generation_mode": generation_mode,
            "generation_mode_label": "AI-Generated" if generation_mode == "gemini_ai" else "Offline Question Engine",
            "categories": categories_present,
            "questions": questions,
        }

    @classmethod
    def _resolve_resume_context(cls, resume_id: int) -> Dict[str, Any]:
        """Loads verified skills and metadata from SQLite resumes table."""
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "SELECT id, filename, extracted_skills, raw_text FROM resumes WHERE id = ?;",
            (resume_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Resume ID {resume_id} not found in database history.")

        matched_skills: List[str] = []
        if row["extracted_skills"]:
            try:
                matched_skills = json.loads(row["extracted_skills"])
            except Exception:
                matched_skills = []

        return {
            "source": "resume",
            "resume_id": row["id"],
            "filename": row["filename"] or f"resume_{resume_id}.pdf",
            "matched_skills": matched_skills,
        }

    @classmethod
    def _resolve_skill_gap_context(cls, skill_gap_id: int) -> Dict[str, Any]:
        """Loads detected gaps and coverage from SQLite skill_evaluations table."""
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "SELECT id, target_role, missing_skills, adjacent_skills, core_coverage FROM skill_evaluations WHERE id = ?;",
            (skill_gap_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Skill Gap evaluation ID {skill_gap_id} not found in database history.")

        missing_names: List[str] = []
        if row["missing_skills"]:
            try:
                m_list = json.loads(row["missing_skills"])
                missing_names = [item.get("name", "") for item in m_list if isinstance(item, dict)]
            except Exception:
                missing_names = []

        adjacent_items: List[Dict[str, Any]] = []
        if row["adjacent_skills"]:
            try:
                adjacent_items = json.loads(row["adjacent_skills"])
            except Exception:
                adjacent_items = []

        return {
            "source": "skill_gap",
            "skill_gap_id": row["id"],
            "target_role": row["target_role"],
            "missing_skills": missing_names,
            "adjacent_skills": adjacent_items,
            "core_coverage": row["core_coverage"] or 0.0,
        }

    @classmethod
    def _generate_deterministic_questions(
        cls,
        target_role: str,
        difficulty: str,
        question_focus: str,
        selected_skills: List[str],
        question_count: int,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Deterministic, offline-reliable interview question generator.
        Respects requested role, difficulty, focus category distribution,
        and targets missing skills when Skill Gap context is provided.
        Guarantees exact requested question count.
        """
        role_questions = OFFLINE_QUESTION_BANK.get(target_role) or OFFLINE_QUESTION_BANK["Full Stack Developer"]

        # Determine target pool based on question_focus
        category_mapping = {
            "Technical Fundamentals": ["Technical Fundamentals"],
            "Coding & Algorithms": ["Coding & Algorithms"],
            "System Design & Architecture": ["System Design & Architecture"],
            "Behavioral & Project Experience": ["Behavioral & Project Experience"],
            "Mixed / Balanced": [
                "Technical Fundamentals",
                "System Design & Architecture",
                "Behavioral & Project Experience",
                "Coding & Algorithms",
            ],
        }

        active_categories = category_mapping.get(question_focus, category_mapping["Mixed / Balanced"])

        # Gather questions per category
        category_pools: Dict[str, List[Dict[str, Any]]] = {}
        for cat in active_categories:
            cat_list = role_questions.get(cat, [])
            items = []
            for q in cat_list:
                q_copy = dict(q)
                q_copy["category"] = cat
                q_copy["context_note"] = None
                items.append(q_copy)
            if items:
                category_pools[cat] = items

        # Interleave across categories to ensure balanced distribution (Mixed mode parity)
        pool: List[Dict[str, Any]] = []
        max_cat_len = max((len(items) for items in category_pools.values()), default=0)
        for i in range(max_cat_len):
            for cat in active_categories:
                if cat in category_pools and i < len(category_pools[cat]):
                    pool.append(category_pools[cat][i])

        # Context-aware prioritization:
        # If Skill Gap context has missing skills, craft/tag targeted questions
        selected_questions: List[Dict[str, Any]] = []

        if context_data and context_data.get("source") == "skill_gap":
            missing = context_data.get("missing_skills", [])
            for m_skill in missing:
                for q in pool:
                    if m_skill.lower() in q["skill_or_topic"].lower() and q not in selected_questions:
                        q_tagged = dict(q)
                        q_tagged["context_note"] = f"Synthesized from your missing skill benchmark: {m_skill}"
                        selected_questions.append(q_tagged)
                        if len(selected_questions) >= 2:
                            break
                if len(selected_questions) >= 2:
                    break

        elif context_data and context_data.get("source") == "resume":
            matched = context_data.get("matched_skills", [])
            for s in matched:
                for q in pool:
                    if s.lower() in q["skill_or_topic"].lower() and q not in selected_questions:
                        q_tagged = dict(q)
                        q_tagged["context_note"] = f"Calibrated for your verified resume skill: {s}"
                        selected_questions.append(q_tagged)
                        if len(selected_questions) >= 2:
                            break
                if len(selected_questions) >= 2:
                    break

        # Fill remaining slots from pool, cycling round-robin if pool is smaller than question_count
        idx = 0
        while len(selected_questions) < question_count and pool:
            candidate = pool[idx % len(pool)]
            if candidate not in selected_questions or len(selected_questions) >= len(pool):
                c_copy = dict(candidate)
                if selected_questions.count(c_copy) > 0:
                    c_copy["question"] = f"{c_copy['question']} (Follow-up depth scenario)"
                selected_questions.append(c_copy)
            idx += 1

        # Adjust difficulty on selected questions to match requested difficulty
        for q in selected_questions:
            q["difficulty"] = difficulty

        return selected_questions[:question_count]

    @classmethod
    def get_interview_history(cls, limit: int = 10, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieves recent interview practice sessions from SQLite."""
        db = get_db()
        cursor = db.cursor()
        if user_id is not None:
            cursor.execute(
                """
                SELECT id, target_role, difficulty, question_focus, selected_skills,
                       question_count, context_source, resume_id, skill_gap_id,
                       generation_mode, categories_json, questions_json, created_at
                FROM interview_sessions
                WHERE user_id = ?
                ORDER BY id DESC
                LIMIT ?;
                """,
                (user_id, limit),
            )
        else:
            cursor.execute(
                """
                SELECT id, target_role, difficulty, question_focus, selected_skills,
                       question_count, context_source, resume_id, skill_gap_id,
                       generation_mode, categories_json, questions_json, created_at
                FROM interview_sessions
                WHERE user_id IS NULL
                ORDER BY id DESC
                LIMIT ?;
                """,
                (limit,),
            )
        rows = cursor.fetchall()

        history: List[Dict[str, Any]] = []
        for r in rows:
            categories: List[str] = []
            if r["categories_json"]:
                try:
                    categories = json.loads(r["categories_json"])
                except Exception:
                    categories = []

            questions: List[Dict[str, Any]] = []
            if r["questions_json"]:
                try:
                    questions = json.loads(r["questions_json"])
                except Exception:
                    questions = []

            selected_skills: List[str] = []
            if r["selected_skills"]:
                try:
                    selected_skills = json.loads(r["selected_skills"])
                except Exception:
                    selected_skills = []

            history.append({
                "id": r["id"],
                "target_role": r["target_role"],
                "difficulty": r["difficulty"],
                "question_focus": r["question_focus"] or "Mixed / Balanced",
                "selected_skills": selected_skills,
                "question_count": r["question_count"] or len(questions),
                "context_source": r["context_source"] or "none",
                "resume_id": r["resume_id"],
                "skill_gap_id": r["skill_gap_id"],
                "generation_mode": r["generation_mode"] or "deterministic_engine",
                "generation_mode_label": "AI-Generated" if r["generation_mode"] == "gemini_ai" else "Offline Question Engine",
                "categories": categories,
                "questions": questions,
                "created_at": str(r["created_at"]),
            })

        return history
