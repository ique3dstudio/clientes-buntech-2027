/** Utilitários de CNPJ/CPF. O banco guarda só os dígitos. */

export const somenteDigitos = (v: string) => v.replace(/\D/g, "");

function digitoVerificador(base: string, pesos: number[]) {
  const soma = base.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(valor: string) {
  const c = somenteDigitos(valor);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = digitoVerificador(c.slice(0, 12), p1);
  const d2 = digitoVerificador(c.slice(0, 13), [6, ...p1]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

export function cpfValido(valor: string) {
  const c = somenteDigitos(valor);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const d1 = digitoVerificador(c.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(c.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[9]) && d2 === Number(c[10]);
}

export function documentoValido(valor: string) {
  const c = somenteDigitos(valor);
  return c.length === 14 ? cnpjValido(c) : c.length === 11 ? cpfValido(c) : false;
}

export function formatarDocumento(valor: string) {
  const c = somenteDigitos(valor);
  if (c.length === 14) return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (c.length === 11) return c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return valor;
}
