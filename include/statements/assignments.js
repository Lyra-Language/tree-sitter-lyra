const { PREC } = require("../prec");

// The `mut` in `let mut`/`var mut` sits at IDENTIFIER_TOKEN precedence (not the
// default 0 of a bare keyword) so it ties with `identifier` rather than
// out-ranking it. tree-sitter compares lexical precedence before match length,
// so the default keyword `mut` beat the longer name in `var mutable`, lexing it
// as `var mut able`. At equal precedence the tie resolves by (1) longest match
// — `mutable` wins — then (2) string-beats-regexp — an exact `mut` still wins
// over the identifier regexp, so `var mut x` keeps its mutability modifier.
const mutModifier = token(prec(PREC.IDENTIFIER_TOKEN, "mut"));

module.exports = {
  const_declaration: ($) =>
    prec.left(
      seq(
        optional($.attribute_list),
        optional($.visibility),
        field("keyword", "const"),
        // Const names must be SCREAMING_CASE (`const_identifier`). A lowercase
        // `identifier` is accepted here ONLY so the collector can emit a clear
        // "const names must be SCREAMING_CASE" diagnostic instead of an opaque
        // parse error; it is still rejected. Usage sites and compile-time-
        // constant positions (array sizes, …) keep requiring `const_identifier`,
        // so the lexical const guarantee is unchanged everywhere else.
        field("name", choice($.const_identifier, $.identifier)),
        optional(field("type_annotation", $.type_annotation)),
        "=",
        field("value", $.expression),
      ),
    ),

  declaration: ($) =>
    prec.left(
      choice(
        // Identifier binding: supports generics, where constraints, optional value
        seq(
          optional($.attribute_list),
          optional($.visibility),
          field("keyword", choice("let", "var")),
          optional(field("mutability", mutModifier)),
          field("name", $.identifier),
          optional(field("generic_parameters", $.generic_parameters)),
          optional(
            seq(
              "where",
              field(
                "generic_parameter_constraints",
                $.generic_parameter_constraints,
              ),
            ),
          ),
          optional(field("type_annotation", $.type_annotation)),
          optional(seq("=", field("value", $.expression))),
        ),
        // Pattern binding: value is required
        seq(
          optional($.attribute_list),
          optional($.visibility),
          field("keyword", choice("let", "var")),
          optional(field("mutability", mutModifier)),
          field("pattern", $.destructuring_only_pattern),
          optional(field("type_annotation", $.type_annotation)),
          "=",
          field("value", $.expression),
        ),
      ),
    ),

  var_reassignment: ($) =>
    seq(
      choice($.identifier, $.const_identifier),
      "=",
      field("value", $.expression),
    ),

  deref_assignment: ($) =>
    seq(field("target", $.deref_expr), "=", field("value", $.expression)),

  // Interior mutation of an aggregate through a member or index path:
  //   p.x = v        arr[i] = v        grid[i].y = v
  // The typechecker enforces that the root binding permits interior mutation
  // (a `var` or a `let mut`); a plain `let` is deeply immutable.
  member_assignment: ($) =>
    seq(field("target", $.member_expr), "=", field("value", $.expression)),

  index_assignment: ($) =>
    seq(field("target", $.index_expr), "=", field("value", $.expression)),

  var_destructuring_reassignment: ($) =>
    seq(
      field("pattern", $.destructuring_pattern),
      "=",
      field("value", $.expression),
    ),
};
