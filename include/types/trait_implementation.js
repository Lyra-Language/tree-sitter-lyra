const { parameter } = require("../expressions/functions/lambda");
const { commaSep1, parameterList } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  trait_implementation: ($) =>
    prec.right(
      PREC.TRAIT_IMPL,
      seq(
        "impl",
        field("trait_name", alias($.user_defined_type_name, $.trait_name)),
        optional(field("generic_parameters", seq("<", commaSep1($.type), ">"))),
        "for",
        field("type", $.type),
        optional(seq("where", field("constraints", $.impl_constraints))),
        "{",
        optional(field("methods", $.impl_methods)),
        "}",
      ),
    ),

  impl_constraints: ($) =>
    seq($.impl_constraint, repeat(seq(",", $.impl_constraint)), optional(",")),

  impl_constraint: ($) =>
    seq(
      field(
        "generic_type",
        choice($.generic_type, alias($.identifier, $.generic_type)),
      ),
      ":",
      field("trait_impl_bounds", $.generic_bounds),
    ),

  impl_methods: ($) => commaSep1($.trait_method_implementation),

  // Purity/effect bounds sit between `=` and the clause, mirroring a free
  // function's `name = pure (params) => body` — they modify the value being
  // bound, not the name. `det`/`noalloc` parallel `pure` (see lambda.js).
  trait_method_implementation: ($) =>
    seq(
      field("method_name", $.method_name),
      "=",
      optional(field("is_pure", $.pure_modifier)),
      optional(field("is_det", $.det_modifier)),
      optional(field("is_noalloc", $.noalloc_modifier)),
      field("method_clause", alias($.lambda_clause, $.method_clause)),
    ),

  method_name: ($) => choice($.identifier, $.unary_operator, $.binary_operator),
};
