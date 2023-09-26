# about

MarkDot is a dotfile tool. 

You can write dotfile with Markdown file.

MarkDot evaluates some Markdown literals like codeblocks and hyperlinks. Other literals are ignored.

Finding markdown example, not doc? Run this command.

```sh
markdot example
```

## Codeblock execution

Codeblock with language tags will be executed.

Here is a sample codeblock to install Homebrew.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Supported language tags:

- `bash`
- `sh`
- `brewfile`

## Tags

You can tag codeblocks with `::` prefixed keywords.

Example: Install some brew packages by `brew bundle` command with `--verbose --no-lock` options.

```brewfile args="--verbose --no-lock"
brew "git"
```

Supported tags:

- `::args`
- `::ignore`
- `::to`

## Hyperlink

MarkDot regards hyperlink as symlink or hardcopy.

Create symlink `~/.config/git/config`, refers to `./packages/git/config`.

[~/.config/git/config](packages/git/config?type=symlink)

Copying not symlink:

[~/.config/git/config](packages/git/config?type=copy)

You can omit `type=symlink`. MarkDot creates symlink in default. 

[~/.config/git/config](packages/git/config)

### Preferences

```markdown
---
hyperlink:
   type: symlink # Default: symlink; Acceptable: symlink|copy;
---
```

## Enbedding/Import

You can embed other markdown dotfile.

![install-editors](./editors.md)

Embedding supports fragment.

![install-helix](./editors.md#install-helix)

## Supported Markdown syntax

MarkDot uses remark to parse Markdown files.

Included plugins:

- GFM
- breaks
- frontmatter

