/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: Tests.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #12 Pruebas automatizadas: ALU, ensamblador y los 6 programas.
 *   #13 Direcciones configurables: cada programa se prueba con datos en 0x80, 0x90 y 0xC0.
 *
 * Suite de pruebas automatizadas (en Apps Script). Corre:
 *   1) Pruebas unitarias de la ALU (incluida la nueva bandera OF).
 *   2) Pruebas del ensamblador (Assembler.gs) contra bytecode conocido.
 *   3) Pruebas de integracion: cada uno de los 6 programas de demo,
 *      ejecutados de principio a fin con las funciones REALES del ciclo
 *      de instruccion (Control.gs), verificando el resultado final en
 *      memoria. Esto corre el simulador "sin hoja" (headless): usa el
 *      mismo modo Instant que ya usa RUN (ver Control.gs/Code.gs), asi
 *      que son las mismas fetchPhase/decodePhase/executePhase/
 *      storeBackPhase que se usan en la hoja real, no una reimplementacion
 *      aparte -- si alguien rompe Control.gs, estas pruebas lo detectan.
 *
 * Ejecutar: menu "CPU Simulador" > "Correr pruebas automatizadas", o
 * la funcion runAllTests() directamente desde el editor.
 * IMPORTANTE: estas pruebas NUNCA llaman loadState()/saveState() ni tocan
 * la hoja real, asi que no interfieren con una sesion del simulador que
 * ya este en curso.
 */

// [Tarjeta #12 Pruebas - ejecuta un programa sin tocar la hoja]
function runProgramHeadless_(code, dataMap, maxCycles) {
  var state = getInitialState();
  for (var i = 0; i < code.length; i++) state.Mem[i] = code[i];
  for (var addr in dataMap) state.Mem[addr] = dataMap[addr] & 0xFF;
  state.Instant = true;   // todas las funciones de pintado de Control.gs/Code.gs se auto-desactivan con esto

  var phases = [fetchPhase, decodePhase, executePhase, storeBackPhase];
  var cycles = 0;
  var max = maxCycles || 5000;
  while (!state.Halted && cycles < max) {
    for (var p = 0; p < phases.length; p++) phases[p](null, state);
    cycles++;
  }
  return state;
}

// [Tarjeta #12 Pruebas - contador de aciertos y fallos]
function TestResult_() {
  this.passed = 0;
  this.failed = 0;
  this.failures = [];
}
TestResult_.prototype.check = function (name, condition, detail) {
  if (condition) {
    this.passed++;
  } else {
    this.failed++;
    this.failures.push(name + (detail ? '  (' + detail + ')' : ''));
  }
};
TestResult_.prototype.eq = function (name, actual, expected) {
  this.check(name, actual === expected, 'esperado=' + expected + ' obtenido=' + actual);
};

// ===================== 1) ALU =====================
// [Tarjeta #12 Pruebas - ALU y banderas (incluye OF)]
function testsAlu_(t) {
  var f;

  f = { ZF: false, CF: false, SF: false, OF: false };
  t.eq('ADD 2+3=5', aluAdd(2, 3, f), 5);
  t.eq('ADD 2+3 -> ZF=0', f.ZF, false);
  t.eq('ADD 2+3 -> CF=0', f.CF, false);
  t.eq('ADD 2+3 -> OF=0', f.OF, false);

  f = { ZF: false, CF: false, SF: false, OF: false };
  t.eq('ADD 255+1 (desborda sin signo) =0', aluAdd(255, 1, f), 0);
  t.eq('ADD 255+1 -> CF=1', f.CF, true);
  t.eq('ADD 255+1 -> ZF=1', f.ZF, true);

  // Caso clave: demuestra que OF y CF son cosas DISTINTAS. 100+50=150 no
  // se pasa de 255 (CF=0) pero SI se sale del rango con signo -128..127
  // (OF=1): dos positivos "no deberian" poder sumar algo que se lee como
  // negativo en complemento a 2.
  f = { ZF: false, CF: false, SF: false, OF: false };
  var r1 = aluAdd(100, 50, f);
  t.eq('ADD 100+50 = 150', r1, 150);
  t.eq('ADD 100+50 -> CF=0 (no pasa de 255)', f.CF, false);
  t.eq('ADD 100+50 -> OF=1 (si se sale de -128..127)', f.OF, true);
  t.eq('ADD 100+50 -> SF=1 (bit 7 quedo en 1)', f.SF, true);

  // SUB: -128 - 1 tambien desborda el rango con signo (deberia dar -129)
  f = { ZF: false, CF: false, SF: false, OF: false };
  var r2 = aluSub(128, 1, f);   // 128 = 0x80 = -128 en complemento a 2
  t.eq('SUB 0x80-1 = 0x7F', r2, 0x7F);
  t.eq('SUB 0x80-1 -> OF=1', f.OF, true);
  t.eq('SUB 0x80-1 -> CF=0 (no hubo prestamo sin signo)', f.CF, false);

  f = { ZF: false, CF: false, SF: false, OF: false };
  t.eq('SUB 3-5 (prestamo) -> CF=1', (aluSub(3, 5, f), f.CF), true);

  f = { ZF: false, CF: false, SF: false, OF: false };
  aluCmp(7, 7, f);
  t.eq('CMP 7,7 -> ZF=1', f.ZF, true);

  f = { ZF: false, CF: false, SF: false, OF: false };
  t.eq('AND 0b1100 & 0b1010 = 0b1000', aluAnd(0xC, 0xA, f), 0x8);
  t.eq('AND -> CF=0 siempre', f.CF, false);
  t.eq('AND -> OF=0 siempre', f.OF, false);

  f = { ZF: false, CF: false, SF: false, OF: false };
  t.eq('NOT 0x00 = 0xFF', aluNot(0x00, f), 0xFF);
}

// ===================== 2) Ensamblador =====================
// [Tarjeta #12 Pruebas - ensamblador contra bytecode conocido]
function testsAssembler_(t) {
  var srcSumaAB = [
    'LOAD AX, [0x80]',
    'LOAD BX, [0x81]',
    'ADD AX, BX',
    'STORE [0x82], AX',
    'HLT'
  ].join('\n');
  var r = assembleProgram(srcSumaAB);
  t.check('Ensamblador: C=A+B sin errores', r.ok, r.ok ? '' : JSON.stringify(r.errors));
  if (r.ok) {
    var expected = [0x03, 0x00, 0x80, 0x03, 0x01, 0x81, 0x06, 0x00, 0x01, 0x04, 0x82, 0x00, 0x00];
    var match = expected.every(function (b, i) { return r.mem[i] === b; });
    t.check('Ensamblador: C=A+B bytecode identico al de Program2.gs', match);
  }

  var srcLoop = [
    'ORG 0x00',
    'MOV AX, 0x00',
    'LOAD BX, [0x80]',
    'L1: CMP BX, 0x00',
    'JZ L2',
    'ADD AX, BX',
    'DEC BX',
    'JMP L1',
    'L2: STORE [0x81], AX',
    'HLT'
  ].join('\n');
  var r2 = assembleProgram(srcLoop);
  t.check('Ensamblador: Suma 1..N (con etiquetas) sin errores', r2.ok, r2.ok ? '' : JSON.stringify(r2.errors));
  if (r2.ok) {
    var expected2 = [0x01, 0x00, 0x00, 0x03, 0x01, 0x80, 0x0B, 0x01, 0x00, 0x12, 0x12, 0x06, 0x00, 0x01, 0x0A, 0x01, 0x11, 0x06, 0x04, 0x81, 0x00, 0x00];
    var match2 = expected2.every(function (b, i) { return r2.mem[i] === b; });
    t.check('Ensamblador: Suma 1..N bytecode identico al de Program.gs', match2);
  }

  var rBad = assembleProgram('FOO AX, 1');
  t.check('Ensamblador: mnemonico invalido se reporta como error', rBad.ok === false);

  var rBadLabel = assembleProgram('JMP NOEXISTE\nHLT');
  t.check('Ensamblador: etiqueta inexistente se reporta como error', rBadLabel.ok === false);
}

// ===================== 3) Programas completos (headless) =====================
// Cada programa se prueba con la base por defecto (0x80) y RELOCALIZADO
// (0x90 y 0xC0): asi se comprueba que cambiar DATA_BASE mantiene coherentes
// el codigo, la carga de datos y el resultado.
// [Tarjeta #12 / #13 Pruebas - los 6 programas en 3 direcciones]
function testsPrograms_(t) {
  var bases = [0x80, 0x90, 0xC0];

  // El bytecode con base 0x80 debe ser IDENTICO al historico (no se rompio nada).
  var histSuma = [0x01, 0x00, 0x00, 0x03, 0x01, 0x80, 0x0B, 0x01, 0x00, 0x12, 0x12, 0x06, 0x00, 0x01, 0x0A, 0x01, 0x11, 0x06, 0x04, 0x81, 0x00, 0x00];
  t.check('Suma 1..N: bytecode base 0x80 identico al historico',
    JSON.stringify(buildSumaProgram_(5, 0x80).code) === JSON.stringify(histSuma));

  bases.forEach(function (B) {
    var tag = ' @0x' + B.toString(16).toUpperCase();
    var p, s;

    p = buildSumaProgram_(5, B); s = runProgramHeadless_(p.code, p.data);
    t.check('Suma 1..N' + tag + ': termina con HLT', s.Halted);
    t.eq('Suma 1..N (N=5)' + tag + ': resultado', s.Mem[B + 1], 15);

    p = buildMultiplicacion_(12, 9, B); s = runProgramHeadless_(p.code, p.data);
    t.check('Multiplicacion' + tag + ': termina con HLT', s.Halted);
    t.eq('Multiplicacion 12x9' + tag + ': resultado', s.Mem[B + 4], 108);

    p = buildSumaAB_(12, 9, B); s = runProgramHeadless_(p.code, p.data);
    t.eq('C=A+B (12,9)' + tag + ': resultado', s.Mem[B + 2], 21);

    [[12, 9, 12], [3, 20, 20], [7, 7, 7]].forEach(function (c) {
      p = buildMayorDeDos_(c[0], c[1], B); s = runProgramHeadless_(p.code, p.data);
      t.eq('Mayor(' + c[0] + ',' + c[1] + ')' + tag, s.Mem[B + 2], c[2]);
    });

    p = buildCuentaRegresiva_(5, B); p.data[B + 1] = 99; s = runProgramHeadless_(p.code, p.data);
    t.eq('Cuenta regresiva N=5' + tag + ': resultado', s.Mem[B + 1], 0);

    p = buildFibonacci_(B); s = runProgramHeadless_(p.code, p.data);
    t.eq('Fibonacci' + tag + ': valor truncado a 8 bits', s.Mem[B + 1], 121);
    t.check('Fibonacci' + tag + ': CF=1 y OF=1', s.CF === true && s.OF === true);
  });

  // Validacion de direcciones: dentro del codigo o fuera de 0xFF debe rechazarse.
  var pm = buildMultiplicacion_(1, 1, 0x10);
  t.check('Validacion: datos dentro del segmento de codigo se rechazan',
    validateDataAddrs_(pm.code.length, pm.data) !== '');
  var pf = buildSumaAB_(1, 1, 0xFE);
  t.check('Validacion: datos que pasan de 0xFF se rechazan',
    validateDataAddrs_(pf.code.length, pf.data) !== '');
  var po = buildSumaAB_(1, 1, 0x80);
  t.check('Validacion: base 0x80 es valida', validateDataAddrs_(po.code.length, po.data) === '');
}

// ===================== Orquestador =====================
// [Tarjeta #12 Pruebas - ejecuta todo y muestra el resumen]
function runAllTests() {
  var t = new TestResult_();

  testsAlu_(t);
  testsAssembler_(t);
  testsPrograms_(t);

  var total = t.passed + t.failed;
  var summary = 'Pruebas automatizadas: ' + t.passed + '/' + total + ' OK.';
  if (t.failed > 0) {
    summary += '\n\nFALLARON (' + t.failed + '):\n - ' + t.failures.join('\n - ');
  }

  Logger.log(summary);
  try {
    SpreadsheetApp.getUi().alert(summary);
  } catch (e) {
    // ejecutado desde el editor de Apps Script (sin UI): el resumen ya quedo en Logger.log / "Registro de ejecucion"
  }
  return { passed: t.passed, failed: t.failed, total: total, failures: t.failures };
}
