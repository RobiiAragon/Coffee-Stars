document.addEventListener('DOMContentLoaded', function() {
    // Botones de navegación
    const menuButton = document.getElementById('menu-button');
    const tiendaButton = document.getElementById('tienda-button');
    const aboutButton = document.getElementById('about-button');
    const carritoButton = document.getElementById('carrito-button');
    const contentDiv = document.getElementById('content');
    const carritoCount = document.getElementById('carrito-count');

    // Estado del carrito
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    function actualizarCarritoCount() {
        carritoCount.textContent = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    }

    function guardarCarrito() {
        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarCarritoCount();
    }

    // SPA: Cargar componentes
    function loadComponent(url, callback) {
        fetch(url)
            .then(response => response.text())
            .then(data => {
                contentDiv.innerHTML = data;
                if (callback) callback();
            })
            .catch(error => {
                contentDiv.innerHTML = '<p>Error cargando el contenido.</p>';
            });
    }

    // Eventos de navegación
    menuButton.addEventListener('click', () => loadComponent('components/menu.html'));
    tiendaButton.addEventListener('click', () => {
        loadComponent('components/tienda.html', tiendaEvents);
    });
    aboutButton.addEventListener('click', () => loadComponent('components/about.html'));
    carritoButton.addEventListener('click', () => {
        loadComponent('components/carrito.html', mostrarCarrito);
    });

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
                alert('Producto añadido al carrito');
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
        doc.save('recibo_coffee_stars.pdf');
        // Mostrar mensaje en la web
        const reciboDiv = document.getElementById('recibo-container');
        if (reciboDiv) {
            reciboDiv.innerHTML = '<span style="color:#CFB53B;">Recibo generado y descargado en PDF.</span>';
        }
    }

    // Cargar menú por defecto
    loadComponent('components/menu.html');

    // Inicializar contador
    actualizarCarritoCount();
});