import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Convention: a leading underscore marks a binding that must stay in the
      // signature/pattern for compatibility (e.g. the trailing params of the
      // kept-for-back-compat helpers in RowView / pivotExport).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // ONE tooltip system (`data-tip` + components/ui/Tip). A native `title`
      // makes the browser draw its own black tooltip next to ours — the
      // duplicate "Collapse sidebar" box.
      //
      // Covers lowercase tags AND the components that forward props to the DOM
      // (`<Button title>`, `<Link title>`, `<SelectTrigger title>`…), which is
      // how the bug crept back in before. Only components whose `title` is a
      // heading PROP are allowed: they never reach an attribute.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement:not([name.name=/^(AppShell|Option|Slide|SectionCard|RecordSection|PrintTable|SectionHeader|EmptyState|ToggleRow|FormSection|ModuleRecords)$/]) > JSXAttribute[name.name='title']",
          message:
            "No native `title` on DOM elements: it draws a second, browser tooltip. Use data-tip with the shared TipLayer (src/components/ui/Tip.tsx).",
        },
      ],
    },
  },
  {
    // The audit fixtures and the tooltip's own compatibility layer are exempt.
    files: ["scripts/**/*.{ts,tsx}", "src/components/ui/Tip.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Vendored shadcn/ui components and the host-owned Vly toolbar are not our
    // components: exporting a helper alongside a component is their normal
    // shape. The fast-refresh rule stays on everywhere else, so the warnings
    // that remain are real ones in our own files.
    files: ["src/components/ui/**/*.{ts,tsx}", "vly-toolbar-readonly.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // shadcn's Tooltip/TooltipProvider wrappers legitimately pass their own
    // `title`-style props; the ban applies to our own markup only.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  },
);
