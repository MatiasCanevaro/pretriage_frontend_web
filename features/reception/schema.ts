import { z } from "zod";
import type { ReceptionTriageForm } from "@/lib/api/types";

export function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function birthDateToDisplay(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : formatBirthDateInput(value ?? "");
}

export function birthDateToIso(value: string) {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function validPastBirthDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  const valid = candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day;
  if (!valid) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return candidate < today;
}

export const dniSchema = z.object({
  dni: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "Ingresá un DNI de 7 u 8 dígitos.")),
});

export const patientSchema = z.object({
  dni: z.string().regex(/^\d{7,8}$/, "Ingresá un DNI válido."),
  nombre: z.string().trim().min(1, "Ingresá el nombre."),
  apellido: z.string().trim().min(1, "Ingresá el apellido."),
  fechaNacimiento: z.string().refine(
    validPastBirthDate,
    "Ingresá una fecha válida en formato dd/mm/aaaa y anterior a hoy.",
  ),
  generoBiologico: z.enum(["MASCULINO", "FEMENINO", "X"]),
  telefono: z
    .string()
    .regex(/^[+0-9 ()-]{6,25}$/, "Ingresá un teléfono válido."),
  correoElectronico: z
    .string()
    .email("Ingresá un correo válido.")
    .or(z.literal("")),
  calle: z.string().trim().min(1, "Ingresá la calle."),
  alturaDomicilio: z.string().trim().min(1, "Ingresá la altura."),
  piso: z.string(),
  ciudad: z.string().trim().min(1, "Ingresá la ciudad."),
  provincia: z.string().trim().min(1, "Ingresá la provincia."),
  codigoEspecialidad: z.string().min(1, "Seleccioná una especialidad."),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

export const clinicalSchema = z.object({
  motivoConsulta: z.string().trim().min(3, "Describí el motivo principal."),
  sintomas: z.string(),
  inicio: z.string().trim().min(1, "Indicá cuándo comenzó."),
  evolucion: z.string().trim().min(1, "Indicá cómo evolucionó."),
  dolores: z.array(z.object({
    localizacion: z.string().trim().min(1, "Indicá dónde duele."),
    intensidad: z.string().regex(/^(?:[0-9]|10)$/, "Ingresá un valor entre 0 y 10."),
  })),
  fiebre: z.boolean(),
  signosAlarma: z.string(),
  antecedentesRelevantes: z.string(),
  medicamentos: z.string(),
  alergias: z.string(),
  posibilidadEmbarazo: z.string(),
  observaciones: z.string(),
});

export type ClinicalFormValues = z.infer<typeof clinicalSchema>;

export const emptyClinicalForm: ClinicalFormValues = {
  motivoConsulta: "",
  sintomas: "",
  inicio: "",
  evolucion: "",
  dolores: [],
  fiebre: false,
  signosAlarma: "",
  antecedentesRelevantes: "",
  medicamentos: "",
  alergias: "",
  posibilidadEmbarazo: "",
  observaciones: "",
};

function list(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toTriageRequest(
  values: ClinicalFormValues,
): ReceptionTriageForm {
  return {
    motivoConsulta: values.motivoConsulta.trim(),
    sintomas: list(values.sintomas),
    inicio: values.inicio.trim(),
    evolucion: values.evolucion.trim(),
    dolores: values.dolores.map((dolor) => ({
      localizacion: dolor.localizacion.trim(),
      intensidad: Number(dolor.intensidad),
    })),
    fiebre: values.fiebre,
    signosAlarma: list(values.signosAlarma),
    antecedentesRelevantes: list(values.antecedentesRelevantes),
    medicamentos: list(values.medicamentos),
    alergias: list(values.alergias),
    posibilidadEmbarazo: values.posibilidadEmbarazo.trim(),
    observaciones: values.observaciones.trim(),
  };
}
