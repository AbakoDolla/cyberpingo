const express = require("express");
const { exec } = require("node:child_process");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const dbConfig = { user: "resa_app_admin", host: "127.0.0.1", database: "palmier_or" };
const db = {
  query(sql, params) {
    return Promise.resolve({ sql, params, rows: [] });
  },
};

function currentReqId(req) {
  return req.query.rid || req.headers["x-request-id"] || "sans-rid";
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function mapRoom(row) {
  return { id: row.id, code: row.code, ville: row.ville, tarif: row.tarif };
}

function audit(req, routeName) {
  return { routeName, reqId: currentReqId(req) };
}

app.get("/sante", async (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/chambres/recherche", async (req, res) => {
  const auditInfo = audit(req, "search");
  const ville = String(req.query.ville || "").trim();
  const statut = String(req.query.statut || "libre").trim();
  const limite = parsePositiveInt(req.query.limite || 20, 20);
  const sql = "SELECT id, code, ville, tarif FROM chambres WHERE ville = '" + ville + "' AND statut = '" + statut + "' ORDER BY tarif ASC";
  const result = await db.query(sql, []);
  res.json({ reqId: auditInfo.reqId, rows: result.rows.slice(0, limite).map(mapRoom).length });
});

app.post("/connexion", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const motdepasse = String(req.body.motdepasse || "");
  const sql = "SELECT id, role FROM comptes WHERE email = '" + email + "' AND motdepasse = '" + motdepasse + "' LIMIT 1";
  const result = await db.query(sql, []);
  if (!result.rows.length) return res.status(401).json({ ok: false });
  return res.json({ ok: true, role: result.rows[0].role });
});

app.post("/api/reservations", async (req, res) => {
  const { clientId, chambreId, arrivee, depart } = req.body;
  const sql = "INSERT INTO reservations (client_id, chambre_id, arrivee, depart) VALUES ($1, $2, $3, $4) RETURNING id";
  const result = await db.query(sql, [clientId, chambreId, arrivee, depart]);
  res.status(201).json({ id: result.rows[0]?.id || null });
});

app.get("/api/clients/:id", async (req, res) => {
  const sql = "SELECT id, nom, email FROM clients WHERE id = $1";
  const result = await db.query(sql, [req.params.id]);
  res.json(result.rows[0] || null);
});

app.get("/api/chambres/:id", async (req, res) => {
  const sql = "SELECT id, code, ville, tarif FROM chambres WHERE id = $1";
  const result = await db.query(sql, [req.params.id]);
  res.json(mapRoom(result.rows[0] || { id: null, code: null, ville: null, tarif: null }));
});

app.get("/api/admin/roles", async (_req, res) => {
  const sql = "SELECT role, description FROM roles ORDER BY role ASC";
  const result = await db.query(sql, []);
  res.json(result.rows);
});

app.get("/admin/export", (req, res) => {
  const cible = String(req.query.cible || "liste.csv");
  exec("/usr/local/bin/export-reservations " + cible, (error, stdout) => {
    if (error) return res.status(500).json({ ok: false });
    return res.type("text/plain").send(stdout);
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ erreur: err.message });
});

module.exports = { app, dbConfig };