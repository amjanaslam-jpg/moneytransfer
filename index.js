const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 📌 MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Change if necessary
  password: "aslam2004", // Change if necessary
  database: "money"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL Database: money");
});





// 📌 Add Staff
app.post("/add-staff", (req, res) => {
  const { staffId, staffName } = req.body;
  db.query("INSERT INTO staff (id, name, balance) VALUES (?, ?, 0)", [staffId, staffName], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Staff added successfully!" });
  });
});

// 📌 Get All Staff
app.get("/get-staff", (req, res) => {
  db.query("SELECT * FROM staff", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 📌 Add Deposit
app.post("/add-deposit", (req, res) => {
    const { staffId, amount, description } = req.body;

    if (!staffId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid input" });
    }

    // 1. Update the balance in the staff table
    db.query("UPDATE staff SET balance = balance + ? WHERE id = ?", [amount, staffId], (err, result) => {
        if (err) {
            console.error("Error updating balance:", err);
            return res.status(500).json({ success: false, message: "Balance update failed" });
        }

        // 2. Insert the deposit record
        const insertQuery = `
            INSERT INTO staff_deposit (staff_id, amount, description)
            VALUES (?, ?, ?)
        `;

        db.query(insertQuery, [staffId, amount, description || "Deposit"], (err2) => {
            if (err2) {
                console.error("Insert error:", err2);
                return res.status(500).json({ success: false, message: "Insert failed" });
            }

            res.json({ success: true, message: "Deposit saved and balance updated successfully" });
        });
    });
});



// 📌 Add Expense

// 📌 Correct Add Expense API
// ✅ Add Staff Expense and Deduct from Balance
app.post('/add-expense', (req, res) => {
    const { staffId, staffName, amount, reason } = req.body;
    const date = new Date();

    if (!staffId || !staffName || !amount || !reason) {
        return res.json({ success: false, message: "All fields are required." });
    }

    const insertQuery = "INSERT INTO staff_expenses (staffId, staff_name, amount, reason, date) VALUES (?, ?, ?, ?, ?)";
    const updateBalanceQuery = "UPDATE staff SET balance = balance - ? WHERE id = ?";

    db.query(insertQuery, [staffId, staffName, amount, reason, date], (err, result) => {
        if (err) {
            console.error("Insert Error:", err);
            return res.json({ success: false, message: "Failed to add expense." });
        }

        db.query(updateBalanceQuery, [amount, staffId], (err2) => {
            if (err2) {
                console.error("Balance Update Error:", err2);
                return res.json({ success: false, message: "Expense added, but failed to update balance." });
            }

            res.json({ success: true, message: "Expense added and balance updated!" });
        });
    });
});








// 📌 Search Staff Expenses with full details
app.get('/get-staff-expenses/:staffName', (req, res) => {
    const staffName = req.params.staffName;

    if (!staffName) {
        return res.status(400).json({ success: false, message: "Staff name is required." });
    }

    const query = `
        SELECT staffId, staff_name, amount, reason, date
        FROM staff_expenses
        WHERE LOWER(staff_name) = LOWER(?)
    `;

    db.query(query, [staffName], (err, results) => {
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({ success: true, expenses: results });
    });
});






// 📌 Set Conversion Rates
app.post("/set-rates", (req, res) => {
  const { sarToInr, aedToInr } = req.body;
  db.query("UPDATE conversion_rates SET sar_to_inr = ?, aed_to_inr = ? WHERE id = 1", [sarToInr, aedToInr], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Conversion rates updated!" });
  });
});

// 📌 Get Conversion Rates
app.get("/get-rates", (req, res) => {
  db.query("SELECT * FROM conversion_rates WHERE id = 1", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});


// 📌 Send Money (Transaction)
app.post("/send-money", (req, res) => {
  const {
    staffId,
    staffName,
    customerName,
    amountSent,
    receivedMoney,
    convertedAmount,
    sendCountry,
    transactionDate  // ✅ NEW: optional custom date from frontend
  } = req.body;

  const sent = parseFloat(amountSent) || 0;
  const received = parseFloat(receivedMoney) || 0;
  const dateToUse = transactionDate ? new Date(transactionDate) : new Date(); // ✅ Use provided date or now

  db.query("SELECT balance FROM staff WHERE id = ?", [staffId], (err, staffResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (staffResults.length === 0) return res.status(404).json({ message: "Staff not found" });

    let newStaffBalance = staffResults[0].balance - sent;
    if (newStaffBalance < 0) return res.status(400).json({ message: "Insufficient balance" });

    db.query(
      "SELECT customerBalance FROM transactions WHERE customerName = ? ORDER BY id DESC LIMIT 1",
      [customerName],
      (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        let previousBalance = 0;
        if (results.length > 0) {
          previousBalance = parseFloat(results[0].customerBalance) || 0;
        }

        const customerBalance = previousBalance + received - sent;

        db.query("UPDATE staff SET balance = ? WHERE id = ?", [newStaffBalance, staffId]);

        db.query(
          `INSERT INTO transactions 
          (staffId, staffName, customerName, amountSent, receivedMoney, convertedAmount, sendCountry, customerBalance, date) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [staffId, staffName, customerName, sent, received, convertedAmount, sendCountry, customerBalance, dateToUse],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Transaction successful!" });
          }
        );
      }
    );
  });
});


// 📌 Get All Transactions with Staff Name
app.get("/transactions", (req, res) => {
  db.query(`
    SELECT t.*, s.name AS staffName 
    FROM transactions t
    LEFT JOIN staff s ON t.staffId = s.id
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
// API to get staff details by Staff ID
app.get("/get-staff/:staffId", async (req, res) => {
    const { staffId } = req.params;  // ✅ Removed extra closing bracket

    try {
        console.log("Checking staff ID:", staffId); // Debug log
        const [staff] = await db.promise().query("SELECT * FROM staff WHERE id = ?", [staffId]); // ✅ Added `db.promise()`
        console.log("Query result:", staff); // Debug log

        if (staff.length > 0) {
            res.json({ name: staff[0].name });
        } else {
            res.status(404).json({ message: "Staff not found" });
        }
    } catch (error) {
        console.error("Database error:", error); // Log full error
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


// 📌 Delete Transaction
app.delete("/delete-transaction/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM transactions WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Transaction deleted successfully!" });
  });
});

app.get('/staff-deposits/:staffId', (req, res) => {
    const staffId = req.params.staffId;

    const query = `
        SELECT amount AS deposit_amount, created_at AS deposit_date
        FROM staff_deposit
        WHERE staff_id = ?
        ORDER BY created_at DESC
    `;

    db.query(query, [staffId], (err, results) => {
        if (err) {
            console.error("Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (results.length === 0) {
            return res.json({ success: false, message: "No deposits found." });
        }

        res.json({ success: true, deposits: results });
    });
});

// delete staff
app.delete("/delete-staff/:id", (req, res) => {
    const staffId = req.params.id;

    db.query("DELETE FROM staff WHERE id = ?", [staffId], (err, result) => {
        if (err) {
            console.error("Error deleting staff:", err);
            return res.status(500).json({ message: "Database error while deleting staff." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Staff not found." });
        }

        res.json({ message: `Staff ID ${staffId} deleted successfully.` });
    });
});






// 📌 Start Server
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
