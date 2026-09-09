const { memberList } = require("../helpers");

module.exports = {
  // A C union: one block of storage read several ways. Declared for the FFI, where
  // it is the shape `SDL_Event` and every "tag plus payload" C API arrives in.
  //
  // **Deliberately its own keyword rather than an attribute on `struct`.** A union's
  // field read is `unsafe` — nothing records which member was last written, so reading
  // the wrong one is garbage — and hiding that behind `@union` would make `s.field`
  // mean two different things with nothing at the use site to tell them apart. That is
  // the same argument that keeps pointer arithmetic a named method instead of `p[i]`.
  //
  // The body is `struct_member`'s list, reused rather than copied: a union member is a
  // name and a type, which is exactly a struct field, and a second rule free to drift
  // from the first is what `struct_type_body`'s own note warns about. `readonly` and a
  // default value are admitted by that rule and refused by the collector — the
  // admit-then-report trade the extern modifiers already make, and for the same reason:
  // a typed diagnostic beats a syntax error pointing at whichever token failed to shift.
  union_type: ($) =>
    seq(
      optional(field("attributes", $.attribute_list)),
      optional(field("visibility", $.visibility)),
      "union",
      field("union_name", alias($.user_defined_type_name, $.union_name)),
      optional($.generic_parameters),
      $.union_type_body,
    ),

  // Separate from `struct_type_body` for the reason that rule gives about its own twin:
  // a declaration's body is read by the collector through its node kind, and one kind
  // where the collector reads two is a distinction it cannot recover.
  union_type_body: ($) => seq("{", memberList($, $.struct_member), "}"),
};
