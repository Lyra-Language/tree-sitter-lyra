module.exports = {
    lambda_expression: ($) => seq(
        optional(field("is_async", "async")),
        optional(field("is_pure", "pure")),
        $.pattern_parameter_list,
        '=>',
        field("body", $.expression)
    ),
}