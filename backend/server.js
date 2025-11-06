import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8082 });
const rooms = new Map(); // roomId -> [sockets]

const CONNECTION_ERR = "connection error"
const INVALID_USERNAME = "invalid username"
const INVALID_MSG_TYPE = "invalid message type"
const NOT_IN_ROOM = "not in room"
const INVALID_MSG = "invalid message"
const INVALID_INIT_STATE = "invalid init state; this should not happen"
const ALREADY_INITIALIZED = "user already initialized"
const NOT_INITIALIZED = "user not yet initialized"
const INVALID_ROOMID = "invalid room id"

let initalized = false;

// -----------------------------------------------------------
// -------------------- Message Templates --------------------
// -----------------------------------------------------------

// By default, error closes the connection
function sendError(ws, error, close = true) {
    ws.send(JSON.stringify({ type: "error", error: error }));
    if (close) { ws.close(); }
}

function sendInfo(ws, roomId) {
    ws.send(JSON.stringify({ type: "info", roomId: roomId }));
}

function sendMsg(ws, text) {
    ws.send(JSON.stringify({ type: "msg", text: text }));
}

function joinMsg(username) {
    return `${username} has joined the room.`;
}

function chatMsg(username, text) {
    return `${username}: ${text}`;
}

// -----------------------------------------------------------
// -------------------- Utility Methods ----------------------
// -----------------------------------------------------------

function broadcast(sockets, text) {
    sockets.forEach((s) => {
        if (s.readyState === WebSocket.OPEN)
            sendMsg(s, text);
    });
}

const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateRoomId() {
    let result = ""
    for (let i = 0; i < 6; i++) {
        result += characterSet.charAt(Math.floor(Math.random() * 62));
    }
    return result;
}

// -----------------------------------------------------------
// -------------------- WebSocket Server ---------------------
// -----------------------------------------------------------

function handleInitMsg(msg, ws) {
    let action = null;
    let roomId = null;
    let username = null;
    try {
        roomId = msg.roomId;
        username = msg.username;
        action = msg.action;
    } catch (e) {
        sendError(ws, INVALID_MSG);
    }

    if (username === null || username.trim() === "") {
        sendError(ws, INVALID_USERNAME);
        return;
    }

    if (action === "create") {
        roomId = generateRoomId();
        rooms.set(roomId, [ws]);
        sendInfo(ws, roomId);

    } else if (action === "join") {
        if (!rooms.has(roomId)) {
            sendError(ws, INVALID_ROOMID);
            return;
        }
        rooms.get(roomId).push(ws);

    } else {
        sendError(ws, INVALID_MSG);
        return;
    }
    broadcast(rooms.get(roomId), joinMsg(username));

    return { roomId, username };
}

wss.on('connection', function connection(ws) {
    let roomId = null;
    let username = null;

    ws.on('message', function message(data) {
        msg = JSON.parse(data);
        
        if (msg.type === "init") {
            if (initalized) {
                sendError(ws, ALREADY_INITIALIZED, false);
                return;
            }

            let data = handleInitMsg(msg, ws);
            
            if (data) {
                roomId = data.roomId;
                username = data.username;
                initalized = true;
            } else {
                sendError(ws, INVALID_INIT_STATE);
                return;
            }      

        } else if (msg.type === "msg") {
            if (!initalized) {
                sendError(ws, NOT_INITIALIZED, false);
                return;
            }
            if (roomId === null) {
                sendError(ws, NOT_IN_ROOM);
                return;
            }
            if (username === null) {
                sendError(ws, INVALID_USERNAME);
                return;
            }
            broadcast(rooms.get(roomId), chatMsg(username, msg.text));

        } else {
            sendError(ws, INVALID_MSG_TYPE);
        }
    });
    
    ws.on('close', function() {
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            const index = room.indexOf(ws);
            if (index > -1) {
                room.splice(index, 1);
            }
            if (room.length === 0) {
                rooms.delete(roomId);
            }
        }
    });

    ws.on('error', console.error);
});