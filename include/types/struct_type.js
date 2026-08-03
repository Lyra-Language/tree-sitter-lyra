const { memberList } = require("../helpers");

module.exports = {
  struct_type: ($) =>
    seq(
      optional(field("attributes", $.attribute_list)),
      optional(field("visibility", $.visibility)),
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

  // Fields one per line or comma-separated — see memberList in helpers.js. The two
  // bodies stay separate rules despite having the same shape: a *declaration*'s body
  // and an anonymous struct *type* appear in different positions, and collapsing them
  // would give the CST one node kind where the collector reads two.
  struct_type_body: ($) => seq("{", memberList($, $.struct_member), "}"),

  anonymous_struct_type: ($) => seq("{", memberList($, $.struct_member), "}"),
};
