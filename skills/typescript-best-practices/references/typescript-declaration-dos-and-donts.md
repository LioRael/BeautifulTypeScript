# TypeScript declaration Do’s and Don’ts — digest

Source: [Do’s and Don’ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html).
Owner: Microsoft / TypeScript team. Reviewed: 2026-10-27; rolling official documentation.
Read for declaration files and exported API signatures (TS03). This is not a general
formatting guide for every application function.

## Source recommendations

- Prefer primitive string/number/boolean types to boxed String/Number/Boolean types.
- Use unknown when callers can supply values whose type is not yet established. An
  unused generic parameter adds no meaningful constraint.
- Use void for a callback return value that the caller deliberately ignores.
- Optional callback parameters mean that the producer may omit the argument; they are
  not needed merely because a consumer callback chooses to accept fewer arguments.
- Put specific overloads before broad ones. Collapse overloads into optional/union
  parameters when that preserves the return relationship and call contract.

## Apply it to a public API

Consider a progress callback with `(completed: number, total: number) => void`.
If the producer always supplies total, do not mark it optional just because some consumers
only read completed. If total is genuinely unavailable, model and test that state.
This is an original application example, not copied source code.

Before simplifying overloads, list accepted argument combinations and their return types.
A union return that loses a useful argument-to-result relationship can make callers worse
off even though implementation code becomes shorter. Keep overloads where they carry that
relationship; remove them when they only repeat an optional trailing argument.

## Verify rather than assume

Compile a small consumer against emitted declarations, not source paths. Include one
valid and one invalid call for the disputed signature. Check that exports resolve through
the package entrypoint and that implementation-only types do not leak into declarations.
A JavaScript consumer may still send invalid data; declaration accuracy does not replace
runtime validation at an untrusted boundary.

## Project choice

We prefer accurate signatures over a global annotation quota. Do not add declarations,
overloads or a generic API layer to a small application that does not need them. Avoid
claiming a declaration-style preference is a runtime correctness defect without evidence.
