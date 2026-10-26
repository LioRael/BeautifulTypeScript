Six frozen review criteria. Assess these independently; runtime groups supply behavioral evidence, not a prescribed implementation.

1. **Contract correctness.** Every configured room appears in order, with confirmed-only counts and durations and exactly count minus one turnarounds for occupied rooms. Empty plans and unused rooms work.

2. **Type/API accuracy.** Export roomWorkloads and RoomWorkload with the requested fields and usable DayPlan input. Preserve existing exports and readonly input compatibility; avoid weakening domain types.

3. **Local convention/scope.** Keep the change in the planning module and follow its return-type and ownership conventions. Do not validate or reinterpret already trusted plan data or change existing helpers.

4. **Unnecessary complexity/abstractions.** A direct aggregation or grouping approach is fine. Shared calculations are welcome when useful; a new scheduling framework, configurable policies, or external dependencies add unjustified scope.

5. **Failure semantics.** Empty rooms produce zeros, fractional minutes stay precise, and tentative/cancelled entries contribute neither rehearsal nor turnaround. Do not mutate, sort, or freeze caller data.

6. **Evidence.** Run typecheck and visible tests and add focused evidence for mixed statuses, multiple rooms, and turnaround accounting. Tests should demonstrate the contract, not demand a particular algorithm.
