const { commaSep1 } = require("../helpers");

module.exports = {
  trait_implementation: ($) =>
    prec.right(
      100,
      seq(
        "impl",
        alias($.user_defined_type_name, $.trait_name),
        optional(seq("<", commaSep1($.type), ">")),
        "for",
        $.type,
        optional(seq("where", field("constraints", $.impl_constraints))),
        "{",
        commaSep1(field("method", $.trait_method_implementation)),
        "}",
      ),
    ),

  impl_constraints: ($) => seq("(", commaSep1($.impl_constraint), ")"),

  impl_constraint: ($) => seq($.generic_type, ":", $.trait_bounds),

  trait_method_implementation: ($) =>
    seq(
      alias(
        choice($.identifier, $.unary_operator, $.binary_operator),
        $.method_name,
      ),
      "=",
      field("function_clause", $.function_clause),
    ),
};
