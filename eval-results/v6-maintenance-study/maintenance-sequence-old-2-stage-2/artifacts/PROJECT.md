# Staff training desk

Private application for an internal training coordinator and employee portal. Target runtime is Node 22 ESM. There are no runtime dependencies. Use `npm run typecheck`, `npm run build`, and `npm test` after installing the declared development tooling.

`model.ts` owns directory email normalization and domain error codes. `store.ts` owns per-desk mutable session state. `desk.ts` is the trusted in-process application API. `portal.ts` contains the current JSON submission caller and attendance export caller. Seeds come from the coordinator's typed configuration, not arbitrary JSON; their business constraints are checked at desk construction. Submission JSON is untrusted and is validated at the portal boundary. Unknown extra JSON fields are ignored today.

Employees enroll in a session with a fixed positive seat capacity. Emails are trimmed and lowercased, then checked for a basic email shape. Duplicate enrollment is rejected. Cancellation removes an existing enrollment. Attendance contains confirmed employees in enrollment order.

Domain failures throw `DeskError` with stable `code` values: INVALID_SESSION, DUPLICATE_SESSION, NOT_FOUND, INVALID_EMAIL, ALREADY_ENROLLED, FULL, NOT_ENROLLED. Portal submission translates domain errors into failure replies; malformed JSON shapes produce BAD_REQUEST. Unexpected programming errors propagate. For desk operations, session existence is checked before email validation. Failed operations do not change state. Each desk owns its data; seeds, returned enrollments, rosters and attendance arrays may be mutated by callers without altering stored data.

Sessions start with admissions open, exposed as `admissionsOpen` on roster snapshots. `setAdmissions(sessionId, open)` pauses or resumes admissions. While paused, enrollment throws ADMISSIONS_CLOSED before email or duplicate checks; cancellation remains available without promoting waiting employees. Reopening fills all available seats from the waiting list in join order. Repeating an admissions state is harmless.

Enrollment accepts optional `{ waitlist: boolean }`: free seats confirm immediately, while a full session requires opt-in to join the waiting list. Confirmed cancellations promote the earliest waiting employees only while admissions are open. Directory identity is unique across both statuses; rosters include both, and attendance includes confirmed employees only. Portal submissions accept an optional boolean `waitlist` field and reject other present values with BAD_REQUEST.

The desk and portal exports are used only by this application and its tests; there are no external package consumers. Tests execute built JavaScript from dist. Keep the attendance export and portal submission consistent with the application rules.
