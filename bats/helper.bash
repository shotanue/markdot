
MARKDOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
BUILD_DIR="$MARKDOT_DIR/build"

setup() {
  TEST_TEMP_DIR="$(mktemp -d)"
  mkdir -p "$BUILD_DIR"
  
  (cd "$MARKDOT_DIR" && bun build ./scripts/markdot.ts --compile --minify --outfile "$BUILD_DIR/markdot")
  chmod +x "$BUILD_DIR/markdot"
  PATH="$BUILD_DIR:$PATH"
}

teardown() {
  if [ -d "$TEST_TEMP_DIR" ]; then
    rm -rf "$TEST_TEMP_DIR"
  fi
}

run_markdot() {
  "$BUILD_DIR/markdot" "$@"
}

run_markdot_stdin() {
  cat "$1" | "$BUILD_DIR/markdot" "${@:2}"
}
