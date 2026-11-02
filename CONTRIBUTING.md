# Contributing to Antigravity-Next for DSH

Thank you for your interest in contributing to Antigravity-Next!

This plugin integrates local Google Antigravity models (Gemini & Claude) into DeepSeek Harness. Our primary goals are stability, local credential privacy, and a zero-configuration experience for users.

To maintain code quality and prevent wasted effort, please take a moment to review these contribution guidelines.

---

## 1. Opening Issues & Proposing Changes

### Discuss Before Writing Large Code
Before implementing a new feature, refactoring architecture, or adding dependencies, please **open an issue first** to discuss your proposal with maintainers.

- This ensures your proposal aligns with the project roadmap and saves you time on changes that might not be merged.
- Small bug fixes, documentation corrections, and typo fixes do not require prior discussion—feel free to open a direct Pull Request.

### What Makes a Helpful Issue?
- **Bug Reports:** Include your DSH version, operating system, Node.js version, and clear step-by-step reproduction instructions.
- **Safety First:** **NEVER paste OAuth tokens (access or refresh), Client Secrets, or private account emails** in issue descriptions or screenshots. Always sanitize your logs.

---

## 2. Pull Request Guidelines

When submitting a Pull Request, please ensure it meets the following standards:

### PR Description
Every PR should clearly explain:
1. **What:** A summary of the changes made.
2. **Why:** The problem this solves or the feature it implements.
3. **Verification:** What checks or commands were run to prove it works.

```markdown
### Summary
- Brief explanation of the change.

### Verification
- [x] Ran `npm run check` (syntax validation across all modules)
- [x] Ran `npm test` (offline regression tests passed)
- [ ] Manual test: (explain manual verification steps, or note if skipped)
```

### Local Testing Before Pushing
Please run the offline test suite locally before pushing your branch:

```bash
npm run check        # Syntax validation across all 40 modules
npm test             # Offline test suite (21 synthetic fixture tests)
```

If you have a local DSH installation with peers available, you can also run:
```powershell
$env:AGY_PEER_ROOT = 'C:\path\to\dsh\node_modules'
npm run test:peers   # Strict peer contract verification
```

---

## 3. Documentation & Internationalization

We maintain documentation in English, Traditional Chinese (Taiwan), and Simplified Chinese.

- **Keep Locales Synchronized:** If you update feature descriptions, commands, or settings in `README.md`, please update `README.zh-TW.md` and `README.zh-CN.md` accordingly (or note it in your PR so maintainers can assist).
- **Accurate Terminology:**
  - `README.zh-TW.md` adheres to Taiwanese engineering terminology (外掛, 程式碼, 介面, 設定).
  - `README.zh-CN.md` adheres to Mainland Chinese engineering terminology (插件, 代码, 接口, 配置).
- **Code Consistency:** Terminal commands, arguments, and configuration keys must remain byte-identical across all translations.

---

## 4. Security & Vulnerability Reporting

- **Confidential Disclosures:** If you discover a security vulnerability or potential token exposure risk, please **do not** open a public issue. Use [GitHub Security Advisories](https://github.com/kizaki-R/Antigravity-Next-for-DSH/security/advisories/new) to report it privately.
- **Storage Boundary:** The plugin must never execute the official Antigravity desktop app or write to its internal database. All OAuth tokens belong strictly inside `<DSH_HOME>/storages/agy-next-oauth.json`.

---

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
