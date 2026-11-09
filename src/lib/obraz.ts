/** Zmniejsza zdjęcie z telefonu (domyślnie do 1600 px) i zapisuje jako JPEG – kilka MB → kilkaset kB. */
export async function zmniejszZdjecie(plik: File, maks = 1600, jakosc = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(plik);
  const skala = Math.min(1, maks / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * skala);
  c.height = Math.round(bitmap.height * skala);
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return new Promise((ok, zle) => c.toBlob((b) => (b ? ok(b) : zle(new Error("Nie udało się przygotować zdjęcia"))), "image/jpeg", jakosc));
}

export async function doBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
