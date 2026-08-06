const { PREC } = require("../../prec");

module.exports = {
  // Pattern matching expressions
  match_expr: $ => prec(PREC.MATCH_EXPR, seq(
    'match',
    field('value', $.expression),
    '{',
    $.match_arm,
    repeat(seq($._comma, $.match_arm)),
    optional($._comma),
    '}'
  )),

  // An arm body is an expression **or a bare jump**. The jump forms are statements,
  // not expressions, so without listing them `None => break` parsed `break` as an
  // identifier and reported `undefined identifier "break"` — while the block form
  // `None => { break }` worked, because a block holds statements. Only the spelling
  // was missing; the collector rewrites a bare jump into exactly that block, so
  // nothing downstream learns this alternative exists.
  //
  // `_arm_jump` rather than the three rules inline: it keeps the choice named for the
  // corpus and makes the set easy to extend if another statement form ever belongs
  // here.
  match_arm: $ => seq(
    field('pattern', $.pattern),
    optional(field('guard', $.guard)),
    '=>',
    field('body', choice($.expression, $._arm_jump))
  ),

  _arm_jump: $ =>
    choice($.break_statement, $.continue_statement, $.return_statement),

  guard: $ => seq('if', field('guard_expression', $.expression)),
}
