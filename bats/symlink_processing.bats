#!/usr/bin/env bats

load helper

setup_symlink_test() {
  cat > "$TEST_TEMP_DIR/symlink.md" << EOF
# Symlink Test

[$TEST_TEMP_DIR/link_source]($TEST_TEMP_DIR/link_target)
EOF

  mkdir -p "$TEST_TEMP_DIR/link_target"
}

@test "シンボリックリンクを作成する" {
  setup_symlink_test
  
  run run_markdot "$TEST_TEMP_DIR/symlink.md"
  [ "$status" -eq 0 ]
  [ -L "$TEST_TEMP_DIR/link_source" ]
  
  # シンボリックリンクの先を確認
  run readlink "$TEST_TEMP_DIR/link_source"
  [[ "$output" =~ "link_target" ]]
}
