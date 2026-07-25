---
name: humanize-code
description: Use when the user asks to humanise, simplify, or de-jargon code — renaming variables / methods / classes, rewriting comments and docstrings, or cleaning up log / error / user-facing strings so a non-native English reader can follow them. Targets verbose names, padded comments, and AI-flavoured language; keeps very well-known technical terms.
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

You make code readable for a competent developer whose English is a second language. Rename verbose or fancy identifiers, rewrite comments and docstrings into plain sentences, and simplify log / error / user-facing strings. Do not change behaviour. Do not restructure code. One pass, then output.

## Process

### 1. Resolve scope

- File paths → read each, propose `Edit`s, confirm before writing.
- Pasted snippet → return rewritten snippet inline. No file I/O.
- Symbol name + repo (e.g. "rename `OrchestrationCoordinatorFactory`") → `Grep` every reference, propose edits across all hit files.
- Git diff or "the changes on this branch" → run `git diff` against the base branch, work on the touched files only.
- Directory path → list code files, ask the user to confirm the set before editing more than ten.
- Ambiguous ("clean up this code") → use `AskUserQuestion` to pick file(s), pasted snippet, or symbol-wide rename.

In plan mode, output proposals as a report; do not edit. In normal mode, edit in place.

### 2. Read what you will change

Before renaming an identifier, `Grep` for every reference in the repo. If you cannot find them all (reflective access, dynamic dispatch, generated code, string-keyed lookups, public API consumed from outside the repo), stop and tell the user — do not half-rename.

For comments and strings, read enough surrounding code to know what the comment is actually describing. A "simplified" comment that no longer matches the code is worse than a verbose one.

### 3. Rewrite in one pass

Apply the rules below. Keep the meaning, the types, the control flow, the test names that other tools depend on. Match the existing casing convention (camelCase, snake_case, PascalCase) — do not convert styles.

### 4. Self-check, then output

Scan against the literals in the self-check section. Fix silently. Then print in the output contract.

## Rules

### Identifiers

- **Drop filler nouns.** `UserDataManager` → `Users`. `OrderProcessingService` → `Orders` or `OrderProcessor` if `Service` actually disambiguates. Cut `Manager`, `Handler`, `Helper`, `Util`, `Utility`, `Wrapper`, `Provider`, `Engine`, `Coordinator`, `Orchestrator`, `Controller` (outside MVC frameworks where it is a real role) when they add no information.
- **Drop type echoes.** `userList` → `users`. `customerMap` → `customersById` or `customers`. `isEnabledFlag` → `isEnabled`. `userObj` → `user`.
- **Prefer short concrete names.** `retrieveCustomerInformationFromDatabase` → `loadCustomer`. `performInitialisationOfConfiguration` → `loadConfig` or `init`. `calculateTotalAmount` → `total`.
- **Cut Latinate verbs.** `utilise` → `use`. `instantiate` → `create` or `make`. `initialise` → `init` (or `setup` if it is one-time). `terminate` → `stop` or `end`. `aggregate` → `combine` or `sum`. `propagate` → `pass` or `forward`. `synchronise` → `sync`. `facilitate` → delete; pick the verb for what it actually does.
- **Booleans read as questions.** `isReady`, `hasItems`, `canSubmit`, `shouldRetry`. Not `readyStatus`, `itemsExist`, `submittable`.
- **Keep very well-known technical terms.** `id`, `url`, `http`, `json`, `xml`, `ttl`, `dto`, `db`, `sql`, `regex`, `uuid`, `api`, `crud`, `auth`, `oauth`, `jwt`, `tcp`, `dns`, `ip`, `csv`, `yaml`, `cli`, `gui`, `i18n` (if already used), `repo`, `env`, `ci`, `mutex`, `thread`, `cache`, `queue`, `stream`, `buffer`, `hash`, `index`, `key`, `value`, `event`, `payload`, `request`, `response`, `error`, `status`, `code`, language / framework names. These read more clearly than spelled-out alternatives.
- **Translate jargon that is only well known to specialists.** `idempotent` → keep if the code actually depends on the property; otherwise `safe to retry`. `monad`, `functor`, `covariant`, `bijection`, `homomorphism` → spell out the behaviour. `polyfill` → keep in front-end code, replace elsewhere. `marshal` / `unmarshal` → `encode` / `decode`. `mutate` → `change` if not in a React / state-management context.
- **No abbreviations a reader cannot guess.** `usrCtxMgr`, `procReqHdlr`, `tmpCalcRes` — spell them out. Single-letter names are fine for `i`, `j`, `k`, `x`, `y`, `e` (caught error), `_` (ignored).
- **Match the project's existing vocabulary.** If the rest of the codebase says `customer`, do not rename one to `client`. Skim a few neighbouring files before settling on a name.
- **Repo conventions beat the rules above for public interfaces.** Before renaming any public identifier (class, interface, exported function, public method, type), check sibling types and the wider module for an established naming pattern. If `OrderManager`, `CustomerManager`, and `InventoryManager` already coexist, do not rename one to `Orders` in isolation — that breaks the pattern and makes the code harder to scan. Either rename the whole family (ask the user first; usually out of scope for a single-file pass) or leave the name and list it under `### Risks`. Consistency with existing siblings is more important than removing a filler noun from one of them.

### Comments and docstrings

- **Cut comments that restate the code.** `// increment counter` above `counter++` → delete.
- **Keep comments that explain why.** Hidden constraint, surprising behaviour, workaround, link to a ticket or RFC, non-obvious invariant. Rewrite them in plain sentences.
- **Short, active sentences.** Subject + verb + object. Drop "It is important to note that", "Please be aware that", "This function is responsible for", "The purpose of this method is to".
- **Replace AI vocabulary** (same list as `humanize-text`'s self-check): `leverage` → `use`. `seamless` → `smooth` or delete. `robust` → `reliable` or delete. `comprehensive` → `full` or delete. `enhance` → `improve`. `facilitate` → delete. `utilise` → `use`. `crucial`, `pivotal`, `vital` → `important` or delete.
- **No em dashes** in comments. Use a comma, full stop, or parentheses.
- **Docstrings: lead with what the function does for the caller.** One line. Then parameters and return value if non-obvious. Skip "This function...". Skip restatements of the signature.
- **Do not invent details.** If a docstring claims behaviour the code does not implement, fix the docstring to match the code, then flag the gap to the user.

### Log / error / user-facing strings

- **State the fact, not the feeling.** `"FATAL: Catastrophic failure encountered while attempting to load configuration!"` → `"failed to load config: {err}"`.
- **Concrete subject and object.** `"Operation failed"` → `"saving order {id} failed: {reason}"`. The reader needs to know what was being done and to what.
- **Lowercase, no trailing punctuation, in log lines and Go-style errors.** Match the project convention; when in doubt, follow the closest neighbouring log call.
- **No empty politeness.** Drop `please`, `kindly`, `unfortunately`, `we apologise`, `oops`, exclamation marks. User-facing UI strings (not logs) can keep one polite hedge if the project does.
- **Include the values that help a reader debug.** Identifiers, counts, paths, error codes. Redact secrets.
- **No emojis** unless the project already uses them in user-facing strings.

### What never changes

- Public API names, exported symbol names, anything referenced from outside the repo, anything in a generated file, anything matching a name in a test fixture or snapshot, framework-required names (`render`, `componentDidMount`, `__init__`, `Main`), database column names, JSON field names that cross a wire. If unsure, ask.
- Behaviour. Even if a name is misleading because the function does the wrong thing — fix the name, file the bug separately.

## Self-check literals

Run before printing. Any hit means rewrite again.

- AI vocabulary in comments / docstrings / strings: `leverage`, `seamless`, `seamlessly`, `robust`, `comprehensive`, `enhance`, `facilitate`, `utilise`, `utilize`, `crucial`, `pivotal`, `vital`, `delve`, `holistic`, `streamline`.
- Em dashes (`—`) anywhere in changed lines.
- Filler in identifiers: `Manager`, `Handler`, `Helper`, `Util`, `Utility`, `Wrapper`, `Coordinator`, `Orchestrator`, `Service` — flag each, keep only if it disambiguates from a sibling type.
- Type-echo suffixes on variable names: `List`, `Map`, `Array`, `Obj`, `Object`, `Flag`, `Bool`, `Str`, `String`, `Int` at the end of a name.
- Latinate verbs in identifiers: `utilise`, `instantiate`, `terminate`, `propagate`, `facilitate`, `aggregate`, `synchronise`.
- Comments that begin with "This function", "This method", "This class is responsible for", "The purpose of".
- Log / error strings starting with "ERROR:", "FATAL:", `"!"`, "Oops", "Sorry,".

## Output contract

### File mode

1. Propose `Edit`s file by file, wait for acceptance.
2. After acceptance, one line per file: `Edited <path> (N changes).`
3. Then `### Renames` (if any), as a table: `old → new — one-line reason`. Skip the section if no identifiers were renamed.
4. Then `### Changes` — up to seven bullets naming the categories applied. Examples: `- Renamed verbose identifiers`, `- Simplified comments`, `- Cut AI vocabulary from log strings`.
5. If renames touched files outside the user's stated scope (cross-file references), list them under `### Cross-file references` so the user can verify.

### Pasted-snippet mode

1. `### Humanised code`
2. A fenced code block in the original language, with the rewritten code.
3. `### Renames` table (if any).
4. `### Changes` bullets.

### Plan mode

A report only. No edits. Sections: `### Proposed renames` (table), `### Comment rewrites` (before / after pairs, max 10), `### String rewrites` (before / after pairs, max 10), `### Risks` (anything you cannot rename safely, public API hits, missing references).

## What this skill is not

- Not a refactor tool. Does not extract methods, change signatures, or reorganise modules.
- Not a linter. Does not enforce style rules the formatter handles.
- Not a translator. Does not convert non-English code or comments — flag them and ask.
- Not a behaviour fixer. If a name is wrong because the code is wrong, name change first, bug report second, do not silently "fix" the logic.
