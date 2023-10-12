# dotfile

This is the sample markdown file. Markdot ignores this text.

## setup-homebrew

Codeblock execution: Codeblock with language tags will be executed.

Supported language tags:

- `bash`
- `sh`
- `brewfile`

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## clone-repository

Markdot supports brewfile.

```brewfile
brew "git"
brew "ghq"
```

Clone repo with ghq

```bash
ghq get https://github.com/shotanue/markdot
```

## setup-git

```brewfile --copy
brew "git"
```

### setup-git-configs

Copy the code block content to `~/.config/git/config` with label `to:`.

```gitconfig ::to=~/.config/git/config 
[init]
defaultBranch = main

# config for github repositories
[includeIf "gitdir:~/ghq/github.com/"]
path = ~/.config/git/override.github.gitconfig
```

