const { PREC } = require("../prec");

module.exports = {
  // Postfix expressions with binary nesting - each operation wraps the previous
  _postfix_expr: $ => choice(
    $.call_expr,
    $.member_expr,
    $.optional_member_expr,
    $.index_expr,
    $.optional_index_expr,
    $.try_expr,
    $.deref_expr,
    $._primary_expr,
  ),

  _primary_expr: $ => choice(
    $.identifier,
    $.const_identifier,
    $.user_defined_type_name,  // For static method calls like Arena.new()
    $.parenthesized_expr,
  ),

  call_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('function', $._postfix_expr),
    optional(field('generic_arguments', $.generic_arguments)),
    field('arguments', $.argument_list)
  )),

  member_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '.',
    field('property', choice($.identifier, $.const_identifier))
  )),

  // Optional member access - safe navigation for Maybe<T>
  // Returns Maybe<T> instead of T, doesn't change control flow
  optional_member_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '?.',
    field('property', choice($.identifier, $.const_identifier))
  )),

  index_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '[',
    field('index', $.expression),
    ']'
  )),

  // Optional index access - safe indexing for Maybe<T> or bounds checking
  // Returns Maybe<T> instead of T
  optional_index_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('object', $._postfix_expr),
    '?[',
    field('index', $.expression),
    ']'
  )),

  try_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('operand', $._postfix_expr),
    '?'
  )),

  deref_expr: $ => prec.left(PREC.POSTFIX, seq(
    field('operand', $._postfix_expr),
    '^'
  )),
}