use std::collections::HashMap;

#[derive(Debug, PartialEq)]
enum TokenType {
    Tag,
    Quoted,
    SingleQuoted,
    Space,
}

#[derive(Debug)]
struct Token {
    kind: TokenType,
    value: String,
}

fn parse_token(input: &str) -> (Token, &str) {
    // Tag: starts with ::, followed by chars that are not space, ", ', `
    if let Some(rest) = input.strip_prefix("::") {
        let end = rest
            .find([' ', '"', '\'', '`'])
            .map(|i| i + 2)
            .unwrap_or(input.len());
        return (
            Token {
                kind: TokenType::Tag,
                value: input[..end].to_string(),
            },
            &input[end..],
        );
    }

    // Quoted: "..."
    if let Some(rest) = input.strip_prefix('"') {
        if let Some(end) = rest.find('"') {
            let end = end + 2;
            return (
                Token {
                    kind: TokenType::Quoted,
                    value: input[..end].to_string(),
                },
                &input[end..],
            );
        }
    }

    // Single quoted: '...'
    if let Some(rest) = input.strip_prefix('\'') {
        if let Some(end) = rest.find('\'') {
            let end = end + 2;
            return (
                Token {
                    kind: TokenType::SingleQuoted,
                    value: input[..end].to_string(),
                },
                &input[end..],
            );
        }
    }

    // Whitespace
    let ws_len = input.len() - input.trim_start().len();
    if ws_len > 0 {
        return (
            Token {
                kind: TokenType::Space,
                value: input[..ws_len].to_string(),
            },
            &input[ws_len..],
        );
    }

    // Unknown: skip one character, treat as space
    (
        Token {
            kind: TokenType::Space,
            value: input[..1].to_string(),
        },
        &input[1..],
    )
}

fn tokenize(input: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut rest = input;

    while !rest.is_empty() {
        let (token, remaining) = parse_token(rest);
        tokens.push(token);
        rest = remaining;
    }

    tokens
}

pub fn meta_parse(input: &str) -> HashMap<String, String> {
    let tokens = tokenize(input);
    let mut result = HashMap::new();
    let mut buffer = String::new();

    for token in &tokens {
        match token.kind {
            TokenType::Tag => {
                buffer.push_str(&token.value);
            }
            TokenType::Quoted | TokenType::SingleQuoted => {
                let stripped = &token.value[1..token.value.len() - 1];
                buffer.push_str(stripped);
            }
            TokenType::Space => {
                if !buffer.is_empty() {
                    push_result(&mut result, &buffer);
                    buffer.clear();
                }
            }
        }
    }

    if !buffer.is_empty() {
        push_result(&mut result, &buffer);
    }

    result
}

fn push_result(result: &mut HashMap<String, String>, val: &str) {
    if let Some((head, tail)) = val.split_once('=') {
        result.insert(head.to_string(), tail.to_string());
    } else {
        result.insert(val.to_string(), String::new());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_tag() {
        let result = meta_parse("::ignore");
        assert_eq!(result.get("::ignore").unwrap(), "");
    }

    #[test]
    fn test_tag_with_value() {
        let result = meta_parse("::foo=bar");
        assert_eq!(result.get("::foo").unwrap(), "bar");
    }

    #[test]
    fn test_tag_with_quoted_value() {
        let result = meta_parse("::foo=\"bar buzz\"");
        assert_eq!(result.get("::foo").unwrap(), "bar buzz");
    }

    #[test]
    fn test_tag_with_single_quoted_value() {
        let result = meta_parse("::foo='bar buzz'");
        assert_eq!(result.get("::foo").unwrap(), "bar buzz");
    }

    #[test]
    fn test_multiple_tags() {
        let result = meta_parse("::to=/tmp/test ::permission=755");
        assert_eq!(result.get("::to").unwrap(), "/tmp/test");
        assert_eq!(result.get("::permission").unwrap(), "755");
    }

    #[test]
    fn test_skip_non_tag_tokens() {
        let result = meta_parse("--invalid ::valid");
        assert!(result.get("--invalid").is_none());
        assert_eq!(result.get("::valid").unwrap(), "");
    }

    #[test]
    fn test_empty_input() {
        let result = meta_parse("");
        assert!(result.is_empty());
    }

    #[test]
    fn test_to_with_path() {
        let result = meta_parse("::to=/path/to/file");
        assert_eq!(result.get("::to").unwrap(), "/path/to/file");
    }

    #[test]
    fn test_args_with_quoted_value() {
        let result = meta_parse("::args=\"--verbose --no-lock\"");
        assert_eq!(result.get("::args").unwrap(), "--verbose --no-lock");
    }
}
