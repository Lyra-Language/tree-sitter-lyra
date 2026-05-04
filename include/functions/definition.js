const { commaSep, commaSep1 } = require("../helpers");

module.exports = {
  function_definition: ($) =>
    seq(
      optional($.visibility),
      optional(field("is_pure", "pure")),
      optional(field("is_async", "async")),
      "def",
      field("name", $.identifier),
      optional(field("generic_parameters", $.generic_parameters)),
      "=",
      field("parameters", $.parameter_list),
      field("return_type", seq("->", optional($.type_modifier), $.type)),
      choice(
        seq("=>", field("body", $.expression)),
        field("function_clauses", $.function_clause_list),
      ),
    ),

  parameter_list: ($) => seq("(", commaSep($.parameter), ")"),
  
  function_clause_list: ($) => seq("{", commaSep1($.function_clause), "}"),

  function_clause: ($) =>
    seq(
      field("parameters", $.pattern_parameter_list),
      optional(field("guard", $.guard)),
      "=>",
      field("body", $.expression),
    ),

  pattern_parameter_list: ($) => seq("(", commaSep($.pattern), ")"),

  parameter: ($) =>
    field(
      "parameter",
      seq(
        field("pattern", $.pattern),
        ':',
        optional($.type_modifier),
        field("type", $.type),
        optional(field("default_value", $.default_value)),
      ),
    ),

  default_value: ($) => seq("=", field("expression", $.expression)),
};
