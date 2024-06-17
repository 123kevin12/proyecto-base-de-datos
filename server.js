//Inicializamos las dependencias
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

// Un get para que la pagina principal sea inicio.html de la carpeta public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
});

// Controlador para manejar datos de formulario y cookies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Configurar almacenamiento de multer para que las imagenes se guarden en la carpeta uploads
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

// Esto es necesario para que se usen los Html dentro de la carpeta public del programa
app.use(express.static(path.join(__dirname, 'public')));

// Funcion para manejar el envío de la informacion del formulario desde index.html donde los usuarios se registran
app.post('/submit-index', upload.single('recibo'), async (req, res) => {
    const { correo, nombre, celular, direccion, tarjeta, ntarjeta } = req.body;
    const recibo = req.file ? req.file.filename : 'No se subió archivo';

    try {
        //Query para que guarde la informacion en la tabla Usuario de la base de datos
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

// Funcion para controlar el envío del formulario desde el registro de los trabajadores
app.post('/submit', upload.single('foto'), async (req, res) => {
    const { nombre, celular, cedula, direccion, oficio } = req.body;
    const foto = req.file ? req.file.filename : 'No se subió archivo';

    try {
        //Query para que guarde la informacion en la tabla Trabajador de la base de datos
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

// Objetos para manejar el inicio de sesion del usuario o trabajador conectado
const userSessions = new Map();
const workerSessions = new Map();

// Funcion para manejar el inicio de sesión del usuario y verificar que existe en la base de datos
app.post('/login', async (req, res) => {
    const { name, cell, email } = req.body;

    try {
        //Query necesario para la verificacion de los datos
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

// Funcion para manejar el inicio de sesión del trabajador y verificar que esta en la base de datos
app.post('/worker-login', async (req, res) => {
    const { name, id } = req.body;

    try {
        //Query necesaria para verificar la informacion del trabajador
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

// Funcion para obtener la información del usuario
app.get('/user-info', (req, res) => {
    const sessionId = req.cookies.sessionId;
    const userInfo = userSessions.get(sessionId);

    if (userInfo) {
        res.json({ success: true, email: userInfo.email });
    } else {
        res.json({ success: false });
    }
});

// Funcion para obtener la información del trabajador
app.get('/worker-info', (req, res) => {
    const sessionId = req.cookies.workerSessionId;
    const workerInfo = workerSessions.get(sessionId);

    if (workerInfo) {
        res.json({ success: true, name: workerInfo.name });
    } else {
        res.json({ success: false });
    }
});

// funcion para que aparezcan los trabajadores con el oficio que se necesita
app.get('/workers', async (req, res) => {
    const service = req.query.service;

    try {
        const query = `
            SELECT Tnombre FROM Trabajador
            WHERE Oficio = $1
        `;
        const values = [service];
        const result = await pool.query(query, values);

        if (result.rows.length > 0) {
            const workers = result.rows.map(row => row.tnombre);
            res.json({ success: true, workers });
        } else {
            res.json({ success: false, workers: [] });
        }
    } catch (err) {
        console.error('Error al obtener los trabajadores:', err);
        res.status(500).json({ success: false, error: 'Error al obtener los trabajadores' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
