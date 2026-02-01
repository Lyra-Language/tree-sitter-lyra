/**
 * Allocation modifiers for controlling stack vs heap allocation
 * 
 * Usage:
 *   - On type declarations: `stack struct Vec3 { ... }`, `heap data Tree<t> = ...`
 *   - On type annotations: `let pos: stack Vec3 = ...`, `let boxed: heap Vec3 = ...`
 *   - On array types: `stack [16]f32` (fixed-size), `heap [f32]` (dynamic)
 *   - Weak references: `weak Parent` (for breaking cycles in shared types)
 */

module.exports = {
  // Allocation modifier - stack or heap
  allocation_modifier: $ => choice('stack', 'heap', 'shared'),

  // Weak reference type - for breaking cycles in shared types
  // Usage: `parent: weak Parent`, `prev: weak Maybe<Node>`
  weak_type: $ => prec(4, seq(
    'weak',
    field('inner_type', $._non_allocated_type)
  )),

  // Array type: [N]T
  // The size must be a compile-time constant (number literal or const identifier)
  // Use `stack [N]T` via allocated_type for explicit stack allocation
  // If the size is not provided, it is a dynamic array
  array_type: $ => prec(3, seq(
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
    $.function_type,
  ),

  // Allocated type - wraps any type with an allocation modifier
  // Used for: `heap Vec3`, `stack Player`, `stack [16]f32`, `heap []int`
  allocated_type: $ => prec(4, seq(
    $.allocation_modifier,
    $._non_allocated_type
  )),
}

