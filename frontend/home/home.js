const roomIdEl = document.getElementById("roomId");
const usernameEl = document.getElementById("username");

const createBtn = document.getElementById("create");
const joinBtn = document.getElementById("join");

function saveData(action, roomId, username) {
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("action", action);
}

function verifyAndCleanData() {
    const output = {username: undefined, roomId: undefined};
    const username = usernameEl.value.trim();
    const roomId = roomIdEl.value.trim();

    if (username !== "") { output.username = username; }
    if (roomId !== "") { output.roomId = roomId; }

    return output;
}

createBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const data = verifyAndCleanData();
    if (data.username === undefined) { alert("Username cannot be empty"); return; }

    saveData("create", null, data.username);
    window.location.href = "/chat.html";
});

joinBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const data = verifyAndCleanData();
    if (data.username === undefined) { alert("Username cannot be empty"); return; }
    if (data.roomId === undefined) { alert("RoomId cannot be empty"); return; }

    saveData("join", data.roomId, data.username);
    window.location.href = "/chat.html";
});