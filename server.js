const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// 1. Middlewares
app.use(cors());
app.use(bodyParser.json());
// Serves your HTML, CSS, and JS files from the current folder
app.use(express.static(path.join(__dirname, '/')));

// 2. Oracle Database Configuration
const dbConfig = {
  user: "club_user",
  password: "club123",
  connectString: "localhost:1521/FREEPDB1" 
};

// 3. Route to serve the login page as the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 4. API: User Login
app.post('/api/login', async (req, res) => {
  let connection;
  try {
    const { user_email, user_password, user_type } = req.body;
    connection = await oracledb.getConnection(dbConfig);

    // Selects user matching email, password, and specific role
    const sql = `SELECT USER_NAME, USER_TYPE, USER_EMAIL 
                 FROM USERS 
                 WHERE USER_EMAIL = :email 
                 AND USER_PASSWORD = :pass 
                 AND USER_TYPE = :type`;
    
    const result = await connection.execute(sql, [user_email, user_password, user_type]);

    if (result.rows.length > 0) {
      // Return the user data to the browser
      res.status(200).send({ 
        message: "Login successful", 
        user: {
            name: result.rows[0][0],
            type: result.rows[0][1],
            email: result.rows[0][2]
        }
      });
    } else {
      res.status(401).send({ message: "Invalid credentials or user type" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Database Error", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 5. API: Student Registration (Handles both USERS and STUDENT_INFO)
app.post('/api/register', async (req, res) => {
  let connection;
  try {
    const { 
        user_name, user_email, user_password, 
        student_number, student_program, student_faculty, student_semester 
    } = req.body;
    
    connection = await oracledb.getConnection(dbConfig);

    // Step A: Insert into the USERS table
    // Uses the sequence you created in SQL Developer
    const userSql = `INSERT INTO USERS (USER_ID, USER_NAME, USER_PASSWORD, USER_EMAIL, IS_ACTIVE, USER_TYPE) 
                     VALUES (user_seq.NEXTVAL, :name, :pass, :email, 1, 'student') 
                     RETURNING USER_ID INTO :id`;
    
    const result = await connection.execute(userSql, {
      name: user_name, 
      pass: user_password, 
      email: user_email, 
      id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    });

    const newUserId = result.outBinds.id[0];

    // Step B: Insert into the linked STUDENT_INFO table
    const infoSql = `INSERT INTO STUDENT_INFO (USER_ID, STUDENT_NUMBER, STUDENT_PROGRAM, STUDENT_FACULTY, STUDENT_SEMESTER) 
                     VALUES (:id, :sNum, :prog, :fac, :sem)`;
    
    await connection.execute(infoSql, {
      id: newUserId, 
      sNum: student_number, 
      prog: student_program, 
      fac: student_faculty, 
      sem: student_semester
    });

    // Save changes to Oracle
    await connection.commit();
    res.status(201).send({ message: "Registration successful!" });
    
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Registration Failed", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 ClubSphere Server running at http://localhost:${PORT}`);
});