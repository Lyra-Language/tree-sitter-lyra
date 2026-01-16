module.exports = {
  // Pattern matching expressions
  match_expr: $ => prec(201, seq(
    'match',
    field('value', $.expression),
    '{',
    $.match_arm,
    repeat(seq($._comma, $.match_arm)),
    optional($._comma),
    '}'
  )),

  match_arm: $ => seq(
    field('pattern', $.pattern),
    optional($.guard),
    '=>',
    field('body', $.expression)
  ),

  guard: $ => seq('if', $.expression),
}