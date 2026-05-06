## To-Dos
- partial application syntax e.g. add(_, 5)
- Tail-call optimization guarantee (use "rec" keyword or @tailrec annotation)
- Compile-time evaluation (Zig-style "comptime" blocks or "const fn" for)
- Function/inline annotations:
@inline fn dot(a: Vec3, b: Vec3) -> f32 { ... }
@noinline fn loadLevel(...) { ... }
- unchecked indexing in release or behind a flag
- Record update syntax - { existingPLayer | health: newHealth } for immutable update of structs
- "unsafe" blocks / raw pointers and pointer arithmetic
- @volatile memory access for memory-mapped I/O on consoles
- Fixed-point numeric type for deterministic physics/networking sims. e.g. fixed<16,16>
- "where" bindings in expressions
- doc comments
- pipe operator?

## Completed

### 05/06/25
- simplified function syntax (got rid of the "def" keyword, all functions are essentially lambdas)
- packed/aligned struct attributes e.g. @packed struct InputEvent { ... } or @align(16) struct Vec4 { ... }
- Coroutines/fibers (with "gen" and "yield" keywords)
- Function composition operator >> so f >> g is the same as x => g(f(x))
- Trait default method implementations

### 03/15/25
- await expression tests
- tests for func type param modifiers (ref, mut, own)
- allow ref and mut modifiers for return types
- math assignment ops (+=, -=, *=, /=)
- function_type / type-only tests

### 11/29/25
- struct default values added

### 11/28/25
- added [mut]: keyword for mutable data

### 11/26/25
- Parse nested block comments
- Parse nested String interpolation
- Modules
- raw strings
- async/await
- guards in function defs
- prefix/suffix operator overloading

### 11/19/25
- Add Trait Implementations
- Added Trait tests

### 11/11/25
- Add Trait declarations

### 11/09/25
- Add tests for match expressions with guards
- Add if let and let...else statements like Rust (with patterns)