# Privacy and threat model

## Data flow in v0.1
The extension reads currently rendered YouTube comment text, author display names, and comment links in memory. It calculates indicators and renders annotations/collapses locally. It stores ONLY three preferences: enabled, mode, and annotateFlagged. It does not create user profiles, use a remote API, transmit comment bodies, log content, or persist comment histories.

The opt-in Node research command `npm run embedding:poc` obtains public model files from Hugging Face; it embeds hardcoded synthetic examples, **not** a user's browsing history.

## Attack surfaces
- Malicious comment HTML, Unicode tricks, lookalike links, and URL redirects: use DOM textContent and avoid HTML injection; treat all links as suspect input, not arbitrary code.
- Platform HTML changes: resilient selectors, manual regression checks, and conservative default behavior.
- Model supply chain: pin and audit model revisions before bundling or distributing. Inspect model licenses and data provenance.
- Model executable runtime: Chrome MV3 prohibits remotely hosted executable code. Package ONNX runtime WASM/JS locally; never use CDN-loaded scripts in production.
- False positives, platform bias, and moderation abuse: collapse only on multiple indicators and always allow reveal.

## Future semantic inference
Browser ML should be opt-in at first. Ask the user before model downloads, explain size and resource usage, process data locally, offer clear model-deletion controls, and don't send raw comments to third parties. Audit browser network requests before claiming offline-only operation. No cross-site tracking.
