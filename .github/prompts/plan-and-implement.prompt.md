---
description: Plan and implement a feature in a critical, thorough, and code-aware manner
---

## Core objective
Your goal is to determine the best way to implement the requested feature in the current codebase, implement it safely, and verify that it works correctly.
You must be critical, thorough, implementation-focused, and grounded in the actual repository.
Do not rely on assumptions when the codebase, tests, configuration, or documentation can be inspected directly.

## Workflow
1. First, understand the feature request, the expected behavior, the likely scope, and any explicit or implicit constraints.
2. If the request is ambiguous, identify the ambiguities, but do not stop early unless they block safe implementation. Continue gathering evidence from the repository.
3. Use a subagent to investigate how this feature should be implemented in the current codebase and identify the most suitable implementation approach.
4. The investigator subagent must inspect the relevant files, architecture, modules, interfaces, dependencies, configuration, existing feature patterns, conventions, and tests before proposing an approach.
5. The investigator subagent must also inspect adjacent code that could be affected indirectly, including shared utilities, integration points, data flow, error handling, state management, API boundaries, persistence, and user-facing behavior where relevant.
6. The investigator subagent must use the fetch webpage tool whenever external documentation, library behavior, platform constraints, protocol details, or tooling behavior need to be verified.
7. The investigator subagent must produce a concrete implementation plan and a step-by-step implementation checklist.
8. The checklist must explicitly identify which files are likely to be created, modified, refactored, renamed, or removed; which tests need to be added or updated; what validations need to be run; and any migration, rollout, compatibility, or cleanup work that may be needed.
9. The investigator subagent must explain why the recommended approach is the best fit for this codebase, not just why it is valid in theory.
10. Summarize the investigator's findings, including the proposed approach, affected areas, implementation checklist, assumptions, risks, edge cases, and validation strategy.
11. Start another subagent to critically challenge this plan and play devil's advocate.
12. The challenger subagent must look for flawed assumptions, hidden complexity, incomplete file impact analysis, unsafe refactors, regressions, missing tests, maintainability concerns, edge cases, backward compatibility risks, operational risks, violations of SOLID principles, clean code issues, and simpler alternatives that would fit the repository better.
13. The challenger subagent must also challenge whether the proposed checklist is complete, realistic, minimal, reversible where possible, and safe to execute.
14. Summarize the challenger's critique.
15. Then start a third subagent to act as the judge and decide whether this should or should not be considered a viable implementation approach for this codebase.
16. The judge must explicitly evaluate architectural fit, implementation risk, clarity of the plan, file impact awareness, testability, maintainability, adherence to SOLID principles, adherence to clean code guidelines, use of TDD where practical, and whether the checklist is concrete enough to execute safely.
17. The judge must clearly state one of the following: approve the recommended approach, reject the recommended approach, or keep multiple candidate approaches alive.
18. Repeat steps 3-17 until the acceptance criteria are met.
19. Then state your verdict and use the ask_questions tool to ask whether you should proceed with the implementation.
20. If I answer no, then go back to step 3.
21. If I answer yes, then implement it.

## Implementation execution
22. Before editing code, restate the approved implementation checklist in execution order.
23. During implementation, follow the approved checklist and update it if new repository evidence requires changes. If the plan changes materially, explain why.
24. Prefer TDD where practical: first add or update a failing test that captures the intended behavior, then implement the minimal code necessary to make it pass, then refactor while keeping tests green.
25. If full TDD is not practical for part of the work, explicitly explain why, and still add or update tests as close as possible to the changed behavior.
26. Edit files carefully and only change what is necessary to implement the feature correctly, safely, and cleanly.
27. Follow the existing code style, project structure, naming conventions, architecture, dependency patterns, and testing patterns as closely as possible unless there is a strong repository-specific reason not to.
28. If you introduce a new abstraction, dependency, interface, module, or pattern, you must justify it clearly in terms of this codebase.
29. If you find unrelated issues, do not expand scope unless they block correct implementation or create clear risk. Mention them separately instead of folding them into the feature work.
30. Preserve backward compatibility unless the requested feature explicitly requires a breaking change.
31. If a breaking change is necessary, identify it explicitly, minimize blast radius, and include any required migration steps.

## Validation and quality control
32. After implementation, review all changed files for clarity, duplication, unnecessary complexity, poor naming, mixed responsibilities, tight coupling, leaky abstractions, dead code, and violations of SOLID principles or clean code guidelines.
33. Refactor where needed to keep the final implementation simple, cohesive, readable, and maintainable.
34. Run the relevant tests, checks, linters, type checks, builds, and validations for the affected area.
35. If available and proportionate to the scope, also run broader regression checks for adjacent areas that could have been affected.
36. If tests do not exist for the affected behavior, add them where appropriate.
37. Never claim something was tested, verified, or passed unless you actually ran the relevant check.
38. If you cannot run a test or validation, say so explicitly and explain what remains unverified.

## Required engineering standards
1. Follow SOLID principles.
2. Follow clean code guidelines: clear naming, focused responsibilities, explicit intent, low coupling, high cohesion, minimal duplication, readable control flow, and small, understandable units of behavior.
3. Prefer simplicity over cleverness.
4. Prefer repository-consistent patterns over idealized patterns that do not match the existing codebase.
5. Keep changes scoped, intentional, and reversible where possible.
6. Design for testability.
7. Use TDD where practical.
8. Avoid speculative abstraction.
9. Avoid unnecessary dependencies.
10. Ground decisions in actual codebase evidence.

## Required outputs before approval
Before asking whether to proceed with implementation, you must provide:
1. The recommended implementation approach.
2. Up to 3 viable candidate approaches if there is real uncertainty.
3. A clear rationale for the recommended approach.
4. A list of affected files and components, or likely affected areas if exact files are not yet known.
5. A step-by-step implementation checklist.
6. Key risks, edge cases, and compatibility concerns.
7. A validation and testing plan.
8. Any blocking ambiguities or assumptions that still remain.

## Required outputs after implementation
Before asking whether the implementation works correctly, you must provide:
1. A concise summary of what was implemented.
2. The exact files changed.
3. The tests added or updated.
4. The validations, checks, and commands run.
5. The outcome of each validation.
6. Any deviations from the original plan and why they were necessary.
7. Any known limitations, follow-up work, or unverified areas.

## Level of thoroughness
Subagents need to be VERY thorough.
All subagents take the role of principal software engineer, with 30+ years of software development experience.
All subagents must reason in a code-aware way and ground their conclusions in the actual repository, not only in general best practices.
They must prefer evidence from the codebase over assumptions.
They must be skeptical of incomplete analysis and vague implementation plans.

## Acceptance criteria
DO NOT come back to me unless the implementation approach is DEFINITELY selected for this codebase, or the judge has ruled in favour of at least 3 viable candidate implementation approaches.
Any accepted approach must:
- Be concrete enough to implement.
- Be aligned with the existing codebase.
- Include a step-by-step implementation checklist.
- Identify the files, components, and tests likely to be affected.
- Account for risks, edge cases, and validation steps.
- Be consistent with SOLID principles, clean code guidelines, and a TDD-oriented workflow.

## Finalization
38. Then use the ask_questions tool to ask whether the implementation works correctly.
39. If I answer no, then go back to step 3.
40. If I answer yes, then commit and grab a beer or a healthy snack as a reward.
