/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Datapath.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #6 Botones y visual: diagrama de bloques interactivo y Run Lento.
 *   #7 Bandera OF: caja OF en el diagrama.
 *
 * Diagrama de bloques (Unidad de Control / ALU / Memoria) que el usuario
 * dibujo a mano en la hoja CPU_SIMULATOR (cajas y bordes de celda), a la
 * derecha del log. Este archivo NO dibuja cajas ni flechas -- eso ya esta
 * hecho -- solo:
 *   1) localiza automaticamente los cuadros de valor vacios que quedaron
 *      junto a cada etiqueta (Cont Programa, Decodificador, R. Instrucciones,
 *      Fetch/Decode/Execute/Store, Ciclos, Acumulador, R.Entrada, ZF/CF/SF,
 *      R.Direcciones, R. Datos, Tabla de Memoria) y escribe en ellos una
 *      formula que los conecta a los registros reales (B5..B18): los
 *      valores se actualizan solos, sin codigo adicional.
 *   2) en cada STEP (y en RUN LENTO) colorea los cuadros que estan activos
 *      en la fase actual, reutilizando PHASE_COLORS / COLOR_REG_ACTIVE.
 *
 * Ejecutar UNA sola vez a mano desde el editor: setupDatapathDiagram().
 * Si el usuario mueve o rehace alguna caja, se vuelve a ejecutar y listo.
 */

var DATAPATH_CELLS_KEY = 'DATAPATH_CELLS';

// Cuantas filas de la "Tabla de Memoria" del diagrama se llenan, y desde
// que direccion. Se muestra el segmento de datos (80h en adelante), que es
// donde vive N y el resultado en el programa de ejemplo.
var DATAPATH_MEM_START = 0x80;
var DATAPATH_MEM_ROWS = 8;

// [Tarjeta #6 Botones y visual - normaliza etiquetas del diagrama]
function dpNorm_(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Etiquetas esperadas -> { key, dir }. "dir" indica donde esta el cuadro
// vacio respecto de la etiqueta: 'above' (fila de arriba, misma columna),
// 'below' (fila de abajo, misma columna) o 'right' (misma fila, columna
// siguiente). Confirmado visualmente contra el diseno del usuario.
var DATAPATH_LABELS_ = {
  'contprograma':   { key: 'PC',      dir: 'above' },
  'decodificador':  { key: 'DECOD',   dir: 'above' },
  'rinstrucciones': { key: 'IR',      dir: 'above' },
  'fetch':          { key: 'FETCH',   dir: 'right' },
  'decode':         { key: 'DECODE',  dir: 'right' },
  'execute':        { key: 'EXECUTE', dir: 'right' },
  'store':          { key: 'STORE',   dir: 'right' },
  'ciclos':         { key: 'CICLOS',  dir: 'right' },
  'acumulador':     { key: 'AX',      dir: 'below' },
  'rentrada':       { key: 'BX',      dir: 'below' },
  'zf':             { key: 'ZF',      dir: 'below' },
  'cf':             { key: 'CF',      dir: 'below' },
  'sf':             { key: 'SF',      dir: 'below' },
  'of':             { key: 'OF',      dir: 'below' },
  'rdirecciones':   { key: 'MAR',     dir: 'below' },
  'rdatos':         { key: 'MDR',     dir: 'below' },
  'dir':            { key: 'MEMHDR_DIR',  dir: 'here' },
  'contenido':      { key: 'MEMHDR_CONT', dir: 'here' }
};

// Localiza las cajas del diagrama y escribe en cada cuadro vacio una
// formula que lo conecta al registro real correspondiente. Guarda el mapa
// de direcciones en las Propiedades del Documento para que refreshDatapath()
// no tenga que volver a buscar en cada STEP.
// [Tarjeta #6 Botones y visual - conecta el diagrama con los registros]
function setupDatapathDiagram() {
  var sheet = getSheet();

  var startRow = 20, startCol = 10;
  var numRows = 90, numCols = 55;
  var values = sheet.getRange(startRow, startCol, numRows, numCols).getValues();

  var found = {};
  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      var raw = values[r][c];
      if (raw === '' || raw === null) continue;
      var n = dpNorm_(raw);
      var cfg = DATAPATH_LABELS_[n];
      if (!cfg || found[cfg.key]) continue;   // ya encontrado antes: se queda con el primero

      var labelRow = startRow + r;
      var labelCol = startCol + c;
      var boxRow = labelRow, boxCol = labelCol;
      if (cfg.dir === 'above') boxRow = labelRow - 1;
      else if (cfg.dir === 'below') boxRow = labelRow + 1;
      else if (cfg.dir === 'right') boxCol = labelCol + 1;

      found[cfg.key] = { row: boxRow, col: boxCol };
    }
  }

  var required = ['PC', 'DECOD', 'IR', 'FETCH', 'DECODE', 'EXECUTE', 'STORE',
    'CICLOS', 'AX', 'BX', 'ZF', 'CF', 'SF', 'OF', 'MAR', 'MDR'];
  var missing = required.filter(function (k) { return !found[k]; });

  function setF(key, formula) {
    if (!found[key]) return;
    sheet.getRange(found[key].row, found[key].col).setFormula(formula).setHorizontalAlignment('center');
  }
  setF('PC', '=$B$5');
  setF('IR', '=$B$6');
  setF('DECOD', '=$B$6');
  setF('MAR', '=$B$7');
  setF('MDR', '=$B$8');
  setF('AX', '=$B$9');
  setF('BX', '=$B$10');
  setF('ZF', '=$B$13');
  setF('CF', '=$B$14');
  setF('SF', '=$B$15');
  setF('OF', '=$B$16');
  setF('CICLOS', '=$B$18');
  setF('FETCH', '=IF($B$17="FETCH","O","")');
  setF('DECODE', '=IF($B$17="DECODE","O","")');
  setF('EXECUTE', '=IF($B$17="EXECUTE","O","")');
  setF('STORE', '=IF($B$17="STORE","O","")');
  ['FETCH', 'DECODE', 'EXECUTE', 'STORE'].forEach(function (k) {
    if (found[k]) sheet.getRange(found[k].row, found[k].col).setFontWeight('bold');
  });

  // --- Tabla de memoria: Dir (fijo) + Contenido (formula al cuadro real) ---
  if (found.MEMHDR_DIR) {
    var hdrRow = found.MEMHDR_DIR.row, dirCol = found.MEMHDR_DIR.col;
    var contCol = found.MEMHDR_CONT ? found.MEMHDR_CONT.col : dirCol + 1;
    var memRows = [];
    for (var i = 0; i < DATAPATH_MEM_ROWS; i++) {
      var addr = DATAPATH_MEM_START + i;
      var row = hdrRow + 1 + i;
      sheet.getRange(row, dirCol).setValue('0x' + toHex2(addr)).setHorizontalAlignment('center');
      var memCell = memCellRange(sheet, addr);
      sheet.getRange(row, contCol).setFormula('=' + memCell.getA1Notation()).setHorizontalAlignment('center');
      memRows.push(row);
    }
    found.MEMTABLE = { dirCol: dirCol, contCol: contCol, rows: memRows };
  }
  delete found.MEMHDR_DIR;
  delete found.MEMHDR_CONT;

  PropertiesService.getDocumentProperties().setProperty(DATAPATH_CELLS_KEY, JSON.stringify(found));

  try {
    SpreadsheetApp.getUi().alert(
      missing.length > 0
        ? 'Diagrama conectado con lo que se encontro. Cuadros que NO se encontraron (revisa el texto de su etiqueta): ' + missing.join(', ')
        : 'Diagrama conectado correctamente: los cuadros ya muestran los valores reales y se van a colorear en cada STEP.'
    );
  } catch (e) { /* ejecutado desde el editor: no hay UI que mostrar */ }
}

// Colorea (resalta) los cuadros del diagrama segun la fase actual, con el
// mismo mapa de colores que ya usa el log y la celda "FASE ACTUAL". Se
// salta por completo en modo Instant (RUN), igual que el resto de
// funciones de pintado: solo tiene sentido verlo con STEP o RUN LENTO.
// [Tarjeta #6 Botones y visual - ilumina las cajas de la fase activa]
function refreshDatapath(sheet, state) {
  if (state && state.Instant) return;

  var json = PropertiesService.getDocumentProperties().getProperty(DATAPATH_CELLS_KEY);
  if (!json) return;   // setupDatapathDiagram() todavia no se ejecuto
  var cells = JSON.parse(json);

  var fname = phaseName(state);

  var activeByPhase = {
    FETCH: ['PC', 'MAR', 'MDR', 'IR'],
    DECODE: ['IR', 'DECOD'],
    EXECUTE: ['AX', 'BX', 'ZF', 'CF', 'SF', 'OF'],
    STORE: (state.IR_Opcode === 0x04) ? ['MAR', 'MDR'] : [],
    HALT: []
  };
  var active = activeByPhase[fname] || [];

  var allKeys = ['PC', 'DECOD', 'IR', 'MAR', 'MDR', 'AX', 'BX', 'ZF', 'CF', 'SF', 'OF'];
  allKeys.forEach(function (key) {
    if (!cells[key]) return;
    var isActive = active.indexOf(key) >= 0;
    sheet.getRange(cells[key].row, cells[key].col).setBackground(isActive ? COLOR_REG_ACTIVE : null);
  });

  ['FETCH', 'DECODE', 'EXECUTE', 'STORE'].forEach(function (key) {
    if (!cells[key]) return;
    sheet.getRange(cells[key].row, cells[key].col).setBackground(key === fname ? PHASE_COLORS[key] : null);
  });
}

// ---------- Modo RUN LENTO (demostrativo, 1 seg por fase) ----------
// A diferencia de runProgram() (instantaneo), esta version SI pinta la
// hoja y hace flush() despues de CADA fase, con una pausa de 1 segundo, asi
// se puede ver el diagrama (y el resto del panel) animarse en vivo durante
// una exposicion. Se puede detener a mitad de camino con PAUSE
// (pauseProgram), que escribe una bandera que este bucle revisa entre fase
// y fase.
// [Tarjeta #6 Botones y visual - Run Lento (1 s por fase)]
function runProgramSlow() {
  var sheet = getSheet();
  var state = loadState();

  if (state.Halted) {
    SpreadsheetApp.getUi().alert('La CPU esta detenida (HLT). Usa LOAD PROGRAM para reiniciar.');
    return;
  }

  var props = PropertiesService.getDocumentProperties();
  props.setProperty(PAUSE_KEY, 'false');

  var phases = [fetchPhase, decodePhase, executePhase, storeBackPhase];
  var MAX_CYCLES = 5000;
  var cycles = 0;

  while (!state.Halted && cycles < MAX_CYCLES) {
    for (var i = 0; i < phases.length; i++) {
      phases[i](sheet, state);
      refreshRegisters(sheet, state);
      refreshDatapath(sheet, state);
      SpreadsheetApp.flush();
      Utilities.sleep(1000);

      if (props.getProperty(PAUSE_KEY) === 'true') {
        logMicroOp(sheet, state, '--- RUN LENTO detenido manualmente (PAUSE) ---', 'SYSTEM');
        saveState(state);
        SpreadsheetApp.flush();
        return;
      }
    }
    cycles++;
  }

  if (!state.Halted && cycles >= MAX_CYCLES) {
    logMicroOp(sheet, state, '--- Limite de seguridad (' + MAX_CYCLES + ' ciclos) alcanzado: revisa si el programa tiene un bucle infinito ---', 'SYSTEM');
  }
  if (state.Halted) {
    logMicroOp(sheet, state, '--- Programa finalizado (HLT) tras ' + state.StepCounter + ' ciclos de instruccion ---', 'SYSTEM');
  }

  refreshRegisters(sheet, state);
  refreshDatapath(sheet, state);
  saveState(state);
  SpreadsheetApp.flush();
}
