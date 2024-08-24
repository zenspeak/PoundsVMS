// Import necessary libraries
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

// Initialize the application and middleware
const app = express();
app.use(cors());
app.use(bodyParser.json()); // for parsing application/json

// Initialize SQLite database
let db = new sqlite3.Database(":memory:");

db.serialize(() => {
  db.run(
    "CREATE TABLE visits (time INTEGER, hour INTEGER, lastVisitTime INTEGER)"
  );
  db.run(
    "CREATE TABLE waitlist (name TEXT, partySize INTEGER, estimatedWait INTEGER, timeAdded TEXT)"
  );
});

// Endpoint to record a visit
app.get("/", (req, res) => {
  const visitTime = new Date();
  const visitHour = visitTime.getUTCHours() - 5; // Convert to Central Time

  db.get(
    "SELECT time FROM visits ORDER BY time DESC LIMIT 1",
    [],
    (err, row) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error retrieving last visit time");
        return;
      }

      const lastVisitTime = row ? row.time : 0;
      if (visitTime.getTime() - lastVisitTime < 1200) {
        res.redirect("https://www.poundsfargo.com/menu");
        return;
      }

      db.run(
        "INSERT INTO visits VALUES (?, ?, ?)",
        [visitTime.getTime(), visitHour, lastVisitTime],
        (err) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error recording visit");
            return;
          }

          res.redirect("https://www.poundsfargo.com/menu");
        }
      );
    }
  );
});

app.post("/addParty", (req, res) => {
  const { name, partySize, estimatedWait, timeAdded } = req.body;
  if (!name || partySize <= 0 || estimatedWait < 0) {
    res.status(400).send("Invalid input");
    return;
  }

  db.run(
    "INSERT INTO waitlist (name, partySize, estimatedWait, timeAdded) VALUES (?, ?, ?, ?)",
    [name, partySize, estimatedWait, timeAdded],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error adding to waitlist");
        return;
      }
      res.json({ message: "Party added to waitlist" }); // Respond with JSON
    }
  );
});

// Endpoint to remove a party from the waitlist
app.post("/removeParty", (req, res) => {
  // Validate inputs
  if (!req.body.name) {
    res.status(400).send("Invalid input");
    return;
  }

  db.run("DELETE FROM waitlist WHERE name = ?", req.body.name, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error removing from waitlist");
      return;
    }

    res.status(200).send("Party removed from waitlist");
  });
});

// Endpoint to get the waitlist
app.get("/waitlist", (req, res) => {
  db.all("SELECT * FROM waitlist", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error retrieving waitlist");
      return;
    }

  // Format each row's timeAdded to '09:42 PM' format in local time
const formattedRows = rows.map((row) => {
  const date = new Date(row.timeAdded);
  return {
    ...row,
    timeAdded: date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Chicago", // Replace with your desired time zone
    }),
  };
});

    let waitlistHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
body {
    font-family: 'Roboto', sans-serif;
    font-color: #FFF5EB;
    background-color: #333333;
    margin: 0;
    padding: 20px;
    color: #333;
    display: flex;
    justify-content: center;
    align-items: top-center;
}

.container {
    width: 100%;
    max-width: 900px;
    background-color: #FFF5EB;
    padding: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    text-align: center;
    display: flex;
    min-width: 45vh;
}

form, table {
    width: 100%;
    margin: auto;
}

label {
    display: block;
    margin-top: 10px;
}

input[type="number"] {
    width: 30%;
    padding: 10px;
    margin: 5px auto;
    display: inline-block;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-sizing: border-box;
    text-align: center;
}

input[type="text"] {
    width: 55%;
    padding: 10px;
    margin: 5px auto;
    display: inline-block;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-sizing: border-box;
    text-align: center;
}
input[type="number"]::-webkit-inner-spin-button, 
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield; /* Firefox */
    appearance: textfield; /* Removing the spinner from input number for most browsers */
}

button {
    padding: 10px 15px;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 5px;
    background-color: #2D4A83;
    margin: 0 5px;
}

.remove-btn {
    background-color: #F15A25;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    align-items: center;
    padding: 0;
    font-size: 12px;
}

button:hover {
    opacity: 0.9;
}

table {
    border-collapse: collapse;
    background-color: #f8f8f8;
    text-align: center;
}

th, td {
    padding: 12px;
    border-bottom: 1px solid #ddd;
}

th {
    background-color: #00A979;
}
</style>
</head>
<div>
<body>
    <div class="container">
        <form onsubmit="event.preventDefault(); addParty();">
        <label for="partySize"><b>name</b></label>
            <input type="text" id="name" name="name"><br>
            
            <label for="partySize"><b>party size</B></label>
            <button type="button" onclick="adjustSize('partySize', -1)"><b>-<b/></button>
            <input type="number" id="partySize" name="partySize" min="1" value="2" >
            <button type="button" onclick="adjustSize('partySize', 1)"><b>+<b/></button><br>
            
            <label for="estimatedWait">estimated wait</label>
            <button type="button" onclick="adjustSize('estimatedWait', -5)"><b>-<b/></button>
            <input type="number" id="estimatedWait" name="estimatedWait" min="5" value="5" step="5">
            <button type="button" onclick="adjustSize('estimatedWait', 5)"><b>+<b/></button><br><br>
            
            <button type="submit"><b>ADD PARTY<b/></button>
        </form><br>
        </div>
        <br>
        <div class="container">
      <table>
        <th>name</th>
        <th>size</th>
        <th>added</th>
        <th>est. wait</th>
        <th></th>
    </tr>
    ${formattedRows.map(row => `
    <tr>
        <td>${row.name}</td>
        <td>${row.partySize}</td>
        <td>${row.timeAdded}</td>
        <td>${row.estimatedWait}</td>
        <td><button class="remove-btn" onclick="removeParty('${row.name}')">X</button></td>
    </tr>
    `).join('')}
</table>
        
        </div>
<script>
    function adjustSize(fieldId, increment) {
        var input = document.getElementById(fieldId);
        var currentValue = parseInt(input.value) || 0;
        input.value = Math.max(0, currentValue + increment); // Ensure no negative values
    }

    function addParty() {
        const name = document.getElementById('name').value;
        const partySize = document.getElementById('partySize').value;
        const estimatedWait = document.getElementById('estimatedWait').value;
        const currentTime = new Date().toISOString();

        console.log('Adding party:', {name, partySize, estimatedWait, currentTime}); // Debugging output

        fetch('/addParty', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                partySize: partySize,
                estimatedWait: estimatedWait,
                timeAdded: currentTime
            }),
        })
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error('Network response was not ok.');
            }
        })
        .then(data => {
            console.log('Success:', data);
            document.getElementById('name').value = '';
            document.getElementById('partySize').value = '1';
            document.getElementById('estimatedWait').value = '5';
            location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function removeParty(name) {
        fetch('/removeParty', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: name }),
        })
        .then(response => response.text())
        .then(() => {
            location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
</script>
</body>
</html>
    `;

    res.send(waitlistHTML);
  });
});
// Endpoint to get the visit count
app.get("/visits", (req, res) => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  db.all(
    "SELECT * FROM visits WHERE time > ?",
    tenMinutesAgo,
    (err, recentVisits) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error retrieving visit count");
        return;
      }

      let totalMenus = recentVisits.length;

      let hourlyCounts = Array(24).fill(0);
      db.each(
        "SELECT hour, COUNT(*) as count FROM visits GROUP BY hour",
        (err, row) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error retrieving hourly counts");
            return;
          }

          hourlyCounts[row.hour] = row.count;
        },
        (err) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error retrieving hourly counts");
            return;
          }

          let tableRows = "";
          for (let hour = 11; hour <= 21; hour++) {
            let displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            let amPm = hour >= 12 ? "PM" : "AM";
            tableRows += `<tr><td>${displayHour}:00 - ${
              displayHour === 12 ? 1 : displayHour + 1
            }:00 ${amPm}</td><td>${hourlyCounts[hour]}</td></tr>`;
          }

          db.all(
            "SELECT SUM(partySize) as totalWaiting FROM waitlist",
            (err, rows) => {
              if (err) {
                console.error(err);
                res.status(500).send("Error retrieving waitlist count");
                return;
              }

              let totalWaiting = rows[0].totalWaiting || 0;

              let backgroundColor = "#00a979";
              if (totalMenus >= 20) {
                backgroundColor = "#ef2626";
              } else if (totalMenus >= 12) {
                backgroundColor = "#f15a25";
              } else if (totalMenus >= 1) {
                backgroundColor = "#f89920";
              }

              res.send(`
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        background-color: ${backgroundColor};
        display: flex;
        flex-direction: column; /* Change to column so elements stack vertically */
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: Arial, sans-serif;
      }
      #counter {
        font-size: 700px;
        color: #333;
      }
      #message {
        font-size: 48px; /* Make the Open Menus text smaller */
        color: #666;
        text-align: center;
      }
      #totalWaiting {
        font-size: 80px; /* Keep the waiting count the same size */
        color: #333;
        text-align: center;
      }
      #clock {
        position: absolute;
        top: 50px;  /* Increase padding from top */
        right: 50px;  /* Increase padding from right */
        font-size: 100px;  /* Increase font size */
        font-weight: bold;  /* Make text bold */
        color: #333;
        
      }
      table {
        margin-left: auto;
        margin-right: auto;
        width: 50%;
      }
      td, th {
        padding: 7px;
        font-size: 20px;
      }
      hr {
        width: 50%; /* Set the width of the line */
        border: 0;
        border-top: 4px solid #333; /* Set the color and thickness of the line */
      }
    </style>
    <script>
      function updateCounter() {
        location.reload();  // Reload the page to get the new count and table
      }

      setInterval(updateCounter, 60000); // Update every minute

      function startTime() {
        var now = new Date();
        var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        var nd = new Date(utc + (3600000*(-5))); // CST is UTC-6
        var s = nd.toLocaleTimeString();
        document.getElementById('clock').innerHTML = s;
        setTimeout(startTime, 1000);
      }
    </script>
  </head>
  <body onload="startTime()">
    <div id="clock"></div>
    <div id="counter">${totalMenus}</div>
    <div id="message">Open Menus</div>
    <br> <!-- Add a line break -->
        <br> <!-- Add a line break -->
          <br> <!-- Add a line break -->
    <hr> <!-- Add a line -->
    <br> <!-- Add a line break -->
    <div id="totalWaiting">Waiting: ${totalWaiting}</div>
    <!-- Other content goes here -->
  </body>
</html>


        `);
            }
          );
        }
      );
    }
  );
});
// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
