use std::io::IsTerminal;

#[derive(Debug)]
pub enum Input {
    File { path: String, fragments: Vec<String>, tags: Vec<String>, dry_run: bool },
    Stdin { text: String, fragments: Vec<String>, tags: Vec<String>, dry_run: bool },
    Help,
    Version,
}

pub fn parse_args() -> Result<Input, Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().skip(1).collect();

    let mut fragments = Vec::new();
    let mut tags = Vec::new();
    let mut file_path = None;
    let mut dry_run = false;
    let mut i = 0;

    while i < args.len() {
        match args[i].as_str() {
            "--help" | "-h" => return Ok(Input::Help),
            "--version" | "-v" => return Ok(Input::Version),
            "--dry-run" | "-n" => {
                dry_run = true;
            }
            "--fragment" => {
                i += 1;
                if i < args.len() {
                    fragments.push(args[i].clone());
                }
            }
            arg if arg.starts_with("--fragment=") => {
                if let Some(val) = arg.strip_prefix("--fragment=") {
                    fragments.push(val.to_string());
                }
            }
            "--tags" => {
                i += 1;
                if i < args.len() {
                    for t in args[i].split(',') {
                        let t = t.trim();
                        if !t.is_empty() {
                            tags.push(t.to_string());
                        }
                    }
                }
            }
            arg if arg.starts_with("--tags=") => {
                if let Some(val) = arg.strip_prefix("--tags=") {
                    for t in val.split(',') {
                        let t = t.trim();
                        if !t.is_empty() {
                            tags.push(t.to_string());
                        }
                    }
                }
            }
            arg if !arg.starts_with('-') => {
                file_path = Some(arg.to_string());
            }
            _ => {}
        }
        i += 1;
    }

    if let Some(path) = file_path {
        if let Some((p, f)) = path.split_once('#') {
            fragments.push(f.to_string());
            return Ok(Input::File {
                path: p.to_string(),
                fragments,
                tags,
                dry_run,
            });
        }
        return Ok(Input::File { path, fragments, tags, dry_run });
    }

    if !std::io::stdin().is_terminal() {
        let text = std::io::read_to_string(std::io::stdin())?;
        return Ok(Input::Stdin { text, fragments, tags, dry_run });
    }

    Ok(Input::Help)
}
