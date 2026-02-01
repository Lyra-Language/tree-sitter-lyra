module.exports = {
  constrained_type: $ => seq(
    optional($.visibility),
    'type',
    field('name', alias($.user_defined_type_name, $.constrained_type_name)),
    '=',
    seq(
      field('type', $.type),
      optional(seq('where', field('constraints', $.constraints)))
    ),
  ),

  constraints: $ => seq(
    $._constraint,
    repeat(seq(',', $._constraint)),
    optional(','),
  ),

  _constraint: $ => choice(
    $.range_constraint,
    $.pattern_constraint, // for strings
    $.precision_constraint, // for floats
    $.step_constraint, // for floats
    $.literal_union_constraint,
  ),

  // Literal union constraint
  literal_union_constraint: $ => seq(
    'values',
    '(',
    field('values', seq($.literal_val, repeat(seq(',', $.literal_val)))),
    ')',
  ),
  literal_val: $ => choice($.string_literal, $._number_literal),

  // Range constraint
  range_constraint: $ => seq(
    'range','(',
    optional(field('start', $.constraint_math_expr)),
    '..',
    optional(
      seq(
        field('comparator', choice($.less_than_comparator, $.equal_to_comparator)),
        field('end', $.constraint_math_expr)
      )
    ),
    ')'
  ),
  less_than_comparator: $ => '<',
  equal_to_comparator: $ => '=',

  // Regex constraint (String)
  pattern_constraint: $ => seq('pattern', '(', field('pattern', $.regex_literal), ')'),

  // Precision constraint
  precision_constraint: $ => seq(
    'precision', '(',
    field('value', $.constraint_math_expr),
    optional(seq(',', field('rounding_mode', $.rounding_mode))),
    ')'
  ),

  // Rounding mode (defaults to "nearest even")
  rounding_mode: $ => choice(
    $.even_rounding_mode,
    $.zero_rounding_mode,
    $.up_rounding_mode,
    $.down_rounding_mode,
    $.truncate_rounding_mode,
  ),
  even_rounding_mode: $ => 'round_even',
  zero_rounding_mode: $ => 'round_zero',
  up_rounding_mode: $ => 'round_up',
  down_rounding_mode: $ => 'round_down',
  truncate_rounding_mode: $ => 'round_trunc',

  // Step constraint (float_literal)
  step_constraint: $ => seq('step', '(', field('value', $.constraint_math_expr), ')'),
}