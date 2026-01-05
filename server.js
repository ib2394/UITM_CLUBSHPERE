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

// 3. Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

/* --- SECTION 1: AUTHENTICATION --- */

app.post('/api/login', async (req, res) => {
  let connection;
  try {
    const { user_email, user_password, user_type } = req.body;
    connection = await oracledb.getConnection(dbConfig);

    let sql, binds;

    if (user_type === 'club_admin') {
      // Club Admins login using CLUB_EMAIL from CLUBS table
      sql = `SELECT u.USER_ID, u.USER_NAME, u.USER_TYPE, c.CLUB_EMAIL 
             FROM USERS u 
             JOIN CLUBS c ON u.USER_NAME = c.ADVISOR_NAME
             WHERE c.CLUB_EMAIL = :email 
             AND u.USER_PASSWORD = :pass 
             AND u.USER_TYPE = 'club_admin'`;
      binds = [user_email, user_password];
    } else {
      // Students and Admins login via USER_EMAIL
      sql = `SELECT USER_ID, USER_NAME, USER_TYPE, USER_EMAIL 
             FROM USERS 
             WHERE USER_EMAIL = :email 
             AND USER_PASSWORD = :pass 
             AND USER_TYPE = :type`;
      binds = [user_email, user_password, user_type];
    }

    const result = await connection.execute(sql, binds);

    if (result.rows.length > 0) {
      res.status(200).send({
        user: { id: result.rows[0][0], name: result.rows[0][1], type: result.rows[0][2], email: result.rows[0][3] }
      });
    } else {
      res.status(401).send({ message: "Invalid credentials for the selected role" });
    }
  } catch (err) { res.status(500).send(err.message); }
  finally { if (connection) await connection.close(); }
});

app.post('/api/register', async (req, res) => {
  let connection;
  try {
    const { user_name, user_email, user_password, user_type, student_number, student_program, student_faculty, student_semester } = req.body;
    connection = await oracledb.getConnection(dbConfig);

    // Registration is solely for students in this implementation
    const userSql = `INSERT INTO USERS (USER_ID, USER_NAME, USER_PASSWORD, USER_EMAIL, IS_ACTIVE, USER_TYPE) 
                     VALUES (user_seq.NEXTVAL, :name, :pass, :email, 1, :type) RETURNING USER_ID INTO :id`;
    
    const result = await connection.execute(userSql, { 
        name: user_name, pass: user_password, email: user_email, type: user_type, 
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } 
    });

    const infoSql = `INSERT INTO STUDENT_INFO (USER_ID, STUDENT_NUMBER, STUDENT_PROGRAM, STUDENT_FACULTY, STUDENT_SEMESTER) 
                     VALUES (:id, :sNum, :prog, :fac, :sem)`;
    
    await connection.execute(infoSql, { 
        id: result.outBinds.id[0], sNum: student_number, prog: student_program, fac: student_faculty, sem: student_semester 
    });

    await connection.commit();
    res.status(201).send({ message: "Success" });
  } catch (err) { res.status(500).send(err.message); }
  finally { if (connection) await connection.close(); }
});

/* --- SECTION 2: STUDENT DASHBOARD APIS --- */

app.get('/api/profile/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const sql = `SELECT u.USER_NAME, u.USER_EMAIL, si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM, si.STUDENT_SEMESTER
            FROM USERS u JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID WHERE u.USER_EMAIL = :email`;
        const result = await connection.execute(sql, [req.params.email], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).send({ message: "Not found" });
    } catch (err) { res.status(500).send(err.message); }
    finally { if (connection) await connection.close(); }
});

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

app.listen(3000, () => console.log(`🚀 Server running at http://localhost:3000`));