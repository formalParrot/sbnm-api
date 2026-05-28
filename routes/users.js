const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.run(
    `
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `,
    [username, hash],
    function (err) {
      if (err) {
        return res.status(400).json({
          error: err.message,
        });
      }

      res.json({
        success: true,
        userId: this.lastID,
      });
    },
  );
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    `
      SELECT * FROM users
      WHERE username = ?
    `,
    [username],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        },
      );

      res.json({
        token,
      });
    },
  );
});

router.get("/", (req, res) => {
  db.all("SELECT id, username, created_at FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  db.get(
    "SELECT id, username, created_at FROM users WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    },
  );
});

module.exports = router;
