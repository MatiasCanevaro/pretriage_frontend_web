import type { components } from "@/contracts/pretriage-api";

export type ApiSchemas = components["schemas"];
export type ReceptionHospital = ApiSchemas["RecepcionHospitalDTO"];
export type ReceptionSession = ApiSchemas["SesionRecepcionDTO"];
export type ReceptionPatient = ApiSchemas["PacienteRecepcionDTO"];
export type ReceptionAdmission = ApiSchemas["AdmisionRecepcionDTO"];
export type ReceptionAdmissionDetail =
  ApiSchemas["AdmisionRecepcionDetalleDTO"];
export type CreateReceptionAdmission =
  ApiSchemas["CrearAdmisionRecepcionRequest"];
export type ReceptionTriageForm =
  ApiSchemas["FormularioTriageRecepcionRequest"];
export type DoctorAssignment = ApiSchemas["AsignacionMedicoDTO"];
export type MedicalRoom = ApiSchemas["SalaDTO"];
export type MedicalSession = ApiSchemas["SesionAtencionMedicaDTO"];
export type QueueConsultation = ApiSchemas["ConsultaLlamadaDTO"];
export type MedicalAttention = ApiSchemas["AtencionMedicaDTO"];

export type ReceptionBootstrap = {
  hospitals: ReceptionHospital[];
  session: ReceptionSession | null;
  openAdmissions: ReceptionAdmissionDetail[];
};

export type DoctorBootstrap = {
  assignments: DoctorAssignment[];
  history: MedicalAttention[];
};
