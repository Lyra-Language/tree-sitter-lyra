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

  parameter_type: ($) =>
    seq(optional(field("modifier", $.type_modifier)), field("type", $.type)),

  // The C variadic marker. It names no type because there is none to name: what follows
  // `...` in a C call is whatever the caller passed, promoted.
  variadic_parameter: ($) => "...",

  type_modifier: ($) => choice("ref", "mut", "own"),
};
