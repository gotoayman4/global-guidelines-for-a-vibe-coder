## Architecture (Load for New Features)

- **File Size Limit.** Files SHOULD NOT exceed 400 lines (target ~300). At 400, record debt and split before the NEXT feature touches it; do not stall current work.
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation & Schema Safety.** NEVER put business logic in UI components — API calls, transforms, and state live in services/hooks. Schema changes MUST be additive via migrations; NEVER edit applied migrations or run destructive drops without user approval.
  → Source: `04-architecture/backend-architecture.md`
- **Comments Add Context, Not Narration.** Headers/JSDoc only where purpose, constraints, or contracts are not inferable from names/signatures. NEVER restate code.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next; never horizontal layers.
  → Source: `01-workflow-methodology/development-workflow.md`
- **Search Before Creating (No Duplication).** Search existing utilities, hooks, types, and components before creating new ones. Extract logic repeated in 2+ files to a shared utility in the same iteration.
  → Source: `02-engineering-practices/code-duplication-prevention.md`
