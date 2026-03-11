use std::collections::HashMap;

use crate::directive::{Directive, Fragment};
use crate::meta;

struct RawTask {
    kind: RawTaskKind,
    fragments: Vec<Fragment>,
}

enum RawTaskKind {
    CodeBlock {
        lang: String,
        meta: HashMap<String, String>,
        code: String,
    },
    Link {
        text: String,
        url: String,
    },
    Image {
        alt: String,
        url: String,
    },
}

const SHELL_LANGS: &[&str] = &["sh", "bash", "zsh", "fish", "nushell", "nu"];

pub fn parse_markdown(
    text: &str,
    fragments: &[String],
) -> Result<Vec<Directive>, Box<dyn std::error::Error>> {
    if text.trim().is_empty() {
        return Ok(vec![]);
    }

    let raw_tasks = parse_raw(text)?;

    let filtered: Vec<RawTask> = if fragments.is_empty() {
        raw_tasks
    } else {
        raw_tasks
            .into_iter()
            .filter(|t| t.fragments.iter().any(|f| fragments.contains(&f.text)))
            .collect()
    };

    let mut directives = Vec::new();
    for task in &filtered {
        if let Some(d) = classify_task(task)? {
            directives.push(d);
        }
    }

    Ok(directives)
}

fn parse_raw(text: &str) -> Result<Vec<RawTask>, Box<dyn std::error::Error>> {
    let mut tasks = Vec::new();
    let mut fragment_buffer: Vec<Fragment> = Vec::new();

    let mut in_code_block = false;
    let mut fence_length: usize = 0;
    let mut code_lines: Vec<&str> = Vec::new();
    let mut code_lang = String::new();
    let mut code_meta = HashMap::new();

    for line in text.lines() {
        let trimmed = line.trim();

        if in_code_block {
            let backticks = count_leading_backticks(trimmed);
            if backticks >= fence_length && trimmed[backticks..].trim().is_empty() {
                // End of code block
                let code = code_lines.join("\n");
                tasks.push(RawTask {
                    kind: RawTaskKind::CodeBlock {
                        lang: code_lang.clone(),
                        meta: code_meta.clone(),
                        code,
                    },
                    fragments: fragment_buffer.clone(),
                });
                in_code_block = false;
                code_lines.clear();
            } else {
                code_lines.push(line);
            }
            continue;
        }

        // Check for heading
        if trimmed.starts_with('#') {
            if let Some((depth, heading_text)) = parse_heading(trimmed) {
                let fragment = Fragment {
                    depth,
                    text: heading_text,
                };

                if fragment_buffer.is_empty() {
                    fragment_buffer.push(fragment);
                } else if fragment_buffer.last().unwrap().depth == depth {
                    fragment_buffer.pop();
                    fragment_buffer.push(fragment);
                } else if fragment_buffer.last().unwrap().depth > depth {
                    fragment_buffer.pop();
                    fragment_buffer.pop();
                    fragment_buffer.push(fragment);
                } else {
                    fragment_buffer.push(fragment);
                }
                continue;
            }
        }

        // Check for code fence opening
        let backticks = count_leading_backticks(trimmed);
        if backticks >= 3 {
            fence_length = backticks;
            let info_string = trimmed[backticks..].trim();
            let (lang, meta_str) = split_info_string(info_string);
            code_lang = lang.to_lowercase();
            code_meta = meta::meta_parse(meta_str);
            in_code_block = true;
            code_lines.clear();
            continue;
        }

        // Check for images (must be before links since ![...] starts with [)
        for (alt, url) in extract_images(trimmed) {
            if alt.is_empty() || url.is_empty() {
                return Err("image alt and url must not be empty".into());
            }
            tasks.push(RawTask {
                kind: RawTaskKind::Image { alt, url },
                fragments: fragment_buffer.clone(),
            });
        }

        // Check for links
        for (link_text, url) in extract_links(trimmed) {
            if url != link_text {
                tasks.push(RawTask {
                    kind: RawTaskKind::Link {
                        text: link_text,
                        url,
                    },
                    fragments: fragment_buffer.clone(),
                });
            }
        }
    }

    Ok(tasks)
}

fn classify_task(task: &RawTask) -> Result<Option<Directive>, Box<dyn std::error::Error>> {
    match &task.kind {
        RawTaskKind::CodeBlock { lang, meta, code } => {
            if meta.contains_key("::ignore") {
                return Ok(None);
            }

            if let Some(to) = meta.get("::to") {
                if to.is_empty() {
                    return Err("::to must not be empty".into());
                }
                let permission = meta
                    .get("::permission")
                    .map(|v| u32::from_str_radix(v, 8))
                    .transpose()
                    .map_err(|e| format!("invalid permission value: {e}"))?;
                return Ok(Some(Directive::WriteFile {
                    content: code.clone(),
                    path: to.clone(),
                    permission,
                }));
            }

            if SHELL_LANGS.contains(&lang.as_str()) {
                return Ok(Some(Directive::ShellScript {
                    code: code.clone(),
                    lang: lang.clone(),
                }));
            }

            if lang == "brewfile" {
                let args = meta.get("::args").cloned().unwrap_or_default();
                return Ok(Some(Directive::Brewfile {
                    code: code.clone(),
                    args,
                }));
            }

            Ok(None)
        }
        RawTaskKind::Link { text, url } => Ok(Some(Directive::Symlink {
            from: url.clone(),
            to: text.clone(),
        })),
        RawTaskKind::Image { alt, url } => Ok(Some(Directive::CopyFile {
            from: url.clone(),
            to: alt.clone(),
        })),
    }
}

fn count_leading_backticks(s: &str) -> usize {
    s.bytes().take_while(|&b| b == b'`').count()
}

fn parse_heading(line: &str) -> Option<(u8, String)> {
    let depth = line.bytes().take_while(|&b| b == b'#').count();
    if depth == 0 || depth > 6 {
        return None;
    }
    let rest = &line[depth..];
    if !rest.starts_with(' ') {
        return None;
    }
    Some((depth as u8, rest.trim().to_string()))
}

fn split_info_string(info: &str) -> (&str, &str) {
    if info.is_empty() {
        return ("", "");
    }
    match info.find(char::is_whitespace) {
        Some(idx) => (&info[..idx], info[idx..].trim()),
        None => (info, ""),
    }
}

fn extract_images(line: &str) -> Vec<(String, String)> {
    let mut images = Vec::new();
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        if chars[i] == '!' && i + 1 < chars.len() && chars[i + 1] == '[' {
            if let Some((alt, url, end)) = parse_bracket_paren(&chars, i + 1) {
                images.push((alt, url));
                i = end;
                continue;
            }
        }
        i += 1;
    }

    images
}

fn extract_links(line: &str) -> Vec<(String, String)> {
    let mut links = Vec::new();
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        // Skip images (![...)
        if chars[i] == '!' && i + 1 < chars.len() && chars[i + 1] == '[' {
            if let Some((_, _, end)) = parse_bracket_paren(&chars, i + 1) {
                i = end;
                continue;
            }
        }
        if chars[i] == '[' {
            if let Some((text, url, end)) = parse_bracket_paren(&chars, i) {
                links.push((text, url));
                i = end;
                continue;
            }
        }
        i += 1;
    }

    links
}

fn parse_bracket_paren(chars: &[char], start: usize) -> Option<(String, String, usize)> {
    if start >= chars.len() || chars[start] != '[' {
        return None;
    }

    // Find matching ]
    let mut depth = 0;
    let mut close_bracket = None;
    for (j, &ch) in chars.iter().enumerate().skip(start) {
        if ch == '[' {
            depth += 1;
        }
        if ch == ']' {
            depth -= 1;
        }
        if depth == 0 {
            close_bracket = Some(j);
            break;
        }
    }
    let close_bracket = close_bracket?;

    // Check for ( immediately after ]
    if close_bracket + 1 >= chars.len() || chars[close_bracket + 1] != '(' {
        return None;
    }

    // Find matching )
    let paren_start = close_bracket + 2;
    let mut paren_depth = 1;
    let mut close_paren = None;
    for (j, &ch) in chars.iter().enumerate().skip(paren_start) {
        if ch == '(' {
            paren_depth += 1;
        }
        if ch == ')' {
            paren_depth -= 1;
        }
        if paren_depth == 0 {
            close_paren = Some(j);
            break;
        }
    }
    let close_paren = close_paren?;

    let text: String = chars[start + 1..close_bracket].iter().collect();
    let url: String = chars[paren_start..close_paren].iter().collect();

    Some((text, url, close_paren + 1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_markdown() {
        let result = parse_markdown("", &[]).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_whitespace_only() {
        let result = parse_markdown("   \n  \n  ", &[]).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_shell_script() {
        let md = "```bash\necho hello\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::ShellScript { code, lang } => {
                assert_eq!(code, "echo hello");
                assert_eq!(lang, "bash");
            }
            _ => panic!("expected ShellScript"),
        }
    }

    #[test]
    fn test_ignore_directive() {
        let md = "```bash ::ignore\necho hello\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_to_directive() {
        let md = "```bash ::to=/tmp/test\necho hello\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::WriteFile {
                content,
                path,
                permission,
            } => {
                assert_eq!(content, "echo hello");
                assert_eq!(path, "/tmp/test");
                assert!(permission.is_none());
            }
            _ => panic!("expected WriteFile"),
        }
    }

    #[test]
    fn test_to_with_permission() {
        let md = "```sh ::to=/tmp/test ::permission=755\necho hello\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::WriteFile {
                content,
                path,
                permission,
            } => {
                assert_eq!(content, "echo hello");
                assert_eq!(path, "/tmp/test");
                assert_eq!(*permission, Some(0o755));
            }
            _ => panic!("expected WriteFile"),
        }
    }

    #[test]
    fn test_to_suppresses_shell_execution() {
        let md = "```bash ::to=/tmp/test\ntouch /tmp/should-not-exist\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        assert!(matches!(&result[0], Directive::WriteFile { .. }));
    }

    #[test]
    fn test_brewfile() {
        let md = "```brewfile\nbrew \"git\"\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::Brewfile { code, args } => {
                assert_eq!(code, "brew \"git\"");
                assert!(args.is_empty());
            }
            _ => panic!("expected Brewfile"),
        }
    }

    #[test]
    fn test_brewfile_with_args() {
        let md = "```brewfile ::args=\"--verbose --no-lock\"\nbrew \"git\"\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::Brewfile { args, .. } => {
                assert_eq!(args, "--verbose --no-lock");
            }
            _ => panic!("expected Brewfile"),
        }
    }

    #[test]
    fn test_symlink() {
        let md = "[~/target](~/source)";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::Symlink { from, to } => {
                assert_eq!(from, "~/source");
                assert_eq!(to, "~/target");
            }
            _ => panic!("expected Symlink"),
        }
    }

    #[test]
    fn test_autolink_skipped() {
        let md = "[https://example.com](https://example.com)";
        let result = parse_markdown(md, &[]).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_image_copy() {
        let md = "![~/target](~/source)";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::CopyFile { from, to } => {
                assert_eq!(from, "~/source");
                assert_eq!(to, "~/target");
            }
            _ => panic!("expected CopyFile"),
        }
    }

    #[test]
    fn test_fragment_filtering() {
        let md = "# Section A\n```bash\necho a\n```\n# Section B\n```bash\necho b\n```";
        let result = parse_markdown(md, &["Section A".to_string()]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::ShellScript { code, .. } => {
                assert_eq!(code, "echo a");
            }
            _ => panic!("expected ShellScript"),
        }
    }

    #[test]
    fn test_no_fragment_returns_all() {
        let md = "# Section A\n```bash\necho a\n```\n# Section B\n```bash\necho b\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_unknown_lang_skipped() {
        let md = "```python\nprint('hello')\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_unknown_lang_with_to() {
        let md = "```python ::to=/tmp/test.py\nprint('hello')\n```";
        let result = parse_markdown(md, &[]).unwrap();
        assert_eq!(result.len(), 1);
        assert!(matches!(&result[0], Directive::WriteFile { .. }));
    }

    #[test]
    fn test_multiple_shell_langs() {
        for lang in &["sh", "bash", "zsh", "fish", "nu", "nushell"] {
            let md = format!("```{lang}\necho hello\n```");
            let result = parse_markdown(&md, &[]).unwrap();
            assert_eq!(result.len(), 1, "failed for lang: {lang}");
            assert!(
                matches!(&result[0], Directive::ShellScript { .. }),
                "expected ShellScript for lang: {lang}"
            );
        }
    }

    #[test]
    fn test_heading_parsing() {
        assert_eq!(parse_heading("# Hello"), Some((1, "Hello".to_string())));
        assert_eq!(
            parse_heading("## World"),
            Some((2, "World".to_string()))
        );
        assert_eq!(parse_heading("###No space"), None);
        assert_eq!(parse_heading("not a heading"), None);
    }

    #[test]
    fn test_split_info_string() {
        assert_eq!(split_info_string("bash"), ("bash", ""));
        assert_eq!(
            split_info_string("bash ::to=/tmp"),
            ("bash", "::to=/tmp")
        );
        assert_eq!(split_info_string(""), ("", ""));
    }

    #[test]
    fn test_nested_headings_fragment_buffer() {
        let md = "\
# A
## B
```bash
echo ab
```
# C
```bash
echo c
```";
        let result = parse_markdown(md, &["B".to_string()]).unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            Directive::ShellScript { code, .. } => assert_eq!(code, "echo ab"),
            _ => panic!("expected ShellScript"),
        }
    }
}
