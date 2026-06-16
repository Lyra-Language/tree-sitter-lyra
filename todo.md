## To-Dos

## Completed

### 06/16/26
- Bugfix: keyword carving — keywords were lexed out of longer identifiers (`mutable`→`mut`+`able`, `letter`→`let`+`ter`). Fixed by raising `IDENTIFIER_TOKEN` -1→0 (ties keywords; length + string-beats-regexp then resolve correctly), plus float-exponent `[eE]` precedence and a data-ctor payload alias for bare lowercase params (`Some t`).

### 05/07/26
- given bindings in expressions: `expr given { let x = ... }` (top-down readable local bindings)
- doc comments (`///`) as named AST nodes distinct from regular `//` comments
- unsafe blocks, raw pointer types (*T, *mut T), deref (*ptr), address-of (&expr, &mut expr), deref assignment (*ptr = val)
- Fixed-point numeric type fixed<I,F> for deterministic physics/networking sims
- Record update syntax { base | field: value } for immutable struct updates
- Function/inline annotations:
@inline fn dot(a: Vec3, b: Vec3) -> f32 { ... }
@noinline fn loadLevel(...) { ... }

### 05/06/26
- simplified function syntax (got rid of the "def" keyword, all functions are essentially lambdas)
- packed/aligned struct attributes e.g. @packed struct InputEvent { ... } or @align(16) struct Vec4 { ... }
- Coroutines/fibers (with "gen" and "yield" keywords)
- Function composition operator >> so f >> g is the same as x => g(f(x))
- Trait default method implementations
- Compile-time evaluation
- Tail-call optimization guarantee (use "rec" keyword or @tailrec annotation)

### 03/15/26
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
