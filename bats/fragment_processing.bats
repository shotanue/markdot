#!/usr/bin/env bats

load helper

@test "ファイルパス内のフラグメントを使用する" {
  run run_markdot "$MARKDOT_DIR/bats/fixtures/fragment.md#bar"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "done" ]]
}

@test "--fragmentオプションでフラグメントを指定する" {
  run run_markdot_stdin "$MARKDOT_DIR/bats/fixtures/fragment.md" --fragment=bar
  [ "$status" -eq 0 ]
  [[ "$output" =~ "done" ]]
}
