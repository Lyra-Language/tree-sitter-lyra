const { PREC } = require("../prec");

module.exports = {
  _number_literal: ($) => choice($.integer_literal, $.float_literal),

  integer_literal: ($) =>
    choice($.decimal_int, $.octal_int, $.hexadecimal_int, $.binary_int),

  decimal_int: ($) => prec(PREC.DECIMAL_INT_TOKEN, token(/[0-9_]+/)),

  binary_int: ($) => seq($.binary_prefix, token.immediate(/[01_]+/)),
  binary_prefix: ($) => "0b",

  octal_int: ($) => seq($.octal_prefix, token.immediate(/[0-7_]+/)),
  octal_prefix: ($) => "0o",

  hexadecimal_int: ($) =>
    seq($.hexadecimal_prefix, token.immediate(/[0-9a-fA-F_]+/)),
  hexadecimal_prefix: ($) => "0x",

  float_literal: ($) =>
    prec(
      PREC.FLOAT_LITERAL_TOKEN,
      token(/[0-9_]+\.[0-9_]+([eE][+-]?[0-9_]+)?/),
    ),
};
