/** Reduz a foto (lado maior 1600 px, JPEG) para economizar dados no campo. */
export async function reduzirFoto(arquivo: File, maximo = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, maximo / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * escala);
    c.height = Math.round(bmp.height * escala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.8));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}
