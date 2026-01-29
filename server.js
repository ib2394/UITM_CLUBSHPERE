const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

const dbConfig = {
    user: "club_user",
    password: "club123",
    connectString: "localhost:1521/FREEPDB1"
};

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

/* =========================================
   SECTION 1: AUTHENTICATION
   ========================================= */
app.post('/api/login', async (req, res) => {
    let connection;
    try {
        const { user_email, user_password, user_type } = req.body;
        if (!user_email || !user_password || !user_type) return res.status(400).json({ message: "Missing fields" });

        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT USER_ID, USER_NAME, USER_TYPE, USER_EMAIL, USER_PASSWORD FROM USERS 
                      WHERE LOWER(USER_EMAIL) = LOWER(:email) AND USER_TYPE = :type AND IS_ACTIVE = 1`;
        
        const result = await connection.execute(sql, { email: user_email.trim(), type: user_type }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });
        const user = result.rows[0];
        if (user.USER_PASSWORD !== user_password) return res.status(401).json({ message: "Invalid password" });

        res.status(200).json({ user: { id: user.USER_ID, name: user.USER_NAME, type: user.USER_TYPE, email: user.USER_EMAIL } });
    } catch (err) { res.status(500).json({ message: "Login error", error: err.message }); }
    finally { if (connection) await connection.close(); }
});

app.post('/api/register', async (req, res) => {
    let connection;
    try {
        const { user_name, user_email, user_password, user_type, student_number, student_program, student_faculty, student_semester } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        
        const userSql = `INSERT INTO USERS (USER_ID, USER_NAME, USER_PASSWORD, USER_EMAIL, IS_ACTIVE, USER_TYPE) 
                          VALUES (user_seq.NEXTVAL, :name, :pass, :email, 1, :type) RETURNING USER_ID INTO :id`;
        const userResult = await connection.execute(userSql, { 
            name: user_name.trim(), pass: user_password, email: user_email.trim().toLowerCase(), type: user_type || 'student', id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } 
        });
        
        const newUserId = userResult.outBinds.id[0];
        await connection.execute(`INSERT INTO STUDENT_INFO (USER_ID, STUDENT_NUMBER, STUDENT_PROGRAM, STUDENT_FACULTY, STUDENT_SEMESTER) 
                                   VALUES (:id, :sNum, :prog, :fac, :sem)`, 
            { id: newUserId, sNum: student_number, prog: student_program, fac: student_faculty, sem: student_semester });
        
        await connection.commit();
        res.status(201).json({ message: "Registration successful" });
    } catch (err) { if (connection) await connection.rollback(); res.status(500).json({ message: err.message }); }
    finally { if (connection) await connection.close(); }
});

/* =========================================
   SECTION 2: STUDENT PROFILE & STATS
   ========================================= */
app.get('/api/profile/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT u.USER_NAME, u.USER_EMAIL, si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM, si.STUDENT_SEMESTER 
                      FROM USERS u JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email)`;
        const result = await connection.execute(sql, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: "Error" }); }
    finally { if (connection) await connection.close(); }
});

app.put('/api/profile/update', async (req, res) => {
    let connection;
    try {
        const { email, name, student_number, faculty, program, semester } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`UPDATE USERS SET USER_NAME = :name WHERE LOWER(USER_EMAIL) = LOWER(:email)`, { name, email });
        await connection.execute(`UPDATE STUDENT_INFO si SET si.STUDENT_NUMBER = :sNum, si.STUDENT_FACULTY = :fac, si.STUDENT_PROGRAM = :prog, si.STUDENT_SEMESTER = :sem 
                                   WHERE si.USER_ID = (SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email))`, 
                                   { sNum: student_number, fac: faculty, prog: program, sem: semester, email });
        await connection.commit();
        res.json({ message: "Updated" });
    } catch (err) { if (connection) await connection.rollback(); res.status(500).json({ message: "Error" }); }
    finally { if (connection) await connection.close(); }
});

app.get('/api/student/stats/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT 
            (SELECT COUNT(*) FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email)) as JOINED,
            (SELECT COUNT(*) FROM APPLICATION a JOIN USERS u ON a.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email)) as APPS,
            (SELECT COUNT(*) FROM EVENTS e JOIN USERS_CLUB uc ON e.CLUB_ID = uc.CLUB_ID JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email) AND e.EVENT_DATETIME > SYSDATE) as EVENTS 
            FROM DUAL`;
        const result = await connection.execute(sql, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: "Error" }); }
    finally { if (connection) await connection.close(); }
});

/* =========================================
   SECTION 3: STUDENT FEATURES (CLUBS, APPS, EVENTS)
   ========================================= */

// 1. GET CLUBS LIST
app.get('/api/student/clubs', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT c.CLUB_ID, c.CLUB_NAME, c.ADVISOR_NAME, cat.CATEGORY_NAME 
             FROM CLUBS c 
             LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID 
             LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID`,
            [], 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) { 
        console.error('Clubs fetch error:', err);
        res.status(500).json({ message: "Error fetching clubs" }); 
    } finally { if (connection) await connection.close(); }
});

// 2. GET APPLICATIONS LIST
app.get('/api/student/applications/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT a.APPLICATION_ID, c.CLUB_NAME, a.APPLICATION_STATUS, SYSDATE as APP_DATE 
             FROM APPLICATION a 
             JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID 
             JOIN USERS u ON a.USER_ID = u.USER_ID 
             WHERE LOWER(u.USER_EMAIL) = LOWER(:email)`,
            { email: req.params.email }, 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) { 
        console.error('Apps fetch error:', err);
        res.status(500).json({ message: "Error fetching applications" }); 
    } finally { if (connection) await connection.close(); }
});

// 3. ANNOUNCEMENTS (Fixed ANNC_DATE_TIME)
app.get('/api/student/announcements/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT DISTINCT a.ANNC_ID, a.ANNC_TITLE, a.ANNC_CONTENT, a.ANNC_TYPE, a.ANNC_DATE_TIME as ANNC_DATE, c.CLUB_NAME 
                      FROM ANNOUNCEMENT a JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID ORDER BY a.ANNC_DATE_TIME DESC`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

// 4. EVENTS
app.get('/api/student/events/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT DISTINCT e.EVENT_ID, e.EVENT_NAME, e.EVENT_DESC, e.EVENT_TYPE, e.EVENT_DATETIME, c.CLUB_NAME 
                      FROM EVENTS e JOIN CLUBS c ON e.CLUB_ID = c.CLUB_ID WHERE e.EVENT_DATETIME > SYSDATE ORDER BY e.EVENT_DATETIME ASC`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

// 5. APPLY TO CLUB
app.post('/api/student/apply', async (req, res) => {
    let connection;
    try {
        const { user_email, club_id } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        const userRes = await connection.execute(`SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email)`, { email: user_email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const userId = userRes.rows[0].USER_ID;
        await connection.execute(`INSERT INTO APPLICATION (APPLICATION_ID, APPLICATION_STATUS, USER_ID, CLUB_ID) VALUES (application_seq.NEXTVAL, 'Pending', :u, :c)`, { u: userId, c: club_id });
        await connection.commit();
        res.status(201).json({ message: "Success" });
    } catch (err) { res.status(500).json({ message: err.message }); } finally { if (connection) await connection.close(); }
});

// 6. CANCEL APPLICATION
app.delete('/api/student/application/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`DELETE FROM APPLICATION WHERE APPLICATION_ID = :id`, { id: req.params.id }); 
        await connection.commit();
        res.json({ message: "Cancelled" });
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

// 7. GET CLUB DETAILS (For Modal)
app.get('/api/clubs/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const clubSql = `SELECT c.CLUB_ID, c.CLUB_NAME, c.CLUB_MISSION, c.CLUB_VISION, c.CLUB_EMAIL, c.CLUB_PHONE, c.ADVISOR_NAME, c.ADVISOR_EMAIL, c.ADVISOR_PHONE, cat.CATEGORY_NAME, 
                         (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.CLUB_ID = c.CLUB_ID) as MEMBER_COUNT 
                         FROM CLUBS c LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID WHERE c.CLUB_ID = :id`;
        const clubResult = await connection.execute(clubSql, { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (clubResult.rows.length === 0) return res.status(404).json({ message: "Not found" });
        
        const eventsSql = `SELECT EVENT_ID, EVENT_NAME, EVENT_DESC, EVENT_TYPE, EVENT_DATETIME FROM EVENTS WHERE CLUB_ID = :id AND EVENT_TYPE = 'Public' AND EVENT_DATETIME > SYSDATE`;
        const eventsResult = await connection.execute(eventsSql, { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        res.json({ ...clubResult.rows[0], EVENTS: eventsResult.rows });
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

/* =========================================
   SECTION 4: SUPER ADMIN API
   ========================================= */
app.get('/api/categories', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`SELECT CATEGORY_ID, CATEGORY_NAME FROM CATEGORY`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error fetching categories" }); } finally { if (connection) await connection.close(); }
});

app.get('/api/admin/clubs', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT c.CLUB_ID, c.CLUB_NAME, c.ADVISOR_NAME, c.CLUB_EMAIL, cat.CATEGORY_NAME, (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.CLUB_ID = c.CLUB_ID) as MEMBER_COUNT FROM CLUBS c LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

app.post('/api/admin/clubs', async (req, res) => {
    let connection;
    try {
        const { club_name, category_id, advisor_name, club_email, club_phone, admin_name, admin_email, admin_password } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        
        // 1. Create Club
        const result = await connection.execute(
            `INSERT INTO CLUBS (CLUB_ID, CLUB_NAME, CLUB_EMAIL, CLUB_PHONE, ADVISOR_NAME) VALUES (club_seq.NEXTVAL, :name, :email, :phone, :adv) RETURNING CLUB_ID INTO :id`, 
            { name: club_name, email: club_email, phone: club_phone, adv: advisor_name, id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }
        );
        const newClubId = result.outBinds.id[0];

        // 2. Map Category
        if (category_id) {
            await connection.execute(`INSERT INTO CLUB_CATEGORY (CLUB_ID, CATEGORY_ID) VALUES (:cid, :catid)`, { cid: newClubId, catid: category_id });
        }

        // 3. Create Admin User
        const userRes = await connection.execute(
            `INSERT INTO USERS (USER_ID, USER_NAME, USER_PASSWORD, USER_EMAIL, IS_ACTIVE, USER_TYPE) VALUES (user_seq.NEXTVAL, :uname, :upass, :uemail, 1, 'club_admin') RETURNING USER_ID INTO :uid`,
            { uname: admin_name, upass: admin_password, uemail: admin_email, uid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }
        );
        const newUserId = userRes.outBinds.uid[0];

        // 4. Link Admin User to Club
        await connection.execute(`INSERT INTO USERS_CLUB (USER_CLUB_ID, USER_ID, CLUB_ID) VALUES (user_club_seq.NEXTVAL, :uid, :cid)`, { uid: newUserId, cid: newClubId });

        await connection.commit();
        res.json({ message: "Club created" });
    } catch (err) { if (connection) await connection.rollback(); res.status(500).json({ message: err.message }); }
    finally { if (connection) await connection.close(); }
});

app.delete('/api/admin/clubs/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const id = req.params.id;
        await connection.execute(`DELETE FROM CLUB_CATEGORY WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM USERS_CLUB WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM APPLICATION WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM ANNOUNCEMENT WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM EVENTS WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM CLUBS WHERE CLUB_ID = :id`, [id]);
        await connection.commit();
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

app.get('/api/admin/students', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT u.USER_ID, u.USER_NAME, si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM, (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.USER_ID = u.USER_ID) as CLUBS_JOINED FROM USERS u JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID WHERE u.USER_TYPE = 'student'`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error fetching students" }); } finally { if (connection) await connection.close(); }
});

app.delete('/api/admin/students/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const id = req.params.id;
        await connection.execute(`DELETE FROM APPLICATION WHERE USER_ID = :id`, [id]);
        await connection.execute(`DELETE FROM USERS_CLUB WHERE USER_ID = :id`, [id]);
        await connection.execute(`DELETE FROM STUDENT_INFO WHERE USER_ID = :id`, [id]);
        await connection.execute(`DELETE FROM USERS WHERE USER_ID = :id`, [id]);
        await connection.commit();
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

// FIXED: ANNC_DATE_TIME
app.get('/api/admin/announcements', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        // Using ANNC_DATE_TIME and aliasing as ANNC_DATE
        const sql = `SELECT a.ANNC_ID, a.ANNC_TITLE, a.ANNC_CONTENT, a.ANNC_TYPE, a.ANNC_DATE_TIME as ANNC_DATE, c.CLUB_NAME FROM ANNOUNCEMENT a JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID ORDER BY a.ANNC_DATE_TIME DESC FETCH FIRST 50 ROWS ONLY`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

app.get('/api/admin/events', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT e.EVENT_ID, e.EVENT_NAME, e.EVENT_DESC, e.EVENT_TYPE, e.EVENT_DATETIME, c.CLUB_NAME FROM EVENTS e JOIN CLUBS c ON e.CLUB_ID = c.CLUB_ID ORDER BY e.EVENT_DATETIME DESC FETCH FIRST 50 ROWS ONLY`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

/* =========================================
   SECTION 5: CLUB ADMIN API (FIXED)
   ========================================= */
app.get('/api/club-admin/stats/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const clubRes = await connection.execute(`SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email) AND u.USER_TYPE = 'club_admin'`, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (clubRes.rows.length === 0) return res.status(404).json({ message: "Not found" });
        const cid = clubRes.rows[0].CLUB_ID;
        const statsSql = `SELECT (SELECT COUNT(*) FROM USERS_CLUB WHERE CLUB_ID = :cid AND USER_ID IN (SELECT USER_ID FROM USERS WHERE USER_TYPE = 'student')) as MEMBERS, (SELECT COUNT(*) FROM APPLICATION WHERE CLUB_ID = :cid AND APPLICATION_STATUS = 'Pending') as PENDING_APPS, (SELECT COUNT(*) FROM EVENTS WHERE CLUB_ID = :cid AND EVENT_DATETIME > SYSDATE) as UPCOMING_EVENTS FROM DUAL`;
        const result = await connection.execute(statsSql, { cid }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); } finally { if (connection) await connection.close(); }
});

app.get('/api/club-admin/profile/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT c.CLUB_ID, c.CLUB_NAME, c.CLUB_MISSION, c.CLUB_VISION, c.CLUB_EMAIL, c.CLUB_PHONE, c.ADVISOR_NAME, c.ADVISOR_EMAIL FROM CLUBS c JOIN USERS_CLUB uc ON c.CLUB_ID = uc.CLUB_ID JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email)`;
        const result = await connection.execute(sql, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); } finally { if (connection) await connection.close(); }
});

app.put('/api/club-admin/profile', async (req, res) => {
    let connection;
    try {
        const { email, mission, vision, club_email, club_phone } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        const sql = `UPDATE CLUBS SET CLUB_MISSION = :mission, CLUB_VISION = :vision, CLUB_EMAIL = :cemail, CLUB_PHONE = :cphone WHERE CLUB_ID = (SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email) AND u.USER_TYPE = 'club_admin')`;
        await connection.execute(sql, { mission, vision, cemail: club_email, cphone: club_phone, email });
        await connection.commit();
        res.json({ message: "Updated" });
    } catch (err) { if (connection) await connection.rollback(); res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

// FIXED: ANNC_DATE_TIME
app.get('/api/club-admin/announcements/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT a.ANNC_ID, a.ANNC_TITLE, a.ANNC_CONTENT, a.ANNC_TYPE, a.ANNC_DATE_TIME as ANNC_DATE FROM ANNOUNCEMENT a WHERE a.CLUB_ID = (SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email) AND u.USER_TYPE = 'club_admin') ORDER BY a.ANNC_DATE_TIME DESC`;
        const result = await connection.execute(sql, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error loading announcements" }); } finally { if (connection) await connection.close(); }
});

// FIXED: ANNC_DATE_TIME
app.post('/api/club-admin/announcements', async (req, res) => {
    let connection;
    try {
        const { email, title, content, type } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        const clubRes = await connection.execute(`SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email)`, { email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (clubRes.rows.length === 0) return res.status(404).json({ message: "Club not found" });
        const clubId = clubRes.rows[0].CLUB_ID;
        // Using ANNC_DATE_TIME
        await connection.execute(`INSERT INTO ANNOUNCEMENT (ANNC_ID, ANNC_TITLE, ANNC_CONTENT, ANNC_TYPE, ANNC_DATE_TIME, CLUB_ID) VALUES (announcement_seq.NEXTVAL, :title, :content, :type, SYSDATE, :clubId)`,
            { title, content, type, clubId });
        await connection.commit();
        res.status(201).json({ message: "Posted" });
    } catch (err) { if (connection) await connection.rollback(); res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

app.delete('/api/club-admin/announcements/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`DELETE FROM ANNOUNCEMENT WHERE ANNC_ID = :id`, { id: req.params.id }); 
        await connection.commit();
        res.json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ message: e.message }); } finally { if (connection) await connection.close(); }
});

app.get('/api/club-admin/events/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT e.EVENT_ID, e.EVENT_NAME, e.EVENT_DESC, e.EVENT_TYPE, e.EVENT_DATETIME FROM EVENTS e WHERE e.CLUB_ID = (SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email) AND u.USER_TYPE = 'club_admin') ORDER BY e.EVENT_DATETIME DESC`;
        const result = await connection.execute(sql, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

// FIXED: Date format to handle missing seconds from HTML input
// FIXED: Renamed :desc to :eventDesc to avoid ORA-01745
app.post('/api/club-admin/events', async (req, res) => {
    let connection;
    try {
        const { email, name, description, type, datetime } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        const clubRes = await connection.execute(`SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email)`, { email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const clubId = clubRes.rows[0].CLUB_ID;
        
        // FIX: Changed :desc to :eventDesc
        await connection.execute(`INSERT INTO EVENTS (EVENT_ID, EVENT_NAME, EVENT_DESC, EVENT_TYPE, EVENT_DATETIME, CLUB_ID) VALUES (event_seq.NEXTVAL, :name, :eventDesc, :type, TO_DATE(:dt, 'YYYY-MM-DD"T"HH24:MI'), :clubId)`, { name, eventDesc: description, type, dt: datetime, clubId });
        await connection.commit();
        res.status(201).json({ message: "Created" });
    } catch (err) { if (connection) await connection.rollback(); res.status(500).json({ message: err.message }); } finally { if (connection) await connection.close(); }
});

app.delete('/api/club-admin/events/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`DELETE FROM EVENTS WHERE EVENT_ID = :id`, { id: req.params.id }); 
        await connection.commit();
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: err.message }); } finally { if (connection) await connection.close(); }
});

// FIXED: Added STUDENT_SEMESTER and fixed Join alias
app.get('/api/club-admin/members/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        // FIX: Changed uc.USER_ID to uc2.USER_ID in the subquery join
        const sql = `SELECT u.USER_ID, u.USER_NAME, u.USER_EMAIL, si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM, si.STUDENT_SEMESTER 
                     FROM USERS_CLUB uc 
                     JOIN USERS u ON uc.USER_ID = u.USER_ID 
                     JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID 
                     WHERE uc.CLUB_ID = (SELECT uc2.CLUB_ID FROM USERS_CLUB uc2 JOIN USERS u2 ON uc2.USER_ID = u2.USER_ID WHERE LOWER(u2.USER_EMAIL) = LOWER(:email) AND u2.USER_TYPE = 'club_admin') 
                     AND u.USER_TYPE = 'student' 
                     ORDER BY u.USER_NAME`;
        
        const result = await connection.execute(sql, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error fetching members" }); }
    finally { if (connection) await connection.close(); }
});

app.delete('/api/club-admin/members/:userId', async (req, res) => {
    let connection;
    try {
        const { email } = req.body;
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`DELETE FROM USERS_CLUB WHERE USER_ID = :uid AND CLUB_ID = (SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE LOWER(u.USER_EMAIL) = LOWER(:email) AND u.USER_TYPE = 'club_admin')`, { uid: req.params.userId, email });
        await connection.commit();
        res.json({ message: "Removed" });
    } catch (err) { res.status(500).json({ message: err.message }); } finally { if (connection) await connection.close(); }
});

app.get('/api/club-admin/applicants/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT a.APPLICATION_ID, u.USER_NAME, si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM FROM APPLICATION a JOIN USERS u ON a.USER_ID = u.USER_ID JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID WHERE a.CLUB_ID = (SELECT uc.CLUB_ID FROM USERS_CLUB uc JOIN USERS u2 ON uc.USER_ID = u2.USER_ID WHERE LOWER(u2.USER_EMAIL) = LOWER(:email) AND u2.USER_TYPE = 'club_admin') AND a.APPLICATION_STATUS = 'Pending'`;
        const result = await connection.execute(sql, { email: req.params.email }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

// FIXED: ORA-01745 Fix (Named Binds for Update + Insert) + Renamed :uid to :userid
app.put('/api/club-admin/applicants/:id/approve', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const appRes = await connection.execute(`SELECT USER_ID, CLUB_ID FROM APPLICATION WHERE APPLICATION_ID = :id`, { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const { USER_ID, CLUB_ID } = appRes.rows[0];
        
        await connection.execute(`UPDATE APPLICATION SET APPLICATION_STATUS = 'Approved' WHERE APPLICATION_ID = :id`, { id: req.params.id });
        
        // Using Named Binds with :userid instead of :uid
        await connection.execute(`INSERT INTO USERS_CLUB (USER_CLUB_ID, USER_ID, CLUB_ID) VALUES (user_club_seq.NEXTVAL, :userid, :cid)`, { userid: USER_ID, cid: CLUB_ID });
        
        await connection.commit();
        res.json({ message: "Approved" });
    } catch (err) { if (connection) await connection.rollback(); res.status(500).json({ message: err.message }); } finally { if (connection) await connection.close(); }
});

// FIXED: ORA-01745 Fix (Named Binds)
app.put('/api/club-admin/applicants/:id/reject', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`UPDATE APPLICATION SET APPLICATION_STATUS = 'Rejected' WHERE APPLICATION_ID = :id`, { id: req.params.id });
        await connection.commit();
        res.json({ message: "Rejected" });
    } catch (err) { res.status(500).json({ message: "Error" }); } finally { if (connection) await connection.close(); }
});

const PORT = 3000;
app.listen(PORT, () => { console.log(`🚀 Server running at http://localhost:${PORT}`); });