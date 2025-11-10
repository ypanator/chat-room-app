import { WebSocketServer, WebSocket } from 'ws';
import dbwrap from './dbwrap.js';

dbwrap.start();

const wss = new WebSocketServer({ port: 8081 });
// TODO: change to a Map of Sets
const rooms = new Map(); // roomId -> [sockets]

const CONNECTION_ERR = "connection error";
const INVALID_USERNAME = "invalid username";
const INVALID_MSG_TYPE = "invalid message type";
const NOT_IN_ROOM = "not in room";
const INVALID_MSG = "invalid message";
const INVALID_INIT_STATE = "invalid init state; this should not happen";
const ALREADY_INITIALIZED = "user already initialized";
const NOT_INITIALIZED = "user not yet initialized";
const INVALID_ROOMID = "invalid room id";
const HISTORY_FAILED = "fetching history failed";

// -----------------------------------------------------------
// -------------------- Message Templates --------------------
// -----------------------------------------------------------

function sendHistory(ws, history) {
    ws.send(JSON.stringify({ type: "history", history: history }));
}

function sendError(ws, error) {
    ws.send(JSON.stringify({ type: "error", error: error }));
    ws.close();
}

function sendWarning(ws, warning) {
    ws.send(JSON.stringify({ type: "warning", warning: warning }));
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

function broadcastAndSave(roomId, text) {
    let sockets = rooms.get(roomId);
    if (!sockets) {
        console.warn('broadcastAndSave: unknown roomId', roomId);
        return;
    }

    broadcast(sockets, text);
    // fire-and-forget but catch errors so they don't become unhandled rejections
    dbwrap.saveMsg(text, roomId).catch((err) => {
        console.error('dbwrap.saveMsg failed', err);
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

async function handleInitMsg(msg, ws) {
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

        // dbresponse: [rows, fields]
        let dbresponse = null;
        try {
            dbresponse = await dbwrap.getHistory(roomId);
        } catch (err) {
            console.error('dbwrap.getHistory failed', err);
            sendWarning(ws, HISTORY_FAILED);
            return;
        }
        let history = dbresponse[0].map((row) => row.msg);
        if (history.length >= 1) { sendHistory(ws, history); }

    } else {
        sendError(ws, INVALID_MSG);
        return;
    }
    broadcastAndSave(roomId, joinMsg(username));

    return { roomId, username };
}

wss.on('connection', function connection(ws) {
    let initialized = false;
    let roomId = null;
    let username = null;

    ws.on('message', async function message(data) {
        let msg = JSON.parse(data);
        
        if (msg.type === "init") {
            if (initialized) {
                sendWarning(ws, ALREADY_INITIALIZED);
                return;
            }

            let data = await handleInitMsg(msg, ws);
            
            if (data) {
                roomId = data.roomId;
                username = data.username;
                initialized = true;
            } else {
                sendError(ws, INVALID_INIT_STATE);
                return;
            }      

        } else if (msg.type === "msg") {
            if (!initialized) {
                sendWarning(ws, NOT_INITIALIZED);
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
            broadcastAndSave(roomId, chatMsg(username, msg.text));

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