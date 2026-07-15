/**
 * Allocation modifiers for controlling stack vs shared allocation.
 *
 * Allocation flavor is a property of a *value's storage*, chosen at the use site
 * — NOT a property of the type declaration. There is deliberately no
 * declaration-level modifier (`shared struct Vec3 {}` does not parse); a type is
 * flavored where it is used.
 *
 * Usage:
 *   - On type annotations: `let pos: stack Vec3 = ...`, `let node: shared Node = ...`
 *   - On a field type, incl. to break a recursive cycle: `next: shared Node`
 *   - On array types: `stack [16]f32` (fixed-size stack array)
 *   - Weak references: `weak Parent` (for breaking cycles in shared types)
 *
 * Raw heap allocation is unsafe — use unsafe { } blocks with raw pointers instead.
 */

const { PREC } = require("../prec");

module.exports = {
  // Allocation modifier - stack or shared (ref-counted)
  allocation_modifier: $ => choice('stack', 'shared'),

  // Weak reference type - for breaking cycles in shared types
  // Usage: `parent: weak Parent`, `prev: weak Maybe<Node>`
  weak_type: $ => prec(PREC.WEAK_TYPE, seq(
    'weak',
    field('inner_type', $._non_allocated_type)
  )),

  // Array type: [N]T
  // The size must be a compile-time constant (number literal or const identifier)
  // Use `stack [N]T` via allocated_type for explicit stack allocation
  // If the size is not provided, it is a dynamic array
  array_type: $ => prec(PREC.ARRAY_TYPE, seq(
    '[',
    optional(field('size', $.array_size)),
    ']',
    field('element_type', $._non_allocated_type)
  )),

  // Array size - compile-time constant expression
  array_size: $ => choice($._number_literal, $.const_identifier),

  // Non-allocated types (used to prevent recursion in array types)
  _non_allocated_type: $ => choice(
    $._primitive_type,
    $.parameterized_type,
    $.self_type,
    $.user_defined_type_name,
    $.array_type,
    $.generic_type,
    $.lambda_type,
  ),

  // Allocated type - wraps any type with an allocation modifier
  // Used for: `heap Vec3`, `stack Player`, `stack [16]f32`, `heap []int`
  allocated_type: $ => prec(PREC.ALLOCATED_TYPE, seq(
    field('allocation', $.allocation_modifier),
    field('type', $._non_allocated_type)
  )),
}

