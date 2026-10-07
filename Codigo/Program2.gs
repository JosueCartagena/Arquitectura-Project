/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Program2.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #9 Programas de demostracion: Multiplicacion, C=A+B, Mayor de dos, Cuenta regresiva y Fibonacci.
 *   #8 Saltos JC/JNC: JNC en Mayor de dos y JC en Fibonacci.
 *   #13 Direcciones configurables: toda direccion de datos = DATA_BASE + desplazamiento.
 *
 * 5 programas de demostracion adicionales al original de Program.gs
 * (Suma de 1 a N), con estos 5 ejemplos: Multiplicacion, C=A+B, Mayor de dos
 * numeros, Cuenta regresiva y Fibonacci hasta desbordar 8 bits.
 *
 * Todos usan UNICAMENTE instrucciones que ya existian en la ISA original
 * mas JC/JNC (agregados en Control.gs junto con la bandera OF) -- no se
 * inventaron opcodes nuevos para que estos programas funcionen.
 *
 * Como el simulador solo tiene 2 registros (AX, BX), los programas que
 * necesitan "recordar" mas de 2 valores a la vez (la Multiplicacion, en
 * particular) usan celdas de memoria como almacenamiento auxiliar
 * (LOAD/STORE de ida y vuelta). Esto no es un defecto: es exactamente la
 * limitacion real de un banco de registros chico, y vale la pena
 * mencionarlo en la exposicion si el ingeniero pregunta por que ese
 * programa tiene tantos pasos.
 */

// Lee un valor de una celda de entrada (B22, E21 o E22), lo normaliza a
// un entero entre 0 y 255 (rango de un registro de 8 bits) y lo re-escribe
// si estaba fuera de rango o vacio.
// [Tarjeta #9 Programas de demostracion - lee Valor A/Valor B (E21, E22)]
function getInputCell_(sheet, a1, fallback) {
  var raw = sheet.getRange(a1).getValue();
  var n = Math.round(Number(raw));
  if (!isFinite(n) || isNaN(n) || n < 0) n = fallback;
  if (n > 255) n = 255;
  sheet.getRange(a1).setValue(n);
  return n;
}

// [Tarjeta #9 Programas de demostracion - carga bytecode y datos (valida direcciones, #13)]
function loadBytecode_(sheet, codeBytes, dataMap, logText) {
  var state = getInitialState();
  var err = validateDataAddrs_(codeBytes.length, dataMap);
  if (err) {
    logMicroOp(sheet, state, 'ERROR: ' + err, 'SYSTEM');
    saveState(state);
    return;
  }
  for (var i = 0; i < codeBytes.length; i++) state.Mem[i] = codeBytes[i];
  for (var addr in dataMap) state.Mem[addr] = dataMap[addr] & 0xFF;

  refreshAllMemory(sheet, state);
  colorizeMemorySegments(sheet);
  clearRegisterHighlights(sheet);
  refreshRegisters(sheet, state);

  logMicroOp(sheet, state, logText, 'SYSTEM');
  saveState(state);
}

// [Tarjeta #9 Programas de demostracion - formato 0xNN para el log]
function h_(n) { return '0x' + toHex2(n); }

// ======================================================================
// Constructores PUROS (sin tocar la hoja): devuelven {code, data}.
// Todas las direcciones de datos = base + desplazamiento (ver DATA_BASE en
// Program.gs). Las direcciones de SALTO (JZ/JMP/JNC/JC) son del segmento de
// codigo y no dependen de la base.
// ======================================================================

// 2) MULTIPLICACION: base=A  +1=B  +2=ACC  +3=CONT  +4=RESULT
// [Tarjeta #9 Programas de demostracion - bytecode de A x B]
function buildMultiplicacion_(a, b, base) {
  var A = base, B = base + 1, ACC = base + 2, CONT = base + 3, RES = base + 4;
  var code = [
    0x01, 0x00, 0x00,   // 00 MOV AX,0x00
    0x04, ACC, 0x00,    // 03 STORE [ACC],AX       ACC=0
    0x03, 0x01, B,      // 06 LOAD BX,[B]          BX=B
    0x04, CONT, 0x01,   // 09 STORE [CONT],BX      CONT=B
    0x03, 0x01, CONT,   // 0C LOAD BX,[CONT]       (L1)
    0x0B, 0x01, 0x00,   // 0F CMP BX,0x00
    0x12, 0x2A,         // 12 JZ 0x2A              (L2)
    0x03, 0x00, ACC,    // 14 LOAD AX,[ACC]
    0x03, 0x01, A,      // 17 LOAD BX,[A]
    0x06, 0x00, 0x01,   // 1A ADD AX,BX
    0x04, ACC, 0x00,    // 1D STORE [ACC],AX
    0x03, 0x01, CONT,   // 20 LOAD BX,[CONT]
    0x0A, 0x01,         // 23 DEC BX
    0x04, CONT, 0x01,   // 25 STORE [CONT],BX
    0x11, 0x0C,         // 28 JMP 0x0C             (vuelve a L1)
    0x03, 0x00, ACC,    // 2A LOAD AX,[ACC]        (L2)
    0x04, RES, 0x00,    // 2D STORE [RESULT],AX
    0x00                // 30 HLT
  ];
  var data = {}; data[A] = a; data[B] = b; data[ACC] = 0; data[CONT] = 0; data[RES] = 0;
  return { code: code, data: data };
}

// 3) C = A + B: base=A  +1=B  +2=C
// [Tarjeta #9 Programas de demostracion - bytecode de C = A + B]
function buildSumaAB_(a, b, base) {
  var A = base, B = base + 1, C = base + 2;
  var code = [
    0x03, 0x00, A,      // 00 LOAD AX,[A]
    0x03, 0x01, B,      // 03 LOAD BX,[B]
    0x06, 0x00, 0x01,   // 06 ADD AX,BX
    0x04, C, 0x00,      // 09 STORE [C],AX
    0x00                // 0C HLT
  ];
  var data = {}; data[A] = a; data[B] = b; data[C] = 0;
  return { code: code, data: data };
}

// 4) MAYOR DE DOS: base=A  +1=B  +2=MAX   (CMP AX,BX + JNC: CF=0 <=> A>=B)
// [Tarjeta #9 / #8 - bytecode de Mayor de dos (usa JNC)]
function buildMayorDeDos_(a, b, base) {
  var A = base, B = base + 1, M = base + 2;
  var code = [
    0x03, 0x00, A,      // 00 LOAD AX,[A]
    0x03, 0x01, B,      // 03 LOAD BX,[B]
    0x0C, 0x00, 0x01,   // 06 CMP AX,BX
    0x15, 0x10,         // 09 JNC 0x10  -> MAYOR_A
    0x04, M, 0x01,      // 0B STORE [MAX],BX
    0x11, 0x13,         // 0E JMP 0x13  -> FIN
    0x04, M, 0x00,      // 10 STORE [MAX],AX
    0x00                // 13 HLT
  ];
  var data = {}; data[A] = a; data[B] = b; data[M] = 0;
  return { code: code, data: data };
}

// 5) CUENTA REGRESIVA: base=N  +1=RESULTADO (debe quedar 0)
// [Tarjeta #9 Programas de demostracion - bytecode de la cuenta regresiva]
function buildCuentaRegresiva_(n, base) {
  var N = base, R = base + 1;
  var code = [
    0x03, 0x01, N,      // 00 LOAD BX,[N]
    0x0B, 0x01, 0x00,   // 03 CMP BX,0x00  (L1)
    0x12, 0x0C,         // 06 JZ 0x0C
    0x0A, 0x01,         // 08 DEC BX
    0x11, 0x03,         // 0A JMP 0x03
    0x04, R, 0x01,      // 0C STORE [R],BX
    0x00                // 0F HLT
  ];
  var data = {}; data[N] = n; data[R] = 0;
  return { code: code, data: data };
}

// 6) FIBONACCI hasta desbordar: base=temporal  +1=ultimo valor
// [Tarjeta #9 / #8 - bytecode de Fibonacci (usa JC)]
function buildFibonacci_(base) {
  var T = base, R = base + 1;
  var code = [
    0x01, 0x00, 0x01,   // 00 MOV AX,0x01
    0x01, 0x01, 0x01,   // 03 MOV BX,0x01
    0x04, T, 0x00,      // 06 STORE [T],AX   (LOOP)
    0x06, 0x00, 0x01,   // 09 ADD AX,BX
    0x14, 0x13,         // 0C JC 0x13
    0x03, 0x01, T,      // 0E LOAD BX,[T]
    0x11, 0x06,         // 11 JMP 0x06
    0x04, R, 0x00,      // 13 STORE [R],AX   (FIN)
    0x00                // 16 HLT
  ];
  var data = {}; data[T] = 0; data[R] = 0;
  return { code: code, data: data };
}

// ======================================================================
// Cargadores (los que llama el menu)
// ======================================================================
// [Tarjeta #9 Programas de demostracion - carga Multiplicacion]
function loadProgramMultiplicacion() {
  var sheet = getSheet();
  var a = getInputCell_(sheet, 'E21', 12);
  var b = getInputCell_(sheet, 'E22', 9);
  var p = buildMultiplicacion_(a, b, DATA_BASE);
  loadBytecode_(sheet, p.code, p.data,
    "--- Programa 'Multiplicacion A x B' cargado (A=" + a + ' en ' + h_(DATA_BASE) + ', B=' + b + ' en ' + h_(DATA_BASE + 1) +
    ', esperado en ' + h_(DATA_BASE + 4) + ' = ' + ((a * b) & 0xFF) + (a * b > 255 ? ', OJO: desborda 8 bits (real=' + (a * b) + ')' : '') + ') ---');
}

// [Tarjeta #9 Programas de demostracion - carga C = A + B]
function loadProgramSumaAB() {
  var sheet = getSheet();
  var a = getInputCell_(sheet, 'E21', 12);
  var b = getInputCell_(sheet, 'E22', 9);
  var p = buildSumaAB_(a, b, DATA_BASE);
  loadBytecode_(sheet, p.code, p.data,
    "--- Programa 'C = A + B' cargado (A=" + a + ' en ' + h_(DATA_BASE) + ', B=' + b + ' en ' + h_(DATA_BASE + 1) +
    ', esperado en ' + h_(DATA_BASE + 2) + ' = ' + ((a + b) & 0xFF) + (a + b > 255 ? ', OJO: desborda 8 bits (real=' + (a + b) + ')' : '') + ') ---');
}

// [Tarjeta #9 Programas de demostracion - carga Mayor de dos]
function loadProgramMayorDeDos() {
  var sheet = getSheet();
  var a = getInputCell_(sheet, 'E21', 12);
  var b = getInputCell_(sheet, 'E22', 9);
  var p = buildMayorDeDos_(a, b, DATA_BASE);
  loadBytecode_(sheet, p.code, p.data,
    "--- Programa 'Mayor de dos numeros' cargado (A=" + a + ' en ' + h_(DATA_BASE) + ', B=' + b + ' en ' + h_(DATA_BASE + 1) +
    ', esperado en ' + h_(DATA_BASE + 2) + ' = ' + Math.max(a, b) + ') ---');
}

// [Tarjeta #9 Programas de demostracion - carga Cuenta regresiva]
function loadProgramCuentaRegresiva() {
  var sheet = getSheet();
  var n = getInputCell_(sheet, 'B22', 5);
  if (n < 1) n = 1;
  sheet.getRange('B22').setValue(n);
  var p = buildCuentaRegresiva_(n, DATA_BASE);
  loadBytecode_(sheet, p.code, p.data,
    "--- Programa 'Cuenta regresiva desde N' cargado (N=" + n + ' en ' + h_(DATA_BASE) + ', esperado en ' + h_(DATA_BASE + 1) + ' = 0) ---');
}

// [Tarjeta #9 Programas de demostracion - carga Fibonacci]
function loadProgramFibonacci() {
  var sheet = getSheet();
  var p = buildFibonacci_(DATA_BASE);
  loadBytecode_(sheet, p.code, p.data,
    "--- Programa 'Fibonacci hasta desbordar 8 bits' cargado (resultado en " + h_(DATA_BASE + 1) + '). Corre STEP o RUN LENTO y mira CF/OF activarse justo antes de parar. ---');
}
