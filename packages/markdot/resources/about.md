# about

MarkDot is a dotfile tool. 

You can write dotfile with Markdown file.

MarkDot evaluates some Markdown literals, codeblock. Other literals are ignored.

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

## Supported Markdown syntax

MarkDot uses remark to parse Markdown files.

Included plugins:

- GFM
- breaks
- frontmatter

