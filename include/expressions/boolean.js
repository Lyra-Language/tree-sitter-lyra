const { PREC } = require("../prec");

module.exports = {
  boolean_expr: ($) =>
    prec(
      PREC.BOOLEAN_EXPR,
      choice(
        prec.left(
          PREC.UNARY,
          seq(field("operator", $.not), field("expression", $._not_operand)),
        ),
        prec.left(
          PREC.RELATIONAL,
          seq(
            field("left", $._comparison_operand),
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
            field("right", $._comparison_operand),
          ),
        ),
        prec.left(
          PREC.EQUALITY,
          seq(
            field("left", $._comparison_operand),
            field("operator", choice($.equals_operator, $.not_equals_operator)),
            field("right", $._comparison_operand),
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

  // The operand of `!`. Deliberately *not* `$.expression`: PREC.UNARY on the rule
  // above cannot stop a wider operand rule from absorbing more, so with
  // `$.expression` there `!a && b` parsed as `!(a && b)` — the operand swallowed
  // the `&&` — which is the opposite grouping from every C-family language and
  // silently changes what the program means. (It went unnoticed because `!` had no
  // backend lowering at all until 08/05, so no program using it could be built.)
  //
  // A postfix expression is the right width: it reaches `parenthesized_expr`, so
  // `!(a && b)` still says the other thing, and it keeps `!` binding tighter than
  // every binary operator, which is what UNARY was always meant to express. A
  // nested `!` is admitted explicitly so `!!x` parses; recursing through
  // `boolean_expr` generally would put the swallowing back.
  // The nested `!` is aliased back to `boolean_expr`, so `!!x` produces exactly
  // the node the collector already reads (kind `boolean_expr`, `operator` field of
  // kind `not`) and nothing downstream learns this rule exists.
  _not_operand: ($) =>
    choice(
      $._literal,
      $._postfix_expr,
      alias($.boolean_not_expr, $.boolean_expr),
    ),

  boolean_not_expr: ($) =>
    prec.left(
      PREC.UNARY,
      seq(field("operator", $.not), field("expression", $._not_operand)),
    ),

  // Operand positions for && / ||: accepts nested boolean expressions,
  // any literal (catches non-bool literals so the type-checker can report
  // them), and postfix expressions (identifiers, calls, member accesses, …)
  // that may resolve to bool at type-check time.
  _bool_operand: ($) =>
    choice($.boolean_expr, $._literal, $._postfix_expr),

  _comparison_operand: ($) =>
    choice(
      $._literal,
      $._postfix_expr,
      $._math_expr,
      $.address_of_expr,
    ),

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
