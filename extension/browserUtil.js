this.browserUtil = (function() {
  const exports = {};
  exports.activeTab = async function activeTab() {
    return (await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    }))[0];
  };

  exports.makeTabActive = async function makeTabActive(tab) {
    let tabId;
    if (typeof tab === "string" || typeof tab === "number") {
      // then it's a tab ID
      tabId = tab;
      tab = await browser.tabs.get(tabId);
    } else {
      tabId = tab.id;
    }
    await browser.tabs.update(tabId, { active: true });
    await browser.windows.update(tab.windowId, { focused: true });
  };

  return exports;
})();
