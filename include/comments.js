module.exports = {
  // Three comment tokens share the `//` prefix, so all three are settled by *token
  // precedence* rather than by match length — tree-sitter compares explicit precedence
  // before it compares how much each candidate consumed, which is the only reason a
  // `///` is not simply eaten by the longer `comment` match.
  //
  //   `/// x`  doc_comment        prec 1  — documents the declaration below it
  //   `//! x`  inner_doc_comment  prec 1  — documents the module the file belongs to
  //   `//// …` comment            prec 2  — a divider rule, deliberately NOT a doc comment
  //
  // The divider needs the *highest* precedence of the three, and that is the subtle one.
  // Without it `////////` lexes as the doc comment `///` (prec 1, three characters)
  // followed by a stray `/////`, because precedence outranks length — so a rule line
  // above a declaration would silently become its documentation, or a syntax error.
  // `doc_comment` refusing a fourth slash is not enough on its own for the same reason:
  // the shorter high-precedence token still wins unless something outbids it.
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

  comment: $ =>
    choice(
      token(prec(2, seq("////", /.*/))),
      token(seq("//", /.*/)),
      $._BLOCK_COMMENT,
    ),
}
