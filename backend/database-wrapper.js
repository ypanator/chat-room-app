import mysql from "mysql";

const dbwrap = {
    con: null,

    start: () => {
        if (dbwrap.con !== null) throw new Error("Database connection already started");
        dbwrap.con = mysql.createConnection({
            host     : "database",
            user     : "root",
            password : "root",
            database : "messages"
        });
        dbwrap.con.connect();
    },

    end: () => {
        if (dbwrap.con === null) throw new Error("Database connection not started");
        // TODO:
    },

    saveMsg: (msg) => {
        if (dbwrap.con === null) throw new Error("Database connection not started");
        // TODO:
    },

    getHistory: (roomId) => {
        if (dbwrap.con === null) throw new Error("Database connection not started");
        // TODO:
    }
};

/*
var con = mysql.createConnection({
  host     : "database",
  user     : "root",
  password : "root",
  database : "messages"
});
 
con.connect();
 
con.query("SELECT 1 + 1 AS solution", function (error, results, fields) {
  if (error) throw error;
  console.log("The solution is: ", results[0].solution);
});
 
con.end();
*/

export default dbwrap;