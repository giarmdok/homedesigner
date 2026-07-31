# Agent Instructions

## Project state

- This repository is an early-stage home-design project intended to become a 3D room-design and furniture-placement tool for homeowners redecorating.
- The only tracked source file is the one-line `README.md`; there is currently no application scaffold, package manifest, workspace, build system, test suite, lint/typecheck configuration, CI workflow, or documented development command.
- `raw_resources/` contains local reference assets such as floor plans, room renders, and furniture/style images. It is currently untracked; do not delete, relocate, or bulk-edit it while scaffolding the application unless the task explicitly requires asset changes.

## Working conventions

- Before adding framework or tooling assumptions, establish the application structure and document the chosen setup here or in the README.
- Do not claim a build, test, lint, or typecheck command exists until the corresponding configuration and script are added.
- Treat the images and floor plans in `raw_resources/` as design/reference inputs, not generated build output.
