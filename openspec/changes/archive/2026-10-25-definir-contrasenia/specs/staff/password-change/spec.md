# Spec Delta

## Purpose

Permite que un miembro del staff autenticado defina una contraseña nueva desde la web, con validación alineada al backend, manejo del bloqueo por intentos fallidos y cierre de la sesión al completar el cambio.

##  ADDED Requirements

### Requirement: Acceso autenticado y punto de entrada

El sistema DEBE (MUST) permitir el cambio de contraseña únicamente a usuarios con sesión iniciada. Cuando no haya una sesión válida, la ruta DEBE (MUST) redirigir al login sin mostrar el formulario. La página DEBE ser alcanzable mediante un enlace "Cambiar contraseña" en el header de los workspaces de staff (recepción, médico y administración hospitalaria) y en el header de administración de plataforma.

#### Scenario: Sin sesión no se accede al formulario
- **WHEN** se navega a `/cuenta/contrasena` sin una sesión válida
- **THEN** el sistema redirige a `/login` y no muestra campos de contraseña

#### Scenario: El enlace está disponible en los headers
- **WHEN** un usuario autenticado está en un workspace de staff o en administración de plataforma
- **THEN** ve el enlace "Cambiar contraseña" en el header y al activarlo llega a la página de cambio

### Requirement: Formulario con contraseña actual y nueva

La página DEBE (MUST) solicitar la contraseña actual, la contraseña nueva y la repetición de la contraseña nueva. Los tres campos DEBEN ser obligatorios. La página DEBE mostrar un aviso visible de que, tras 3 intentos fallidos consecutivos, el cambio de contraseña se bloquea durante 24 horas.

#### Scenario: Campos obligatorios
- **WHEN** se abre la página
- **THEN** muestra los campos de contraseña actual, nueva y repetición, y no habilita el envío con campos vacíos

#### Scenario: Aviso de bloqueo visible
- **WHEN** se abre la página
- **THEN** el aviso de 3 intentos y 24 horas es visible antes de enviar el formulario

### Requirement: Validación local alineada con el backend

El sistema DEBE (MUST) validar en el navegador, antes de enviar, que la contraseña nueva tenga entre 8 y 32 caracteres contados por punto de código Unicode, contenga al menos una letra mayúscula, al menos una letra minúscula, al menos un número o carácter especial (todo carácter que no sea letra, dígito ni espacio) y sea distinta de la contraseña actual. DEBE mostrar el estado de cada regla y DEBE impedir el envío mientras alguna regla no se cumpla o la repetición no coincida. Esta validación DEBE ser un espejo de las reglas del backend, que sigue siendo la autoridad final.

#### Scenario: Regla incumplida bloquea el envío
- **WHEN** la contraseña nueva no cumple una de las reglas de fortaleza
- **THEN** la regla se muestra como incumplida, el envío queda deshabilitado y no se llama al backend

#### Scenario: Contraseña nueva igual a la actual
- **WHEN** la contraseña nueva coincide con la actual
- **THEN** el sistema indica el incumplimiento y no envía la solicitud

#### Scenario: Repetición distinta
- **WHEN** la repetición no coincide con la contraseña nueva
- **THEN** el sistema muestra el error de coincidencia y no envía la solicitud

#### Scenario: Contraseña válida
- **WHEN** la contraseña nueva cumple todas las reglas y la repetición coincide
- **THEN** el sistema habilita el envío

### Requirement: Manejo de fallos y bloqueo por intentos

Ante una respuesta del backend, el sistema DEBE (MUST) mostrar el mensaje recibido en un `400` y permitir reintentar; DEBE mostrar el mensaje de bloqueo con los minutos restantes en un `423` y deshabilitar el formulario en esa vista; y DEBE redirigir al login en un `401`. El cliente NO DEBE contar intentos fallidos ni bloquear por su cuenta: solo el backend es autoridad sobre los intentos y el bloqueo de 24 horas.

#### Scenario: Contraseña actual incorrecta
- **WHEN** el backend responde `400` porque la contraseña actual no coincide
- **THEN** el mensaje de error es visible y el formulario sigue disponible para reintentar

#### Scenario: Bloqueo activo
- **WHEN** el backend responde `423` con los minutos restantes
- **THEN** el sistema muestra ese mensaje y deshabilita el envío del formulario en esa vista

#### Scenario: Sesión expirada
- **WHEN** el backend o el BFF responde `401`
- **THEN** el sistema redirige al login

#### Scenario: Sin conteo local de intentos
- **WHEN** el usuario recibe un `400`
- **THEN** el sistema no muestra un contador propio de intentos restantes ni deshabilita el formulario por un límite calculado en el cliente

### Requirement: Éxito y cierre de sesión

Ante un `200`, el sistema DEBE (MUST) cerrar la sesión actual eliminando del navegador el token de acceso, el refresh token y la marca de renovación. DEBE redirigir al login con un mensaje de éxito que confirme que la contraseña quedó actualizada e invite a ingresar con la nueva. La redirección DEBE reemplazar la entrada del historial para que "Volver" no reabra el formulario, y la página DEBE quedar inaccesible sin una nueva sesión.

#### Scenario: Cambio exitoso
- **WHEN** el backend confirma el cambio de contraseña con `200`
- **THEN** el sistema elimina las cookies de sesión, el refresh token deja de estar disponible en el navegador y redirige al login

#### Scenario: Mensaje de éxito en el login
- **WHEN** el usuario llega al login después de un cambio exitoso
- **THEN** ve un mensaje que confirma que la contraseña se actualizó y que debe ingresar con la nueva

#### Scenario: El formulario no se reabre con la sesión anterior
- **WHEN** el usuario intenta volver a la página de cambio después del éxito
- **THEN** no ve el formulario porque ya no tiene sesión y el sistema lo redirige al login

### Requirement: Privacidad de contraseñas y tokens

Las contraseñas DEBEN (MUST) permanecer solo en memoria durante la operación y NO DEBEN escribirse en `localStorage`, `sessionStorage`, cookies, logs, analítica ni URLs. El navegador NO DEBE recibir bearer tokens: la operación DEBE enviarse a un BFF del mismo origen, que adjunta el token de la sesión del lado servidor.

#### Scenario: Sin persistencia de contraseñas
- **WHEN** se envía el formulario de cambio
- **THEN** ninguna contraseña aparece en el almacenamiento del navegador, en la URL ni en cookies

#### Scenario: El token no llega al navegador
- **WHEN** el navegador realiza la operación
- **THEN** llama al BFF del mismo origen sin `Authorization` y el bearer se adjunta únicamente en la llamada servidor a backend
