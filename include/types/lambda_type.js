const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  // A function *type*, e.g. a callback parameter's annotation `f: () -> t`.
  //
  // It may carry the same effect modifiers a lambda *value* does (`f: pure () -> t`), which
  // is what lets a signature constrain the callbacks it is handed rather than only its own
  // body: without them, a higher-order function's purity is inferred per call site from the
  // argument, and no signature can promise anything about a caller it has not seen. The
  // modifier order matches lambda_expr's (`pure`/`det` then `noalloc`), so a type and the
  // value that inhabits it are written the same way.
  lambda_type: ($) =>
    prec(
      PREC.LAMBDA_TYPE,
      seq(
        optional(field("is_pure", $.pure_modifier)),
        optional(field("is_det", $.det_modifier)),
        optional(field("is_noalloc", $.noalloc_modifier)),
        "(",
        optional(field("parameter_types", $.parameter_type_list)),
        ")",
        "->",
        seq(
          optional(field("modifier", $.type_modifier)),
          field("return_type", $.type),
        ),
      ),
    ),

  // `...` is admitted **anywhere a function type is written**, and refused everywhere but
  // an `extern` by the collector. That is this grammar's standing trade — the same one
  // `extern_declaration` makes for its modifiers, and `let` for `lyra-E029`: a semantic
  // mistake deserves a message naming the fix, not a syntax error pointing at whichever
  // token failed to shift. Giving the extern its own signature rule would mean a second
  // copy of `lambda_type` free to drift from this one, for a diagnostic the collector can
  // give better.
  //
  // Admitting it as a *member of the list* rather than as a trailing `optional` is what
  // keeps it cheap: no new sequence around the parenthesized list, so the parser tables
  // grow by the marker alone. Position — last, and after at least one named parameter —
  // is the collector's to check too.
  parameter_type_list: ($) =>
    commaSep1(choice($.parameter_type, $.variadic_parameter)),

  // **A parameter may be named** — `(dest: ^mut u8, destLen: ^mut CULong)`.
  //
  // Admitted wherever a function type is written and *required* by the collector in an
  // `extern` signature, where the declaration stands in for a C prototype and a positional
  // mistake links cleanly and computes garbage. Refused in a plain function *type*, where a
  // parameter name would name nothing. The same trade the variadic marker makes, and for
  // the same reason: the collector's message beats a syntax error pointing at whichever
  // token failed to shift.
  //
  // The name is told from a bare type by the `:` alone. That needs one token of lookahead
  // past the identifier, because a lowercase name in type position is a *type variable* —
  // `(t)` is a type and `(t: i64)` is a named parameter.
  parameter_type: ($) =>
    seq(
      optional(field("name", $.parameter_type_name)),
      optional(field("modifier", $.type_modifier)),
      field("type", $.type),
    ),

  // **The name and its colon are one token**, and that is forced rather than stylistic. A
  // lowercase name in type position is a *type variable* (`generic_type`, whose own leading
  // pattern is a bare regex), so `t` in `(t) -> u` and `n` in `(n: i64) -> u` are the same
  // lexeme — a *lexical* collision, which a `conflicts:` entry cannot resolve because the
  // choice is made before the parser sees it. Lexing `n:` as one token settles it by
  // maximal munch: a name is a name only when a colon follows.
  //
  // Whitespace is inside the token so `(n : i64)` still parses, matching what a lambda's
  // own parameter list allows.
  parameter_type_name: ($) => token(seq(/[a-z][a-zA-Z0-9_]*/, /[ \t]*/, ":")),

  // The C variadic marker. It names no type because there is none to name: what follows
  // `...` in a C call is whatever the caller passed, promoted.
  variadic_parameter: ($) => "...",

  type_modifier: ($) => choice("ref", "mut", "own"),
};
