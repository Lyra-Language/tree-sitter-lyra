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

  generic_parameters: ($) =>
    prec.left(PREC.GENERIC_PARAMETERS, seq("<", commaSep1($.generic_type), ">")),

  generic_arguments: ($) => seq("::", "<", commaSep1($.type), ">"),
};
