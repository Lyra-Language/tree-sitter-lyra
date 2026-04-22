const { PREC } = require("../prec");

/**
 * Arithmetic expression rules.
 *
 * Design note:
 *
 *   `_math_expr` is intentionally narrow — it matches ONLY forms that contain
 *   an actual math operator (binary op, compound assignment, negation, or a
 *   parenthesised math group). Bare number literals and postfix expressions
 *   are reached directly from `expression` via `$._literal` / `$._postfix_expression`.
 *
 *   Previously an auxiliary `_primary_math_expr` rule made `_math_expr`
 *   transparently dispatch to `$._postfix_expression`, which meant every
 *   postfix form (call, member, index, …) had two parse paths: once as a
 *   peer of `_math_expr` inside `expression`, and once nested inside
 *   `_math_expr -> _primary_math_expr -> _postfix_expression`. That hidden
 *   re-entry forced extra `conflicts` entries and made the grammar harder
 *   to reason about. The current shape eliminates the re-entry entirely:
 *   operand positions inside `binary_expression`/`compound_assignment` use
 *   the hidden `_math_operand` helper, and `expression` lists `_math_expr`
 *   and `_postfix_expression` as disjoint siblings.
 *
 *   The four binary operators and the four compound-assignment operators
 *   are collapsed into single `binary_expression` / `compound_assignment`
 *   node kinds, with the specific operator exposed as a named child node
 *   (`add_operator`, `sub_operator`, …). This mirrors how `boolean_expr`
 *   already models its relational / equality operators and lets both the
 *   corpus tests and the Go collector recover the operator through one
 *   code path instead of four parallel ones.
 */

module.exports = {
  _math_expr: ($) =>
    choice($.binary_expression, $.compound_assignment, $.negation, $.group),

  binary_expression: ($) =>
    choice(
      prec.left(
        PREC.ADDITIVE,
        seq(
          field("left", $._math_operand),
          field("operator", choice($.add_operator, $.sub_operator)),
          field("right", $._math_operand),
        ),
      ),
      prec.left(
        PREC.MULTIPLICATIVE,
        seq(
          field("left", $._math_operand),
          field("operator", choice($.mul_operator, $.div_operator)),
          field("right", $._math_operand),
        ),
      ),
    ),

  compound_assignment: ($) =>
    prec.right(
      PREC.ADDITIVE,
      seq(
        field("left", $._math_operand),
        field(
          "operator",
          choice(
            $.add_assign_operator,
            $.sub_assign_operator,
            $.mul_assign_operator,
            $.div_assign_operator,
          ),
        ),
        field("right", $._math_operand),
      ),
    ),

  add_operator: ($) => "+",
  sub_operator: ($) => "-",
  mul_operator: ($) => "*",
  div_operator: ($) => "/",
  add_assign_operator: ($) => "+=",
  sub_assign_operator: ($) => "-=",
  mul_assign_operator: ($) => "*=",
  div_assign_operator: ($) => "/=",

  negation: ($) =>
    prec.right(
      PREC.UNARY,
      seq(field("operator", "-"), field("operand", $._math_operand)),
    ),

  group: ($) => prec(PREC.MATH_GROUP, seq("(", $._math_expr, ")")),

  // An operand inside an arithmetic expression. Atoms (numbers, postfix
  // forms like `foo(x).bar`) are the base cases; `_math_expr` allows
  // arbitrary nested math (a binary expr, another group, a negation, etc.)
  // while `prec.left` / `prec.right` on the containing rule resolves the
  // associativity / precedence for chained operators.
  _math_operand: ($) =>
    choice($._number_literal, $._postfix_expression, $._math_expr),

  // ---------------------------------------------------------------------
  // Constraint arithmetic — used inside type-level constraint expressions
  // (e.g. `where n >= 1` in a constrained type). This is an independent
  // sub-grammar that operates over `const_identifier` / generic type
  // variables rather than runtime expressions, so it intentionally stays
  // separate from `_math_expr` / `binary_expression` above.
  // ---------------------------------------------------------------------

  constraint_math_expr: ($) =>
    choice(
      $._number_literal,
      $._constraint_arithmetic_operator,
      $.constraint_negation,
      $.identifier,
      $.const_identifier,
    ),

  _constraint_arithmetic_operator: ($) =>
    choice(
      $.constraint_addition,
      $.constraint_subtraction,
      $.constraint_multiplication,
      $.constraint_division,
    ),

  constraint_addition: ($) =>
    prec.left(
      PREC.ADDITIVE,
      seq(
        field("left", $.constraint_math_expr),
        field("operator", "+"),
        field("right", $.constraint_math_expr),
      ),
    ),
  constraint_subtraction: ($) =>
    prec.left(
      PREC.ADDITIVE,
      seq(
        field("left", $.constraint_math_expr),
        field("operator", "-"),
        field("right", $.constraint_math_expr),
      ),
    ),
  constraint_multiplication: ($) =>
    prec.left(
      PREC.MULTIPLICATIVE,
      seq(
        field("left", $.constraint_math_expr),
        field("operator", "*"),
        field("right", $.constraint_math_expr),
      ),
    ),
  constraint_division: ($) =>
    prec.left(
      PREC.MULTIPLICATIVE,
      seq(
        field("left", $.constraint_math_expr),
        field("operator", "/"),
        field("right", $.constraint_math_expr),
      ),
    ),
  constraint_negation: ($) =>
    prec.right(
      PREC.UNARY,
      seq(
        field("operator", "-"),
        field("operand", $.constraint_math_expr),
      ),
    ),
};
