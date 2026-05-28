require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());

app.use("/users", require("./routes/users"));
app.use("/builds", require("./routes/builds"));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
