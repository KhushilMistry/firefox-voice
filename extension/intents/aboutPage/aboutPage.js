/* globals intents, intentRunner, util, pageMetadata */

intents.aboutPage = (function() {
  const HN_SEARCH = "https://hn.algolia.com/api/v1/search?query=__URL__";
  const REDDIT_SEARCH =
    "https://www.reddit.com/search.json?q=url%3A__URL__&restrict_sr=&sort=relevance&t=all";

  const tabResults = new Map();

  async function hnSearchResults(url) {
    const hnUrl = HN_SEARCH.replace("__URL__", encodeURIComponent(url));
    const hnResp = await (await fetch(hnUrl)).json();
    const results = [];
    for (const item of hnResp.hits) {
      results.push({
        created: item.created_at_i,
        title: item.title,
        points: item.points,
        num_comments: item.num_comments,
        url: `https://news.ycombinator.com/item?id=${item.objectID}`,
      });
    }
    return results;
  }

  async function redditSearchResults(url) {
    const redditUrl = REDDIT_SEARCH.replace("__URL__", encodeURIComponent(url));
    const redditResp = await (await fetch(redditUrl)).json();
    const results = [];
    for (const item of redditResp.data.children) {
      results.push({
        created: item.data.created,
        title: item.data.title,
        points: item.data.score,
        num_comments: item.data.num_comments,
        url: `https://www.reddit.com/${item.data.permalink}`,
      });
    }
    return results;
  }

  intentRunner.registerIntent({
    name: "aboutPage.comments",
    description:
      "This will try to find comments for the current page, searching Reddit and Hacker News, showing forums in order of the number of comments",
    examples: ["Comments on this page?"],
    match: `
    (show | open |) comments on (this |) (page | tab | article)
    (show | open |) what are people (saying | talking | commenting) about (this |) (page | tab | article)
    (show | open |) comments (for | on) (this |) (page | tab | article)
    (show | open |) comments
    `,
    async run(context) {
      const activeTab = await context.activeTab();
      const url = (await pageMetadata.getMetadata(activeTab.id)).canonical;
      let results = (await hnSearchResults(url)).concat(
        await redditSearchResults(url)
      );
      results = results.filter(r => {
        return r.num_comments > 0;
      });
      results.sort((a, b) => -util.cmp(a.num_comments, b.num_comments));
      if (!results.length) {
        const e = new Error("No comments on this article");
        e.displayMessage = "Nobody has commented on this article";
        throw e;
      }
      if (results.length > 1) {
        context.displayText(
          `${results.length} comment threads found. Use "next comments" to see more`
        );
        tabResults.set(activeTab.id, results);
      } else {
        context.displayText("Showing the one found comment thread.");
      }
      await browser.tabs.update(activeTab.id, { url: results[0].url });
    },
  });

  intentRunner.registerIntent({
    name: "aboutPage.changeComments",
    description: `If you've used "show comments on this page" and there were multiple forums or pages, this will show the next (or previous) comment forum`,
    match: `
    next (result | comments | comment) [move=next]
    previous (result | comments | comment) [move=previous]
    `,
    async run(context) {
      const activeTab = await context.activeTab();
      const results = tabResults.get(activeTab.id);
      if (!results) {
        const e = new Error("No comment results for this tab");
        e.displayMessage = "No comments results for this tab";
        throw e;
      }
      let index = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i].url === activeTab.url) {
          index = i;
          break;
        }
      }
      index++;
      if (index >= results.length) {
        index = 0;
      }
      await browser.tabs.update(activeTab.id, { url: results[index].url });
    },
  });
})();
