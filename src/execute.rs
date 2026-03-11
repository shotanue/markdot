use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

use crate::directive::Directive;
use crate::util::{log_error, log_info, resolve_tilde};

pub fn execute(
    directive: &Directive,
    env: &HashMap<String, String>,
) -> Result<(), Box<dyn std::error::Error>> {
    match directive {
        Directive::ShellScript { code, lang } => {
            execute_shell_script(code, lang, env)?;
        }
        Directive::Brewfile { code, args } => {
            execute_brewfile(code, args, env)?;
        }
        Directive::WriteFile {
            content,
            path,
            permission,
        } => {
            write_file(content, path, *permission)?;
        }
        Directive::Symlink { from, to } => {
            create_symlink(from, to)?;
        }
        Directive::CopyFile { from, to } => {
            copy_file(from, to)?;
        }
    }
    Ok(())
}

fn execute_shell_script(
    code: &str,
    lang: &str,
    env: &HashMap<String, String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let command: Vec<&str> = match lang {
        "nu" | "nushell" => vec!["nu", "/dev/stdin"],
        "fish" => vec!["fish", "/dev/stdin"],
        _ => vec![lang],
    };

    log_info(&format!("[command] {}", command.join(" ")));

    let mut child = Command::new(command[0])
        .args(&command[1..])
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env_clear()
        .envs(env)
        .spawn()?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(code.as_bytes())?;
    }

    let status = child.wait()?;
    if !status.success() {
        log_error(&format!("Failed executing shell script. lang: {lang}"));
        return Err("command failed".into());
    }

    Ok(())
}

fn execute_brewfile(
    code: &str,
    args: &str,
    env: &HashMap<String, String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut command = vec!["brew".to_string(), "bundle".to_string()];
    for arg in args.split(' ').filter(|s| !s.is_empty()) {
        command.push(arg.to_string());
    }
    command.push("--file=-".to_string());

    log_info(&format!("[command] {}", command.join(" ")));

    let mut child = Command::new(&command[0])
        .args(&command[1..])
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env_clear()
        .envs(env)
        .spawn()?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(code.as_bytes())?;
    }

    let status = child.wait()?;
    if !status.success() {
        log_error(&format!("Failed executing brewfile. args: {args}"));
        return Err("brew bundle failed".into());
    }

    log_info(&format!("Success executing brewfile. args: {args}"));
    Ok(())
}

fn write_file(
    content: &str,
    path: &str,
    permission: Option<u32>,
) -> Result<(), Box<dyn std::error::Error>> {
    let resolved = resolve_tilde(path);

    if let Some(parent) = Path::new(&resolved).parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(&resolved, format!("{content}\n"))?;

    if let Some(perm) = permission {
        if perm > 0o777 {
            return Err("Permission value must be between 000 and 777.".into());
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&resolved, fs::Permissions::from_mode(perm))?;
        }
    }

    log_info(&format!("Success writing. path:{path}"));
    Ok(())
}

fn create_symlink(from: &str, to: &str) -> Result<(), Box<dyn std::error::Error>> {
    let from_resolved = resolve_tilde(from);
    let to_resolved = resolve_tilde(to);

    if from_resolved == to_resolved {
        return Ok(());
    }

    if !Path::new(&from_resolved).exists() {
        return Err(format!("{from_resolved} does not exist").into());
    }

    if let Some(parent) = Path::new(&to_resolved).parent() {
        fs::create_dir_all(parent)?;
    }

    #[cfg(unix)]
    match std::os::unix::fs::symlink(&from_resolved, &to_resolved) {
        Ok(()) => {
            log_info(&format!(
                "Success creating symlink. from: {from}, to: {to}"
            ));
            Ok(())
        }
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => Ok(()),
        Err(e) => {
            log_error(&format!(
                "Failed creating symlink. from: {from}, to: {to}"
            ));
            Err(e.into())
        }
    }

    #[cfg(not(unix))]
    {
        Err("symlinks are only supported on Unix".into())
    }
}

fn copy_file(from: &str, to: &str) -> Result<(), Box<dyn std::error::Error>> {
    let from_resolved = resolve_tilde(from);
    let to_resolved = resolve_tilde(to);

    if from_resolved == to_resolved {
        return Ok(());
    }

    if !Path::new(&from_resolved).exists() {
        return Err(format!("{from_resolved} does not exist").into());
    }

    if let Some(parent) = Path::new(&to_resolved).parent() {
        fs::create_dir_all(parent)?;
    }

    fs::copy(&from_resolved, &to_resolved)?;

    log_info(&format!(
        "Success creating hard copy. from: {from}, to: {to}"
    ));
    Ok(())
}
