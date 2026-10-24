import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import * as sass from "sass";

const root = path.resolve(import.meta.dirname, "../../..");

export function buildClassroomHarness() {
  const modules = [];
  const ids = new Map();

  function bundle(file) {
    if (ids.has(file)) return ids.get(file);
    const id = modules.length;
    ids.set(file, id);
    modules.push("");

    const localRequire = createRequire(file);
    let source = fs.readFileSync(file, "utf8");
    const relativePath = path.relative(root, file);
    const shellDirectory = "app/classroom/[sessionId]/";

    if (
      relativePath.startsWith(shellDirectory)
      && ![
        "ClassroomShell.jsx",
        "ClassroomResourceWorkspace.jsx",
        "MobileClassroomLayout.jsx",
        "classroomHelpers.js",
        "classroomTime.js",
        "ClassroomControlBar.jsx",
        "ClassroomHeaderBar.jsx",
        "ClassroomHostMenu.jsx",
      ].includes(path.basename(file))
    ) {
      source = "module.exports = {__esModule:true, default: () => null};";
      if (relativePath.endsWith("ClassroomResourcePickerModal.jsx")) {
        source = `const React = require('react'); module.exports = {__esModule:true, default: ({isOpen,handleChangeResourceId}) => isOpen ? React.createElement('div',{className:'test-picker'},...['a','b','c'].map(id => React.createElement('button',{key:id,onClick:()=>handleChangeResourceId(id)},'Open '+id))) : null};`;
      }
      if (relativePath.endsWith("ClassroomRaiseHand.jsx")) {
        source += "module.exports.ClassroomRaiseHandButton=()=>null;module.exports.ClassroomRaiseHandOverlay=()=>null;module.exports.useClassroomRaiseHand = () => ({});";
      }
      if (relativePath.endsWith("ClassroomCaptions.jsx")) {
        source += "module.exports.ClassroomCaptionsButton=()=>null;module.exports.ClassroomCaptionsOverlay=()=>null;module.exports.useClassroomCaptions = () => ({});";
      }
      if (relativePath.endsWith("ClassroomScreenShare.jsx")) {
        source += "module.exports.ClassroomScreenShareButton=()=>null;module.exports.ClassroomScreenShareBanner=()=>null;module.exports.ClassroomScreenShareConfirmModal=()=>null;module.exports.useClassroomScreenShare = () => ({});";
      }
      if (relativePath.endsWith("useClassroomLobby.js")) {
        source += "module.exports.useClassroomLobby = () => ({canJoin:true});";
      }
    }

    if (relativePath === "hooks/useAuth.js") {
      source = "module.exports={__esModule:true,default:()=>({user:{id:'test-user'}})};";
    }
    if (relativePath === "lib/api.js") {
      source = `module.exports={__esModule:true,default:{get:async(url)=>{if(url.endsWith('/materials')) await new Promise(resolve=>setTimeout(resolve,20));return {data:url.endsWith('classroom-state') ? {state:window.testState.state} : {materials:window.testState.materials||[]}}},patch:async(url,body)=>({data:{state:body.state}}),put:async(url,body)=>{window.testState.saved.push(body);return {data:{}}},post:async()=>({data:{}})}};`;
    }
    if (relativePath === "app/resources/prep/useClassroomChannel.js") {
      source = `const React=require('react');exports.useClassroomChannel = ()=>React.useMemo(()=>({ready:true,status:'ready',send:message=>window.testState.messages.push(message),subscribe:fn=>{window.channelSubscribers.add(fn);return ()=>window.channelSubscribers.delete(fn)}}),[]);`;
    }
    if (relativePath === "app/resources/prep/PrepShell.jsx") {
      source = `const React=require('react');module.exports={__esModule:true,default:({resource,isActive})=>React.createElement('div',{'data-resource':resource._id,'data-active':isActive,className:'classroom-test-content'},React.createElement('h2',null,resource.title),React.createElement('textarea',{'aria-label':'Lesson notes'}))};`;
    }
    if (file.endsWith("/app/i18n.js")) {
      source = "const dict={};exports.getDictionary = () => dict; exports.t = (_, key) => key;";
    }
    if (file.endsWith(".json")) source = `module.exports = ${source}`;

    if (!file.includes("node_modules")) {
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
        if (!fs.existsSync(resolved)) {
          resolved = [".js", ".jsx", ".mjs"]
            .map((extension) => resolved + extension)
            .find((candidate) => fs.existsSync(candidate));
        }
        return `require(${bundle(resolved)})`;
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

  const entry = bundle(path.join(root, "scripts/fixtures/unifiedClassroomHarness.jsx"));
  const script = `const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(",")}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entry});`;
  const css = sass.compile(path.join(root, "styles/resources.scss"), {
    logger: sass.Logger.silent,
  }).css;

  return { script, css };
}
