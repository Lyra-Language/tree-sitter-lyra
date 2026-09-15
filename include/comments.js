module.exports = {
  // Three comment kinds share the `//` prefix:
  //
  //   `/// x`  doc_comment        internal, prec 1  — documents the declaration below it
  //   `//! x`  inner_doc_comment  internal, prec 1  — documents the module the file belongs to
  //   `//// …` comment            external          — a divider rule, deliberately NOT a doc comment
  //
  // `comment` (`// …`, `//// …`, `/* … */`) is lexed by scan_comment in src/scanner.c, which
  // runs before the internal lexer and declines `///` and `//!`. The divider is the subtle
  // case: `////////` must not lex as the doc comment `///` plus a stray `/////`, which would
  // silently make a rule line above a declaration its documentation. The scanner taking
  // `////` first is what prevents that; `doc_comment` refusing a fourth slash keeps it from
  // matching the divider on its own.
  doc_comment: $ =>
    token(prec(1, choice(
      // A blank `///` is ordinary inside a doc block (it separates paragraphs), so the
      // no-fourth-slash rule applies only when the line has content.
      seq("///", /[^\/\n].*/),
      "///",
    ))),

  inner_doc_comment: $ =>
    token(prec(1, choice(
      seq("//!", /.*/),
      "//!",
    ))),
}
