const { PREC } = require("../prec");

module.exports = {
  // Full destructuring pattern (includes identifier; used in if/else-declaration and match)
  destructuring_pattern: ($) =>
    prec.right(
      choice(
        $.binding_pattern,
        $.array_pattern,
        $.struct_pattern,
        $.tuple_pattern,
        $.data_pattern,
        $.identifier,
      ),
    ),

  // Pattern-only binding (excludes bare identifier, which takes the identifier branch
  // of declaration to avoid ambiguity with function definitions).
  //
  // `wildcard_pattern` is here so `let _ = expr` parses — evaluate and discard, which is
  // the canonical way to opt out of the must-use rule. Without it a bare `_` in binding
  // position fell into `data_pattern`, which recovered with an *empty* name and left
  // `lyrac` reporting "cannot destructure integer literal with a data pattern". The
  // named form `let _ignored = …` worked, taking the identifier branch, which is why the
  // gap survived: the workaround looks like a style choice rather than a necessity.
  destructuring_only_pattern: ($) =>
    prec.right(
      choice(
        $.binding_pattern,
        $.array_pattern,
        $.struct_pattern,
        $.tuple_pattern,
        $.data_pattern,
        $.wildcard_pattern,
      ),
    ),

  // Declaration with else block (for pattern-binding let/var that must match)
  destructuring_else_declaration: ($) =>
    prec.right(
      PREC.DESTRUCTURING_ELSE,
      seq(
        field("declaration", $.declaration),
        "else",
        field("else_block", $.block),
      ),
    ),

  // If declaration (for pattern-binding let/var used as a condition)
  destructuring_if_declaration: ($) =>
    prec.right(
      PREC.DESTRUCTURING_IF,
      seq(
        "if",
        field("declaration", $.declaration),
        field("then_block", $.block),
        optional(seq("else", field("else_block", $.block))),
      ),
    ),
};
