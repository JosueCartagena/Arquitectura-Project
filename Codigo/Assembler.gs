/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Assembler.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #10 Ensamblador de dos pasadas: etiquetas, ORG, DB, comentarios, numeros hex y decimales.
 *   #8 Saltos JC/JNC: soportados como cualquier otro salto.
 *
 * Ensamblador de DOS PASADAS para la ISA del simulador (ver tabla de
 * opcodes en Control.gs). Antes de este archivo, el UNICO programa posible era el que
 * venia hardcodeado en bytes dentro de Program.gs/Program2.gs. Con este
 * archivo, cualquiera puede escribir su propio programa en texto (con
 * mnemonicos, etiquetas y comentarios) y cargarlo sin tocar una sola
 * linea de Apps Script.
 *
 * Sintaxis soportada (una instruccion o directiva por linea):
 *   ; esto es un comentario (tambien al final de una linea)
 *   ORG 0x00              ; fija el contador de ubicacion (por defecto arranca en 0)
 *   ETIQUETA:              ; define una etiqueta en la direccion actual
 *   DB 0x05, 10, 3         ; declara bytes sueltos (para datos)
 *   MOV AX, 0x05           ; registro, inmediato
 *   MOV AX, BX              ; registro, registro
 *   LOAD AX, [0x80]          ; registro, direccion (o etiqueta)
 *   STORE [0x81], AX         ; direccion (o etiqueta), registro
 *   ADD/SUB/CMP  reg, imm|reg
 *   AND/OR/XOR   reg, reg
 *   INC/DEC/NOT  reg
 *   JMP/JZ/JNZ/JC/JNC  direccion (o etiqueta)
 *   HLT
 *
 * Los registros son AX/BX. Los numeros pueden ser hex (0x1A) o decimales
 * (26). Las etiquetas son cualquier palabra que NO sea un mnemonico, un
 * registro ni empiece con un digito, seguida de ":" cuando se DEFINEN, y
 * usadas sin ":" cuando se REFERENCIAN (en LOAD/STORE/JMP/...).
 */

var ASM_REGS_ = { AX: 0, BX: 1 };

// Mnemonicos sin operandos
var ASM_NOARGS_ = { HLT: 0x00 };

// Mnemonicos con 1 operando (siempre un registro)
var ASM_REG1_ = { INC: 0x09, DEC: 0x0A, NOT: 0x10 };

// Mnemonicos de salto (1 operando: direccion o etiqueta)
var ASM_JUMPS_ = { JMP: 0x11, JZ: 0x12, JNZ: 0x13, JC: 0x14, JNC: 0x15 };

// Mnemonicos con variante reg,imm Y reg,reg (opcode distinto segun el caso)
var ASM_REG_IMM_OR_REG_ = {
  MOV: { imm: 0x01, reg: 0x02 },
  ADD: { imm: 0x05, reg: 0x06 },
  SUB: { imm: 0x07, reg: 0x08 },
  CMP: { imm: 0x0B, reg: 0x0C }
};

// Mnemonicos solo reg,reg (la ISA no tiene variante inmediata para estos)
var ASM_REG_REG_ONLY_ = { AND: 0x0D, OR: 0x0E, XOR: 0x0F };

// [Tarjeta #10 Ensamblador - quita comentarios]
function asmStripComment_(line) {
  var i = line.indexOf(';');
  return (i >= 0 ? line.substring(0, i) : line).trim();
}

// [Tarjeta #10 Ensamblador - numeros hex o decimales]
function asmParseNumber_(tok) {
  tok = tok.trim();
  if (/^0x[0-9a-fA-F]+$/.test(tok)) return parseInt(tok, 16);
  if (/^-?\d+$/.test(tok)) return parseInt(tok, 10);
  return null;   // no es un numero (probablemente una etiqueta)
}

// Separa "MOV AX, 0x05" en { mnemonic: "MOV", args: ["AX","0x05"] }.
// Tambien reconoce una etiqueta sola en la linea ("L1:") y un LOAD/STORE
// con corchetes ("[0x80]" o "[RESULT]").
// [Tarjeta #10 Ensamblador - separa etiqueta, mnemonico y operandos]
function asmTokenizeLine_(raw) {
  var line = asmStripComment_(raw);
  if (line === '') return null;

  var labelMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
  var label = null;
  if (labelMatch) {
    label = labelMatch[1];
    line = labelMatch[2].trim();
  }
  if (line === '') return { label: label, mnemonic: null, args: [] };

  var spaceIdx = line.search(/\s/);
  var mnemonic = (spaceIdx >= 0 ? line.substring(0, spaceIdx) : line).toUpperCase();
  var rest = spaceIdx >= 0 ? line.substring(spaceIdx + 1) : '';
  var args = rest.length === 0 ? [] : rest.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
  return { label: label, mnemonic: mnemonic, args: args };
}

// Quita corchetes de un operando de direccion: "[0x80]" -> "0x80".
// [Tarjeta #10 Ensamblador - interpreta [direccion]]
function asmUnbracket_(tok) {
  var m = tok.match(/^\[\s*(.+?)\s*\]$/);
  return m ? m[1] : tok;
}

// Longitud en bytes de una instruccion ya tokenizada (no requiere resolver
// etiquetas: solo mira la FORMA del mnemonico/operandos, igual que hace
// instrLength(opcode) en Control.gs con el opcode ya decidido).
// [Tarjeta #10 Ensamblador - largo de cada instruccion (1a pasada)]
function asmInstrLength_(tk) {
  var mn = tk.mnemonic;
  if (!mn) return 0;
  if (mn === 'ORG') return 0;
  if (mn === 'DB') return tk.args.length;
  if (ASM_NOARGS_[mn] !== undefined) return 1;
  if (ASM_REG1_[mn] !== undefined) return 2;
  if (ASM_JUMPS_[mn] !== undefined) return 2;
  if (ASM_REG_IMM_OR_REG_[mn] !== undefined) return 3;
  if (ASM_REG_REG_ONLY_[mn] !== undefined) return 3;
  if (mn === 'LOAD' || mn === 'STORE') return 3;
  return -1;   // mnemonico desconocido
}

/**
 * Ensambla el texto fuente completo. Devuelve:
 *   { ok: true,  mem: [256 bytes], bytesWritten: N, listing: [texto por linea] }
 *   { ok: false, errors: ["linea 3: ..." , ...] }
 */
// [Tarjeta #10 Ensamblador - convierte el texto en bytes (2 pasadas)]
function assembleProgram(sourceText) {
  var rawLines = String(sourceText || '').split('\n');
  var tokens = [];     // { lineNo, label, mnemonic, args, addr, length }
  var errors = [];

  // -------- PASADA 1: calcular direcciones y recolectar etiquetas --------
  var loc = 0;
  var labels = {};
  for (var i = 0; i < rawLines.length; i++) {
    var lineNo = i + 1;
    var tk;
    try {
      tk = asmTokenizeLine_(rawLines[i]);
    } catch (e) {
      errors.push('Linea ' + lineNo + ': error de sintaxis (' + e.message + ')');
      continue;
    }
    if (!tk) continue;   // linea vacia o solo comentario

    if (tk.label) {
      if (labels[tk.label] !== undefined) {
        errors.push('Linea ' + lineNo + ': la etiqueta "' + tk.label + '" ya estaba definida.');
      }
      labels[tk.label] = loc;
    }

    if (!tk.mnemonic) continue;   // linea que solo tenia una etiqueta

    if (tk.mnemonic === 'ORG') {
      var orgVal = asmParseNumber_(tk.args[0]);
      if (orgVal === null) {
        errors.push('Linea ' + lineNo + ': ORG necesita una direccion numerica (ej. ORG 0x10).');
      } else {
        loc = orgVal;
      }
      tk.addr = loc; tk.length = 0;
      tokens.push(tk);
      continue;
    }

    var len = asmInstrLength_(tk);
    if (len < 0) {
      errors.push('Linea ' + lineNo + ': mnemonico desconocido "' + tk.mnemonic + '".');
      len = 0;
    }
    tk.lineNo = lineNo;
    tk.addr = loc;
    tk.length = len;
    tokens.push(tk);
    loc += len;
  }

  if (loc > 256) {
    errors.push('El programa ensamblado ocupa ' + loc + ' bytes: se pasa de la memoria disponible (256 bytes, 0x00-0xFF).');
  }

  // -------- PASADA 2: resolver operandos (incluidas etiquetas) y emitir bytes --------
  var mem = new Array(256).fill(0);

  function resolveOperand(tokStr, lineNo) {
    var n = asmParseNumber_(tokStr);
    if (n !== null) return n;
    if (labels[tokStr] !== undefined) return labels[tokStr];
    errors.push('Linea ' + lineNo + ': "' + tokStr + '" no es un numero ni una etiqueta definida.');
    return 0;
  }

  function emit(addr, bytes) {
    for (var k = 0; k < bytes.length; k++) {
      var a = addr + k;
      if (a < 0 || a > 255) {
        errors.push('Direccion fuera de rango de memoria al escribir: 0x' + a.toString(16));
        continue;
      }
      mem[a] = bytes[k] & 0xFF;
    }
  }

  tokens.forEach(function (tk) {
    if (!tk.mnemonic || tk.mnemonic === 'ORG') return;
    var mn = tk.mnemonic, a = tk.args, addr = tk.addr, ln = tk.lineNo;

    if (mn === 'DB') {
      var bytes = a.map(function (x) { return resolveOperand(x, ln) & 0xFF; });
      emit(addr, bytes);
      return;
    }
    if (ASM_NOARGS_[mn] !== undefined) {
      emit(addr, [ASM_NOARGS_[mn]]);
      return;
    }
    if (ASM_REG1_[mn] !== undefined) {
      if (ASM_REGS_[a[0]] === undefined) { errors.push('Linea ' + ln + ': ' + mn + ' necesita un registro (AX/BX).'); return; }
      emit(addr, [ASM_REG1_[mn], ASM_REGS_[a[0]]]);
      return;
    }
    if (ASM_JUMPS_[mn] !== undefined) {
      var target = resolveOperand(a[0], ln);
      emit(addr, [ASM_JUMPS_[mn], target & 0xFF]);
      return;
    }
    if (ASM_REG_IMM_OR_REG_[mn] !== undefined) {
      if (ASM_REGS_[a[0]] === undefined) { errors.push('Linea ' + ln + ': ' + mn + ' necesita un registro como primer operando (AX/BX).'); return; }
      var destCode = ASM_REGS_[a[0]];
      if (ASM_REGS_[a[1]] !== undefined) {
        emit(addr, [ASM_REG_IMM_OR_REG_[mn].reg, destCode, ASM_REGS_[a[1]]]);
      } else {
        var imm = resolveOperand(a[1], ln);
        emit(addr, [ASM_REG_IMM_OR_REG_[mn].imm, destCode, imm & 0xFF]);
      }
      return;
    }
    if (ASM_REG_REG_ONLY_[mn] !== undefined) {
      if (ASM_REGS_[a[0]] === undefined || ASM_REGS_[a[1]] === undefined) {
        errors.push('Linea ' + ln + ': ' + mn + ' necesita dos registros (AX/BX).'); return;
      }
      emit(addr, [ASM_REG_REG_ONLY_[mn], ASM_REGS_[a[0]], ASM_REGS_[a[1]]]);
      return;
    }
    if (mn === 'LOAD') {
      if (ASM_REGS_[a[0]] === undefined) { errors.push('Linea ' + ln + ': LOAD necesita un registro como primer operando.'); return; }
      var srcAddr = resolveOperand(asmUnbracket_(a[1]), ln);
      emit(addr, [0x03, ASM_REGS_[a[0]], srcAddr & 0xFF]);
      return;
    }
    if (mn === 'STORE') {
      var dstAddr = resolveOperand(asmUnbracket_(a[0]), ln);
      if (ASM_REGS_[a[1]] === undefined) { errors.push('Linea ' + ln + ': STORE necesita un registro como segundo operando.'); return; }
      emit(addr, [0x04, dstAddr & 0xFF, ASM_REGS_[a[1]]]);
      return;
    }
    errors.push('Linea ' + ln + ': no se pudo ensamblar "' + mn + '".');
  });

  if (errors.length > 0) return { ok: false, errors: errors };

  var listing = tokens.filter(function (t) { return t.mnemonic && t.mnemonic !== 'ORG'; })
    .map(function (t) { return '0x' + ('0' + t.addr.toString(16)).slice(-2).toUpperCase() + ':  ' + t.mnemonic + ' ' + t.args.join(', '); });

  return { ok: true, mem: mem, bytesWritten: loc, listing: listing };
}

// ---------- Integracion con la hoja: hoja propia "ENSAMBLADOR" ----------
// El codigo fuente se escribe en una hoja aparte (ENSAMBLADOR), una
// instruccion por fila a partir de A3. Va en hoja propia porque en la hoja
// CPU_SIMULATOR la columna A es el log, que escribe hacia abajo y pisaria
// el codigo. Tambien se admite todo el programa en una sola celda con
// saltos de linea.
var ASM_SHEET_NAME = 'ENSAMBLADOR';
var ASM_FIRST_ROW = 3;

// [Tarjeta #10 Ensamblador - crea la hoja ENSAMBLADOR con un ejemplo]
function createAssemblerSheet_(ss) {
  var sh = ss.insertSheet(ASM_SHEET_NAME);
  sh.setTabColor('#6aa84f');
  sh.getRange('A1').setValue('ENSAMBLADOR - escribe tu programa desde A3, una instruccion por fila').setFontWeight('bold');
  sh.getRange('A2').setValue('Luego, menu "CPU Simulador" > "Ensamblar y cargar". Comentarios con ; etiquetas con NOMBRE: directivas ORG y DB.').setFontSize(9).setFontStyle('italic');
  var example = [
    '; Ejemplo: suma 1..N con etiquetas',
    'MOV AX, 0x00',
    'LOAD BX, [0x80]',
    'L1: CMP BX, 0x00',
    'JZ L2',
    'ADD AX, BX',
    'DEC BX',
    'JMP L1',
    'L2: STORE [0x81], AX',
    'HLT'
  ].map(function (l) { return [l]; });
  sh.getRange(ASM_FIRST_ROW, 1, example.length, 1).setValues(example).setFontFamily('Consolas');
  sh.setColumnWidth(1, 520);
  return sh;
}

// [Tarjeta #10 Ensamblador - lee el codigo fuente de la hoja]
function readAssemblySource_(sheet) {
  var lines = [];
  var row = ASM_FIRST_ROW;
  while (true) {
    var v = sheet.getRange(row, 1).getValue();
    if (v === '' || v === null) break;
    lines.push(String(v));
    row++;
    if (row > ASM_FIRST_ROW + 256) break;   // limite de seguridad
  }
  if (lines.length === 0) return '';
  // Si la primera (y unica) celda ya trae varias lineas con \n, uselas tal cual.
  if (lines.length === 1 && lines[0].indexOf('\n') >= 0) return lines[0];
  return lines.join('\n');
}

// [Tarjeta #10 Ensamblador - lee la hoja ENSAMBLADOR y carga en memoria]
function assembleAndLoadFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheet();
  var asmSheet = ss.getSheetByName(ASM_SHEET_NAME);
  if (!asmSheet) {
    createAssemblerSheet_(ss);
    ss.setActiveSheet(sheet);
    SpreadsheetApp.getUi().alert('Cree la hoja "' + ASM_SHEET_NAME + '" con un programa de ejemplo. Editalo (desde A3, una instruccion por fila) y vuelve a elegir "Ensamblar y cargar".');
    return;
  }
  var source = readAssemblySource_(asmSheet);
  if (!source.trim()) {
    SpreadsheetApp.getUi().alert('La hoja "' + ASM_SHEET_NAME + '" no tiene codigo. Escribe tu programa desde A3, una instruccion por fila.');
    return;
  }

  var result = assembleProgram(source);
  if (!result.ok) {
    SpreadsheetApp.getUi().alert('Errores de ensamblado:\n\n' + result.errors.join('\n'));
    return;
  }

  var state = getInitialState();
  state.Mem = result.mem;
  refreshAllMemory(sheet, state);
  colorizeMemorySegments(sheet);
  clearRegisterHighlights(sheet);
  refreshRegisters(sheet, state);
  logMicroOp(sheet, state, '--- Programa propio ensamblado y cargado (' + result.bytesWritten + ' bytes) ---', 'SYSTEM');
  saveState(state);

  SpreadsheetApp.getUi().alert('Ensamblado OK (' + result.bytesWritten + ' bytes). Programa cargado en memoria: ya puedes usar STEP / RUN.');
}
