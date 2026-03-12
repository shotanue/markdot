use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Default, Debug)]
pub struct Config {
    #[serde(default)]
    pub env: EnvConfig,
}

#[derive(Deserialize, Default, Debug)]
pub struct EnvConfig {
    #[serde(default)]
    pub append: HashMap<String, String>,
    #[serde(default, rename = "override")]
    pub r#override: HashMap<String, String>,
}

#[derive(Deserialize, Default, Debug)]
pub struct MarkdotBlock {
    #[serde(default)]
    pub import: Option<String>,
    #[serde(default)]
    pub env: EnvConfig,
}

pub fn extract_frontmatter(text: &str) -> Result<(Config, String), Box<dyn std::error::Error>> {
    let lines: Vec<&str> = text.lines().collect();

    if lines.is_empty() || lines[0].trim() != "---" {
        return Ok((Config::default(), text.to_string()));
    }

    for (i, line) in lines.iter().enumerate().skip(1) {
        if line.trim() == "---" {
            let yaml_content = lines[1..i].join("\n");
            let config: Config = if yaml_content.trim().is_empty() {
                Config::default()
            } else {
                serde_yml::from_str(&yaml_content)?
            };
            let remaining = lines[i + 1..].join("\n");
            return Ok((config, remaining));
        }
    }

    Ok((Config::default(), text.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_frontmatter() {
        let text = "# Hello\nworld";
        let (config, cleaned) = extract_frontmatter(text).unwrap();
        assert!(config.env.append.is_empty());
        assert!(config.env.r#override.is_empty());
        assert_eq!(cleaned, text);
    }

    #[test]
    fn test_empty_frontmatter() {
        let text = "---\n---\n# Hello";
        let (config, cleaned) = extract_frontmatter(text).unwrap();
        assert!(config.env.append.is_empty());
        assert_eq!(cleaned, "# Hello");
    }

    #[test]
    fn test_frontmatter_with_env() {
        let text = "---\nenv:\n  append:\n    PATH: /usr/local/bin\n  override:\n    HOME: /tmp\n---\n# Hello";
        let (config, cleaned) = extract_frontmatter(text).unwrap();
        assert_eq!(config.env.append.get("PATH").unwrap(), "/usr/local/bin");
        assert_eq!(config.env.r#override.get("HOME").unwrap(), "/tmp");
        assert_eq!(cleaned, "# Hello");
    }
}
