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
    seq(
      "{",
      choice(
        field("struct_update", $.struct_update),
        field("struct_shorthand", $.struct_shorthand),
        field("struct_fields", commaSep1($.struct_field))
      ),
      "}",
    ),

  struct_update: ($) =>
    seq(
      field("base", choice($.identifier, $.const_identifier)),
      "|",
      field("field_updates", commaSep1($.struct_field)),
    ),

  // Requires 2+ values so a single `{ expr }` always resolves to a block,
  // not an anonymous struct. Named fields (`{ x: v }`) handle the 1-field case.
  struct_shorthand: ($) =>
    seq($._field_value, repeat1(seq(",", $._field_value)), optional(",")),

  struct_field: ($) =>
    seq(
      field("field_name", alias($.identifier, $.field_name)),
      ":",
      $._field_value,
    ),

  _field_value: ($) => field("field_value", alias($.expression, $.field_value)),
};
