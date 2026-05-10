# Test Plan: Notification Alarm E2E

Verifies the full alarm path: a card becoming due triggers a Chrome notification without reloading the extension or restarting Chrome.

---

## Prerequisites

### macOS Notification Settings

Two entries need to be enabled in **System Settings → Notifications**:

| App | Setting |
|-----|---------|
| **Google Chrome** | Allow Notifications — Alert style: **Alerts** |
| **Google Chrome Helper (Alerts)** | Allow Notifications — Alert style: **Alerts** |

> If either entry is missing, trigger a test Chrome notification first so macOS registers the app. Both must be set to **Alerts** (not Banners or None) for the notification to persist on screen.

### Extension Build

Rebuild from main and reload before running this test.

```bash
npm run build
```

Then go to `chrome://extensions` → find **CogniPace** → click the **reload icon** (↺).

---

## Test Steps

### 1. Open the Service Worker console

`chrome://extensions` → CogniPace → **Service Worker** (Inspect) → Console tab.

### 2. Run the setup script

Paste the following into the console and press Enter:

```javascript
// Clear any existing state
await chrome.notifications.clear("cognipace-due");
await chrome.alarms.clearAll();
console.log("🧹 Cleared alarms and notifications");

// Alarm fires at dailyTime. Set it 2 minutes from now.
const fireAt = new Date(Date.now() + 2 * 60 * 1000);
const dailyTime = `${String(fireAt.getHours()).padStart(2, "0")}:${String(fireAt.getMinutes()).padStart(2, "0")}`;

// Card reviewed 2 days ago with low stability → retrievability ≈ 0.018, well below target
const lastReview = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

const existing = await chrome.storage.local.get("leetcode_spaced_repetition_data_v2");
const data = existing["leetcode_spaced_repetition_data_v2"] ?? {};

await chrome.storage.local.set({
  "leetcode_spaced_repetition_data_v2": {
    ...data,
    problemsBySlug: {
      ...(data.problemsBySlug ?? {}),
      "two-sum": {
        id: "two-sum", leetcodeSlug: "two-sum", slug: "two-sum",
        title: "Two Sum", difficulty: "Easy", isPremium: false,
        url: "https://leetcode.com/problems/two-sum/",
        topics: [], topicIds: [], companyIds: [], sourceSet: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    },
    studyStatesBySlug: {
      ...(data.studyStatesBySlug ?? {}),
      "two-sum": {
        suspended: false, tags: [], attemptHistory: [],
        fsrsCard: {
          due: fireAt.toISOString(),
          stability: 0.5,
          difficulty: 5.0,
          elapsedDays: 2,
          scheduledDays: 1,
          learningSteps: 0,
          reps: 1,
          lapses: 0,
          state: "Review",
          lastReview: lastReview,
        },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    },
    settings: {
      ...data.settings,
      notifications: { enabled: true, dailyTime },
      memoryReview: { ...(data.settings?.memoryReview ?? {}), targetRetention: 0.9 },
    },
  }
});
console.log("✅ Storage written");
console.log(`⏰ Alarm will fire at: ${fireAt.toLocaleTimeString()} (dailyTime = ${dailyTime})`);
```

### 3. Verify the alarm was scheduled

Run immediately after the setup script:

```javascript
const alarms = await chrome.alarms.getAll();
console.log(alarms.map(a => ({
  name: a.name,
  firesAt: new Date(a.scheduledTime).toLocaleTimeString(),
  inSeconds: Math.round((a.scheduledTime - Date.now()) / 1000) + "s"
})));
```

**Expected:** one alarm named `due-check` firing ~2 minutes out.  
**If empty:** the build is stale — rebuild and reload, then restart from Step 1.

### 4. Wait for the notification

Wait until the scheduled time. A CogniPace notification should appear on screen:

> **CogniPace reviews due**  
> You have 1 review due today.

### 5. Confirm end-to-end

After the notification appears (or after the scheduled time if you missed it):

```javascript
await chrome.notifications.getAll();
// Expected: { "cognipace-due": true }

await chrome.alarms.getAll();
// Expected: alarm still present — daily alarm repeats every 24h
```

---

## Pass Criteria

| Check | Expected |
|-------|----------|
| Alarm created after storage write | `due-check` visible in `getAll()` with correct scheduled time |
| Alarm fires at scheduled time | Notification appears on screen |
| Notification created | `{ "cognipace-due": true }` in `chrome.notifications.getAll()` |
| Notification visible on screen | Alert appears in top-right corner of screen |

All four must pass for the test to be considered green.

---

## Cleanup

To restore your storage to its previous state after testing:

```javascript
const d = await chrome.storage.local.get("leetcode_spaced_repetition_data_v2");
const data = d["leetcode_spaced_repetition_data_v2"] ?? {};
const { "two-sum": _, ...restStates } = data.studyStatesBySlug ?? {};
const { "two-sum": __, ...restProblems } = data.problemsBySlug ?? {};
await chrome.storage.local.set({
  "leetcode_spaced_repetition_data_v2": {
    ...data,
    studyStatesBySlug: restStates,
    problemsBySlug: restProblems,
  }
});
await chrome.notifications.clear("cognipace-due");
console.log("✅ Cleaned up test data");
```
