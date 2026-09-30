/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Control.gs
 *
 * Unidad de Control: tabla de opcodes, decodificador, y las 4 fases del
 * ciclo de instruccion (Fetch, Decode, Execute, Store), mas los
 * orquestadores de modo Paso a Paso (stepCycle) y Continuo (runProgram).
 *
 * ---------------------------------------------------------------------
 * TABLA DE OPCODES (ver README.md para la tabla formal completa)
 *   0x00 HLT                (1 byte:  op)
 *   0x01 MOV  reg, imm      (3 bytes: op, reg, imm)
 *   0x02 MOV  reg, reg      (3 bytes: op, destReg, srcReg)
 *   0x03 LOAD reg, [dir]    (3 bytes: op, reg, addr)
 *   0x04 STORE [dir], reg   (3 bytes: op, addr, reg)
 *   0x05 ADD  reg, imm      (3 bytes)
 *   0x06 ADD  reg, reg      (3 bytes)
 *   0x07 SUB  reg, imm      (3 bytes)
 *   0x08 SUB  reg, reg      (3 bytes)
 *   0x09 INC  reg           (2 bytes: op, reg)
 *   0x0A DEC  reg           (2 bytes)
 *   0x0B CMP  reg, imm      (3 bytes)
 *   0x0C CMP  reg, reg      (3 bytes)
 *   0x0D AND  reg, reg      (3 bytes)
 *   0x0E OR   reg, reg      (3 bytes)
 *   0x0F XOR  reg, reg      (3 bytes)
 *   0x10 NOT  reg           (2 bytes)
 *   0x11 JMP  dir           (2 bytes: op, addr)
 *   0x12 JZ   dir           (2 bytes)
 *   0x13 JNZ  dir           (2 bytes)
 * ---------------------------------------------------------------------
 */

function instrLength(opcode) {
  switch (opcode) {
    case 0x00: return 1;                              // HLT
    case 0x09: case 0x0A: case 0x10: return 2;         // INC, DEC, NOT
    case 0x11: case 0x12: case 0x13: return 2;         // JMP, JZ, JNZ
    default: return 3;                                  // resto
  }
}

function regName(code) {
  switch (code) {
    case 0: return 'AX';
    case 1: return 'BX';
    default: return '??';
  }
}

function getReg(state, code) {
  switch (code) {
    case 0: return state.AX;
    case 1: return state.BX;
    default: return 0;
  }
}

function setReg(state, code, value) {
  value = value & 0xFF;
  if (code === 0) state.AX = value;
  else if (code === 1) state.BX = value;
}

function mnemonic(op, a, b) {
  switch (op) {
    case 0x00: return 'HLT';
    case 0x01: return 'MOV ' + regName(a) + ', 0x' + toHex2(b);
    case 0x02: return 'MOV ' + regName(a) + ', ' + regName(b);
    case 0x03: return 'LOAD ' + regName(a) + ', [0x' + toHex2(b) + ']';
    case 0x04: return 'STORE [0x' + toHex2(a) + '], ' + regName(b);
    case 0x05: return 'ADD ' + regName(a) + ', 0x' + toHex2(b);
    case 0x06: return 'ADD ' + regName(a) + ', ' + regName(b);
    case 0x07: return 'SUB ' + regName(a) + ', 0x' + toHex2(b);
    case 0x08: return 'SUB ' + regName(a) + ', ' + regName(b);
    case 0x09: return 'INC ' + regName(a);
    case 0x0A: return 'DEC ' + regName(a);
    case 0x0B: return 'CMP ' + regName(a) + ', 0x' + toHex2(b);
    case 0x0C: return 'CMP ' + regName(a) + ', ' + regName(b);
    case 0x0D: return 'AND ' + regName(a) + ', ' + regName(b);
    case 0x0E: return 'OR ' + regName(a) + ', ' + regName(b);
    case 0x0F: return 'XOR ' + regName(a) + ', ' + regName(b);
    case 0x10: return 'NOT ' + regName(a);
    case 0x11: return 'JMP 0x' + toHex2(a);
    case 0x12: return 'JZ 0x' + toHex2(a);
    case 0x13: return 'JNZ 0x' + toHex2(a);
    default: return '??? (0x' + toHex2(op) + ')';
  }
}

// ================= FASE 1: FETCH =================
function fetchPhase(sheet, state) {
  // Limpia el resaltado que dejo la fase STORE del ciclo anterior (una sola
  // celda de memoria + los registros), en vez de redibujar las 256 celdas.
  clearMemoryHighlight(sheet, state);
  clearRegisterHighlights(sheet, state);

  state.MAR = state.PC;
  highlightRegister(sheet, state, 'B7');
  state.MDR = readMem(state, state.MAR);
  highlightMemoryCell(sheet, state, state.MAR);
  state.IR_Opcode = state.MDR;

  var len = instrLength(state.IR_Opcode);
  state.IR_Op1 = len >= 2 ? readMem(state, state.MAR + 1) : 0;
  state.IR_Op2 = len >= 3 ? readMem(state, state.MAR + 2) : 0;
  state.IR_Text = mnemonic(state.IR_Opcode, state.IR_Op1, state.IR_Op2);

  logMicroOp(sheet, state, '[Paso ' + state.StepCounter + '] FETCH: MAR=0x' + toHex2(state.MAR) +
    ', MDR=0x' + toHex2(state.MDR) + ' -> IR=' + state.IR_Text, 'FETCH');

  state.PC = state.PC + len;
  state.Phase = 1;
}

// ================= FASE 2: DECODE =================
function decodePhase(sheet, state) {
  logMicroOp(sheet, state, '[Paso ' + state.StepCounter + '] DECODE: Opcode=0x' + toHex2(state.IR_Opcode) +
    '  ->  ' + state.IR_Text, 'DECODE');
  state.Phase = 2;
}

// ================= FASE 3: EXECUTE =================
function executePhase(sheet, state) {
  var flags = { ZF: state.ZF, CF: state.CF, SF: state.SF };
  var jumpTaken = false;

  switch (state.IR_Opcode) {
    case 0x00:
      state.Halted = true;
      logMicroOp(sheet, state, '[Paso ' + state.StepCounter + '] EXECUTE: HLT -> deteniendo el reloj', 'EXECUTE');
      break;
    case 0x01: setReg(state, state.IR_Op1, state.IR_Op2); break;
    case 0x02: setReg(state, state.IR_Op1, getReg(state, state.IR_Op2)); break;
    case 0x03:
      state.MAR = state.IR_Op2;
      state.MDR = readMem(state, state.MAR);
      setReg(state, state.IR_Op1, state.MDR);
      break;
    case 0x04: break; // STORE [dir], reg -> se resuelve en fase STORE
    case 0x05: setReg(state, state.IR_Op1, aluAdd(getReg(state, state.IR_Op1), state.IR_Op2, flags)); break;
    case 0x06: setReg(state, state.IR_Op1, aluAdd(getReg(state, state.IR_Op1), getReg(state, state.IR_Op2), flags)); break;
    case 0x07: setReg(state, state.IR_Op1, aluSub(getReg(state, state.IR_Op1), state.IR_Op2, flags)); break;
    case 0x08: setReg(state, state.IR_Op1, aluSub(getReg(state, state.IR_Op1), getReg(state, state.IR_Op2), flags)); break;
    case 0x09: setReg(state, state.IR_Op1, aluInc(getReg(state, state.IR_Op1), flags)); break;
    case 0x0A: setReg(state, state.IR_Op1, aluDec(getReg(state, state.IR_Op1), flags)); break;
    case 0x0B: aluCmp(getReg(state, state.IR_Op1), state.IR_Op2, flags); break;
    case 0x0C: aluCmp(getReg(state, state.IR_Op1), getReg(state, state.IR_Op2), flags); break;
    case 0x0D: setReg(state, state.IR_Op1, aluAnd(getReg(state, state.IR_Op1), getReg(state, state.IR_Op2), flags)); break;
    case 0x0E: setReg(state, state.IR_Op1, aluOr(getReg(state, state.IR_Op1), getReg(state, state.IR_Op2), flags)); break;
    case 0x0F: setReg(state, state.IR_Op1, aluXor(getReg(state, state.IR_Op1), getReg(state, state.IR_Op2), flags)); break;
    case 0x10: setReg(state, state.IR_Op1, aluNot(getReg(state, state.IR_Op1), flags)); break;
    case 0x11: state.PC = state.IR_Op1; jumpTaken = true; break;
    case 0x12: if (flags.ZF) { state.PC = state.IR_Op1; jumpTaken = true; } break;
    case 0x13: if (!flags.ZF) { state.PC = state.IR_Op1; jumpTaken = true; } break;
    default:
      SpreadsheetApp.getUi().alert('Opcode desconocido: 0x' + toHex2(state.IR_Opcode));
      state.Halted = true;
  }

  state.ZF = flags.ZF; state.CF = flags.CF; state.SF = flags.SF;

  var explain = friendlyExplain(state.IR_Opcode, state.IR_Op1, state.IR_Op2);
  logMicroOp(sheet, state, '[Paso ' + state.StepCounter + '] EXECUTE: ' + state.IR_Text +
    (jumpTaken ? '  -> salto tomado a 0x' + toHex2(state.PC) : '') +
    '   |  ZF=' + (state.ZF ? 1 : 0) + ' CF=' + (state.CF ? 1 : 0) + ' SF=' + (state.SF ? 1 : 0) +
    (explain ? '   // ' + explain : ''), 'EXECUTE');

  state.Phase = 3;
}

// ================= FASE 4: STORE / WRITE-BACK =================
function storeBackPhase(sheet, state) {
  if (state.IR_Opcode === 0x04) {           // STORE [dir], reg
    state.MAR = state.IR_Op1;
    state.MDR = getReg(state, state.IR_Op2);
    writeMem(state, state.MAR, state.MDR);
    refreshMemoryCell(sheet, state, state.MAR);
    clearMemoryHighlight(sheet, state);             // suelta la celda de la instruccion (fase FETCH)
    highlightMemoryCell(sheet, state, state.MAR);   // y resalta el destino; queda visible hasta el proximo FETCH
    logMicroOp(sheet, state, '[Paso ' + state.StepCounter + '] STORE: RAM[0x' + toHex2(state.MAR) +
      '] <- MDR=0x' + toHex2(state.MDR), 'STORE');
  } else {
    logMicroOp(sheet, state, '[Paso ' + state.StepCounter + '] STORE: (esta instruccion no escribe en RAM)', 'STORE');
  }

  state.StepCounter = state.StepCounter + 1;
  state.Phase = 0;
}

// ---------- Orquestador de UN micro-paso (boton STEP) ----------
function stepCycle() {
  var sheet = getSheet();
  var state = loadState();

  if (state.Halted) {
    SpreadsheetApp.getUi().alert('La CPU esta detenida (HLT). Usa LOAD PROGRAM o RESET para reiniciar.');
    return;
  }

  switch (state.Phase) {
    case 0: fetchPhase(sheet, state); break;
    case 1: decodePhase(sheet, state); break;
    case 2: executePhase(sheet, state); break;
    case 3: storeBackPhase(sheet, state); break;
  }

  refreshRegisters(sheet, state);
  saveState(state);
}

function getDelayMs(sheet) {
  var v = Number(sheet.getRange('B21').getValue());
  return (v > 0) ? v : 400;
}

// ---------- Modo RUN (ejecucion instantanea) ----------
// La version anterior pintaba y hacia SpreadsheetApp.flush() despues de
// CADA una de las 4 fases de CADA ciclo: para el programa de ejemplo con
// N=8 (46 ciclos) eso son ~184 idas y vueltas a Google Sheets, y cada una
// tiene una latencia de red que NO se puede acortar bajando el retardo de
// B21 (esa es la razon de que "RUN" se sintiera lento incluso con la
// hoja ya optimizada para escribir en lotes).
//
// Ahora RUN calcula el programa COMPLETO en memoria (sin tocar la hoja en
// absoluto durante el bucle: todas las funciones de pintado se auto-
// desactivan cuando state.Instant es true, ver Code.gs) y recien al final
// vuelca de una sola vez: la memoria completa, los registros, y el log
// entero de micro-operaciones acumulado en state.PendingLog. El resultado
// es el mismo (mismo numero de ciclos, mismo log linea por linea) pero
// aparece de golpe en vez de animado paso a paso.
//
// Para ver el ciclo Fetch/Decode/Execute/Store avanzar EN VIVO, fase por
// fase, sigue estando el boton STEP (stepCycle), que no cambia.
function runProgram() {
  var sheet = getSheet();

  var state = loadState();
  if (state.Halted) {
    SpreadsheetApp.getUi().alert('La CPU esta detenida (HLT). Usa LOAD PROGRAM para reiniciar.');
    return;
  }

  var startLogRow = state.NextLogRow || 27;
  state.PendingLog = [];
  state.Instant = true;

  var phases = [fetchPhase, decodePhase, executePhase, storeBackPhase];
  var MAX_CYCLES = 5000;   // limite de seguridad ante un posible bucle infinito en el programa
  var cycles = 0;

  while (!state.Halted && cycles < MAX_CYCLES) {
    // Las 4 fases siempre se completan juntas (incluida STORE tras un HLT,
    // que no escribe en RAM pero SI cuenta como ciclo), igual que antes,
    // para no alterar el conteo de ciclos ya documentado en el README.
    for (var i = 0; i < phases.length; i++) {
      phases[i](sheet, state);
    }
    cycles++;
  }

  if (!state.Halted && cycles >= MAX_CYCLES) {
    logMicroOp(sheet, state, '--- Limite de seguridad (' + MAX_CYCLES + ' ciclos) alcanzado: revisa si el programa tiene un bucle infinito ---', 'SYSTEM');
  }
  if (state.Halted) {
    logMicroOp(sheet, state, '--- Programa finalizado (HLT) tras ' + state.StepCounter + ' ciclos de instruccion ---', 'SYSTEM');
  }

  // --- Volcado final: memoria, registros y log completo, de una sola vez ---
  state.Instant = false;

  refreshAllMemory(sheet, state);
  clearRegisterHighlights(sheet, state);
  if (state.LastHighlightedAddr >= 0) {
    highlightMemoryCell(sheet, state, state.LastHighlightedAddr);
  }
  refreshRegisters(sheet, state);

  var pending = state.PendingLog || [];
  if (pending.length > 0) {
    var texts = pending.map(function (e) { return [e.texto]; });
    var bgs = pending.map(function (e) {
      return [e.faseKey && PHASE_COLORS[e.faseKey] ? PHASE_COLORS[e.faseKey] : null];
    });
    var range = sheet.getRange(startLogRow, 1, texts.length, 1);
    range.setNumberFormat('@STRING@');
    range.setValues(texts);
    range.setBackgrounds(bgs);
    state.NextLogRow = startLogRow + texts.length;
  }
  delete state.PendingLog;

  SpreadsheetApp.flush();
  saveState(state);
}

function pauseProgram() {
  // RUN ahora es instantaneo (ver arriba): termina antes de que un clic en
  // PAUSE llegue a tener efecto, asi que esta funcion ya no interrumpe nada
  // a mitad de ejecucion. Se deja solo para que el boton no falle si ya
  // esta insertado en la hoja.
  var sheet = getSheet();
  var state = loadState();
  logMicroOp(sheet, state, '--- PAUSE: RUN ahora es instantaneo, no hay una ejecucion en curso que pausar ---', 'SYSTEM');
  saveState(state);
}
