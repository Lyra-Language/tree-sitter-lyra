const { PREC } = require("../prec");

module.exports = {
  data_type: $ => prec.right(PREC.DATA_TYPE, seq(
    optional(field("attributes", $.attribute_list)),
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
    // Constructor with type params - high priority
    prec.right(PREC.DATA_CTOR, seq(
      field('name', $.data_type_constructor_name),
      repeat1(field('param', $._data_constructor_param))
    )),
    // Bare constructor (no params) - lower priority
    prec.right(PREC.DATA_CTOR_BARE, field('name', $.data_type_constructor_name)),
  )),

  // A constructor payload is a type. A bare lowercase type-parameter name (the
  // `t` in `Some t`) lexes as an `identifier`, not the `generic_type` token —
  // those two regexps tie and `identifier` wins now that it shares precedence
  // with keywords (see prec.js). Accepting an aliased identifier here keeps the
  // payload attached and renders it as a `generic_type`, matching a name that
  // came in through the `type` path.
  _data_constructor_param: $ => choice(
    $.type,
    alias($.identifier, $.generic_type),
  ),

  data_type_constructor_name: $ => /[A-Z][a-zA-Z0-9]*/,
}
