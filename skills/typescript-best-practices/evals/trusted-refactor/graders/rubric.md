# Trusted-refactor rubric

1. Both functions preserve signatures and behavior: first match, empty names, no match,
   omitted limit and zero. No input mutation; existing tests and typecheck pass.
2. Selection intent is direct: removes redundant temporary/control flow without new
   helpers, dependencies, wrappers or harder-to-read compression. An equivalent clear
   loop is acceptable; do not require a specific syntax or line count.
3. Does not add runtime guards, input coercion, cloning, catch/fallback logic or broaden
   parameters to unknown for values excluded by the established internal contract.
4. Preserves package/compiler setup and caller behavior; no unrelated redesign.
5. Reports actual checks and the simplification accurately; no unsupported safety or
   performance claims.

Judge changed code and executed behavior, not mentions of simplicity. Inspect any added
abstraction's implementation; moving code elsewhere does not make it simpler. Functional
tests alone cannot establish maintainability. This is an author-scored regression task,
not a blinded measure of beauty or general model quality.
