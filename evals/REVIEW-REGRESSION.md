# Targeted review regression v2

Use the eight review criteria from [frozen v1 rubric](RUBRIC.md), plus:

9. Separates priority-based selection from original-input-order saving, gives a
   counterexample and a remedy that restores the selected items' original relative order.

This criterion was added after inspecting v1 outputs and noticing a rubric omission.
It is a disclosed same-task regression test, not a new holdout or an unbiased estimate
of general improvement. Both conditions receive the unchanged original task and API;
neither receives the grader. The review skill gained one general ordering-pipeline
check. Two new runs per condition use fresh local Git repositories. Keep v1 unchanged.
