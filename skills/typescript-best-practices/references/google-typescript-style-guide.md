# Google TypeScript Style Guide — digest

Source: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).
Owner: Google. Reviewed: 2026-10-27; rolling web edition, not a compiler-version standard.
Read for module organization, naming, type annotations and assertions (TS01, TS03, TS07).
Original summary; consult the source for full rules and exceptions.

## What the guide says

Google's guide targets its own engineering environment; external projects may differ.
Its recommendations include:

- Use named exports, minimize exported surface, and use modules rather than static-only
  classes to group unrelated utilities.
- Use interfaces to describe structural records rather than classes without behavior.
- Prefer inference where it is clear. Return annotations are contextual, not universally
  mandatory; projects may adopt a stricter local policy.
- Neither null nor undefined is universally preferred. Existing APIs determine absence.
- Treat assertions as exceptional. Avoid replacing a runtime check with a type assertion.
- Explicitly forward callback parameters when signatures differ; passing a function by
  name can accidentally consume an index or other extra argument.

Source sections: “Exports”, “Type inference”, “Undefined and null”, “Use structural
types”, and “Function expressions”.

## How this project applies it

Use these questions during implementation:

| Decision | Check before changing code |
|---|---|
| Export layout | Is this a framework entrypoint, public package API or internal module? Renaming an export can break callers. |
| Data record | Does the value need behavior/identity, or only named fields? Avoid creating a class solely to hold a wire shape. |
| Return annotation | Would an accidental change escape into consumers? Add an explicit contract where that risk matters. |
| Absence | Does missing mean something different from explicit null, empty text or zero? Preserve that contract in tests. |
| Callback adapter | Does the receiving API pass arguments the original function interprets differently? Write a tiny adapter. |

These are project-authored application questions, not additional Google mandates.
For example, an adapter `(text) => decode(text)` can intentionally discard an array index
without rewriting `decode` or introducing a wrapper class.

## Conflicts and exceptions

Airbnb prefers default exports for single-export modules; Google chooses named exports.
Keep established project/API conventions. Framework-required default exports remain valid.
Do not rewrite all records from type aliases to interfaces or replace null with undefined.
The [conflict table](style-decisions.md) records our choices explicitly.

## Verification

Check real importers when exports change. Add a callback test where the unwanted second
argument would alter behavior. Use the existing formatter; this skill does not copy
Google's formatting policy into unrelated projects.
