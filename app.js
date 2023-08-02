const express = require("express");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname,"userData.db");

const bcrypt = require("bcrypt"); 

const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async (request, response) => {
    try {
            db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/");
        });
    } catch(e) {
        console.log("DB Error: ${e.message}");
        process.exit(1);
    }
}

initializeDBAndServer();

//Register API
app.post("/register", async (request, response) => {
    const {username, name, password, gender, location} = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined){
        const createUserQuery = `
        INSERT INTO
          user (username, name, password, gender, location)
        VALUES (
          '${username}',
          '${name}',
          '${hashedPassword}',
          '${gender}',
          '${location}'
        );`;
        if (password.length < 5) {
            response.status(400);
            response.send("Password is too short");
        } else {
            await db.run(createUserQuery);
            response.send("User created successfully");
        }
    } else {
        response.status(400);
        response.send("User already exists");
    }
});

//Login API
app.post("/login", async (request, response) => {
    const {username, password} = request.body;
    const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
    } else {
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
        if (isPasswordMatched) {
            response.status(200);
            response.send("Login success!");
        } else {
            response.status(400);
            response.send("Invalid password");
        }
    }
});

//Change Password API
app.put("/change-password", async (request, response) => {
    const {username, oldPassword, newPassword} = request.body;
    const checkUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${username}';`;
    const dbUser = await db.get(checkUserQuery);
    if (dbUser === undefined){
        response.status(400);
        response.send("User not registered");
    } else {
        const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
        if (isPasswordMatched === true) {
            if (newPassword.length < 5) {
                response.status(400);
                response.send("Password is too short");
            } else {
                const encryptedPassword = await bcrypt.hash(newPassword, 10);
                const updatePasswordQuery = `
                UPDATE
                  user
                SET
                  password = '${encryptedPassword}'
                WHERE
                  username = '${username}';`;
                await db.run(updatePasswordQuery);
                response.status(200);
                response.send("Password updated");
            }
        } else {
            response.status(400);
            response.send("Invalid current password");
        }
    }
});

module.exports = app;