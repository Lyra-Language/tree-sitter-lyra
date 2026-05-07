module.exports = {
  // doc_comment must be listed before comment and given higher token precedence
  // so that `///` is never consumed as a regular `//` comment.
  doc_comment: $ => token(prec(1, seq("///", /.*/))),

  comment: $ =>
    choice(
      token(seq("//", /.*/)),
      $._BLOCK_COMMENT,
    ),
}