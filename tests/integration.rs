use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::atomic::{AtomicU32, Ordering};

static COUNTER: AtomicU32 = AtomicU32::new(0);

fn unique_path(prefix: &str) -> String {
    let count = COUNTER.fetch_add(1, Ordering::SeqCst);
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let dir = std::env::temp_dir();
    dir.join(format!("markdot-test-{prefix}-{ts}-{count}"))
        .to_string_lossy()
        .to_string()
}

fn create_temp_md(content: &str) -> String {
    let path = unique_path("md");
    let md_path = format!("{path}.md");
    fs::write(&md_path, content).unwrap();
    md_path
}

fn run_markdot(args: &[&str]) -> std::process::Output {
    let binary = env!("CARGO_BIN_EXE_markdot");
    Command::new(binary)
        .args(args)
        .output()
        .expect("Failed to run markdot")
}

fn create_temp_md_at(dir: &str, name: &str, content: &str) -> String {
    fs::create_dir_all(dir).unwrap();
    let path = Path::new(dir).join(name);
    let p = path.to_string_lossy().to_string();
    fs::write(&p, content).unwrap();
    p
}

fn cleanup(paths: &[&str]) {
    for path in paths {
        let _ = fs::remove_file(path);
    }
}

#[test]
fn test_ignore_not_executed() {
    let side_effect = unique_path("ignore");
    let md_content = format!(
        "```bash ::ignore\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        !Path::new(&side_effect).exists(),
        "::ignore block should not be executed"
    );

    cleanup(&[&md_file]);
}

#[test]
fn test_to_copies_but_does_not_execute() {
    let side_effect = unique_path("to-side");
    let target = unique_path("to-target");
    let md_content = format!(
        "```bash ::to={target}\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&target).exists(),
        "::to target file should exist"
    );
    let content = fs::read_to_string(&target).unwrap();
    assert!(
        content.contains(&format!("touch {side_effect}")),
        "target should contain the code"
    );

    assert!(
        !Path::new(&side_effect).exists(),
        "::to block should not be executed"
    );

    cleanup(&[&md_file, &target]);
}

#[test]
fn test_bash_block_executed() {
    let side_effect = unique_path("exec");
    let md_content = format!(
        "```bash\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&side_effect).exists(),
        "bash block should be executed"
    );

    cleanup(&[&md_file, &side_effect]);
}

#[test]
fn test_sh_to_copies_not_executes() {
    let side_effect = unique_path("sh-side");
    let target = unique_path("sh-target");
    let md_content = format!(
        "```sh ::to={target}\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(Path::new(&target).exists(), "target should exist");
    assert!(
        !Path::new(&side_effect).exists(),
        "sh block with ::to should not be executed"
    );

    cleanup(&[&md_file, &target]);
}

#[test]
fn test_to_with_permission() {
    let target = unique_path("perm");
    let md_content = format!(
        "```sh ::to={target} ::permission=755\n#!/bin/sh\necho hello\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(Path::new(&target).exists(), "target should exist");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = fs::metadata(&target).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o755, "permission should be 755");
    }

    cleanup(&[&md_file, &target]);
}

#[test]
fn test_fragment_filtering() {
    let side_a = unique_path("frag-a");
    let side_b = unique_path("frag-b");
    let md_content = format!(
        "# Setup\n```bash\ntouch {side_a}\n```\n# Cleanup\n```bash\ntouch {side_b}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&format!("{md_file}#Setup")]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&side_a).exists(),
        "Setup block should be executed"
    );
    assert!(
        !Path::new(&side_b).exists(),
        "Cleanup block should not be executed"
    );

    cleanup(&[&md_file, &side_a]);
}

#[test]
fn test_version_flag() {
    let output = run_markdot(&["--version"]);
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains(env!("CARGO_PKG_VERSION")), "should print version");
}

#[test]
fn test_help_flag() {
    let output = run_markdot(&["--help"]);
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("MarkDot"), "should print help");
}

#[test]
fn test_empty_markdown() {
    let md_file = create_temp_md("");

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot should handle empty markdown");

    cleanup(&[&md_file]);
}

#[test]
fn test_write_file_has_trailing_newline() {
    let target = unique_path("newline");
    let md_content = format!(
        "```sh ::to={target}\nsome content\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    let content = fs::read_to_string(&target).unwrap();
    assert!(content.ends_with('\n'), "written file should end with newline");

    cleanup(&[&md_file, &target]);
}

// === Tag filtering tests ===

#[test]
fn test_tag_matching_executes() {
    let side_effect = unique_path("tag-match");
    let md_content = format!(
        "```bash ::tag?=darwin\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file, "--tags", "darwin"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&side_effect).exists(),
        "tagged block should execute when tag matches"
    );

    cleanup(&[&md_file, &side_effect]);
}

#[test]
fn test_tag_not_matching_skips() {
    let side_effect = unique_path("tag-skip");
    let md_content = format!(
        "```bash ::tag?=darwin\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file, "--tags", "archlinux"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        !Path::new(&side_effect).exists(),
        "tagged block should not execute when tag doesn't match"
    );

    cleanup(&[&md_file]);
}

#[test]
fn test_tag_no_tags_flag_skips() {
    let side_effect = unique_path("tag-none");
    let md_content = format!(
        "```bash ::tag?=darwin\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        !Path::new(&side_effect).exists(),
        "tagged block should not execute without --tags"
    );

    cleanup(&[&md_file]);
}

#[test]
fn test_no_tag_always_runs() {
    let side_effect = unique_path("notag-run");
    let md_content = format!(
        "```bash\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file, "--tags", "darwin"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&side_effect).exists(),
        "untagged block should always execute"
    );

    cleanup(&[&md_file, &side_effect]);
}

#[test]
fn test_multiple_tags_or() {
    let side_a = unique_path("tag-or-a");
    let side_b = unique_path("tag-or-b");
    let md_content = format!(
        "```bash ::tag?=darwin ::tag?=archlinux\ntouch {side_a}\n```\n\
         ```bash ::tag?=windows\ntouch {side_b}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file, "--tags=archlinux"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&side_a).exists(),
        "block with OR tags should execute when one matches"
    );
    assert!(
        !Path::new(&side_b).exists(),
        "block with non-matching tag should not execute"
    );

    cleanup(&[&md_file, &side_a]);
}

// === Import tests ===

#[test]
fn test_import_basic() {
    let dir = unique_path("import-dir");
    let side_effect = unique_path("import-run");

    let child_content = format!("```bash\ntouch {side_effect}\n```");
    let child_file = create_temp_md_at(&dir, "child.md", &child_content);

    let parent_content = "```yaml ::markdot\nimport: child.md\n```";
    let parent_file = create_temp_md_at(&dir, "parent.md", parent_content);

    let output = run_markdot(&[&parent_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&side_effect).exists(),
        "imported file should be executed"
    );

    cleanup(&[&parent_file, &child_file, &side_effect]);
    let _ = fs::remove_dir(&dir);
}

#[test]
fn test_import_with_tag() {
    let dir = unique_path("import-tag-dir");
    let side_effect = unique_path("import-tag-run");

    let child_content = format!("```bash\ntouch {side_effect}\n```");
    let child_file = create_temp_md_at(&dir, "child.md", &child_content);

    let parent_content = "```yaml ::markdot ::tag?=darwin\nimport: child.md\n```";
    let parent_file = create_temp_md_at(&dir, "parent.md", parent_content);

    // Without matching tag - should skip
    let output = run_markdot(&[&parent_file, "--tags=archlinux"]);
    assert!(output.status.success());
    assert!(
        !Path::new(&side_effect).exists(),
        "import with non-matching tag should not execute"
    );

    // With matching tag - should execute
    let output = run_markdot(&[&parent_file, "--tags=darwin"]);
    assert!(output.status.success());
    assert!(
        Path::new(&side_effect).exists(),
        "import with matching tag should execute"
    );

    cleanup(&[&parent_file, &child_file, &side_effect]);
    let _ = fs::remove_dir(&dir);
}

#[test]
fn test_import_with_env() {
    let dir = unique_path("import-env-dir");
    let target = unique_path("import-env-out");

    let child_content = format!(
        "```toml ::to={target}\nuser = $GIT_USER\nemail = ${{GIT_EMAIL}}\n```"
    );
    let child_file = create_temp_md_at(&dir, "child.md", &child_content);

    let parent_content = "```yaml ::markdot\nimport: child.md\nenv:\n  override:\n    GIT_USER: shotanue\n    GIT_EMAIL: shotanue@gmail.com\n```".to_string();
    let parent_file = create_temp_md_at(&dir, "parent.md", &parent_content);

    let output = run_markdot(&[&parent_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    let content = fs::read_to_string(&target).unwrap();
    assert!(content.contains("user = shotanue"), "should expand $GIT_USER, got: {content}");
    assert!(content.contains("email = shotanue@gmail.com"), "should expand ${{GIT_EMAIL}}, got: {content}");

    cleanup(&[&parent_file, &child_file, &target]);
    let _ = fs::remove_dir(&dir);
}

// === Dry-run tests ===

#[test]
fn test_dry_run_no_side_effects() {
    let side_effect = unique_path("dry-run");
    let target = unique_path("dry-target");
    let md_content = format!(
        "```bash\ntouch {side_effect}\n```\n\
         ```sh ::to={target}\nhello\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file, "--dry-run"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        !Path::new(&side_effect).exists(),
        "dry-run should not execute shell scripts"
    );
    assert!(
        !Path::new(&target).exists(),
        "dry-run should not write files"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("[dry-run]"), "dry-run should log actions");

    cleanup(&[&md_file]);
}

#[test]
fn test_dry_run_short_flag() {
    let side_effect = unique_path("dry-n");
    let md_content = format!(
        "```bash\ntouch {side_effect}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file, "-n"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        !Path::new(&side_effect).exists(),
        "-n should prevent execution"
    );

    cleanup(&[&md_file]);
}

// === Env expansion tests ===

#[test]
fn test_env_expansion_in_write_file() {
    let target = unique_path("env-expand");
    let md_content = format!(
        "---\nenv:\n  override:\n    MY_VAR: hello_world\n---\n\
         ```toml ::to={target}\nvalue = $MY_VAR\nbrace = ${{MY_VAR}}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    let content = fs::read_to_string(&target).unwrap();
    assert!(content.contains("value = hello_world"), "should expand $MY_VAR, got: {content}");
    assert!(content.contains("brace = hello_world"), "should expand ${{MY_VAR}}, got: {content}");

    cleanup(&[&md_file, &target]);
}

#[test]
fn test_env_expansion_in_path() {
    let dir = unique_path("env-path-dir");
    fs::create_dir_all(&dir).unwrap();
    let md_content = format!(
        "---\nenv:\n  override:\n    TARGET_DIR: {dir}\n---\n\
         ```toml ::to=$TARGET_DIR/output.txt\nhello\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    let target = format!("{dir}/output.txt");
    assert!(
        Path::new(&target).exists(),
        "env var in path should be expanded"
    );

    cleanup(&[&md_file, &target]);
    let _ = fs::remove_dir(&dir);
}

// === Additional coverage ===

#[test]
fn test_tags_comma_separated_parsing() {
    let side_a = unique_path("comma-a");
    let side_b = unique_path("comma-b");
    let md_content = format!(
        "```bash ::tag?=darwin\ntouch {side_a}\n```\n\
         ```bash ::tag?=kamino\ntouch {side_b}\n```"
    );
    let md_file = create_temp_md(&md_content);

    let output = run_markdot(&[&md_file, "--tags=darwin,kamino"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        Path::new(&side_a).exists(),
        "darwin tagged block should execute with --tags=darwin,kamino"
    );
    assert!(
        Path::new(&side_b).exists(),
        "kamino tagged block should execute with --tags=darwin,kamino"
    );

    cleanup(&[&md_file, &side_a, &side_b]);
}

#[test]
fn test_import_nonexistent_file_fails() {
    let dir = unique_path("import-nofile-dir");
    let parent_content = "```yaml ::markdot\nimport: does_not_exist.md\n```";
    let parent_file = create_temp_md_at(&dir, "parent.md", parent_content);

    let output = run_markdot(&[&parent_file]);
    assert!(
        !output.status.success(),
        "import of nonexistent file should fail"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("failed to import"),
        "error message should mention import failure: {stderr}"
    );

    cleanup(&[&parent_file]);
    let _ = fs::remove_dir(&dir);
}

#[test]
fn test_dry_run_with_import() {
    let dir = unique_path("dry-import-dir");
    let side_effect = unique_path("dry-import-run");

    let child_content = format!("```bash\ntouch {side_effect}\n```");
    let child_file = create_temp_md_at(&dir, "child.md", &child_content);

    let parent_content = "```yaml ::markdot\nimport: child.md\n```";
    let parent_file = create_temp_md_at(&dir, "parent.md", parent_content);

    let output = run_markdot(&[&parent_file, "--dry-run"]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    assert!(
        !Path::new(&side_effect).exists(),
        "dry-run should not execute imported file's commands"
    );

    cleanup(&[&parent_file, &child_file]);
    let _ = fs::remove_dir(&dir);
}

#[test]
fn test_env_priority_import_over_frontmatter() {
    let dir = unique_path("env-prio-dir");
    let target = unique_path("env-prio-out");

    // Child has frontmatter env, but import env should override it
    let child_content = format!(
        "---\nenv:\n  override:\n    MY_VAR: from_frontmatter\n---\n\
         ```toml ::to={target}\nval = $MY_VAR\n```"
    );
    let child_file = create_temp_md_at(&dir, "child.md", &child_content);

    let parent_content = "```yaml ::markdot\nimport: child.md\nenv:\n  override:\n    MY_VAR: from_import\n```";
    let parent_file = create_temp_md_at(&dir, "parent.md", parent_content);

    let output = run_markdot(&[&parent_file]);
    assert!(output.status.success(), "markdot failed: {:?}", output);

    let content = fs::read_to_string(&target).unwrap();
    assert!(
        content.contains("val = from_import"),
        "import body env should take priority over child frontmatter. got: {content}"
    );

    cleanup(&[&parent_file, &child_file, &target]);
    let _ = fs::remove_dir(&dir);
}
