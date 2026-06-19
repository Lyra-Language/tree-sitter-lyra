; =============================================================================
; Comments
; =============================================================================

(doc_comment) @comment.documentation
(comment) @comment

; =============================================================================
; Keywords — binding
; =============================================================================

"let"   @keyword
"var"   @keyword
"const" @keyword

; =============================================================================
; Keywords — type declarations
; =============================================================================

"struct"  @keyword.type
"data"    @keyword.type
"newtype" @keyword.type
"tuple"   @keyword.type
"trait"   @keyword.type
"impl"    @keyword.type
"fixed"   @keyword.type

; =============================================================================
; Keywords — control flow
; =============================================================================

"if"       @keyword.control.conditional
"else"     @keyword.control.conditional
"match"    @keyword.control.conditional
"for"      @keyword.control.repeat
"in"       @keyword.control.repeat
"return"   @keyword.control.return
"break"    @keyword.control
"continue" @keyword.control
"with"     @keyword.control
"given"    @keyword.control

; =============================================================================
; Keywords — async / coroutines
; =============================================================================

"await" @keyword.coroutine
"yield" @keyword.coroutine
"from"  @keyword.coroutine

; =============================================================================
; Keywords — imports / modules
; =============================================================================

"import" @keyword.import
"module" @keyword.import
"as"     @keyword.import

; =============================================================================
; Keywords — misc
; =============================================================================

"where" @keyword
"Self"  @type.builtin

; =============================================================================
; Modifiers
; "pub", "pure", "async", "gen", "rec" have no anonymous node; use their
; named wrapper nodes.  "mut", "ref", "own", "readonly", "unsafe", "weak",
; "stack", "shared" do have anonymous nodes and are matched as strings.
; =============================================================================

(visibility)        @keyword.modifier   ; pub
(pure_modifier)     @keyword.modifier   ; pure
(async_modifier)    @keyword.modifier   ; async
(gen_modifier)      @keyword.modifier   ; gen
(rec_modifier)      @keyword.modifier   ; rec
(unsafe_modifier)   @keyword.modifier   ; unsafe on a lambda
(allocation_modifier) @keyword.modifier ; stack | shared
"unsafe"   @keyword.modifier
"weak"     @keyword.modifier
"readonly" @keyword.modifier
"mut"      @keyword.modifier
"ref"      @keyword.modifier
"own"      @keyword.modifier

; =============================================================================
; Built-in types
; =============================================================================

(signed_integer_type)   @type.builtin
(unsigned_integer_type) @type.builtin
(float_type)            @type.builtin
(string_type)           @type.builtin
(boolean_type)          @type.builtin
(void_type)             @type.builtin
(self_type)             @type.builtin

; =============================================================================
; User-defined types and type names
; =============================================================================

; Generic type parameters (lowercase, e.g. t, a, key)
(generic_type) @type

; Bare PascalCase names in type/expression positions
(user_defined_type_name) @type

; Aliased node kinds that override the blanket rule above where more specific
; context is known.

; Names being *defined* (declaration sites)
(struct_type struct_name: (struct_name) @type.definition)
(data_type                (data_type_name) @type.definition)
(named_tuple_type name:   (tuple_type_name) @type.definition)
(trait_declaration name:  (trait_name) @type.definition)
(constrained_type name:   (constrained_type_name) @type.definition)

; Same aliased nodes in non-definition positions get plain @type
(struct_name)           @type
(tuple_type_name)       @type
(constrained_type_name) @type
(trait_name)            @type
(data_type_name)        @type

; Tuple literal / pattern constructor name (PascalCase tuple type used
; as a constructor, e.g. Point(x, y))
(tuple_name) @constructor

; =============================================================================
; Data constructors
; =============================================================================

; Name declared inside a `data` definition body (e.g. Red, Some, None)
(data_type_constructor name: (data_type_constructor_name) @constructor)

; An applied constructor (e.g. `Some(42)`) parses as a named tuple literal, so it
; is highlighted by the `(tuple_name) @constructor` rule above. A nullary
; constructor used as a value (`None`) is a bare `user_defined_type_name`.

; Constructor matched in a pattern  (e.g. Some x => …)
(data_pattern name: (data_type_name) @constructor)

; =============================================================================
; Variables and constants
; =============================================================================

(identifier)       @variable
(const_identifier) @constant

; Lambda-valued declarations highlight the name as a function
(declaration
  name:  (identifier) @function
  value: (lambda_expr))

; Function parameters
(parameter pattern: (identifier) @variable.parameter)

; =============================================================================
; Function calls
; =============================================================================

(call_expr function: (identifier) @function.call)
(call_expr
  function: (member_expr
    property: (identifier) @function.method.call))

; =============================================================================
; Member access / struct fields
; =============================================================================

; Property in a field-access expression (obj.field or obj?.field)
(member_expr          property: (identifier) @variable.member)
(optional_member_expr property: (identifier) @variable.member)

; Field names in struct type declarations and struct literal bodies
(struct_member field_name: (field_name) @variable.member)
(struct_field  field_name: (field_name) @variable.member)

; =============================================================================
; Modules
; =============================================================================

(module_name) @module

; =============================================================================
; Attributes
; =============================================================================

"@sizeof"                     @function.builtin
(attribute "@"                @punctuation.special)
(attribute name: (identifier) @attribute)

; =============================================================================
; Literals
; =============================================================================

(boolean_literal)    @boolean
(integer_literal)    @number
(float_literal)      @number.float
(char_literal)       @character
(string_literal)     @string
(raw_string_literal) @string
(string_content)     @string
(regex_literal)      @string.regexp

(string_interpolation "${" @punctuation.special)
(string_interpolation "}"   @punctuation.special)

; =============================================================================
; Operators
; =============================================================================

; Arithmetic (named operator nodes)
(add_operator)              @operator
(sub_operator)              @operator
(mul_operator)              @operator
(div_operator)              @operator
(mod_operator)              @operator
(remainder_operator)        @operator
(add_assign_operator)       @operator
(sub_assign_operator)       @operator
(mul_assign_operator)       @operator
(div_assign_operator)       @operator
(mod_assign_operator)       @operator
(remainder_assign_operator) @operator

; Comparison (named nodes)
(equals_operator)               @operator
(not_equals_operator)           @operator
(greater_than_operator)         @operator
(less_than_operator)            @operator
(greater_than_or_equal_operator) @operator
(less_than_or_equal_operator)   @operator
(spaceship_operator)            @operator

; Boolean (named nodes)
(and) @operator
(or)  @operator
(not) @operator

; String and function composition (named nodes)
(string_concat_operator) @operator
(compose_operator)       @operator

; Anonymous operator tokens
"=>"  @operator
"->"  @operator
".."  @operator
"..." @operator
"?"   @operator
"??"  @operator
"?."  @operator
"?["  @operator
"&"   @operator
"^"   @operator
"="   @operator
"|"   @operator
"~"   @operator
"@"   @punctuation.special

; =============================================================================
; Punctuation
; =============================================================================

"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket

","  @punctuation.delimiter
":"  @punctuation.delimiter
"::" @punctuation.delimiter
"."  @punctuation.delimiter
".{" @punctuation.delimiter
