import { describe, expect, it, vi } from "vitest";
import { createScheduler } from "../../src/core/scheduler";

describe("scheduler", () => {
  it("forwards callbacks and delays to the runtime timer", () => {
    const cancel = vi.fn();
    const setInterval = vi.fn(() => cancel);
    const callback = vi.fn();

    expect(createScheduler(setInterval).every(2_500, callback)).toBe(cancel);
    expect(setInterval).toHaveBeenCalledWith(callback, 2_500);
  });
});
