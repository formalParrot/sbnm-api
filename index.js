require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());

app.use("/users", require("./routes/users"));
app.use("/builds", require("./routes/builds"));

app.use("/uploads", express.static(path.join(__dirname, "assets/uploads")));

app.listen(3000, "::", () => {
  console.log("Server running on IPv6 port 3000");
});
