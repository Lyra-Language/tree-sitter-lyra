module.exports = {
  tuple_literal: $ => prec.left(1,
    choice(
      // Empty tuple: ()
      seq('(',')'),
      // Named tuple with parens: Some(x) or Some(x, y)
      seq(
        $._tuple_name,
        optional(field('generic_arguments', $.generic_arguments)),
        '(',
          $._tuple_value,
          optional(seq(repeat1(seq($._comma, $._tuple_value)), optional($._comma))),
        ')'
      ),
      // Anonymous tuple: requires at least one comma to distinguish from parenthesized expressions
      seq(
        '(',
          $._tuple_value,
          choice(
            // Multiple elements: (x, y) or (x, y, z)
            seq(repeat1(seq($._comma, $._tuple_value)), optional($._comma)),
            // Single element with trailing comma: (x,)
            $._comma
          ),
        ')'
      )
    )
  ),

  _tuple_value: $ => prec.right(1, alias($.expression, $.tuple_value)),

  _tuple_name: $ => prec(2, field('tuple_name', alias($.user_defined_type_name, $.tuple_name))),
}