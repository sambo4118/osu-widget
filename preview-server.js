const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PREVIEW_DIR = path.join(ROOT, "preview");
const SCRIPT_PATH = path.join(ROOT, "osu! widget.js");

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const staticFiles = new Map([
  ["/", { filePath: path.join(PREVIEW_DIR, "index.html"), contentType: "text/html; charset=utf-8" }],
  ["/index.html", { filePath: path.join(PREVIEW_DIR, "index.html"), contentType: "text/html; charset=utf-8" }],
  ["/app.js", { filePath: path.join(PREVIEW_DIR, "app.js"), contentType: "text/javascript; charset=utf-8" }],
  ["/styles.css", { filePath: path.join(PREVIEW_DIR, "styles.css"), contentType: "text/css; charset=utf-8" }]
]);

function hexToRgb(hex) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    return normalized.split("").map((char) => Number.parseInt(char + char, 16));
  }
  if (normalized.length === 6) {
    return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  }
  return null;
}

function toCssColor(color) {
  if (!color) {
    return null;
  }

  if (color.alpha === 1) {
    return color.hex;
  }

  const rgb = hexToRgb(color.hex);
  if (!rgb) {
    return color.hex;
  }

  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${color.alpha})`;
}

function readSource() {
  return fs.readFileSync(SCRIPT_PATH, "utf8");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath, contentType) {
  const stream = fs.createReadStream(filePath);
  response.writeHead(200, { "content-type": contentType });
  stream.pipe(response);
  stream.on("error", (error) => {
    if (!response.headersSent) {
      sendJson(response, 500, { error: error.message });
    }
  });
}

function normalizeFamily(rawFamily) {
  if (rawFamily === "small" || rawFamily === "medium" || rawFamily === "large") {
    return rawFamily;
  }
  return "small";
}

function serializeImage(image) {
  if (!image) {
    return null;
  }

  return {
    src: image.src,
    kind: image.kind
  };
}

function serializeNode(node) {
  if (node.type === "widget" || node.type === "stack") {
    return {
      type: node.type,
      layout: node.layout,
      centerAlignContent: node.centerAligned,
      bottomAlignContent: node.bottomAligned,
      backgroundImage: node.type === "widget" ? serializeImage(node.backgroundImage) : null,
      children: node.children.map((child) => serializeNode(child))
    };
  }

  if (node.type === "text") {
    return {
      type: "text",
      text: node.text,
      font: node.font ? { name: node.font.name, size: node.font.size } : null,
      textColor: toCssColor(node.textColor)
    };
  }

  if (node.type === "image") {
    return {
      type: "image",
      image: serializeImage(node.image),
      imageSize: node.imageSize
        ? { width: node.imageSize.width, height: node.imageSize.height }
        : null,
      cornerRadius: node.cornerRadius
    };
  }

  if (node.type === "spacer") {
    return {
      type: "spacer",
      length: node.length
    };
  }

  throw new Error(`Unsupported node type: ${node.type}`);
}

function createScriptableRuntime(family) {
  function exposeLocalAsset(filePath) {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(ROOT)) {
      throw new Error(`Asset is outside the workspace: ${resolvedPath}`);
    }
    return `/assets/${encodeURIComponent(path.basename(resolvedPath))}`;
  }

  class ScriptableImage {
    constructor({ src, kind }) {
      this.src = src;
      this.kind = kind;
    }

    static fromFile(filePath) {
      return new ScriptableImage({
        src: exposeLocalAsset(filePath),
        kind: "local"
      });
    }
  }

  class ScriptableFont {
    constructor(name, size) {
      this.name = name;
      this.size = size;
    }
  }

  class ScriptableColor {
    constructor(hex, alpha = 1) {
      this.hex = hex;
      this.alpha = alpha;
    }
  }

  class ScriptableSize {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
  }

  class Request {
    constructor(url) {
      this.url = url;
      this.method = "GET";
      this.headers = {};
      this.body = undefined;
    }

    async loadJSON() {
      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${body}`);
      }

      return response.json();
    }

    async loadImage() {
      return new ScriptableImage({ src: this.url, kind: "remote" });
    }
  }

  class TextNode {
    constructor(text) {
      this.type = "text";
      this.text = text;
      this.font = null;
      this.textColor = null;
    }
  }

  class ImageNode {
    constructor(image) {
      this.type = "image";
      this.image = image;
      this.imageSize = null;
      this.cornerRadius = 0;
    }
  }

  class BaseContainer {
    constructor(type) {
      this.type = type;
      this.layout = "vertical";
      this.centerAligned = false;
      this.bottomAligned = false;
      this.children = [];
    }

    addStack() {
      const stack = new Stack();
      this.children.push(stack);
      return stack;
    }

    addText(text) {
      const node = new TextNode(text);
      this.children.push(node);
      return node;
    }

    addImage(image) {
      const node = new ImageNode(image);
      this.children.push(node);
      return node;
    }

    addSpacer(length = null) {
      this.children.push({ type: "spacer", length });
    }

    layoutVertically() {
      this.layout = "vertical";
    }

    layoutHorizontally() {
      this.layout = "horizontal";
    }

    centerAlignContent() {
      this.centerAligned = true;
    }

    bottomAlignContent() {
      this.bottomAligned = true;
    }
  }

  class Stack extends BaseContainer {
    constructor() {
      super("stack");
    }
  }

  class ListWidget extends BaseContainer {
    constructor() {
      super("widget");
      this.backgroundImage = null;
      this.presentedFamily = family;
    }

    async presentSmall() {
      this.presentedFamily = "small";
    }

    async presentMedium() {
      this.presentedFamily = "medium";
    }

    async presentLarge() {
      this.presentedFamily = "large";
    }
  }

  class FileManager {
    static iCloud() {
      return new FileManager();
    }

    documentsDirectory() {
      return ROOT;
    }

    joinPath(basePath, childPath) {
      return path.join(basePath, childPath);
    }

    fileExists(filePath) {
      return fs.existsSync(filePath);
    }
  }

  const scriptState = {
    widget: null
  };

  const Script = {
    setWidget(widget) {
      scriptState.widget = widget;
    },
    complete() {}
  };

  return {
    globals: {
      Request,
      ListWidget,
      Font: ScriptableFont,
      Color: ScriptableColor,
      Image: ScriptableImage,
      FileManager,
      Size: ScriptableSize,
      Script,
      config: {
        runsInWidget: true,
        widgetFamily: family
      }
    },
    scriptState
  };
}

async function executeScriptableWidget(family) {
  const runtime = createScriptableRuntime(family);
  const source = readSource();
  const globalNames = Object.keys(runtime.globals);
  const globalValues = Object.values(runtime.globals);
  const runner = new AsyncFunction(...globalNames, source);

  await runner(...globalValues);

  if (!runtime.scriptState.widget) {
    throw new Error("The Scriptable file did not call Script.setWidget().");
  }

  return {
    family,
    widget: serializeNode(runtime.scriptState.widget)
  };
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (staticFiles.has(url.pathname)) {
      const asset = staticFiles.get(url.pathname);
      sendFile(response, asset.filePath, asset.contentType);
      return;
    }

    if (url.pathname.startsWith("/assets/")) {
      const fileName = decodeURIComponent(url.pathname.slice("/assets/".length));
      const filePath = path.join(ROOT, fileName);

      if (!fs.existsSync(filePath)) {
        sendJson(response, 404, { error: "Asset not found" });
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = extension === ".png" ? "image/png" : "application/octet-stream";
      sendFile(response, filePath, contentType);
      return;
    }

    if (url.pathname === "/api/widget") {
      const family = normalizeFamily(url.searchParams.get("family"));
      const payload = await executeScriptableWidget(family);
      sendJson(response, 200, payload);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}`);
});