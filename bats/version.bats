#!/usr/bin/env bats

load helper

@test "バージョンが表示される (--version)" {
  # package.jsonからバージョンを取得
  EXPECTED_VERSION=$(grep -m 1 '"version"' "$MARKDOT_DIR/package.json" | cut -d'"' -f4)
  
  run run_markdot --version
  [ "$status" -eq 0 ]
  [ "$output" = "$EXPECTED_VERSION" ]
}

@test "バージョンが表示される (-v)" {
  # package.jsonからバージョンを取得
  EXPECTED_VERSION=$(grep -m 1 '"version"' "$MARKDOT_DIR/package.json" | cut -d'"' -f4)
  
  run run_markdot -v
  [ "$status" -eq 0 ]
  [ "$output" = "$EXPECTED_VERSION" ]
}
