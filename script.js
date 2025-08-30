const API_URL = "http://localhost:3000";

// 📌 Show success/error messages
function showMessage(message, isError = false) {
    alert(message);
}

// 📌 Validate input fields
function validateInput(inputElement) {
    if (!inputElement.value.trim()) {
        inputElement.style.border = "2px solid red";
        return false;
    }
    inputElement.style.border = "";
    return true;
}



// 📌 Add new staff
async function addStaff() {
    const staffId = document.getElementById("staffId").value.trim();
    const staffName = document.getElementById("staffName").value.trim();
    if (!validateInput(document.getElementById("staffId")) || !validateInput(document.getElementById("staffName"))) return;

    const response = await fetch(API_URL + "/add-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, staffName })
    });

    const result = await response.json();
    showMessage(result.message);
    displayStaffDetails();
}

// 📌 Add deposit for staff
async function addDeposit() {
    const staffId = document.getElementById("depositStaffId").value.trim();
    const staffName = document.getElementById("depositStaffName").value.trim();
    const amount = parseFloat(document.getElementById("depositAmount").value);
    if (!validateInput(document.getElementById("depositStaffId")) || isNaN(amount) || amount <= 0) return;

    const response = await fetch(API_URL + "/add-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, staffName, amount })
    });

    const result = await response.json();
    showMessage(result.message);
    displayStaffDetails();
}

// 📌 Display all staff details
async function displayStaffDetails() {
    const response = await fetch(API_URL + "/get-staff");
    const staffList = await response.json();
    document.getElementById("staffBalanceDisplay").innerHTML = staffList.map(staff => `<p>${staff.name} (ID: ${staff.id}): ${staff.balance} INR</p>`).join("");
}

// 📌 Add staff expense
// 📌 Add Expense Properly
function addExpense() {
    const staffId = document.getElementById('expense_staff_id').value.trim(); // fixed here
    const staffName = document.getElementById('staff_name').value.trim();
    const amount = document.getElementById('expense_amount').value.trim();
    const reason = document.getElementById('expense_reason').value.trim();

    if (!staffId || !staffName || !amount || !reason) {
        alert("Please fill all fields!");
        return;
    }

    const expenseData = {
        staffId,
        staffName,
        amount,
        reason
    };

    fetch('http://localhost:3000/add-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("✅ " + data.message);
            document.getElementById('expense_staff_id').value = '';  // also updated here
            document.getElementById('staff_name').value = '';
            document.getElementById('expense_amount').value = '';
            document.getElementById('expense_reason').value = '';
        } else {
            alert("❌ " + data.message);
        }
    })
    .catch(error => {
        console.error("Fetch Error:", error);
        alert("❌ Server error while adding expense.");
    });
}





// search transaction

function searchTransaction() {
    let searchInput = document.getElementById("searchInput").value.trim().toLowerCase();
    let resultsContainer = document.getElementById("searchResultsContainer");
    let tableRows = document.getElementById("transactionsTable").getElementsByTagName("tr");

    resultsContainer.innerHTML = "";
    filteredTransactions = [];
    currentCustomerName = "";

    // ✅ Check if it's a "deposit" search (e.g., "deposit 1")
    if (searchInput.startsWith("deposit")) {
        let staffId = searchInput.replace("deposit", "").trim();
        if (!staffId) {
            alert("❌ Please enter a valid staff ID after 'deposit'.");
            return;
        }

        fetch(`http://localhost:3000/staff-deposits/${staffId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    let resultHTML = `
                        <h3>🧾 Deposit Records for Staff ID: ${staffId}</h3>
                        <table border="1" width="100%">
                            <thead>
                                <tr>
                                    <th>Deposit Amount</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>`;
                    data.deposits.forEach(dep => {
                        resultHTML += `
                            <tr>
                                <td>₹${dep.deposit_amount}</td>
                                <td>${new Date(dep.deposit_date).toLocaleString()}</td>
                            </tr>`;
                    });
                    resultHTML += `</tbody></table>`;
                    resultsContainer.innerHTML = resultHTML;
                    document.getElementById("searchResultModal").style.display = "block";
                } else {
                    alert("❌ " + data.message);
                }
            })
            .catch(error => {
                console.error("Error fetching deposits:", error);
                alert("❌ Server error while fetching deposit data.");
            });

        return; // Stop further processing
    }

    // ✅ Special case: Get all transactions
    if (searchInput === "get all") {
        currentCustomerName = "all";
        alert("You entered 'get all'. All transactions will be exported.");
        return;
    }

    // ✅ Handle optional date filters
    let fromDateInput = document.getElementById("fromDate").value;
    let toDateInput = document.getElementById("toDate").value;

    let fromDate = fromDateInput ? new Date(fromDateInput) : null;
    let toDate = toDateInput ? new Date(toDateInput) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999); // include entire end day

    let found = false;
    let resultHTML = "";

    for (let i = 0; i < tableRows.length; i++) {
        let row = tableRows[i];
        let cells = row.getElementsByTagName("td");
        if (cells.length < 9) continue;

        let staffId = cells[0]?.textContent.trim();
        let staffName = cells[1]?.textContent.trim();
        let customerName = cells[2]?.textContent.trim().toLowerCase();
        let amountSent = cells[3]?.textContent.trim();
        let receivedAmount = cells[4]?.textContent.trim();
        let convertedAmount = cells[5]?.textContent.trim();
        let sendCountry = cells[6]?.textContent.trim();
        let customerBalance = cells[7]?.textContent.trim();
        let date = cells[8]?.textContent.trim();
        let rowDate = new Date(date);

        let matchDate = (!fromDate || rowDate >= fromDate) && (!toDate || rowDate <= toDate);
        let matchSearch = staffId.toLowerCase().includes(searchInput) || customerName.includes(searchInput);

        if (matchSearch && matchDate) {
            found = true;
            currentCustomerName = cells[2]?.textContent.trim();

            filteredTransactions.push({
                staffId, staffName, customerName, amountSent, receivedAmount,
                convertedAmount, sendCountry, customerBalance, date
            });

            resultHTML += `
                <tr>
                    <td>${staffId}</td>
                    <td>${staffName}</td>
                    <td>${customerName}</td>
                    <td>${amountSent}</td>
                    <td>${receivedAmount}</td>
                    <td>${convertedAmount}</td>
                    <td>${sendCountry}</td>
                    <td>${customerBalance}</td>
                    <td>${date}</td>
                </tr>`;
        }
    }

    if (found) {
        document.getElementById("searchResultModal").style.display = "block";
        resultsContainer.innerHTML = `
            <table border="1" width="100%">
                <thead>
                    <tr>
                        <th>Staff ID</th>
                        <th>Staff Name</th>
                        <th>Customer Name</th>
                        <th>Amount Sent</th>
                        <th>Received</th>
                        <th>Converted</th>
                        <th>Send Country</th>
                        <th>Customer Balance</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>${resultHTML}</tbody>
            </table>`;
    } else {
        alert("❌ No transactions found.");
    }
}



// Close modal function
function closeModal() {
    document.getElementById("searchResultModal").style.display = "none";
}

function searchExpense() {
    const staffName = document.getElementById('search_staff_name').value.trim();

    if (!staffName) {
        alert("Please enter a Staff Name");
        return;
    }

    fetch(`http://localhost:3000/get-staff-expenses/${staffName}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.expenses.length > 0) {
                let tbody = document.querySelector("#expensetable tbody");
                tbody.innerHTML = "";

                data.expenses.forEach(exp => {
                    const dateFormatted = formatDate(exp.date); // assuming you have a formatDate function
                    tbody.innerHTML += `
                        <tr>
                            <td>${exp.staffId || ''}</td>
                            <td>${exp.staff_name || ''}</td>
                            <td>${exp.amount}</td>
                            <td>${exp.reason}</td>
                            <td>${dateFormatted}</td>
                        </tr>`;
                });

                document.getElementById("searchExpenseModal").style.display = "block";

            } else {
                alert("No expenses found for this staff.");
            }
        })
        .catch(err => {
            console.error("Error fetching staff expenses:", err);
            alert("Server error while fetching staff expenses.");
        });
}

function formatDate(dateStr) {
    if (!dateStr) return "-"; // If date is missing, show "-"
    
    const date = new Date(dateStr);
    if (isNaN(date)) return "-"; // If date is invalid, show "-"

    return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
}






function closeExpenseModal() {
    document.getElementById("searchExpenseModal").style.display = "none";
}

// 📌 Set conversion rates
async function setRates() {
    const sarToInr = parseFloat(document.getElementById("sarRate").value);
    const aedToInr = parseFloat(document.getElementById("aedRate").value);
    if (isNaN(sarToInr) || isNaN(aedToInr) || sarToInr <= 0 || aedToInr <= 0) return;

    const response = await fetch(API_URL + "/set-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sarToInr, aedToInr })
    });

    const result = await response.json();
    showMessage(result.message);
}


async function convertAmount() {
    const amountInput = document.getElementById("amountSent");
    const countrySelect = document.getElementById("sendCountry");
    const convertedInput = document.getElementById("convertedCurrency");

    const amount = parseFloat(amountInput.value);
    const country = countrySelect.value;

    if (isNaN(amount) || amount <= 0) {
        convertedInput.value = "";
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/get-rates"); // change if your API URL is different
        const data = await response.json();

        if (!data || !data.sar_to_inr || !data.aed_to_inr) {
            console.error("Invalid conversion rate data:", data);
            return;
        }

        let converted;
        if (country === "SAR") {
            converted = amount / data.sar_to_inr;
        } else if (country === "AED") {
            converted = amount / data.aed_to_inr;
        } else {
            converted = amount;
        }

        convertedInput.value = converted.toFixed(2);

    } catch (error) {
        console.error("Conversion Error:", error);
        convertedInput.value = "";
    }
}



// 📌 Transfer money
async function sendMoney() {
    const staffId = document.getElementById("transferStaffId").value.trim();
    const customerName = document.getElementById("customerName").value.trim();
    const amountSent = parseFloat(document.getElementById("amountSent").value);
    const receivedMoney = parseFloat(document.getElementById("receivedMoney").value);
    const sendCountry = document.getElementById("sendCountry").value;
    const convertedAmount = parseFloat(document.getElementById("convertedCurrency").value);
    const transactionDate = document.getElementById("transferDate").value; // New line

    if (
        !validateInput(document.getElementById("transferStaffId")) ||
        !validateInput(document.getElementById("customerName")) ||
        isNaN(amountSent) || isNaN(receivedMoney) ||
        amountSent < 0 || receivedMoney < 0
    ) return;

    const response = await fetch(API_URL + "/send-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            staffId,
            customerName,
            amountSent,
            receivedMoney,
            convertedAmount,
            sendCountry,
            transactionDate: transactionDate || null  // Include date if entered
        })
    });

    const result = await response.json();
    showMessage(result.message);
    loadTransactions();
    displayStaffDetails(); // This refreshes the visible staff balances

    // Clear input fields
    document.getElementById("transferStaffId").value = '';
    document.getElementById("transferStaffName").value = '';
    document.getElementById("customerName").value = '';
    document.getElementById("amountSent").value = '';
    document.getElementById("receivedMoney").value = '';
    document.getElementById("convertedCurrency").value = '';
    document.getElementById("sendCountry").selectedIndex = 0;
    document.getElementById("transferDate").value = ''; // Clear date field
}


// 📌 Load transactions
async function loadTransactions() {
    const response = await fetch(API_URL + "/transactions");
    const transactions = await response.json();

    document.getElementById("transactionsTable").innerHTML = transactions
        .map(tx => `<tr>
            <td>${tx.staffId}</td>
            <td>${tx.staffName}</td>
            <td>${tx.customerName}</td>
            <td>${tx.amountSent} INR</td>
            <td>${tx.receivedMoney} INR</td>
            <td>${tx.convertedAmount}</td>
            <td>${tx.sendCountry}</td>
            <td>${tx.customerBalance} INR</td>
            <td>${formatDate(tx.date)}</td>

            <td><button onclick="deleteTransaction(${tx.id})">Delete</button></td>
        </tr>`).join("");
}

//correct date and time
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: 'short',day: '2-digit',hour: '2-digit',minute: '2-digit',hour12: true,
    };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
}


// 📌 Delete a transaction
async function deleteTransaction(id) {
    await fetch(`${API_URL}/delete-transaction/${id}`, { method: "DELETE" });
    showMessage("Transaction deleted.");
    loadTransactions();
}

// 📌 Export transactions to Excel
function exportCSV() {
    const searchValue = document.getElementById("searchInput").value.trim().toLowerCase();
    const fromDateInput = document.getElementById("fromDate").value;
    const toDateInput = document.getElementById("toDate").value;

    const fromDate = fromDateInput ? new Date(fromDateInput) : null;
    const toDate = toDateInput ? new Date(toDateInput) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // ✅ Handle "deposit [staffId]"
    if (searchValue.startsWith("deposit ")) {
        const staffId = searchValue.split(" ")[1];

        fetch(`http://localhost:3000/staff-deposits/${staffId}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success || !Array.isArray(data.deposits)) {
                    alert("❌ No deposit data found.");
                    return;
                }

                // ✅ Filter deposits by date range
                const filtered = data.deposits.filter(dep => {
                    const depDate = new Date(dep.deposit_date);
                    return (!fromDate || depDate >= fromDate) && (!toDate || depDate <= toDate);
                });

                if (filtered.length === 0) {
                    alert("❌ No deposits found in selected date range.");
                    return;
                }

                const formatted = filtered.map((dep, i) => ({
                    "Sr No.": i + 1,
                    "Staff ID": staffId,
                    "Deposit Amount (INR)": dep.deposit_amount,
                    "Deposit Date": new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric', month: 'short', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    }).format(new Date(dep.deposit_date))
                }));

                const ws = XLSX.utils.json_to_sheet(formatted);
                ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 25 }];

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, `Staff ${staffId} Deposits`);
                XLSX.writeFile(wb, `staff_${staffId}_deposits.xlsx`);
            })
            .catch(err => {
                console.error("Deposit Export Error ❌", err);
                alert("❌ Failed to export deposit details.");
            });

        return;
    }

    // ✅ Handle transaction export
    fetch("http://localhost:3000/transactions")
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) {
                alert("Invalid data received from server.");
                return;
            }

            let filtered = data;

            if (searchValue && searchValue !== "get all") {
                filtered = filtered.filter(tx =>
                    tx.customerName?.toLowerCase().includes(searchValue) ||
                    tx.staffId?.toString().includes(searchValue)
                );
            }

            // ✅ Filter by date range
            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
                return (!fromDate || txDate >= fromDate) && (!toDate || txDate <= toDate);
            });

            if (filtered.length === 0) {
                alert("❌ No transactions found in selected date range.");
                return;
            }

            const formatDate = (input) => {
                const date = new Date(input);
                return new Intl.DateTimeFormat('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                }).format(date);
            };

            const formatted = filtered.map(tx => ({
                "Staff ID": tx.staffId,
                "Staff Name": tx.staffName,
                "Customer Name": tx.customerName,
                "Amount Sent (INR)": tx.amountSent || 0,
                "Received Money (INR)": tx.receivedMoney || 0,
                "Converted Amount": tx.convertedAmount || 0,
                "Send To": tx.sendCountry || '',
                "Customer Balance (INR)": tx.customerBalance || 0,
                "Date & Time": formatDate(tx.timestamp || tx.createdAt || tx.date || Date.now())
            }));

            const ws = XLSX.utils.json_to_sheet(formatted);
            ws['!cols'] = [
                { wch: 10 }, { wch: 15 }, { wch: 20 },
                { wch: 18 }, { wch: 20 }, { wch: 20 },
                { wch: 12 }, { wch: 20 }, { wch: 25 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Transactions");

            let filename = "all_transactions.xlsx";
            if (searchValue && searchValue !== "get all") {
                filename = `${searchValue.replace(/\s+/g, '_')}_transactions.xlsx`;
            }

            XLSX.writeFile(wb, filename);
        })
        .catch(err => {
            console.error("Export Error ❌", err);
            alert("❌ Failed to export transactions.");
        });
}







// 📌 Fetch staff details when entering Staff ID
async function fetchStaffDetails(staffIdInputId, staffNameInputId) {
    const staffId = document.getElementById(staffIdInputId).value.trim();
    
    if (!staffId) return; // Stop if the field is empty

    const response = await fetch(`${API_URL}/get-staff/${staffId}`);
    const staff = await response.json();

    if (staff && staff.name) {
        document.getElementById(staffNameInputId).value = staff.name; // Populate staff name
    } else {
        document.getElementById(staffNameInputId).value = ""; // Clear the field if no staff found
        showMessage("Staff not found!", true);
    }
}
// ✅ Fetch & Display Latest Currency Rates
function displayCurrencyRates() {
    console.log("📡 Fetching currency rates..."); // Debug log

    fetch("http://localhost:3000/get-rates")
        .then(res => res.json())
        .then(data => {
            console.log("✅ Currency data received:", data); // See what you get
            const currencyText = `💱 Latest Rates: AED ₹${data.aed_to_inr} | SAR ₹${data.sar_to_inr}`;
            document.getElementById("currencyRates").innerText = currencyText;
        })
        .catch(err => {
            console.error("❌ Failed to load currency rates:", err);
            document.getElementById("currencyRates").innerText = "💱 Latest Rates: Error fetching rates";
        });
}


// ✅ Call the function when page loads
window.onload = function () {
    displayCurrencyRates();
    loadTransactions();  // ← include all your page-load functions here
    displayStaffDetails(); // ← if needed
};
// delete staff
function deleteStaff() {
    const staffId = document.getElementById("deleteStaffId").value.trim();

    if (!staffId) {
        alert("Please enter a staff ID.");
        return;
    }

    if (!confirm(`Are you sure you want to delete staff ID ${staffId}?`)) return;

    fetch(`http://localhost:3000/delete-staff/${staffId}`, {
        method: "DELETE"
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        document.getElementById("deleteStaffId").value = '';
        displayStaffDetails(); // Refresh staff list if you're showing it
    })
    .catch(err => {
        console.error("Error deleting staff:", err);
        alert("❌ Failed to delete staff.");
    });
}






// 📌 Run on page load
window.onload = function() {
    document.getElementById("searchResultModal").style.display = "none";
    document.getElementById("searchExpenseModal").style.display = "none";

    displayStaffDetails();
    loadTransactions();
};
