const msgBoxEl = document.getElementById("msgBox");
const msgInputEl = document.getElementById("msgInput");
const msgSendBtn = document.getElementById("msgSend");

const SERVER_URL = `ws://backend:8080?roomId=${roomId}&username=${username}`;
let ws;

const roomId = sessionStorage.getItem("roomId");
const username = sessionStorage.getItem("username");
const action = sessionStorage.getItem("action");

if (!username || !action || (action === "join" && !roomId)) {
    alert("Missing or invalid session data, redirecting to home");
    console.log(`Invalid session data: username=${username}, action=${action}, roomId=${roomId}`);
    document.location.href = "../home/index.html";
}

// ------------------------------------------------------
// ----------------- User input handling ----------------
// ------------------------------------------------------

function handleUserInput() {
    const msg = msgInputEl.value.trim();
    if (msg === "") { return; }
    sendMsg(msg);
    msgInputEl.value = "";
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleUserInput();
    }
});

msgSendBtn.addEventListener("click", (e) => {
    e.preventDefault(); // might be useless ??
    handleUserInput();
});

function insertMsg(msg) {
    msgBoxEl.textContent += msg + "\n";
}

//---------------------------------------------------------------------
// ----------------- WebSocket connection and handlers ----------------
//---------------------------------------------------------------------

function sendMsg(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "msg", author: username, text: msg }));
    } else {
        insertMsg("Cannot send — socket not open");
        console.log("Failed to send User message.");
    }
}

function sendAction(action) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "action", action: action, roomId: roomId }));
    } else {
        insertMsg("Cannot send — socket not open");
        console.log("Failed to send initial action.");
    }
}

function connect() {
    ws = new WebSocket(SERVER_URL);
    
    const connectTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
            insertMsg("WebSocket connection timed out");
            ws.close();
            alert("Connection failed, please retry.");
            document.location.href = "../home/index.html";
        }
    }, 5000);
    
    ws.addEventListener("open", () => {
        clearTimeout(connectTimeout);
        sendAction(action);
        insertMsg("WebSocket connected");
    });
    
    ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "msg") {
            insertMsg(msg.text);
            return;
        }
        if (msg.type === "history") {
            msg.text.forEach((m) => insertMsg(m));
            return;
        }
    });
    
    ws.addEventListener("error", (ev) => {
        insertMsg("WebSocket error (check server logs)");
    });
    
    ws.addEventListener("close", (ev) => {
        insertMsg(`WebSocket closed (code=${ev.code}, reason=${ev.reason || "none"})`);
        setTimeout(connect, 1000);
    });
}

window.addEventListener("beforeunload", () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try { ws.close(1000, "Page unload"); } catch (e) { /* ignore */ }
    }
});


connect();