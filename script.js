document.addEventListener('DOMContentLoaded', () => {

    // --- CREDENCIALES Y CONFIGURACIÓN ---
    const SUPABASE_URL = 'https://obkrmrnitvledhnhkabd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ia3Jtcm5pdHZsZWRobmhrYWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTg2MTgsImV4cCI6MjA2NDg5NDYxOH0.j0fWrh1HHOwoNUSVdeorAe0eFEmwuZXOvahDVrX2MwU';
    const MAPBOX_TOKEN = 'pk.eyJ1Ijoicm9uYWRhbWVzIiwiYSI6ImNtNGhlN2RyZjA2MWoyaXIwcmM5NzRwdnYifQ.oqPy7jl2AFDg-aVwWdd7Sw';

    // Inicializar Supabase
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- ELEMENTOS DEL DOM ---
    const listingsList = document.getElementById('listings-list');
    const mapContainer = document.getElementById('map');
    const modal = document.getElementById('details-modal');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const appContainer = document.getElementById('app-container');
    const listingsContainer = document.getElementById('listings-container');
    const mapSection = document.getElementById('map-container');
    const showListBtn = document.getElementById('show-list-btn');
    const showMapBtn = document.getElementById('show-map-btn');

    let map;
    let markers = {}; // Objeto para guardar los marcadores del mapa

    // --- FUNCIÓN PRINCIPAL ---
    async function main() {
        // 1. Inicializar mapa
        initializeMap();

        // 2. Obtener datos de Supabase
        const { data: listings, error } = await supabase
            .from('listings')
            .select('*');

        if (error) {
            console.error('Error fetching listings:', error);
            listingsList.innerHTML = '<div class="loader">Error al cargar los datos.</div>';
            return;
        }

        if (listings && listings.length > 0) {
            // 3. Renderizar la lista y los marcadores
            renderListings(listings);
            addMarkersToMap(listings);

            // 4. Centrar el mapa en el primer negocio
            if (listings[0].latitude && listings[0].longitude) {
                map.flyTo({
                    center: [listings[0].longitude, listings[0].latitude],
                    zoom: 13
                });
            }
        } else {
            listingsList.innerHTML = '<div class="loader">No se encontraron negocios.</div>';
        }
        
        // 5. Configurar eventos
        setupEventListeners();
    }

    // --- FUNCIONES AUXILIARES ---

    function initializeMap() {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        map = new mapboxgl.Map({
            container: mapContainer,
            style: 'mapbox://styles/mapbox/streets-v12', // Estilo del mapa
            center: [-3.703790, 40.416775], // Centro inicial (Madrid, por defecto)
            zoom: 11
        });
        map.addControl(new mapboxgl.NavigationControl());
    }

    function renderListings(listings) {
        listingsList.innerHTML = ''; // Limpiar el loader
        listings.forEach(listing => {
            const item = document.createElement('div');
            item.className = 'listing-item';
            item.dataset.id = listing.id; // Usamos el ID para vincularlo al marcador

            item.innerHTML = `
                <h3>${listing.title || 'Sin título'}</h3>
                <p>${listing.category || 'Categoría no disponible'}</p>
                <p>${listing.address || 'Dirección no disponible'}</p>
            `;

            // Evento para hacer click en la lista
            item.addEventListener('click', () => {
                // Centrar mapa en el marcador
                if (listing.latitude && listing.longitude) {
                    map.flyTo({
                        center: [listing.longitude, listing.latitude],
                        zoom: 15
                    });
                }
                
                // Resaltar item en la lista
                document.querySelectorAll('.listing-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');

                // Mostrar modal de detalles
                showDetailsModal(listing);
            });

            listingsList.appendChild(item);
        });
    }

    function addMarkersToMap(listings) {
        listings.forEach(listing => {
            if (listing.latitude && listing.longitude) {
                const marker = new mapboxgl.Marker({
                        color: "#007BFF"
                    })
                    .setLngLat([listing.longitude, listing.latitude])
                    .addTo(map);

                // Guardar referencia al marcador
                markers[listing.id] = marker;

                // Evento para hacer click en el marcador
                marker.getElement().addEventListener('click', (e) => {
                    e.stopPropagation(); // Evita que se cierre el modal si se abre uno nuevo
                    showDetailsModal(listing);
                });
            }
        });
    }

    function showDetailsModal(listing) {
        // Formatear horario de trabajo
        let workTimeHtml = 'No disponible';
        if (listing.work_time && typeof listing.work_time === 'object') {
             workTimeHtml = `<table class="work-time-table">${Object.entries(listing.work_time)
                .map(([day, hours]) => `<tr><td>${day.charAt(0).toUpperCase() + day.slice(1)}</td><td>${hours}</td></tr>`)
                .join('')}</table>`;
        }

        modalBody.innerHTML = `
            <img src="${listing.main_image || 'https://via.placeholder.com/600x200?text=Sin+Imagen'}" alt="${listing.title}" class="modal-main-image">
            <div class="modal-header">
                <h2>${listing.title || ''}</h2>
                <p>${listing.category || ''}</p>
                <div class="rating">
                    <span class="rating-stars">${'★'.repeat(Math.round(listing.rating || 0))}${'☆'.repeat(5 - Math.round(listing.rating || 0))}</span>
                    <span>${listing.rating || 'N/A'} (${listing.rating_count || 0} reseñas)</span>
                </div>
            </div>
            <div class="modal-details">
                <div class="detail-item">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    <span>${listing.address_info_address || listing.address || 'No disponible'}</span>
                </div>
                ${listing.phone ? `
                <div class="detail-item">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    <span>${listing.phone}</span>
                </div>` : ''}
                ${listing.website ? `
                <div class="detail-item">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    <a href="${listing.website}" target="_blank" rel="noopener noreferrer">${listing.website}</a>
                </div>` : ''}
                <div class="detail-item">
                     <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    <div><strong>Horario:</strong> ${workTimeHtml}</div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }

    function hideDetailsModal() {
        modal.style.display = 'none';
        document.querySelectorAll('.listing-item').forEach(el => el.classList.remove('active'));
    }

    function setupEventListeners() {
        // Cerrar modal
        modalCloseBtn.addEventListener('click', hideDetailsModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideDetailsModal();
            }
        });

        // Toggle de vistas en móvil
        showListBtn.addEventListener('click', () => {
            listingsContainer.classList.add('active');
            mapSection.classList.remove('active');
            showListBtn.classList.add('active');
            showMapBtn.classList.remove('active');
        });

        showMapBtn.addEventListener('click', () => {
            listingsContainer.classList.remove('active');
            mapSection.classList.add('active');
            showListBtn.classList.remove('active');
            showMapBtn.classList.add('active');
            // Importante: redimensionar el mapa cuando se muestra
            if(map) map.resize(); 
        });

        // Forzar vista inicial en móvil
        if (window.innerWidth <= 768) {
            listingsContainer.classList.add('active');
            mapSection.classList.remove('active');
        } else {
             listingsContainer.classList.add('active');
             mapSection.classList.add('active');
        }
    }

    // Iniciar la aplicación
    main();
});
