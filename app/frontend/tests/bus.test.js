/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { on, off, emit } from "../utils/bus.js";

describe("Event Bus", () => {
  it("ruft den Listener mit dem Event-Detail auf, wenn ein Event ausgelöst wird", () => {
    const handler = jest.fn();
    on("test-event", handler);

    emit("test-event", { foo: "bar" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0];
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.detail).toEqual({ foo: "bar" });

    off("test-event", handler);
  });

  it("ruft den Listener nicht mehr auf, nachdem er entfernt wurde", () => {
    const handler = jest.fn();
    on("another-event", handler);
    off("another-event", handler);

    emit("another-event", {});

    expect(handler).not.toHaveBeenCalled();
  });
});
