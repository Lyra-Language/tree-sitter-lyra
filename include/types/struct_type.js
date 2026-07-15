const { commaSep1 } = require("../helpers");

module.exports = {
  struct_type: ($) =>
    seq(
      optional(field("attributes", $.attribute_list)),
      optional($.visibility),
      "struct",
      field("struct_name", alias($.user_defined_type_name, $.struct_name)),
      optional($.generic_parameters),
      $.struct_type_body,
    ),

  struct_member: ($) =>
    seq(
      // Struct fields are mutable by default (a field follows the mutability of
      // the binding that holds the struct). A `readonly` marker freezes the
      // field: it is writable once at construction, then immutable forever, even
      // through a `var`/`let mut` instance — for declaring invariants (an `id`,
      // a `kind` tag).
      optional(field("frozen", "readonly")),
      field("field_name", alias($.identifier, $.field_name)),
      ":",
      field("field_type", alias($.type, $.field_type)),
      optional(field("default_value", $.default_field_value)),
    ),

  struct_type_body: ($) => seq("{", commaSep1($.struct_member), "}"),

  anonymous_struct_type: ($) => seq("{", commaSep1($.struct_member), "}"),
};
