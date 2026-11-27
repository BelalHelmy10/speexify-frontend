// Bundles the real session feedback page for the browser with the server,
// sign-in and router replaced by small stand-ins the tests control through
// `window.feedbackTest`.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import * as sass from "sass";

const root = path.resolve(import.meta.dirname, "../../..");

const STUBS = {
  "hooks/useAuth.js":
    "module.exports={__esModule:true,default:()=>({checking:false,user:{id:'u1',role:window.feedbackTest.role}})};",
  // Tests can answer requests themselves with `feedbackTest.handle(method, url, body)`.
  "lib/api.js":
    "const call=async(method,url,body)=>{const t=window.feedbackTest;if(method==='post')t.posts.push({url,body});const answer=t.handle?await t.handle(method,url,body):undefined;if(answer!==undefined)return {data:answer};return {data:method==='get'?{session:t.session}:{}};};module.exports={__esModule:true,default:{get:(url)=>call('get',url),post:(url,body)=>call('post',url,body)}};",
  "lib/analytics.js": "exports.trackEvent=()=>{};",
  "components/ToastProvider.jsx":
    "exports.useToast=()=>({toast:{success:(m)=>window.feedbackTest.toasts.push(m),error:(m)=>window.feedbackTest.toasts.push(m)}});",
  "app/i18n.js": "exports.getDictionary=()=>({});exports.t=()=>'';",
};

export function buildFeedbackHarness({ entry = "tests/feedback/support/feedbackHarnessEntry.jsx" } = {}) {
  const modules = [];
  const ids = new Map();

  function bundle(file) {
    if (ids.has(file)) return ids.get(file);
    const id = modules.length;
    ids.set(file, id);
    modules.push("");

    const localRequire = createRequire(file);
    const relativePath = path.relative(root, file);
    let source = STUBS[relativePath] ?? fs.readFileSync(file, "utf8");

    if (file.endsWith(".scss") || file.endsWith(".css")) source = "";
    if (/node_modules\/next\/navigation/.test(file)) {
      source =
        "exports.useParams=()=>({id:'s1'});exports.usePathname=()=>window.feedbackTest.pathname;exports.useRouter=()=>({push:(to)=>window.feedbackTest.navigations.push(to),replace:(to)=>window.feedbackTest.navigations.push(to)});";
    }
    if (/node_modules\/next\/link/.test(file)) {
      source =
        "const React=require('react');module.exports={__esModule:true,default:({href,children,prefetch,...rest})=>React.createElement('a',{href,...rest},children)};";
    }
    if (file.endsWith(".json")) source = `module.exports = ${source}`;

    if (!file.includes("node_modules") && !STUBS[relativePath]) {
      source = ts.transpileModule(source, {
        fileName: file.endsWith(".mjs") ? file.replace(/\.mjs$/, ".js") : file,
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText;
    }

    source = source.replace(/require\(["']([^"']+)["']\)/g, (_match, name) => {
      let resolved;
      if (name.startsWith("@/")) {
        resolved = path.join(root, name.slice(2));
        if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
          resolved = [".js", ".jsx", ".mjs"]
            .map((extension) => resolved + extension)
            .find((candidate) => fs.existsSync(candidate));
        }
        return `require(${bundle(resolved)})`;
      }
      if (name === "next/navigation" || name === "next/link") {
        return `require(${bundle(path.join(root, `node_modules/${name}.js`))})`;
      }
      try {
        resolved = localRequire.resolve(name);
      } catch {
        resolved = localRequire.resolve(`${name}.jsx`);
      }
      return `require(${bundle(resolved)})`;
    });

    modules[id] = `function(require,module,exports){${source}\n}`;
    return id;
  }

  const entryId = bundle(path.join(root, entry));
  const script = `const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(",")}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entryId});`;
  const css = ["styles/_responsive.scss", "styles/session-feedback.scss", "styles/lesson-recap.scss", "styles/units.scss"]
    .map((file) =>
      sass.compile(path.join(root, file), { loadPaths: [path.join(root, "styles")], logger: sass.Logger.silent }).css
    )
    .join("\n");

  return { script, css };
}
