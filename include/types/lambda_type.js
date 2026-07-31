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

  parameter_type_list: ($) => commaSep1($.parameter_type),

  parameter_type: ($) =>
    seq(optional(field("modifier", $.type_modifier)), field("type", $.type)),

  type_modifier: ($) => choice("ref", "mut", "own"),
};
