module.exports = {
  string_literal: ($) =>
    seq(
      alias($._string_start, '"'),
      repeat(choice($.string_content, $.string_interpolation)),
      alias($._string_end, '"'),
    ),

  // Three tokens so the content is a node of its own, which an editor can inject
  // another language into (`/* glsl */ \`…\``) without the delimiters.
  raw_string_literal: ($) =>
    seq(
      $._raw_string_start,
      optional($.raw_string_content),
      $._raw_string_end,
    ),

  raw_string_content: ($) => $._raw_string_content,

  string_content: ($) => $._string_content,

  string_interpolation: ($) =>
    seq(
      alias($._interpolation_start, "${"),
      $.expression,
      alias($._interpolation_end, "}"),
    ),
};
