module.exports = {
  struct_literal: $ => prec.left(10, seq(
    optional(prec(4, field('struct_name', alias($.user_defined_type_name, $.struct_name)))),
    optional(field('generic_arguments', $.generic_arguments)),
    field('struct_body', $.struct_body)
  )),

  struct_body: $ => seq('{',
    choice(
      $.struct_shorthand,
      seq($.struct_field, repeat(seq(',', $.struct_field)), optional(',')),
    ),
  '}'),

  struct_shorthand: $ => seq(
    $._field_value,
    repeat(seq(',', $._field_value)),
    optional(','),
  ),

  struct_field: $ => seq(
    field('field_name', alias($.identifier, $.field_name)),
    ':',
    $._field_value,
  ),

  _field_value: $ => field('field_value', alias($.expression, $.field_value)),
}