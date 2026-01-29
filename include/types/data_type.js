module.exports = {
  data_type: $ => prec.right(10, seq(
    optional($.visibility),
    optional(field('allocation', $.allocation_modifier)),
    'data',
    alias($.user_defined_type_name, $.data_type_name),
    optional($.generic_parameters),
    '=',
    optional("|"), // Optional pipe for nice formatting (one constructor per line below data type name)
    $.data_type_constructor,
    repeat(seq('|', $.data_type_constructor))
  )),

  data_type_constructor: $ => field('constructor', choice(
    // Constructor with struct body - highest priority
    prec.right(10, seq(
      field('name', $.data_type_constructor_name),
      $.struct_type_body
    )),
    // Constructor with type params - high priority
    prec.right(10, seq(
      field('name', $.data_type_constructor_name),
      repeat1(field('param', $.type))
    )),
    // Bare constructor (no params) - lower priority
    prec.right(5, field('name', $.data_type_constructor_name)),
  )),

  data_type_constructor_name: $ => /[A-Z][a-zA-Z0-9]*/,
}