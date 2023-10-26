require("./utils");

require("dotenv").config();

const express = require("express");

// Router logic is included in routes/router.js
const router = include("routes/router");

const port = process.env.PORT || 3000;

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

app.use(express.static("public"));

// Express app uses router
app.use("/", router);

app.listen(port, () => {
  console.log("Node application listening on port " + port);
});
