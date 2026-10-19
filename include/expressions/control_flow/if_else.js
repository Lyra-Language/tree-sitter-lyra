const { PREC } = require("../../prec");

module.exports = {
  // The alternative may be another `if` or an `if let` (`destructuring_if_declaration`,
  // a statement — the collector wraps it in a block), as an `if let`'s may.
  if_block_expr: $ => prec.right(PREC.IF_EXPR, seq(
    'if',
    field('condition', $.expression),
    field('then_block', $.block),
    optional(seq(
      'else',
      field('else_branch', choice($.if_block_expr, $.destructuring_if_declaration, $.block))
    ))
  )),
}
