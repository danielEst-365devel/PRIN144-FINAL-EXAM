const fs = require('fs')
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml')

const file  =  fs.readFileSync(process.cwd() + '/swagger.yaml', 'utf8')
const swaggerDocument = YAML.parse(file)
const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css"


const { sql } = require('@vercel/postgres');
require('dotenv').config();
const express = require('express')
const app = express();

// enable middleware to parse body of Content-type: application/json
app.use(express.json());

// Root endpoint to display name with styling
app.get('/', (req, res) => {
    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    }
                    .container {
                        background: white;
                        padding: 2rem 4rem;
                        border-radius: 10px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    h1 {
                        color: #333;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>PRIN144-Final-Exam: DANIEL ESTRELLA</h1>
                </div>
            </body>
        </html>
    `;
    res.send(html);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
	customCss:
		'.swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }',
	customCssUrl: CSS_URL,
}));

// Get all menu items
app.get('/menu', async (req, res) => {
    if (req.query.id) {
        const menuItem = await sql`SELECT * FROM FoodMenu WHERE id = ${req.query.id};`;
        if (menuItem.rowCount > 0) {
            res.json(menuItem.rows[0]);
        } else {
            res.status(404).json({ message: 'Menu item not found' });
        }
        return;
    }
    const menu = await sql`SELECT * FROM FoodMenu ORDER BY id;`;
    res.json(menu.rows);
});

// Get menu item by id
app.get('/menu/:id', async (req, res) => {
    const id = req.params.id;
    const menuItem = await sql`SELECT * FROM FoodMenu WHERE id = ${id};`;
    if (menuItem.rowCount > 0) {
        res.json(menuItem.rows[0]);
    } else {
        res.status(404).json({ message: 'Menu item not found' });
    }
});

// Create new menu item
app.post('/menu', async (req, res) => {
    const { menu, category, price, isavailable, preparationtimeminutes } = req.body;
    
    // Validate price is a decimal and prep time is an integer
    const numPrice = parseFloat(price);
    const numPrepTime = parseInt(preparationtimeminutes);
    
    const result = await sql`
        INSERT INTO FoodMenu (menu, category, price, isavailable, preparationtimeminutes) 
        VALUES (${menu}, ${category}, ${numPrice}, ${isavailable || true}, ${numPrepTime})
        RETURNING id;
    `;
    res.status(201).json({ id: result.rows[0].id });
});

// Update menu item
app.put('/menu/:id', async (req, res) => {
    const id = req.params.id;
    const menuItem = await sql`SELECT * FROM FoodMenu WHERE id = ${id};`;
    
    if (menuItem.rowCount === 0) {
        return res.status(404).json({ message: 'Menu item not found' });
    }

    const currentItem = menuItem.rows[0];
    const updatedItem = {
        menu: req.body.menu ?? currentItem.menu,
        category: req.body.category ?? currentItem.category,
        price: parseFloat(req.body.price ?? currentItem.price),
        isavailable: req.body.isavailable ?? currentItem.isavailable,
        preparationtimeminutes: parseInt(req.body.preparationtimeminutes ?? currentItem.preparationtimeminutes)
    };

    await sql`
        UPDATE FoodMenu 
        SET menu = ${updatedItem.menu},
            category = ${updatedItem.category},
            price = ${updatedItem.price},
            isavailable = ${updatedItem.isavailable},
            preparationtimeminutes = ${updatedItem.preparationtimeminutes}
        WHERE id = ${id}
    `;

    const result = await sql`SELECT * FROM FoodMenu WHERE id = ${id};`;
    res.json(result.rows[0]);
});

// Delete menu item
app.delete('/menu/:id', async (req, res) => {
    const id = req.params.id;
    const result = await sql`DELETE FROM FoodMenu WHERE id = ${id};`;
    if (result.rowCount > 0) {
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Menu item not found' });
    }
});

// 404 handler - must be placed after all other routes
app.use((req, res) => {
    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #ff6b6b 0%, #ffc0c0 100%);
                    }
                    .container {
                        background: white;
                        padding: 2rem 4rem;
                        border-radius: 10px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        text-align: center;
                    }
                    h1 {
                        color: #ff4444;
                        margin-bottom: 1rem;
                    }
                    p {
                        color: #666;
                        margin-bottom: 1rem;
                    }
                    .back-link {
                        color: #0066cc;
                        text-decoration: none;
                    }
                    .back-link:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>404 - Page Not Found</h1>
                    <p>The requested API endpoint does not exist.</p>
                    <p>Requested URL: ${req.url}</p>
                    <a href="/" class="back-link">Go back to home</a>
                </div>
            </body>
        </html>
    `;
    res.status(404).send(html);
});

module.exports = app;