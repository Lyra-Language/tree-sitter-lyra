module.exports = {
  named_tuple_type: $ => seq(
    optional(field('visibility', $.visibility)),
    optional(field('allocation', $.allocation_modifier)),
    'tuple',
    field('name', alias($.user_defined_type_name, $.tuple_type_name)),
    optional(field('generic_parameters', $.generic_parameters)),
    field('tuple_type_body', $.tuple_type_body)
  ),

  tuple_type_body: $ => seq(
    '(',
      $.tuple_type_element,
      repeat(seq(',', $.tuple_type_element)),
      optional(','),
    ')'
  ),

  tuple_type_element: $ => seq(field('type', $.type), optional(field('default_field_value', $.default_field_value))),

  anonymous_tuple_type: $ => $.tuple_type_body,
}