Six frozen review criteria. Assess these independently; runtime groups supply behavioral evidence, not a prescribed implementation.

1. **Contract correctness.** Validate the complete documented wire format and normalize valid batches, including bounds, count, timestamp order, ID trimming, and Fahrenheit conversion. Ignore unknown fields.

2. **Type/API accuracy.** Keep unknown at the boundary and preserve BatchResult, SensorBatch, Reading, and temperatureRange APIs. Narrow runtime values soundly; assertions alone do not validate data.

3. **Local convention/scope.** Keep validation at decodeBatch or local helpers; respect the JSON-only input and caller ownership contract. Do not expand validation into trusted domain helpers or change the error shape.

4. **Unnecessary complexity/abstractions.** Inline checks or small reusable local guards are acceptable. Avoid a schema framework, dependency addition, speculative validation for proxies/cycles, or a generalized parsing architecture.

5. **Failure semantics.** All malformed batches return the same failure without throwing or partial acceptance. Success has fresh domain objects and arrays, no extra wire fields, no rounding, and no input mutation.

6. **Evidence.** Provide typecheck and tests covering valid normalization, malformed structures, numeric/time boundaries, and ownership. Tests should assert observable results rather than private helper structure.
