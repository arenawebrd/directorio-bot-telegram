
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9uYWRhbWVzIiwiYSI6ImNtNGhlN2RyZjA2MWoyaXIwcmM5NzRwdnYifQ.oqPy7jl2AFDg-aVwWdd7Sw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-69.9312, 18.479], // Santo Domingo
  zoom: 11
});

const supabaseUrl = 'https://obkrmrnitvledhnhkabd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ia3Jtcm5pdHZsZWRobmhrYWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTg2MTgsImV4cCI6MjA2NDg5NDYxOH0.j0fWrh1HHOwoNUSVdeorAe0eFEmwuZXOvahDVrX2MwU';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function cargarNegocios() {
  const { data, error } = await supabase
    .from('listings')
    .select('title, description, latitude, longitude, phone, main_image');

  if (error) {
    console.error('Error al cargar los negocios:', error);
    return;
  }

  data.forEach(negocio => {
    if (!negocio.latitude || !negocio.longitude) return;

    const popupHtml = `
      <strong>${negocio.title || 'Sin título'}</strong><br/>
      ${negocio.description || ''}<br/>
      <small>${negocio.phone || ''}</small><br/>
      ${negocio.main_image ? `<img src="${negocio.main_image}" style="width:100px;height:auto;" />` : ''}
    `;

    new mapboxgl.Marker()
      .setLngLat([negocio.longitude, negocio.latitude])
      .setPopup(new mapboxgl.Popup().setHTML(popupHtml))
      .addTo(map);
  });
}

cargarNegocios();
