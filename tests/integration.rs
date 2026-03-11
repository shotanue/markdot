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
    assert!(stdout.contains("markdot"), "should print version");
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
