document.addEventListener('DOMContentLoaded', () => {

    // --- CREDENCIALES Y CONFIGURACIÓN ---
    const SUPABASE_URL = 'https://obkrmrnitvledhnhkabd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ia3Jtcm5pdHZsZWRobmhrYWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTg2MTgsImV4cCI6MjA2NDg5NDYxOH0.j0fWrh1HHOwoNUSVdeorAe0eFEmwuZXOvahDVrX2MwU';
    const MAPBOX_TOKEN = 'pk.eyJ1Ijoicm9uYWRhbWVzIiwiYSI6ImNtNGhlN2RyZjA2MWoyaXIwcmM5NzRwdnYifQ.oqPy7jl2AFDg-aVwWdd7Sw';

    // Inicializar Supabase. La librería global se llama 'supabase'.
    // Guardamos nuestra conexión específica en una constante llamada 'client'.
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const provinceSelect = document.getElementById('province-select');
    const localitySelect = document.getElementById('locality-select');

    let map;
    let markers = {}; // Objeto para guardar los marcadores del mapa

    // --- FUNCIÓN PRINCIPAL ---
    async function main() {
        // 1. Inicializar mapa
        initializeMap();

        // 2. Obtener datos de Supabase usando nuestra variable 'client'
        const { data: listings, error } = await client
            .from('listings')
            .select('*');

        if (error) {
            console.error('Error fetching listings:', error);
            listingsList.innerHTML = '<div class="loader">Error al cargar los datos.</div>';
            return;
        }

        if (listings && listings.length > 0) {
            // 3. Renderizar la lista y los marcadores
            populateFilters(listings);
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
        setupEventListeners(listings);
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
        listings.forEach((listing, index) => {
            const item = document.createElement('div');
            item.className = 'listing-item';
            item.dataset.id = listing.id; // Usamos el ID para vincularlo al marcador

            const status = listing.work_time?.work_hours?.current_status || 'closed';
            const statusText = status === 'open' ? 'Abierto' : 'Cerrado';
            const statusClass = status === 'open' ? 'open' : 'closed';

            item.innerHTML = `
                <div class="listing-image">
                    <img src="${listing.main_image || 'https://via.placeholder.com/100x100?text=Sin+Imagen'}" alt="${listing.title}">
                </div>
                <div class="listing-info">
                    <h3>${listing.title || 'Sin título'}</h3>
                    <p>${listing.category || 'Categoría no disponible'}</p>
                    <div class="rating">
                        <span class="rating-stars">${'★'.repeat(Math.round(listing.rating || 0))}${'☆'.repeat(5 - Math.round(listing.rating || 0))}</span>
                        <span>${listing.rating || 'N/A'}</span>
                    </div>
                    <p class="status ${statusClass}">${statusText}</p>
                </div>
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

                // En móvil, si es necesario, cambiar a la vista de mapa
                if (window.innerWidth <= 768 && !appContainer.classList.contains('map-view-active')) {
                    showMapBtn.click(); // Simular click para activar la vista de mapa
                }

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
        let workTimeData = listing.work_time;

        if (workTimeData && typeof workTimeData === 'string') {
            try {
                workTimeData = JSON.parse(workTimeData);
            } catch (e) {
                console.error("Error parsing work_time JSON:", e);
                workTimeData = null;
            }
        }

        const timetable = workTimeData?.work_hours?.timetable;
        const currentStatus = workTimeData?.work_hours?.current_status || 'closed';
        const statusText = currentStatus === 'open' ? 'Abierto' : 'Cerrado';
        const statusClass = currentStatus === 'open' ? 'open' : 'closed';

        if (timetable && typeof timetable === 'object' && Object.keys(timetable).length > 0) {
            const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const dayTranslations = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };

            const tableRows = daysOrder
                .filter(day => timetable[day] && timetable[day].length > 0)
                .map(day => {
                    const daySchedule = timetable[day][0];
                    if (!daySchedule || !daySchedule.open || !daySchedule.close) return '';
                    const open = `${String(daySchedule.open.hour).padStart(2, '0')}:${String(daySchedule.open.minute).padStart(2, '0')}`;
                    const close = `${String(daySchedule.close.hour).padStart(2, '0')}:${String(daySchedule.close.minute).padStart(2, '0')}`;
                    const dayName = dayTranslations[day] || day;
                    return `<tr><td>${dayName}</td><td>${open} - ${close}</td></tr>`;
                })
                .join('');

            workTimeHtml = `
                <div class="schedule-container">
                    <div class="schedule-summary">
                        <div>
                            <span class="status ${statusClass}">${statusText}</span>
                            <span> · Cierra a las 22:00</span> <!-- Esto debería ser dinámico -->
                        </div>
                        <svg class="arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <div class="schedule-details">
                        <table class="work-time-table">${tableRows}</table>
                    </div>
                </div>
            `;
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
                    ${workTimeHtml}
                </div>
            </div>
        `;
        modal.style.display = 'flex';

        // Añadir evento para el desplegable
        const scheduleContainer = modalBody.querySelector('.schedule-container');
        if (scheduleContainer) {
            scheduleContainer.addEventListener('click', () => {
                scheduleContainer.classList.toggle('open');
            });
        }
    }

    function hideDetailsModal() {
        modal.style.display = 'none';
        document.querySelectorAll('.listing-item').forEach(el => el.classList.remove('active'));
    }

    function setupEventListeners(listings) {
        provinceSelect.addEventListener('change', () => {
            updateLocalityFilter(listings);
            filterListings(listings);
        });

        localitySelect.addEventListener('change', () => {
            filterListings(listings);
        });
        
        // Cerrar modal
        modalCloseBtn.addEventListener('click', hideDetailsModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideDetailsModal();
            }
        });

        // Toggle de vistas en móvil
        showListBtn.addEventListener('click', () => {
            appContainer.classList.remove('map-view-active');
            showListBtn.classList.add('active');
            showMapBtn.classList.remove('active');
        });

        showMapBtn.addEventListener('click', () => {
            appContainer.classList.add('map-view-active');
            showListBtn.classList.remove('active');
            showMapBtn.classList.add('active');
            // Importante: redimensionar el mapa cuando se muestra
            setTimeout(() => {
                if(map) map.resize();
            }, 10);
        });

        // Forzar vista inicial en móvil
        if (window.innerWidth <= 768) {
            appContainer.classList.remove('map-view-active');
        }
    }

        // Iniciar la aplicación
    main();

    function populateFilters(listings) {
        const provinces = [...new Set(listings.map(l => l.province).filter(Boolean))];
        
        provinces.sort().forEach(province => {
            const option = document.createElement('option');
            option.value = province;
            option.textContent = province;
            provinceSelect.appendChild(option);
        });

        updateLocalityFilter(listings);
    }

    function filterListings(listings) {
        const selectedProvince = provinceSelect.value;
        const selectedLocality = localitySelect.value;

        const filteredListings = listings.filter(listing => {
            const provinceMatch = !selectedProvince || listing.province === selectedProvince;
            const localityMatch = !selectedLocality || listing.city === selectedLocality;
            return provinceMatch && localityMatch;
        });

        renderListings(filteredListings);
        
        // Limpiar marcadores existentes
        Object.values(markers).forEach(marker => marker.remove());
        markers = {};
        
        addMarkersToMap(filteredListings);
    }

    function updateLocalityFilter(listings) {
        const selectedProvince = provinceSelect.value;
        localitySelect.innerHTML = '<option value="">Todas las localidades</option>';

        const localities = [...new Set(listings
            .filter(l => !selectedProvince || l.province === selectedProvince)
            .map(l => l.city)
            .filter(Boolean))];

        localities.sort().forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            localitySelect.appendChild(option);
        });
    }
});
