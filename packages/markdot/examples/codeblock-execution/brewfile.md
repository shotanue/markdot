# brewfile

For a brewfile code block, Markdot runs `brew bundle` and passes this content to the command.

Internally, Markdot runs `brew bundle --file=-` and gives codeblock content with stdin.

## basic usage

In this sample, `git` and `mise` is installed by homebrew.

```brewfile
brew "git"
brew "mise"
```

## giving arguments

You can pass argument to `brew bundle` command.

In this situation, Markdot runs `brew bundle --verbose --no-lock --file=-`.

```brewfile ::args="--verbose --no-lock"
brew "git"
```

