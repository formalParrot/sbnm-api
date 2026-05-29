const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
const uploadPath = path.join(__dirname, "../assets/uploads/");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const unique = Date.now() + path.extname(file.originalname);

    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

// BUILD
//

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
        values.push(req.body.description);
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

// ASSET UPLOAD
//

router.get("/:id/assets", (req, res) => {
  db.get(
    "SELECT * FROM assets WHERE build_id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    },
  );
});

router.get("/:id/assets/:assetId", (req, res) => {
  db.get(
    "SELECT * FROM assets WHERE id = ? AND build_id = ?",
    [req.params.id, req.params.assetId],
    (err, row) => {
      if (err) return status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    },
  );
});

router.post("/:id/assets", auth, upload.single("asset"), (req, res) => {
  const buildId = req.params.id;

  if (!req.file) {
    return res.status(400).json({
      error: "No file uploaded",
    });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  db.run(
    `
        INSERT INTO assets (
          build_id,
          uploaded_by,
          type,
          file_url,
          description
        )
        VALUES (?, ?, ?, ?, ?)
        `,
    [
      buildId,
      req.user.id,
      req.body.type,
      fileUrl,
      req.body.description || null,
    ],
    function (err) {
      if (err) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Failed to delete orphaned file:", unlinkErr);
          } else {
            console.log("Successfully deleted orphaned file due to DB error.");
          }
        });

        return res.status(500).json({
          error: err.message,
        });
      }

      res.json({
        success: true,
        assetId: this.lastID,
        fileUrl,
      });
    },
  );
});

router.delete("/:id/assets/:assetId", auth, (req, res) => {
  const buildId = req.params.id;
  const assetId = req.params.assetId;

  db.get(
    "SELECT uploaded_by FROM assets WHERE id = ? AND build_id = ?",
    [assetId, buildId],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.uploaded_by !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      db.run("DELETE FROM assets WHERE id = ?", [assetId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ success: true });
      });
    },
  );
});

module.exports = router;
