const { PREC } = require("../prec");

module.exports = {
  boolean_expr: $ => prec(PREC.BOOLEAN_EXPR, choice(
    prec.left(PREC.UNARY, seq($.not, field('expression', $.expression))),
    prec.left(PREC.RELATIONAL, seq(
      field('left', $._math_operand),
      field('operator', choice(
        $.greater_than_operator,
        $.less_than_operator,
        $.greater_than_or_equal_operator,
        $.less_than_or_equal_operator,
      )),
      field('right', $._math_operand)
    )),
    prec.left(PREC.EQUALITY, seq(
      field('left', $._math_operand),
      field('operator', choice($.equals_operator, $.not_equals_operator)),
      field('right', $._math_operand)
    )),
    prec.left(PREC.LOGICAL_AND, seq(field('left', $.boolean_expr), field('operator', $.and), field('right', $.boolean_expr))),
    prec.left(PREC.LOGICAL_OR, seq(field('left', $.boolean_expr), field('operator', $.or), field('right', $.boolean_expr))),
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
