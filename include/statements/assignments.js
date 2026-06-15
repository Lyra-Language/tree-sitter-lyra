module.exports = {
  const_declaration: ($) =>
    prec.left(
      seq(
        optional($.attribute_list),
        optional($.visibility),
        field("keyword", "const"),
        field("name", $.const_identifier),
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
          optional(field("mutability", "mut")),
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
          optional(field("mutability", "mut")),
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
