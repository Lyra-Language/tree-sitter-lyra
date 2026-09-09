module.exports = {
  // The null raw pointer, and the only way to make a pointer that does not come
  // from `&`. It exists for the FFI: a C function that answers a pointer answers
  // NULL on failure, and without a literal to compare against there was no way to
  // ask. See `lyra/CLAUDE.md`'s raw-pointer section for why it is spelled
  // `nullptr` rather than `null` — Lyra has no null *references*, and a bare
  // `null` would read as though it did.
  //
  // A plain string token, like `true`/`false`: `identifier` carries
  // PREC.IDENTIFIER_TOKEN of 0, so on an equal-length match tree-sitter prefers
  // the string over the regex and `nullptr` cannot be bound as a name.
  //
  // It lives in `_primary_expr` (postfix.js) and nowhere else — the partition rule
  // in literals/index.js. That is also what puts it in every operand position it
  // needs: `p == nullptr` reaches it through `_comparison_operand`'s
  // `_postfix_expr`, and an argument through the same.
  nullptr_literal: ($) => "nullptr",
};
