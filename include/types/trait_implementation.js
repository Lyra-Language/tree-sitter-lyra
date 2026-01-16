module.exports = {
  trait_implementation: $ => prec.right(100, seq(
    'impl',
    $.trait_name,
    optional(
      seq('<', $.type, repeat(seq(',', $.type)), optional(','), '>'), 
    ),
    'for',
    $.type,
    optional(seq('where', field('constraints', $.impl_constraints))),
    '{',
    field('method', $.trait_method_implementation),
    repeat(seq(',', field('method', $.trait_method_implementation))),
    optional(','),
    '}',
  )),

  impl_constraints: $ => seq(
    '(',
    $.impl_constraint,
    repeat(seq(',', $.impl_constraint)),
    optional(','),
    ')'
  ),

  impl_constraint: $ => seq(
    $.generic_type,
    ':',
    $.trait_bounds,
  ),
  
  trait_method_implementation: $ => seq(
    alias(
      choice($.identifier, $.unary_operator, $.binary_operator),
      $.method_name
    ),
    '=',
    field('function_clause', $.function_clause)
  ),
}