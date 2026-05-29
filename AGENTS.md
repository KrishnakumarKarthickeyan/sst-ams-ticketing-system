<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Graphify Integration Rules

This project maintains a codebase knowledge graph using Graphify.

1. **Navigation**: Consult the Graphify index in `graphify-out/` before scanning or reading arbitrary files when searching for codebase structure.
2. **Maintenance**: You MUST run `npm run graphify` (which executes `graphify update .`) immediately after modifying any code files to rebuild the AST dependency graph.
3. **RLS & Security**: Check RLS policies (`src/sql/fix_rls_policies_v3.sql`) to ensure multi-consultant support is maintained for all new/modified ticket query and effort logging features.

