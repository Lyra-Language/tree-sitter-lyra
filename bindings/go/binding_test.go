package tree_sitter_lyra_parser_test

import (
	"testing"

	lyra_parser "github.com/Lyra-Language/tree-sitter-lyra/bindings/go"
	tree_sitter "github.com/tree-sitter/go-tree-sitter"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(lyra_parser.Language())
	if language == nil {
		t.Errorf("Error loading The Lyra Programming Language Parser grammar")
	}
}
