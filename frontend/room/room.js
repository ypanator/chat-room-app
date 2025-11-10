const msgBoxEl = document.getElementById("msgBox");
const msgInputEl = document.getElementById("msgInput");
const msgSendBtn = document.getElementById("msgSend");
const roomIdValueEl = document.getElementById("roomIdValue");

const SERVER_URL = "ws://localhost:8082";
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

function insertHistory(history) {
    let fullHistory = ""
    history.forEach((m) => fullHistory += m + "\n");
    msgBoxEl.textContent = fullHistory + msgBoxEl.textContent;
}

//---------------------------------------------------------------------
// ----------------- WebSocket utility methods ------------------------
//---------------------------------------------------------------------

function sendMsg(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
            type: "msg", 
            text: msg 
        }));
    } else {
        insertMsg("Cannot send — socket not open");
        console.log("Failed to send User message.");
    }
}

function sendInit() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
            type: "init", 
            action: action, 
            roomId: roomId,
            username: username
        }));
    } else {
        insertMsg("Cannot send — socket not open");
        console.log("Failed to send init message.");
    }
}

//---------------------------------------------------------
// ----------------- WebSocket connection  ----------------
//---------------------------------------------------------

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
        sendInit();
    });
    
    ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);

        if (msg.type === "msg") {
            insertMsg(msg.text);
            return;
        }
        if (msg.type === "history") {
            insertHistory(msg.history);
            return;
        }
        if (msg.type === "info") {
            roomIdValueEl.textContent = msg.roomId;
            return;
        }
        if (msg.type === "error") {
            alert(msg.error);
            document.location.href = "../home/index.html";
            return;
        }
        if (msg.type === "warning") {
            alert(msg.warning);
            return;
        }
    });
    
    ws.addEventListener("error", (ev) => {
        insertMsg("WebSocket error (check server logs)");
    });
    
    let retryCount = 0;
    const MAX_RETRIES = 5;

    ws.addEventListener("close", (ev) => {
        insertMsg(`WebSocket closed (code=${ev.code}, reason=${ev.reason || "none"})`);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(connect, 1000 * retryCount);
        } else {
            alert("Connection lost. Please refresh the page.");
        }
    });
}

window.addEventListener("beforeunload", () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try { ws.close(1000, "Page unload"); } catch (e) { /* ignore */ }
    }
});


connect();