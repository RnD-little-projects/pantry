<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI redesign workflow

For any redesign or visual change, follow these steps in order:

1. **Direction**: use the `frontend-design` skill. Propose a palette, type and layout direction for Pantry (a pantry and market-list app, used on mobile first) and get approval before writing code.
2. **Tokens first**: put colors, radius and fonts in the CSS variables in `src/app/globals.css` (light and dark). Never hard-code colors in components.
3. **Components**: restyle the existing `src/components/ui/*` (Button, Card, Dialog, Input, Table, Badge, Toast) before touching pages. Pages keep using these components; don't add new UI libraries.
4. **Pages**: redesign one route at a time. Follow `senior-frontend` for React/Tailwind patterns, but the Next 16 docs in `node_modules/next/dist/docs/` win where they disagree. Leave server actions, API routes, auth and data logic alone. A redesign changes markup and styles only.
5. **Review**: run `web-design-guidelines` on the changed files and fix what it finds.
6. **Verify**: use the Playwright MCP to open each changed page at 375px and 1280px, in both light and dark mode. Take screenshots and click the main flows (login, start order, add/edit/remove item, archive). Check that `npm run lint` and `npm run build` pass.
7. Commit after each route.
