# LoadBearing Build Friction Log

Real friction points encountered during the full-stack construction of LoadBearing, with exact workarounds applied.

---

### Friction Entry 1: Monorepo Package Hoisting & Turbopack Tracing
- **Task**: Running `next build` inside `apps/web` in an npm workspaces monorepo.
- **Steps**: Executed `npm run build` targeting `apps/web`.
- **Expected**: Turbopack locates hoisted dependencies (`react`, `react-dom`, `three`, `zustand`) from the monorepo root.
- **Actual**: Turbopack failed with `Module not found: Can't resolve 'react'` because the Git root and root `package.json` were one level above `apps/web`.
- **Severity**: High (blocked production build).
- **Workaround**: Added `outputFileTracingRoot: path.resolve(__dirname, "../../")` and `transpilePackages: ["@loadbearing/shared", "followthesun-router"]` to `apps/web/next.config.ts`.
- **Suggestion**: Next.js should automatically detect workspace parent folders containing `package.json` and set `outputFileTracingRoot` by default in monorepos.

---

### Friction Entry 2: Lucide Icon Title Prop Typing in TypeScript Strict Mode
- **Task**: Providing accessible tooltips on SVG icons (e.g. `<Moon title="Asleep" />`).
- **Steps**: Ran `tsc --noEmit` across `apps/web`.
- **Expected**: Lucide icons accept standard SVG HTML attributes including `title`.
- **Actual**: TypeScript threw `TS2322: Property 'title' does not exist on type 'IntrinsicAttributes & Omit<LucideProps, "ref">...'`.
- **Severity**: Low.
- **Workaround**: Wrapped the `<Moon />` icon in a `<span>` element with the `title` attribute.
- **Suggestion**: `lucide-react` could include `title?: string` in `LucideProps` for accessible inline tooltips.

---

### Friction Entry 3: Multi-Credit Extraction from Compound Sentences in Rules Classifier
- **Task**: Extracting two distinct past care credits from the phrase: *"I researched clinics and booked Dadi's physiotherapy for Friday, but I can't arrange transport."*
- **Steps**: Executed `scripts/demo-check.ts` with `AI_MODE=rules`.
- **Expected**: Exactly 2 credits generated (`researched clinics`, `booked Dadi's physiotherapy`).
- **Actual**: The initial greedy regex captured the entire compound clause into 1 credit.
- **Severity**: Medium.
- **Workaround**: Refactored the rules engine to extract multiple coordinated past-action verbs (`researched`, `booked`, `ordered`, `paid`, `called`, `coordinated`) separated by `and` or commas.
- **Suggestion**: Document compound verb parsing patterns for deterministic NLP classification fallbacks.
