module.exports = {
  function_definition: $ => seq(
    optional($.visibility),
    field('signature', $.function_signature),
    '=',
    choice(
      field('pattern', $.function_pattern),
      field('pattern_list', $.function_pattern_list),
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

  function_pattern: $ => seq(
    field('parameters', $.parameter_list),
    optional($.guard),
    '=>',
    field('body', choice(
      $.block,
      $.expression,
    )),
  ),

  lambda_expression: $ => $.function_pattern,

  function_pattern_list: $ => seq(
    '{',
    field('pattern', $.function_pattern),
    repeat(seq($._comma, field('pattern', $.function_pattern))),
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
    choice(field('name', $.identifier), field('pattern', $.pattern)),
    optional(field('default', $.default_value)),
  ),

  default_value: $ => seq('=', $.expression),
}