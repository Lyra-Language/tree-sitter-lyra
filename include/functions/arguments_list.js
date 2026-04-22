module.exports = {
  argument_list: ($) =>
    seq(
      "(",
      optional(
        choice(
          // named-only
          seq(
            $.named_argument,
            repeat(seq($._comma, $.named_argument)),
            optional($._comma),
          ),
          // positional [,...] then optional named [,...]
          seq(
            $._argument_value,
            repeat(seq($._comma, $._argument_value)),
            optional(
              seq(
                $._comma,
                $.named_argument,
                repeat(seq($._comma, $.named_argument)),
              ),
            ),
            optional($._comma),
          ),
        ),
      ),
      ")",
    ),

  named_argument: ($) =>
    seq(
      field("name", alias($.identifier, $.argument_name)),
      "=",
      $._argument_value,
    ),

  _argument_value: ($) =>
    choice(
      field("value", alias($.expression, $.value)),
      field("wildcard", alias("_", $.wildcard)), // for partial application
    ),
};
