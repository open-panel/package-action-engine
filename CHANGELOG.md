# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0]

### Added

- `ActionRegistry` and `ActionEngine` (resolve → validate config → execute →
  success/failure, with a per-execution timeout).
- Built-in action catalog: open app/URL, hotkey, hotkey switch, shell, type
  text, multimedia keys, page navigation (change/next/previous), profile
  switch, folders, page indicator.
- `runShellCommand` shell wrapper, exposed for reuse.
