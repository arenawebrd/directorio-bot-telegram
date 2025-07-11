mapboxgl.accessToken = 'pk.eyJ1Ijoicm9uYWRhbWVzIiwiYSI6ImNtNGhlN2RyZjA2MWoyaXIwcmM5NzRwdnYifQ.oqPy7jl2AFDg-aVwWdd7Sw';

const supabaseUrl = 'https://obkrmrnitvledhnhkabd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ia3Jtcm5pdHZsZWRobmhrYWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTg2MTgsImV4cCI6MjA2NDg5NDYxOH0.j0fWrh1HHOwoNUSVdeorAe0eFEmwuZXOvahDVrX2MwU';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-69.9312, 18.479],
  zoom: 11
});

const listadoEl = document.getElementById('listado');
const provinciaSelect = document.getElementById('provincia');
const ciudadSelect = document.getElementById('ciudad');
const searchInput = document.getElementById('search');

let negocios = [];
let markers = [];
let selectedId = null;

function limpiarMarcadores() {
  markers.forEach(m => m.remove());
  markers = [];
}

function seleccionarNegocio(id) {
  selectedId = id;
  // Marca el item seleccionado en lista
  document.querySelectorAll('.negocio').forEach(div => {
    div.classList.toggle('selected', div.dataset.id === id);
  });
  // Abre popup del marcador seleccionado y centra el mapa
  markers.forEach(m => {
    if (m.id === id) {
      m.marker.togglePopup();
      map.flyTo({center: m.marker.getLngLat(), zoom: 14});
    } else {
      m.marker.getPopup().remove();
    }
  });
}

function renderListado() {
  listadoEl.innerHTML = '';
  negocios.forEach(n => {
    const div = document.createElement('div');
    div.className = 'negocio';
    div.dataset.id = n.place_id;
    div.innerHTML = `
      <h3>${n.title}</h3>
      <p>${n.address || ''}</p>
      <p><small>${n.phone || ''}</small></p>
    `;
    div.addEventListener('click', () => seleccionarNegocio(n.place_id));
    listadoEl.appendChild(div);
  });
}

function filtrarNegocios() {
  const provincia = provinciaSelect.value;
  const ciudad = ciudadSelect.value;
  const searchTerm = searchInput.value.toLowerCase();

  return negocios.filter(n => {
    return (!provincia || n.province === provincia) &&
           (!ciudad || n.city === ciudad) &&
           (!searchTerm || (n.title && n.title.toLowerCase().includes(searchTerm)));
  });
}

function mostrarNegociosEnMapa() {
  limpiarMarcadores();
  const filtrados = filtrarNegocios();

  filtrados.forEach(n => {
    if (!n.latitude || !n.longitude) return;
    const popup = new mapboxgl.Popup({offset: 25}).setHTML(`
      <h3>${n.title}</h3>
      <p>${n.address || ''}</p>
      <p><small>${n.phone || ''}</small></p>
    `);
    const marker = new mapboxgl.Marker()
      .setLngLat([n.longitude, n.latitude])
      .setPopup(popup)
      .addTo(map);

    marker.getElement().addEventListener('click', () => seleccionarNegocio(n.place_id));
    markers.push({id: n.place_id, marker});
  });
}

async function cargarFiltros() {
  const { data, error } = await supabase.from('listings').select('province, city');
  if (error) {
    console.error('Error cargando filtros:', error);
    return;
  }
  const provincias = [...new Set(data.map(d => d.province).filter(Boolean))].sort();
  const ciudades = [...new Set(data.map(d => d.city).filter(Boolean))].sort();

  provinciaSelect.innerHTML = '<option value="">Todas Provincias</option>' + provincias.map(p => `<option value="${p}">${p}</option>`).join('');
  ciudadSelect.innerHTML = '<option value="">Todas Ciudades</option>' + ciudades.map(c => `<option value="${c}">${c}</option>`).join('');
}

async function cargarNegocios() {
  const { data, error } = await supabase.from('listings').select('*').limit(100);
  if (error) {
    console.error('Error cargando negocios:', error);
    return;
  }
  negocios = data;
  renderListado();
  mostrarNegociosEnMapa();
}

provinciaSelect.addEventListener('change', () => {
  renderListado();
  mostrarNegociosEnMapa();
});
ciudadSelect.addEventListener('change', () => {
  renderListado();
  mostrarNegociosEnMapa();
});
searchInput.addEventListener('input', () => {
  renderListado();
  mostrarNegociosEnMapa();
});

map.on('load', () => {
  cargarFiltros();
  cargarNegocios();
});
