module.exports = {
  // A regex literal is `r"…"` — the `r` sigil plus *string* delimiters.
  //
  // It used to be `r/…/`, which was fundamentally ambiguous: `r` is an ordinary
  // identifier and `/` is division, so `let ratio = r/2 + a/b` lexed as the regex
  // `r/2 + a/` followed by a stray `b`, silently. Delimiting with `/` cannot be
  // disambiguated lexically — the deciding context is arbitrarily far to the
  // right, and a regex may legally contain spaces, digits, and operators, so no
  // heuristic on the content can separate the two readings. (Bounding the token
  // to one line, the earlier mitigation, only shrank the blast radius.)
  //
  // A double quote cannot follow an identifier in any valid Lyra expression —
  // there is no juxtaposition application, calls require parens — so `r"` can
  // only ever begin a regex, and `r/2` is now unambiguously division. The `r`
  // sigil is kept (so the node reads the same, and it matches how a Python
  // programmer already writes a pattern: `r"\d+"`), and `/` no longer needs
  // escaping inside the pattern: `r"https://example"` instead of
  // `r/https:\/\/example/`.
  //
  // Wrapped in `token(prec(...))` so it outranks the bare identifier `r`, and
  // the content classes exclude newlines so an unterminated literal can't run
  // off and swallow the rest of the file.
  regex_literal: ($) => token(prec(1, /r"[^"\\\n\r]*(?:\\[^\n\r][^"\\\n\r]*)*"/)),
};
