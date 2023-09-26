# brewfile

Brewfile support.

## EXAMPLES
    
```brewfile
brew "git"
```

```brewfile ::args="--verbose --no-lock"
brew "git"
```

You can pass arguments to `brew bundle` through `::args`.

Notes: MarkDot force applies `--file=-` option to `brew bundle`.

