module.exports = {
  string_literal: ($) =>
    seq(
      alias($._string_start, '"'),
      repeat(choice($.string_content, $.string_interpolation)),
      alias($._string_end, '"'),
    ),

  raw_string_literal: ($) => $._raw_string_literal,

  string_content: ($) => $._string_content,

  string_interpolation: ($) =>
    seq(
      alias($._interpolation_start, "#{"),
      $.expression,
      alias($._interpolation_end, "}"),
    ),
};
