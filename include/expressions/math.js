module.exports = {
    // Primary math expression - includes all math operations
    _math_expr: $ => choice(
        $._primary_math_expr,
        $.addition,
        $.subtraction,
        $.multiplication,
        $.division,
        $.addition_assignment,
        $.subtraction_assignment,
        $.multiplication_assignment,
        $.division_assignment,
    ),

    // Primary math expression - base elements without arithmetic operators to avoid circular dependency
    _primary_math_expr: $ => prec.right(130, choice($._number_literal, $._postfix_expression, $.group, $.negation)),

    // Math expression for constraints that can include const_identifier without circular dependency
    _constraint_math_expr: $ => choice($._number_literal, $._constraint_arithmetic_operator, $.constraint_negation, $.identifier, $.const_identifier),

    _arithmetic_operator: $ => choice($.addition, $.subtraction, $.multiplication, $.division),
    _constraint_arithmetic_operator: $ => choice($.constraint_addition, $.constraint_subtraction, $.constraint_multiplication, $.constraint_division),

    addition: $ => prec.left(110, seq(field('left', $._primary_math_expr), field('operator', '+'), field('right', $._math_expr))),
    subtraction: $ => prec.left(110, seq(field('left', $._primary_math_expr), field('operator', '-'), field('right', $._math_expr))),
    multiplication: $ => prec.left(120, seq(field('left', $._primary_math_expr), field('operator', '*'), field('right', $._math_expr))),
    division: $ => prec.left(120, seq(field('left', $._primary_math_expr), field('operator', '/'), field('right', $._math_expr))),
    negation: $ => prec.right(140, seq(field('operator', '-'), field('operand', $._primary_math_expr))),

    constraint_addition: $ => prec.left(110, seq($._constraint_math_expr, '+', $._constraint_math_expr)),
    constraint_subtraction: $ => prec.left(110, seq($._constraint_math_expr, '-', $._constraint_math_expr)),
    constraint_multiplication: $ => prec.left(120, seq($._constraint_math_expr, '*', $._constraint_math_expr)),
    constraint_division: $ => prec.left(120, seq($._constraint_math_expr, '/', $._constraint_math_expr)),
    constraint_negation: $ => prec.right(140, seq('-', $._constraint_math_expr)),

    addition_assignment: $ => prec.left(110, seq($._primary_math_expr, '+=', $._math_expr)),
    subtraction_assignment: $ => prec.left(110, seq($._primary_math_expr, '-=', $._math_expr)),
    multiplication_assignment: $ => prec.left(120, seq($._primary_math_expr, '*=', $._math_expr)),
    division_assignment: $ => prec.left(120, seq($._primary_math_expr, '/=', $._math_expr)),

    group: $ => prec(180, seq('(', $._math_expr, ')')),
}

