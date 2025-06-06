document.addEventListener('DOMContentLoaded', function() {
    // Init starfield
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    let stars = [];
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    function initStars() {
        stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.5 + 0.2
            });
        }
    }
    function animateStars() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFF';
        stars.forEach(s => {
            s.y -= s.speed;
            if (s.y < 0) s.y = canvas.height;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animateStars);
    }
    window.addEventListener('resize', () => {
        resize();
        initStars();
    });
    resize();
    initStars();
    animateStars();

    // Botones de navegación
    const tiendaButton = document.getElementById('tienda-button');
    const aboutButton = document.getElementById('about-button');
    const carritoButton = document.getElementById('carrito-button');
    const contentDiv = document.getElementById('content');
    const carritoCount = document.getElementById('carrito-count');
    const navMenu = document.getElementById('nav-menu');

    // Estado del carrito
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    function actualizarCarritoCount() {
        carritoCount.textContent = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    }

    function guardarCarrito() {
        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarCarritoCount();
    }

    // SPA: Cargar sólo la sección interna de cada componente
    function loadComponent(url, callback) {
        fetch(url)
            .then(res => res.text())
            .then(htmlString => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlString, 'text/html');
                // Tomamos sólo la primera sección (o, si no hay, todo el body)
                const fragment = doc.querySelector('section') || doc.body;
                contentDiv.innerHTML = fragment.innerHTML;
                if (callback) callback();
            })
            .catch(() => {
                contentDiv.innerHTML = '<p>Error cargando el contenido.</p>';
            });
    }

    // Eventos de navegación
    tiendaButton.addEventListener('click', () => {
        navMenu.style.display = 'none';
        loadComponent('components/tienda.html', tiendaEvents);
    });
    aboutButton.addEventListener('click', () => {
        navMenu.style.display = 'none';
        loadComponent('components/about.html');
    });
    carritoButton.addEventListener('click', () => {
        navMenu.style.display = 'none';
        loadComponent('components/carrito.html', mostrarCarrito);
    });

    // Toggle del menú al hacer clic
    const hamburgerBtn = document.getElementById('hamburger-btn');
    // const navMenu = document.getElementById('nav-menu');

    hamburgerBtn.addEventListener('click', () => {
        // alterna entre mostrar y ocultar el menú
        navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
    });

    // Cerrar el submenú al hacer clic fuera de él
    document.addEventListener('click', (e) => {
        const isOpen = navMenu.style.display === 'flex';
        const clickedInsideMenu = navMenu.contains(e.target);
        const clickedHamburger = e.target === hamburgerBtn;
        if (isOpen && !clickedInsideMenu && !clickedHamburger) {
            navMenu.style.display = 'none';
        }
    });

    // precarga el sonido (sitúalo en /sounds/add-cart.mp3)
    const addSound = new Audio('sounds/add-cart.mp3');
    addSound.preload = 'auto';

    // Añadir producto al carrito
    function tiendaEvents() {
        const botones = contentDiv.querySelectorAll('.add-carrito');
        botones.forEach(btn => {
            btn.addEventListener('click', function() {
                const producto = {
                    nombre: this.dataset.nombre,
                    precio: parseFloat(this.dataset.precio),
                    id: this.dataset.id,
                    cantidad: 1
                };
                const existente = carrito.find(p => p.id === producto.id);
                if (existente) {
                    existente.cantidad += 1;
                } else {
                    carrito.push(producto);
                }
                guardarCarrito();

                // reproducir sonido
                addSound.currentTime = 0;
                addSound.play();

                // animación pop+estrellas
                this.classList.add('animate-add');
                this.addEventListener('animationend', () => {
                    this.classList.remove('animate-add');
                }, { once: true });
                // burst de estrellas
                createStars(this);
            });
        });
    }

    // Mostrar carrito y permitir eliminar productos
    function mostrarCarrito() {
        const tbody = contentDiv.querySelector('#carrito-body');
        const totalSpan = contentDiv.querySelector('#carrito-total');
        if (!tbody) return;
        tbody.innerHTML = '';
        let total = 0;
        carrito.forEach((item, idx) => {
            total += item.precio * item.cantidad;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precio.toFixed(2)}</td>
                <td>$${(item.precio * item.cantidad).toFixed(2)}</td>
                <td><button class="remove-item" data-idx="${idx}">Eliminar</button></td>
            `;
            tbody.appendChild(tr);
        });
        totalSpan.textContent = '$' + total.toFixed(2);

        // Eliminar producto
        contentDiv.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = this.dataset.idx;
                carrito.splice(idx, 1);
                guardarCarrito();
                mostrarCarrito();
            });
        });

        // Vaciar carrito
        const vaciarBtn = contentDiv.querySelector('#vaciar-carrito');
        if (vaciarBtn) {
            vaciarBtn.addEventListener('click', function() {
                if (confirm('¿Vaciar carrito?')) {
                    carrito = [];
                    guardarCarrito();
                    mostrarCarrito();
                }
            });
        }

        // Checkout
        const checkoutBtn = contentDiv.querySelector('#checkout-carrito');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                if (carrito.length === 0) {
                    alert('El carrito está vacío.');
                    return;
                }
                generarReciboPDF(carrito, total);
                carrito = [];
                guardarCarrito();
                mostrarCarrito();
            });
        }
    }

    // Generar recibo PDF usando jsPDF
    function generarReciboPDF(carrito, total) {
        // Cargar jsPDF dinámicamente si no está presente
        if (typeof window.jspdf === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => crearRecibo(carrito, total);
            document.body.appendChild(script);
        } else {
            crearRecibo(carrito, total);
        }
    }

    function crearRecibo(carrito, total) {
        const { jsPDF } = window.jspdf || window.jspdf_umd;
        const doc = new jsPDF();
        let y = 20;
        doc.setFontSize(18);
        doc.text("Coffee Star's - Recibo de compra", 14, y);
        y += 10;
        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, y);
        y += 10;
        doc.text('----------------------------------------', 14, y);
        y += 8;
        carrito.forEach(item => {
            doc.text(`${item.nombre} x${item.cantidad} - $${item.precio.toFixed(2)} c/u`, 14, y);
            y += 8;
        });
        doc.text('----------------------------------------', 14, y);
        y += 8;
        doc.setFontSize(14);
        doc.text(`Total: $${total.toFixed(2)}`, 14, y);
        y += 12;
        doc.setFontSize(12);
        doc.text('¡Gracias por tu compra!', 14, y);
        y += 10;
        doc.setFontSize(10);
        doc.text('Esta página web es una prueba y el recibo no es válido para una compra real.', 14, y);
        // abrir PDF en nueva pestaña
        doc.output('dataurlnewwindow');

        // Mostrar mensaje en la web
        const reciboDiv = document.getElementById('recibo-container');
        if (reciboDiv) {
            reciboDiv.innerHTML = '<span style="color:#CFB53B;">Recibo generado y abierto en una nueva pestaña.</span>';
        }
    }

    // generar y animar estrellas
    function createStars(button) {
        for (let i = 0; i < 6; i++) {
            const star = document.createElement('span');
            star.classList.add('star');
            star.textContent = '⭐';
            // trayectoria aleatoria
            const angle = Math.random() * 2 * Math.PI;
            const dist = 30 + Math.random() * 20; // 30–50px
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            star.style.setProperty('--tx', `${tx}px`);
            star.style.setProperty('--ty', `${ty}px`);
            button.appendChild(star);
            star.addEventListener('animationend', () => {
                star.remove();
            });
        }
    }

    // Cargar menú por defecto
    loadComponent('components/menu.html', tiendaEvents);

    // Inicializar contador
    actualizarCarritoCount();
});

// Al cargar la página, desplegar tienda por defecto:
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tienda-button').click();
});