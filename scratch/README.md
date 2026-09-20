# Scratch

Loose files that were sitting in the repository root: draft components and route
handlers, none of them imported by anything.

They were being compiled as part of the build, because tsconfig includes
`**/*.tsx`, and one of them imports a `./_shared` module that does not exist —
which failed the build for a reason that had nothing to do with the change being
deployed. Moved here and excluded from compilation rather than deleted, since
they are not in version control and deleting them would lose whatever they were
for.
