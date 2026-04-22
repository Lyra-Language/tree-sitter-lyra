const control_flow = require('./control_flow/');
const boolean = require('./boolean');
const array_comp_expr = require('./array_comprehension');
const math = require('./math');
const range = require('./range');
const postfix = require('./postfix');
const { PREC } = require('../prec');

module.exports = {
  expression: $ => choice(
    $.block,
    $.await_expression,
    $._literal,
    $.data_constructor_expression,
    $._postfix_expression,
    $._math_expr,
    $.boolean_expr,
    $.range_expression,
    $.if_then_expr,
    $.if_block_expr,
    $.match_expr,
    $.spread_expr,
    $.lambda_expression,
    $.array_comp_expr,
    $.null_coalescing_expression,
    // Note: user_defined_type_name is accessed via _postfix_expression -> _primary_expression
  ),

  block: $ => prec.left(PREC.BLOCK, seq('{', repeat($.statement), '}')),

  // Await expression for async operations
  await_expression: $ => prec.right(PREC.AWAIT, seq(
    'await',
    field('operand', $.expression)
  )),

  identifier: $ => token(prec(PREC.IDENTIFIER_TOKEN, /[a-z][a-zA-Z0-9_]*/)),
  const_identifier: $ => /[A-Z][A-Z0-9_]*/,

  // Grouping
  parenthesized_expression: $ => seq('(', $.expression, ')'),

  // Data constructor application (single argument, no parens): Some fn(x), None
  data_constructor_expression: $ => seq(
    field('constructor', alias($.user_defined_type_name, $.data_type_name)),
    field('value', $.expression)
  ),

  // Null coalescing - provide default value for Maybe<T>
  null_coalescing_expression: $ => prec.right(PREC.NULL_COALESCE, seq(
    field('optional', $.expression),
    '??',
    field('default', $.expression)
  )),

  spread_expr: $ => prec.right(PREC.SPREAD, seq('...', $.identifier)),

  ...control_flow,
  ...boolean,
  ...math,
  ...range,
  ...array_comp_expr,
  ...postfix,
}