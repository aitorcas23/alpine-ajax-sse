import sse from "../src/index";

document.addEventListener("alpine:initializing", () => {
  sse(window.Alpine);
});
