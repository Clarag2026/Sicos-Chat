const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');

// 📁 ARCHIVOS
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });


// 🔐 LOGIN
router.get('/login', (req, res) => {
    res.render('login');
});


// 🔐 LOGIN PROCESO
router.post('/login', (req, res) => {

    const { username, password, deptoSeleccionado } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE username = ? AND password = ?",
        [username, password],
        (err, result) => {

            if (err) return res.send("Error");

            if (result.length === 0) {
                return res.send("Credenciales incorrectas");
            }

            const user = result[0];
            const deptoUser = user.departamento;
            const rol = user.rol || 'empleado';

            if (rol === 'admin') {
                const deptoFinal = deptoSeleccionado || deptoUser;
                return res.redirect(`/empleado/chat/0?depto=${deptoFinal}&rol=admin`);
            }

            if (deptoSeleccionado && deptoSeleccionado !== deptoUser) {
                return res.send("⚠️ No tienes acceso a este departamento");
            }

            const deptoFinal = deptoSeleccionado || deptoUser;

            res.redirect(`/empleado/chat/0?depto=${deptoFinal}&rol=empleado`);
        }
    );
});


// 💬 VER CHAT (🔥 FIX PRINCIPAL)
router.get('/chat/:id', (req, res) => {

    const chatId = req.params.id; // ✅ FALTABA ESTO
    const depto = req.query.depto;
    const rol = req.query.rol;

    // 🔥 marcar como visto
    if(chatId != 0){
        db.query(
            "UPDATE mensajes SET visto = 1 WHERE chat_id = ? AND emisor = 'cliente'",
            [chatId]
        );
    }

    db.query(
        `
        SELECT chats.*, 
        (
            SELECT COUNT(*) 
            FROM mensajes 
            WHERE mensajes.chat_id = chats.id 
            AND mensajes.visto = 0 
            AND mensajes.emisor = 'cliente'
        ) as no_leidos
        FROM chats 
        WHERE departamento = ?
        `,
        [depto],
        (err, chats) => {

            if (err) return res.send("Error chats");

            function cargarMensajes() {

                if (chatId == 0) {
                    return res.render('chat_empleado', {
                        chats,
                        mensajes: [],
                        chatId,
                        depto,
                        rol
                    });
                }

                db.query(
                    "SELECT * FROM mensajes WHERE chat_id = ? ORDER BY fecha ASC",
                    [chatId],
                    (err2, mensajes) => {

                        if (err2) return res.send("Error mensajes");

                        res.render('chat_empleado', {
                            chats,
                            mensajes,
                            chatId,
                            depto,
                            rol
                        });
                    }
                );
            }

            cargarMensajes();
        }
    );
});


// ✉️ RESPONDER
router.post('/responder', (req, res) => {

    const { chat_id, mensaje } = req.body;
    const io = req.app.get('io');

    if (!chat_id || !mensaje) return res.sendStatus(400);

    db.query(
        "INSERT INTO mensajes (chat_id, emisor, mensaje) VALUES (?, 'empleado', ?)",
        [chat_id, mensaje],
        (err) => {

            if (err) return res.sendStatus(500);

            db.query(
                "UPDATE chats SET estado = 'pendiente' WHERE id = ?",
                [chat_id]
            );

            // 🔥 SOLO UNO
            io.emit("nuevoMensaje", {
                chat_id,
                emisor: "empleado",
                mensaje
            });

            res.sendStatus(200);
        }
    );
});


// 📎 ARCHIVO
router.post('/archivo', upload.single('archivo'), (req, res) => {

    const { chat_id } = req.body;
    const io = req.app.get('io');

    if (!req.file) return res.sendStatus(400);

    const ruta = "/uploads/" + req.file.filename;

    db.query(
        "INSERT INTO mensajes (chat_id, emisor, mensaje) VALUES (?, 'empleado', ?)",
        [chat_id, ruta],
        (err) => {

            if (err) return res.sendStatus(500);

            // 🔥 SOLO UNO (AQUÍ ESTABA EL PROBLEMA)
            io.emit("nuevoMensaje", {
                chat_id,
                emisor: "empleado",
                mensaje: ruta
            });

            res.sendStatus(200);
        }
    );
});

// FINALIZAR
router.post('/finalizar', (req, res) => {

    const { chat_id, depto, rol } = req.body;

    db.query(
        "UPDATE chats SET estado = 'atendido' WHERE id = ?",
        [chat_id],
        () => {
            res.redirect(`/empleado/chat/0?depto=${depto}&rol=${rol}`);
        }
    );
});

router.post('/editar-nombre', (req, res) => {

    const { chat_id, nombre } = req.body;

    db.query(
        "UPDATE chats SET cliente_nombre = ? WHERE id = ?",
        [nombre, chat_id],
        (err) => {
            if (err) return res.sendStatus(500);
            res.sendStatus(200);
        }
    );
});

// LOGOUT
router.get('/logout', (req, res) => {
    res.redirect('/empleado/login');
});

module.exports = router;