/**
 * Named precedence constants for the Lyra grammar.
 *
 * Relative ordering between values is what tree-sitter cares about; the
 * absolute numbers are preserved from the historical grammar to avoid any
 * behavioural change from this refactor. When adding new precedences, pick
 * a slot that expresses intent (e.g. "between ADDITIVE and MULTIPLICATIVE")
 * rather than an arbitrary number, and give it a name here.
 *
 * Roughly grouped from lowest to highest binding power. Groups share a
 * numeric value when they should tie — e.g. all postfix operators resolve
 * at the same level so `a.b[c]()` is left-associative across them.
 */

const PREC = {
  // ---------------------------------------------------------------------
  // Token-level precedences. These only interact with other tokens (see
  // tree-sitter's `token(prec(...))`) and don't compose with rule-level
  // precedences.
  // ---------------------------------------------------------------------
  IDENTIFIER_TOKEN: -1, // lower than every reserved keyword
  FLOAT_LITERAL_TOKEN: 1, // float beats decimal_int on shared prefix
  DECIMAL_INT_TOKEN: 2,

  // ---------------------------------------------------------------------
  // Rule-level precedences, lowest to highest.
  // ---------------------------------------------------------------------

  // Nestable pieces of larger literals / patterns. These need to be
  // preferred over bare `identifier`/`expression` reductions in the same
  // position, but otherwise should not fight anything.
  LITERAL: 1,
  TUPLE_VALUE: 1,
  TUPLE_LITERAL: 1,
  PATTERN_ELEMENT: 1,
  STRUCT_FIELD_WITH_PATTERN: 1,
  FOR_IN_CONDITION: 1,
  OPERATOR_OVERLOAD: 1, // unary/prefix/suffix/binary operator name rules

  // Statement / expression blocks and the `type` choice. Above 1 so an
  // ambiguous construct resolves as a block / type rather than a generic
  // operand.
  BLOCK: 2,
  TYPE: 2,
  TUPLE_NAME: 2,
  ARRAY_COMP: 2,

  // Type constructors that need to beat `user_defined_type_name` alone.
  ARRAY_TYPE: 3,
  FUNCTION_TYPE: 3,

  // Type modifiers (`weak T`, `stack T`) and the struct-literal's name.
  WEAK_TYPE: 4,
  ALLOCATED_TYPE: 4,
  STRUCT_NAME: 4,

  // Pattern choice and bare data constructors.
  PATTERN: 5,
  DATA_CTOR_BARE: 5, // `None` with no payload

  // Composite literals / patterns and `if` / `boolean_expr` wrappers. Need
  // to win against plain `expression` so `Point { x: 1 }` is a struct
  // literal, not an identifier followed by a block.
  DATA_TYPE: 10,
  DATA_CTOR: 10, // `Some x` / `Node { value: 1 }`
  STRUCT_LITERAL: 10,
  TUPLE_PATTERN: 10,
  STRUCT_FIELD_RENAME: 10,
  BOOLEAN_EXPR: 10,
  IF_EXPR: 10,

  GENERIC_PARAMETERS: 15,

  // Medium binding.
  WILDCARD_PATTERN: 20,
  SPREAD: 20,
  DESTRUCTURING_IF: 20,
  DESTRUCTURING_ELSE: 20,
  RANGE_EXPR: 20,

  RANGE_PATTERN: 25,
  NULL_COALESCE: 25,

  // Boolean operators, lowest to highest binding. Anything here should
  // bind tighter than assignment/statement level but looser than
  // comparisons / arithmetic.
  LOGICAL_OR: 30,
  LOGICAL_AND: 40,
  EQUALITY: 80,
  RELATIONAL: 90,

  // Trait impls — high enough that `impl T for U { ... }` captures the
  // whole block body without fighting inner statements.
  TRAIT_IMPL: 100,

  // Arithmetic.
  ADDITIVE: 110,
  MULTIPLICATIVE: 120,
  MATH_PRIMARY: 130,
  UNARY: 140, // `-x`, `!x`

  // Statement-level control flow (jumps bind tighter than their payload
  // expression so `return x + 1` parses as `return (x + 1)`).
  JUMP: 170,
  MATH_GROUP: 180, // `( math_expr )`

  // `with` / `match` headers — need to capture the trailing block.
  WITH_STATEMENT: 200,
  MATCH_EXPR: 201,

  AWAIT: 250,

  // Postfix operators (call, member access, index, try, optional
  // member/index). All share one level so chains stay left-associative.
  POSTFIX: 300,
};

module.exports = { PREC };
