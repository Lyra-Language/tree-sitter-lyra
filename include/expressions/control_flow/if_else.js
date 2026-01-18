module.exports = {
  if_then_expr: $ => prec.right(10, seq(
    'if',
    field('condition', $.if_condition),
    'then',
    field('then_expression', $.expression),
    optional(seq(
      'else',
      field('else_branch', choice($.if_then_expr, $.expression))
    )),
    optional('end'),
  )),

  if_block_expr: $ => prec.right(10, seq(
    'if',
    field('condition', $.if_condition),
    field('then_block', $.block),
    optional(seq(
      'else',
      field('else_branch', choice($.if_block_expr, $.block))
    ))
  )),

  if_condition: $ => choice(
    $.boolean_expr, 
    $._postfix_expression,
  ),
}