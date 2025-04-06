#!/usr/bin/env bats

load helper

@test "標準入力からMarkdownを処理する" {
  run run_markdot_stdin "$MARKDOT_DIR/bats/fixtures/basic.md"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "done" ]]
}
