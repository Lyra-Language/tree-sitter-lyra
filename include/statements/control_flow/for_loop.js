module.exports = {
  // for i = 0; i < 10; i++ { println("i: ${i}") }
  for_loop: $ => seq(
    optional(
      seq(
        field("label", alias($.identifier, $.label)),
        ':'
      )
    ),
    'for',
    optional(field("for_condition", $.for_condition)),
    field("for_body", alias($.block, $.for_body))
  ),

  for_condition: $ => seq(
    optional(
      seq(
        field("initial_expr", alias($.declaration, $.for_initial_expr)),
        ';'
      )
    ),
    field("condition_expr", alias($.boolean_expr, $.for_condition_expr)),
    optional(
      seq(
        ';',
        field("post_expr", alias($.expression, $.for_post_expr))
      )
    ),
  )
}