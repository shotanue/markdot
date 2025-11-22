# evaluation order

Markdot ignores all text except for code blocks. Therefore, you can add descriptions like this.
It evaluates codeblocks in sequence.

## a

```bash
echo a
```

## b

```bash
echo b
```

## c

```bash
echo c
```

## d

```brewfile
brew "git"
```

