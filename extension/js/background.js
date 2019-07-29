/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let triggeringTabId;
let extensionTabId;

browser.browserAction.onClicked.addListener(async (triggeringTab) => {
  // set triggeringTabId
  triggeringTabId = triggeringTab.id;
  console.debug(`the tab that the user was on when triggering this action has ID ${triggeringTabId}`);

  triggerExtension();
});

browser.runtime.onInstalled.addListener(async ({ reason, temporary, }) => {
  if (temporary) return; // skip during development
  switch (reason) {
    case "install": {
      const url = browser.runtime.getURL("https://www.mozilla.org/en-US/"); // redirect the user to the onboarding page (TBD once launched)
      await browser.tabs.create({ url, });
    } break;
  }
});

browser.omnibox.setDefaultSuggestion({
  description: `Control Firefox through a text command (e.g. Play Hamilton on YouTube)`
});

browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const intentData = parseIntent(text);
  console.log(intentData);
  executeIntentForAction(intentData);
});

const triggerExtension = async () => {
  const url = "https://jcambre.github.io/vf/";
  let tab = await browser.tabs.create({url});
  extensionTabId = tab.id;
  const intervalConnection = setInterval(() => {
    browser.tabs
      .sendMessage(tab.id, {
        msg: "background script syn",
      })
      .then((response) => {
        clearInterval(intervalConnection);
      })
      .catch((error) => {
        // console.error(`Not connected yet. Retrying ${error}`);
      });
  }, 100);
  // TODO: find a better way of loading moment.js onto the splash page?
  await browser.tabs.executeScript(
    tab.id, {
      file: "/js/vendor/moment.min.js"
  });
  await browser.tabs.executeScript(
    tab.id, {
      file: "/js/display-history.js"
  });
}