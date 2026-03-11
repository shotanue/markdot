mod cli;
mod directive;
mod env;
mod execute;
mod frontmatter;
mod markdown;
mod meta;
mod util;

use std::collections::HashMap;

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
        cli::Input::File { path, fragments } => {
            let text = std::fs::read_to_string(&path)
                .map_err(|e| format!("failed to read {path}: {e}"))?;
            process(text, fragments)?;
        }
        cli::Input::Stdin { text, fragments } => {
            process(text, fragments)?;
        }
    }

    Ok(())
}

fn process(text: String, fragments: Vec<String>) -> Result<(), Box<dyn std::error::Error>> {
    let (config, cleaned) = frontmatter::extract_frontmatter(&text)?;

    let base_env: HashMap<String, String> = std::env::vars().collect();
    let merged_env = env::merge_env(&base_env, &config.env.append, &config.env.r#override);

    let directives = markdown::parse_markdown(&cleaned, &fragments)?;

    if directives.is_empty() {
        util::log_info("no tasks");
        return Ok(());
    }

    for directive in &directives {
        execute::execute(directive, &merged_env)?;
    }

    util::log_success("done");
    Ok(())
}

fn print_help() {
    println!(
        "\x1b[1m# MarkDot\x1b[0m

        \x1b[31mMark\x1b[0mdown \x1b[31mDot\x1b[0mfile.

\x1b[1m## USAGE\x1b[0m

    $ \x1b[1mmarkdot\x1b[0m \x1b[4mpath\x1b[0m
    $ \x1b[1mmarkdot\x1b[0m \x1b[4mpath#fragment\x1b[0m
    $ cat dotfile.md | \x1b[1mmarkdot\x1b[0m
    $ cat dotfile.md | \x1b[1mmarkdot --fragment=foo\x1b[0m

\x1b[1m## OPTIONS\x1b[0m
    --help, -h                  Shows this help message
    --fragment \x1b[4mfragment\x1b[0m         Filter task to run with fragment
    --version, -v               Shows version"
    );
}
