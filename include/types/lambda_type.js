const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  lambda_type: ($) =>
    prec(
      PREC.LAMBDA_TYPE,
      seq(
        "(",
        optional(field("parameter_types", $.parameter_type_list)),
        ")",
        "->",
        seq(
          optional(field("modifier", $.type_modifier)),
          field("return_type", $.type),
        ),
      ),
    ),

  parameter_type_list: ($) => commaSep1($.parameter_type),

  parameter_type: ($) =>
    seq(optional(field("modifier", $.type_modifier)), field("type", $.type)),

  type_modifier: ($) => choice("ref", "mut", "own"),
};
