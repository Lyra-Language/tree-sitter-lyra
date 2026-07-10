const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  trait_declaration: ($) =>
    seq(
      optional(field("visibility", $.visibility)),
      "trait",
      field("name", alias($.user_defined_type_name, $.trait_name)),
      optional(field("generic_parameters", $.generic_parameters)),
      optional(seq(":", field("trait_bounds", alias($.generic_bounds, $.trait_bounds)))),
      optional(
        seq(
          "where",
          field(
            "generic_parameter_constraints",
            $.generic_parameter_constraints,
          ),
        ),
      ),
      "{",
      field("methods", $.trait_methods),
      "}",
    ),

  generic_bounds: ($) =>
    seq(
      alias($.user_defined_type_name, $.trait_name),
      repeat(seq("+", alias($.user_defined_type_name, $.trait_name))),
    ),

  generic_parameter_constraints: ($) =>
    seq(
      $.generic_parameter_constraint,
      repeat(seq(",", $.generic_parameter_constraint)),
      optional(","),
    ),

  generic_parameter_constraint: ($) =>
    seq(
      field("generic_type", $.generic_type),
      ":",
      field("generic_bounds", $.generic_bounds),
    ),

  trait_methods: ($) => commaSep1($.trait_method),

  trait_method: ($) =>
    seq(
      optional(field("is_pure", $.pure_modifier)),
      optional(field("is_det", $.det_modifier)),
      optional(field("is_noalloc", $.noalloc_modifier)),
      field("name", choice($.identifier, $.unary_operator, $.binary_operator)),
      ":",
      field("signature", alias($.lambda_type, $.trait_method_signature)),
      optional(field("default", $.default_method_implementation)),
    ),

  default_method_implementation: ($) =>
    seq("=", field("body", alias($.lambda_clause, $.default_method_clause))),

  unary_operator: ($) =>
    prec(PREC.OPERATOR_OVERLOAD, seq("(", choice($.prefix_operator, $.suffix_operator), ")")),

  prefix_operator: ($) => prec(PREC.OPERATOR_OVERLOAD, seq(choice("-", "!", "~"), "_")),

  suffix_operator: ($) => prec(PREC.OPERATOR_OVERLOAD, seq("_", choice("++", "--"))),

  binary_operator: ($) =>
    prec(
      PREC.OPERATOR_OVERLOAD,
      seq(
        "(",
        "_",
        choice(
          token("=="),
          token("!="),
          token(">"),
          token("<"),
          token(">="),
          token("<="),
          token("<=>"),
          token("&&"),
          token("||"),
          token("+"),
          token("-"),
          token("*"),
          token("/"),
          token("%"),
          token("**"),
          token("<<"),
          token(">>"),
          token("&"),
          token("|"),
          token("^"),
        ),
        "_",
        ")",
      ),
    ),
};
