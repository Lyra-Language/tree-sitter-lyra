const control_flow = require('./control_flow/');
const boolean = require('./boolean');
const array_comprehension = require('./array_comprehension');
const math = require('./math');
const range = require('./range');
const postfix = require('./postfix');

module.exports = {
  expression: $ => choice(
    $.block,
    $.await_expression,
    $._postfix_expression,
    $._math_expr,
    $.boolean_expr,
    $.range_expression,
    $.if_then_expr,
    $.if_block_expr,
    $.match_expr,
    $._literal,
    $.spread_expr,
    $.lambda_expression,
    $.array_comprehension,
    $.null_coalescing_expression,
    // Note: user_defined_type_name is accessed via _postfix_expression -> _primary_expression
  ),

  block: $ => prec.left(2, seq('{', repeat($.statement), '}')),

  // Await expression for async operations
  await_expression: $ => prec.right(250, seq(
    'await',
    field('operand', $.expression)
  )),

  identifier: $ => /[a-z][a-zA-Z0-9_]*/,
  const_identifier: $ => /[A-Z][A-Z0-9_]*/,

  // Grouping
  parenthesized_expression: $ => seq('(', $.expression, ')'),

  _primary_expression: $ => choice(
    $.identifier,
    $.const_identifier,
    $.user_defined_type_name,  // For static method calls like Arena.new()
    $.parenthesized_expression,
    // $.lambda_expression, // TODO: add lambda expression
  ),

  // Null coalescing - provide default value for Maybe<T>
  null_coalescing_expression: $ => prec.right(25, seq(
    field('optional', $.expression),
    '??',
    field('default', $.expression)
  )),

  spread_expr: $ => prec.right(20, seq('...', $.identifier)),

  ...control_flow,
  ...boolean,
  ...math,
  ...range,
  ...array_comprehension,
  ...postfix,
}