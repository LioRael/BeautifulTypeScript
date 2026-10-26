# Author validation

Internal staff training enrollment: four production modules, 134 TypeScript lines, a trusted desk API, an untrusted portal submission boundary and an attendance export consumer. The initial source contains no later-stage implementation or reference solution.

## Actual baseline outcomes

Using preinstalled TypeScript 5.9.3 through an invocation-local PATH:

- npm run typecheck: exit 0, strict settings intact.
- npm run build: exit 0.
- npm test: exit 0; four tests passed, zero failed. Covers submission and identity, capacity and cancellation atomicity, seed and return ownership, configuration and domain errors.

Available runtime: Node v26.12.1. Project target: Node 22; Node 22 was not available for validation. npm printed an existing unknown home configuration warning. No global configuration changed and no packages were installed.

All graders ran against the built initial workspace and emitted JSON normally, catching group failures independently:

| Grader | Groups | Pass | Expected failures |
| --- | ---: | ---: | --- |
| 1 | 5 | 0 | opt_in_and_default, fifo_cancellation, identity_errors_and_isolation, snapshot_ownership stop at FULL because waitlisting is absent. portal_and_attendance gets FULL instead of the new BAD_REQUEST validation. |
| 2 | 4 | 0 | pause_boundary_and_precedence sees missing admissionsOpen; isolation_and_roster_ownership sees missing setAdmissions. paused_cancellation_and_fifo_reopen and open_waitlist_and_current_callers stop at FULL because waitlisting is absent. |
| 3 | 5 | 0 | All five groups stop at FULL while preparing waiting employees. Seat offers and their operations are deliberately absent. |

These failures are expected future requirements, not baseline defects. Each grader targets its own stage rather than earlier retired expectations. Generated dist and temporary authoring files were removed after checks; no node_modules links were created in the case.

## Contract choices and limitations

Stage 1 preserves default FULL behavior and adds opt-in waiting. Stage 2 pauses new admissions and queue advancement, retaining cancellation. Stage 3 explicitly retires automatic confirmation from the queue in favor of reserved offers. Direct enrollment remains confirmed, and existing offers can be accepted during a pause. Both existing public callers remain relevant throughout.

FIFO assertions compare statuses or attendance order where promised; they do not require a roster storage layout. Error codes are stable, messages are not graded. Unknown JSON fields remain ignored except the newly meaningful waitlist field. Internal APIs take trusted TypeScript arguments; arbitrary runtime values for setAdmissions or enrollment options are not a new requirement. Offers have no clock or expiration.

Graders exercise public paths and detached snapshots but are not exhaustive proofs. No reference implementation was written, so graders were not validated against one. Review should also inspect solver tests and strict compilation. The rubric accepts alternative designs and assesses cumulative maintenance through enrollment, cancellation, reopening and offer paths rather than code size.
