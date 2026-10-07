/**
 * SIMULADOR DE CPU 8 BITS - ARQUITECTURA VON NEUMANN
 * Archivo: Code.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #2 Memoria y Registros: estado de la CPU (PC, MAR, MDR, IR, AX, BX, banderas), memoria de 256 bytes y su cuadricula en la hoja.
 *   #4 Ciclo de instruccion: log de micro-operaciones y explicacion sencilla de cada fase.
 *   #7 Bandera OF: OF forma parte del estado y del panel de banderas (celda B16).
 *
 * Constantes globales, estado persistente del simulador (via PropertiesService,
 * ya que Apps Script no mantiene variables globales entre ejecuciones separadas
 * de cada boton), operaciones primitivas de memoria y utilidades de refresco
 * visual de la hoja.
 *
 * NOTA DE RENDIMIENTO: toda escritura a la cuadricula de memoria (256 celdas)
 * se hace con UNA sola llamada a setValues()/setBackgrounds() en vez de 256
 * llamadas individuales a setValue()/setBackground(). Escribir celda por celda
 * es la causa mas comun de lentitud extrema en Apps Script sobre Sheets:
 * cada llamada individual tiene un costo fijo alto, asi que 256 llamadas por
 * ciclo (mas otras 256 para los colores de fondo) hacian que cada paso de
 * instruccion tardara varios segundos en vez de milisegundos.
 */

var SHEET_NAME = 'CPU_SIMULATOR';
var CODE_START = 0x00;
var CODE_END = 0x7F;
var DATA_START = 0x80;
var DATA_END = 0xFF;

var STATE_KEY = 'CPU_STATE';
var PAUSE_KEY = 'PAUSE_FLAG';

var COLOR_CODE_SEG = '#d6e8ff';
var COLOR_DATA_SEG = '#fff4d6';
var COLOR_ACTIVE_CELL = '#78d678';
var COLOR_REG_ACTIVE = '#ffdd57';

// Colores por fase: se usan tanto para pintar el indicador "FASE ACTUAL"
// como el fondo de cada linea del log, para que el ojo pueda seguir el
// ciclo Fetch -> Decode -> Execute -> Store de un vistazo, sin leer texto.
var PHASE_COLORS = {
  FETCH:   '#cfe2ff',   // azul   - se busca la instruccion en memoria
  DECODE:  '#e5d4f5',   // violeta- se interpreta el opcode
  EXECUTE: '#ffe2b8',   // naranja- se realiza la operacion en la ALU
  STORE:   '#c9f2d8',   // verde  - se escribe el resultado (si aplica)
  HALT:    '#f4a6a6',   // rojo   - CPU detenida
  SYSTEM:  '#eeeeee'    // gris   - mensajes de control (load/reset/pause)
};

// ------------------------------------------------------------------
// Estado del simulador (PC, IR, MAR, MDR, AX, BX, flags, memoria...)
// Se guarda como JSON en las Propiedades del Documento para persistir
// entre cada clic de boton (cada boton dispara una ejecucion nueva).
// ------------------------------------------------------------------

// [Tarjeta #2 Memoria y Registros - estado inicial (incluye OF)]
function getInitialState() {
  return {
    PC: 0, MAR: 0, MDR: 0,
    AX: 0, BX: 0,
    IR_Opcode: 0, IR_Op1: 0, IR_Op2: 0, IR_Text: '---',
    ZF: false, CF: false, SF: false, OF: false,
    Halted: false,
    Phase: 0,          // 0=FETCH 1=DECODE 2=EXECUTE 3=STORE
    StepCounter: 0,
    LastHighlightedAddr: -1,   // ultima celda de memoria resaltada (para limpiarla sin redibujar las 256)
    NextLogRow: 27,            // proxima fila libre del log (evita re-escanear todo el log en cada linea)
    Mem: new Array(256).fill(0)
  };
}

// [Tarjeta #2 Memoria y Registros - lee el estado guardado]
function loadState() {
  var json = PropertiesService.getDocumentProperties().getProperty(STATE_KEY);
  if (!json) return getInitialState();
  var state = JSON.parse(json);
  if (state.LastHighlightedAddr === undefined) state.LastHighlightedAddr = -1;
  if (state.NextLogRow === undefined) state.NextLogRow = 27;
  if (state.OF === undefined) state.OF = false;   // compatibilidad con un estado guardado antes de agregar OF
  return state;
}

// [Tarjeta #2 Memoria y Registros - guarda el estado]
function saveState(state) {
  PropertiesService.getDocumentProperties().setProperty(STATE_KEY, JSON.stringify(state));
}

// [Tarjeta #2 Memoria y Registros - hoja CPU_SIMULATOR]
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('No existe la hoja "' + SHEET_NAME + '". Ejecuta primero Setup > buildSheet().');
  }
  return sheet;
}

// [Tarjeta #2 Memoria y Registros - formato hexadecimal de 2 digitos]
function toHex2(n) {
  return ('0' + (n & 0xFF).toString(16).toUpperCase()).slice(-2);
}

// ------------------------------------------------------------------
// Operaciones primitivas de memoria (Read/Write) sobre el arreglo state.Mem
// ------------------------------------------------------------------

// [Tarjeta #2 Memoria y Registros - lectura de memoria]
function readMem(state, address) {
  if (address < 0 || address > 255) throw new Error('Direccion fuera de rango: ' + address);
  return state.Mem[address] & 0xFF;
}

// [Tarjeta #2 Memoria y Registros - escritura de memoria]
function writeMem(state, address, value) {
  if (address < 0 || address > 255) throw new Error('Direccion fuera de rango: ' + address);
  state.Mem[address] = value & 0xFF;
}

// ------------------------------------------------------------------
// Refresco visual: cuadricula de memoria 16x16 (origen en G6) y registros
// ------------------------------------------------------------------

// [Tarjeta #2 Memoria y Registros - celda de la cuadricula para una direccion]
function memCellRange(sheet, address) {
  var row = 6 + Math.floor(address / 16);
  var col = 7 + (address % 16);
  return sheet.getRange(row, col);
}

// [Tarjeta #2 Memoria y Registros - rango completo de la cuadricula]
function memGridRange(sheet) {
  return sheet.getRange(6, 7, 16, 16);   // G6:V21 -> las 256 celdas de una sola vez
}

// Actualiza SOLO una celda (usado tras un STORE puntual: mucho mas barato
// que redibujar toda la cuadricula).
// [Tarjeta #2 Memoria y Registros - repinta una celda]
function refreshMemoryCell(sheet, state, address) {
  if (state && state.Instant) return;   // en modo Instant, refreshAllMemory() lo hace al final
  memCellRange(sheet, address).setValue('0x' + toHex2(state.Mem[address]));
}

// Redibuja toda la memoria en UNA sola llamada a setValues() (antes: 256
// llamadas individuales a setValue(), una por celda).
// [Tarjeta #2 Memoria y Registros - repinta toda la memoria]
function refreshAllMemory(sheet, state) {
  var values = [];
  for (var r = 0; r < 16; r++) {
    var row = [];
    for (var c = 0; c < 16; c++) {
      row.push('0x' + toHex2(state.Mem[r * 16 + c]));
    }
    values.push(row);
  }
  memGridRange(sheet).setValues(values);
}

// [Tarjeta #4 Ciclo de instruccion - nombre de la fase]
function phaseName(state) {
  if (state.Halted) return 'HALT';
  switch (state.Phase) {
    case 0: return 'FETCH';
    case 1: return 'DECODE';
    case 2: return 'EXECUTE';
    case 3: return 'STORE';
    default: return '?';
  }
}

// [Tarjeta #2 Memoria y Registros / #7 Bandera OF - panel de registros y banderas]
function refreshRegisters(sheet, state) {
  // En modo Instant (RUN calculando todo el programa en memoria) no se
  // pinta nada hasta el final: evita cientos de idas y vueltas a Sheets.
  if (state && state.Instant) return;

  // Registros principales en un solo setValues() (antes: 6 llamadas sueltas)
  sheet.getRange('B5:B10').setValues([
    ['0x' + toHex2(state.PC)],
    [state.IR_Text],
    ['0x' + toHex2(state.MAR)],
    ['0x' + toHex2(state.MDR)],
    ['0x' + toHex2(state.AX) + '  (' + state.AX + 'd)'],
    ['0x' + toHex2(state.BX) + '  (' + state.BX + 'd)']
  ]);
  // Banderas en un solo setValues() (antes: 3 llamadas sueltas; ahora 4 con OF)
  sheet.getRange('B13:B16').setValues([
    [state.ZF ? 1 : 0],
    [state.CF ? 1 : 0],
    [state.SF ? 1 : 0],
    [state.OF ? 1 : 0]
  ]);

  var fname = phaseName(state);
  var faseCell = sheet.getRange('B17');
  faseCell.setValue(fname);
  faseCell.setFontWeight('bold');
  faseCell.setBackground(PHASE_COLORS[fname] || null);   // color = lectura instantanea del estado
  sheet.getRange('B18').setValue(state.StepCounter);
}

// ------------------------------------------------------------------
// Resaltado visual de registros/celdas activas y log de micro-operaciones
// ------------------------------------------------------------------

// [Tarjeta #6 Botones y visual - resalta un registro]
function highlightRegister(sheet, state, a1) {
  if (state && state.Instant) return;   // modo Instant: no se pinta nada hasta el final
  sheet.getRange(a1).setBackground(COLOR_REG_ACTIVE);   // amarillo = registro activo
}

// Resalta una celda de memoria en verde y recuerda cual fue, para poder
// limpiar SOLO esa celda despues (en vez de repintar las 256).
// [Tarjeta #6 Botones y visual - resalta una celda de memoria]
function highlightMemoryCell(sheet, state, address) {
  if (!(state && state.Instant)) {
    memCellRange(sheet, address).setBackground(COLOR_ACTIVE_CELL);
  }
  state.LastHighlightedAddr = address;   // se sigue registrando aunque sea Instant, para el resaltado final
}

// Devuelve la celda de memoria resaltada a su color de segmento normal
// (azul = codigo, amarillo = datos) SIN tocar las otras 255 celdas.
// [Tarjeta #6 Botones y visual - quita el resalte de memoria]
function clearMemoryHighlight(sheet, state) {
  if (state.LastHighlightedAddr !== undefined && state.LastHighlightedAddr !== null && state.LastHighlightedAddr >= 0) {
    if (!(state && state.Instant)) {
      var addr = state.LastHighlightedAddr;
      memCellRange(sheet, addr).setBackground(addr <= CODE_END ? COLOR_CODE_SEG : COLOR_DATA_SEG);
    }
    state.LastHighlightedAddr = -1;
  }
}

// Limpia los resaltados de registros (no toca la memoria: eso lo hace
// clearMemoryHighlight, que es mas barato que redibujar todo).
// [Tarjeta #6 Botones y visual - quita el resalte de registros]
function clearRegisterHighlights(sheet, state) {
  if (state && state.Instant) return;
  ['B6', 'B7', 'B8', 'B9', 'B10'].forEach(function (a1) {
    sheet.getRange(a1).setBackground(null);
  });
}

// Redibuja los colores de segmento (azul/amarillo) de toda la cuadricula
// en UNA sola llamada a setBackgrounds() (antes: 256 llamadas individuales
// a setBackground(), una por celda). Solo se usa al cargar/reiniciar el
// programa, NUNCA en cada ciclo de instruccion.
// [Tarjeta #6 Botones y visual - colores de codigo (azul) y datos (amarillo)]
function colorizeMemorySegments(sheet) {
  var colors = [];
  for (var r = 0; r < 16; r++) {
    var row = [];
    for (var c = 0; c < 16; c++) {
      var addr = r * 16 + c;
      row.push(addr <= CODE_END ? COLOR_CODE_SEG : COLOR_DATA_SEG);
    }
    colors.push(row);
  }
  memGridRange(sheet).setBackgrounds(colors);
}

// Escribe una linea en el LOG DE MICRO-OPERACIONES.
// - Usa state.NextLogRow en vez de re-escanear la columna A desde la fila 27
//   en cada llamada: antes, al llegar al paso 30 (~150 filas de log), CADA
//   linea nueva volvia a leer con getValue() las ~150 filas anteriores para
//   encontrar la primera vacia -> esto crecia con cada ciclo (costo O(n^2)
//   en todo el programa) y era la causa principal de que la simulacion se
//   sintiera cada vez mas lenta y se "trabara" cerca del final.
// - faseKey (opcional) colorea la fila (ver PHASE_COLORS) para poder leer
//   el log de un vistazo por colores, sin tener que leer cada texto.
// [Tarjeta #4 Ciclo de instruccion - escribe una micro-operacion en el log]
function logMicroOp(sheet, state, texto, faseKey) {
  // Modo Instant (RUN): en vez de escribir cada linea a la hoja (lo que
  // implica una ida y vuelta a Sheets por cada micro-operacion), se
  // acumula en memoria y se vuelca completo con UNA sola llamada al final
  // de runProgram(). Esto es lo que hace que RUN pase de ~180 escrituras
  // a la hoja (para un programa de 46 ciclos) a solo un puñado.
  if (state.Instant) {
    if (!state.PendingLog) state.PendingLog = [];
    state.PendingLog.push({ texto: texto, faseKey: faseKey || null });
    return;
  }

  var row = state.NextLogRow || 27;
  var cell = sheet.getRange(row, 1);
  cell.setNumberFormat('@STRING@');   // fuerza texto plano: evita que "=", "+" o "-"
  cell.setValue(texto);               // al inicio del mensaje se interpreten como formula
  cell.setBackground(faseKey && PHASE_COLORS[faseKey] ? PHASE_COLORS[faseKey] : null);
  state.NextLogRow = row + 1;
}

// Explicacion en lenguaje llano de lo que hace cada instruccion, para que
// el log no sea solo codigos hexadecimales. Se usa en la fase EXECUTE.
// [Tarjeta #4 Ciclo de instruccion - explicacion en lenguaje sencillo (incluye JC/JNC)]
function friendlyExplain(op, a, b) {
  switch (op) {
    case 0x00: return 'Detiene el reloj del procesador.';
    case 0x01: return 'Carga el valor inmediato 0x' + toHex2(b) + ' en ' + regName(a) + '.';
    case 0x02: return 'Copia el valor de ' + regName(b) + ' en ' + regName(a) + '.';
    case 0x03: return 'Carga en ' + regName(a) + ' el valor guardado en memoria[0x' + toHex2(b) + '].';
    case 0x04: return 'Guarda el valor de ' + regName(b) + ' en memoria[0x' + toHex2(a) + '] (se escribe en fase STORE).';
    case 0x05: return 'Suma 0x' + toHex2(b) + ' a ' + regName(a) + '.';
    case 0x06: return 'Suma ' + regName(b) + ' a ' + regName(a) + '.';
    case 0x07: return 'Resta 0x' + toHex2(b) + ' de ' + regName(a) + '.';
    case 0x08: return 'Resta ' + regName(b) + ' de ' + regName(a) + '.';
    case 0x09: return 'Incrementa ' + regName(a) + ' en 1.';
    case 0x0A: return 'Decrementa ' + regName(a) + ' en 1.';
    case 0x0B: return 'Compara ' + regName(a) + ' con 0x' + toHex2(b) + ' (actualiza banderas).';
    case 0x0C: return 'Compara ' + regName(a) + ' con ' + regName(b) + ' (actualiza banderas).';
    case 0x0D: return regName(a) + ' = ' + regName(a) + ' AND ' + regName(b) + '.';
    case 0x0E: return regName(a) + ' = ' + regName(a) + ' OR ' + regName(b) + '.';
    case 0x0F: return regName(a) + ' = ' + regName(a) + ' XOR ' + regName(b) + '.';
    case 0x10: return 'Invierte todos los bits de ' + regName(a) + ' (NOT).';
    case 0x11: return 'Salta siempre a la direccion 0x' + toHex2(a) + '.';
    case 0x12: return 'Si ZF=1 (resultado anterior fue cero), salta a 0x' + toHex2(a) + '.';
    case 0x13: return 'Si ZF=0 (resultado anterior NO fue cero), salta a 0x' + toHex2(a) + '.';
    case 0x14: return 'Si CF=1 (hubo acarreo/prestamo), salta a 0x' + toHex2(a) + '.';
    case 0x15: return 'Si CF=0 (NO hubo acarreo/prestamo), salta a 0x' + toHex2(a) + '.';
    default: return '';
  }
}
