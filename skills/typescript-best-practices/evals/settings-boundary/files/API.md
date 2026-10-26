# Settings API

parseSettings(input: unknown): Settings validates one JSON object with required endpoint
(nonempty string; preserve it exactly), optional retries (integer 0..5, default 3), and
optional enabled (boolean, default true). Absent fields use defaults; explicit null is
invalid. Return a fresh object containing only these fields. Reject invalid data with a
TypeError whose message identifies the offending field. Arrays are not settings objects.

loadSettings(readText: () => Promise<string>): Promise<Settings> calls readText once,
parses JSON and applies the same validation. Preserve read/JSON errors for callers. The
library has no global fetch, filesystem or logging dependency.
