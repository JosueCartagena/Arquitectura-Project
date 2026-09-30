/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: ALU.gs
 *
 * Unidad Aritmetico-Logica. Cada funcion recibe el objeto "flags"
 * ({ZF,CF,SF}) del estado actual y lo muta directamente (los objetos
 * se pasan por referencia en JavaScript), devolviendo el resultado de
 * 8 bits.
 */

function aluAdd(a, b, flags) {
  var result = a + b;
  flags.CF = result > 255;
  result = result & 0xFF;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

function aluSub(a, b, flags) {
  var result = a - b;
  flags.CF = result < 0;              // prestamo (borrow)
  result = result & 0xFF;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

function aluInc(a, flags) {
  return aluAdd(a, 1, flags);
}

function aluDec(a, flags) {
  return aluSub(a, 1, flags);
}

function aluAnd(a, b, flags) {
  var result = a & b;
  flags.CF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

function aluOr(a, b, flags) {
  var result = a | b;
  flags.CF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

function aluXor(a, b, flags) {
  var result = a ^ b;
  flags.CF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

function aluNot(a, flags) {
  var result = (~a) & 0xFF;
  flags.CF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

// CMP no guarda resultado, solo actualiza banderas (como una resta)
function aluCmp(a, b, flags) {
  var result = a - b;
  flags.CF = result < 0;
  result = result & 0xFF;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
}
