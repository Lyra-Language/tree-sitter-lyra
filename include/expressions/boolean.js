module.exports = {
  boolean_expr: $ => prec(10, choice(
    prec.left(140, seq($.not, field('expression', $.expression))),
    prec.left(90, seq(
      field('left', $._math_expr),
      field('operator', choice(
        $.greater_than_operator,
        $.less_than_operator,
        $.greater_than_or_equal_operator,
        $.less_than_or_equal_operator,
      )),
      field('right', $._math_expr)
    )),
    prec.left(80, seq(
      field('left', $._math_expr),
      field('operator', choice($.equals_operator, $.not_equals_operator)),
      field('right', $._math_expr)
    )),
    prec.left(40, seq(field('left', $.boolean_expr), field('operator', $.and), field('right', $.boolean_expr))),
    prec.left(30, seq(field('left', $.boolean_expr), field('operator', $.or), field('right', $.boolean_expr))),
  )),

  // Keep these for backwards compatibility if used elsewhere
  _equality_operator: $ => choice($.equals_operator, $.not_equals_operator),
  equals_operator: $ => '==',
  not_equals_operator: $ => '!=',

  _relational_operator: $ => choice(
    $.greater_than_operator,
    $.less_than_operator,
    $.greater_than_or_equal_operator,
    $.less_than_or_equal_operator,
  ),
  greater_than_operator: $ => '>',
  less_than_operator: $ => '<',
  greater_than_or_equal_operator: $ => '>=',
  less_than_or_equal_operator: $ => '<=',

  and: $ => token('&&'),
  or: $ => token('||'),
  not: $ => token('!'),
}