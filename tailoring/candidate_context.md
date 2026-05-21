# Candidate Context

This file is the authoritative source for background facts that are true but not
explicitly written in the base CV. The tailoring workflow MAY use these facts.
Facts not present in either this file or the base CV MUST NOT be used.

---

<general_context>
## General - Applies to All Roles

<!--
Add any cross-role framing notes here — e.g. ownership style, collaboration patterns,
ways of working that apply to all your experience and that the tailoring prompt
should be allowed to surface.

Example:
- Consistently owned work end-to-end: from requirements and design through
  implementation, testing, and production. You MAY frame bullets as "owned
  end-to-end" where the JD rewards ownership language.
-->

- YOUR_GENERAL_CONTEXT_HERE
</general_context>

---

<confirmed_skills>
<!--
List every technology, tool, and methodology you can speak to confidently in an
interview. The tailoring prompt will only add skills from this list (or the
adjacency list in the prompt itself) — never from outside it.

Format: comma-separated, one line or many lines.

Example:
Java, TypeScript, JavaScript, Node.js, Apache Kafka, Redis, SQL, AWS, Spring,                                                                                                
AngularJS, REST APIs, Elasticsearch, MySQL, Kubernetes, Agile, Git, Microsoft Azure,                                                                                         
Linux/Unix, Docker, OpenShift, Microservices, OAuth, Bedrock, Azure OpenAI, OOP,                                                                                             
Temporal, CDC (Change Data Capture), Keycloak, Retool, Software Architecture,                                                                                                
Domain-Driven Design (DDD), Event-Driven Design, Clean Code, SDLC, NoSQL,                                                                                                    
Postgres, Redshift, Python, RabbitMQ, Gradle, RAG, A/B Testing, Airflow, C#, Claude, Claude Code                                                                             
Data Structures & Algorithms, Hibernate, JIRA, LangChain, LLM, OpenAI, OpenAPI, MongoDB,                                                                                     
SingleStore, RxJavaScript, Socket.io
-->

YOUR_SKILL, YOUR_SKILL, YOUR_SKILL
</confirmed_skills>

<skills_adjacency_list>
FastAPI, Express.js, NestJS, Prisma, SQLAlchemy, Celery, gRPC, GraphQL,
Semantic Kernel, Azure AI Search, pgvector, Supabase, CI/CD, GitHub Actions,
Terraform, Prometheus, Grafana, OpenTelemetry, ELK Stack, Vector Databases,
Prompt Engineering, Agentic Workflows, Scala
</skills_adjacency_list>

---

<!--
Add one <role_X> section per job. These give the tailoring prompt additional
context beyond what is written in the base CV — stack details, product domain,
customer-facing aspects, framing notes, etc.

Copy and fill the template below for each role.
-->

<role_YOUR_COMPANY_SLUG>
## YOUR_COMPANY (MM/YYYY - MM/YYYY)

<!--
- Product: what the product/system does in one line
- Industry: the domain (e.g. FinTech, AdTech, Defense Tech, HealthTech)
-->
Product: YOUR_PRODUCT_DESCRIPTION
Industry: YOUR_INDUSTRY

Tech stack:
- Backend: YOUR_BACKEND_LANGUAGES_AND_RUNTIMES
- Frontend: YOUR_FRONTEND_STACK (or "N/A")
- Databases: YOUR_DATABASES
- Misc: YOUR_OTHER_TOOLS (queues, orchestration, CDC, etc.)

<!--
Add any role-specific framing notes below — e.g. customer-facing aspects,
stakeholder types, special context the tailoring prompt should know about
and how it should (or should not) frame them.

Example:
- Worked directly with internal operators AND external clients to define features.
  Frame as: "collaborated with internal operators and external clients to define
  requirements" — not as "enterprise customer-facing" or "consulting."
-->
</role_YOUR_COMPANY_SLUG>

---

<education_section>
## Education

<!--
Describe your educational background and how the tailoring prompt should
reference it. Include what it IS and what it IS NOT (e.g. if it is not a
formal degree, say so explicitly so the prompt never implies one).

Example:
- Completed [PROGRAM NAME] — [one-line description of what it is and its
  reputation in your hiring market].
- You MAY reference it as "[SHORT LABEL]" when relevant (e.g. defense-tech
  roles, roles valuing strong technical foundations).
- Do NOT describe it as a degree equivalent or imply any academic credential.
- Candidate does NOT hold a formal academic degree. Never add, imply, or
  reference a degree anywhere in the resume.
-->

YOUR_EDUCATION_DETAILS_HERE
</education_section>

---

<off_limits>
## What Is Off-Limits

<!--
List explicit constraints — facts the tailoring prompt must never infer,
add, or imply, even if the JD seems to call for them.

Example:
- Do not add any fact not present in this file or the base CV.
- Do not infer domain expertise (FinTech, medical, cybersecurity, etc.) from the JD.
- Do not assert tech stacks for roles beyond what is listed in the role sections above.
-->

- Do not add any fact not present in this file or the base CV.
- YOUR_ADDITIONAL_CONSTRAINTS_HERE
</off_limits>
