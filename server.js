const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const port = 3000; // Puerto para el servidor web

// Configurar la conexión a la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.stack);
    } else {
        console.log('Conectado a la base de datos');
    }
});

// Servir inicio.html como la página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
});

// Middleware para manejar datos de formulario y cookies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Configurar almacenamiento de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Agregar una marca de tiempo al nombre del archivo
    }
});

const upload = multer({ storage: storage });

// Configurar la carpeta 'public' para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para manejar el envío del formulario desde index.html
app.post('/submit-index', upload.single('recibo'), async (req, res) => {
    const { correo, nombre, celular, direccion, tarjeta, ntarjeta } = req.body;
    const recibo = req.file ? req.file.filename : 'No se subió archivo';

    try {
        const query = `
            INSERT INTO Usuario (CelNumero, Unombre, Uapellido, Uresidencia, Uemail, Urecibo, UtipoTarjeta, UnumTarjeta)
            VALUES ($1, $2, '', $3, $4, $5, $6, $7)
        `;
        const values = [celular, nombre, direccion, correo, recibo, tarjeta, ntarjeta];
        await pool.query(query, values);
        res.sendFile(path.join(__dirname, 'public', 'success.html'));
    } catch (err) {
        console.error('Error al guardar los datos en la base de datos:', err);
        res.status(500).send('Error al guardar los datos en la base de datos');
    }
});

// Ruta para manejar el envío del formulario desde el nuevo formulario
app.post('/submit', upload.single('foto'), async (req, res) => {
    const { nombre, celular, cedula, direccion, oficio } = req.body;
    const foto = req.file ? req.file.filename : 'No se subió archivo';

    try {
        const query = `
            INSERT INTO Trabajador (IDtrabajador, Tnombre, Tapellido, TnumEstrellas, TfotoPerfil, IDimagen, Estado, Direccion)
            VALUES ($1, $2, '', 0, $3, 0, true, $4)
        `;
        const values = [cedula, nombre, foto, direccion];
        await pool.query(query, values);
        res.sendFile(path.join(__dirname, 'public', 'success.html'));
    } catch (err) {
        console.error('Error al guardar los datos en la base de datos:', err);
        res.status(500).send('Error al guardar los datos en la base de datos');
    }
});

// Sesiones temporales para usuarios y trabajadores
const userSessions = new Map();
const workerSessions = new Map();

// Ruta para manejar el inicio de sesión del usuario
app.post('/login', async (req, res) => {
    const { name, cell, email } = req.body;

    try {
        const query = `
            SELECT * FROM Usuario WHERE Unombre = $1 AND CelNumero = $2 AND Uemail = $3
        `;
        const values = [name, cell, email];
        const result = await pool.query(query, values);

        if (result.rows.length > 0) {
            const sessionId = Date.now().toString();
            userSessions.set(sessionId, { email: result.rows[0].uemail });

            res.cookie('sessionId', sessionId, { httpOnly: true });
            res.sendFile(path.join(__dirname, 'public', 'pagina-usuario.html'));
        } else {
            res.sendFile(path.join(__dirname, 'public', 'fail.html'));
        }
    } catch (err) {
        console.error('Error al autenticar el usuario:', err);
        res.status(500).send('Error al autenticar el usuario');
    }
});

// Ruta para manejar el inicio de sesión del trabajador
app.post('/worker-login', async (req, res) => {
    const { name, id } = req.body;

    try {
        const query = `
            SELECT * FROM Trabajador WHERE Tnombre = $1 AND IDtrabajador = $2
        `;
        const values = [name, id];
        const result = await pool.query(query, values);

        if (result.rows.length > 0) {
            const sessionId = Date.now().toString();
            workerSessions.set(sessionId, { name: result.rows[0].tnombre });

            res.cookie('workerSessionId', sessionId, { httpOnly: true });
            res.sendFile(path.join(__dirname, 'public', 'pagina_trabajador.html'));
        } else {
            res.sendFile(path.join(__dirname, 'public', 'fail.html'));
        }
    } catch (err) {
        console.error('Error al autenticar el trabajador:', err);
        res.status(500).send('Error al autenticar el trabajador');
    }
});

// Ruta para obtener la información del usuario
app.get('/user-info', (req, res) => {
    const sessionId = req.cookies.sessionId;
    const userInfo = userSessions.get(sessionId);

    if (userInfo) {
        res.json({ success: true, email: userInfo.email });
    } else {
        res.json({ success: false });
    }
});

// Ruta para obtener la información del trabajador
app.get('/worker-info', (req, res) => {
    const sessionId = req.cookies.workerSessionId;
    const workerInfo = workerSessions.get(sessionId);

    if (workerInfo) {
        res.json({ success: true, name: workerInfo.name });
    } else {
        res.json({ success: false });
    }
});



// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
