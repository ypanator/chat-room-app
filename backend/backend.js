import { WebSocketServer } from 'ws';
import errorcodes from '../errorcodes.js';

const wss = new WebSocketServer({ port: 8082 });
const rooms = new Map();

function sendError(ws, code) {
    ws.send(JSON.stringify({ type: "error", code: code }));
}

function sendInfo(ws, roomId) {
    ws.send(JSON.stringify({ type: "info", roomId: roomId }));
}

function sendMsg(ws, text) {
    ws.send(JSON.stringify({ type: "msg", text: text }));
}

function broadcast(sockets, text) {
    sockets.forEach((s) => {
        if (s.readyState === WebSocket.OPEN)
            sendMsg(s, text);
    });
}

function joinMsg(username) {
    return `${username} has joined the room.`;
}

function chatMsg(username, text) {
    return `${username}: ${text}`;
}

const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateRoomId() {
    let result = ""
    for (let i = 0; i < 6; i++) {
        result += characterSet.charAt(Math.floor(Math.random() * 62));
    }
    return result;
}

wss.on('connection', function connection(ws) {
    let roomId = null;
    let username = null;

    ws.on('message', function message(data) {
        msg = JSON.parse(data);
        
        if (msg.type === "init") {
            let action = null;
            try {
                roomId = msg.roomId;
                username = msg.username;
                action = msg.action;
            } catch (e) {
                sendError(ws, errorcodes.INVALID_MSG);
            }

            if (username === null || username.trim() === "") {
                sendError(ws, errorcodes.INVALID_USERNAME);
                return;
            }

            if (action === "create") {
                roomId = generateRoomId();
                rooms.set(roomId, [ws]);
                sendInfo(ws, roomId);

            } else if (action === "join") {
                if (!rooms.has(roomId)) {
                    sendError(ws, errorcodes.INVALID_ROOMID);
                    return;
                }
                rooms.get(roomId).push(ws);

            } else {
                sendError(ws, errorcodes.INVALID_MSG);
                return;
            }
            broadcast(rooms.get(roomId), joinMsg(username));

        } else if (msg.type === "msg") {
            broadcast(rooms.get(roomId), chatMsg(username, msg.text));

        } else {
            sendError(ws, errorcodes.INVALID_MSG_TYPE);
        }
    });
    
    ws.on('error', console.error);
});