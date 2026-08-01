const assignments = require("./assignments");
const arena = require("./arena");
const { PREC } = require("../prec");

module.exports = {
  statement: ($) =>
    choice(
      $.type_declaration,
      $.trait_declaration,
      $.trait_implementation,
      $.const_declaration,
      $.declaration,
      $.var_reassignment,
      $.deref_assignment,
      $.member_assignment,
      $.index_assignment,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.destructuring_if_declaration,
      $.destructuring_else_declaration,
      $.with_statement,
      $.expression_statement,
    ),

  // What ends a statement: a line break, or an explicit `;`.
  //
  // `repeat1` so a blank line after a `;` (or any run of the two) is one
  // separator rather than a separator followed by a stray one where the grammar
  // wants a statement. The scanner already collapses consecutive line breaks
  // into a single `_newline`; this covers the mixed forms.
  //
  // `;` is the explicit form, for putting several statements on one line. It is
  // never required — the line break is the ordinary terminator — which is the
  // Go/Swift/Kotlin arrangement rather than C's. Note `;` already appears in the
  // grammar twice as an intra-construct separator (`for i = 0; i < n; i++` and
  // `[value; count]`); those are unrelated positions and unaffected.
  _statement_separator: ($) => repeat1(choice($._newline, ";")),

  expression_statement: ($) => $.expression,

  return_statement: ($) =>
    prec.right(PREC.JUMP, seq("return", optional(field("value", $.expression)))),

  break_statement: ($) =>
    prec.right(PREC.JUMP, seq(
      "break",
      optional(field("label", $.identifier)),
      optional(field("value", $.expression)),
    )),

  continue_statement: ($) =>
    prec.right(PREC.JUMP, seq("continue", optional(field("label", $.identifier)))),

  ...assignments,
  ...arena,
};
