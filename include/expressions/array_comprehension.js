module.exports = {
  array_comp_expr: $ => prec(2, seq(
    '[',
    $._generators,
    optional(seq('|', $._guards)),
    '|',
    field('result_expression', $.result_expression),
    ']',
  )),

  _generators: $ => seq(
    $.generator,
    repeat(seq(',', $.generator)),
    optional(','),
  ),
  generator: $ => seq(
    field('value', choice($.range_expression, $.array_literal, $.string_literal, $.identifier)),
    '->',
    field('identifier', $.identifier),
  ),

  _guards: $ => field('guards', seq(
    $.comprehension_guard,
    repeat(seq(',', $.comprehension_guard)),
    optional(','),
  )),
  comprehension_guard: $ => choice($.boolean_expr, $.call_expression, $.identifier),

  result_expression: $ => choice(
    $._math_expr,
    $.identifier,
    $.tuple_literal,
    $.struct_literal,
    $.array_literal,
  ),
}