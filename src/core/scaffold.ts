/**
 * Marker for GROUNDWORK code: interfaces and inert stubs for planned features.
 * Nothing that throws this error is wired into the extension. Implementations
 * must replace the stub, add true-positive and benign tests, and flip the
 * feature status in src/core/features.ts. See docs/feature-groundwork.md.
 */
export class NotImplementedError extends Error {
  readonly featureId: string;
  constructor(featureId: string) {
    super(`AliveInternet feature "${featureId}" is scaffolded but not implemented yet`);
    this.name = 'NotImplementedError';
    this.featureId = featureId;
  }
}
