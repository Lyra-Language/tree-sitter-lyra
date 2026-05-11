module.exports = {
  // Character literal as a single token to avoid parser state conflicts
  // Matches: 'a', '\n', '\x1F', '\u0041', '\U0001F600', etc.
  char_literal: $ => token(seq(
    "'",
    choice(
      /[^'\\]/u, // any single Unicode code point except ' and \
      /\\[abefnrtv\\'"]/,  // simple escape sequences
      /\\o[0-7]{3}/,       // octal (3 digits)
      /\\x[0-9A-Fa-f]{2}/, // hex (2 digits)
      /\\u[0-9A-Fa-f]{4}/, // unicode (4 digits)
      /\\U[0-9A-Fa-f]{8}/, // unicode (8 digits)
    ),
    "'"
  )),
}