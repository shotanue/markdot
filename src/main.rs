mod cli;
mod directive;
mod env;
mod execute;
mod frontmatter;
mod markdown;
mod meta;
mod util;

use std::collections::HashMap;
use std::path::Path;

fn main() {
    if let Err(e) = run() {
        eprintln!("{e}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let input = cli::parse_args()?;

    match input {
        cli::Input::Help => {
            print_help();
            std::process::exit(2);
        }
        cli::Input::Version => {
            println!("{}", env!("CARGO_PKG_VERSION"));
            std::process::exit(0);
        }
        cli::Input::File {
            path,
            fragments,
            tags,
            dry_run,
        } => {
            let text = std::fs::read_to_string(&path)
                .map_err(|e| format!("failed to read {path}: {e}"))?;
            let base_env: HashMap<String, String> = std::env::vars().collect();
            process_file(&text, &fragments, &tags, &base_env, None, &path, dry_run)?;
        }
        cli::Input::Stdin {
            text,
            fragments,
            tags,
            dry_run,
        } => {
            let base_env: HashMap<String, String> = std::env::vars().collect();
            process_file(&text, &fragments, &tags, &base_env, None, "<stdin>", dry_run)?;
        }
    }

    Ok(())
}

fn process_file(
    text: &str,
    fragments: &[String],
    tags: &[String],
    parent_env: &HashMap<String, String>,
    import_overrides: Option<&frontmatter::EnvConfig>,
    file_path: &str,
    dry_run: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let (config, cleaned) = frontmatter::extract_frontmatter(text)?;

    // Priority: import body env > frontmatter env > parent env (system env)
    // 1. Apply frontmatter on top of parent env
    let after_frontmatter = env::merge_env(parent_env, &config.env.append, &config.env.r#override);
    // 2. Apply import overrides on top (highest priority)
    let merged_env = if let Some(overrides) = import_overrides {
        env::merge_env(&after_frontmatter, &overrides.append, &overrides.r#override)
    } else {
        after_frontmatter
    };

    let directives = markdown::parse_markdown(&cleaned, fragments, tags)?;

    if directives.is_empty() {
        util::log_info(&format!("no tasks in {file_path}"));
        return Ok(());
    }

    for directive in &directives {
        match directive {
            directive::Directive::Import { body } => {
                let block: frontmatter::MarkdotBlock = if body.trim().is_empty() {
                    frontmatter::MarkdotBlock::default()
                } else {
                    serde_yml::from_str(body)
                        .map_err(|e| format!("failed to parse markdot block in {file_path}: {e}"))?
                };

                let import_path = block.import.ok_or_else(|| {
                    format!("markdot block missing 'import' field in {file_path}")
                })?;

                let base_dir = Path::new(file_path)
                    .parent()
                    .unwrap_or(Path::new("."));
                let resolved = base_dir.join(&import_path);

                let import_text = std::fs::read_to_string(&resolved).map_err(|e| {
                    format!("failed to import {}: {e}", resolved.display())
                })?;

                util::log_info(&format!("importing {}", resolved.display()));
                process_file(
                    &import_text,
                    &[],  // fragments don't propagate to imports
                    tags,
                    &merged_env,
                    Some(&block.env),
                    &resolved.to_string_lossy(),
                    dry_run,
                )?;
            }
            other => {
                execute::execute(other, &merged_env, dry_run)?;
            }
        }
    }

    util::log_success(&format!("done {file_path}"));
    Ok(())
}

fn print_help() {
    println!(
        "\x1b[1m# MarkDot\x1b[0m

        \x1b[31mMark\x1b[0mdown \x1b[31mDot\x1b[0mfile.

\x1b[1m## USAGE\x1b[0m

    $ \x1b[1mmarkdot\x1b[0m \x1b[4mpath\x1b[0m
    $ \x1b[1mmarkdot\x1b[0m \x1b[4mpath#fragment\x1b[0m
    $ \x1b[1mmarkdot\x1b[0m \x1b[4mpath\x1b[0m --tags darwin,kamino
    $ cat dotfile.md | \x1b[1mmarkdot\x1b[0m
    $ cat dotfile.md | \x1b[1mmarkdot --fragment=foo\x1b[0m

\x1b[1m## OPTIONS\x1b[0m
    --help, -h                  Shows this help message
    --fragment \x1b[4mfragment\x1b[0m         Filter task to run with fragment
    --tags \x1b[4mtag1,tag2\x1b[0m           Filter blocks by tags (comma-separated)
    --dry-run, -n               Preview actions without executing
    --version, -v               Shows version"
    );
}
