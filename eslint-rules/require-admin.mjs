/**
 * ESLint pravidlo: administrace ověřuje přihlášení v každém vstupním bodě.
 *
 * Server action je veřejný HTTP endpoint, dá se zavolat i bez otevření stránky.
 * Ochrana v layoutu administrace ji proto nekryje a každá funkce musí
 * přihlášení ověřit sama. Layout se navíc při navigaci v administraci znovu
 * nevykresluje, takže kontrolu potřebuje i každá stránka. Pravidlo hlídá:
 *   - exportované funkce v souborech s "use server" pod src/app/admin,
 *   - funkce s vlastní direktivou "use server" pod src/app/admin,
 *   - metody GET, POST, ... v src/app/api/admin (requireAdmin),
 *   - stránky pod src/app/admin/(dashboard) (requireAdminPage nebo requireAdmin).
 * Výjimku (třeba odhlášení) je nutné označit eslint-disable s důvodem.
 */

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function hasDirective(body, directive) {
  if (!body || !Array.isArray(body)) return false;
  return body.some((s) => s.type === "ExpressionStatement" && s.directive === directive);
}

function callsRequireAdmin(node, names = ["requireAdmin"]) {
  let found = false;
  const visit = (n) => {
    if (found || !n || typeof n.type !== "string") return;
    if (
      n.type === "CallExpression" &&
      n.callee.type === "Identifier" &&
      names.includes(n.callee.name)
    ) {
      found = true;
      return;
    }
    for (const key of Object.keys(n)) {
      if (key === "parent") continue;
      const value = n[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === "string") visit(value);
    }
  };
  visit(node.body);
  return found;
}

function isFunction(node) {
  return (
    node &&
    (node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression")
  );
}

/** Vrátí dvojice [jméno, funkce] ze všech exportů souboru. */
function exportedFunctions(program) {
  const result = [];
  for (const stmt of program.body) {
    if (stmt.type === "ExportNamedDeclaration" && stmt.declaration) {
      const d = stmt.declaration;
      if (d.type === "FunctionDeclaration") result.push([d.id?.name ?? "", d]);
      if (d.type === "VariableDeclaration") {
        for (const v of d.declarations) {
          if (isFunction(v.init)) result.push([v.id.name, v.init]);
        }
      }
    }
    if (stmt.type === "ExportDefaultDeclaration" && isFunction(stmt.declaration)) {
      result.push(["default", stmt.declaration]);
    }
  }
  return result;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Server actions a API routy administrace musí volat requireAdmin().",
    },
    messages: {
      missing:
        "{{name}} musí volat await requireAdmin() ze src/lib/admin-guard.ts. Server actions a API routy jsou veřejné endpointy.",
      missingPage:
        "Stránka administrace musí volat await requireAdminPage() ze src/lib/admin-guard.ts. Layout se při navigaci znovu nevykresluje.",
    },
    schema: [],
  },
  create(context) {
    const file = context.filename.replaceAll("\\", "/");
    const isAdminApp = file.includes("/src/app/admin/");
    const isAdminRoute = /\/src\/app\/api\/admin\/.*route\.[jt]sx?$/.test(file);
    const isDashboardPage = /\/src\/app\/admin\/\(dashboard\)\/(.*\/)?page\.[jt]sx?$/.test(file);
    if (!isAdminApp && !isAdminRoute) return {};

    const report = (node, name) =>
      context.report({ node, messageId: "missing", data: { name } });

    const checkInline = (node) => {
      if (node.body?.type !== "BlockStatement") return;
      if (!hasDirective(node.body.body, "use server")) return;
      if (!callsRequireAdmin(node)) report(node, "Server action");
    };

    return {
      Program(program) {
        const fileIsServer = hasDirective(program.body, "use server");
        for (const [name, fn] of exportedFunctions(program)) {
          const mustCheck =
            (isAdminApp && fileIsServer) || (isAdminRoute && HTTP_METHODS.has(name));
          if (mustCheck && !callsRequireAdmin(fn)) report(fn, `Funkce ${name}`);
          if (
            isDashboardPage &&
            name === "default" &&
            !callsRequireAdmin(fn, ["requireAdminPage", "requireAdmin"])
          ) {
            context.report({ node: fn, messageId: "missingPage" });
          }
        }
      },
      FunctionDeclaration: checkInline,
      FunctionExpression: checkInline,
      ArrowFunctionExpression: checkInline,
    };
  },
};

const plugin = {
  rules: { "require-admin": rule },
};

export default plugin;
