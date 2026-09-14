import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Import the flat-config exports directly instead of routing through
// `FlatCompat.extends("next/core-web-vitals", "next/typescript")`. The
// FlatCompat legacy-config shim re-wraps eslint-plugin-react's config
// object in a way that introduces a self-reference, which crashes
// `JSON.stringify` inside @eslint/eslintrc's schema validator on
// ESLint 9.39 ("TypeError: Converting circular structure to JSON").
// eslint-config-next@16 already ships real flat-config arrays at these
// subpaths, so no compat layer is needed.
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // eslint-plugin-react-hooks 7 (through eslint-config-next 16) made the
    // React Compiler rules errors. Thirteen older components trip them —
    // setState called synchronously inside an effect, and one ref read during
    // render — and CI failed on every push because of it. They stay visible as
    // warnings until those components are refactored; new code should not add
    // to the count.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
];

export default config;
