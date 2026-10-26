Six frozen review criteria. Assess these independently; runtime groups supply behavioral evidence, not a prescribed implementation.

1. **Contract correctness.** Deduplicate current loads, cache successes, and isolate invalidated/cleared generations even when old success or rejection settles later. Keep independent keys independent.

2. **Type/API accuracy.** Preserve PreviewCache, PreviewReader, PreviewLoader, get/invalidate/clear and renderDocument signatures. get returns Promise<Preview> even for synchronous loader errors; keep rejection types honest.

3. **Local convention/scope.** Keep the fix local to the cache and respect immutable shared Preview objects. Do not change caller behavior, introduce cancellation requirements, or alter loader invocation arguments.

4. **Unnecessary complexity/abstractions.** Identity checks, generation tokens, or unified entry state are all acceptable. Avoid an event system, retry policy, timers, or generic caching framework for this local race.

5. **Failure semantics.** Preserve exact rejection reasons and retry after failures. Old callers still settle normally; stale completion must not overwrite values or delete newer pending work. Both invalidate and clear matter.

6. **Evidence.** Use deterministic deferred promises to demonstrate ordering, failure retry, and synchronous throws, alongside typecheck and baseline tests. Wall-clock sleeps are weak evidence for this race.
