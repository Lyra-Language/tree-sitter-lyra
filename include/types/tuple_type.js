module.exports = {
  tuple_type: $ => seq(
    optional($.visibility),
    optional(field('allocation', $.allocation_modifier)),
    'tuple',
    field('name', alias($.user_defined_type_name, $.tuple_type_name)),
    optional($.generic_parameters),
    $.tuple_type_body
  ),

  tuple_type_body: $ => seq(
    '(',
      $.type,
      repeat(seq(',', $.type)),
      optional(','),
    ')'
  ),
}