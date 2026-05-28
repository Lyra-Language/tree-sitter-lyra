module.exports = {
  // Wrapped in `token(prec(...))` so the lexer prefers the long `r/.../`
  // form over the single-character identifier `r` whenever both are
  // possible in the current parse state (notably: match-arm patterns).
  regex_literal: ($) => token(prec(1, /r\/[^\/\\]*(?:\\.[^\/\\]*)*\//)),
};
