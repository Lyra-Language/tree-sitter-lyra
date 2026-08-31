module.exports = {
  // Character literal as a single token to avoid parser state conflicts
  // Matches: 'a', '\n', '\x1F', '\u0041', '\U0001F600', etc.
  char_literal: $ => token(seq(
    "'",
    choice(
      /[^'\\]/u, // any single Unicode code point except ' and \
      // **Any** escape, legal or not, and the legal set lives in the compiler instead —
      // `unescapeStringContent`, which the string path already validates against and which
      // `collectCharacterLiteralExpr` already calls. Enumerating the set here meant an
      // illegal escape did not match the token at all, so `'\q'` was a *syntax error* with
      // a cascade behind it where `"\q"` gave "unknown escape sequence: \q" — one mistake,
      // two reports, and the worse one on the smaller literal. Broadening this moves the
      // rune path onto the string path's diagnostic and costs no new code.
      //
      // The longer alternatives below still win: tree-sitter takes the longest match, so
      // `\x1F` is the hex rule and never this one followed by a stray `1F`. And this stays
      // bounded by the closing `'` — `'\''` and `'\\'` are corpus tests for exactly that.
      //
      // (The legal set is C's plus `\e` and `\o`, and includes `\0` as NUL — safe here
      // because octal carries an explicit `\o` prefix, so `\0` opens no digit run.)
      /\\./u, // an escape sequence; which ones are legal is the compiler's rule
      /\\o[0-7]{3}/,       // octal (3 digits)
      /\\x[0-9A-Fa-f]{2}/, // hex (2 digits)
      /\\u[0-9A-Fa-f]{4}/, // unicode (4 digits)
      /\\U[0-9A-Fa-f]{8}/, // unicode (8 digits)
    ),
    "'"
  )),
}