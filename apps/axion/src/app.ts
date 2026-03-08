import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define routes
app.get('/', (req, res) => {
    res.send('Welcome to the Axion application!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Axion app is running on http://localhost:${PORT}`);
});