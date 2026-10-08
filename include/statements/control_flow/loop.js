module.exports = {
  // loop { if done() { break } }
  //
  // Runs until a `break` or `return`. The keyword is what carries the typing rule: a
  // `loop` with no `break` leaving it is `never`, where a `while` always has a condition
  // and so can finish (LANGUAGE.md § Loops).
  infinite_loop: $ => seq(
    optional(
      seq(
        field("label", alias($.identifier, $.label)),
        ':'
      )
    ),
    'loop',
    field("loop_body", alias($.block, $.loop_body))
  ),

  // while i < 10 { i += 1 }
  //
  // There is no C-style `init; cond; post` header: it was removed on 10/08/26 with no
  // uses left, and a counted loop is `for i in 0..<n`.
  while_loop: $ => seq(
    optional(
      seq(
        field("label", alias($.identifier, $.label)),
        ':'
      )
    ),
    'while',
    field("condition", $._bool_operand),
    field("while_body", alias($.block, $.while_body))
  ),

  // while let Some(line) = lines.next() { … }
  //
  // The loop twin of `if let` (`destructuring_if_declaration`), and built the same way:
  // `while` + the ordinary `declaration` + a block. A statement like `if let`, not an
  // expression; the collector erases it into `loop { if let … { … } else { break } }`.
  while_let_loop: $ => seq(
    optional(
      seq(
        field("label", alias($.identifier, $.label)),
        ':'
      )
    ),
    'while',
    field("declaration", $.declaration),
    field("while_body", alias($.block, $.while_body))
  ),
}
