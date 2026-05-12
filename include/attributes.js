const { commaSep1 } = require("./helpers");

module.exports = {
  attribute_list: ($) => repeat1($.attribute),

  attribute: ($) =>
    seq(
      "@",
      field("name", $.identifier),
      optional(seq("(", field("args", $.attribute_args), ")")),
    ),

  attribute_args: ($) => commaSep1(field("value", choice($._number_literal, $.user_defined_type_name))),
};
