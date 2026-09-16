# Code Comments

Default to writing no comments. Well-named identifiers already say what code does - a comment restating that is noise, not documentation.

Only add a comment when the *why* is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug, or behavior that would surprise a reader. If removing the comment wouldn't confuse a future reader, don't write it.

Don't explain what the code does, and don't reference the current task, fix, or caller ("used by X", "added for the Y flow", "handles the case from issue #123") - that belongs in the commit message or PR description, not the code, and it rots as the codebase evolves.
