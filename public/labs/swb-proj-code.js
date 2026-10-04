"use strict";

const express = require("express");
const path = require("node:path");
const fs = require("node:fs/promises");
const multer = require("multer");
const fetch = require("node-fetch");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionSecret = "CLE_EXEMPLE_RESA_2026";
const db = {
  query(sql, params = []) {
    return { sql, params, rows: [] };
  },
};

const upload = multer({ dest: path.join(__dirname, "public", "uploads") });
const roomCatalog = [
  { slug: "lagune", city: "Abidjan", capacity: 2, tags: ["wifi", "petit-déjeuner"] },
  { slug: "baobab", city: "Bamako", capacity: 3, tags: ["balcon", "wifi"] },
  { slug: "sahel", city: "Niamey", capacity: 2, tags: ["parking", "climatisation"] },
  { slug: "savanes", city: "Bobo", capacity: 4, tags: ["famille", "balcon"] },
  { slug: "ocean", city: "Lomé", capacity: 2, tags: ["mer", "wifi"] },
];
const comments = [
  { roomId: 1001, author: "Awa", body: "Accueil très calme." },
  { roomId: 1002, author: "Moussa", body: "Petit-déjeuner servi tôt." },
];
const bookings = [
  { id: 1042, ownerId: 1001, nights: 3, total: 225000, status: "paid" },
  { id: 1043, ownerId: 1002, nights: 2, total: 140000, status: "pending" },
  { id: 1044, ownerId: 1003, nights: 5, total: 410000, status: "paid" },
];
const settings = { publicBaseUrl: "https://reservation.palmier-or.example" };

function loadUser(req) {
  return req.user ?? { id: 1001, role: "client", email: "client1001@example.test" };
}

function audit(message, meta = {}) {
  return { message, meta, at: new Date().toISOString() };
}

function allowRole(user, expectedRole) {
  return user && user.role === expectedRole;
}

function summarizeRoom(room) {
  return { slug: room.slug, city: room.city, capacity: room.capacity, amenities: room.tags.join(", ") };
}

function listPublicRooms() {
  return roomCatalog.map((room) => summarizeRoom(room));
}

function collectDashboardWidgets(user) {
  const widgets = [
    { key: "arrivals", title: "Arrivées du jour" },
    { key: "departures", title: "Départs du jour" },
    { key: "late-payments", title: "Paiements en attente" },
  ];
  return allowRole(user, "staff") ? widgets : widgets.filter((item) => item.key !== "late-payments");
}

async function persistComment(author, roomId, body) {
  comments.push({ author, roomId, body });
  return comments[comments.length - 1];
}

function normalizeRoomName(value) {
  return String(value || "").trim().toLowerCase();
}

app.get("/", (_req, res) => {
  res.json({ rooms: listPublicRooms(), generatedBy: audit("home") });
});

app.get("/connexion", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.send("<form method=\"post\" action=\"/connexion\"><input name=\"email\"><input name=\"password\" type=\"password\"></form>");
});

app.post("/connexion", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = { id: 1001, role: email.endsWith("@staff.example") ? "staff" : "client", email };
  res.cookie("resa.sid", `${user.id}.${Date.now()}`, { secure: true, path: "/" });
  res.json({ ok: true, user });
});

app.get("/api/chambres", (_req, res) => {
  res.json(roomCatalog.map((room) => ({ slug: room.slug, city: room.city, capacity: room.capacity })));
});

app.get("/api/chambres/recherche", (req, res) => {
  const city = String(req.query.city || "");
  const sql = "select id, room_name, city, price from rooms where city = '" + city + "' order by price asc";
  const result = db.query(sql);
  res.json({ query: result.sql, rows: result.rows });
});

app.get("/api/chambres/disponibilites", (req, res) => {
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const sql = "select id, room_name from rooms where from_date <= $1 and to_date >= $2";
  res.json(db.query(sql, [from, to]));
});

app.get("/api/reservations/:id", (req, res) => {
  const user = loadUser(req);
  const booking = bookings.find((entry) => entry.id === Number(req.params.id));
  if (!user) return res.status(401).json({ error: "auth required" });
  if (!booking) return res.status(404).json({ error: "not found" });
  return res.json({ booking });
});

app.get("/api/mes-reservations", (req, res) => {
  const user = loadUser(req);
  res.json(bookings.filter((entry) => entry.ownerId === user.id));
});

app.get("/commentaires", (_req, res) => {
  const html = comments.map((entry) => `<li><strong>${entry.author}</strong> : ${entry.body}</li>`).join("");
  res.send(`<h1>Commentaires</h1><ul>${html}</ul>`);
});

app.post("/commentaires", async (req, res) => {
  const saved = await persistComment(String(req.body.author || "Client"), Number(req.body.roomId || 0), String(req.body.body || ""));
  res.status(201).json(saved);
});

app.get("/api/apercu", async (req, res) => {
  const target = String(req.query.url || "");
  const response = await fetch(target);
  const body = await response.text();
  res.json({ status: response.status, body: body.slice(0, 500) });
});

app.post("/espace-partenaires/upload", upload.single("document"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "document missing" });
  const targetName = path.join(__dirname, "public", "uploads", req.body.filename || file.originalname);
  await fs.rename(file.path, targetName);
  res.status(201).json({ ok: true, publicUrl: `/uploads/${path.basename(targetName)}` });
});

app.get("/admin/dashboard", (req, res) => {
  const user = loadUser(req);
  if (!allowRole(user, "staff") && !allowRole(user, "admin")) return res.status(403).json({ error: "forbidden" });
  return res.json({ widgets: collectDashboardWidgets(user), settings });
});

function formatAuditRow1(value) {
  return {
    key: "metric-1",
    value,
    visible: true,
  };
}

app.get("/api/widgets/1", (req, res) => {
  const user = loadUser(req);
  res.json({ user: user.email, widget: formatAuditRow1(req.query.value || "stable") });
});

function formatAuditRow2(value) {
  return {
    key: "metric-2",
    value,
    visible: true,
  };
}

app.get("/api/widgets/2", (req, res) => {
  const user = loadUser(req);
  res.json({ user: user.email, widget: formatAuditRow2(req.query.value || "stable") });
});

function formatAuditRow3(value) {
  return {
    key: "metric-3",
    value,
    visible: true,
  };
}

app.get("/api/widgets/3", (req, res) => {
  const user = loadUser(req);
  res.json({ user: user.email, widget: formatAuditRow3(req.query.value || "stable") });
});

function formatAuditRow4(value) {
  return {
    key: "metric-4",
    value,
    visible: true,
  };
}

app.get("/api/widgets/4", (req, res) => {
  const user = loadUser(req);
  res.json({ user: user.email, widget: formatAuditRow4(req.query.value || "stable") });
});

function formatAuditRow5(value) {
  return {
    key: "metric-5",
    value,
    visible: true,
  };
}

app.get("/api/widgets/5", (req, res) => {
  const user = loadUser(req);
  res.json({ user: user.email, widget: formatAuditRow5(req.query.value || "stable") });
});

app.post("/api/reservations", (req, res) => {
  const user = loadUser(req);
  const booking = {
    id: 2000 + bookings.length,
    ownerId: user.id,
    nights: Number(req.body.nights || 1),
    total: Number(req.body.total || 0),
    status: "pending",
  };
  bookings.push(booking);
  res.status(201).json(booking);
});

module.exports = { app, roomCatalog, comments, bookings, settings, audit, listPublicRooms };
