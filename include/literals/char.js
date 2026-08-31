module.exports = {
  // Character literal as a single token to avoid parser state conflicts
  // Matches: 'a', '\n', '\x1F', '\u0041', '\U0001F600', etc.
  char_literal: $ => token(seq(
    "'",
    choice(
      /[^'\\]/u, // any single Unicode code point except ' and \
      // `\0` is NUL and nothing more. In C it is the start of an octal run, which is why
      // `'\012'` there is a newline and `"\08"` is an error — Lyra spells octal with an
      // explicit `\o` prefix, so the digit-run ambiguity that makes C's version a footgun
      // cannot arise and the shorthand is safe to have.
      /\\[0abefnrtv\\'"]/,  // simple escape sequences
      /\\o[0-7]{3}/,       // octal (3 digits)
      /\\x[0-9A-Fa-f]{2}/, // hex (2 digits)
      /\\u[0-9A-Fa-f]{4}/, // unicode (4 digits)
      /\\U[0-9A-Fa-f]{8}/, // unicode (8 digits)
    ),
    "'"
  )),
}