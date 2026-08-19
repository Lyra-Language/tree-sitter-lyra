const { commaSep1 } = require("./helpers");

module.exports = {
  attribute_list: ($) => repeat1($.attribute),

  attribute: ($) =>
    seq(
      "@",
      field("name", $.identifier),
      optional(seq("(", field("args", $.attribute_args), ")")),
    ),

  // A string joins the number and type-name arguments so `@link("m")` can name a library.
  // It is the first attribute argument that is *data* rather than a name or a size, and it
  // stays a plain `string_literal` — an attribute argument is read by the collector, not
  // evaluated, so interpolation in one would be a value nothing could produce.
  attribute_args: ($) =>
    commaSep1(field("value", choice($._number_literal, $.user_defined_type_name, $.string_literal))),
};
