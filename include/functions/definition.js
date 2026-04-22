const { commaSep, commaSep1 } = require("../helpers");

module.exports = {
  function_definition: ($) =>
    seq(
      optional($.visibility),
      field("signature", $.function_signature),
      "=",
      choice(
        field("function_clause", $.function_clause),
        field("function_clause_list", $.function_clause_list),
      ),
    ),

  function_signature: ($) =>
    seq(
      optional(field("is_pure", "pure")),
      optional(field("is_async", "async")),
      "def",
      field("name", $.identifier),
      optional(field("generic_parameters", $.generic_parameters)),
      optional(seq(":", field("function_type", $.function_type))),
    ),

  function_clause: ($) =>
    seq(
      field("parameters", $.parameter_list),
      optional(field("guard", $.guard)),
      "=>",
      field("body", choice($.expression, $.block)),
    ),

  lambda_expression: ($) => $.function_clause,

  function_clause_list: ($) => seq("{", commaSep1($.function_clause), "}"),

  parameter_list: ($) => seq("(", commaSep($.parameter), ")"),

  parameter: ($) =>
    field(
      "parameter",
      seq(
        field("pattern", $.pattern),
        optional(field("default_value", $.default_value)),
      ),
    ),

  default_value: ($) => seq("=", field("expression", $.expression)),
};
