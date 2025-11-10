import mysql from "mysql2/promise";

const dbwrap = {
    pool: null,

    start: () => {
        if (dbwrap.pool !== null) throw new Error("Database connection already started");
        dbwrap.pool = mysql.createPool({
            host: "database",
            user: "root",
            password: "root",
            database: "messages",
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });
    },

    end: () => {
        if (dbwrap.pool === null) throw new Error("Database connection not started");
        const p = dbwrap.pool.end();
        dbwrap.pool = null;
        return p; // returns a Promise
    },

    saveMsg: (msg, roomId) => {
        if (dbwrap.pool === null) return Promise.reject(new Error("Database connection not started"));
        const query = "INSERT INTO messages (roomId, msg) VALUES (?, ?)";
        return dbwrap.pool.execute(query, [roomId, msg]).then(([result]) => result);
    },

    getHistory: (roomId) => {
        if (dbwrap.pool === null) return Promise.reject(new Error("Database connection not started"));
        const query = "SELECT * FROM messages WHERE roomId = ? ORDER BY id ASC LIMIT 50";
        return dbwrap.pool.execute(query, [roomId]).then(([rows]) => rows);
    }
};

export default dbwrap;