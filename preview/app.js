const widgetHost = document.getElementById("widgetHost");
const status = document.getElementById("status");
const refreshButton = document.getElementById("refreshButton");
const familyButtons = Array.from(document.querySelectorAll("[data-family]"));

let currentFamily = "small";

function fontFamilyFor(fontName) {
  if (!fontName) {
    return '"Avenir Next", "Segoe UI", sans-serif';
  }

  if (fontName.toLowerCase().includes("exo2")) {
    return '"Avenir Next", "Segoe UI", sans-serif';
  }

  return `"${fontName}", "Segoe UI", sans-serif`;
}

function createNode(node, parentLayout = "vertical") {
  if (node.type === "stack") {
    const element = document.createElement("div");
    element.className = `stack ${node.layout}`;
    if (node.centerAlignContent) {
      element.classList.add("centered");
    }
    if (node.bottomAlignContent) {
      element.classList.add("bottom-aligned");
    }

    for (const child of node.children) {
      element.appendChild(createNode(child, node.layout));
    }
    return element;
  }

  if (node.type === "text") {
    const element = document.createElement("p");
    element.className = "text-node";
    element.textContent = node.text;

    if (node.font?.size) {
      element.style.fontSize = `${node.font.size}px`;
    }
    if (node.font?.name) {
      element.style.fontFamily = fontFamilyFor(node.font.name);
    }
    if (node.textColor) {
      element.style.color = node.textColor;
    }

    return element;
  }

  if (node.type === "image") {
    const element = document.createElement("img");
    element.className = "image-node";
    element.src = node.image?.src || "";
    element.alt = "Widget image";

    if (node.imageSize) {
      element.style.width = `${node.imageSize.width}px`;
      element.style.height = `${node.imageSize.height}px`;
    }
    if (node.cornerRadius) {
      element.style.borderRadius = `${node.cornerRadius}px`;
    }

    return element;
  }

  if (node.type === "spacer") {
    const element = document.createElement("div");
    element.className = "spacer-node";

    if (node.length == null) {
      element.style.flex = "1 1 auto";
    } else if (parentLayout === "horizontal") {
      element.style.width = `${node.length}px`;
      element.style.minWidth = `${node.length}px`;
    } else {
      element.style.height = `${node.length}px`;
      element.style.minHeight = `${node.length}px`;
    }

    return element;
  }

  throw new Error(`Unsupported node type: ${node.type}`);
}

function renderWidget(payload) {
  const widget = payload.widget;
  widgetHost.innerHTML = "";
  widgetHost.className = `scriptable-widget family-${payload.family}`;

  if (widget.backgroundImage?.src) {
    widgetHost.style.backgroundImage = `linear-gradient(180deg, rgba(237, 51, 153, 0.18), rgba(186, 17, 119, 0.15)), url("${widget.backgroundImage.src}")`;
  } else {
    widgetHost.style.backgroundImage = "linear-gradient(180deg, rgba(237, 51, 153, 0.18), rgba(186, 17, 119, 0.15))";
  }

  for (const child of widget.children) {
    widgetHost.appendChild(createNode(child, widget.layout));
  }
}

async function loadWidget() {
  status.textContent = `Loading ${currentFamily} widget from original Scriptable file…`;
  refreshButton.disabled = true;

  try {
    const response = await fetch(`/api/widget?family=${encodeURIComponent(currentFamily)}`, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Preview failed");
    }

    renderWidget(payload);
    status.textContent = `Showing ${currentFamily} widget rendered from osu! widget.js.`;
  } catch (error) {
    widgetHost.innerHTML = "";
    status.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
}

for (const button of familyButtons) {
  button.addEventListener("click", () => {
    currentFamily = button.dataset.family;
    for (const candidate of familyButtons) {
      candidate.classList.toggle("active", candidate === button);
    }
    loadWidget();
  });
}

refreshButton.addEventListener("click", loadWidget);

loadWidget();