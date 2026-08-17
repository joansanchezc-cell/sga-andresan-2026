# Estado del Proyecto: Sincronización Udeki y Supabase (Control Notas)

## Instrucción para el agente del día de mañana:
**DEBES ACTUAR COMO UN EXPERTO Y DOCTOR EN PROGRAMACIÓN, MANEJO AVANZADO DE BASES DE DATOS Y COMBINACIÓN/SINCRONIZACIÓN DE LAS MISMAS.** 
El usuario ha invertido más de 5 horas intentando solucionar este problema y la frustración es muy alta. Requieres un análisis profundo, meticuloso y sin margen de error.

---

## Contexto del Problema
El objetivo es inyectar un *bookmarklet* en la plataforma **Udeki** que lea las notas desde una base de datos en **Supabase** y las asigne automáticamente a la tabla de estudiantes.
Recientemente, Udeki fue rediseñado y pasó de usar elementos `<select>` nativos a usar componentes personalizados de **Vue.js** (basados en clases de Bootstrap como `.f-select`, `.dropdown-toggle` y `.dropdown-item`).

## Lo que se logró hoy:
1. **Identificación del DOM de Udeki:** Descubrimos que el menú de notas es un `div.f-select`. Las opciones (`.dropdown-item`) solo existen en el DOM cuando se hace clic en `.dropdown-toggle` (comportamiento de `v-if` en Vue).
2. **Iteración Asíncrona:** Se adaptó el ciclo del bookmarklet para que espere asíncronamente a que Vue renderice el DOM al abrir los menús y espere a que se actualice la tabla después de cada clic.
3. **Despliegue:** El código fuente minificado se está alojando en `fix.html` vía Vercel para evadir las políticas restrictivas de Udeki.

## Problemas Pendientes por Arreglar (URGENTE):
A pesar de los avances, la sincronización falló en las últimas pruebas:
1. **Solo pasa unas pocas notas (ej. 5 notas) y se detiene:** 
   - **Posible causa:** El ciclo `for` está perdiendo la referencia de los nodos del DOM. Cuando Vue.js actualiza la calificación de un estudiante, parece estar re-renderizando o desmontando partes de la tabla de forma agresiva, causando que las consultas de las siguientes filas (`row.querySelectorAll`) fallen o apunten a nodos "fantasma".
2. **Coloca las notas mal (ej. pone "Superior" a alguien que tiene "Bajo" o 0):**
   - **Posible causa 1 (Fuzzy Matching):** Los nombres de Udeki no coinciden exactamente con los de Supabase. El algoritmo de "fuzzy match" está asignando la nota de un estudiante a otro (ej. confundió a "Riascos Nicol" con "Riascos Nicolas").
   - **Posible causa 2 (Cálculo Matemático):** La lógica de las funciones `prom()` y `defin()` podría estar evaluando mal los arrays vacíos o los ceros provenientes de Supabase, provocando que `getDesempeño()` asigne una letra incorrecta.
   - **Posible causa 3 (Selectores del DOM):** Al hacer `.click()` en el `.dropdown-item`, es posible que se esté seleccionando el índice incorrecto debido a elementos vacíos o mal iterados.

## Plan de Acción Recomendado:
1. **Revisar a fondo la lógica de emparejamiento de nombres:** Implementar una validación estricta y segura que garantice que bajo ninguna circunstancia se le asigne la nota de un estudiante a otro. Si hay duda en el nombre, es mejor no asignar nota.
2. **Aislar la extracción de Supabase:** Crear un `console.log` gigante en el bookmarklet que imprima el diccionario exacto de notas (`localGrades`) ANTES de tocar el DOM de Udeki. Esto confirmará si el error matemático viene de la base de datos o de la inyección.
3. **Depurar el clic de Vue.js:** Encontrar una manera más estable de actualizar el estado de Vue, o asegurar que el ciclo de inyección espere el tiempo exacto y re-consulte la tabla `tbody tr` de manera perfecta en cada iteración.
