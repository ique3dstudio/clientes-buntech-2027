"use client";

import { useEffect, useRef } from "react";

/** Número que sobe de 0 até o valor em ~1 s. Escreve direto no DOM (sem estado) e respeita "reduzir movimento". */
export function ContadorAnimado({ valor, duracao = 1100 }: { valor: number; duracao?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const final = valor.toLocaleString("pt-BR");
    if (valor <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = final;
      return;
    }
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - p, 4); // desacelera no fim
      el.textContent = Math.round(valor * suave).toLocaleString("pt-BR");
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  return (
    <span ref={ref} className="tabular-nums">
      {valor.toLocaleString("pt-BR")}
    </span>
  );
}
