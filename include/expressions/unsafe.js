const { PREC } = require("../prec");

module.exports = {
  unsafe_block: ($) => seq("unsafe", field("body", $.block)),

  address_of_expr: ($) =>
    prec.right(PREC.UNARY, seq(
      "&",
      optional(field("is_mut", "mut")),
      field("operand", $.expression),
    )),
};
