const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  function_type: ($) =>
    prec(
      PREC.FUNCTION_TYPE,
      seq(
        "(",
        optional(field("parameter_types", $.parameter_type_list)),
        ")",
        "->",
        seq(
          optional(field("modifier", $.modifier)),
          field("return_type", $.type),
        ),
      ),
    ),

  parameter_type_list: ($) => commaSep1($.parameter_type),

  parameter_type: ($) =>
    seq(optional(field("modifier", $.modifier)), field("type", $.type)),

  modifier: ($) => choice("ref", "mut", "own"),
};
