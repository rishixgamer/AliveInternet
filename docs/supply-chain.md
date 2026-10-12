# Supply-chain and release credibility — groundwork

Feature `supply-chain-hardening`. People are rightly wary of extensions that read every page; visible security hygiene makes installing easier.

| Item | Status | Next step |
|---|---|---|
| `package-lock.json` | Missing | Run `npm install` and commit the lockfile; switch CI to `npm ci` |
| Dependabot | Config added (`.github/dependabot.yml`) | Takes effect once the repo is on GitHub |
| `SECURITY.md` | Added (placeholder contact) | Set the real private reporting channel |
| OpenSSF Scorecard | Not added | Add the official `ossf/scorecard-action` workflow (pin by commit SHA) and the README badge |
| Pinned GitHub Actions | Not yet | Pin `actions/checkout` / `setup-node` by commit SHA |
| Signed / attested releases | Not yet | Build store zips in CI; attach build provenance attestations to GitHub releases; npm `--provenance` |
| SBOM | Not yet | Generate CycloneDX/SPDX for each release (already a "Prior to release" item in docs/privacy.md) |
| Reproducible build check | Not yet | CI rebuilds the release tag and compares zip hashes |
