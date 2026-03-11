pub fn resolve_tilde(path: &str) -> String {
    if let Some(rest) = path.strip_prefix('~') {
        if let Ok(home) = std::env::var("HOME") {
            return format!("{home}{rest}");
        }
    }
    path.to_string()
}

pub fn log_info(msg: &str) {
    eprintln!("[markdot] {msg}");
}

pub fn log_error(msg: &str) {
    eprintln!("[markdot] {msg}");
}

pub fn log_success(msg: &str) {
    eprintln!("\x1b[32m[markdot] {msg}\x1b[0m");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_tilde_with_home() {
        let home = std::env::var("HOME").unwrap();
        assert_eq!(resolve_tilde("~/foo/bar"), format!("{home}/foo/bar"));
    }

    #[test]
    fn test_resolve_tilde_without_tilde() {
        assert_eq!(resolve_tilde("/absolute/path"), "/absolute/path");
    }

    #[test]
    fn test_resolve_tilde_just_tilde() {
        let home = std::env::var("HOME").unwrap();
        assert_eq!(resolve_tilde("~"), home);
    }
}
