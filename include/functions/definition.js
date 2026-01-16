module.exports = {
  function_definition: $ => seq(
    optional($.visibility),
    field('signature', $.function_signature),
    '=',
    choice(
      field('function_clause', $.function_clause),
      field('function_clause_list', $.function_clause_list),
    ),
  ),

  function_signature: $ => seq(
    optional(token('pure')),
    optional(token('async')),
    'def',
    field('name', $.identifier),
    optional(field('generic_parameters', $.generic_parameters)),
    optional(seq(':', field('function_type', $.function_type))),
  ),

  function_clause: $ => seq(
    field('parameters', $.parameter_list),
    optional($.guard),
    '=>',
    field('body', choice(
      field('block', $.block),
      field('expression', $.expression),
    )),
  ),

  lambda_expression: $ => $.function_clause,

  function_clause_list: $ => seq(
    '{',
    field('function_clause', $.function_clause),
    repeat(seq($._comma, field('function_clause', $.function_clause))),
    optional($._comma),
    '}',
  ),

  parameter_list: $ => seq(
    '(',
    optional(
      seq(
        $.parameter,
        repeat(seq($._comma, $.parameter)),
        optional($._comma),
      )
    ),
    ')'
  ),

  parameter: $ => seq(
    field('pattern', $.pattern),
    optional(field('default', $.default_value)),
  ),

  default_value: $ => seq('=', $.expression),
}