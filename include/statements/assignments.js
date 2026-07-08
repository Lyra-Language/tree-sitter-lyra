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
        // Identifier binding: supports generics, `where` constraints, and a
        // value that is either the usual `= <expression>` or the ML-style
        // function-definition sugar — a bare `lambda_expr` whose parameter list
        // attaches directly to the name, with no `=`:
        //   let multiply(a: i32, b: i32) -> i32 => a * b
        //   let compare<n> where n: Ord (a: n, b: n) -> n => a <=> b
        // The sugar's lambda lands in the same `value` field as `= <lambda>`,
        // so it desugars to an identical binding (VarDeclStmt{Value:
        // LambdaExpr}) and the collector needs no special case.
        //
        // The tail is a three-way `choice` (inlined, not a separate rule, since
        // one arm matches empty). Crucially, a `where` clause REQUIRES a value
        // (an `=` form or the lambda sugar): a value-less generic binding with
        // constraints is meaningless, and — more importantly — allowing it made
        // `let f<n> where n: Ord` a complete statement, so a following
        // `(…) => …` parsed as a *separate* bare-lambda statement instead of
        // the sugar's parameter list. Forbidding the value-less-after-`where`
        // case removes that ambiguity, so `(` can only open the lambda.
        seq(
          optional($.attribute_list),
          optional($.visibility),
          field("keyword", choice("let", "var")),
          optional(field("mutability", mutModifier)),
          field("name", $.identifier),
          optional(field("generic_parameters", $.generic_parameters)),
          choice(
            // `where` clause present: a value is REQUIRED — the `=` form or
            // the bare-lambda function sugar.
            seq(
              "where",
              field(
                "generic_parameter_constraints",
                $.generic_parameter_constraints,
              ),
              choice(
                seq(
                  optional(field("type_annotation", $.type_annotation)),
                  "=",
                  field("value", $.expression),
                ),
                field("value", $.lambda_expr),
              ),
            ),
            // No `where` clause: the value is optional.
            seq(
              optional(field("type_annotation", $.type_annotation)),
              optional(seq("=", field("value", $.expression))),
            ),
            // No `where` clause, function sugar: a bare lambda as the value.
            field("value", $.lambda_expr),
          ),
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
