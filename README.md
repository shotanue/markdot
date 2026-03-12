# <ins>Mark</ins>down <ins>Dot</ins>file

Markdot is a tool for dotfile management with markdown.

## Installation

```sh
cargo install --path .
```

## How to use

```bash
markdot dotfile.md
markdot dotfile.md --tags darwin,kamino
markdot dotfile.md --dry-run
markdot dotfile.md#fragment
cat dotfile.md | markdot
cat dotfile.md | markdot --fragment=foo
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

### ::tag?

You can conditionally execute codeblocks based on tags passed via `--tags` flag.

````markdown
```bash ::tag?=darwin
brew install coreutils
```

```bash ::tag?=archlinux
sudo pacman -S base-devel
```
````

- No `::tag?` — always executes
- `::tag?=darwin` — executes only when `--tags` includes `darwin`
- Multiple `::tag?` on one block acts as OR: `::tag?=darwin ::tag?=archlinux` executes if either tag is provided
- Without `--tags` flag, all tagged blocks are skipped

```bash
markdot dotfile.md --tags darwin
markdot dotfile.md --tags=darwin,kamino
```

## Import (`::markdot`)

You can import other Markdown files with `yaml ::markdot` blocks. The body is YAML with an `import` path (relative to the importing file) and optional `env` to pass environment variables.

````markdown
```yaml ::markdot
import: fish.md
```

```yaml ::markdot
import: git.md
env:
  override:
    GIT_USER: shotanue
    GIT_EMAIL: shotanue@gmail.com
```
````

Tags work on import blocks too — combine `::tag?` with `::markdot` for platform-specific imports.

````markdown
```yaml ::markdot ::tag?=darwin
import: brew.md
```

```yaml ::markdot ::tag?=archlinux
import: pacman.md
```
````

## Environment variable expansion

`$VAR` and `${VAR}` are expanded in `::to` file content and paths.

````markdown
```toml ::to=$CONFIG_DIR/settings.toml
user = ${GIT_USER}
editor = $EDITOR
```
````

Priority: import `env` > frontmatter `env` > system environment variables. Undefined variables are left as-is.

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
The path in the square brackets `[]` is the **name for the symbolic link** to be created, and the path in the parentheses `()` is the **target (実体)** of the symbolic link.

[~/Library/Application\ Support/nushell](~/.config/nushell)
````

## image(copy)

You can copy files with image syntax.

````markdown
The path in the square brackets `[]` is the **destination**, and the path in the parentheses `()` is the **source**.

![~/.local/share/fonts/MyFont.ttf](./fonts/MyFont.ttf)
````

## Config

You can write config to frontmatter.

````markdown
---
env:
  append:
    # Append value to PATH. If PATH does not exist, just set the value.
    PATH: /opt/homebrew/bin:/usr/local/bin
  override:
    # Override value. Override is prior to env.append.
    DOTFILES_HOME: /home/user/dotfiles
---
````

## Full Example

A multi-platform dotfile with imports and per-machine configuration:

````markdown
# dotfile.md

```yaml ::markdot
import: fish.md
```

```yaml ::markdot
import: helix.md
```

```yaml ::markdot ::tag?=kamino
import: git.md
env:
  override:
    GIT_USER: shotanue
    GIT_EMAIL: shotanue@gmail.com
```

```yaml ::markdot ::tag?=hirukawa
import: git.md
env:
  override:
    GIT_USER: hirukawa
    GIT_EMAIL: work@example.com
```

```yaml ::markdot ::tag?=darwin
import: brew.md
```

```yaml ::markdot ::tag?=archlinux
import: pacman.md
```
````

```bash
markdot dotfile.md --tags darwin,kamino
```

## Help

```bash
markdot --help
```
