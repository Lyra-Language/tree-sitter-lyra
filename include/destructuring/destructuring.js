const { PREC } = require("../prec");

module.exports = {
  // Destructuring-specific rules that extend patterns
  destructuring_pattern: $ => prec.right(choice(
    $.array_pattern,
    $.struct_pattern, 
    $.tuple_pattern,
    $.data_pattern,
    $.identifier  // simple destructuring: let x = value
  )),

  // Destructuring declarations
  destructuring_declaration: $ => seq(
    optional($.visibility),
    field('keyword', choice('let', 'var')),
    field('pattern', $.destructuring_pattern),
    optional(field('type_annotation', $.type_annotation)),
    '=',
    field('value', $.expression),
  ),

  // Destructuring declaration with else block
  destructuring_else_declaration: $ => prec.right(PREC.DESTRUCTURING_ELSE, seq(
    field('destructuring_declaration', $.destructuring_declaration),
    'else',
    field('else_block', $.block),
  )),

  // If Destructuring Declaration
  destructuring_if_declaration: $ => prec.right(PREC.DESTRUCTURING_IF, seq(
    'if',
    field('destructuring_declaration', $.destructuring_declaration),
    field('then_block', $.block),
    optional(seq(
      'else',
      field('else_block', $.block),
    )),
  )),

}
