import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    // photo-work/ is untracked scratch space. *.jsx outside src/ are Photoshop ExtendScript
    // (#target, $.fileName), which is not JavaScript ESLint can parse.
    ignores: [".next/**", "node_modules/**", "photo-work/**", ".claude/**/*.jsx"],
  },
];

export default eslintConfig;
