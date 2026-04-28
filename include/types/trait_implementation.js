const { commaSep1 } = require("../helpers");
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
        field("methods", $.impl_methods),
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
      field("trait_bounds", $.trait_bounds),
    ),

  impl_methods: ($) => commaSep1($.trait_method_implementation),

  trait_method_implementation: ($) =>
    seq(
      field("method_name", $.method_name),
      "=",
      field("function_clause", $.function_clause),
    ),

  method_name: ($) => choice($.identifier, $.unary_operator, $.binary_operator),
};
