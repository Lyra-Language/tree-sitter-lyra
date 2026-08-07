module.exports = {
  // for let i = 0; i < 10; i++ { println("i: ${i}") }
  //
  // `let` is not optional: `initial_expr` is a `declaration`, so a bare `i = 0`
  // is a reassignment and does not match. The comment said `for i = 0` until
  // 07/31/26 and cost someone a real detour, since the failure looks like the
  // *loop* being broken rather than the init clause.
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
    field("condition_expr", $._bool_operand),
    optional(
      seq(
        ';',
        field("post_expr", alias($.expression, $.for_post_expr))
      )
    ),
  )
}