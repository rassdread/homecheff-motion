import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/hooks/use-animation-workflow.ts"],
    rules: {
      // Intentionally stable useCallback([]) for snapshot + job helpers; React Compiler disagrees.
      "react-hooks/preserve-manual-memoization": "off",
      // The hook intentionally bootstraps auth/usage state from APIs in effects.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/admin/invites/page.tsx", "src/app/admin/users/page.tsx"],
    rules: {
      // These pages intentionally hydrate from admin APIs on mount.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/components/studio/studio-voice-library-admin-audit-panel.tsx"],
    rules: {
      // Admin audit panel loads ElevenLabs catalog on mount.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: [
      "src/components/editor/editor-canvas-workspace.tsx",
      "src/components/editor/editor-instruction-studio-workspace.tsx",
      "src/components/editor/editor-product-page.tsx",
      "src/components/editor/editor-start-screen.tsx",
      "src/components/studio/studio-character-from-reference-wizard.tsx",
      "src/components/studio/studio-production-brief-flow.tsx",
      "src/components/studio/studio-root-page.tsx",
      "src/hooks/use-hc-project-workspace.ts",
    ],
    rules: {
      // HC/editor workspaces bootstrap linked projects and session state on mount.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "worker/**",
  ]),
]);

export default eslintConfig;
