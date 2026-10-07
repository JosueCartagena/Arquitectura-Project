/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Inspector.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #11 Inspector de memoria y edicion en vivo.
 *
 * Dos funcionalidades:
 *   1) EDICION EN VIVO: escribir directamente sobre una celda de la
 *      cuadricula de memoria (G6:V21) cambia esa direccion de memoria,
 *      sin tener que recargar ni reensamblar el programa.
 *   2) INSPECTOR: un dialogo que, dada una direccion, muestra su valor
 *      en hex / binario / decimal (con y sin signo) y como se veria si
 *      se interpretara como una instruccion.
 *
 * La edicion en vivo se implementa con onEdit(e), un "trigger simple" de
 * Apps Script: se instala solo (no hace falta configurar nada en
 * Activadores) en cuanto este archivo existe en el proyecto, siempre que
 * no haya otra funcion onEdit en otro archivo del mismo proyecto.
 */

// Interpreta lo que el usuario escribio sobre una celda de memoria:
// admite hex ("0xFF"), decimal ("255") o vacio (-> 0). Devuelve null si
// no es un numero valido de 8 bits (0-255).
// [Tarjeta #11 Inspector - interpreta lo escrito (hex o decimal)]
function parseMemoryInput_(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  var s = String(raw).trim();
  var n;
  if (/^0x[0-9a-fA-F]+$/.test(s)) n = parseInt(s, 16);
  else if (/^-?\d+$/.test(s)) n = parseInt(s, 10);
  else return null;
  if (isNaN(n) || n < 0 || n > 255) return null;
  return n;
}

// [Tarjeta #11 Edicion en vivo - cambia la memoria al editar una celda de la cuadricula]
function onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;

    var row = range.getRow(), col = range.getColumn();
    // La cuadricula de memoria ocupa filas 6-21, columnas 7-22 (G6:V21).
    if (row < 6 || row > 21 || col < 7 || col > 22) return;
    if (range.getNumRows() > 1 || range.getNumColumns() > 1) return;   // solo edicion de 1 celda (las cargas masivas usan setValues en bloque)

    var address = (row - 6) * 16 + (col - 7);
    var parsed = parseMemoryInput_(e.value);
    var state = loadState();

    if (parsed === null) {
      SpreadsheetApp.getUi().alert(
        'Valor invalido para memoria[0x' + toHex2(address) + ']: "' + e.value + '".\n' +
        'Usa un numero entre 0 y 255 (decimal o hex, ej. 0xFF). Se revierte al valor anterior.'
      );
      range.setValue('0x' + toHex2(state.Mem[address]));
      return;
    }

    state.Mem[address] = parsed & 0xFF;
    var canonical = '0x' + toHex2(parsed);
    // Solo reescribe la celda si hace falta normalizar el formato (p.ej. el
    // usuario escribio "5" y se lo deja como "0x05"). Si ya esta en formato
    // canonico no se vuelve a llamar setValue(), para no disparar este mismo
    // onEdit de nuevo con el mismo valor (onEdit SI se dispara con ediciones
    // hechas por el propio script, y sin esta guarda se recursaria sin fin).
    if (String(e.value).trim() !== canonical) {
      range.setValue(canonical);
    }
    saveState(state);
  } catch (err) {
    // onEdit nunca debe dejar una excepcion sin atrapar a mitad de una
    // edicion del usuario (eso puede dejar la hoja en un estado raro).
  }
}

// Menu "Inspeccionar celda de memoria...": pide una direccion y muestra
// su contenido interpretado de todas las formas relevantes.
// [Tarjeta #11 Inspector - muestra una direccion en hex, binario y decimal]
function inspectMemoryCellPrompt() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt(
    'Inspeccionar celda de memoria',
    'Direccion a inspeccionar (0-255; admite "0xFF" o "255"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  var addr = parseMemoryInput_(resp.getResponseText());
  if (addr === null) {
    ui.alert('Direccion invalida. Usa un numero entre 0 y 255.');
    return;
  }

  var state = loadState();
  var val = state.Mem[addr];
  var signed = val > 127 ? val - 256 : val;
  var bin = ('00000000' + val.toString(2)).slice(-8);

  var len = instrLength(val);
  var op1 = len >= 2 ? state.Mem[(addr + 1) & 0xFF] : 0;
  var op2 = len >= 3 ? state.Mem[(addr + 2) & 0xFF] : 0;
  var asInstr = mnemonic(val, op1, op2);

  ui.alert(
    'Memoria[0x' + toHex2(addr) + ']  (direccion ' + addr + ' decimal)\n' +
    '--------------------------------------------\n' +
    'Hexadecimal:          0x' + toHex2(val) + '\n' +
    'Binario:               ' + bin + '\n' +
    'Decimal SIN signo:     ' + val + '\n' +
    'Decimal CON signo:     ' + signed + '\n\n' +
    'Si este byte se leyera como una instruccion (opcode + los 1-2\n' +
    'bytes siguientes), se interpretaria como:\n' +
    '  ' + asInstr + '\n\n' +
    'Tip: tambien podes escribir un nuevo valor directamente sobre la\n' +
    'celda correspondiente en la cuadricula de memoria -- se guarda solo.'
  );
}
