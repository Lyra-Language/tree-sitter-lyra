const assignments = require("./assignments");
const for_loop = require("./control_flow/for_loop");
const for_in_loop = require("./control_flow/for_in_loop");
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
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.function_definition,
      $.destructuring_declaration,
      $.destructuring_if_declaration,
      $.destructuring_else_declaration,
      $.for_loop,
      $.for_in_loop,
      $.with_statement,
      $.expression_statement,
    ),

  expression_statement: ($) => $.expression,

  return_statement: ($) =>
    prec.right(PREC.JUMP, seq("return", optional(field("value", $.expression)))),

  break_statement: ($) =>
    prec.right(PREC.JUMP, seq("break", optional(field("label", $.identifier)))),

  continue_statement: ($) => prec.right(PREC.JUMP, "continue"),

  ...assignments,
  ...for_loop,
  ...for_in_loop,
  ...arena,
};
