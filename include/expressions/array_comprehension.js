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

  // **Any expression.** This was a hand-maintained `choice` of `_math_operand`, the tuple
  // and struct literals, and an array literal — which is a list of "expression forms
  // someone needed so far", and it read as a rule the author had to learn: `[ x in xs |
  // "a" ++ b ]` was a *syntax error*, as were an `if`, a `match`, and a lambda in result
  // position. There is no property of a comprehension that any of those violate.
  //
  // **Widening it made the parser smaller**, which is why it is `$.expression` and not the
  // narrower list plus `string_concat_expr`: 8,232 → 8,202 states and 35 KB off
  // `parser.c`, and it retired the `[result_expr, _primary_expr]` conflict entry outright.
  // The list was competing with `_primary_expr` over what a bare name or literal in result
  // position reduces to; `$.expression` subsumes that reduction, so the ambiguity is gone
  // rather than resolved. Measured, and the conflict removal verified against the corpus
  // rather than trusted — generation's "unnecessary conflict" warning is documented in
  // CLAUDE.md as unreliable in this region, and here it happened to be right.
  //
  // The `|` rule is unaffected: `[ x in R | A | B ]` is still guard-then-result by
  // `prec.dynamic`, and a bitwise-or meant as a value is still parenthesized. That is a
  // choice between two *complete* parses, which widening the operand does not touch.
  result_expr: ($) => $.expression,
};
