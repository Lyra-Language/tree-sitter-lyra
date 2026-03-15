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
  destructuring_else_declaration: $ => prec.right(20, seq(
    $.destructuring_declaration,
    'else',
    $.block,
  )),

  // If Destructuring Declaration
  if_destructuring_declaration: $ => prec.right(20, seq(
    'if',
    $.destructuring_declaration,
    $.block,
    optional(seq('else', $.block)),
  )),

}