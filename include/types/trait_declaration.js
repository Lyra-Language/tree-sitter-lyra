const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  trait_declaration: ($) =>
    seq(
      optional(field("visibility", $.visibility)),
      "trait",
      field("name", alias($.user_defined_type_name, $.trait_name)),
      optional(field("generic_parameters", $.generic_parameters)),
      optional(seq(":", field("trait_bounds", $.trait_bounds))),
      optional(
        seq(
          "where",
          field(
            "trait_generic_parameter_constraints",
            $.trait_generic_parameter_constraints,
          ),
        ),
      ),
      "{",
      field("methods", $.trait_methods),
      "}",
    ),

  trait_bounds: ($) =>
    seq(
      alias($.user_defined_type_name, $.trait_name),
      repeat(seq("+", alias($.user_defined_type_name, $.trait_name))),
    ),

  trait_generic_parameter_constraints: ($) =>
    seq(
      $.trait_generic_parameter_constraint,
      repeat(seq(",", $.trait_generic_parameter_constraint)),
      optional(","),
    ),

  trait_generic_parameter_constraint: ($) =>
    seq(
      field("generic_type", $.generic_type),
      ":",
      field("trait_bounds", $.trait_bounds),
    ),

  trait_methods: ($) => commaSep1($.trait_method),

  trait_method: ($) =>
    seq(
      field("name", choice($.identifier, $.unary_operator, $.binary_operator)),
      ":",
      field("signature", alias($.function_type, $.trait_method_signature)),
    ),

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
