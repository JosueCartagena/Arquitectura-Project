/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Program.gs
 *
 * Programa demostrativo obligatorio: SUMA DE 1 A N (con bucle y
 * bifurcacion condicional). Calcula 1+2+3+4+5 = 15 usando un
 * contador regresivo (BX) y un acumulador (AX), con salto JZ.
 *
 * Mapa del programa (ver README.md, seccion "Programa demostrativo" y
 * "Traza de registros paso a paso", para el detalle completo):
 *
 *   0x00: MOV AX, 0x00        ; AX = 0            (acumulador)
 *   0x03: LOAD BX, [0x80]     ; BX = N            (contador = N)
 *   0x06: CMP BX, 0x00        ; L1: comparar BX con 0      <- bucle
 *   0x09: JZ  0x12            ;     si BX=0, saltar a L2 (fin)
 *   0x0B: ADD AX, BX          ;     AX = AX + BX
 *   0x0E: DEC BX              ;     BX = BX - 1
 *   0x10: JMP 0x06            ;     volver a L1
 *   0x12: STORE [0x81], AX    ; L2: RESULT = AX
 *   0x15: HLT
 */

// Lee N desde la celda de entrada B22 ("N (suma 1..N):"), la valida y la
// normaliza. Limite superior = 20 porque 1+2+...+20 = 210, que todavia
// cabe en el registro AX de 8 bits (max 255); un N mayor desbordaria el
// resultado y daria una suma incorrecta (no por un bug, sino porque el
// registro es de 8 bits, tal como pide la arquitectura del simulador).
function getInputN(sheet) {
  var raw = sheet.getRange('B22').getValue();
  var n = Math.round(Number(raw));
  if (!isFinite(n) || isNaN(n) || n < 1) n = 5;
  if (n > 20) n = 20;
  sheet.getRange('B22').setValue(n);   // normaliza el valor visible si era invalido/estaba fuera de rango
  return n;
}

function loadDemoProgram() {
  var sheet = getSheet();
  var state = getInitialState();
  var n = getInputN(sheet);

  // ---------------- Segmento de Codigo (00h en adelante) ----------------
  var code = [
    0x01, 0x00, 0x00,   // 0x00  MOV AX, 0x00
    0x03, 0x01, 0x80,   // 0x03  LOAD BX, [0x80]
    0x0B, 0x01, 0x00,   // 0x06  CMP BX, 0x00        (L1)
    0x12, 0x12,         // 0x09  JZ 0x12
    0x06, 0x00, 0x01,   // 0x0B  ADD AX, BX
    0x0A, 0x01,         // 0x0E  DEC BX
    0x11, 0x06,         // 0x10  JMP 0x06
    0x04, 0x81, 0x00,   // 0x12  STORE [0x81], AX    (L2)
    0x00                // 0x15  HLT
  ];
  for (var i = 0; i < code.length; i++) state.Mem[i] = code[i];

  // ---------------- Segmento de Datos (80h en adelante) ----------------
  state.Mem[0x80] = n;    // N  -> se sumara 1+2+...+N (configurable en B22)
  state.Mem[0x81] = 0;    // RESULT -> quedara en la suma de 1..N al finalizar

  refreshAllMemory(sheet, state);
  colorizeMemorySegments(sheet);      // tambien limpia cualquier resaltado verde que hubiera quedado
  clearRegisterHighlights(sheet);
  refreshRegisters(sheet, state);

  var esperado = (n * (n + 1)) / 2;
  logMicroOp(sheet, state, "--- Programa 'SUMA 1..N' cargado (N=" + n +
    ', esperado en 0x81 = ' + esperado + ') ---', 'SYSTEM');

  saveState(state);   // se guarda al final para persistir tambien NextLogRow
}
