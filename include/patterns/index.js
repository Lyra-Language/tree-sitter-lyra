module.exports = {
  // Core pattern types
  pattern: $ => prec.left(5, choice(
    $.identifier,                    // simple binding: x
    $.literal_pattern,              // literal matching: 42, "hello"
    $.range_pattern,                // range matching: 0..=9, 10..99
    $.array_pattern,                // array destructuring: [a, b, ...rest]
    $.struct_pattern,               // struct destructuring: {name, age}
    $.tuple_pattern,                // tuple destructuring: (x, y, z)
    $.data_pattern,                 // data pattern: Some(42)
    $.wildcard_pattern              // wildcard: _
  )),

  // Array patterns (shared between destructuring and pattern matching)
  array_pattern: $ => seq(
    '[',
    $._pattern_element,
    repeat(seq(',', $._pattern_element)),
    optional(','),
    ']'
  ),

  // Struct patterns (shared)
  struct_pattern: $ => seq(
    '{',
    $._pattern_field,
    repeat(seq(',', $._pattern_field)),
    optional(','),
    '}'
  ),

  // Tuple patterns (shared)
  tuple_pattern: $ => prec.left(10, seq(
    choice(
      $.unit_pattern,
      seq(
        optional(field('tuple_name', alias($.identifier, $.tuple_name))),
        optional(field('generic_arguments', $.generic_parameters)),
        '(',
        $._pattern_element,
        repeat(seq(',', $._pattern_element)),
        optional(','),
        ')'
      )
    )
  )),

  unit_pattern: $ => seq('(', ')'),

  // Pattern elements (shared)
  _pattern_element: $ => prec(1, choice(
    $.pattern,                      // nested patterns
    $.rest_pattern,                 // ...rest
    $.wildcard_pattern              // _
  )),

  // Pattern fields (shared)
  _pattern_field: $ => prec(1, choice(
    $.identifier,                   // { name }
    seq(
      $.identifier,
      ':',
      alias($.identifier, $.new_name)
    ), // { oldName: newName }
    $.pattern,                      // nested patterns
    $.rest_pattern,                 // ...rest
    $.wildcard_pattern              // _
  )),

  // Data pattern
  data_pattern: $ => prec.left(seq(
    alias($.user_defined_type_name, $.data_type_name),
    optional(seq('(', $.pattern, ')')),
  )),

  // Literal patterns (for pattern matching)
  literal_pattern: $ => choice(
    $._number_literal,
    $.string_literal,
    $.boolean_literal
  ),

  // Range patterns (for pattern matching)
  range_pattern: $ => prec.left(25, choice(
    seq($._number_literal, '..', $.range_end_operator, $._number_literal),  // 0..=9, 10..99
    seq($._number_literal, '..', $._number_literal)                        // 0..9
  )),

  // Wildcard pattern
  wildcard_pattern: $ => prec.left(20, '_'),

  // Rest pattern
  rest_pattern: $ => seq('...', field('identifier', $.identifier)),
}