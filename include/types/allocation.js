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
    field('element_type', $._element_type)
  )),

  // Array size - compile-time constant expression
  array_size: $ => choice($._number_literal, $.const_identifier),

  // An array *element* may carry ONE allocation or `weak` modifier —
  // `[]shared Node`, `[3]weak Observer`, `[16]stack Vec3`. The element is the one
  // position where a modifier is meaningful but was not accepted, which made the
  // natural spelling for a tree's children (`kids: []shared Node`) unwritable and
  // pushed it into a `Maybe<shared Node>` chain. Allocation is a use-site property
  // (see the header), and an array's elements are a use site like any other; the
  // type system already expected this, `firstAllocationMismatch` in `lyra`'s
  // assignable.go having been written to catch "a `stack` element assigned into a
  // `[N]shared` slot".
  //
  // It is a choice of three rather than `$.type` — which would admit `[]void` — and
  // it is exactly ONE modifier deep, because the operand stays `_non_allocated_type`.
  // That is what keeps `shared shared T` and `weak shared T` out, and it is why the
  // two *other* users of `_non_allocated_type` (weak_type's inner, allocated_type's
  // type) are deliberately left alone: their operand must remain modifier-free or
  // modifiers become stackable everywhere.
  _element_type: $ => choice(
    $._non_allocated_type,
    $.allocated_type,
    $.weak_type,
  ),

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

