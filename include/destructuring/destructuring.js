const { PREC } = require("../prec");

module.exports = {
  // Full destructuring pattern (includes identifier; used in if/else-declaration and match)
  destructuring_pattern: $ => prec.right(choice(
    $.array_pattern,
    $.struct_pattern,
    $.tuple_pattern,
    $.data_pattern,
    $.identifier,
  )),

  // Pattern-only binding (excludes bare identifier, which takes the identifier branch
  // of declaration to avoid ambiguity with function definitions)
  destructuring_only_pattern: $ => prec.right(choice(
    $.array_pattern,
    $.struct_pattern,
    $.tuple_pattern,
    $.data_pattern,
  )),

  // Declaration with else block (for pattern-binding let/var that must match)
  destructuring_else_declaration: $ => prec.right(PREC.DESTRUCTURING_ELSE, seq(
    field('declaration', $.declaration),
    'else',
    field('else_block', $.block),
  )),

  // If declaration (for pattern-binding let/var used as a condition)
  destructuring_if_declaration: $ => prec.right(PREC.DESTRUCTURING_IF, seq(
    'if',
    field('declaration', $.declaration),
    field('then_block', $.block),
    optional(seq(
      'else',
      field('else_block', $.block),
    )),
  )),

}
