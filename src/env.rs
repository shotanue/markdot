use std::collections::HashMap;

pub fn merge_env(
    base: &HashMap<String, String>,
    append: &HashMap<String, String>,
    override_env: &HashMap<String, String>,
) -> HashMap<String, String> {
    let mut all_keys = std::collections::HashSet::new();
    all_keys.extend(base.keys());
    all_keys.extend(append.keys());
    all_keys.extend(override_env.keys());

    let mut result = HashMap::new();
    for key in all_keys {
        if let Some(v) = override_env.get(key) {
            result.insert(key.clone(), v.clone());
        } else if let (Some(b), Some(a)) = (base.get(key), append.get(key)) {
            result.insert(key.clone(), format!("{b}:{a}"));
        } else if let Some(b) = base.get(key) {
            result.insert(key.clone(), b.clone());
        } else if let Some(a) = append.get(key) {
            result.insert(key.clone(), a.clone());
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_override_takes_precedence() {
        let base = HashMap::from([("KEY".into(), "base".into())]);
        let append = HashMap::from([("KEY".into(), "append".into())]);
        let override_env = HashMap::from([("KEY".into(), "override".into())]);
        let result = merge_env(&base, &append, &override_env);
        assert_eq!(result.get("KEY").unwrap(), "override");
    }

    #[test]
    fn test_append_concatenates() {
        let base = HashMap::from([("PATH".into(), "/usr/bin".into())]);
        let append = HashMap::from([("PATH".into(), "/usr/local/bin".into())]);
        let override_env = HashMap::new();
        let result = merge_env(&base, &append, &override_env);
        assert_eq!(result.get("PATH").unwrap(), "/usr/bin:/usr/local/bin");
    }

    #[test]
    fn test_base_only() {
        let base = HashMap::from([("KEY".into(), "base".into())]);
        let result = merge_env(&base, &HashMap::new(), &HashMap::new());
        assert_eq!(result.get("KEY").unwrap(), "base");
    }

    #[test]
    fn test_append_only() {
        let append = HashMap::from([("KEY".into(), "append".into())]);
        let result = merge_env(&HashMap::new(), &append, &HashMap::new());
        assert_eq!(result.get("KEY").unwrap(), "append");
    }

    #[test]
    fn test_all_keys_merged() {
        let base = HashMap::from([("A".into(), "1".into())]);
        let append = HashMap::from([("B".into(), "2".into())]);
        let override_env = HashMap::from([("C".into(), "3".into())]);
        let result = merge_env(&base, &append, &override_env);
        assert_eq!(result.len(), 3);
        assert_eq!(result.get("A").unwrap(), "1");
        assert_eq!(result.get("B").unwrap(), "2");
        assert_eq!(result.get("C").unwrap(), "3");
    }
}
