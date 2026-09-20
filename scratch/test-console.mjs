import { spawn } from "node:child_process";

const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--no-sandbox",
    "--disable-gpu",
    "about:blank"
  ]
);

await new Promise(r => setTimeout(r, 1000));

try {
  const listRes = await fetch("http://127.0.0.1:9222/json");
  const list = await listRes.json();
  const page = list.find(p => p.type === "page") || list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise(resolve => {
    ws.onopen = resolve;
  });

  let id = 1;
  const send = (method, params = {}) => {
    ws.send(JSON.stringify({ id: id++, method, params }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.consoleAPICalled") {
      console.log("[CONSOLE]", msg.params.type, JSON.stringify(msg.params.args));
    }
    if (msg.method === "Runtime.exceptionThrown") {
      console.log("[EXCEPTION]", JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
  };

  send("Runtime.enable");
  send("Page.enable");
  send("Page.navigate", { url: "https://app.fizmoh.cloud" });

  await new Promise(r => setTimeout(r, 6000));
  ws.close();
} finally {
  chrome.kill();
}
