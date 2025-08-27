const express = require('../express');
const bodyParser = require('../body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const contactsFile = path.join(__dirname, 'knowledge/contacts.json');

app.use(bodyParser.json());
app.use(express.static(__dirname)); // serves your HTML/CSS/JS

// Helper: ensure knowledge/contacts.json exists
function ensureContactsFile() {
    if (!fs.existsSync(contactsFile)) {
        fs.writeFileSync(contactsFile, JSON.stringify([], null, 2));
        console.log('Created new knowledge/contacts.json file.');
    }
}

// API to get contacts
app.get('/knowledge/contacts.json', (req, res) => {
    ensureContactsFile();
    fs.readFile(contactsFile, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading contacts.');
        res.send(JSON.parse(data));
    });
});

// API to save contacts
app.post('/save-contacts', (req, res) => {
    ensureContactsFile();
    const data = req.body;
    fs.writeFile(contactsFile, JSON.stringify(data, null, 2), err => {
        if (err) return res.status(500).send('Error saving contacts.');
        res.send({ message: 'Contacts saved successfully' });
    });
});

app.listen(PORT, () => {
    ensureContactsFile();
    console.log(`Server running on http://localhost:${PORT}`);
});
