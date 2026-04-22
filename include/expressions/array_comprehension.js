const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  array_comp_expr: ($) =>
    prec(
      PREC.ARRAY_COMP,
      seq(
        "[",
        $._generators,
        optional(seq("|", $._guards)),
        "|",
        field("result_expression", $.result_expression),
        "]",
      ),
    ),

  _generators: ($) => commaSep1($.generator),
  generator: ($) =>
    seq(
      field(
        "value",
        choice(
          $.range_expression,
          $.array_literal,
          $.string_literal,
          $.identifier,
        ),
      ),
      "->",
      field("identifier", $.identifier),
    ),

  _guards: ($) => field("guards", commaSep1($.comprehension_guard)),
  comprehension_guard: ($) =>
    choice($.boolean_expr, $.call_expression, $.identifier),

  result_expression: ($) =>
    choice(
      $._math_expr,
      $.identifier,
      $.tuple_literal,
      $.struct_literal,
      $.array_literal,
    ),
};
