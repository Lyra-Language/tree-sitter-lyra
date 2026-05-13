const { commaSep1 } = require("../helpers");
const { PREC } = require("../prec");

module.exports = {
  // A generic type is a lowercase letter optionally followed by any number of letters or numbers
  generic_type: ($) =>
    seq(
      /[a-z][a-z0-9]*/,
      optional(
        seq(
          "<",
          commaSep1(alias($.generic_type, $.generic_type_parameter)),
          ">",
        ),
      ),
    ),

  generic_parameter: ($) =>
    prec(PREC.GENERIC_PARAMETERS,
      seq(
        field("name", $.generic_type),
        optional(seq(":", field("bounds", $.generic_bounds))),
      ),
    ),

  generic_parameters: ($) =>
    prec.left(PREC.GENERIC_PARAMETERS, seq("<", commaSep1($.generic_parameter), ">")),

  generic_arguments: ($) => seq("::", "<", commaSep1($.type), ">"),
};
