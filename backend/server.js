const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();
const PORT = 3000;

// Configura CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept']  // Added 'Accept' header
}));

app.use(express.json());

// Configura la conexión MySQL
const db = mysql.createConnection({
    host: '127.0.0.1',      // Cambia si tu servidor MySQL está en otro host
    port: 3306,        // Puerto separado
    user: 'root',     // Tu usuario de MySQL
    password: '1123581321Seriedefibonacci', // Tu contraseña de MySQL
    database: 'GamePort'    // El nombre de tu base de datos
});

// Ruta de registro
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // Verifica si el usuario o email ya existen
    db.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email],
        async (err, results) => {
            if (err) return res.status(500).json({ message: 'Error de servidor.' });
            if (results.length > 0) {
                return res.status(400).json({ message: 'Usuario o correo ya registrado.' });
            }

            // Encripta la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Inserta el nuevo usuario
            db.query(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword],
                (err) => {
                    if (err) return res.status(500).json({ message: 'Error al registrar.' });
                    return res.status(200).json({ message: 'Registro exitoso.' });
                }
            );
        }
    );
});

// Ruta de login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    db.query(
        'SELECT * FROM users WHERE email = ?',
        [email],
        async (err, results) => {
            if (err) return res.status(500).json({ message: 'Error de servidor.' });
            if (results.length === 0) {
                return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
            }

            const user = results[0];
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
            }

            // Aquí podrías generar un token de sesión si lo necesitas
            return res.status(200).json({ message: 'Inicio de sesión exitoso.' });
        }
    );
});

// Ruta para obtener el perfil del usuario
app.get('/api/user-profile/:email', (req, res) => {
    const email = req.params.email;
    if (!email) {
        return res.status(400).json({ message: 'Email es requerido' });
    }
    
    console.log('Requesting profile for:', email);

    db.query(
        'SELECT username, email, favorite_games FROM users WHERE email = ?',
        [email],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Error de servidor' });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            console.log('Found user data:', results[0]);
            res.json(results[0]);
        }
    );
});

// Ruta para actualizar los juegos favoritos
app.post('/api/update-favorites', (req, res) => {
    const { email, favorites } = req.body;
    console.log('Updating favorites for:', email, 'with:', favorites); // Debug log
    
    if (!email) {
        return res.status(400).json({ message: 'Email es requerido' });
    }

    db.query(
        'UPDATE users SET favorite_games = ? WHERE email = ?',
        [favorites, email],
        (err, result) => {
            if (err) {
                console.error('Update error:', err);
                return res.status(500).json({ message: 'Error al actualizar favoritos' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.json({ message: 'Favoritos actualizados correctamente' });
        }
    );
});

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`); 
});
// ... existing code ...

// Ruta de logout
app.post('/api/logout', (req, res) => {
  const { email } = req.body;
  
  // Log the logout event (optional, for analytics/security)
  if (email) {
    console.log(`Usuario desconectado: ${email} - ${new Date().toISOString()}`);
  }
  
  // Si decides implementar tokens o sesiones en el futuro,
  // aquí invalidarías el token/sesión
  
  return res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
});
// Ruta para eliminar la cuenta de usuario (DELETE)
app.delete('/api/delete-account/:email', (req, res) => {
    const emailToDelete = req.params.email;
    console.log('Attempting to delete account for:', emailToDelete); // Log de depuración

    if (!emailToDelete) {
        return res.status(400).json({ message: 'Email es requerido para la eliminación.' });
    }

    // Consulta SQL para eliminar el usuario
    db.query(
        'DELETE FROM users WHERE email = ?',
        [emailToDelete],
        (err, result) => {
            if (err) {
                console.error('Error al eliminar de la base de datos:', err);
                return res.status(500).json({ message: 'Error de servidor al eliminar la cuenta.' });
            }
            
            if (result.affectedRows === 0) {
                // Esto ocurre si el email no existe en la base de datos
                return res.status(404).json({ message: 'Usuario no encontrado para eliminar.' });
            }

            // Éxito en la eliminación
            console.log(`Cuenta eliminada con éxito: ${emailToDelete}`);
            return res.status(200).json({ message: 'Cuenta eliminada con éxito. ¡Adiós!' });
        }
    );
});