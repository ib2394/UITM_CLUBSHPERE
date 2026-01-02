const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// 1. Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// 2. Oracle Database Configuration
const dbConfig = {
  user: "club_user",
  password: "club123",
  connectString: "localhost:1521/FREEPDB1"
};

// 3. Route to serve the login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

/* --- SECTION 1: AUTHENTICATION (Login/Register) --- */

app.post('/api/login', async (req, res) => {
  let connection;
  try {
    const { user_email, user_password, user_type } = req.body;
    connection = await oracledb.getConnection(dbConfig);
    const sql = `SELECT USER_ID, USER_NAME, USER_TYPE, USER_EMAIL FROM USERS 
                 WHERE USER_EMAIL = :email AND USER_PASSWORD = :pass AND USER_TYPE = :type`;
    const result = await connection.execute(sql, [user_email, user_password, user_type]);
    if (result.rows.length > 0) {
      res.status(200).send({
        user: { id: result.rows[0][0], name: result.rows[0][1], type: result.rows[0][2], email: result.rows[0][3] }
      });
    } else {
      res.status(401).send({ message: "Invalid credentials" });
    }
  } catch (err) { res.status(500).send(err.message); }
  finally { if (connection) await connection.close(); }
});

app.post('/api/register', async (req, res) => {
  let connection;
  try {
    const { user_name, user_email, user_password, user_type, student_number, student_program, student_faculty, student_semester } = req.body;
    connection = await oracledb.getConnection(dbConfig);
    const userSql = `INSERT INTO USERS (USER_ID, USER_NAME, USER_PASSWORD, USER_EMAIL, IS_ACTIVE, USER_TYPE) 
                     VALUES (user_seq.NEXTVAL, :name, :pass, :email, 1, :type) RETURNING USER_ID INTO :id`;
    const result = await connection.execute(userSql, { name: user_name, pass: user_password, email: user_email, type: user_type, id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } });
    if (user_type !== 'admin') {
        const infoSql = `INSERT INTO STUDENT_INFO (USER_ID, STUDENT_NUMBER, STUDENT_PROGRAM, STUDENT_FACULTY, STUDENT_SEMESTER) VALUES (:id, :sNum, :prog, :fac, :sem)`;
        await connection.execute(infoSql, { id: result.outBinds.id[0], sNum: student_number, prog: student_program, fac: student_faculty, sem: student_semester });
    }
    await connection.commit();
    res.status(201).send({ message: "Success" });
  } catch (err) { res.status(500).send(err.message); }
  finally { if (connection) await connection.close(); }
});

/* --- SECTION 2: STUDENT DASHBOARD DATA --- */

// Fetch Student Profile
app.get('/api/profile/:email', async (req, res) => {
    let connection;
    try {
        const userEmail = req.params.email;
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT u.USER_NAME, u.USER_EMAIL, si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM, si.STUDENT_SEMESTER
            FROM USERS u JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID WHERE u.USER_EMAIL = :email`;
        const result = await connection.execute(sql, [userEmail], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows.length > 0) { res.status(200).json(result.rows[0]); }
        else { res.status(404).send({ message: "Profile not found" }); }
    } catch (err) { res.status(500).send(err.message); }
    finally { if (connection) await connection.close(); }
});

// Dashboard Statistics (Counts)
app.get('/api/student/stats/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT 
                (SELECT COUNT(*) FROM USERS_CLUB uc JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE u.USER_EMAIL = :email) as JOINED,
                (SELECT COUNT(*) FROM APPLICATION a JOIN USERS u ON a.USER_ID = u.USER_ID WHERE u.USER_EMAIL = :email) as APPS,
                (SELECT COUNT(*) FROM EVENTS e JOIN USERS_CLUB uc ON e.CLUB_ID = uc.CLUB_ID JOIN USERS u ON uc.USER_ID = u.USER_ID WHERE u.USER_EMAIL = :email AND e.EVENT_DATETIME > SYSDATE) as EVENTS
            FROM DUAL`;
        const result = await connection.execute(sql, [req.params.email], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send(err.message); }
    finally { if (connection) await connection.close(); }
});

// Recent Announcements for Student
app.get('/api/student/announcements/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT a.ANNC_TITLE, a.ANNC_CONTENT, a.ANNC_DATE, c.CLUB_NAME
            FROM ANNOUNCEMENT a JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID
            JOIN USERS_CLUB uc ON c.CLUB_ID = uc.CLUB_ID JOIN USERS u ON uc.USER_ID = u.USER_ID
            WHERE u.USER_EMAIL = :email ORDER BY a.ANNC_DATE DESC`;
        const result = await connection.execute(sql, [req.params.email], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
    finally { if (connection) await connection.close(); }
});

// All Clubs for Explore Section
app.get('/api/student/clubs', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT c.CLUB_ID, c.CLUB_NAME, c.CLUB_MISSION, c.ADVISOR_NAME, cat.CATEGORY_NAME
            FROM CLUBS c LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID
            LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
    finally { if (connection) await connection.close(); }
});

// Student's Own Applications
app.get('/api/student/applications/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT c.CLUB_NAME, a.APPLICATION_STATUS, SYSDATE as APP_DATE
            FROM APPLICATION a JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID
            JOIN USERS u ON a.USER_ID = u.USER_ID WHERE u.USER_EMAIL = :email`;
        const result = await connection.execute(sql, [req.params.email], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
    finally { if (connection) await connection.close(); }
});

/* --- SECTION 3: ADMIN DASHBOARD (Clubs/Students/Delete) --- */

app.get('/api/admin/clubs', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const sql = `SELECT c.CLUB_ID, c.CLUB_NAME, c.ADVISOR_NAME, cat.CATEGORY_NAME,
                (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.CLUB_ID = c.CLUB_ID) as MEMBER_COUNT
                FROM CLUBS c LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID
                LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID ORDER BY c.CLUB_NAME`;
    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
  finally { if (connection) await connection.close(); }
});

app.get('/api/admin/students', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const sql = `SELECT u.USER_ID, u.USER_NAME, si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM,
                (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.USER_ID = u.USER_ID) as CLUBS_JOINED
                FROM USERS u JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID WHERE u.USER_TYPE = 'student'`;
    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
  finally { if (connection) await connection.close(); }
});

app.delete('/api/admin/clubs/:id', async (req, res) => {
  let connection;
  try {
      const id = req.params.id;
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(`DELETE FROM CLUB_CATEGORY WHERE CLUB_ID = :id`, [id]);
      await connection.execute(`DELETE FROM USERS_CLUB WHERE CLUB_ID = :id`, [id]);
      await connection.execute(`DELETE FROM ANNOUNCEMENT WHERE CLUB_ID = :id`, [id]);
      await connection.execute(`DELETE FROM EVENTS WHERE CLUB_ID = :id`, [id]);
      await connection.execute(`DELETE FROM APPLICATION WHERE CLUB_ID = :id`, [id]);
      await connection.execute(`DELETE FROM CLUBS WHERE CLUB_ID = :id`, [id]);
      await connection.commit();
      res.send({ message: "Deleted" });
  } catch (err) { res.status(500).send({ error: err.message }); }
  finally { if (connection) await connection.close(); }
});

app.delete('/api/admin/students/:id', async (req, res) => {
  let connection;
  try {
      const id = req.params.id;
      connection = await oracledb.getConnection(dbConfig);
      await connection.execute(`DELETE FROM USERS_CLUB WHERE USER_ID = :id`, [id]);
      await connection.execute(`DELETE FROM APPLICATION WHERE USER_ID = :id`, [id]);
      await connection.execute(`DELETE FROM STUDENT_INFO WHERE USER_ID = :id`, [id]);
      await connection.execute(`DELETE FROM USERS WHERE USER_ID = :id`, [id]);
      await connection.commit();
      res.send({ message: "Deleted" });
  } catch (err) { res.status(500).send({ error: err.message }); }
  finally { if (connection) await connection.close(); }
});

app.listen(3000, () => console.log(`🚀 Server running at http://localhost:3000`));