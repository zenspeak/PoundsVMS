const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
const db = new sqlite3.Database('./restaurant.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS visits (count INTEGER)");
  db.run("CREATE TABLE IF NOT EXISTS waitlist (name TEXT)");
  
  // Initialize visits if not exists
  db.get("SELECT count FROM visits", (err, row) => {
    if (!row) {
      db.run("INSERT INTO visits (count) VALUES (0)");
    }
  });
});

// Routes
app.get('/visits', (req, res) => {
  db.get("SELECT count FROM visits", (err, row) => {
    const visits = row ? row.count : 0;
    db.all("SELECT name FROM waitlist", (err, waitlist) => {
      res.send(`
        <h1>Kitchen Display</h1>
        <p>Total Visits: ${visits}</p>
        <h2>Waitlist</h2>
        <ul>
          ${waitlist.map(person => `<li>${person.name}</li>`).join('')}
        </ul>
      `);
    });
  });
});

app.get('/waitlist', (req, res) => {
  db.all("SELECT name FROM waitlist", (err, waitlist) => {
    res.send(`
      <h1>Waitlist Management</h1>
      <form action="/waitlist" method="POST">
        <input type="text" name="name" placeholder="Customer Name" required>
        <button type="submit">Add to Waitlist</button>
      </form>
      <ul>
        ${waitlist.map(person => `<li>${person.name}</li>`).join('')}
      </ul>
    `);
  });
});

app.post('/waitlist', (req, res) => {
  const { name } = req.body;
  if (name) {
    db.run("INSERT INTO waitlist (name) VALUES (?)", [name]);
  }
  res.redirect('/waitlist');
});

app.get('/scan/:tableId', (req, res) => {
  const { tableId } = req.params;
  db.run("UPDATE visits SET count = count + 1");
  console.log(`Table ${tableId} scanned.`);
  res.redirect('https://your-external-website.com');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Keep the Replit app alive
require('http').createServer().listen(3000);