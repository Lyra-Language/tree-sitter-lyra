const { commaSep1, typeNameInExpr } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  // Two alternatives, because the name is contested by two different rules and the
  // two contests want opposite resolutions.
  //
  // **With generic arguments** (`Point::<f64> { … }`) the rival is `_tuple_name`
  // (`Point::<f64>(…)`), and that one is settled by a *static* precedence the two
  // share — PREC.TUPLE_NAME and PREC.STRUCT_LITERAL are equal on purpose (prec.js) so
  // neither wins outright and GLR decides on the `{` vs `(`.
  //
  // **Without them** the rival is the bare-name reading: in `if Point { 1 }`, is
  // `Point` the condition with `{ 1 }` its block, or the head of a struct literal?
  // Only the brace's contents answer that, so this alternative must *not* be resolved
  // statically — hence prec.dynamic, which keeps it a conflict for GLR to settle
  // (grammar.js declares it). With prec.left here, the struct reading won before the
  // parser could see `{ 1 }` is not a struct body, and `if Point { 1 } else { 0 }`
  // was a syntax error.
  //
  // Giving the whole rule prec.dynamic instead breaks the first contest — the tuple's
  // static precedence then wins and `Point::<f64> { … }` stops parsing — and making
  // `_tuple_name` dynamic to match breaks parenthesized forms far afield, down to
  // `(f(7), 1)`. Its static precedence is load-bearing; leave it alone.
  named_struct_literal: ($) =>
    choice(
      prec(
        PREC.STRUCT_LITERAL,
        seq(
          field("struct_name", alias(typeNameInExpr($), $.struct_name)),
          field("generic_arguments", $.generic_arguments),
          field("struct_body", $.struct_body),
        ),
      ),
      prec.dynamic(
        PREC.STRUCT_LITERAL,
        seq(
          // typeNameInExpr, not user_defined_type_name: an all-caps name lexes as
          // const_identifier, which made `S { v: 1 }` a syntax error everywhere.
          field("struct_name", alias(typeNameInExpr($), $.struct_name)),
          field("struct_body", $.struct_body),
        ),
      ),
    ),

  anonymous_struct_literal: ($) =>
    prec.left(PREC.STRUCT_LITERAL, field("struct_body", $.struct_body)),

  struct_body: ($) =>
    seq(
      "{",
      choice(
        field("struct_update", $.struct_update),
        field("struct_shorthand", $.struct_shorthand),
        field("struct_fields", $.struct_fields),
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

  struct_fields: ($) => commaSep1($.struct_field),

  struct_field: ($) =>
    seq(
      field("field_name", alias($.identifier, $.field_name)),
      ":",
      $._field_value,
    ),

  _field_value: ($) => field("field_value", alias($.expression, $.field_value)),
};
