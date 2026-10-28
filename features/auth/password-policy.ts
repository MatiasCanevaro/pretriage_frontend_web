export const MIN_NEW_PASSWORD_LENGTH = 8;
export const MAX_NEW_PASSWORD_LENGTH = 32;

export type PasswordRuleId =
  | "length"
  | "uppercase"
  | "lowercase"
  | "digitOrSpecial"
  | "differentFromCurrent";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  valid: boolean;
};

const uppercasePattern = /\p{Lu}/u;
const lowercasePattern = /\p{Ll}/u;
// Espejo de Java: \p{Nd} para dígitos y \s limitado a los espacios ASCII.
const digitOrSpecialPattern = /(\p{Nd}|[^\p{L}\p{Nd} \t\n\u000B\f\r])/u;

/** Cuenta puntos de código Unicode, como el backend, no unidades UTF-16. */
export function passwordLength(value: string) {
  return Array.from(value).length;
}

export function passwordRules(
  currentPassword: string,
  newPassword: string,
): PasswordRule[] {
  const length = passwordLength(newPassword);
  return [
    {
      id: "length",
      label: `Entre ${MIN_NEW_PASSWORD_LENGTH} y ${MAX_NEW_PASSWORD_LENGTH} caracteres`,
      valid:
        length >= MIN_NEW_PASSWORD_LENGTH && length <= MAX_NEW_PASSWORD_LENGTH,
    },
    {
      id: "uppercase",
      label: "Al menos una letra mayúscula",
      valid: uppercasePattern.test(newPassword),
    },
    {
      id: "lowercase",
      label: "Al menos una letra minúscula",
      valid: lowercasePattern.test(newPassword),
    },
    {
      id: "digitOrSpecial",
      label: "Al menos un número o carácter especial",
      valid: digitOrSpecialPattern.test(newPassword),
    },
    {
      id: "differentFromCurrent",
      label: "Distinta de la contraseña actual",
      valid: newPassword.length > 0 && newPassword !== currentPassword,
    },
  ];
}

export function isNewPasswordValid(
  currentPassword: string,
  newPassword: string,
) {
  return passwordRules(currentPassword, newPassword).every(
    (rule) => rule.valid,
  );
}
