import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  escapeLikeTerm,
  toDateLabel,
  toFeedbackItem,
  toStatus,
  parseFeedbackId,
} from "../src/lib/feedback-format.js";
import { toCategory } from "../src/lib/categories.js";

describe("toStatus", () => {
  it("is Responded once a response exists", () => {
    assert.equal(toStatus({ responseCount: 1, isRead: 1 }), "Responded");
    assert.equal(toStatus({ responseCount: 1, isRead: 0 }), "Responded");
  });

  it("is Acknowledged when read but unanswered", () => {
    assert.equal(toStatus({ responseCount: 0, isRead: 1 }), "Acknowledged");
  });

  it("is New when neither read nor answered", () => {
    assert.equal(toStatus({ responseCount: 0, isRead: 0 }), "New");
  });

  it("treats a string count from the driver as a number", () => {
    assert.equal(toStatus({ responseCount: "2", isRead: 0 }), "Responded");
    assert.equal(toStatus({ responseCount: "0", isRead: 0 }), "New");
  });
});

describe("escapeLikeTerm", () => {
  it("keeps LIKE wildcards literal", () => {
    assert.equal(escapeLikeTerm("100%"), "100!%");
    assert.equal(escapeLikeTerm("a_b"), "a!_b");
  });

  it("escapes the escape character itself", () => {
    assert.equal(escapeLikeTerm("!"), "!!");
  });

  it("leaves ordinary text alone", () => {
    assert.equal(escapeLikeTerm("sprint planning"), "sprint planning");
  });
});

describe("parseFeedbackId", () => {
  it("accepts positive integers", () => {
    assert.equal(parseFeedbackId("42"), 42);
  });

  it("rejects anything else", () => {
    for (const value of ["0", "-1", "1.5", "abc", "", null, "1 OR 1=1"]) {
      assert.equal(parseFeedbackId(value), null, `should reject ${value}`);
    }
  });
});

describe("toDateLabel", () => {
  it("formats a date", () => {
    assert.equal(toDateLabel("2026-08-10T12:00:00Z"), "Aug 10, 2026");
  });

  it("returns an empty string for an unparseable value", () => {
    assert.equal(toDateLabel("not a date"), "");
    assert.equal(toDateLabel(null), "");
  });
});

describe("toFeedbackItem", () => {
  const row = {
    feedbackId: 1,
    categoryId: 3,
    categoryName: "Management & Communication",
    body: "Something worth saying.",
    isRead: 1,
    readAt: "2026-08-10T12:00:00Z",
    createdAt: "2026-08-10T12:00:00Z",
    requiresResponse: 1,
    upCount: "2",
    downCount: "1",
    responseCount: "1",
    response: "We are on it.",
    actionType: "Will do",
    anonymousId: "11111111-1111-1111-1111-111111111111",
  };

  it("never exposes who submitted the feedback", () => {
    const item = toFeedbackItem(row);
    assert.equal(item.anonymousId, undefined);
    assert.ok(!JSON.stringify(item).includes("11111111"));
  });

  it("coerces driver values to the types the UI expects", () => {
    const item = toFeedbackItem(row);
    assert.equal(item.upCount, 2);
    assert.equal(item.downCount, 1);
    assert.equal(item.isRead, true);
    assert.equal(item.requiresResponse, true);
    assert.equal(item.status, "Responded");
  });

  it("turns a missing response into an empty string", () => {
    const item = toFeedbackItem({ ...row, response: null, actionType: null });
    assert.equal(item.response, "");
    assert.equal(item.actionType, "");
  });
});

describe("toCategory", () => {
  it("normalises a null description", () => {
    const category = toCategory({
      categoryId: 1,
      name: "Tools",
      description: null,
      requiresResponse: 0,
    });
    assert.equal(category.description, "");
    assert.equal(category.requiresResponse, false);
  });
});
