const functions = require("firebase-functions");

const app = require("express")();

const { getAllPosts, createPost } = require("./handlers/posts");
const { signUp, login } = require("./handlers/users");
const { DBAuth } = require("./util/DBAuth");

// Social media post routes
app.get("/posts", getAllPosts);
app.post("/newPost", DBAuth, createPost);

// User routes
app.post("/signup", signUp);
app.post("/login", login);

exports.api = functions.https.onRequest(app);
