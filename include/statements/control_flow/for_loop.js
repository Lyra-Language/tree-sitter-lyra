module.exports = {
  // for i = 0; i < 10; i++ { println("i: ${i}") }
  for_loop: $ => seq(
    optional(seq(alias($.identifier, $.label), ':')),
    'for',
    optional($.for_condition),
    alias($.block, $.for_body)
  ),

  for_condition: $ => seq(
    optional(seq(alias($.declaration, $.for_initial_expr), ';')),
    alias($.boolean_expr, $.for_condition_expr),
    optional(seq(';', alias($.expression, $.for_after_expr))),
  )
}