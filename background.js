console.log("Background script loaded");

let panelWindowId = null;

chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked");
  if (panelWindowId) {
    console.log("Attempting to focus existing window");
    chrome.windows.get(panelWindowId, (window) => {
      if (chrome.runtime.lastError) {
        console.log("Error focusing window:", chrome.runtime.lastError);
        createPanelWindow();
      } else {
        chrome.windows.update(panelWindowId, {focused: true});
      }
    });
  } else {
    console.log("Creating new panel window");
    createPanelWindow();
  }
});

function createPanelWindow() {
  chrome.windows.create({
    url: 'panel.html',
    type: 'popup',
    width: 300,
    height: 600
  }, (window) => {
    console.log("New window created", window);
    panelWindowId = window.id;
    // Position the window after it's created
    chrome.windows.update(window.id, {
      left: Math.max(0, window.left),
      top: Math.max(0, window.top)
    });
  });
}

chrome.windows.onRemoved.addListener((windowId) => {
  console.log("Window removed:", windowId);
  if (windowId === panelWindowId) {
    panelWindowId = null;
  }
});