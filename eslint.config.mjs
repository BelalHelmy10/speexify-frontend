import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "tmp/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-location-assign-relative-destination": "off",
      "import/no-anonymous-default-export": "off",
      "react-hooks/exhaustive-deps": "off",
      // These React Compiler diagnostics were introduced by the newer hooks
      // plugin. The app does not enable the compiler, so retain the legacy
      // hook lint contract while keeping rules-of-hooks enforced.
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default config;
