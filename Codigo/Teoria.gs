/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Teoria.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #14 Hoja "Teoria": equivalencias entre los nombres de la lamina y los del simulador.
 *
 * Construye una hoja "TEORIA" nueva que traduce explicitamente los
 * nombres que se usan en las laminas de clase de SIS131 (en español,
 * algunos abreviados distinto: RDM, RIM) a los nombres tecnicos en
 * ingles que usa el simulador (MAR, MDR, IR...). Sin esto, alguien que solo vio los nombres de la lamina
 * puede no reconocer el simulador como "lo mismo" a simple vista.
 *
 * Ejecutar UNA sola vez: buildTeoriaSheet() (tambien esta en el menu
 * "CPU Simulador").
 */

// [Tarjeta #14 Hoja Teoria - construye la hoja de equivalencias]
function buildTeoriaSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName('TEORIA');
  if (existing) ss.deleteSheet(existing);

  var sheet = ss.insertSheet('TEORIA');
  sheet.setTabColor('#6aa84f');

  sheet.getRange('A1').setValue('TEORIA: de la lamina de clase al simulador')
    .setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('SIS131 - Arquitectura de Computadoras. Equivalencias de nombres y conceptos.');

  // ---------------- Tabla de equivalencias de registros ----------------
  var header = ['Nombre en la lamina (ES)', 'Nombre en el simulador (EN)', 'Que guarda', 'Fase en la que se usa'];
  var rows = [
    ['Contador de Programa (CP)', 'PC (Program Counter)', 'La direccion de memoria de la SIGUIENTE instruccion a ejecutar.', 'FETCH (se lee y se actualiza)'],
    ['Registro de Instruccion (RI)', 'IR (Instruction Register)', 'La instruccion que se acaba de traer de memoria (opcode + operandos).', 'FETCH (se escribe) / DECODE (se lee)'],
    ['Registro de Direcciones de Memoria (RDM)', 'MAR (Memory Address Register)', 'La direccion de memoria que se va a leer o escribir en este momento.', 'FETCH, LOAD, STORE'],
    ['Registro Intermedio de Memoria (RIM)', 'MDR (Memory Data Register)', 'El dato que entra o sale de memoria por esa direccion (el "contenido" de RDM/MAR).', 'FETCH, LOAD, STORE'],
    ['Acumulador (AC)', 'AX', 'Registro de proposito general: casi todas las operaciones de la ALU lo usan.', 'EXECUTE'],
    ['Registro auxiliar / Entrada', 'BX', 'Segundo registro de proposito general (el simulador solo tiene 2).', 'EXECUTE'],
    ['Decodificador de instrucciones', 'decodePhase() en Control.gs', 'El paso que interpreta el opcode guardado en IR y decide que hacer en EXECUTE.', 'DECODE'],
    ['Unidad Aritmetico-Logica (UAL)', 'ALU (ALU.gs)', 'El circuito que hace las operaciones aritmeticas/logicas (ADD, SUB, AND, ...).', 'EXECUTE'],
    ['Unidad de Control (UC)', 'Control.gs (fetchPhase/decodePhase/executePhase/storeBackPhase)', 'El circuito que orquesta las 4 fases del ciclo de instruccion.', 'Las 4 fases'],
    ['Bandera de Cero', 'ZF (Zero Flag)', '1 si el ultimo resultado de la ALU fue exactamente 0.', 'EXECUTE'],
    ['Bandera de Acarreo', 'CF (Carry Flag)', '1 si una suma se paso de 255 o una resta pidio prestado (resultado negativo antes de truncar).', 'EXECUTE'],
    ['Bandera de Signo', 'SF (Sign Flag)', '1 si el bit mas significativo (bit 7) del resultado quedo en 1 (se "ve" negativo en complemento a 2).', 'EXECUTE'],
    ['Bandera de Desbordamiento', 'OF (Overflow Flag)', '1 si el resultado, interpretado CON signo, se salio del rango representable en 8 bits (-128 a 127).', 'EXECUTE']
  ];

  sheet.getRange(4, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange(5, 1, rows.length, header.length).setValues(rows).setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(3, 340);
  sheet.setColumnWidth(4, 220);
  for (var r = 0; r < rows.length; r++) sheet.setRowHeight(5 + r, 46);

  // ---------------- Ciclo de instruccion: nombres equivalentes ----------------
  var baseRow = 5 + rows.length + 2;
  sheet.getRange(baseRow, 1).setValue('CICLO DE INSTRUCCION: 4 fases (Von Neumann)').setFontWeight('bold');
  var ciclo = [
    ['1. BUSCAR (Fetch)', 'fetchPhase()', 'PC -> MAR, leer memoria[MAR] -> MDR -> IR, PC = PC + (bytes de la instruccion).'],
    ['2. DECODIFICAR (Decode)', 'decodePhase()', 'Se interpreta el opcode guardado en IR para saber que microoperaciones siguen.'],
    ['3. EJECUTAR (Execute)', 'executePhase()', 'La ALU (o la logica de salto) hace la operacion indicada; se actualizan las banderas.'],
    ['4. ALMACENAR (Store / Write-back)', 'storeBackPhase()', 'Si la instruccion escribe en memoria (STORE), se hace aqui; si no, esta fase no hace nada visible.']
  ];
  sheet.getRange(baseRow + 1, 1, 1, 3).setValues([['Fase (nombre de clase)', 'Funcion en el codigo', 'Que hace']]).setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange(baseRow + 2, 1, ciclo.length, 3).setValues(ciclo).setWrap(true).setVerticalAlignment('top');
  for (var c = 0; c < ciclo.length; c++) sheet.setRowHeight(baseRow + 2 + c, 40);

  // ---------------- Arquitectura: Von Neumann ----------------
  var baseRow2 = baseRow + 2 + ciclo.length + 2;
  sheet.getRange(baseRow2, 1).setValue('ARQUITECTURA DE VON NEUMANN').setFontWeight('bold');
  sheet.getRange(baseRow2 + 1, 1, 1, 2).setValues([['Von Neumann', 'Harvard (para contraste)']]).setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange(baseRow2 + 2, 1, 1, 2).setValues([[
    'UNA sola memoria (array Mem[256]) guarda tanto el codigo (00h-7Fh) como los datos (80h-FFh). Es lo que hace el simulador.',
    'El codigo y los datos viven en memorias FISICAMENTE separadas, cada una con su propio bus. El simulador NO implementa esto.'
  ]]).setWrap(true).setVerticalAlignment('top');
  sheet.setRowHeight(baseRow2 + 2, 70);

  try {
    SpreadsheetApp.getUi().alert('Hoja "TEORIA" creada con la tabla de equivalencias (registros, ciclo de instruccion, Von Neumann).');
  } catch (e) { /* ejecutado desde el editor: no hay UI que mostrar */ }
}
