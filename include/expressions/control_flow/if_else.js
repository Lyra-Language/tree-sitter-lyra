const { PREC } = require("../../prec");

module.exports = {
  if_block_expr: $ => prec.right(PREC.IF_EXPR, seq(
    'if',
    field('condition', $.expression),
    field('then_block', $.block),
    optional(seq(
      'else',
      field('else_branch', choice($.if_block_expr, $.block))
    ))
  )),
}
