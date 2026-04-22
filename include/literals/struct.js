const { commaSep1 } = require("../helpers");

module.exports = {
  struct_literal: ($) =>
    prec.left(
      10,
      seq(
        optional(
          prec(
            4,
            field(
              "struct_name",
              alias($.user_defined_type_name, $.struct_name),
            ),
          ),
        ),
        optional(field("generic_arguments", $.generic_arguments)),
        field("struct_body", $.struct_body),
      ),
    ),

  struct_body: ($) =>
    seq("{", choice($.struct_shorthand, commaSep1($.struct_field)), "}"),

  struct_shorthand: ($) => commaSep1($._field_value),

  struct_field: ($) =>
    seq(
      field("field_name", alias($.identifier, $.field_name)),
      ":",
      $._field_value,
    ),

  _field_value: ($) => field("field_value", alias($.expression, $.field_value)),
};
