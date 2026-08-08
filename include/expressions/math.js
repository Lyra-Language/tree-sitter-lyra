const { PREC } = require("../prec");

/**
 * Arithmetic expression rules.
 *
 * Design notes:
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
 *
 *   Runtime math (`binary_expression` / `negation`) and type-level
 *   constraint math (`constraint_binary_expression` /
 *   `constraint_negation`) share identical grammar productions but
 *   inhabit different semantic spaces — runtime expressions vs.
 *   compile-time numeric constraints on generic type parameters. The
 *   `arithmeticRules` factory below builds both from one place so the
 *   precedence / associativity rules stay in lock-step. The two
 *   sub-grammars differ only in their operand rule and in the node
 *   names they expose.
 */

/**
 * Build a `{ [binary]: …, [unary]: … }` rule map over the supplied
 * operand rule. `operand` is itself a `($) => rule` thunk so the
 * factory stays compatible with tree-sitter's `grammar({ rules: … })`
 * function-style rule definitions.
 */
function arithmeticRules({ binary, unary, bitnot, operand }) {
  // One band per precedence level. Each is `prec.left` at its own level, so the
  // relative ordering in prec.js is the only thing that decides grouping — see
  // the PREC comment for why bitwise sits between comparison and arithmetic.
  const band = (level, ops) => ($) =>
    prec.left(
      level,
      seq(
        field("left", operand($)),
        field("operator", choice(...ops($))),
        field("right", operand($)),
      ),
    );

  const bands = [
    band(PREC.BITWISE_OR, ($) => [$.bitor_operator]),
    band(PREC.BITWISE_XOR, ($) => [$.bitxor_operator]),
    band(PREC.BITWISE_AND, ($) => [$.bitand_operator]),
    band(PREC.ADDITIVE, ($) => [$.add_operator, $.sub_operator]),
    band(PREC.SHIFT, ($) => [$.shl_operator, $.shr_operator]),
    band(PREC.MULTIPLICATIVE, ($) => [
      $.mul_operator,
      $.div_operator,
      $.mod_operator,
      $.remainder_operator,
    ]),
  ];

  return {
    [binary]: ($) => choice(...bands.map((b) => b($))),

    [unary]: ($) =>
      prec.right(
        PREC.UNARY,
        seq(field("operator", "-"), field("operand", operand($))),
      ),

    // Bitwise complement. `~` is *also* the binary xor operator, exactly as `-`
    // is both subtraction and negation: the two are told apart by position, and
    // `prec.right(UNARY)` here beats the binary band the same way negation does.
    [bitnot]: ($) =>
      prec.right(
        PREC.UNARY,
        seq(field("operator", "~"), field("operand", operand($))),
      ),
  };
}

module.exports = {
  _math_expr: ($) =>
    choice(
      $.binary_expr,
      $.compound_assignment,
      $.negation,
      $.bitwise_not,
    ),

  ...arithmeticRules({
    binary: "binary_expr",
    unary: "negation",
    bitnot: "bitwise_not",
    operand: ($) => $._math_operand,
  }),

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
            $.mod_assign_operator,
            $.remainder_assign_operator,
            $.bitand_assign_operator,
            $.bitor_assign_operator,
            $.bitxor_assign_operator,
            $.shl_assign_operator,
            $.shr_assign_operator,
          ),
        ),
        field("right", $._math_operand),
      ),
    ),

  // String concatenation
  string_concat_expr: ($) =>
    prec.left(
      PREC.STRING_CONCAT,
      seq(
        field("left", $._string_concat_operand),
        field("operator", $.string_concat_operator),
        field("right", $._string_concat_operand),
      ),
    ),

  string_concat_operator: ($) => "++",

  // Operand for `++`: string literals, raw strings, postfix expressions
  // (identifiers, calls, member access, …), and nested concat expressions.
  // A string literal is not listed: it is a `_primary_expr` as of 08/06, so it
  // arrives through `_postfix_expr` — and listing it here as well made `"a" ++ b`
  // an unresolved reduce-reduce over which route a bare literal took.
  _string_concat_operand: ($) =>
    choice(
      $._postfix_expr,
      $.string_concat_expr,
    ),

  add_operator: ($) => "+",
  sub_operator: ($) => "-",
  mul_operator: ($) => "*",
  div_operator: ($) => "/",
  mod_operator: ($) => "%",
  remainder_operator: ($) => "%%",
  // Bitwise and shift. `~` is xor here and complement in prefix position (see
  // arithmeticRules); `&`/`|` are the single-character forms, so the two-character
  // logical `&&`/`||` still win by longest match.
  bitand_operator: ($) => "&",
  bitor_operator: ($) => "|",
  bitxor_operator: ($) => "~",
  shl_operator: ($) => "<<",
  shr_operator: ($) => ">>",

  add_assign_operator: ($) => "+=",
  sub_assign_operator: ($) => "-=",
  mul_assign_operator: ($) => "*=",
  div_assign_operator: ($) => "/=",
  mod_assign_operator: ($) => "%=",
  remainder_assign_operator: ($) => "%%=",
  bitand_assign_operator: ($) => "&=",
  bitor_assign_operator: ($) => "|=",
  bitxor_assign_operator: ($) => "~=",
  shl_assign_operator: ($) => "<<=",
  shr_assign_operator: ($) => ">>=",

  // A parenthesized arithmetic expression. It is reached **only** through
  // `_primary_expr` (postfix.js), not from `_math_expr` — every math operand still
  // finds it, since `_math_operand` includes `_postfix_expr`.
  //
  // That single path is the point, and it was two until 08/07. `group` sat in
  // `_math_expr` alone, so `(x + y)` could not head a postfix form and `(a + b).x` was
  // a syntax error while `(a).x` parsed — a non-math parenthesis is a
  // `parenthesized_expr`, which is a primary. Adding `group` to `_primary_expr`
  // *beside* the `_math_expr` arm is an unresolved conflict (tree-sitter names it:
  // `group` derivable two ways at every operand), so the arm came out instead. One path
  // to one node, and the parser lost 19 states rather than gaining any.
  group: ($) => prec(PREC.MATH_GROUP, seq("(", $._math_expr, ")")),

  // An operand inside an arithmetic expression. Atoms (numbers, postfix
  // forms like `foo(x).bar`) are the base cases; `_math_expr` allows
  // arbitrary nested math (a binary expr, another group, a negation, etc.)
  // while `prec.left` / `prec.right` on the containing rule resolves the
  // associativity / precedence for chained operators.
  // `tuple_literal` is here, and nowhere else reachable from arithmetic (08/07): a
  // constructor call is `Cents(1)`, which lives in `_literal`, so `Cents(1) + Cents(2)`
  // did not parse while `f(1) + f(2)` did. It cannot move into `_primary_expr` instead —
  // see the note in literals/index.js for the second reading that would create.
  _math_operand: ($) =>
    choice($._postfix_expr, $._math_expr, $.address_of_expr, $.tuple_literal),

  // ---------------------------------------------------------------------
  // Constraint arithmetic — used inside type-level constraint expressions
  // (e.g. `where range(0..<=2*PI)` in a constrained type). This is an
  // independent sub-grammar that operates over `identifier` /
  // `const_identifier` / number literals rather than runtime expressions,
  // so it stays separate from `_math_expr` / `binary_expr` above
  // even though the operator productions are identical. Sharing the
  // productions via `arithmeticRules` guarantees the two sub-grammars
  // cannot drift apart on precedence or associativity.
  // ---------------------------------------------------------------------

  constraint_math_expr: ($) =>
    choice(
      $._number_literal,
      $.constraint_binary_expr,
      $.constraint_negation,
      $.constraint_bitwise_not,
      $.identifier,
      $.const_identifier,
    ),

  ...arithmeticRules({
    binary: "constraint_binary_expr",
    unary: "constraint_negation",
    bitnot: "constraint_bitwise_not",
    operand: ($) => $.constraint_math_expr,
  }),
};
