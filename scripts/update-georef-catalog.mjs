import { mkdir, writeFile } from "node:fs/promises";

const source =
  "https://apis.datos.gob.ar/georef/api/v2.0/localidades?campos=nombre,provincia&max=5000&orden=nombre";
const response = await fetch(source);
if (!response.ok) throw new Error(`Georef respondió ${response.status}`);
const payload = await response.json();
if (!Array.isArray(payload.localidades) || payload.localidades.length !== payload.total) {
  throw new Error("El catálogo Georef llegó incompleto");
}

const grouped = new Map();
for (const locality of payload.localidades) {
  const province = locality.provincia?.nombre?.trim();
  const city = locality.nombre?.trim();
  if (!province || !city) continue;
  if (!grouped.has(province)) grouped.set(province, new Set());
  grouped.get(province).add(city);
}

const provinces = [...grouped.entries()]
  .sort(([left], [right]) => left.localeCompare(right, "es-AR"))
  .map(([name, cities]) => ({
    name,
    cities: [...cities].sort((left, right) => left.localeCompare(right, "es-AR")),
  }));

await mkdir(new URL("../lib/geo/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../lib/geo/argentina-locations.json", import.meta.url),
  `${JSON.stringify({ source, provinces }, null, 2)}\n`,
  "utf8",
);
console.log(`Catálogo actualizado: ${provinces.length} provincias, ${payload.total} localidades`);
