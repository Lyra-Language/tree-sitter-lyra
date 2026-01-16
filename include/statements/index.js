const assignments = require('./assignments');
const for_loop = require('./control_flow/for_loop');
const for_in_loop = require('./control_flow/for_in_loop');
const arena = require('./arena');

module.exports = {
  statement: $ => choice(
    $.type_declaration,
    $.const_declaration,
    $.declaration,
    $.var_reassignment,
    $.return_statement,
    $.break_statement,
    $.continue_statement,
    $.function_definition,
    $.destructuring_declaration,
    $.destructuring_else_declaration,
    $.if_destructuring_declaration,
    $.for_loop,
    $.for_in_loop,
    $.with_statement,
    $.expression_statement,
  ),

  expression_statement: $ => $.expression,

  return_statement: $ => prec.right(170, seq('return', optional(field('value', $.expression)))),

  break_statement: $ => prec.right(170, seq('break', optional(field('label', $.identifier)))),

  continue_statement: $ => prec.right(170, 'continue'),

  ...assignments,
  ...for_loop,
  ...for_in_loop,
  ...arena,
}