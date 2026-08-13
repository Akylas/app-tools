# Shared agent skills

Skills shared across the apps that consume this submodule. Each consuming app symlinks the ones it
wants into its own `.claude/skills/`:

```sh
ln -s ../../tools/.claude/skills/<name> .claude/skills/<name>
```

Fixing a skill here fixes it for every app at once — which is the point, and also the risk: a change
here lands in every consumer the next time its submodule pointer moves.

## The rule that keeps these from rotting

**A skill states method. It never states a fact about a repo.**

These skills were originally per-app copies, and every one of them drifted: they asserted a default
branch, a test command, a directory layout and a set of commit scopes that belonged to a *different*
app. An agent following them started from a false map of the codebase and confidently ran commands
that could not work.

The fix is not "keep them updated". It is to make them **derive** anything repo-specific at the moment
they need it. Nearly everything that rotted is one command away:

| Fact | Derive it |
| --- | --- |
| default branch | `git symbolic-ref --short refs/remotes/origin/HEAD \| sed 's\|^origin/\|\|'` |
| available checks | `node -p "Object.keys(require('./package.json').scripts\|\|{}).join(' ')"` |
| is there a test runner | the above — if nothing matches, **there is none**; do not invent one |
| commit types in use | `git log --format='%s' -500 \| grep -oE '^[a-z-]+' \| sort \| uniq -c \| sort -rn` |
| commit scopes in use | `git log --format='%s' -500 \| grep -oE '^[a-z-]+\([^)]+\)' \| sed 's/.*(//;s/)//' \| sort \| uniq -c \| sort -rn` |
| what CI enforces | `ls .github/workflows/` |
| feature layout | `ls` the components directory; read the app's `CLAUDE.md` |

A derived skill is self-correcting: it gets the right answer in an app it has never seen.

## Where repo-specific facts belong

Facts that genuinely cannot be derived — judgement, history, gotchas ("these two directories hold
drifted forks of the same component, check both") — go in the **consuming app's `.claude/CLAUDE.md`**,
under a `## Repo facts` heading so a skill can point at it. Never copy them back into a skill.

## Adding a skill here

- Method, discipline and checklists: yes.
- A path, branch name, script name or scope list: no — derive it, or point at `CLAUDE.md`.
- Worked examples may cite real code, but label them as case studies so they do not read as claims
  about the current repo.
