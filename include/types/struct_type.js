module.exports = {
  struct_type: $ => seq(
    optional($.visibility),
    optional(field('allocation', $.allocation_modifier)),
    'struct',
    field('struct_name', alias($.user_defined_type_name, $.struct_name)),
    optional($.generic_parameters),
    $.struct_type_body
  ),

  struct_member: $ => seq(
    optional(field('var_keyword', 'var')),
    field('field_name', alias($.identifier, $.field_name)),
    ':',
    field('field_type', alias($.type, $.field_type)),
    optional($.default_field_value)
  ),
  
  struct_type_body: $ => seq(
    '{',
      seq(
        $.struct_member,
        repeat(seq(',', $.struct_member)),
        optional(',')
      ),
    '}'
  ),

  default_field_value: $ => seq('=', $.expression)
}