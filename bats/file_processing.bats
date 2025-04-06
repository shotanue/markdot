#!/usr/bin/env bats

load helper

@test "ファイルパスからMarkdownを処理する" {
  run run_markdot "$MARKDOT_DIR/bats/fixtures/basic.md"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "done" ]]
}

@test "存在しないファイルパスを指定した場合にエラーになる" {
  run run_markdot "/path/to/nonexistent/file.md"
  [ "$status" -ne 0 ]
}
