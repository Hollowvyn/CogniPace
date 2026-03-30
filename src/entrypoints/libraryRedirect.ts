/** Redirect entrypoint for the legacy library page alias. */
const current = new URL(window.location.href);
const redirect = new URL(chrome.runtime.getURL("dashboard.html"));
redirect.searchParams.set("view", "library");

const topic = current.searchParams.get("topic");
if (topic) {
  redirect.searchParams.set("topic", topic);
}

window.location.replace(redirect.toString());
