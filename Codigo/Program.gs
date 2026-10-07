/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Program.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #5 Programa de prueba (Suma 1..N): bucle con CMP, JZ y JMP.
 *   #13 Direcciones configurables: DATA_BASE es el unico lugar a cambiar, con validacion. El byte 0x0B es 0x06 (ADD); 0x08 seria SUB y daria 0xF1 en vez de 0x0F.
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
// [Tarjeta #5 Programa de prueba - lee N de la celda B22]
function getInputN(sheet) {
  var raw = sheet.getRange('B22').getValue();
  var n = Math.round(Number(raw));
  if (!isFinite(n) || isNaN(n) || n < 1) n = 5;
  if (n > 20) n = 20;
  sheet.getRange('B22').setValue(n);   // normaliza el valor visible si era invalido/estaba fuera de rango
  return n;
}

// ======================================================================
// DIRECCION BASE DE DATOS (UNICO LUGAR A CAMBIAR)
// ----------------------------------------------------------------------
// Todos los programas (este y los de Program2.gs) toman sus direcciones de
// datos como DATA_BASE + desplazamiento. El codigo (operandos de LOAD/STORE),
// la carga inicial de datos y el mensaje del log salen de la MISMA cuenta,
// asi que no pueden quedar desincronizados.
//
// Si el ingeniero pide mover la tabla de datos (ej. "los datos en 0x90"),
// cambia SOLO esta linea: var DATA_BASE = 0x90;  y vuelve a "Cargar programa".
// Regla: DATA_BASE debe ser >= tamano del codigo (mas grande: 0x31) y
// DATA_BASE + 4 <= 0xFF. Si no, el programa NO se carga y el log lo explica.
// ======================================================================
var DATA_BASE = 0x80;

// [Tarjeta #13 Direcciones configurables - DATA_BASE + desplazamiento]
function dataAddr_(off) { return DATA_BASE + off; }

// Devuelve '' si todo bien o un texto explicando el problema.
// [Tarjeta #13 Direcciones configurables - rechaza datos dentro del codigo o mas alla de 0xFF]
function validateDataAddrs_(codeLen, dataMap) {
  for (var k in dataMap) {
    var a = Number(k);
    if (a < codeLen) {
      return 'La direccion de datos 0x' + a.toString(16).toUpperCase() +
        ' cae dentro del segmento de codigo (0x00-0x' + (codeLen - 1).toString(16).toUpperCase() +
        '). Sube DATA_BASE a 0x' + codeLen.toString(16).toUpperCase() + ' o mas.';
    }
    if (a > 0xFF) {
      return 'La direccion de datos 0x' + a.toString(16).toUpperCase() +
        ' excede 0xFF (la memoria es de 256 bytes). Baja DATA_BASE.';
    }
  }
  return '';
}

// Construye el programa Suma 1..N para una base de datos dada.
//   base   = N        base+1 = RESULT
// [Tarjeta #5 Programa de prueba / #13 - arma el bytecode de la Suma 1..N]
function buildSumaProgram_(n, base) {
  var rn = base, rr = base + 1;
  var code = [
    0x01, 0x00, 0x00,   // 0x00  MOV AX, 0x00
    0x03, 0x01, rn,     // 0x03  LOAD BX, [N]
    0x0B, 0x01, 0x00,   // 0x06  CMP BX, 0x00        (L1)
    0x12, 0x12,         // 0x09  JZ 0x12
    0x06, 0x00, 0x01,   // 0x0B  ADD AX, BX
    0x0A, 0x01,         // 0x0E  DEC BX
    0x11, 0x06,         // 0x10  JMP 0x06
    0x04, rr, 0x00,     // 0x12  STORE [RESULT], AX  (L2)
    0x00                // 0x15  HLT
  ];
  var data = {};
  data[rn] = n;     // N  -> se sumara 1+2+...+N (configurable en B22)
  data[rr] = 0;     // RESULT
  return { code: code, data: data };
}

// [Tarjeta #5 Programa de prueba - carga la Suma 1..N en memoria]
function loadDemoProgram() {
  var sheet = getSheet();
  var state = getInitialState();
  var n = getInputN(sheet);

  var prog = buildSumaProgram_(n, DATA_BASE);
  var err = validateDataAddrs_(prog.code.length, prog.data);
  if (err) { logMicroOp(sheet, state, 'ERROR: ' + err, 'SYSTEM'); saveState(state); return; }

  for (var i = 0; i < prog.code.length; i++) state.Mem[i] = prog.code[i];
  for (var addr in prog.data) state.Mem[addr] = prog.data[addr] & 0xFF;

  refreshAllMemory(sheet, state);
  colorizeMemorySegments(sheet);      // tambien limpia cualquier resaltado verde que hubiera quedado
  clearRegisterHighlights(sheet);
  refreshRegisters(sheet, state);

  var esperado = (n * (n + 1)) / 2;
  logMicroOp(sheet, state, "--- Programa 'SUMA 1..N' cargado (N=" + n + ' en 0x' + toHex2(dataAddr_(0)) +
    ', esperado en 0x' + toHex2(dataAddr_(1)) + ' = ' + esperado + ') ---', 'SYSTEM');

  saveState(state);   // se guarda al final para persistir tambien NextLogRow
}
