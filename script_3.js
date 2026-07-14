



    // ════════════════════════════════════════════════════════
    // DESCARGAR EXCEL Y VOLANTES DE PENDIENTES
    // ════════════════════════════════════════════════════════
    async function descargarPendientesExcel() {
      if (!DB.ests.length) return alert('No hay estudiantes.');
      const oldHtml = document.getElementById('p-pendientes').innerHTML;
      document.getElementById('p-pendientes').innerHTML = `<div style="text-align:center;padding:40px;color:#059669;font-size:14px">Generando archivo Excel... por favor espera.</div>`;

      try {
        const { data: notas, error } = await sb.from('notas').select('estudiante_id, actividad_id, valor').eq('año', anio).eq('periodo', periodo);
        if (error) throw error;

        const nMap = {};
        (notas || []).forEach(n => { nMap[`${n.estudiante_id}_${n.actividad_id}`] = Number(n.valor); });

        const actsByAsig = {};
        DB.acts.forEach(a => {
          if (!actsByAsig[a.asignatura_id]) actsByAsig[a.asignatura_id] = [];
          actsByAsig[a.asignatura_id].push(a);
        });

        const rows = [];
        const gradosUnicos = [...new Set(DB.ests.map(e => e.grado))].sort();

        gradosUnicos.forEach(grado => {
          const ests = DB.ests.filter(e => e.grado === grado).sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
          const asigs = DB.asigs.filter(a => a.grado === grado);

          ests.forEach(est => {
            asigs.forEach(asig => {
              const acts = actsByAsig[asig.id] || [];
              acts.forEach(act => {
                const val = nMap[`${est.id}_${act.id}`];
                if (val === undefined || val === null) {
                  rows.push({ Grado: grado, Estudiante: est.nombre_completo, Asignatura: asig.nombre, Actividad: act.nombre, Estado: 'Sin nota' });
                } else if (val === 0) {
                  rows.push({ Grado: grado, Estudiante: est.nombre_completo, Asignatura: asig.nombre, Actividad: act.nombre, Estado: 'NP (Nota 0)' });
                }
              });
            });
          });
        });

        if (!rows.length) {
          alert('¡Felicidades! No hay actividades pendientes en todo el colegio.');
          document.getElementById('p-pendientes').innerHTML = oldHtml;
          return;
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pendientes");
        XLSX.writeFile(wb, `Pendientes_${anio}_Periodo${periodo}.xlsx`);

      } catch (e) {
        alert('Error al generar Excel: ' + e.message);
      }
      document.getElementById('p-pendientes').innerHTML = oldHtml;
    }

    async function imprimirInformesPendientes() {
      if (!gPend) return alert('Selecciona un grado primero.');

      try {
        const ests = DB.ests.filter(e => e.grado === gPend).sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
        const asigs = DB.asigs.filter(a => a.grado === gPend);
        const actIds = [];
        const actsByAsig = {};
        asigs.forEach(asig => {
          const acts = DB.acts.filter(a => a.asignatura_id === asig.id);
          actsByAsig[asig.id] = acts;
          acts.forEach(a => actIds.push(a.id));
        });

        if (!actIds.length) return alert('No hay actividades para el grado ' + gPend);

        const { data: notas, error } = await sb.from('notas').select('estudiante_id, actividad_id, valor').in('actividad_id', actIds).eq('año', anio).eq('periodo', periodo);
        if (error) throw error;

        const nMap = {};
        (notas || []).forEach(n => { nMap[`${n.estudiante_id}_${n.actividad_id}`] = Number(n.valor); });

        const estudiantesPend = ests.map(est => {
          const pendsPorAsig = [];
          asigs.forEach(asig => {
            const acts = actsByAsig[asig.id] || [];
            const actsP = [];
            acts.forEach(act => {
              const val = nMap[`${est.id}_${act.id}`];
              if (val === undefined || val === null) actsP.push({ act, tipo: 'sin-nota' });
              else if (val === 0) actsP.push({ act, tipo: 'np' });
            });
            if (actsP.length) pendsPorAsig.push({ asig, actsP });
          });
          const total = pendsPorAsig.reduce((s, p) => s + p.actsP.length, 0);
          return { est, pendsPorAsig, total };
        }).filter(e => e.total > 0);

        if (!estudiantesPend.length) return alert('No hay estudiantes con pendientes en el grado ' + gPend);

        let printHtml = `
          <html>
          <head>
            <title>Informes Pendientes - ${gPend}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                padding: 10px; 
                color: #1f2937; 
                background-color: #f3f4f6; 
                margin: 0; 
              }
              .volante { 
                background: #ffffff;
                border: 1px solid #e5e7eb; 
                border-radius: 12px; 
                padding: 15px 25px; 
                margin-bottom: 15px; 
                page-break-inside: avoid;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                position: relative;
                overflow: hidden;
              }
              .volante::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: linear-gradient(90deg, #4f46e5, #ec4899);
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #f3f4f6;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .logo-img {
                height: 45px;
                object-fit: contain;
                width: 120px;
              }
              .logo-left {
                object-position: left;
              }
              .logo-right {
                object-position: right;
              }
              .header-title {
                text-align: center;
                flex: 1;
              }
              .header-title h2 { 
                margin: 0; 
                color: #111827; 
                font-size: 18px; 
                font-weight: 800;
                letter-spacing: -0.025em;
              }
              .header-title p {
                margin: 2px 0 0 0;
                font-size: 11px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 600;
              }
              .student-card {
                background: #f8fafc;
                border-radius: 8px;
                padding: 10px 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                border: 1px solid #e2e8f0;
              }
              .student-info { font-size: 13px; }
              .student-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
              .student-meta { color: #64748b; font-size: 12px; font-weight: 500; }
              .message {
                font-size: 12px; 
                margin-bottom: 10px; 
                color: #334155;
                line-height: 1.5;
                padding: 0 5px;
              }
              .asig-block {
                margin-bottom: 8px;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
              }
              .asig-title { 
                font-weight: 600; 
                font-size: 13px; 
                color: #1e293b; 
                background: #f1f5f9;
                padding: 6px 12px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .act-list { 
                margin: 0; 
                padding: 6px 12px; 
                list-style: none;
              }
              .act-item { 
                margin-bottom: 4px; 
                font-size: 12px; 
                color: #475569;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 4px;
                border-bottom: 1px dashed #e2e8f0;
              }
              .act-item:last-child {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
              }
              .tag {
                padding: 3px 8px;
                border-radius: 9999px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .tag-sin-nota { 
                background: #fef3c7; 
                color: #d97706; 
              }
              .tag-np { 
                background: #fee2e2; 
                color: #dc2626; 
              }
              .footer-section {
                margin-top: 15px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .firma-box { 
                border-top: 2px solid #cbd5e1; 
                width: 250px; 
                padding-top: 6px; 
                text-align: center; 
                font-size: 11px; 
                color: #475569;
                font-weight: 600; 
              }
              .footer-note {
                font-size: 10px;
                color: #94a3b8;
                font-style: italic;
              }
              @media print {
                body { padding: 0; background-color: #fff; }
                .volante { 
                  box-shadow: none; 
                  border: 2px solid #e2e8f0; 
                  margin-bottom: 15px; 
                  break-inside: avoid;
                }
                .volante::before {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .tag-sin-nota, .tag-np, .asig-title {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
        `;

        estudiantesPend.forEach(item => {
          printHtml += `<div class="volante">
            <div class="header">
              <img src="https://pmfrdrihzdhhjxokabjm.supabase.co/storage/v1/object/public/assets/andresanbordes.png" class="logo-img logo-left" alt="Logo Andrésán">
              
              <div class="header-title">
                <h2>INFORME CUALITATIVO</h2>
                <p>Actividades Pendientes</p>
              </div>

              <img src="https://txnecdeccianklqqyrav.supabase.co/storage/v1/object/public/assets/Escudo%20liceo.png" class="logo-img logo-right" alt="Logo Institución">
            </div>
            
            <div class="student-card">
              <div class="student-info">
                <div class="student-name">${item.est.nombre_completo}</div>
                <div class="student-meta">Grado: <strong>${gPend}</strong> &nbsp;|&nbsp; Periodo: <strong>${periodo} (${anio})</strong></div>
              </div>
              <div class="student-info" style="text-align: right;">
                <div class="student-meta" style="margin-bottom: 2px;">Total Pendientes</div>
                <div style="font-size: 16px; font-weight: 800; color: #ef4444;">${item.total}</div>
              </div>
            </div>

            <div class="message">
              Estimado padre de familia y/o acudiente:
Le informamos que su acudido tiene actividades pendientes de entrega o registradas con calificación en cero (NP). Es indispensable su acompañamiento inmediato para que estas sean presentadas en el menor tiempo posible y evitar afectaciones en su desempeño académico.
            </div>
          `;

          item.pendsPorAsig.forEach(p => {
            printHtml += `<div class="asig-block">
              <div class="asig-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                ${p.asig.nombre}
              </div>
              <ul class="act-list">`;
            p.actsP.forEach(a => {
              const label = a.tipo === 'np' ? '<span class="tag tag-np">NP (0)</span>' : '<span class="tag tag-sin-nota">Sin Nota</span>';
              printHtml += `<li class="act-item">
                <span>${a.act.nombre}</span>
                ${label}
              </li>`;
            });
            printHtml += `</ul></div>`;
          });

          printHtml += `
            <div class="footer-section">
              <div class="footer-note">Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</div>
              
              <img src="https://pmfrdrihzdhhjxokabjm.supabase.co/storage/v1/object/public/assets/andresanbordes.png" style="height: 35px; object-fit: contain;">
            </div>
          </div>`;
        });

        printHtml += `</body></html>`;

        const printWin = window.open('', '_blank');
        printWin.document.write(printHtml);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 500);

      } catch (e) {
        alert('Error al generar impresión: ' + e.message);
      }
    }

    async function imprimirPlanillaFirmasPendientes() {
      if (!gPend) return alert('Selecciona un grado primero.');

      try {
        const ests = DB.ests.filter(e => e.grado === gPend).sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
        const asigs = DB.asigs.filter(a => a.grado === gPend);
        const actIds = [];
        const actsByAsig = {};
        asigs.forEach(asig => {
          const acts = DB.acts.filter(a => a.asignatura_id === asig.id);
          actsByAsig[asig.id] = acts;
          acts.forEach(a => actIds.push(a.id));
        });

        if (!actIds.length) return alert('No hay actividades para el grado ' + gPend);

        const { data: notas, error } = await sb.from('notas').select('estudiante_id, actividad_id, valor').in('actividad_id', actIds).eq('año', anio).eq('periodo', periodo);
        if (error) throw error;

        const nMap = {};
        (notas || []).forEach(n => { nMap[`${n.estudiante_id}_${n.actividad_id}`] = Number(n.valor); });

        const estudiantesPend = ests.map(est => {
          let total = 0;
          asigs.forEach(asig => {
            const acts = actsByAsig[asig.id] || [];
            acts.forEach(act => {
              const val = nMap[`${est.id}_${act.id}`];
              if (val === undefined || val === null || val === 0) total++;
            });
          });
          return { est, total };
        }).filter(e => e.total > 0);

        if (!estudiantesPend.length) return alert('No hay estudiantes con pendientes en el grado ' + gPend);

        let printHtml = `
          <html>
          <head>
            <title>Planilla Firmas Pendientes - ${gPend}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                padding: 20px; 
                color: #1f2937; 
                background-color: #fff; 
                margin: 0; 
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 10px;
              }
              .header h2 { margin: 0; color: #111827; font-size: 20px; font-weight: 800; }
              .header p { margin: 4px 0 0 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 10px;
                text-align: left;
                font-size: 13px;
              }
              th {
                background-color: #f3f4f6;
                font-weight: 700;
                color: #374151;
              }
              tr:nth-child(even) { background-color: #f9fafb; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Planilla de Control de Actividades Pendientes</h2>
              <p>Grado: ${gPend} | Año: ${anio} | Periodo: ${periodo}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:5%;text-align:center">No.</th>
                  <th style="width:40%">Estudiante</th>
                  <th style="width:15%;text-align:center">Act. Pendientes</th>
                  <th style="width:40%">Firma Padre/Acudiente</th>
                </tr>
              </thead>
              <tbody>
        `;

        estudiantesPend.forEach((item, index) => {
          printHtml += `
                <tr>
                  <td style="text-align:center">${index + 1}</td>
                  <td style="font-weight:600">${item.est.nombre_completo}</td>
                  <td style="text-align:center;font-weight:700;color:#dc2626">${item.total}</td>
                  <td></td>
                </tr>
          `;
        });

        printHtml += `
              </tbody>
            </table>
            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280;">
              <div>Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</div>
              <div>Control Notas - Profesor Andresan</div>
            </div>
          </body>
          </html>
        `;

        const printWin = window.open('', '_blank');
        printWin.document.write(printHtml);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 500);
      } catch (e) {
        alert('Error al generar impresión: ' + e.message);
      }
    }



    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
          console.log('SW registrado con éxito');

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nueva actualización disponible. El Service Worker tomará el control.');
              }
            });
          });
        }).catch(err => {
          console.error('Error al registrar SW:', err);
        });
      });

      // Recargar la página automáticamente cuando el nuevo Service Worker toma el control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  