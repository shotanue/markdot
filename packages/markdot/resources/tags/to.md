# ::to path

Write codeblock content to given path.

## EXAMPLES

### Write code block content to `~/.config/git/config` with label `to:`.

```gitconfig ::to~/.config/git/config 
[init]
defaultBranch = main

# config for github repositories
[includeIf "gitdir:~/ghq/github.com/"]
path = ~/.config/git/override.github.gitconfig
```
