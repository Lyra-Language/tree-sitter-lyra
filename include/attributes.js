module.exports = {
  attribute_list: ($) => repeat1($.attribute),

  attribute: ($) =>
    seq(
      "@",
      field("name", $.identifier),
      optional(seq("(", field("value", choice($._number_literal, $.const_identifier)), ")")),
    ),
};
