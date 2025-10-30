const msgBoxEl = document.getElementById("msgBox");

const SERVER_URL = "ws://backend:8080";
let ws;

function connect() {
    ws = new WebSocket(SERVER_URL);
    
    // connection timeout if still CONNECTING after 5s
    const connectTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
            insertMsg("WebSocket connection timed out");
            ws.close(); // will trigger close event
        }
    }, 5000);
    
    ws.addEventListener("open", () => {
        // TODO:
        clearTimeout(connectTimeout);
        insertMsg("WebSocket connected");
    });
    
    ws.addEventListener("message", (ev) => {
        // TODO:
        insertMsg("recv: " + ev.data);
    });
    
    ws.addEventListener("error", (ev) => {
        insertMsg("WebSocket error (check server logs)");
        // note: event provides little detail — use close event and server logs
    });
    
    ws.addEventListener("close", (ev) => {
        insertMsg(`WebSocket closed (code=${ev.code}, reason=${ev.reason || "none"})`);
        // optional: try to reconnect after a delay
        setTimeout(connect, 1000);
    });
}

function sendMsg(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
    } else {
        insertMsg("Cannot send — socket not open");
    }
}

function insertMsg(msg) {
    msgBoxEl.textContent += msg + "\n";
}

// call once on page load (or from DOMContentLoaded / deferred script)
connect();