# SIGA AndréSán - Documentación y Plan de Reestructuración

Este documento explica el funcionamiento técnico actual de la aplicación **SIGA AndréSán (Control de Notas)** y establece la hoja de ruta para su próxima reestructuración hacia una arquitectura limpia, moderna y mantenible.

---

## 1. Funcionamiento Actual de la App

La aplicación es un **SPA (Single Page Application)** construida con tecnologías web estándar (Vanilla) que se comunica directamente con un backend como servicio.

### Stack Tecnológico
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6+). No usa frameworks pesados como React o Angular.
* **Backend y Base de Datos:** **Supabase** (PostgreSQL). Proporciona autenticación, base de datos relacional y suscripciones en tiempo real (Realtime).
* **Despliegue:** Vercel (https://notas-andresan.vercel.app/) y PWA (Progressive Web App) con Service Worker (`sw.js`).

### Arquitectura Monolítica (`index.html`)
Actualmente, el 99% del código fuente reside en un único archivo `index.html` de más de 4,000 líneas. Este archivo contiene:
1. **HTML:** La estructura de la página y todos los contenedores ocultos de las pestañas (`#s-notas`, `#s-asistencia`, `#s-pendientes`, etc.).
2. **CSS (`<style>`):** Todos los estilos, temas de color y responsive design.
3. **JavaScript (`<script>`):** 
   - Lógica de autenticación.
   - Peticiones CRUD a Supabase (`sb.from(...)`).
   - Lógica de renderizado de la interfaz (modificación directa del DOM mediante `innerHTML`).

### Gestión de Estado y Navegación
* **Estado Global (`DB`):** Al iniciar sesión, la app descarga el catálogo principal (estudiantes, asignaturas, actividades y horario) y lo guarda en una variable global llamada `DB`. Esto evita consultar la base de datos repetidamente para datos que no cambian a menudo.
* **Navegación por Pestañas:** Se utiliza una función `tab(nombreSeccion)` que simplemente oculta todas las secciones usando `display: none` y muestra la sección solicitada agregándole la clase `.active`.
* **Tiempo Real:** Se utiliza `sb.channel('public:notas').on(...)` para escuchar cambios que otros profesores hagan en la base de datos y reflejarlos en la pantalla sin recargar.

---

## 2. Plan de Reestructuración Programado (Refactoring)

Tal como se estipula en `AGENTS_NOTAS.md`, es insostenible mantener un archivo de 4,000 líneas a largo plazo. Se ha **programado una reestructuración escalonada** para limpiar, modernizar y dinamizar el código.

### Objetivos de la Reestructuración
1. **Desacoplar el Monolito:** Separar HTML, CSS y JS en sus respectivos archivos y carpetas.
2. **Clean Architecture:** Dividir la lógica de negocio, el acceso a datos y la interfaz de usuario.
3. **Modernización UI/UX:** Aplicar patrones de diseño modernos, transiciones fluidas y componentes reutilizables para que la app se vea aún más premium.

### Fases del Plan de Acción

#### Fase 1: Extracción Básica (Separación de Capas)
- Extraer todo el bloque `<style>` hacia un archivo `styles/main.css`.
- Extraer el bloque `<script>` hacia un archivo `js/app.js`.
- Dejar el `index.html` limpio, conteniendo únicamente la maquetación HTML.

#### Fase 2: Modularización del JavaScript (Módulos ES6)
- Crear una carpeta `js/services/` para aislar las llamadas a Supabase (ej. `supabase.js`, `api.js`).
- Crear una carpeta `js/store/` para manejar la variable global `DB` de forma reactiva y segura.
- Crear una carpeta `js/utils/` para funciones matemáticas y auxiliares (ej. `dsClass`, `dsLabel`).

#### Fase 3: Componentización de la Interfaz (UI)
- Dividir las funciones de renderizado inmensas (como `cargarTablaNotas()`) en funciones más pequeñas y predecibles.
- Crear archivos específicos para cada sección en una carpeta `js/views/`:
  - `notasView.js`
  - `pendientesView.js`
  - `resumenView.js`
- Reemplazar las grandes cadenas de texto HTML (`innerHTML = "<tr>..."`) por funciones creadoras de elementos del DOM (Document Fragment) o plantillas literales más organizadas, evitando inyección accidental de código.

#### Fase 4: Modernización Dinámica (UX/UI)
- Refinar el CSS utilizando una arquitectura de variables (`:root`) para unificar la paleta de colores.
- Implementar animaciones de transición suaves al cambiar entre pestañas.
- Mejorar la experiencia móvil de las tablas (Sticky Headers y celdas congeladas más estables).

> **Nota para futuros Agentes de IA:** Al momento de retomar el desarrollo de esta app, se debe consultar este archivo y `AGENTS_NOTAS.md`. Todo refactoring de las Fases 1 a 3 debe hacerse **gradualmente**, asegurando siempre que la inserción de notas (CRUD) no se rompa en el proceso.

---

## 3. Tareas Pendientes Inmediatas (Next Session)

**Rediseño de los Volantes de Pendientes (Impresión):**
En la próxima sesión se debe **mejorar la apariencia visual** del informe de volantes de pendientes (generados por la función `imprimirInformesPendientes()`).
El objetivo es rediseñar el HTML/CSS inyectado para la impresión, con las siguientes características:
- Inclusión de los **logos de la institución y el de Andresan** en el encabezado.
- Un diseño mucho más **moderno, llamativo y premium** (manteniendo el formato para imprimir varios por hoja).
- Uso de fuentes, bordes redondeados y estructura que den una presentación impecable al entregarlo a los padres de familia.
