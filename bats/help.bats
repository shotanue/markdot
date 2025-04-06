#!/usr/bin/env bats

load helper

@test "ヘルプが表示される (--help)" {
  run run_markdot --help
  [ "$status" -eq 2 ]
  [[ "$output" =~ "MarkDot" ]]
  [[ "$output" =~ "## USAGE" ]]
  [[ "$output" =~ "## OPTIONS" ]]
}

@test "ヘルプが表示される (-h)" {
  run run_markdot -h
  [ "$status" -eq 2 ]
  [[ "$output" =~ "MarkDot" ]]
  [[ "$output" =~ "## USAGE" ]]
  [[ "$output" =~ "## OPTIONS" ]]
}

@test "引数なしでヘルプが表示される" {
  run run_markdot
  [ "$status" -eq 2 ]
  [[ "$output" =~ "MarkDot" ]]
  [[ "$output" =~ "## USAGE" ]]
  [[ "$output" =~ "## OPTIONS" ]]
}
