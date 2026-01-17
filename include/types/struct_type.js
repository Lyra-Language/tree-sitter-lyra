module.exports = {
  struct_type: $ => seq(
    optional($.visibility),
    optional(field('allocation', $.allocation_modifier)),
    'struct',
    field('struct_name', alias($.user_defined_type_name, $.struct_name)),
    optional($.generic_parameters),
    $.struct_type_body
  ),

  // Helper rule for a comma-separated list of fields (not exposed in AST)
  _struct_fields: $ => prec.right(seq(
    $.struct_member,
    repeat(seq(',', $.struct_member)),
  )),

  struct_member: $ => seq(
    field('field_name', alias($.identifier, $.field_name)),
    ':',
    field('field_type', alias($.type, $.field_type)),
    optional($.default_field_value)
  ),

  mut_keyword: $ => token('[mut]:'),
  
  struct_type_body: $ => seq(
    '{',
    choice(
      // Only immutable fields
      seq(
        $.struct_member,
        repeat(seq(',', $.struct_member)),
        optional(',')
      ),
      // Only mutable fields  
      seq(
        $.mut_keyword,
        $.struct_member,
        repeat(seq(',', $.struct_member)),
        optional(',')
      ),
      // Both: immutable, then [mut]:, then mutable
      seq(
        $.struct_member,
        repeat(seq(',', $.struct_member)),
        ',',
        $.mut_keyword,
        $.struct_member,
        repeat(seq(',', $.struct_member)),
        optional(',')
      )
    ),
    '}'
  ),

  default_field_value: $ => seq('=', $.expression)
}