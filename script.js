// Mapbox Token
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9uYWRhbWVzIiwiYSI6ImNtNGhlN2RyZjA2MWoyaXIwcmM5NzRwdnYifQ.oqPy7jl2AFDg-aVwWdd7Sw';

// Inicializar Telegram
let tg = window.Telegram.WebApp;
tg.expand();

// Inicializar Mapa
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-69.9, 18.5],
  zoom: 13
});

// Lista de negocios (mock)
const negocios = [{'nombre': 'Farmacia Central', 'descripcion': 'Abierto 24 horas en Santo Domingo', 'latitud': 18.4711, 'longitud': -69.8923}, {'nombre': 'Colmado El Buen Precio', 'descripcion': 'Productos frescos y buenos precios', 'latitud': 18.479, 'longitud': -69.8901}, {'nombre': 'Pizzería Don Mario', 'descripcion': 'La mejor pizza artesanal', 'latitud': 18.4742, 'longitud': -69.8915}, {'nombre': 'Librería Nacional', 'descripcion': 'Libros y útiles escolares', 'latitud': 18.4662, 'longitud': -69.8957}, {'nombre': 'Supermercado La Bendición', 'descripcion': 'Tu mercado de confianza', 'latitud': 18.4725, 'longitud': -69.8888}, {'nombre': 'Veterinaria PetCare', 'descripcion': 'Cuida a tus mascotas con amor', 'latitud': 18.468, 'longitud': -69.893}, {'nombre': 'Ferretería La Solución', 'descripcion': 'Todo para tu hogar y más', 'latitud': 18.4708, 'longitud': -69.8905}, {'nombre': 'Gimnasio PowerFit', 'descripcion': 'Entrena con los mejores', 'latitud': 18.4751, 'longitud': -69.8942}, {'nombre': 'Salón Bella Estética', 'descripcion': 'Belleza y bienestar en un solo lugar', 'latitud': 18.4699, 'longitud': -69.8918}, {'nombre': 'Cafetería El Descanso', 'descripcion': 'Café y postres deliciosos', 'latitud': 18.4733, 'longitud': -69.8894}];

// Agregar marcadores
negocios.forEach(negocio => {
  if (!negocio.latitud || !negocio.longitud) return;

  new mapboxgl.Marker()
    .setLngLat([negocio.longitud, negocio.latitud])
    .setPopup(new mapboxgl.Popup().setHTML(`
      <strong>${negocio.nombre}</strong><br/>
      <small>${negocio.descripcion}</small>
    `))
    .addTo(map);
});