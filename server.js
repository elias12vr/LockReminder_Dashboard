const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configurar motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servir archivos estáticos (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.render('index', { title: 'LockReminder Dashboard' });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});