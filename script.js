// Configuración Supabase
const supabaseUrl = 'https://obkrmrnitvledhnhkabd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ia3Jtcm5pdHZsZWRobmhrYWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTg2MTgsImV4cCI6MjA2NDg5NDYxOH0.j0fWrh1HHOwoNUSVdeorAe0eFEmwuZXOvahDVrX2MwU';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Token Mapbox
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9uYWRhbWVzIiwiYSI6ImNtNGhlN2RyZjA2MWoyaXIwcmM5NzRwdnYifQ.oqPy7jl2AFDg-aVwWdd7Sw';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-69.9, 18.5], // RD approx center
  zoom: 7
});

let negocios = [];
let markers = [];
let provincias = [];
let ciudades = [];

const selectProvincia = document.getElementById('provincia');
const selectCiudad = document.getElementById('ciudad');
const inputSearch = document.getElementById('search');
const listado = document.getElementById('listado');

async function fetchProvincias() {
  // Obtener provincias únicas de Supabase
  const { data, error } = await supabaseClient
    .from('listings')
    .select('province', { distinct: true, order: 'province' });

  if (error) {
    console.error('Error fetching provincias:', error);
    selectProvincia.innerHTML = '<option>Error cargando provincias</option>';
    return;
  }

  provincias = data.map(d => d.province).filter(Boolean).sort();
  selectProvincia.innerHTML = `<option value="">Todas las provincias</option>` +
    provincias.map(p => `<option value="${p}">${p}</option>`).join('');
}

async function fetchCiudades(provincia = '') {
  if (!provincia) {
    selectCiudad.innerHTML = `<option value="">Seleccione provincia primero</option>`;
    return;
  }
  const { data, error } = await supabaseClient
    .from('listings')
    .select('city', { distinct: true, order: 'city' })
    .eq('province', provincia);

  if (error) {
    console.error('Error fetching ciudades:', error);
    selectCiudad.innerHTML = '<option>Error cargando ciudades</option>';
    return;
  }

  ciudades = data.map(d => d.city).filter(Boolean).sort();
  selectCiudad.innerHTML = `<option value="">Todas las ciudades</option>` +
    ciudades.map(c => `<option value="${c}">${c}</option>`).join('');
}

async function fetchNegocios() {
  let query = supabaseClient.from('listings').select('*');

  const provincia = selectProvincia.value;
  const ciudad = selectCiudad.value;
  const search = inputSearch.value.trim().toLowerCase();

  if (provincia) query = query.eq('province', provincia);
  if (ciudad) query = query.eq('city', ciudad);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching negocios:', error);
    listado.innerHTML = '<p>Error cargando negocios.</p>';
    return;
  }

  negocios = data.filter(n => {
    if (!search) return true;
    return (n.title && n.title.toLowerCase().includes(search)) ||
           (n.description && n.description.toLowerCase().includes(search));
  });

  renderListado();
  renderMarkers();
}

function renderListado() {
  if (negocios.length === 0) {
    listado.innerHTML = '<p>No se encontraron negocios.</p>';
    return;
  }

  listado.innerHTML = negocios.map(n => `
    <div class="negocio" data-id="${n.place_id}">
      <strong>${n.title || 'Sin título'}</strong><br />
      <small>${n.address || ''} - ${n.city || ''} - ${n.province || ''}</small>
    </div>
  `).join('');

  // Añadir evento click a cada negocio listado
  document.querySelectorAll('.negocio').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const negocio = negocios.find(n => n.place_id === id);
      if (negocio) {
        // Centrar mapa y abrir popup
        map.flyTo({ center: [negocio.longitude, negocio.latitude], zoom: 14 });
        openPopup(negocio);
        highlightSelected(id);
      }
    });
  });
}

function clearMarkers() {
  markers.forEach(m => m.remove());
  markers = [];
}

function renderMarkers() {
  clearMarkers();

  negocios.forEach(n => {
    if (!n.latitude || !n.longitude) return;

    const marker = new mapboxgl.Marker()
      .setLngLat([n.longitude, n.latitude])
      .addTo(map);

    marker.getElement().addEventListener('click', () => {
      openPopup(n);
      highlightSelected(n.place_id);
    });

    markers.push(marker);
  });
}

let currentPopup = null;

function openPopup(negocio) {
  if (currentPopup) currentPopup.remove();

  const popup = new mapboxgl.Popup({ offset: 25 })
    .setLngLat([negocio.longitude, negocio.latitude])
    .setHTML(`
      <h3>${negocio.title || 'Sin título'}</h3>
      <p>${negocio.address || ''}</p>
      <p><a href="${negocio.website || '#'}" target="_blank">Sitio web</a></p>
      <p>Teléfono: ${negocio.phone || 'No disponible'}</p>
    `)
    .addTo(map);

  currentPopup = popup;
}

function highlightSelected(place_id) {
  document.querySelectorAll('.negocio').forEach(el => {
    if (el.getAttribute('data-id') === place_id) {
      el.classList.add('selected');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.classList.remove('selected');
    }
  });
}

// Eventos para filtros y búsqueda
selectProvincia.addEventListener('change', async () => {
  await fetchCiudades(selectProvincia.value);
  await fetchNegocios();
});

selectCiudad.addEventListener('change', fetchNegocios);
inputSearch.addEventListener('input', fetchNegocios);

// Inicializar app
(async function init() {
  await fetchProvincias();
  await fetchCiudades();
  await fetchNegocios();
})();
