
    // ⚙️ CONFIGURACIÓN — cambia solo estas dos líneas
    const LOGO_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co/storage/v1/object/public/assets/andresanbordessinfondo.png";
    const FONDO_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co/storage/v1/object/public/assets/DSC06323.JPG";

    // ── Supabase config ──────────────────────────────────────
    const SB_URL = "https://pmfrdrihzdhhjxokabjm.supabase.co";
    const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnJkcmloemRoaGp4b2thYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA5OTIsImV4cCI6MjA5MTQyNjk5Mn0.FnQWmxg0p4oUgAQBVhoy6wqIMOk3qk4pifI2voeQvV0";
    const sb = supabase.createClient(SB_URL, SB_KEY);

    // ── Estado global ────────────────────────────────────────
    let DB = { asigs: [], ests: [], acts: [], hor: [] };
    let anio = 2026;
    let periodo = 1;
    let gNotas = null, gAsist = null, gRes = null;
    let realtimeChannel = null;

    // ════════════════════════════════════════════════════════
    // AUTH
    // ════════════════════════════════════════════════════════
    async function login() {
      let userVal = document.getElementById('li-email').value.trim();
      const pass = document.getElementById('li-pass').value;
      const btn = document.getElementById('li-btn');
      const err = document.getElementById('login-err');
      err.style.display = 'none';
      if (!userVal || !pass) { showErr('Completa todos los campos.'); return; }

      // Convertir a formato correo si es solo un usuario
      const email = userVal.includes('@') ? userVal : `${userVal}@andresan.com`;

      btn.disabled = true; btn.textContent = 'Verificando…';
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) {
        showErr(error.message.includes('Invalid') ? 'Correo o contraseña incorrectos.' : error.message);
      } else {
        mostrarApp(data.user.email);
        await detectarPeriodoActual(); // <-- auto-seleccionar el periodo actual
        await init();
      }
      btn.disabled = false; btn.textContent = 'Ingresar';
    }

    function showErr(msg) {
      const e = document.getElementById('login-err');
      e.textContent = msg; e.style.display = 'block';
    }

    function mostrarApp(email) {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-screen').style.display = 'flex';

      const parts = email.split('@')[0].split(/[.\-_]/);
      let name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      if (parts.length > 1) name += ' ' + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);

      // Force "AndréSán" for users matching andresan/andres
      if (name.toLowerCase().includes('andresan') || email.toLowerCase().includes('andresan')) {
        name = 'AndréSán';
        email = 'AndréSán';
      }

      const initial = name.charAt(0).toUpperCase();

      document.getElementById('user-lbl').textContent = email;
      document.getElementById('sb-user-lbl').textContent = name;

      const avatar = document.getElementById('sb-user-avatar');
      // if (avatar) avatar.textContent = initial; // Reemplazado por logo fijo

      const greeting = document.getElementById('mobile-greeting-text');
      if (greeting) greeting.textContent = 'Buenos días, ' + name + ' 👋';

      aplicarBranding(); // re-aplicar para que ing-logo ya esté en el DOM visible
    }

    async function logout() {
      if (!confirm('¿Cerrar sesión?')) return;
      await sb.auth.signOut(); location.reload();
    }

    // ════════════════════════════════════════════════════════
    // INIT — cargar datos base
    // ════════════════════════════════════════════════════════
    async function init() {
      badge('wait', 'Cargando…');
      anio = parseInt(document.getElementById('sel-anio').value) || 2026;
      periodo = parseInt(document.getElementById('sel-periodo').value) || 1;

      const dateEl = document.getElementById('mobile-date');
      if (dateEl) {
        const d = new Date();
        const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        dateEl.innerHTML = `${days[d.getDay()]},<br>${d.getDate()} de ${months[d.getMonth()]}`;
      }

      const [ra, re, rac, rh] = await Promise.all([
        sb.from('asignaturas').select('*').order('grado').order('nombre'),
        sb.from('estudiantes').select('*').order('nombre_completo'),
        sb.from('actividades').select('*').eq('periodo', periodo),
        sb.from('horarios').select('*')
      ]);

      DB.asigs = (ra.data || []).filter(a => !a.año || a.año === anio);
      DB.ests = (re.data || []).filter(e => !e.año || e.año === anio);
      DB.acts = rac.data || [];
      DB.hor = rh.data || [];

      const grados = [...new Set(DB.asigs.map(a => a.grado))].sort();
      const gradoOpts = '<option value="">Selecciona grupo…</option>' +
        grados.map(g => `<option value="${g}">${g}</option>`).join('');
      const gradoOptsTodos = '<option value="todos">Todos los grados</option>' +
        grados.map(g => `<option value="${g}">${g}</option>`).join('');

      // Pills
      renderPills('pills-notas', grados, 'notas', g => selNotas(g));
      renderPills('pills-res', grados, 'res', g => selRes(g));

      // Selectores de formularios
      document.getElementById('ing-grado').innerHTML = gradoOpts;
      document.getElementById('inf-grado').innerHTML = gradoOpts;
      document.getElementById('est-filtro-grado').innerHTML = gradoOptsTodos;
      document.getElementById('cur-filtro-grado').innerHTML = gradoOptsTodos;

      // Iconos de actividades
      renderIconos();
      poblarSelectorListaActs();


      // Detectar clase actual por horario
      detectarClase();

      // Configurar Realtime
      setupRealtime();

      renderEstudiantes();
      renderCursos();

      badge('ok', 'Listo ✓');
    }

    function setupRealtime() {
      if (realtimeChannel) sb.removeChannel(realtimeChannel);

      console.log('[Realtime] Iniciando suscripción...');
      realtimeChannel = sb.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, payload => {
          console.log('[Realtime] Cambio en notas:', payload);
          handleDataChange('notas', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencia' }, payload => {
          console.log('[Realtime] Cambio en asistencia:', payload);
          handleDataChange('asistencia', payload);
        })
        .subscribe((status) => {
          console.log('[Realtime] Estado:', status);
        });
    }

    async function handleDataChange(table, payload) {
      const data = payload.new || payload.old;
      if (!data) return;

      // 1. Refrescar Resumen si hay uno seleccionado
      if (gRes) {
        await selRes(gRes);
      }

      // 2. Refrescar Tabla de Notas
      const asigSel = document.getElementById('asig-notas-sel');
      if (asigSel && asigSel.value) {
        // Refrescamos si coincide la asignatura o si es un borrado (donde data.asignatura_id puede faltar)
        if (!data.asignatura_id || parseInt(asigSel.value) === data.asignatura_id) {
          await cargarTablaNotas();
        }
      }

      // 3. Refrescar Asistencia
      if (table === 'asistencia' && fechaAsist) {
        if (!data.fecha || data.fecha === fechaAsist) {
          await renderHorarioDia(fechaAsist);
        }
      }

      // 4. Refrescar Informe Individual
      const estSel = document.getElementById('inf-est');
      if (estSel && estSel.value) {
        if (!data.estudiante_id || parseInt(estSel.value) === data.estudiante_id) {
          await generarInforme();
        }
      }
    }

    function detectarClase() {
      const hoyStr = hoy();
      const d = new Date();
      const diaJS = d.getDay();
      if (diaJS === 0 || diaJS === 6) return;

      const horaActual = d.toTimeString().slice(0, 8);

      // Intentar encontrar un bloque activo ahora
      const bloque = DB.hor.find(h =>
        parseInt(h.dia_semana) === diaJS &&
        horaActual >= h.hora_inicio.slice(0, 8) &&
        horaActual <= h.hora_fin.slice(0, 8)
      );

      if (bloque) {
        const asig = DB.asigs.find(a => a.id === bloque.asignatura_id);
        if (asig) {
          badge('ok', `Clase actual: ${asig.nombre} (${asig.grado})`);
        }
      }
    }

    async function recargar() { await init(); }

    // ════════════════════════════════════════════════════════
    // HELPERS UI
    // ════════════════════════════════════════════════════════

    function openSidebar() {
      document.getElementById('sidebar').classList.add('open');
      document.querySelector('.sb-overlay').classList.add('open');
    }
    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.querySelector('.sb-overlay').classList.remove('open');
    }

    function badge(t, txt) {
      const b = document.getElementById('badge');
      b.className = 'badge b-' + t; b.textContent = txt;
    }

    function tab(nombre, btn) {
      document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
      document.getElementById('s-' + nombre).classList.add('active');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    }

    function renderPills(id, grados, tipo, fn) {
      const container = document.getElementById(id);
      container.innerHTML = grados.map(g =>
        `<span class="pill pill-${tipo}" data-g="${g}">${g}</span>`
      ).join('');

      // Agregar event listeners dinámicamente en lugar de fn.toString()
      container.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const g = pill.dataset.g;
          activarPill(id, tipo, g);
          fn(g);
        });
      });
    }

    function activarPill(id, tipo, grado) {
      document.querySelectorAll(`#${id} .pill`).forEach(p => {
        p.classList.toggle('pill-sel', p.dataset.g === grado);
      });
    }

    // ── Cálculo desempeño ──
    function dsClass(n) {
      if (n === null || n === undefined || isNaN(n)) return 'ds-sin';
      n = Number(n);
      if (n === 0) return 'ds-np';
      return n >= 8.4 ? 'ds-sup' : n >= 7.2 ? 'ds-alt' : n >= 6.0 ? 'ds-bas' : 'ds-baj';
    }
    function dsLabel(n) {
      if (n === null || n === undefined || isNaN(n)) return '–';
      n = Number(n);
      if (n === 0) return 'NP';
      return n >= 8.4 ? 'Superior' : n >= 7.2 ? 'Alto' : n >= 6.0 ? 'Básico' : 'Bajo';
    }

    // ── Cálculo definitiva 70/30 ──
    function prom(arr) {
      if (!arr || arr.length === 0) return null;
      const sum = arr.reduce((acc, x) => {
        const n = parseFloat(x);
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
      return sum / arr.length;
    }
    function defin(n70, n30) {
      const p70 = prom(n70), p30 = prom(n30);
      if (p70 === null && p30 === null) return null;
      // Si falta una categoría, mostrar el promedio de lo que hay
      if (p70 === null) return p30;
      if (p30 === null) return p70;
      return (p70 * 0.7) + (p30 * 0.3);
    }
    function hoy() { return new Date().toISOString().split('T')[0]; }

    // ════════════════════════════════════════════════════════
    // TAB NOTAS
    // ════════════════════════════════════════════════════════
    function selNotas(g) {
      gNotas = g;
      const asigs = DB.asigs.filter(a => a.grado === g);
      const sel = document.getElementById('asig-notas-sel');
      sel.innerHTML = '<option value="">-- Selecciona asignatura --</option>' +
        asigs.map(a => `<option value="${a.id}">${a.nombre} (${a.codigo})</option>`).join('');
      document.getElementById('asig-notas-wrap').style.display = 'block';
      document.getElementById('p-notas').innerHTML = '';
    }

    // ════════════════════════════════════════════════════════
    // TAB NOTAS - SOLO ACTIVIDADES CON SU DESEMPEÑO (SIN PROMEDIOS NI DEFINITIVA)
    // ════════════════════════════════════════════════════════

    async function cargarTablaNotas() {
      const asigId = parseInt(document.getElementById('asig-notas-sel').value);
      if (!asigId) return;

      badge('wait', 'Cargando actividades…');

      const asig = DB.asigs.find(a => a.id === asigId);
      const ests = DB.ests.filter(e => e.grado === asig.grado);
      const acts = DB.acts.filter(a => a.asignatura_id === asigId);

      if (!acts.length) {
        document.getElementById('p-notas').innerHTML =
          `<div class="card card-notas"><p style="text-align:center;padding:40px;color:#6b7280">
        No hay actividades creadas para <strong>${asig.nombre}</strong></p></div>`;
        badge('ok', 'Listo ✓');
        return;
      }

      // Cargar notas — filtrar por año y periodo para no mezclar períodos
      const { data: notas } = await sb.from('notas')
        .select('*')
        .in('actividad_id', acts.map(a => a.id))
        .eq('año', anio)
        .eq('periodo', periodo);

      const nMap = {};
      (notas || []).forEach(n => {
        nMap[`${n.estudiante_id}_${n.actividad_id}`] = Number(n.valor);
      });

      let html = `<div class="card card-notas">
    <h3>${asig.nombre} · <small style="font-weight:400">${asig.codigo}</small></h3>
    <div class="overflow-x">
      <table>
        <thead>
          <tr>
            <th style="min-width:32px; text-align:center; color:#9ca3af">#</th>
            <th style="min-width:220px; text-align:left">Estudiante</th>`;

      // Cabeceras de solo las actividades
      acts.forEach(act => {
        const tipo = act.porcentaje === 1 ? '70%' : '30%';
        html += `<th style="min-width:100px">
      <div>${act.nombre}</div>
      <small style="font-size:10px;color:#6b7280">${tipo}</small>
    </th>`;
      });

      html += `</tr></thead><tbody>`;

      // Filas de estudiantes
      ests.forEach((est, idx) => {
        html += `<tr>
      <td style="font-size:12px;text-align:center;color:#9ca3af;font-weight:400;padding:4px 6px">${idx + 1}</td>
      <td style="font-size:13px;font-weight:500">${est.nombre_completo}</td>`;

        acts.forEach(act => {
          const valor = nMap[`${est.id}_${act.id}`];

          let valStr = (valor !== undefined && valor !== null) ? valor : '';
          let clase = 'ds-sin';
          let texto = '';

          if (valor !== undefined && valor !== null) {
            clase = dsClass(valor);
            texto = dsLabel(valor);
          }

          html += `<td style="text-align:center; position:relative; vertical-align:middle;">
        <input type="number" min="0" max="10" step="0.1" value="${valStr}"
          style="width:55px; padding:4px; text-align:center; border:2px solid #e5e7eb; border-radius:6px; font-size:13px; font-weight:600; color:#1f2937; outline:none; transition:all 0.2s;"
          onfocus="this.style.borderColor='#6366f1'"
          onblur="this.style.borderColor='#e5e7eb'"
          onchange="guardarNotaDesdeTabla(${est.id}, ${act.id}, ${asigId}, this)"
          onkeydown="if(event.key==='Enter') this.blur()">
        <div style="font-size:10px; margin-top:4px;" class="ds ${clase}">${texto}</div>
        ${valor !== undefined && valor !== null ? `
          <button onclick="borrarNota(${est.id}, ${act.id})" 
                  style="position:absolute; top:2px; right:2px; background:none; border:none; color:#ef4444; cursor:pointer; font-size:10px; padding:2px"
                  title="Borrar nota">✕</button>
        ` : ''}
      </td>`;
        });

        html += `</tr>`;
      });

      html += `</tbody></table>
    </div>
    <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:12px">
      Desempeño por actividad individual
    </p>
  </div>`;

      document.getElementById('p-notas').innerHTML = html;
      badge('ok', `Listo ✓ (${acts.length} actividades)`);
    }
    // ════════════════════════════════════════════════════════
    // TAB PENDIENTES — resumen de actividades sin nota o NP
    // ════════════════════════════════════════════════════════
    let gPend = null;

    function cargarPendientes() {
      const grados = [...new Set(DB.ests.map(e => e.grado))].sort();
      renderPills('pills-pend', grados, 'pend', selPend);
      document.getElementById('p-pendientes').innerHTML =
        `<div style="text-align:center;padding:40px;color:#9ca3af;font-size:14px">Selecciona un grado para ver los pendientes.</div>`;
      gPend = null;
      const btnPrint = document.getElementById('btn-print-pend');
      const btnPrintFirmas = document.getElementById('btn-print-firmas-pend');
      if (btnPrint) btnPrint.style.display = 'none';
      if (btnPrintFirmas) btnPrintFirmas.style.display = 'none';
    }

    async function selPend(grado) {
      gPend = grado;
      const btnPrint = document.getElementById('btn-print-pend');
      const btnPrintFirmas = document.getElementById('btn-print-firmas-pend');
      if (btnPrint) btnPrint.style.display = 'flex';
      if (btnPrintFirmas) btnPrintFirmas.style.display = 'flex';
      const contenedor = document.getElementById('p-pendientes');
      contenedor.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;font-size:14px">Cargando pendientes…</div>`;

      const ests = DB.ests.filter(e => e.grado === grado).sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
      const asigs = DB.asigs.filter(a => a.grado === grado);
      const actIds = [];
      const actsByAsig = {}; // asigId -> [act]

      asigs.forEach(asig => {
        const acts = DB.acts.filter(a => a.asignatura_id === asig.id);
        actsByAsig[asig.id] = acts;
        acts.forEach(a => actIds.push(a.id));
      });

      if (!actIds.length) {
        contenedor.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af">No hay actividades creadas para el grado <strong>${grado}</strong>.</div>`;
        return;
      }

      // Consultar notas existentes para este grado/año/periodo
      const { data: notas, error } = await sb.from('notas')
        .select('estudiante_id, actividad_id, valor')
        .in('actividad_id', actIds)
        .eq('año', anio)
        .eq('periodo', periodo);

      if (error) {
        contenedor.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444">Error al cargar datos: ${error.message}</div>`;
        return;
      }

      // Mapa: "estId_actId" -> valor
      const nMap = {};
      (notas || []).forEach(n => {
        nMap[`${n.estudiante_id}_${n.actividad_id}`] = Number(n.valor);
      });

      // Calcular pendientes por estudiante
      let totalEstConPend = 0;
      let totalPendientes = 0;
      let totalNP = 0;

      const estudiantesPend = ests.map(est => {
        const pendsPorAsig = []; // [{asig, actsP:[{act,tipo}]}]
        asigs.forEach(asig => {
          const acts = actsByAsig[asig.id] || [];
          const actsP = [];
          acts.forEach(act => {
            const key = `${est.id}_${act.id}`;
            const val = nMap[key];
            if (val === undefined || val === null) {
              actsP.push({ act, tipo: 'sin-nota' });
            } else if (val === 0) {
              actsP.push({ act, tipo: 'np' });
            }
          });
          if (actsP.length) pendsPorAsig.push({ asig, actsP });
        });
        const total = pendsPorAsig.reduce((s, p) => s + p.actsP.length, 0);
        const npCount = pendsPorAsig.reduce((s, p) => s + p.actsP.filter(a => a.tipo === 'np').length, 0);
        if (total > 0) {
          totalEstConPend++;
          totalPendientes += total;
          totalNP += npCount;
        }
        return { est, pendsPorAsig, total, npCount };
      }).filter(e => e.total > 0);

      if (!estudiantesPend.length) {
        contenedor.innerHTML = `<div style="text-align:center;padding:40px">
          <div style="font-size:48px;margin-bottom:12px">🎉</div>
          <div style="font-size:16px;font-weight:700;color:#059669">¡Sin pendientes!</div>
          <div style="font-size:13px;color:#6b7280;margin-top:6px">Todos los estudiantes del grado <strong>${grado}</strong> tienen sus actividades al día.</div>
        </div>`;
        return;
      }

      // Estadísticas resumen
      let html = `<div class="pend-stats-box">
        <div class="pend-stat">
          <div class="pend-stat-num">${totalEstConPend}</div>
          <div class="pend-stat-lbl">Estudiantes<br>con pendientes</div>
        </div>
        <div style="width:1px;background:#e5e7eb;align-self:stretch"></div>
        <div class="pend-stat">
          <div class="pend-stat-num">${totalPendientes}</div>
          <div class="pend-stat-lbl">Actividades<br>pendientes total</div>
        </div>
        <div style="width:1px;background:#e5e7eb;align-self:stretch"></div>
        <div class="pend-stat">
          <div class="pend-stat-num" style="color:#ef4444">${totalNP}</div>
          <div class="pend-stat-lbl">Con NP<br>(nota 0)</div>
        </div>
        <div style="margin-left:auto;font-size:12px;color:#6b7280;align-self:center">
          Grado: <strong>${grado}</strong> · ${anio} · Periodo ${periodo}
        </div>
      </div>`;

      // Tarjeta por estudiante
      estudiantesPend.forEach((item, idx) => {
        const { est, pendsPorAsig, total, npCount } = item;
        const sinNota = total - npCount;
        const badgeClass = npCount > 0 ? 'np-badge' : '';
        const badgeText = npCount > 0
          ? `${total} pendiente${total > 1 ? 's' : ''} · ${npCount} NP`
          : `${total} sin nota`;

        html += `<div class="pend-student-card">
          <div class="pend-student-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
            <div style="display:flex;align-items:center;gap:6px">
              <span class="pend-student-idx">${idx + 1}</span>
              <span class="pend-student-name">${est.nombre_completo}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="pend-badge ${badgeClass}">${badgeText}</span>
              <span style="font-size:12px;color:#9ca3af">▼</span>
            </div>
          </div>
          <div>`;

        // Por asignatura
        pendsPorAsig.forEach(({ asig, actsP }) => {
          html += `<div class="pend-asig-label">📚 ${asig.nombre} (${asig.codigo})</div>`;
          html += `<div class="pend-acts-list">`;
          actsP.forEach(({ act, tipo }) => {
            const cls = tipo === 'np' ? 'np' : '';
            const icon = tipo === 'np' ? '🔴 ' : '⬜ ';
            html += `<span class="pend-act-tag ${cls}" title="${tipo === 'np' ? 'Nota 0 (NP)' : 'Sin nota registrada'}">${icon}${act.nombre}</span>`;
          });
          html += `</div>`;
        });

        html += `<div class="pend-summary-bar">`;
        if (sinNota > 0) html += `<span>⬜ ${sinNota} sin nota</span>`;
        if (npCount > 0) html += `<span style="color:#991b1b">🔴 ${npCount} con NP (nota 0)</span>`;
        html += `</div></div></div>`;
      });

      contenedor.innerHTML = html;
    }

    // ════════════════════════════════════════════════════════
    // TAB ASISTENCIA — sin selector de grupo, horario del día completo
    // ════════════════════════════════════════════════════════
    const ESTADOS = [
      { v: 'Asistió', e: '✅', c: '#22c55e' },
      { v: 'No asistió', e: '❌', c: '#ef4444' },
      { v: 'Retraso', e: '⏰', c: '#f97316' },
      { v: 'Permiso', e: '📋', c: '#3b82f6' },
      { v: 'Enfermo', e: '🤒', c: '#a855f7' },
    ];
    let pendienteAsist = {}; // [asigId][estId] = estado
    let fechaAsist = new Date().toISOString().split('T')[0];
    let bloqueAbierto = null; // id del bloque actualmente expandido
    let currentSavedMap = {}; // Asistencia guardada para el día actual

    // Llamada al cambiar de tab o al recargar fecha
    async function abrirAsistencia(fechaSel) {
      if (fechaSel) fechaAsist = fechaSel;
      pendienteAsist = {};
      bloqueAbierto = null;
      await renderHorarioDia(fechaAsist);
    }

    async function renderHorarioDia(fecha) {
      const contenedor = document.getElementById('p-asist');
      const dFecha = new Date(fecha + 'T12:00:00');
      const diaJS = dFecha.getDay(); // 0=Dom … 6=Sab (horarios: 1=Lun…5=Vie)
      const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const esHoy = fecha === new Date().toISOString().split('T')[0];
      const horaActual = new Date().toTimeString().slice(0, 8);

      // Selector de fecha + día — cabecera siempre visible
      let html = `<div class="card card-asist" style="margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div>
        <div style="font-size:18px;font-weight:700;color:#059669">${DIAS[diaJS]}</div>
        <div style="font-size:13px;color:#6b7280">${fecha}</div>
      </div>
      <input type="date" value="${fecha}"
        style="padding:7px 10px;border:2px solid var(--asist);border-radius:8px;font-size:14px;width:auto"
        onchange="abrirAsistencia(this.value)">
      ${!esHoy ? `<button onclick="abrirAsistencia('${new Date().toISOString().split('T')[0]}')"
        style="padding:6px 14px;border:2px solid var(--asist);border-radius:8px;
               background:#fff;color:#059669;font-size:12px;font-weight:700;cursor:pointer">
        Hoy</button>` : ''}
    </div>
  </div>`;

      if (diaJS === 0 || diaJS === 6) {
        html += `<div class="card card-asist">
      <p style="text-align:center;padding:20px;color:#6b7280">
        ${DIAS[diaJS]} — no hay clases programadas.</p></div>`;
        contenedor.innerHTML = html; return;
      }

      // Todos los bloques del día (todos los grupos)
      const bloquesDelDia = DB.hor
        .filter(h => parseInt(h.dia_semana) === diaJS)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

      if (!bloquesDelDia.length) {
        html += `<div class="card card-asist">
      <p style="text-align:center;padding:20px;color:#6b7280">
        No hay clases programadas para el ${DIAS[diaJS]}.</p></div>`;
        contenedor.innerHTML = html; return;
      }

      // Cargar asistencia ya guardada para toda esta fecha
      const asigIds = [...new Set(bloquesDelDia.map(h => h.asignatura_id))];
      const { data: regsExist } = await sb.from('asistencia').select('*')
        .eq('fecha', fecha).in('asignatura_id', asigIds);

      // savedMap[asigId][bloque][estId] = estado
      currentSavedMap = {};
      (regsExist || []).forEach(r => {
        const aid = r.asignatura_id, bn = r.bloque_nombre || 'S/B', eid = r.estudiante_id;
        if (!currentSavedMap[aid]) currentSavedMap[aid] = {};
        if (!currentSavedMap[aid][bn]) currentSavedMap[aid][bn] = {};
        currentSavedMap[aid][bn][eid] = r.estado;
      });

      // ── Caja del día con mini-bloques ──
      html += `<div class="card card-asist">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">`;

      bloquesDelDia.forEach((bloque, idx) => {
        const asig = DB.asigs.find(a => a.id === bloque.asignatura_id);
        const grado = asig?.grado || '–';
        const asigMap = currentSavedMap[bloque.asignatura_id] || {};
        const saved = asigMap[bloque.bloque_nombre] || asigMap['S/B'] || {};
        const registrada = Object.keys(saved).length > 0;
        const esActiva = esHoy &&
          horaActual >= bloque.hora_inicio.slice(0, 8) &&
          horaActual <= bloque.hora_fin.slice(0, 8);

        const bordeColor = esActiva ? '#f59e0b' : (registrada ? '#10b981' : '#e5e7eb');
        const bgColor = esActiva ? '#fffbeb' : (registrada ? '#f0fdfa' : '#f9fafb');

        html += `<div onclick="seleccionarBloque(${idx},'${fecha}')"
      id="mini-${idx}"
      style="border:2px solid ${bordeColor};border-radius:10px;padding:10px 12px;
             cursor:pointer;background:${bgColor};min-width:100px;transition:all .2s;
             text-align:center">
      <div style="font-size:11px;font-weight:700;color:#059669">${asig?.codigo || '–'}</div>
      <div style="font-size:10px;color:#6b7280;margin:2px 0">${grado}</div>
      <div style="font-size:10px;color:#6b7280">Blq ${bloque.bloque_nombre}</div>
      <div style="font-size:10px;color:#6b7280">${bloque.hora_inicio.slice(0, 5)}-${bloque.hora_fin.slice(0, 5)}</div>
      ${registrada ? '<div style="font-size:9px;color:#059669;font-weight:700;margin-top:2px">✓ Registrada</div>' : ''}
      ${esActiva ? '<div style="font-size:9px;color:#d97706;font-weight:700;margin-top:2px">● En curso</div>' : ''}
    </div>`;
      });

      html += `</div></div>`;

      // ── Zona de lista de asistencia (se rellena al seleccionar bloque) ──
      html += `<div id="zona-lista"></div>`;

      contenedor.innerHTML = html;

      // Si hay clase activa ahora, abrirla automáticamente
      const idxActivo = bloquesDelDia.findIndex(h =>
        esHoy &&
        horaActual >= h.hora_inicio.slice(0, 8) &&
        horaActual <= h.hora_fin.slice(0, 8)
      );
      if (idxActivo >= 0) seleccionarBloque(idxActivo, fecha);
    }

    function seleccionarBloque(idx, fecha) {
      // Guardar datos en variable para poder regenerar la lista
      const dFecha = new Date(fecha + 'T12:00:00');
      const diaJS = dFecha.getDay();
      const bloquesDelDia = DB.hor
        .filter(h => parseInt(h.dia_semana) === diaJS)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

      const bloque = bloquesDelDia[idx];
      if (!bloque) return;

      // Autocompletar con "Asistió" si es la primera vez que se abre y no hay nada guardado
      const asigMap = currentSavedMap[bloque.asignatura_id] || {};
      const saved = asigMap[bloque.bloque_nombre] || asigMap['S/B'] || {};
      const actualPend = pendienteAsist[bloque.asignatura_id] || {};

      if (Object.keys(saved).length === 0 && Object.keys(actualPend).length === 0) {
        const asig = DB.asigs.find(a => a.id === bloque.asignatura_id);
        const ests = DB.ests.filter(e => e.grado === asig?.grado);
        if (!pendienteAsist[bloque.asignatura_id]) pendienteAsist[bloque.asignatura_id] = {};
        ests.forEach(e => { pendienteAsist[bloque.asignatura_id][e.id] = 'Asistió'; });
      }

      // Resaltar mini-bloque seleccionado
      document.querySelectorAll('[id^="mini-"]').forEach(el => {
        el.style.boxShadow = '';
        el.style.borderWidth = '2px';
      });
      const mini = document.getElementById(`mini-${idx}`);
      if (mini) { mini.style.boxShadow = '0 0 0 3px #10b981'; mini.style.borderWidth = '2px'; }

      bloqueAbierto = { bloque, idx, fecha };
      renderListaBloque(bloque, fecha);
    }

    function renderListaBloque(bloque, fecha) {
      const asig = DB.asigs.find(a => a.id === bloque.asignatura_id);
      const grado = asig?.grado || '';
      const ests = DB.ests.filter(e => e.grado === grado);

      // Leer pendientes y lo guardado para este bloque específico
      const pend = pendienteAsist[bloque.asignatura_id] || {};
      const asigMap = currentSavedMap[bloque.asignatura_id] || {};
      const saved = asigMap[bloque.bloque_nombre] || asigMap['S/B'] || {};
      const esCorreccion = Object.keys(saved).length > 0;

      // Calcular estadísticas actuales
      const counts = {};
      ESTADOS.forEach(s => counts[s.v] = 0);
      ests.forEach(est => {
        const estStatus = pend[est.id] !== undefined ? pend[est.id] : (saved[est.id] || '');
        if (estStatus) counts[estStatus] = (counts[estStatus] || 0) + 1;
      });

      const statsHtml = `<div id="stats-asist" class="stats-container">` +
        ESTADOS.map(s => `
        <div class="stat-card" style="border-bottom: 3px solid ${s.c}">
          <span class="stat-num" style="color:${s.c}">${counts[s.v] || 0}</span>
          ${s.v}
        </div>`).join('') + `</div>`;

      // leyenda
      const leyenda = `<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;margin:10px 0">` +
        ESTADOS.map(s => `<span style="display:flex;align-items:center;gap:4px">
      <span style="width:10px;height:10px;border-radius:50%;background:${s.c};display:inline-block"></span>${s.v}
    </span>`).join('') + `</div>`;

      const btnRegistrar = (pos) => `<div style="text-align:center;margin:${pos === 'top' ? '0 0 12px' : '12px 0 0'}">
    <button onclick="mostrarConfirmacionAsistencia()"
      style="padding:11px 28px;background:#10b981;color:#fff;border:none;
             border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;width:100%">
      💾 Revisar y Registrar Asistencia
    </button></div>`;

      let html = `<div class="card card-asist" style="margin-top:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:4px">
      <div>
        <span style="font-size:15px;font-weight:700;color:#059669">${asig?.nombre || '–'}</span>
        <span style="font-size:12px;color:#6b7280;margin-left:8px">
          Grado ${grado} · Bloque ${bloque.bloque_nombre} · ${bloque.hora_inicio.slice(0, 5)}–${bloque.hora_fin.slice(0, 5)} · ${fecha}
        </span>
      </div>
    </div>
    ${statsHtml}

    ${esCorreccion ? `
    <div style="background:#fff1f2;border:1px solid #fecade;padding:10px;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">⚠️</span>
        <div>
            <b style="color:#9f1239;font-size:13px;display:block">Modo Edición / Corrección</b>
            <span style="font-size:11px;color:#be123c">Estás modificando un registro que ya existía en la base de datos.</span>
        </div>
    </div>` : ''}

    <div id="area-correccion-main" style="display:none;margin-bottom:12px;background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:12px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:#92400e">Motivo de la corrección:</label>
        <textarea id="motivo-txt-main" style="width:100%;height:60px;border:1px solid #fcd34d;border-radius:8px;padding:8px;font-size:13px" 
                  placeholder="Escribe aquí el motivo si estás corrigiendo algo..."
                  oninput="document.getElementById('motivo-txt') ? document.getElementById('motivo-txt').value = this.value : null"></textarea>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
        ${esCorreccion ? `
        <button onclick="document.getElementById('area-correccion-main').style.display='block';this.style.display='none'" 
                style="padding:8px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;flex:1">
            ✍️ Justificar Cambio
        </button>` : ''}
        <button onclick="mostrarConfirmacionAsistencia()"
                style="padding:8px 12px;background:${esCorreccion ? '#f43f5e' : '#10b981'};color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;flex:2">
            ${esCorreccion ? '💾 Registrar Corrección' : '💾 Revisar y Registrar'}
        </button>
    </div>
    <div class="overflow-x"><table>
      <thead><tr>
        <th style="text-align:center;min-width:28px;color:#9ca3af">#</th>
        <th style="text-align:left;min-width:180px">Estudiante</th>
        <th>Marcar</th>
      </tr></thead><tbody>`;

      ests.forEach((est, idx) => {
        const actual = pend[est.id] !== undefined ? pend[est.id] : (saved[est.id] || '');
        html += `<tr><td style="font-size:11px;text-align:center;color:#9ca3af;padding:4px 6px">${idx + 1}</td><td style="font-size:12px">${est.nombre_completo}</td><td>
      <div class="asis-grp">`;
        ESTADOS.forEach(s => {
          const on = actual === s.v;
          const st = on ? `background:${s.c};border-color:${s.c};border-width:3px` : '';
          html += `<button class="asis-btn${on ? ' on' : ''}" style="${st}" title="${s.v}"
        onclick="marcarPend(${bloque.asignatura_id},${est.id},'${s.v}',this)">${s.e}</button>`;
        });
        html += `</div></td></tr>`;
      });

      html += `</tbody></table></div>
    ${btnRegistrar('bottom')}
  </div>`;

      document.getElementById('zona-lista').innerHTML = html;
    }

    function marcarPend(asigId, estId, estado, btn) {
      if (!pendienteAsist[asigId]) pendienteAsist[asigId] = {};
      pendienteAsist[asigId][estId] = estado;
      console.log('Pendiente:', asigId, estId, estado);
      const C = { 'Asistió': '#22c55e', 'No asistió': '#ef4444', 'Retraso': '#f97316', 'Permiso': '#3b82f6', 'Enfermo': '#a855f7' };
      const grp = btn.closest('.asis-grp');
      grp.querySelectorAll('.asis-btn').forEach(b => {
        b.classList.remove('on');
        b.style.background = b.style.borderColor = b.style.borderWidth = '';
      });
      btn.classList.add('on');
      btn.style.background = btn.style.borderColor = C[estado];
      btn.style.borderWidth = '3px';

      // Actualizar estadísticas visuales en tiempo real
      if (bloqueAbierto) {
        const asig = DB.asigs.find(a => a.id === asigId);
        const ests = DB.ests.filter(e => e.grado === asig?.grado);
        const asigMap = currentSavedMap[asigId] || {};
        const saved = asigMap[bloqueAbierto.bloque.bloque_nombre] || asigMap['S/B'] || {};

        const counts = {};
        ESTADOS.forEach(s => counts[s.v] = 0);
        ests.forEach(est => {
          const estStatus = pendienteAsist[asigId][est.id] !== undefined ? pendienteAsist[asigId][est.id] : (saved[est.id] || '');
          if (estStatus) counts[estStatus]++;
        });

        const statsDiv = document.getElementById('stats-asist');
        if (statsDiv) {
          statsDiv.innerHTML = ESTADOS.map(s => `
            <div class="stat-card" style="border-bottom: 3px solid ${s.c}">
              <span class="stat-num" style="color:${s.c}">${counts[s.v] || 0}</span>
              ${s.v}
            </div>`).join('');
        }
      }
    }

    /**
     * Muestra el pop-up de confirmación antes de guardar
     */
    function mostrarConfirmacionAsistencia() {
      if (!bloqueAbierto) return;
      const { bloque, fecha } = bloqueAbierto;
      const asig = DB.asigs.find(a => a.id === bloque.asignatura_id);
      const ests = DB.ests.filter(e => e.grado === asig?.grado);
      const pend = pendienteAsist[bloque.asignatura_id] || {};
      const asigMap = currentSavedMap[bloque.asignatura_id] || {};
      const saved = asigMap[bloque.bloque_nombre] || asigMap['S/B'] || {};

      // Calcular novedades (quienes NO asistieron)
      const novedades = [];
      const counts = {};
      ESTADOS.forEach(s => counts[s.v] = 0);

      ests.forEach(est => {
        const estStatus = pend[est.id] !== undefined ? pend[est.id] : (saved[est.id] || '');
        if (estStatus) {
          counts[estStatus]++;
          const anterior = saved[est.id];
          if (estStatus !== 'Asistió' || (anterior && anterior !== estStatus)) {
            novedades.push({
              nombre: est.nombre_completo,
              estado: estStatus,
              anterior: anterior === estStatus ? null : anterior
            });
          }
        }
      });

      const esCorreccion = Object.keys(saved).length > 0;
      const motivoPre = document.getElementById('motivo-txt-main')?.value || "";

      const modalHtml = `
      <div class="modal-overlay" id="modal-confirm">
        <div class="modal-card">
          <div class="modal-head" style="background:${esCorreccion ? '#fff1f2' : '#f8fafc'}">
            <span>${esCorreccion ? 'Confirmar Corrección' : 'Confirmar Asistencia'}</span>
            <button onclick="cerrarModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size:14px;color:#475569;margin-bottom:15px">
              Resumen para <b>${asig?.nombre}</b> - Bloque ${bloque.bloque_nombre}
            </p>
            
            <div style="background:#f1f5f9;border-radius:12px;padding:12px;margin-bottom:15px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                    ${ESTADOS.map(s => `<div style="font-size:13px"><b>${counts[s.v] || 0}</b> ${s.v}</div>`).join('')}
                </div>
            </div>

            <h4 style="font-size:14px;margin-bottom:8px">${esCorreccion ? 'Cambios realizados:' : 'Novedades:'}</h4>
            <div style="max-height:150px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:12px">
                ${novedades.length === 0 ? '<p style="color:#64748b">Sin cambios significativos.</p>' :
          novedades.map(n => `
                    <div style="padding:6px 0;border-bottom:1px solid #f1f5f9">
                        <div style="display:flex;justify-content:space-between">
                            <span>${n.nombre}</span>
                            <b style="color:${ESTADOS.find(s => s.v === n.estado)?.c}">${n.estado}</b>
                        </div>
                        ${n.anterior ? `<div style="font-size:10px;color:#94a3b8">Anteriormente: ${n.anterior}</div>` : ''}
                    </div>
                  `).join('')
        }
            </div>

            <div id="area-correccion" style="display:${esCorreccion || motivoPre ? 'block' : 'none'};margin-top:15px">
                <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Motivo de la corrección:</label>
                <textarea id="motivo-txt" style="width:100%;height:60px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:13px" placeholder="Escribe aquí por qué cambiaste el registro...">${motivoPre}</textarea>
            </div>
            
            ${!esCorreccion && !motivoPre ? `
            <button onclick="document.getElementById('area-correccion').style.display='block';this.style.display='none'" 
                    style="margin-top:15px;background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;width:100%">
                ✍️ Agregar observación
            </button>` : ''}
          </div>
          <div class="modal-foot">
            <button onclick="cerrarModal()" style="flex:1;padding:10px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;font-weight:700;cursor:pointer">Cancelar</button>
            <button onclick="confirmarYGuardar()" style="flex:2;padding:10px;background:${esCorreccion ? '#f43f5e' : '#10b981'};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">
                ${esCorreccion ? 'Confirmar y Actualizar' : 'Confirmar y Guardar'}
            </button>
          </div>
        </div>
      </div>`;

      const div = document.createElement('div');
      div.id = 'modal-container';
      div.innerHTML = modalHtml;
      document.body.appendChild(div);
    }

    function cerrarModal() {
      const m = document.getElementById('modal-container');
      if (m) m.remove();
    }

    async function confirmarYGuardar() {
      if (!bloqueAbierto) return;
      const { bloque, fecha } = bloqueAbierto;
      const asig = DB.asigs.find(a => a.id === bloque.asignatura_id);
      const grado = asig?.grado || '';

      cerrarModal();
      await registrarBloque(bloque.asignatura_id, fecha, grado, bloque.bloque_nombre);
    }

    async function registrarBloque(asigId, fecha, grado, bloqueNombre) {
      if (!bloqueNombre) {
        alert("Atención: El nombre del bloque no se detectó. Por favor, recarga la página.");
        return;
      }
      const pend = pendienteAsist[asigId] || {};
      const count = Object.keys(pend).length;
      if (!count) {
        badge('wait', 'Sin cambios pendientes');
        setTimeout(() => badge('ok', 'Listo ✓'), 2000); return;
      }
      badge('wait', `Guardando ${count} registros en Bloque ${bloqueNombre}...`);

      const { data: exist, error: errExist } = await sb.from('asistencia').select('id,estudiante_id')
        .eq('asignatura_id', Number(asigId)).eq('fecha', fecha).eq('bloque_nombre', String(bloqueNombre));

      if (errExist) {
        alert("Error al consultar registros existentes: " + errExist.message);
        badge('no', 'Error'); return;
      }
      const exMap = {};
      (exist || []).forEach(r => { exMap[r.estudiante_id] = r.id; });

      let errores = 0;
      for (const [estId, estado] of Object.entries(pend)) {
        const eId = parseInt(estId);
        let error;
        // console.log(`Guardando: Est=${eId}, Asig=${asigId}, Blq=${bloqueNombre}, Estado=${estado}`);
        if (exMap[eId]) {
          ({ error } = await sb.from('asistencia').update({ estado }).eq('id', exMap[eId]));
        } else {
          ({ error } = await sb.from('asistencia').insert({
            estudiante_id: eId, asignatura_id: Number(asigId),
            fecha, estado, periodo, bloque_nombre: String(bloqueNombre)
          }));
        }
        if (error) {
          console.error('Error Supabase:', error);
          alert("Error al guardar: " + (error.message || JSON.stringify(error)));
          errores++;
        }
      }

      delete pendienteAsist[asigId];
      if (errores) { badge('no', `${errores} error(es)`); return; }
      badge('ok', '✅ Asistencia registrada');
      await renderHorarioDia(fecha); // recarga para mostrar ✓ en mini-bloque
    }
    // ════════════════════════════════════════════════════════
    // TAB RESUMEN
    // ════════════════════════════════════════════════════════
    async function selRes(g) {
      gRes = g;
      badge('wait', 'Cargando resumen…');

      const asigs = DB.asigs.filter(a => a.grado === g);
      const ests = DB.ests.filter(e => e.grado === g);
      const asigIds = asigs.map(a => a.id);
      const estIds = ests.map(e => e.id);
      const actIds = DB.acts.filter(a => asigIds.includes(a.asignatura_id)).map(a => a.id);

      const [rn, ra, rh] = await Promise.all([
        actIds.length
          ? sb.from('notas').select('*').in('actividad_id', actIds)
          : Promise.resolve({ data: [] }),
        sb.from('asistencia').select('*').eq('periodo', periodo).in('asignatura_id', asigIds),
        sb.from('asistencia_historica').select('*')
          .eq('periodo', periodo).eq('año', anio)
          .in('estudiante_id', estIds).in('asignatura_id', asigIds)
      ]);
      if (rh.error) {
        console.warn('Error en asistencia_historica, probando asistencia_historial...', rh.error);
        const rh2 = await sb.from('asistencia_historial').select('*')
          .eq('periodo', periodo).eq('año', anio)
          .in('estudiante_id', estIds).in('asignatura_id', asigIds);
        if (!rh2.error) rh.data = rh2.data;
      }

      const notas = rn.data || [];
      const asist = ra.data || [];
      const historial = rh.data || [];

      // Índices
      const notasEst = {}, asistEst = {};
      notas.forEach(n => { (notasEst[n.estudiante_id] = notasEst[n.estudiante_id] || []).push(n); });
      asist.forEach(a => { (asistEst[a.estudiante_id] = asistEst[a.estudiante_id] || []).push(a); });

      // Índice de faltas históricas: histMap[estId][asigId] = faltas
      const histMap = {};
      (rh.data || []).forEach(h => {
        if (!histMap[h.estudiante_id]) histMap[h.estudiante_id] = {};
        histMap[h.estudiante_id][h.asignatura_id] = h.faltas;
      });

      let html = `<div class="card card-res">
    <h3>Resumen grupo ${g}</h3>
    <div class="overflow-x"><table><thead><tr>
      <th style="text-align:center;min-width:28px;color:#9ca3af">#</th>
      <th style="text-align:left;min-width:150px">Estudiante</th>
      ${asigs.map(a => `<th title="${a.nombre}">${a.codigo}</th>`).join('')}
    </tr></thead><tbody>`;

      ests.forEach((est, idx) => {
        const mis_n = notasEst[est.id] || [];
        const mis_a = asistEst[est.id] || [];
        const defs = [];
        html += `<tr><td style="font-size:11px;text-align:center;color:#9ca3af;padding:4px 6px">${idx + 1}</td><td style="font-size:12px">${est.nombre_completo}</td>`;

        asigs.forEach(asig => {
          const actsA = DB.acts.filter(a => a.asignatura_id === asig.id);
          const v70 = actsA.filter(a => a.porcentaje === 1).map(a => {
            const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
          });
          const v30 = actsA.filter(a => a.porcentaje === 0).map(a => {
            const n = mis_n.find(n => n.actividad_id === a.id); return n ? Number(n.valor) : null;
          });
          const d = defin(v70, v30);
          defs.push(d);

          // Faltas de esta asignatura específica
          const aid = asig.id, eid = est.id;
          const fNuevas = mis_a.filter(a => a.asignatura_id == aid && a.estado === 'No asistió').length;
          const fHist = (histMap[eid] || {})[aid] || (histMap[eid] || {})[String(aid)] || 0;
          const fTotal = fNuevas + fHist;

          html += `<td>
            <span class="ds ${dsClass(d)}" style="font-size:10px;padding:2px 7px">${dsLabel(d)}</span>
            <div style="font-size:9px;color:${fTotal > 3 ? '#dc2626' : '#6b7280'};margin-top:2px">F: ${fTotal}</div>
          </td>`;
        });

        html += `</tr>`;
      });

      html += `</tbody></table></div></div>`;
      document.getElementById('p-res').innerHTML = html;
      badge('ok', 'Listo ✓');
    }

    // ════════════════════════════════════════════════════════
    // TAB INGRESO
    // ════════════════════════════════════════════════════════
    function ingCargarEst() {
      const g = document.getElementById('ing-grado').value;
      const sortedEsts = DB.ests.filter(e => e.grado === g)
        .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

      document.getElementById('ing-est').innerHTML =
        '<option value="">Selecciona estudiante…</option>' +
        sortedEsts.map(e => `<option value="${e.id}">${e.nombre_completo}</option>`).join('');
      document.getElementById('ing-act').innerHTML = '<option value="">Selecciona estudiante primero…</option>';
    }

    function ingCargarAct() {
      // FIX: parseInt para comparar id (int8) con value (string)
      const estId = parseInt(document.getElementById('ing-est').value);
      const est = DB.ests.find(e => e.id === estId);
      if (!est) return;
      const asigIds = DB.asigs.filter(a => a.grado === est.grado).map(a => a.id);
      const acts = DB.acts.filter(a => asigIds.includes(a.asignatura_id));
      document.getElementById('ing-act').innerHTML =
        '<option value="">Selecciona actividad…</option>' +
        acts.map(a => {
          const asig = DB.asigs.find(x => x.id === a.asignatura_id);
          const tipo = a.porcentaje === 1 ? '70%' : '30%';
          return `<option value="${a.id}">${asig?.codigo || ''} – ${a.nombre} (${tipo})</option>`;
        }).join('');
    }

    async function guardarNota() {
      const estId = parseInt(document.getElementById('ing-est').value);
      const actId = parseInt(document.getElementById('ing-act').value);
      const valor = parseFloat(document.getElementById('ing-nota').value);
      const msg = document.getElementById('ing-msg');

      if (!estId || !actId || isNaN(valor) || valor < 0 || valor > 10) {
        msg.style.color = '#dc2626';
        msg.textContent = '⚠️ Datos incompletos o nota fuera de rango (0–10)';
        return;
      }
      badge('wait', 'Guardando…');

      const act = DB.acts.find(a => a.id === actId);

      // Función para normalizar texto (quitar acentos y pasar a minúsculas)
      const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const isEvaluandonos = act && normalize(act.nombre).includes('evaluandonos');

      let notasToSave = [{
        estudiante_id: estId,
        actividad_id: actId,
        asignatura_id: act?.asignatura_id,
        valor,
        periodo,
        año: anio
      }];

      if (isEvaluandonos) {
        console.log('Detectada actividad Evaluándonos. Iniciando sincronización...');
        const asig = DB.asigs.find(a => a.id === act.asignatura_id);
        const grado = asig?.grado;
        const asigIds = DB.asigs.filter(a => a.grado === grado).map(a => a.id);

        // Buscar otras actividades "Evaluándonos" en el mismo grado (mismo periodo)
        const otherActs = DB.acts.filter(a =>
          asigIds.includes(a.asignatura_id) &&
          a.id !== actId &&
          normalize(a.nombre).includes('evaluandonos')
        );

        console.log('Materias encontradas para sincronizar:', otherActs.map(oa => oa.nombre));

        otherActs.forEach(oa => {
          notasToSave.push({
            estudiante_id: estId,
            actividad_id: oa.id,
            asignatura_id: oa.asignatura_id,
            valor,
            periodo,
            año: anio
          });
        });
      }

      // Guardar cada nota manualmente para evitar el error de ON CONFLICT
      let errores = 0;
      for (const n of notasToSave) {
        // Buscar nota existente filtrando por año y periodo
        const { data: existente } = await sb.from('notas').select('id')
          .eq('estudiante_id', n.estudiante_id).eq('actividad_id', n.actividad_id)
          .eq('año', anio).eq('periodo', periodo).maybeSingle();

        let error;
        if (existente) {
          ({ error } = await sb.from('notas').update({ valor: n.valor }).eq('id', existente.id));
        } else {
          ({ error } = await sb.from('notas').insert(n));
        }
        if (error) {
          console.error('Error al guardar nota:', error);
          errores++;
        }
      }

      if (errores > 0) {
        msg.style.color = '#dc2626';
        msg.textContent = '❌ Error al guardar ' + errores + ' notas.';
        badge('no', 'Error');
      } else {
        msg.style.color = '#059669';
        msg.textContent = isEvaluandonos ? '✅ Sincronización Evaluándonos (' + notasToSave.length + ' mat.)' : '✅ Nota guardada';
        document.getElementById('ing-nota').value = '';
        badge('ok', 'Guardado ✓');

        // Refuerzo: Actualizar otras vistas de inmediato
        if (gRes) await selRes(gRes);
        const currentAsigId = parseInt(document.getElementById('asig-notas-sel')?.value);
        if (currentAsigId) await cargarTablaNotas();

        setTimeout(() => { msg.textContent = ''; }, 3000);
      }
    }

    async function guardarNotaDesdeTabla(estId, actId, asigId, inputElem) {
      let valText = inputElem.value.trim();
      let lbl = inputElem.nextElementSibling;

      if (valText === '') {
        badge('wait', 'Borrando…');
        // Buscar nota existente del período actual para borrar
        const { data: existente } = await sb.from('notas').select('id')
          .eq('estudiante_id', estId).eq('actividad_id', actId)
          .eq('año', anio).eq('periodo', periodo).maybeSingle();
        if (existente) {
          const { error } = await sb.from('notas').delete().eq('id', existente.id);
          if (error) { badge('no', 'Error al borrar'); return; }
        }
        badge('ok', 'Borrado ✓');
        if (lbl) {
          lbl.className = 'ds ds-sin';
          lbl.textContent = '';
        }
        return;
      }

      let valor = parseFloat(valText);
      if (isNaN(valor) || valor < 0 || valor > 10) {
        inputElem.style.borderColor = '#dc2626';
        badge('no', 'Nota inválida');
        return;
      }

      badge('wait', 'Guardando…');

      // Buscar nota existente filtrando también por año y periodo
      // para no confundir notas de períodos anteriores
      const { data: existente } = await sb.from('notas').select('id')
        .eq('estudiante_id', estId).eq('actividad_id', actId)
        .eq('año', anio).eq('periodo', periodo).maybeSingle();

      let error;
      if (existente) {
        ({ error } = await sb.from('notas').update({ valor }).eq('id', existente.id));
      } else {
        ({ error } = await sb.from('notas').insert({
          estudiante_id: estId, actividad_id: actId,
          asignatura_id: asigId,
          valor, periodo, año: anio
        }));
      }

      if (error) {
        inputElem.style.borderColor = '#dc2626';
        badge('no', 'Error al guardar');
      } else {
        inputElem.style.borderColor = '#10b981';
        badge('ok', 'Guardado ✓');
        if (lbl) {
          lbl.className = 'ds ' + dsClass(valor);
          lbl.textContent = dsLabel(valor);
        }
        setTimeout(() => { inputElem.style.borderColor = '#e5e7eb'; }, 2000);
      }
    }

    // ════════════════════════════════════════════════════════
    // TAB ACTIVIDADES
    // ════════════════════════════════════════════════════════
    function renderIconos() {
      document.getElementById('icons-act').innerHTML = DB.asigs.map(a =>
        `<div class="icon-item" data-id="${a.id}"
      onclick="this.classList.toggle('selected')">
      📚<span>${a.codigo}</span><span style="font-size:10px;color:#6b7280">${a.grado}</span>
    </div>`
      ).join('');
    }

    async function crearActividadesMulti() {
      const nombre = document.getElementById('act-nom').value.trim();
      const porcentaje = parseInt(document.getElementById('act-por').value);
      const msg = document.getElementById('act-msg');
      msg.textContent = '';

      if (!nombre) {
        msg.style.color = '#dc2626';
        msg.textContent = '⚠️ Escribe el nombre de la actividad';
        return;
      }

      // FIX: asignaturas seleccionadas (ícono con clase .selected)
      const selIds = [...document.querySelectorAll('#icons-act .icon-item.selected')]
        .map(el => parseInt(el.dataset.id));

      if (!selIds.length) {
        msg.style.color = '#dc2626';
        msg.textContent = '⚠️ Selecciona al menos una asignatura (toca su ícono)';
        return;
      }

      badge('wait', 'Creando…');
      // Construir una fila por asignatura seleccionada
      const rows = selIds.map(asigId => {
        const asig = DB.asigs.find(a => a.id === asigId);
        return {
          nombre: `${asig?.codigo || ''} ${nombre}`.trim(),
          asignatura_id: asigId,
          periodo,
          porcentaje
        };
      });

      const { error } = await sb.from('actividades').insert(rows);
      if (error) {
        msg.style.color = '#dc2626';
        msg.textContent = '❌ Error: ' + error.message;
        badge('no', 'Error'); return;
      }

      // Recargar actividades en memoria
      const { data } = await sb.from('actividades').select('*').eq('periodo', periodo);
      DB.acts = data || [];

      // Limpiar selección
      document.querySelectorAll('#icons-act .icon-item.selected')
        .forEach(el => el.classList.remove('selected'));
      document.getElementById('act-nom').value = '';

      msg.style.color = '#059669';
      msg.textContent = `✅ Actividad "${nombre}" creada en ${rows.length} asignatura(s)`;
      badge('ok', 'Listo ✓');
      setTimeout(() => { msg.textContent = ''; }, 4000);
      // Refrescar lista de actividades existentes
      renderListaActividades();
    }

    // ── Poblar selector de asignatura en lista de actividades ──
    function poblarSelectorListaActs() {
      const sel = document.getElementById('act-lista-asig');
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">-- Selecciona asignatura --</option>' +
        DB.asigs.map(a => `<option value="${a.id}">${a.nombre} (${a.grado})</option>`).join('');
      if (current) sel.value = current;
    }

    // ── Render lista de actividades de la asignatura seleccionada ──
    function renderListaActividades() {
      poblarSelectorListaActs();
      const asigId = parseInt(document.getElementById('act-lista-asig').value);
      const body = document.getElementById('act-lista-body');
      if (!asigId) {
        body.innerHTML = '<p style="text-align:center;color:#6b7280;font-size:13px;padding:20px">Selecciona una asignatura para ver sus actividades</p>';
        return;
      }
      const acts = DB.acts.filter(a => a.asignatura_id === asigId);
      if (!acts.length) {
        body.innerHTML = '<p style="text-align:center;color:#6b7280;font-size:13px;padding:20px">No hay actividades creadas para esta asignatura</p>';
        return;
      }
      body.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;padding-top:4px">
        ${acts.map(act => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid var(--border-glass)">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${act.nombre}</div>
              <span style="display:inline-block;margin-top:3px;font-size:11px;padding:2px 7px;border-radius:10px;background:${act.porcentaje === 1 ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)'};color:${act.porcentaje === 1 ? '#818cf8' : '#f59e0b'}">${act.porcentaje === 1 ? '70% Saber/Hacer' : '30% Evaluándonos'}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
              <button class="btn" style="padding:4px 10px;font-size:12px;width:90px" onclick="abrirModalActividad(${act.id})">✏️ Editar</button>
              <button class="btn" style="padding:4px 10px;font-size:12px;width:90px;background:#fee2e2;color:#991b1b;border-color:#fca5a5" onclick="eliminarActividad(${act.id})">🗑️ Eliminar</button>
            </div>
          </div>`).join('')}
      </div>`;
    }

    // ── Modal editar actividad ──
    function abrirModalActividad(id) {
      const act = DB.acts.find(a => a.id === id);
      if (!act) return;
      const modalHtml = `
      <div class="modal-overlay" id="modal-dinamico">
        <div class="modal-card">
          <div class="modal-head">
            <h3>✏️ Editar Actividad</h3>
            <button class="menu-btn" onclick="document.getElementById('modal-dinamico').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="lbl">Nombre de la actividad</label>
              <input type="text" id="m-act-nombre" value="${act.nombre}" placeholder="Ej. Taller 1" style="width:100%">
            </div>
            <div class="form-group" style="margin-top:15px">
              <label class="lbl">Tipo / Peso</label>
              <select id="m-act-por" style="width:100%">
                <option value="1" ${act.porcentaje === 1 ? 'selected' : ''}>Saber / Hacer (70%)</option>
                <option value="0" ${act.porcentaje === 0 ? 'selected' : ''}>Evaluándonos (30%)</option>
              </select>
            </div>
            <input type="hidden" id="m-act-id" value="${id}">
          </div>
          <div class="modal-foot" style="display:flex;justify-content:space-between">
            <div></div>
            <div>
              <button class="btn" style="background:var(--bg-hover);color:var(--text-main)" onclick="document.getElementById('modal-dinamico').remove()">Cancelar</button>
              <button class="btn btn-save" onclick="guardarActividad()">💾 Guardar</button>
            </div>
          </div>
        </div>
      </div>`;
      let div = document.getElementById('modal-container');
      if (!div) { div = document.createElement('div'); div.id = 'modal-container'; document.body.appendChild(div); }
      div.innerHTML = modalHtml;
    }

    // ── Guardar edición de actividad ──
    async function guardarActividad() {
      badge('wait', 'Guardando...');
      const id = document.getElementById('m-act-id').value;
      const nombre = document.getElementById('m-act-nombre').value.trim();
      const porcentaje = parseInt(document.getElementById('m-act-por').value);
      if (!nombre) { badge('no', 'Escribe el nombre'); return; }
      const { error } = await sb.from('actividades').update({ nombre, porcentaje }).eq('id', id);
      if (error) { badge('no', 'Error al guardar'); console.error(error); return; }
      document.getElementById('modal-dinamico').remove();
      badge('ok', 'Actividad actualizada ✓');
      // Actualizar en memoria
      const { data } = await sb.from('actividades').select('*').eq('periodo', periodo);
      DB.acts = data || [];
      renderListaActividades();
    }

    // ── Eliminar actividad ──
    async function eliminarActividad(id) {
      const act = DB.acts.find(a => a.id === id);
      if (!confirm(`¿Eliminar la actividad "${act?.nombre || id}"? Se borrarán TODAS las notas asociadas. Esta acción es irreversible.`)) return;
      badge('wait', 'Eliminando actividad...');
      await sb.from('notas').delete().eq('actividad_id', id);
      const { error } = await sb.from('actividades').delete().eq('id', id);
      if (error) { badge('no', 'Error al eliminar'); console.error(error); return; }
      badge('ok', 'Actividad eliminada ✓');
      // Actualizar en memoria
      const { data } = await sb.from('actividades').select('*').eq('periodo', periodo);
      DB.acts = data || [];
      renderListaActividades();
    }

    async function borrarNota(estId, actId) {
      if (!confirm('¿Estás seguro de que quieres borrar esta nota?')) return;

      badge('wait', 'Borrando nota...');
      const { error } = await sb.from('notas')
        .delete()
        .eq('estudiante_id', estId)
        .eq('actividad_id', actId);

      if (error) {
        alert('Error al borrar nota: ' + error.message);
        badge('no', 'Error');
      } else {
        badge('ok', 'Nota borrada ✓');
        // Refuerzo: Actualizar vistas de inmediato para el usuario actual
        if (gRes) await selRes(gRes);
        const currentAsigId = parseInt(document.getElementById('asig-notas-sel')?.value);
        if (currentAsigId) await cargarTablaNotas();
      }
    }

    // ════════════════════════════════════════════════════════
    // TAB INFORME
    // ════════════════════════════════════════════════════════
    function infCargarEst() {
      const g = document.getElementById('inf-grado').value;
      const sortedEsts = DB.ests.filter(e => e.grado === g)
        .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

      document.getElementById('inf-est').innerHTML =
        '<option value="">Selecciona estudiante…</option>' +
        sortedEsts.map(e => `<option value="${e.id}">${e.nombre_completo}</option>`).join('');
    }

    // ════════════════════════════════════════════════════════
    // TAB INFORME - SIN RESULTADO GENERAL + SOLO DESEMPEÑO (SIN NÚMERO)
    // ════════════════════════════════════════════════════════
    async function generarInforme() {
      const estId = parseInt(document.getElementById('inf-est').value);
      const grado = document.getElementById('inf-grado').value;

      if (!estId) {
        alert('Selecciona un estudiante');
        return;
      }

      badge('wait', 'Generando informe…');

      const est = DB.ests.find(e => e.id === estId);
      const asigs = DB.asigs.filter(a => a.grado === grado);
      const asigIds = asigs.map(a => a.id);
      const actIds = DB.acts.filter(a => asigIds.includes(a.asignatura_id)).map(a => a.id);

      const [rn, ra, rh] = await Promise.all([
        actIds.length
          ? sb.from('notas').select('*').eq('estudiante_id', estId).in('actividad_id', actIds)
          : Promise.resolve({ data: [] }),
        sb.from('asistencia').select('*').eq('estudiante_id', estId).eq('periodo', periodo),
        sb.from('asistencia_historica').select('*')
          .eq('estudiante_id', estId).eq('periodo', periodo).eq('año', anio)
      ]);

      if (rh.error) {
        console.warn('Reintentando asistencia_historial en informe...');
        const rh2 = await sb.from('asistencia_historial').select('*')
          .eq('estudiante_id', estId).eq('periodo', periodo).eq('año', anio);
        if (!rh2.error) rh.data = rh2.data;
      }

      const notas = rn.data || [];
      const asist = ra.data || [];
      // histMap[asigId] = faltas previas
      const histMap = {};
      (rh.data || []).forEach(h => { histMap[h.asignatura_id] = h.faltas; });

      let html = `<div style="max-width:1200px;margin:0 auto">

    <div class="card card-inf" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">📋</span>
          <h2 style="font-size:20px;font-weight:700;color:#0891b2;margin:0">Informe Individual de Desempeño</h2>
        </div>
        ${LOGO_URL ? `<img src="${LOGO_URL}" alt="Logo" style="height:64px;border-radius:10px;object-fit:contain">` : ""}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
        <div style="border:2px solid #e5e7eb;border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;font-weight:700;color:#0891b2">GRUPO</div>
          <div style="font-size:15px;font-weight:600">${grado}</div>
        </div>
        <div style="border:2px solid #e5e7eb;border-radius:10px;padding:10px 14px;min-width:0">
          <div style="font-size:10px;font-weight:700;color:#0891b2">ESTUDIANTE</div>
          <div style="font-size:16px;font-weight:600;word-break:break-word">${est.nombre_completo}</div>
        </div>
        <div style="border:2px solid #e5e7eb;border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;font-weight:700;color:#0891b2">AÑO</div>
          <div style="font-size:15px;font-weight:600">${anio}</div>
        </div>
        <div style="border:2px solid #e5e7eb;border-radius:10px;padding:10px 12px;text-align:center">
          <div style="font-size:10px;font-weight:700;color:#0891b2">PERIODO</div>
          <div style="font-size:15px;font-weight:600">${periodo}</div>
        </div>
      </div>
    </div>

    <div class="card card-inf">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <span style="font-size:22px">📊</span>
        <h3 style="font-size:18px;font-weight:700;color:#1c1c1a;margin:0">Desempeño por Asignatura</h3>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">`;

      asigs.forEach(asig => {
        const actsAsig = DB.acts.filter(a => a.asignatura_id === asig.id);

        const v70 = actsAsig.filter(a => a.porcentaje === 1).map(a => {
          const n = notas.find(n => n.actividad_id === a.id);
          return n ? Number(n.valor) : null;
        });
        const v30 = actsAsig.filter(a => a.porcentaje === 0).map(a => {
          const n = notas.find(n => n.actividad_id === a.id);
          return n ? Number(n.valor) : null;
        });

        const def = defin(v70, v30);
        const aid = asig.id;
        const fallasNuevas = asist.filter(a => a.asignatura_id == aid && String(a.estado).trim() === 'No asistió').length;
        const fallasHist = Number(histMap[aid] || histMap[String(aid)] || 0);
        const fallas = fallasNuevas + fallasHist;

        html += `<div style="border:2px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden">
      <div style="background:rgba(0,0,0,0.2);padding:16px;text-align:center;border-bottom:2px solid rgba(255,255,255,0.1)">
        <div style="font-size:15px;font-weight:700;color:var(--inf-light)">${asig.nombre}</div>
        <div style="font-size:12px;color:var(--text-sec)">${asig.codigo}</div>
      </div>
      <div style="padding:16px">`;

        if (actsAsig.length === 0) {
          html += `<p style="text-align:center;color:var(--text-sec);padding:20px">Sin actividades</p>`;
        } else {
          actsAsig.forEach((a, i) => {
            const n = notas.find(n => n.actividad_id === a.id);
            const val = n ? Number(n.valor) : null;
            html += `<div style="padding:10px 0;border-bottom:${i < actsAsig.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'}">
          <div style="font-size:13px;color:var(--text-sec);text-align:center">${a.nombre}</div>
          <div style="text-align:center;margin-top:6px">
            <span class="ds ${dsClass(val)}" style="font-size:12.5px;padding:5px 14px">
              ${dsLabel(val)}
            </span>
          </div>
        </div>`;
          });

          html += `<div style="margin-top:16px;padding-top:12px;border-top:2px solid rgba(255,255,255,0.1);text-align:center">
        <div style="font-size:11px;color:var(--text-main);font-weight:700">DEFINITIVA DE LA ASIGNATURA</div>
        <span class="ds ${dsClass(def)}" style="font-size:16px;padding:10px 24px;display:inline-block;margin-top:8px">
          ${dsLabel(def)}
        </span>
        <div style="margin-top:10px;font-size:13px;color:${fallas > 5 ? 'var(--baj)' : 'var(--text-sec)'}">
          ${fallas} falla${fallas !== 1 ? 's' : ''}
        </div>
      </div>`;
        }

        html += `</div></div>`;
      });

      html += `</div></div></div>`;

      document.getElementById('p-inf').innerHTML = html;
      badge('ok', 'Informe generado ✓');
    }
    // ════════════════════════════════════════════════════════
    // ARRANQUE — verificar sesión existente
    // ════════════════════════════════════════════════════════
    // ════════════════════════════════════════════════════════
    // ESTUDIANTES Y CURSOS
    // ════════════════════════════════════════════════════════

    function renderEstudiantes() {
      const filtro = document.getElementById('est-filtro-grado').value;
      const html = [];
      const lista = filtro === 'todos' ? DB.ests : DB.ests.filter(e => e.grado === filtro);

      const btnGroupDiv = document.getElementById('est-btn-eliminar-grupo');
      if (filtro !== 'todos') {
        btnGroupDiv.innerHTML = `<button class="btn" style="background:#fee2e2; color:#991b1b; padding:8px 12px; margin-bottom:8px" onclick="eliminarGrupo('${filtro}')">🗑️ Eliminar Grupo Completo</button>`;
      } else {
        btnGroupDiv.innerHTML = '';
      }

      html.push('<div class="table-container"><table class="table" style="width:100%; border-collapse: collapse;">');
      html.push('<thead><tr><th style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass); color:#9ca3af; min-width:32px">#</th><th style="text-align:left; padding:10px; border-bottom:1px solid var(--border-glass)">Nombre</th><th style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)">Grado</th><th style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)">Acciones</th></tr></thead><tbody>');

      lista.forEach((e, idx) => {
        html.push(`<tr>
          <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass); font-size:12px; color:#9ca3af">${idx + 1}</td>
          <td style="padding:10px; border-bottom:1px solid var(--border-glass)">${e.nombre_completo}</td>
          <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)"><span class="badge" style="background:#e0e7ff; color:#3730a3">${e.grado}</span></td>
          <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)"><button class="btn" style="padding: 4px 10px; font-size: 12px; margin-left: 5px;" onclick="abrirModalEstudiante(${e.id})">✏️ Editar</button></td>
        </tr>`);
      });
      html.push('</tbody></table></div>');
      document.getElementById('p-estudiantes').innerHTML = html.join('');
    }

    function renderCursos() {
      const filtro = document.getElementById('cur-filtro-grado').value;
      const html = [];
      const lista = filtro === 'todos' ? DB.asigs : DB.asigs.filter(e => e.grado === filtro);

      const btnGroupDiv = document.getElementById('cur-btn-eliminar-grupo');
      if (filtro !== 'todos') {
        btnGroupDiv.innerHTML = `<button class="btn" style="background:#fee2e2; color:#991b1b; padding:8px 12px; margin-bottom:8px" onclick="eliminarGrupo('${filtro}')">🗑️ Eliminar Grupo Completo</button>`;
      } else {
        btnGroupDiv.innerHTML = '';
      }

      html.push('<div class="table-container"><table class="table" style="width:100%; border-collapse: collapse;">');
      html.push('<thead><tr><th style="text-align:left; padding:10px; border-bottom:1px solid var(--border-glass)">Asignatura</th><th style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)">Grado</th><th style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)">Acciones</th></tr></thead><tbody>');

      lista.forEach(a => {
        html.push(`<tr>
          <td style="padding:10px; border-bottom:1px solid var(--border-glass)">${a.nombre}</td>
          <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)"><span class="badge" style="background:#fce7f3; color:#9d174d">${a.grado}</span></td>
          <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border-glass)"><button class="btn" style="padding: 4px 10px; font-size: 12px; margin-left: 5px;" onclick="abrirModalCurso(${a.id})">✏️ Editar</button></td>
        </tr>`);
      });
      html.push('</tbody></table></div>');
      document.getElementById('p-cursos').innerHTML = html.join('');
    }

    // Modal Estudiante
    function abrirModalEstudiante(id = null) {
      const est = id ? DB.ests.find(e => e.id === id) : null;
      const title = est ? 'Editar Estudiante' : 'Nuevo Estudiante';
      const grados = [...new Set(DB.asigs.map(a => a.grado))].sort();
      const options = grados.map(g => `<option value="${g}" ${est && est.grado === g ? 'selected' : ''}>${g}</option>`).join('');

      const modalHtml = `
      <div class="modal-overlay" id="modal-dinamico">
        <div class="modal-card">
          <div class="modal-head">
            <h3>${title}</h3>
            <button class="menu-btn" onclick="document.getElementById('modal-dinamico').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="lbl">Nombre Completo</label>
              <input type="text" id="m-est-nombre" value="${est ? est.nombre_completo : ''}" placeholder="Ej. Pérez Juan" style="width: 100%;">
            </div>
            <div class="form-group" style="margin-top:15px;">
              <label class="lbl">Grado</label>
              <input type="text" id="m-est-grado" list="dl-grados" value="${est ? est.grado : ''}" placeholder="Selecciona o escribe un nuevo grado..." style="width: 100%;">
              <datalist id="dl-grados">
                ${options}
              </datalist>
            </div>
            <input type="hidden" id="m-est-id" value="${id || ''}">
            <input type="hidden" id="m-est-grado-old" value="${est ? est.grado : ''}">
          </div>
          <div class="modal-foot" style="display:flex; justify-content: space-between;">
            ${id ? `<button class="btn" style="background:#fee2e2; color:#991b1b" onclick="eliminarEstudiante(${id})">🗑️ Eliminar</button>` : '<div></div>'}
            <div>
              <button class="btn" style="background:var(--bg-hover); color:var(--text-main)" onclick="document.getElementById('modal-dinamico').remove()">Cancelar</button>
              <button class="btn btn-save" onclick="guardarEstudiante()">Guardar</button>
            </div>
          </div>
        </div>
      </div>`;

      let div = document.getElementById('modal-container');
      if (!div) { div = document.createElement('div'); div.id = 'modal-container'; document.body.appendChild(div); }
      div.innerHTML = modalHtml;
    }

    async function guardarEstudiante() {
      badge('wait', 'Guardando...');
      const id = document.getElementById('m-est-id').value;
      const oldGrado = document.getElementById('m-est-grado-old').value;
      const nombre = document.getElementById('m-est-nombre').value.trim().toUpperCase();
      const grado = document.getElementById('m-est-grado').value;
      if (!nombre || !grado) { badge('no', 'Faltan datos'); return; }

      const obj = { nombre_completo: nombre, grado: grado, año: anio };
      let updatedId = id;

      if (id) {
        // Edit
        const { error } = await sb.from('estudiantes').update(obj).eq('id', id);
        if (error) { badge('no', 'Error al actualizar'); console.error(error); return; }

        // MIGRATION LOGIC
        if (oldGrado && oldGrado !== grado) {
          await migrarNotas(id, oldGrado, grado, anio);
        }
      } else {
        // Insert
        const { data, error } = await sb.from('estudiantes').insert(obj).select('id').single();
        if (error) { badge('no', 'Error al insertar'); console.error(error); return; }
        updatedId = data.id;
      }

      document.getElementById('modal-dinamico').remove();
      badge('ok', 'Estudiante guardado');
      await init(); // Reload data
    }

    async function migrarNotas(estudianteId, gradoViejo, gradoNuevo, anio) {
      console.log(`Iniciando migración para estudiante ${estudianteId} de ${gradoViejo} a ${gradoNuevo}...`);
      badge('wait', 'Migrando notas...');
      const { data: notas } = await sb.from('notas').select('*').eq('estudiante_id', estudianteId).eq('año', anio);
      if (!notas || notas.length === 0) return;

      const oldActIds = [...new Set(notas.map(n => n.actividad_id))];
      if (oldActIds.length === 0) return;

      const { data: oldActs } = await sb.from('actividades').select('*').in('id', oldActIds);
      const oldAsigIds = [...new Set(oldActs.map(a => a.asignatura_id))];
      const { data: asigsViejas } = await sb.from('asignaturas').select('*').in('id', oldAsigIds);

      // Buscar las asignaturas en el grado nuevo
      const { data: asigsNuevas } = await sb.from('asignaturas').select('*').eq('grado', gradoNuevo).eq('año', anio);

      const mapAsigs = {};
      for (let av of asigsViejas) {
        const an = asigsNuevas.find(a => a.nombre.toLowerCase().trim() === av.nombre.toLowerCase().trim());
        if (an) mapAsigs[av.id] = an.id;
      }

      const newAsigIds = Object.values(mapAsigs);
      if (newAsigIds.length === 0) return;

      const { data: newActs } = await sb.from('actividades').select('*').in('asignatura_id', newAsigIds);

      for (let nota of notas) {
        const oldAct = oldActs.find(a => a.id === nota.actividad_id);
        if (!oldAct) continue;
        const newAsigId = mapAsigs[oldAct.asignatura_id];
        if (!newAsigId) continue;

        const newAct = newActs.find(a => a.asignatura_id === newAsigId && a.nombre.toLowerCase().trim() === oldAct.nombre.toLowerCase().trim() && a.periodo === oldAct.periodo);

        if (newAct) {
          await sb.from('notas').update({ actividad_id: newAct.id, asignatura_id: newAsigId }).eq('id', nota.id);
        }
      }
    }

    // Modal Cursos (Asignaturas)
    function abrirModalCurso(id = null) {
      const asig = id ? DB.asigs.find(a => a.id === id) : null;
      const title = asig ? 'Editar Curso' : 'Nuevo Curso';

      const modalHtml = `
      <div class="modal-overlay" id="modal-dinamico">
        <div class="modal-card">
          <div class="modal-head">
            <h3>${title}</h3>
            <button class="menu-btn" onclick="document.getElementById('modal-dinamico').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="lbl">Nombre del Curso (Materia)</label>
              <input type="text" id="m-cur-nombre" value="${asig ? asig.nombre : ''}" placeholder="Ej. Matemáticas" style="width: 100%;">
            </div>
            <div class="form-group" style="margin-top:15px;">
              <label class="lbl">Grado</label>
              <input type="text" id="m-cur-grado" value="${asig ? asig.grado : ''}" placeholder="Ej. 10A" style="width: 100%;">
            </div>
            <div class="form-group" style="margin-top:15px;">
              <label class="lbl">Código Corto (opcional)</label>
              <input type="text" id="m-cur-codigo" value="${asig ? (asig.codigo || '') : ''}" placeholder="Ej. MAT" style="width: 100%;">
            </div>
            <input type="hidden" id="m-cur-id" value="${id || ''}">
          </div>
          <div class="modal-foot" style="display:flex; justify-content: space-between;">
            ${id ? `<button class="btn" style="background:#fee2e2; color:#991b1b" onclick="eliminarCurso(${id})">🗑️ Eliminar</button>` : '<div></div>'}
            <div>
              <button class="btn" style="background:var(--bg-hover); color:var(--text-main)" onclick="document.getElementById('modal-dinamico').remove()">Cancelar</button>
              <button class="btn btn-save" onclick="guardarCurso()">Guardar</button>
            </div>
          </div>
        </div>
      </div>`;

      let div = document.getElementById('modal-container');
      if (!div) { div = document.createElement('div'); div.id = 'modal-container'; document.body.appendChild(div); }
      div.innerHTML = modalHtml;
    }

    async function guardarCurso() {
      badge('wait', 'Guardando...');
      const id = document.getElementById('m-cur-id').value;
      const nombre = document.getElementById('m-cur-nombre').value.trim();
      const grado = document.getElementById('m-cur-grado').value.trim();
      const codigo = document.getElementById('m-cur-codigo').value.trim();
      if (!nombre || !grado) { badge('no', 'Faltan datos'); return; }

      const obj = { nombre: nombre, grado: grado, codigo: codigo, año: anio };

      if (id) {
        const { error } = await sb.from('asignaturas').update(obj).eq('id', id);
        if (error) { badge('no', 'Error al actualizar'); console.error(error); return; }
      } else {
        const { error } = await sb.from('asignaturas').insert(obj);
        if (error) { badge('no', 'Error al insertar'); console.error(error); return; }
      }

      document.getElementById('modal-dinamico').remove();
      badge('ok', 'Curso guardado');
      await init(); // Reload data
    }

    async function eliminarEstudiante(id) {
      if (!confirm("¿Estás seguro de que deseas eliminar este estudiante y TODAS sus notas y asistencias? Esta acción es irreversible.")) return;
      document.getElementById('modal-dinamico').remove();
      badge('wait', 'Eliminando estudiante...');
      await sb.from('notas').delete().eq('estudiante_id', id);
      await sb.from('asistencia').delete().eq('estudiante_id', id);
      await sb.from('asistencia_historial').delete().eq('estudiante_id', id);
      await sb.from('asistencia_historica').delete().eq('estudiante_id', id);
      const { error } = await sb.from('estudiantes').delete().eq('id', id);
      if (error) { badge('no', 'Error al eliminar'); console.error(error); return; }
      badge('ok', 'Estudiante eliminado');
      await init();
    }

    async function eliminarCurso(id) {
      if (!confirm("¿Estás seguro de que deseas eliminar esta asignatura? Se eliminarán TODAS las actividades y notas asociadas. Esta acción es irreversible.")) return;
      document.getElementById('modal-dinamico').remove();
      badge('wait', 'Eliminando curso...');

      const { data: acts } = await sb.from('actividades').select('id').eq('asignatura_id', id);
      if (acts && acts.length > 0) {
        const actIds = acts.map(a => a.id);
        await sb.from('notas').delete().in('actividad_id', actIds);
        await sb.from('eval_resultados').delete().in('pregunta_num', actIds); // if applicable
        await sb.from('actividades').delete().in('id', actIds);
      }

      await sb.from('notas').delete().eq('asignatura_id', id);
      await sb.from('asistencia').delete().eq('asignatura_id', id);
      await sb.from('asistencia_historial').delete().eq('asignatura_id', id);
      await sb.from('asistencia_historica').delete().eq('asignatura_id', id);
      const { error } = await sb.from('asignaturas').delete().eq('id', id);
      if (error) { badge('no', 'Error al eliminar'); console.error(error); return; }
      badge('ok', 'Curso eliminado');
      await init();
    }

    async function eliminarGrupo(grado) {
      if (!grado || grado === 'todos') return;
      if (!confirm(`⚠️ ATENCIÓN ⚠️\n\nEstás a punto de eliminar EL GRUPO COMPLETO "${grado}".\n\nEsto borrará permanentemente:\n- TODOS los estudiantes de ${grado}\n- TODAS las asignaturas de ${grado}\n- TODAS las notas, actividades y asistencias de ${grado}\n\n¿Estás ABSOLUTAMENTE SEGURO de continuar?`)) return;
      if (!confirm(`Para confirmar, haz clic en Aceptar de nuevo. Se borrarán absolutamente todos los datos de ${grado}.`)) return;

      badge('wait', `Eliminando grupo ${grado}...`);

      // Borrar estudiantes
      const ests = DB.ests.filter(e => e.grado === grado);
      for (let est of ests) {
        await sb.from('notas').delete().eq('estudiante_id', est.id);
        await sb.from('asistencia').delete().eq('estudiante_id', est.id);
        await sb.from('asistencia_historial').delete().eq('estudiante_id', est.id);
        await sb.from('asistencia_historica').delete().eq('estudiante_id', est.id);
        await sb.from('estudiantes').delete().eq('id', est.id);
      }

      // Borrar asignaturas
      const asigs = DB.asigs.filter(a => a.grado === grado);
      for (let asig of asigs) {
        const { data: acts } = await sb.from('actividades').select('id').eq('asignatura_id', asig.id);
        if (acts && acts.length > 0) {
          const actIds = acts.map(a => a.id);
          await sb.from('notas').delete().in('actividad_id', actIds);
          await sb.from('actividades').delete().in('id', actIds);
        }
        await sb.from('notas').delete().eq('asignatura_id', asig.id);
        await sb.from('asistencia').delete().eq('asignatura_id', asig.id);
        await sb.from('asistencia_historial').delete().eq('asignatura_id', asig.id);
        await sb.from('asistencia_historica').delete().eq('asignatura_id', asig.id);
        await sb.from('asignaturas').delete().eq('id', asig.id);
      }

      badge('ok', `Grupo ${grado} eliminado con éxito`);
      document.getElementById('est-filtro-grado').value = 'todos';
      document.getElementById('cur-filtro-grado').value = 'todos';
      await init();
    }

    function aplicarBranding() {
      if (FONDO_URL) document.body.style.backgroundImage = `url("${FONDO_URL}")`;
      ['login-logo', 'header-logo', 'sb-logo'].forEach(id => {
        const el = document.getElementById(id);
        if (el && LOGO_URL) { el.src = LOGO_URL; el.style.display = 'inline-block'; }
      });
      // Set user label in sidebar
      const sbUser = document.getElementById('sb-user-lbl');
      const hdrUser = document.getElementById('user-lbl');
      if (sbUser && hdrUser) sbUser.textContent = hdrUser.textContent;

      const emoji = document.getElementById('login-emoji');
      if (emoji && LOGO_URL) emoji.style.display = 'none';
    }

    // ── Detectar y seleccionar el periodo actual desde la tabla 'periodos' ──
    async function detectarPeriodoActual() {
      try {
        const { data: periodos, error } = await sb.from('periodos').select('*').order('numero');
        if (!error && periodos && periodos.length > 0) {
          // Fecha local en formato YYYY-MM-DD
          const tzoffset = (new Date()).getTimezoneOffset() * 60000;
          const today = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];

          const currentPeriod = periodos.find(p => today >= p.fecha_inicio && today <= p.fecha_fin);
          if (currentPeriod) {
            const selectPeriodo = document.getElementById('sel-periodo');
            if (selectPeriodo) {
              selectPeriodo.value = String(currentPeriod.numero);
              console.log('[Periodo] Auto-seleccionado periodo', currentPeriod.numero,
                '(' + currentPeriod.fecha_inicio + ' – ' + currentPeriod.fecha_fin + ')');
            }
          } else {
            console.warn('[Periodo] No se encontró un periodo activo para hoy:', today);
          }
        }
      } catch (e) {
        console.error('[Periodo] Error obteniendo periodo actual:', e);
      }
    }

    (async () => {
      aplicarBranding();
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        mostrarApp(session.user.email);
        await detectarPeriodoActual(); // <-- auto-seleccionar el periodo al recargar
        await init();
      }
    })();
  