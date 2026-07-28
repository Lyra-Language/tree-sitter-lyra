module.exports = {
  // Wrapped in `token(prec(...))` so the lexer prefers the long `r/.../`
  // form over the single-character identifier `r` whenever both are
  // possible in the current parse state (notably: match-arm patterns).
  //
  // The content classes exclude newlines, so a regex literal can never span a
  // line. `r` is itself a valid identifier and this token outranks it, so
  // `let ratio = r/2` (a variable named `r` divided by 2, no spaces) starts
  // something that *looks* like a regex; without the newline bound the token
  // ran on to the next `/` ANYWHERE later in the file — the first slash of a
  // `//` comment, or an unrelated division many lines down — swallowing all the
  // code between as one literal, with no diagnostic. Bounding it to one line
  // keeps that damage local and makes the common case (`r/2` at end of line)
  // lex as division again. Same-line `r/2 + a/b` is still mis-lexed; the real
  // cure is a delimiter that can't collide with an identifier-plus-division,
  // which is a language design change, not a token tweak.
  regex_literal: ($) => token(prec(1, /r\/[^\/\\\n\r]*(?:\\[^\n\r][^\/\\\n\r]*)*\//)),
};
