# <ins>Mark</ins>down <ins>Dot</ins>file

Markdot is a tool for dotfile management with markdown.

## Installation

```sh
brew install shotanue/tap/markdot
```

## How to use

```bash
markdot dotfile.md
```

- dotfile.md

````markdown
# sample

Markdot evaluates codeblocks in sequence.

This codeblock is evaluated as shell script.
```sh
echo "hello world"
```

## install brew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## install tools

For a brewfile code block, Markdot runs `brew bundle` and passes this content to the command.
In this sample, `git` and `mise` is installed by homebrew.
```brewfile
brew "git"
brew "mise"
```

## install editors

You can split brewfile definitions.
```brewfile
brew "helix"
brew "vim"
brew "emacs"
```

## configs

Write mise config to given path, specifying the path with `::to` tag.
```toml ::to=~/.config/mise/settings.toml
experimental = true  
```

````

## Codeblock execution

Codeblock with some of language tags will be executed.

Supported languages are below.

````markdown

```sh
echo foo
```

```bash
echo foo
```

```zsh
echo foo
```

```fish
echo foo
```

```nushell
echo foo
```

```nu
echo foo
```

````


### brewfile

You can install brew packages with `Brewfile` syntax.

[`homebrew-bundle`](https://github.com/Homebrew/homebrew-bundle)

````markdown
Installing brew, cask and mas packages.
```brewfile
brew "git"

cask "figma"

mas 'Tailscale', id: 1475387142 
```

You can give argument `brew bundle` command.

```brewfile ::args="--verbose --no-lock"
brew "git"
```

````

## Tags

You can write codeblocks with single tag.

Every tag requires `::` prefix.


### ::ignore

This codeblock is ignored at runtime, which is useful in some usecases like notes.

````markdown

## How to setup

```bash ::ignore
make install
```
````

### ::to

Markdot copies the codeblock content to given path, **without codeblock execution**.

When you want write some config files, this tag is useful.

````markdown
Copying this toml to the path.
```toml ::to=~/.config/foo/config.toml
experimental = true
```
````

In this example, Markdot simply copies this script to the given path, without executing the bash script.

````markdown
Skip running, and copying this script to the path.
```bash ::to=~/.local/bin/foo
echo foo
```
````


#### permission (optional)

You can set permission to the file with `::permission` tag.

````markdown
```bash ::to=~/.local/bin/foo ::permission=755
echo foo
```
````


### ::args

You can give arguments to command codeblock runs.

````markdown
Giving options `--verbose --no-lock` to `brew bundle`.
```brewfile ::args="--verbose --no-lock"
brew "git"
```
````

## fragment

You can filter which code blocks to run. Markdot accepts fragments similar to URLs.

```bash
markdot dotfile.md#bar
```

- dotfile.md

````markdown
Fragment: `bar` is applied to this outline:
- # sample
  - ## foo
    - ### bar <-- evaluated
      - #### buzz <-- evaluated
  - ## hoge

# sample

## foo

```bash
echo "ignored"
```

### bar

```bash
echo "evaluated: bar"
```
#### buzz

```bash
echo "evaluated: buzz"
```

## hoge

```bash
echo "ignored"
```
````

## hyperlink(symlink)

You can create symlink with hyperlink syntax.

````markdown
This example creates symlink to `~/.config/nushell` from `~/Library/Application Support/nushell`.

[~/Library/Application\ Support/nushell](~/.config/nushell)
````

## preprocessor

Markdot includes mustache.js as text preprocessor, so you can rewrite dotfile just before evaluation. 
This is useful when setting os specific configurations. 

Given parameters are below.

- arch
- platform
- hostname
- username
- ignore

Example: Install only MacOS and username is foo.

````markdown
{{#platform.darwin}}
{{#username.foo}}
### Darwin
```brewfile
cask "figma"

mas 'Tailscale', id: 1475387142 
mas 'Kindle', id: 302584613
```
{{/username.foo}}
{{/platform.darwin}}
````

Example: Ignore
````markdown
{{#ignore}}
```bash
echo "this codeblock is ignored."
```
{{/ignore}}

```bash
echo "this codeblock is evaluated."
```
````

## Config

You can write config to frontmatter. YAML and TOML are supported.

````markdown
+++
[env.append]
# Append value to PATH. If PATH is not exist, just set the value.
PATH=":/opt/homebrew/bin:/usr/local/bin:/home/linuxbrew/.linuxbrew/bin"
[env.override]
# Override value. Override is prior to env.append.
DOTFILES_HOME="$HOME/ghq/github.com/shotanue/dotfiles"
+++
````


## Help

```bash
markdot --help
```

## Development

### Requirements

- [bun.sh](https://bun.sh/) - Fast JavaScript runtime and package manager


