const express = require('express');
const { Client } = require('pg');
const app = express();
const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL || 'postgres://localhost/acme_hr_directory';

const client = new Client({
    connectionString: dbUrl
});

async function init() {
    try {
        // connect to the postgresql database
        await client.connect();
        console.log('connected to the database');
        await client.query(`
        CREATE TABLE departments2 (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL
          );
          
          CREATE TABLE employees2 (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            department_id INTEGER REFERENCES departments(id)
          );
          `)
        //middleware to parse json bodies
        app.use(express.json());
        // GET /api/employees - returns array of employees
        app.get('/api/employees', async (req,res) => {
            const result = await client.query(`SELECT * FROM employees;`);
            res.json(result.rows);
        });
        // GET /api/departments - returns array of departments
        app.get('/api/departments', async (req, res) => {
            const result = await client.query(`SELECT * FROM departments;`);
            res.json(result.rows);
        })
        // POST /api/employees - payload: the employee to create, returns the created employee
        app.post('/api/employees', async (req, res) => {
            const {name, department_id } = req.body;
            const result = await client.query(
                `INSERT INTO employees (name, department_id) VALUES ($1, $2) RETURNING *`,
                [name, department_id]
            );
            res.json(result.rows[0]);
        });
        // DELETE /api/employees/:id - the id of the employee to delete is passed in the URL, returns nothing
        app.delete('/api/employees/:id', async (req, res) => {
            const { id } = req.params;
            await client.query(`DELETE FROM employees WHERE id = $1`, [id]);
            res.sendStatus(204);
        })
        // PUT /api/employees/:id - updates an employee
        app.put('/api/employees/:id', async (req, res) => {
            const { id } = req.params;
            const { name, department_id } = req.body;
            const result = await client.query(
                `UPDATE employees SET name = $1, department_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
                [name, department_id, id]
            );
            res.json(result.rows[0]);
        })
        // Error handling route
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ error: 'Something went wrong.' });
        });
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        })
    } catch (error) {
        console.error('Failed to start the application', error);
    }
}
init();