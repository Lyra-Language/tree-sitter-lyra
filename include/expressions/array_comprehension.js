const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  // `[ x in 1..<=10 | even(x) | x * x ]` — generators, optional guards, result,
  // each separated by `|`.
  //
  // Since `|` became bitwise-or, `[ x in R | A | B ]` fits two readings: guard
  // `A` with result `B`, or *no* guard and the single result `A | B`. Both parses
  // complete, so this is a genuine GLR ambiguity rather than a shift/reduce one,
  // and `prec.dynamic` is what picks between completed parses — the guarded
  // branch wins.
  //
  // That makes the rule inside a comprehension: **a top-level `|` is a section
  // separator; parenthesize a bitwise-or that is meant as a value**
  // (`[ x in R | (a | b) ]`). Choosing the other way would silently turn every
  // guarded comprehension into an unguarded one whose result is a bitwise-or —
  // which is exactly what happened before this precedence was added, and it was
  // a wrong tree rather than a parse error.
  array_comp_expr: ($) =>
    prec(
      PREC.ARRAY_COMP,
      seq(
        "[",
        $._generators,
        choice(
          prec.dynamic(
            1,
            seq(
              "|",
              $._guards,
              "|",
              field("result_expr", $.result_expr),
            ),
          ),
          seq("|", field("result_expr", $.result_expr)),
        ),
        "]",
      ),
    ),

  _generators: ($) => commaSep1($.generator),
  generator: ($) =>
    seq(
      field("identifier", $.identifier),
      "in",
      field(
        "value",
        choice($.range_expr, $.array_literal, $.string_literal, $.identifier),
      ),
    ),

  _guards: ($) => field("guards", commaSep1($.comprehension_guard)),
  comprehension_guard: ($) => choice($.boolean_expr, $.call_expr, $.identifier),

  result_expr: ($) =>
    choice(
      // `_math_operand` already covers plain identifiers / postfix forms
      // (e.g. `x`, `foo(x).bar`) as well as any nested math expression
      // (e.g. `x * 2`), so we don't need a separate `$.identifier` branch.
      $._math_operand,
      $.tuple_literal,
      $.named_struct_literal,
      $.anonymous_struct_literal,
      $.array_literal,
    ),
};
