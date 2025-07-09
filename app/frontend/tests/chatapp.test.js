/**
 * @jest-environment jsdom
 */
import { jest } from "@jest/globals";

// Ein Mock-Constructor, dessen Instanzen eine destroy()-Methode haben
const destroyMock = jest.fn();
const ChatControllerMock = jest.fn().mockImplementation(() => ({
  destroy: destroyMock,
}));

// Mocking VOR dem Import von ChatApp
jest.unstable_mockModule(
  "../components/ChatController.js",
  () => ({
    __esModule: true,
    default: ChatControllerMock,
  }),
);

const ChatController = (await import(
  "../components/ChatController.js"
)).default;
await import("../components/ChatApp.js"); // Registriert <chat-app>

describe("<chat-app> Web Component", () => {
  beforeEach(() => {
    // stub fetch für loadTemplate()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <link rel="stylesheet" href="/components/chat.css">
        <div id="chat-template">OK</div>
      `,
    });
    ChatControllerMock.mockClear();
    destroyMock.mockClear();
    document.body.innerHTML = "";
  });

  it("ist als Custom Element registriert", () => {
    expect(customElements.get("chat-app")).toBeDefined();
  });

  it("lädt das Template und instanziiert ChatController korrekt", async () => {
    const HASH =
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const ROOM = "MeinRaum";
    const el = document.createElement("chat-app");
    el.setAttribute("room-hash", HASH);
    el.setAttribute("room-name", ROOM);
    document.body.appendChild(el);

    // Warte auf das asynchrone connectedCallback
    await new Promise((resolve) => setTimeout(resolve, 0));

    // fetch sollte auf /components/chat-template.html zeigen
    const expectedUrl = `${window.location.origin}/components/chat-template.html`;
    expect(fetch).toHaveBeenCalledWith(expectedUrl);

    // ChatController wurde instanziiert
    expect(ChatControllerMock).toHaveBeenCalledTimes(1);
    const [shadowRoot, cfg] = ChatControllerMock.mock.calls[0];
    expect(shadowRoot).toBe(el.shadowRoot);
    expect(cfg).toMatchObject({
      roomHash: HASH,
      roomName: ROOM,
      httpBase: window.location.origin,
      wsBase: expect.stringMatching(/^wss?:\/\/.+/),
    });

    // Und beim Entfernen (Teardown) ruft disconnectedCallback destroy() auf
    document.body.removeChild(el);
    expect(destroyMock).toHaveBeenCalled();
  });
});
