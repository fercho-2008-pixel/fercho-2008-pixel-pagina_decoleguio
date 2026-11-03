# Security Specification — Rincón de Guías

## 1. Data Invariants

1. **Profesor Identity**: A professor record must have a valid document id (`cedula`), `nombre`, `materia`, and `passwordHash`.
2. **Estudiante Identity**: A student record must have a valid `documento`, `nombre`, valid `curso` (1-5), and `passwordHash`.
3. **Coordinador Identity**: A coordinator record has `usuario` and `passwordHash`.
4. **Trabajo (Guías / Trabajos)**: Every work must have a valid non-empty `id`, valid `grado` (1-5), `titulo`, and author `profesorNombre`.
5. **Entrega (Entregas y Calificaciones)**:
   - Composite ID format: `{trabajoId}:{estudianteDoc}`.
   - An assignment submission must link to a valid `trabajoId` and `estudianteDoc`.
   - `nota` must be a valid number between 1 and 5 when present.
   - Once graded, the student cannot tamper with or rewrite their submitted answers. Only teachers/coordinators can assign or update the grade (`nota`, `fechaCalificacion`, `retroalimentacion`).

---

## 2. The Dirty Dozen Payloads

1. **Payload 1: Unverified / Malformed Document ID in Profesor**
   ```json
   { "cedula": "../malicious/id", "nombre": "Profesor X" }
   ```
   *Expectation*: Rejected (must match numeric regex and length limit).

2. **Payload 2: Missing required credentials on Estudiante creation**
   ```json
   { "documento": "123456", "nombre": "Estudiante 1" }
   ```
   *Expectation*: Rejected (missing `curso` or `passwordHash`).

3. **Payload 3: Invalid grade level on Student**
   ```json
   { "documento": "123456", "nombre": "Estudiante 1", "curso": "12", "passwordHash": "hash" }
   ```
   *Expectation*: Rejected (`curso` must be "1", "2", "3", "4", or "5").

4. **Payload 4: Ghost / Shadow Fields Injection**
   ```json
   { "documento": "123456", "nombre": "Estudiante", "curso": "3", "passwordHash": "hash", "isAdmin": true }
   ```
   *Expectation*: Rejected (strict key allowlist).

5. **Payload 5: Over-length String Denial of Wallet**
   ```json
   { "id": "t1", "grado": 3, "titulo": "A".repeat(5000), "profesorNombre": "Profesor" }
   ```
   *Expectation*: Rejected (`titulo` max length 200).

6. **Payload 6: Student modifying their own Calificación / Grade**
   ```json
   { "id": "t1:1001", "trabajoId": "t1", "estudianteDoc": "1001", "nota": 5 }
   ```
   *Expectation*: Rejected (grades can only be updated by the grading workflow).

7. **Payload 7: Invalid Grade Boundary (<1 or >5)**
   ```json
   { "nota": 10 }
   ```
   *Expectation*: Rejected (`nota` must be between 1 and 5).

8. **Payload 8: Mutating Immutable Submission ID**
   ```json
   { "id": "changedId", "trabajoId": "t2" }
   ```
   *Expectation*: Rejected (`id` and `trabajoId` are immutable).

9. **Payload 9: Deleting other professor's guide**
   ```json
   DELETE /trabajos/t-other-prof
   ```
   *Expectation*: Rejected.

10. **Payload 10: Non-numeric student document spoof**
    ```json
    { "documento": "admin;DROP TABLE", "nombre": "Bad User" }
    ```
    *Expectation*: Rejected (pattern mismatch).

11. **Payload 11: Malformed responses payload in submission**
    ```json
    { "respuestas": "not-an-array" }
    ```
    *Expectation*: Rejected (type safety).

12. **Payload 12: Blanket / Wildcard query injection**
    *Expectation*: Rejected by default deny rules.

---

## 3. Test Runner Specification

Test suites verify that:
- Read and writes to `/profesores/{profesorId}` enforce required schema fields.
- Read and writes to `/estudiantes/{estudianteId}` validate document numbers and elementary grades 1-5.
- Read and writes to `/trabajos/{trabajoId}` require title, valid grade level, and author.
- Reads and updates to `/entregas/{entregaId}` allow students to submit answers and teachers to assign grades 1-5.
