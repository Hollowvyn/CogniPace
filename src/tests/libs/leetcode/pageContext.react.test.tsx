import {
  detectPremium,
  readProblemPageSnapshot,
} from "@libs/leetcode";
import { describe, expect, it } from "vitest";


describe("overlay page context", () => {
  it("detects a premium marker near the problem heading", () => {
    document.body.innerHTML = `
      <main>
        <section>
          <div>
            <h1>Two Sum</h1>
            <span aria-label="Premium">Premium</span>
          </div>
        </section>
        <nav><a>Premium</a></nav>
      </main>
    `;

    const snapshot = readProblemPageSnapshot(document, "two-sum");

    expect(snapshot.isPremium).toBe(true);
  });

  it("ignores unrelated premium links outside the problem header scope", () => {
    document.body.innerHTML = `
      <nav><a>Premium</a></nav>
      <main>
        <section>
          <div>
            <h1>Two Sum</h1>
          </div>
        </section>
      </main>
    `;

    expect(detectPremium(document)).toBeUndefined();
  });
});
