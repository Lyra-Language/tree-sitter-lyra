const { PREC } = require("../prec");

module.exports = {
  boolean_expr: ($) =>
    prec(
      PREC.BOOLEAN_EXPR,
      choice(
        prec.left(PREC.UNARY, seq($.not, field("expression", $.expression))),
        prec.left(
          PREC.RELATIONAL,
          seq(
            field("left", $._math_operand),
            field(
              "operator",
              choice(
                $.spaceship_operator,
                $.greater_than_operator,
                $.less_than_operator,
                $.greater_than_or_equal_operator,
                $.less_than_or_equal_operator,
              ),
            ),
            field("right", $._math_operand),
          ),
        ),
        prec.left(
          PREC.EQUALITY,
          seq(
            field("left", $._math_operand),
            field("operator", choice($.equals_operator, $.not_equals_operator)),
            field("right", $._math_operand),
          ),
        ),
        prec.left(
          PREC.LOGICAL_AND,
          seq(
            field("left", $._bool_operand),
            field("operator", $.and),
            field("right", $._bool_operand),
          ),
        ),
        prec.left(
          PREC.LOGICAL_OR,
          seq(
            field("left", $._bool_operand),
            field("operator", $.or),
            field("right", $._bool_operand),
          ),
        ),
      ),
    ),

  // Operand positions for && / ||: accepts nested boolean expressions,
  // any literal (catches non-bool literals so the type-checker can report
  // them), and postfix expressions (identifiers, calls, member accesses, …)
  // that may resolve to bool at type-check time.
  _bool_operand: ($) => choice($.boolean_expr, $._literal, $._postfix_expr),

  // Keep these for backwards compatibility if used elsewhere
  _equality_operator: ($) => choice($.equals_operator, $.not_equals_operator),
  equals_operator: ($) => "==",
  not_equals_operator: ($) => "!=",

  _relational_operator: ($) =>
    choice(
      $.spaceship_operator,
      $.greater_than_operator,
      $.less_than_operator,
      $.greater_than_or_equal_operator,
      $.less_than_or_equal_operator,
    ),
  greater_than_operator: ($) => ">",
  less_than_operator: ($) => "<",
  greater_than_or_equal_operator: ($) => ">=",
  less_than_or_equal_operator: ($) => "<=",
  spaceship_operator: ($) => "<=>",

  and: ($) => "&&",
  or: ($) => "||",
  not: ($) => "!",
};
