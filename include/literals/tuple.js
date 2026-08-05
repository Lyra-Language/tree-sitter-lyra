const { PREC } = require("../prec");
const { typeNameInExpr } = require("../helpers");

module.exports = {
  tuple_literal: ($) =>
    prec.left(
      PREC.TUPLE_LITERAL,
      choice(
        // Empty tuple: ()
        seq("(", ")"),
        // Named tuple with parens: Some(x) or Some(x, y)
        seq(
          $._tuple_name,
          optional(field("generic_arguments", $.generic_arguments)),
          "(",
          $._tuple_value,
          optional(
            seq(repeat1(seq($._comma, $._tuple_value)), optional($._comma)),
          ),
          ")",
        ),
        // Anonymous tuple: requires at least one comma to distinguish from parenthesized expressions
        seq(
          "(",
          $._tuple_value,
          choice(
            // Multiple elements: (x, y) or (x, y, z)
            seq(repeat1(seq($._comma, $._tuple_value)), optional($._comma)),
            // Single element with trailing comma: (x,)
            $._comma,
          ),
          ")",
        ),
      ),
    ),

  _tuple_value: ($) => prec.right(PREC.TUPLE_VALUE, alias($.expression, $.tuple_value)),

  // typeNameInExpr for the same reason named_struct_literal uses it: an all-caps
  // named tuple (`tuple AB(i64, i64)`) lexed as const_identifier, so `AB(1, 2)` fell
  // through to the call reading and failed with "cannot resolve function AB".
  _tuple_name: ($) =>
    prec(
      PREC.TUPLE_NAME,
      field("tuple_name", alias(typeNameInExpr($), $.tuple_name)),
    ),
};
