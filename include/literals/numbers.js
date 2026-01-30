module.exports = {
  _number_literal: $ => choice($.integer_literal, $.float_literal),

  integer_literal: $ => choice($.decimal_int, $.octal_int, $.hexadecimal_int, $.binary_int),
  
  
  decimal_int: $ => prec(2, token(/[0-9_]+/)),
  binary_int: $ => seq('0b', token.immediate(/[01_]+/)),
  octal_int: $ => seq('0o', token.immediate(/[0-7_]+/)),
  hexadecimal_int: $ => seq('0x', token.immediate(/[0-9a-fA-F_]+/)),
  
  float_literal: $ => prec(1, token(/[0-9_]+\.[0-9_]+/)),
}