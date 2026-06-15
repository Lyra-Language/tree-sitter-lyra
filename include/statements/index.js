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
