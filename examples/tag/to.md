# ::to

## Basic usage

Write codeblock content to given path, specifying the path with `::to` tag.

```toml ::to=~/.config/markdot-test/sample.toml
experimental = true  
```

## No codeblock execution

It just copies without codeblock execution.

```sh ::to=~/.config/markdot-test/sample.sh ::permission=755
echo "this is setup script"
```
