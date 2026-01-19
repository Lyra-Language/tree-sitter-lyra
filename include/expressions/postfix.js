module.exports = {
  // Postfix expressions with binary nesting - each operation wraps the previous
  _postfix_expression: $ => choice(
    $.call_expression,
    $.member_expression,
    $.optional_member_expression,
    $.index_expression,
    $.optional_index_expression,
    $.try_expression,
    $._primary_expression,
  ),

  call_expression: $ => prec.left(300, seq(
    field('function', $._postfix_expression),
    optional(field('generic_arguments', $.generic_arguments)),
    field('arguments', $.argument_list)
  )),

  member_expression: $ => prec.left(300, seq(
    field('object', $._postfix_expression),
    '.',
    field('property', choice($.identifier, $.const_identifier))
  )),

  // Optional member access - safe navigation for Maybe<T>
  // Returns Maybe<T> instead of T, doesn't change control flow
  optional_member_expression: $ => prec.left(300, seq(
    field('object', $._postfix_expression),
    '?.',
    field('property', choice($.identifier, $.const_identifier))
  )),

  index_expression: $ => prec.left(300, seq(
    field('object', $._postfix_expression),
    '[',
    field('index', $.expression),
    ']'
  )),

  // Optional index access - safe indexing for Maybe<T> or bounds checking
  // Returns Maybe<T> instead of T
  optional_index_expression: $ => prec.left(300, seq(
    field('object', $._postfix_expression),
    '?[',
    field('index', $.expression),
    ']'
  )),

  try_expression: $ => prec.left(300, seq(
    field('operand', $._postfix_expression),
    '?'
  )),
}