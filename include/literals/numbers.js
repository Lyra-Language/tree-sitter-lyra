const { PREC } = require("../prec");

module.exports = {
  _number_literal: ($) => choice($.integer_literal, $.float_literal),

  integer_literal: ($) =>
    choice($.decimal_int, $.octal_int, $.hexadecimal_int, $.binary_int),

  decimal_int: ($) => prec(PREC.DECIMAL_INT_TOKEN, token(/[0-9][0-9_]*/)),

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
      seq(token(/[0-9_]+\.[0-9_]+/), optional($.float_exponent)),
    ),

  // The leading `e`/`E` sits above IDENTIFIER_TOKEN so the exponent of
  // `0.03e2` is not lexed as a trailing identifier `e2` (both match `e…` at
  // equal length; precedence breaks the tie toward the exponent).
  float_exponent: ($) =>
    seq(
      token.immediate(prec(PREC.FLOAT_LITERAL_TOKEN, /[eE]/)),
      token.immediate(/[+-]?[0-9_]+/),
    ),
};
