const express = require("express");

const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  db.all("SELECT * FROM builds", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  db.get("SELECT * FROM builds WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

router.post("/", auth, (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Name is required",
    });
  }

  db.run(
    `
      INSERT INTO builds (name, description, created_by) VALUES (?, ?, ?)
    `,
    [name, description, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({
          error: err.message,
        });
      }

      res.status(201).json({
        success: true,
        buildId: this.lastID,
      });
    },
  );
});

router.patch("/:id", auth, (req, res) => {
  db.get(
    "SELECT created_by FROM builds WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.created_by !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const fields = [];
      const values = [];

      if (req.body.name !== undefined) {
        fields.push("name = ?");
        values.push(req.body.name);
      }

      if (req.body.description !== undefined) {
        fields.push("description = ?");
        values.push(req.body.name);
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: "Nothing to update" });
      }

      values.push(req.params.id);

      db.run(
        `UPDATE builds SET ${fields.join(", ")} WHERE id = ?`,
        values,
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        },
      );
    },
  );
});

router.delete("/:id", auth, (req, res) => {
  db.get(
    "SELECT created_by FROM builds WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.created_by !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      db.run("DELETE FROM builds WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ success: true });
      });
    },
  );
});

module.exports = router;
