module.exports = {
  range_expression: $ => prec.right(
    20,
    seq(
      field('start', alias($.expression, $.range_start)),
      '..',
      field('end_operator', alias($.range_end_operator, $.range_end_operator)),
      field('end', alias($.expression, $.range_end)),
      optional(seq(',', field('step', alias($.expression, $.range_step))))
    )
  ),

  range_end_operator: $ => choice('<', '='),
}