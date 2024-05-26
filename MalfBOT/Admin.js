const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path'); 
const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database('./Admin.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS master (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            phone TEXT NOT NULL,
            exp INTEGER NOT NULL,
            services TEXT NOT NULL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS client (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            feature TEXT NOT NULL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            master_id INTEGER NOT NULL,
            client_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            FOREIGN KEY (master_id) REFERENCES master(id),
            FOREIGN KEY (client_id) REFERENCES client(id)
        )`);
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/Admin.html'));
});

app.get('/service', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/addservice.html'));
});

app.post('/master', (req, res) => {
    const { full_name, age, phone, exp, services } = req.body;

    // Проверяем, выбрана ли хотя бы одна услуга
    if (!services) {
        return res.status(400).send('Выберите хотя бы одну услугу');
    }

    db.run("INSERT INTO master (full_name, age, phone, exp, services) VALUES (?, ?, ?, ?, ?)", [full_name, age, phone, exp, services], (err) => {
        if (err) {
            return console.error(err.message);
        }
        res.redirect('/master');
    });
});

app.post('/service', (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO services (name) VALUES (?)", [name], (err) => {
        if (err) {
            return console.error(err.message);
        }
        res.redirect('/service');
    });
});

app.post('/client', (req, res) => {
    const { full_name, phone, feature, date, time } = req.body;
    db.run("INSERT INTO client (full_name, phone, feature, date, time) VALUES (?, ?, ?, ?, ?)", [full_name, phone, feature, date, time], (err) => {
        if (err) {
            return console.error(err.message);
        }
        res.redirect('/client');
    });
});

app.get('/admin/masters', (req, res) => {
    db.all("SELECT * FROM master", [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        res.json(rows); // Отправляем данные о парикмахерах в формате JSON
    });
});

app.get('/admin/masters/:id', (req, res) => {
    const masterId = req.params.id;
    db.get("SELECT full_name, age, exp, services, phone FROM master WHERE id = ?", [masterId], (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        res.json(row); // Отправляем данные о выбранном парикмахере в формате JSON
    });
});

app.get('/schedule/:master_id/:date', (req, res) => {
    const { master_id, date } = req.params;
    const sql = `
        SELECT client.full_name, client.phone, client.feature, appointments.time
        FROM appointments
        JOIN client ON appointments.client_id = client.id
        WHERE appointments.master_id = ? AND appointments.date = ?
        ORDER BY appointments.time
    `;
    
    db.all(sql, [master_id, date], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        res.json(rows); // Send the master's schedule for the specified date in JSON format
    });
});

app.get('/master', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/master.html'));
});

app.get('/client', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/client.html'));
});

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/admin/services', (req, res) => {
    db.all("SELECT * FROM services", [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        res.json(rows); // Отправляем данные о услугах в формате JSON
    });
});




//
app.post('/appointment', (req, res) => {
    const { full_name, phone, feature, master_id, date, time } = req.body;
    
    // Сначала добавляем клиента
    db.run("INSERT INTO client (full_name, phone, feature) VALUES (?, ?, ?)", [full_name, phone, feature], function(err) {
        if (err) {
            return console.error(err.message);
        }
        
        const client_id = this.lastID;
        
        // Затем создаем запись
        db.run("INSERT INTO appointments (master_id, client_id, date, time) VALUES (?, ?, ?, ?)", [master_id, client_id, date, time], (err) => {
            if (err) {
                return console.error(err.message);
            }
            res.redirect('/client');
        });
    });
});

// Маршрут для получения списка мастеров
app.get('/api/masters', (req, res) => {
    db.all("SELECT id, full_name FROM master", [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        res.json(rows);
    });
});
app.get('/schedule/:master_id/:date', (req, res) => {
    const { master_id, date } = req.params;
    const sql = `
        SELECT client.full_name, client.phone, client.feature, appointments.time
        FROM appointments
        JOIN client ON appointments.client_id = client.id
        WHERE appointments.master_id = ? AND appointments.date = ?
        ORDER BY appointments.time
    `;
    
    db.all(sql, [master_id, date], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        res.json(rows); // Отправляем расписание мастера на заданный день в формате JSON
    });
});
app.delete('/admin/masters/:id', (req, res) => {
    const masterId = req.params.id;
    db.run("DELETE FROM master WHERE id = ?", [masterId], (err) => {
        if (err) {
            return console.error(err.message);
        }
        res.sendStatus(200); // Отправляем успешный статус
    });
});
//