/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Setup.gs
 *
 * Construye desde cero la hoja "CPU_SIMULATOR": panel de registros,
 * panel de banderas, cuadricula de memoria 16x16, panel de
 * configuracion y area de log. Se ejecuta UNA sola vez desde el editor
 * de Apps Script (seleccionar la funcion buildSheet y presionar Ejecutar).
 *
 * Los botones (STEP / RUN / PAUSE / RESET / LOAD PROGRAM) se agregan
 * DESPUES, manualmente, como Dibujos asignados a una funcion -- ver
 * docs/MANUAL_GOOGLE_SHEETS.md paso 3.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('CPU Simulador')
    .addItem('1) Construir hoja (Setup)', 'buildSheet')
    .addSeparator()
    .addItem('Load Program', 'loadDemoProgram')
    .addItem('Step', 'stepCycle')
    .addItem('Run', 'runProgram')
    .addItem('Run Lento (1s/fase)', 'runProgramSlow')
    .addItem('Pause', 'pauseProgram')
    .addItem('Reset', 'resetSimulator')
    .addSeparator()
    .addItem('Conectar Diagrama (una vez)', 'setupDatapathDiagram')
    .addToUi();
}

function buildSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName(SHEET_NAME);
  if (existing) ss.deleteSheet(existing);

  var sheet = ss.insertSheet(SHEET_NAME);
  sheet.setTabColor('#4a86e8');

  // ---------------- Titulo ----------------
  sheet.getRange('A1').setValue('SIMULADOR DE CPU 8 BITS - ARQUITECTURA VON NEUMANN')
    .setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('SIS131 - Arquitectura de Computadoras | Programa demostrativo: SUMA DE 1 A N');

  // ---------------- Panel de Registros ----------------
  sheet.getRange('A4').setValue('REGISTROS').setFontWeight('bold');
  sheet.getRange('A5').setValue('PC:');
  sheet.getRange('A6').setValue('IR:');
  sheet.getRange('A7').setValue('MAR:');
  sheet.getRange('A8').setValue('MDR:');
  sheet.getRange('A9').setValue('AX:');
  sheet.getRange('A10').setValue('BX:');
  sheet.getRange('B6:E6').merge();

  sheet.getRange('A12').setValue('FLAGS').setFontWeight('bold');
  sheet.getRange('A13').setValue('ZF:');
  sheet.getRange('A14').setValue('CF:');
  sheet.getRange('A15').setValue('SF:');

  sheet.getRange('A17').setValue('FASE ACTUAL:');
  sheet.getRange('A18').setValue('CICLOS EJECUTADOS:');

  // ---------------- Panel de configuracion ----------------
  sheet.getRange('A20').setValue('CONTROLES').setFontWeight('bold');
  sheet.getRange('A21').setValue('Velocidad RUN (ms):');
  sheet.getRange('B21').setValue(400);
  sheet.getRange('A22').setValue('N (suma 1..N):');
  sheet.getRange('B22').setValue(5).setBackground('#fff2cc');   // celda de entrada: fondo distinto para que se note que es editable
  sheet.getRange('A23').setValue('(Botones en fila 24 en adelante: Insertar > Dibujo. Ver docs/MANUAL_GOOGLE_SHEETS.md)')
    .setFontStyle('italic').setFontSize(8);

  // ---------------- Cuadricula de Memoria 16x16 (origen visual en G6) ----------------
  sheet.getRange('G4').setValue('MEMORIA PRINCIPAL (00h - FFh)').setFontWeight('bold');

  for (var c = 0; c < 16; c++) {
    sheet.getRange(5, 7 + c).setValue(c.toString(16).toUpperCase())
      .setFontWeight('bold').setHorizontalAlignment('center');
  }
  for (var r = 0; r < 16; r++) {
    sheet.getRange(6 + r, 6).setValue(('0' + (r * 16).toString(16).toUpperCase()).slice(-2) + 'h')
      .setFontWeight('bold');
  }

  for (r = 0; r < 16; r++) {
    for (c = 0; c < 16; c++) {
      var cell = sheet.getRange(6 + r, 7 + c);
      cell.setValue('0x00').setHorizontalAlignment('center').setBorder(true, true, true, true, true, true);
    }
  }
  colorizeMemorySegments(sheet);

  sheet.getRange('G23').setValue('Azul = Segmento de Codigo (00h-7Fh)     Amarillo = Segmento de Datos (80h-FFh)')
    .setFontSize(8);

  // ---------------- Log de Micro-operaciones ----------------
  sheet.getRange('A26').setValue('LOG DE MICRO-OPERACIONES').setFontWeight('bold');
  addPhaseLegend(sheet);
  sheet.getRange('A27').setValue('--- Log iniciado. Ejecuta LOAD PROGRAM para comenzar. ---').setFontSize(9);

  sheet.setColumnWidth(1, 150);
  for (var col = 2; col <= 22; col++) sheet.setColumnWidth(col, 55);

  sheet.getRange('A1').activate();

  // Escribe el estado inicial (memoria en ceros) para que la hoja sea consistente
  var state = getInitialState();
  saveState(state);
  refreshRegisters(sheet, state);

  SpreadsheetApp.getUi().alert(
    'Hoja "CPU_SIMULATOR" creada.\n\n' +
    'Siguientes pasos:\n' +
    '1) Inserta los 5 botones (Insertar > Dibujo) en la fila 24-25.\n' +
    '2) Asigna cada boton a su funcion: loadDemoProgram, stepCycle, runProgram, pauseProgram, resetSimulator.\n' +
    '3) Ejecuta "Load Program" para cargar el programa de prueba.\n\n' +
    'Tambien puedes usar el menu "CPU Simulador" de arriba mientras terminas de insertar los botones.'
  );
}

// Leyenda de colores: cada fase del ciclo (Fetch/Decode/Execute/Store) tiene
// un color fijo (ver PHASE_COLORS en Code.gs). El mismo color se usa para:
//   1) el fondo de la celda "FASE ACTUAL" (B17)  -> estado actual de un vistazo
//   2) el fondo de cada linea del log            -> se puede "leer" el log por color
//   3) esta leyenda, fija junto al titulo del log, como referencia
// Se llama desde buildSheet() (hoja nueva) y desde applyUiUpgrade() (hoja
// ya existente, para no tener que reconstruir todo desde cero).
function addPhaseLegend(sheet) {
  var legend = [
    ['FETCH', PHASE_COLORS.FETCH],
    ['DECODE', PHASE_COLORS.DECODE],
    ['EXECUTE', PHASE_COLORS.EXECUTE],
    ['STORE', PHASE_COLORS.STORE],
    ['SISTEMA', PHASE_COLORS.SYSTEM]
  ];
  for (var i = 0; i < legend.length; i++) {
    var cell = sheet.getRange(26, 3 + i);   // C26, D26, E26, F26, G26
    cell.setValue(legend[i][0])
      .setBackground(legend[i][1])
      .setFontSize(8)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false);
  }
}

// Aplica las mejoras de UI (leyenda de colores + limpieza de resaltados
// residuales) a una hoja "CPU_SIMULATOR" YA EXISTENTE, sin tener que borrar
// y reconstruir todo con buildSheet(). Se ejecuta una sola vez, a mano,
// desde el editor de Apps Script.
function applyUiUpgrade() {
  var sheet = getSheet();
  addPhaseLegend(sheet);
  clearRegisterHighlights(sheet);
  var state = loadState();
  clearMemoryHighlight(sheet, state);
  saveState(state);

  // Agrega la celda de entrada "N (suma 1..N):" a una hoja que ya existia
  // desde antes de este cambio (si ya existe, no la toca para no pisar un
  // valor que el usuario ya haya puesto).
  if (sheet.getRange('A22').getValue() === '') {
    sheet.getRange('A22').setValue('N (suma 1..N):');
    sheet.getRange('B22').setValue(5).setBackground('#fff2cc');
  }

  // getUi().alert() solo funciona cuando se dispara desde un menu/boton de
  // la hoja, no cuando se ejecuta con "Run" desde el editor de Apps Script;
  // se envuelve en try/catch para que no aparezca como error en ese caso.
  try {
    SpreadsheetApp.getUi().alert('Interfaz actualizada: leyenda de colores + celda de entrada "N".');
  } catch (e) { /* ejecutado desde el editor: no hay UI que mostrar una alerta */ }
}

// Reinicia completamente el simulador y vuelve a cargar el programa demostrativo
function resetSimulator() {
  var sheet = getSheet();

  // Este barrido SOLO se ejecuta una vez por clic en Reset (no en cada
  // ciclo de instruccion), asi que escanear fila por fila aqui es barato
  // y no tiene el problema de rendimiento que tenia logMicroOp() antes.
  var row = 27;
  while (sheet.getRange(row, 1).getValue() !== '') {
    sheet.getRange(row, 1).clearContent().setBackground(null);
    row++;
  }

  loadDemoProgram();   // reconstruye el estado (incluido NextLogRow=27) y lo guarda

  var state = loadState();
  logMicroOp(sheet, state, '--- Simulador reiniciado ---', 'SYSTEM');
  saveState(state);
}
