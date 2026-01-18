
"return" @keyword
"if" @keyword
"then" @keyword
"else" @keyword
"end" @keyword
"def" @keyword.function
"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
(comment) @comment
(parameter_type) @type
(signed_integer_type) @type
(parameter (identifier)) @variable.parameter
(function_signature (identifier) @function)