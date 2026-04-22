const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  struct_literal: ($) =>
    prec.left(
      PREC.STRUCT_LITERAL,
      seq(
        optional(
          prec(
            PREC.STRUCT_NAME,
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
